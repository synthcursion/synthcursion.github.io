import { fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderApp } from "src/utils/test-utils.tsx";

// Mock ResizeObserver for react-tooltip
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

describe("Deletion Restrictions Logic", () => {
  it("does not allow deleting a tile if it leaves a neighbor unplaceable", () => {
    const { screen } = renderApp();

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
    const { screen } = renderApp();

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
    const { screen } = renderApp("paths[]=path1-4-1");

    const cell41 = screen.getByTestId("cell-4-1");

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

  it("checks this one particular case", () => {
    const GRID_SIZE = 9;
    const initialGrid = Array(GRID_SIZE)
      .fill(null)
      .map(() => Array(GRID_SIZE).fill(null));

    // ENTRY at 4,0
    initialGrid[4][0] = { type: "path", pathType: "pathfourway" };
    // Commander-5-0
    initialGrid[5][0] = { type: "room", roomId: "Commander", tier: 1 };
    // Garrison-6-0
    initialGrid[6][0] = { type: "room", roomId: "Garrison", tier: 1 };
    // Armoury-6-1
    initialGrid[6][1] = { type: "room", roomId: "Armoury", tier: 1 };
    // Commander-7-0
    initialGrid[7][0] = { type: "room", roomId: "Commander", tier: 1 };
    // Garrison-7-1
    initialGrid[7][1] = { type: "room", roomId: "Garrison", tier: 1 };
    // Garrison-8-0
    initialGrid[8][0] = { type: "room", roomId: "Garrison", tier: 1 };
    // Armoury-8-1
    initialGrid[8][1] = { type: "room", roomId: "Armoury", tier: 1 };

    const { screen } = renderApp(
      "rooms[]=Commander-5-0&rooms[]=Garrison-6-0&rooms[]=Armoury-6-1&rooms[]=Commander-7-0&rooms[]=Garrison-7-1&rooms[]=Garrison-8-0&rooms[]=Armoury-8-1",
    );

    const cell71 = screen.getByTestId("cell-7-1");

    // Select Eraser
    const eraserButton = screen.getByTitle("Eraser");
    fireEvent.click(eraserButton);

    // Click to delete
    fireEvent.click(cell71);

    // If it's deletable, it should be null
    expect(cell71.getAttribute("data-cell-type")).toBe(null);
  });

  it("implements the same deletability logic for paths", () => {
    const { screen } = renderApp(
      "?paths[]=path1-4-1&paths[]=path1-4-2&paths[]=path1-4-3",
    );

    const cell41 = screen.getByTestId("cell-4-1");
    const cell42 = screen.getByTestId("cell-4-2");
    const cell43 = screen.getByTestId("cell-4-3");

    expect(cell41.getAttribute("data-cell-type")).toBe("path");
    expect(cell42.getAttribute("data-cell-type")).toBe("path");
    expect(cell43.getAttribute("data-cell-type")).toBe("path");

    // Select Eraser
    const eraserButton = screen.getByTitle("Eraser");
    fireEvent.click(eraserButton);

    // Try to delete (4,1)
    fireEvent.click(cell41);

    // It should NOT be deletable because it would leave (4,2) and (4,3) stranded
    expect(cell41.getAttribute("data-cell-type")).toBe("path");
  });
});
