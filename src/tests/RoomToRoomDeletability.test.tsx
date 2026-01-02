import { fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "src/App.tsx";
import { renderWithProviders } from "src/utils/test-utils.tsx";

describe("Room to Room Deletability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should NOT allow deleting a room if it is the only connection to another room via room-to-room connection", () => {
    const { screen } = renderWithProviders(<App />, {
      queryString: "debug=true",
    });

    // Place Path at 4,1
    fireEvent.click(screen.getByTitle("path2"));
    fireEvent.click(screen.getByTestId("cell-4-1"));

    // Place Garrison at 3,1
    fireEvent.click(screen.getAllByTitle("Garrison")[0]);
    fireEvent.click(screen.getByTestId("cell-3-1"));

    // Place Commander at 2,1 (Commander IS upgraded by Garrison)
    fireEvent.click(screen.getAllByTitle("Commander")[0]);
    fireEvent.click(screen.getByTestId("cell-2-1"));

    // Toggle debug off
    const debugCheckbox = screen.getByLabelText(
      "ignore placement restrictions",
    );
    fireEvent.click(debugCheckbox);

    // Now: Entry (4,0) -> Path (4,1) -> Garrison (3,1) -> Commander (2,1)
    // Garrison (3,1) is connected to Path (4,1) via room-to-path connection (calculated internally)
    // Commander (2,1) is connected to Garrison (3,1) via room-to-room connection (upgradedBy)

    // If we try to delete Garrison (3,1), Commander (2,1) would be stranded.
    // So Garrison (3,1) should NOT be deletable.

    fireEvent.click(screen.getByTitle("Eraser"));
    fireEvent.click(screen.getByTestId("cell-3-1"));

    // Garrison should still be there if it's NOT deletable
    expect(screen.getByTestId("cell-3-1").getAttribute("data-cell-type")).toBe(
      "room",
    );
  });

  it("should allow deleting a room if the other room is NOT connected via room-to-room connection and has another connection", () => {
    const { screen } = renderWithProviders(<App />, {
      queryString: "debug=true",
    });

    // Place Path at 4,1 and 2,1
    fireEvent.click(screen.getByTitle("path2"));
    fireEvent.click(screen.getByTestId("cell-4-1"));
    fireEvent.click(screen.getByTestId("cell-2-1"));

    // Place Garrison at 3,1 (Connected to Path 4,1)
    fireEvent.click(screen.getAllByTitle("Garrison")[0]);
    fireEvent.click(screen.getByTestId("cell-3-1"));

    // Place Armoury at 2,2 (Connected to nothing yet)
    // Actually let's make them adjacent:
    // Garrison at 3,1
    // Armoury at 3,2
    // Path at 4,1 connects to 3,1
    // Path at 4,2 connects to 3,2

    fireEvent.click(screen.getByTestId("cell-4-1")); // Path at 4,1
    fireEvent.click(screen.getByTestId("cell-4-2")); // Path at 4,2

    fireEvent.click(screen.getAllByTitle("Garrison")[0]);
    fireEvent.click(screen.getByTestId("cell-3-1"));

    fireEvent.click(screen.getAllByTitle("Armoury")[0]);
    fireEvent.click(screen.getByTestId("cell-3-2"));

    // Toggle debug off
    const debugCheckbox = screen.getByLabelText(
      "ignore placement restrictions",
    );
    fireEvent.click(debugCheckbox);

    // Now:
    // Entry (4,0) -> Path (4,1) -> Garrison (3,1)
    // Entry (4,0) -> Path (4,1) -> Path (4,2) -> Armoury (3,2)
    // Garrison (3,1) and Armoury (3,2) are adjacent but NOT connected via R2R.

    // Deleting Garrison (3,1) should be allowed.
    fireEvent.click(screen.getByTitle("Eraser"));
    fireEvent.click(screen.getByTestId("cell-3-1"));

    // Garrison should be gone
    expect(screen.getByTestId("cell-3-1").getAttribute("data-cell-type")).toBe(
      null,
    );
  });

  it("should NOT allow deleting Armoury at 4,1 if it's the sole connection for Garrison at 4,2 and Armoury at 4,3", () => {
    const { screen } = renderWithProviders(<App />, {
      queryString: "debug=true",
    });

    // Place Armoury at 4,1
    fireEvent.click(screen.getAllByTitle("Armoury")[0]);
    fireEvent.click(screen.getByTestId("cell-4-1"));

    // Place Garrison at 4,2
    fireEvent.click(screen.getAllByTitle("Garrison")[0]);
    fireEvent.click(screen.getByTestId("cell-4-2"));

    // Place Armoury at 4,3
    fireEvent.click(screen.getAllByTitle("Armoury")[0]);
    fireEvent.click(screen.getByTestId("cell-4-3"));

    // Toggle debug off
    const debugCheckbox = screen.getByLabelText(
      "ignore placement restrictions",
    );
    fireEvent.click(debugCheckbox);

    // Try to delete Armoury (4,1)
    fireEvent.click(screen.getByTitle("Eraser"));
    fireEvent.click(screen.getByTestId("cell-4-1"));

    // Armoury (4,1) should still be there
    expect(screen.getByTestId("cell-4-1").getAttribute("data-cell-type")).toBe(
      "room",
    );
    expect(screen.getByTestId("cell-4-2").getAttribute("data-cell-type")).toBe(
      "room",
    );
    expect(screen.getByTestId("cell-4-3").getAttribute("data-cell-type")).toBe(
      "room",
    );
  });
});
