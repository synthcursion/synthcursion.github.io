import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import App from "./App";

export const ENTRY = { x: 4, y: 0 };

// Mock URL and window.history since the App uses it for persistence
const mockReplaceState = vi.fn();
Object.defineProperty(window, "history", {
  value: {
    replaceState: mockReplaceState,
  },
});

// Mocking window.location.search
Object.defineProperty(window, "location", {
  value: {
    search: "",
    href: "http://localhost/",
  },
  writable: true,
});

describe(`Unremovable Four-way Path at (${ENTRY.x},${ENTRY.y})`, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.location.search = "";
  });

  it(`should have a path at (${ENTRY.x},${ENTRY.y}) on initial load`, () => {
    render(<App />);
    const cellEntry = screen.getByTestId(`cell-${ENTRY.x}-${ENTRY.y}`);
    expect(cellEntry.getAttribute("data-cell-type")).toBe("path");
  });

  it("should not be removable by the eraser", () => {
    render(<App />);
    const eraserButton = screen.getByTitle("Eraser");
    fireEvent.click(eraserButton);

    const cellEntry = screen.getByTestId(`cell-${ENTRY.x}-${ENTRY.y}`);
    fireEvent.click(cellEntry);

    expect(cellEntry.getAttribute("data-cell-type")).toBe("path");
  });

  it("should not be modifiable by another room type", () => {
    render(<App />);
    const garrisonButton = screen.getByTitle("Garrison");
    fireEvent.click(garrisonButton);

    const cellEntry = screen.getByTestId(`cell-${ENTRY.x}-${ENTRY.y}`);
    fireEvent.click(cellEntry);

    expect(cellEntry.getAttribute("data-cell-type")).toBe("path");
    expect(cellEntry.getAttribute("data-room-id")).not.toBe("Garrison");
  });

  it("should remain after Clear Grid is clicked", () => {
    render(<App />);
    const clearButton = screen.getByText("Clear Grid");
    fireEvent.click(clearButton);

    const cellEntry = screen.getByTestId(`cell-${ENTRY.x}-${ENTRY.y}`);
    expect(cellEntry.getAttribute("data-cell-type")).toBe("path");
  });
});
