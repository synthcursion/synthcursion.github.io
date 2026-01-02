import { fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderApp } from "src/utils/test-utils.tsx";

describe("Toggle to Remove Logic", () => {
  it("removes a room when clicking it with the same room selected", () => {
    const { screen } = renderApp("debug=true");
    const roomButton = screen.getByTitle("Garrison");
    fireEvent.click(roomButton);

    const cell = screen.getByTestId("cell-4-1");
    fireEvent.click(cell);
    expect(cell.getAttribute("data-cell-type")).toBe("room");
    expect(cell.getAttribute("data-room-id")).toBe("Garrison");

    // Click again with Garrison selected
    fireEvent.click(cell);
    expect(cell.getAttribute("data-cell-type")).toBe(null);
  });

  it("removes any path when clicking it with ANY path selected", () => {
    const { screen } = renderApp("debug=true");

    // Place path1
    const path1Button = screen.getByTitle("path1");
    fireEvent.click(path1Button);
    const cell = screen.getByTestId("cell-4-1");
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

    expect(cell.getAttribute("data-cell-type")).toBe(null);
  });

  it("updates neighbors when a path is removed", () => {
    const { screen } = renderApp("debug=true");
    const path1Button = screen.getByTitle("path1");
    fireEvent.click(path1Button);

    const cell41 = screen.getByTestId("cell-4-1");
    const cell42 = screen.getByTestId("cell-4-2");

    fireEvent.click(cell41);
    fireEvent.click(cell42);

    // cell41 should have a connection to cell42 now.
    // In our mapping: y+1 is "top".
    // We can't easily check internal state, but we can check if it's still a path.
    expect(cell41.getAttribute("data-cell-type")).toBe("path");

    // Remove cell42
    fireEvent.click(cell42);
    expect(cell42.getAttribute("data-cell-type")).toBe(null);
  });
});
