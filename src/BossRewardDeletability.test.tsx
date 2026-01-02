import { fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";
import { renderWithProviders } from "src/test-utils.tsx";

describe("Boss and Reward Room Deletability and Placement", () => {
  it("Boss rooms skip placement restrictions (can be placed in isolation)", () => {
    const queryString = "?debug=true";
    const { screen } = renderWithProviders(<App />, { queryString });

    // Toggle debug off immediately - we want to test normal placement
    const debugCheckbox = screen.getByLabelText(
      "ignore placement restrictions",
    );
    fireEvent.click(debugCheckbox);

    // Try to place Royal Access Chamber (Boss/Reward) at 4,4 (far from ENTRY 4,0)
    fireEvent.click(screen.getAllByTitle("Royal Access Chamber")[0]);
    const cell44 = screen.getByTestId("cell-4-4");
    fireEvent.click(cell44);

    // It should be placed
    expect(cell44.getAttribute("data-cell-type")).toBe("room");
  });

  it("Boss rooms are always deletable even if they would break local placement of neighbors", () => {
    const queryString = "?debug=true";
    const { screen } = renderWithProviders(<App />, { queryString });

    // Place Royal Access Chamber at 4,1 (above ENTRY 4,0)
    fireEvent.click(screen.getAllByTitle("Royal Access Chamber")[0]);
    fireEvent.click(screen.getByTestId("cell-4-1"));

    // Place a path at 4,2 (above Royal Access Chamber)
    // A path at 4,2 needs a neighbor to be placeable.
    // If we delete the Royal Access Chamber at 4,1, the path at 4,2 might become "invalid" locally.
    fireEvent.click(screen.getByTitle("path1"));
    fireEvent.click(screen.getByTestId("cell-4-2"));

    // Toggle debug off
    const debugCheckbox = screen.getByLabelText(
      "ignore placement restrictions",
    );
    fireEvent.click(debugCheckbox);

    // Try to delete Royal Access Chamber (4,1).
    fireEvent.click(screen.getByTitle("Eraser"));
    fireEvent.click(screen.getByTestId("cell-4-1"));

    // It should be gone
    expect(screen.getByTestId("cell-4-1").getAttribute("data-cell-type")).toBe(
      null,
    );
  });
});
