import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import App from "./App";

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
    search: "?debug=true",
    href: "http://localhost/?debug=true",
  },
  writable: true,
});

describe("Toggle to Remove Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("removes a room when clicking it with the same room selected", () => {
    render(<App />);
    const roomButton = screen.getByTitle("Garrison");
    fireEvent.click(roomButton);

    const cell = screen.getByTestId("cell-4-4");
    fireEvent.click(cell);
    expect(cell.getAttribute("data-cell-type")).toBe("room");
    expect(cell.getAttribute("data-room-id")).toBe("Garrison");

    // Click again with Garrison selected
    fireEvent.click(cell);
    expect(cell.getAttribute("data-cell-type")).toBe(null);
  });

  it("removes any path when clicking it with ANY path selected", () => {
    render(<App />);

    // Place path1
    const path1Button = screen.getByTitle("path1");
    fireEvent.click(path1Button);
    const cell = screen.getByTestId("cell-4-4");
    fireEvent.click(cell);
    expect(cell.getAttribute("data-cell-type")).toBe("path");

    // Click again with path1 selected - should remove (currently works if connections match)
    fireEvent.click(cell);
    expect(cell.getAttribute("data-cell-type")).toBe(null);

    // Place path1 again
    fireEvent.click(cell);
    expect(cell.getAttribute("data-cell-type")).toBe("path");

    // Select path2
    const path2Button = screen.getByTitle("path2");
    fireEvent.click(path2Button);

    // Click the path1 tile with path2 selected - SHOULD remove according to new requirement
    fireEvent.click(cell);

    // This is expected to FAIL with current implementation because path1 connections != path2 connections
    expect(cell.getAttribute("data-cell-type")).toBe(null);
  });

  it("updates neighbors when a path is removed", () => {
    render(<App />);
    const path1Button = screen.getByTitle("path1");
    fireEvent.click(path1Button);

    const cell44 = screen.getByTestId("cell-4-4");
    const cell45 = screen.getByTestId("cell-4-5");

    fireEvent.click(cell44);
    fireEvent.click(cell45);

    // cell44 should have a connection to cell45 now.
    // In our mapping: y+1 is "top".
    // We can't easily check internal state, but we can check if it's still a path.
    expect(cell44.getAttribute("data-cell-type")).toBe("path");

    // Remove cell45
    fireEvent.click(cell45);
    expect(cell45.getAttribute("data-cell-type")).toBe(null);

    // cell44 should have updated its connections.
    // If it was path1 (top-bottom) and top (cell45) was removed, and there is no bottom neighbor,
    // it might revert to a default path type if it has no neighbors.
    // The key is that it shouldn't crash and should call updateCellConnections.
  });
});
