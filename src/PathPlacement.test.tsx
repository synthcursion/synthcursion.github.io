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
    search: "",
    href: "http://localhost/",
  },
  writable: true,
});

describe("Path Placement Restrictions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.location.search = "";
  });

  it("cannot place a path in isolation if the grid is not empty", () => {
    window.location.search = "?debug=true";
    render(<App />);

    // Place first path at 0,0
    fireEvent.click(screen.getByTitle("path1"));
    fireEvent.click(screen.getByTestId("cell-0-0"));

    const debugCheckbox = screen.getByLabelText(
      "ignore placement restrictions",
    );
    fireEvent.click(debugCheckbox); // Toggle off

    // Try to place another path at 4,4 (far away)
    const cell44 = screen.getByTestId("cell-4-4");
    fireEvent.click(cell44);
    expect(cell44.getAttribute("data-cell-type")).toBe(null);
  });

  it("cannot place a path next to another path if they don't connect", () => {
    window.location.search = "?debug=true";
    render(<App />);

    // Place path1 (top-bottom) at 4,4
    fireEvent.click(screen.getByTitle("path1"));
    fireEvent.click(screen.getByTestId("cell-4-4"));

    const debugCheckbox = screen.getByLabelText(
      "ignore placement restrictions",
    );
    fireEvent.click(debugCheckbox); // Toggle off

    // Try to place path1 (top-bottom) at 5,4 (Right of 4,4).
    // New path at 5,4 will have top/bottom. It needs to connect to 4,4 (Left).
    // Existing path at 4,4 only has top/bottom. It does not have Right.
    const cell54 = screen.getByTestId("cell-5-4");
    fireEvent.click(cell54);
    expect(cell54.getAttribute("data-cell-type")).toBe(null);
  });

  it("CAN place a path next to another path if they connect", () => {
    window.location.search = "?debug=true";
    render(<App />);

    // Place path2 (left-right) at 4,4
    fireEvent.click(screen.getByTitle("path2"));
    fireEvent.click(screen.getByTestId("cell-4-4"));

    const debugCheckbox = screen.getByLabelText(
      "ignore placement restrictions",
    );
    fireEvent.click(debugCheckbox); // Toggle off

    // Place path2 (left-right) at 5,4 (Right of 4,4).
    // New path at 5,4 has Left connection.
    // Existing path at 4,4 has Right connection.
    const cell54 = screen.getByTestId("cell-5-4");
    fireEvent.click(cell54);
    expect(cell54.getAttribute("data-cell-type")).toBe("path");
  });

  it("cannot place a path next to a room (paths must connect to paths)", () => {
    window.location.search = "?debug=true";
    render(<App />);

    // Place a room
    fireEvent.click(screen.getAllByTitle("Garrison")[0]);
    fireEvent.click(screen.getByTestId("cell-4-4"));

    const debugCheckbox = screen.getByLabelText(
      "ignore placement restrictions",
    );
    fireEvent.click(debugCheckbox); // Toggle off

    // Try to place a path next to it
    fireEvent.click(screen.getByTitle("path1"));
    const cell45 = screen.getByTestId("cell-4-5");
    fireEvent.click(cell45);
    expect(cell45.getAttribute("data-cell-type")).toBe(null);
  });
});
