import { fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderApp } from "src/utils/test-utils.tsx";

describe("Room Deletion Restrictions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("cannot delete a room if it leaves another non-boss room stranded", () => {
    // Enable debug to set up the scenario easily
    const { screen } = renderApp("debug=true");

    // Place Garrison at 4,1 (above ENTRY 4,0)
    fireEvent.click(screen.getAllByTitle("Garrison")[0]);
    fireEvent.click(screen.getByTestId("cell-4-1"));

    // Place Armoury at 4,2 (above Garrison)
    fireEvent.click(screen.getAllByTitle("Armoury")[0]);
    fireEvent.click(screen.getByTestId("cell-4-2"));

    // Garrison should still be there
    expect(screen.getByTestId("cell-4-1").getAttribute("data-room-id")).toBe(
      "Garrison",
    );
    expect(screen.getByTestId("cell-4-2").getAttribute("data-room-id")).toBe(
      "Armoury",
    );

    // Toggle debug off
    const debugCheckbox = screen.getByLabelText(
      "ignore placement restrictions",
    );
    fireEvent.click(debugCheckbox);

    // Try to delete Garrison (4,1). Armoury (4,2) will be stranded.
    fireEvent.click(screen.getByTitle("Eraser"));
    fireEvent.click(screen.getByTestId("cell-4-1"));

    // Garrison should still be there
    expect(screen.getByTestId("cell-4-1").getAttribute("data-room-id")).toBe(
      "Garrison",
    );
    expect(screen.getByTestId("cell-4-2").getAttribute("data-room-id")).toBe(
      "Armoury",
    );
  });

  it("CAN delete a room if it only leaves a boss/reward room stranded", () => {
    // Enable debug to set up the scenario easily
    const { screen } = renderApp("debug=true");

    // Place Garrison at 4,1
    fireEvent.click(screen.getAllByTitle("Garrison")[0]);
    fireEvent.click(screen.getByTestId("cell-4-1"));

    // Place Currency Vault (Reward) at 4,2
    fireEvent.click(screen.getAllByTitle("Currency Vault")[0]);
    fireEvent.click(screen.getByTestId("cell-4-2"));

    // Toggle debug off
    const debugCheckbox = screen.getByLabelText(
      "ignore placement restrictions",
    );
    fireEvent.click(debugCheckbox);

    // Try to delete Garrison (4,1). Reward room (4,2) will be stranded, which is allowed.
    fireEvent.click(screen.getByTitle("Eraser"));
    fireEvent.click(screen.getByTestId("cell-4-1"));

    // Garrison should be gone (null or empty)
    const cell41 = screen.getByTestId("cell-4-1");
    expect(cell41.getAttribute("data-cell-type")).toBe(null);
    expect(screen.getByTestId("cell-4-2").getAttribute("data-cell-type")).toBe(
      "room",
    );
  });
});
