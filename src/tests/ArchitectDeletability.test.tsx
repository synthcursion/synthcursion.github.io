import { act, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "src/App.tsx";
import { renderWithProviders } from "src/utils/test-utils.tsx";

describe("Architect Deletability Influence", () => {
  it("placing Architect should not prevent deletion of other rooms that connect it", async () => {
    // Enable debug to set up the scenario
    const queryString = "?debug=true";
    const { screen } = renderWithProviders(<App />, { queryString });

    await act(async () => {
      // Place Garrison at 4,1 (above ENTRY 4,0)
      fireEvent.click(screen.getAllByTitle("Garrison")[0]);
      fireEvent.click(screen.getByTestId("cell-4-1"));

      // Place Architect at 4,2 (above Garrison)
      fireEvent.click(screen.getAllByTitle("Architect's Chamber")[0]);
      fireEvent.click(screen.getByTestId("cell-4-2"));

      // Toggle debug off
      const debugCheckbox = screen.getByLabelText(
        "ignore placement restrictions",
      );
      fireEvent.click(debugCheckbox);

      // Try to delete Garrison (4,1).
      // If Architect (4,2) is treated as a regular room that MUST be reachable,
      // deleting Garrison will be blocked because Architect would be stranded.
      fireEvent.click(screen.getByTitle("Eraser"));
      fireEvent.click(screen.getByTestId("cell-4-1"));
    });

    // Expected behavior per issue: Architect should NOT affect deletability.
    // So Garrison SHOULD be deletable even if Architect is stranded.
    const cell41 = screen.getByTestId("cell-4-1");
    expect(cell41.getAttribute("data-cell-type")).toBe(null);
  });
});
