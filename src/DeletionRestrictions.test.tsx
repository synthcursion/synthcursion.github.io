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

// Mocking window.location.search without debug=true by default to test restrictions
Object.defineProperty(window, "location", {
  value: {
    search: "",
    href: "http://localhost/",
  },
  writable: true,
});

describe("Deletion Restrictions Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not allow deleting a tile if it leaves a neighbor unplaceable", () => {
    render(<App />);

    // Select path1 (top-bottom)
    const path1Button = screen.getByTitle("path1");
    fireEvent.click(path1Button);

    // Place path at (4,1) (next to ENTRY at 4,0)
    const cell41 = screen.getByTestId("cell-4-1");
    fireEvent.click(cell41);
    expect(cell41.getAttribute("data-cell-type")).toBe("path");

    // Place path at (4,2)
    const cell42 = screen.getByTestId("cell-4-2");
    fireEvent.click(cell42);
    expect(cell42.getAttribute("data-cell-type")).toBe("path");

    // (4,1) is the only reason (4,2) is placeable.
    // Try to delete (4,1).
    fireEvent.click(cell41);

    // It should STILL BE THERE because deleting it would leave (4,2) disconnected.
    expect(cell41.getAttribute("data-cell-type")).toBe("path");

    // Delete (4,2) first.
    fireEvent.click(cell42);
    expect(cell42.getAttribute("data-cell-type")).toBe(null);

    // Now (4,1) should be deletable.
    fireEvent.click(cell41);
    expect(cell41.getAttribute("data-cell-type")).toBe(null);
  });

  it("allows deleting a tile if neighbors have other connections", () => {
    render(<App />);

    // Select path1 (top-bottom)
    const path1Button = screen.getByTitle("path1");
    fireEvent.click(path1Button);

    const cell41 = screen.getByTestId("cell-4-1");
    const cell42 = screen.getByTestId("cell-4-2");
    const cell52 = screen.getByTestId("cell-5-2");
    const cell51 = screen.getByTestId("cell-5-1");

    // Path: ENTRY(4,0) -> (4,1) -> (4,2) -> (5,2) -> (5,1) -> (4,1)
    fireEvent.click(cell41); // next to (4,0)
    fireEvent.click(cell42); // next to (4,1)

    // Select path2 (left-right) to connect (4,2) and (5,2)
    const path2Button = screen.getByTitle("path2");
    fireEvent.click(path2Button);
    fireEvent.click(cell52); // next to (4,2)
    fireEvent.click(cell51); // next to (5,2) AND (4,1)

    expect(cell41.getAttribute("data-cell-type")).toBe("path");
    expect(cell42.getAttribute("data-cell-type")).toBe("path");
    expect(cell52.getAttribute("data-cell-type")).toBe("path");
    expect(cell51.getAttribute("data-cell-type")).toBe("path");

    // Deleting (4,2) should be allowed because (5,2) is connected via (5,1) to (4,1).
    fireEvent.click(cell42);
    expect(cell42.getAttribute("data-cell-type")).toBe(null);
    expect(cell52.getAttribute("data-cell-type")).toBe("path");
  });

  it("shows red glow for deletable tiles regardless of selection", () => {
    render(<App />);

    const path1Button = screen.getByTitle("path1");
    fireEvent.click(path1Button);

    const cell41 = screen.getByTestId("cell-4-1");
    fireEvent.click(cell41);

    // Hover (4,1) with path1 selected
    fireEvent.mouseEnter(cell41);
    let glow = cell41.querySelector(".placement-glow");
    expect(glow?.getAttribute("src")).toContain("incursion2tileglowred.png");

    // Now select a different room type, e.g., Garrison
    const roomButton = screen.getByTitle("Garrison");
    fireEvent.click(roomButton);

    // Hover (4,1) again
    fireEvent.mouseEnter(cell41);
    glow = cell41.querySelector(".placement-glow");
    expect(glow?.getAttribute("src")).toContain("incursion2tileglowred.png");
  });
});
