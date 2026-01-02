import { fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderApp } from "src/utils/test-utils.tsx";

export const ENTRY = { x: 4, y: 0 };

describe(`Unremovable Four-way Path at (${ENTRY.x},${ENTRY.y})`, () => {
  it(`should have a path at (${ENTRY.x},${ENTRY.y}) on initial load`, () => {
    const { screen } = renderApp();
    const cellEntry = screen.getByTestId(`cell-${ENTRY.x}-${ENTRY.y}`);
    expect(cellEntry.getAttribute("data-cell-type")).toBe("path");
  });

  it("should not be removable by the eraser", () => {
    const { screen } = renderApp();
    const eraserButton = screen.getByTitle("Eraser");
    fireEvent.click(eraserButton);

    const cellEntry = screen.getByTestId(`cell-${ENTRY.x}-${ENTRY.y}`);
    fireEvent.click(cellEntry);

    expect(cellEntry.getAttribute("data-cell-type")).toBe("path");
  });

  it("should not be modifiable by another room type", () => {
    const { screen } = renderApp();
    const garrisonButton = screen.getByTitle("Garrison");
    fireEvent.click(garrisonButton);

    const cellEntry = screen.getByTestId(`cell-${ENTRY.x}-${ENTRY.y}`);
    fireEvent.click(cellEntry);

    expect(cellEntry.getAttribute("data-cell-type")).toBe("path");
    expect(cellEntry.getAttribute("data-room-id")).not.toBe("Garrison");
  });

  it("should remain after Clear Grid is clicked", () => {
    const { screen } = renderApp();
    const clearButton = screen.getByText("Clear Grid");
    fireEvent.click(clearButton);

    const cellEntry = screen.getByTestId(`cell-${ENTRY.x}-${ENTRY.y}`);
    expect(cellEntry.getAttribute("data-cell-type")).toBe("path");
  });
});
