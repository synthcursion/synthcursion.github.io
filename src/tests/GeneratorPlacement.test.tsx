import { fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "src/App.tsx";
import { renderWithProviders } from "src/utils/test-utils.tsx";

describe("Generator Placement Restrictions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("cannot place a generator on an empty grid", () => {
    const { screen } = renderWithProviders(<App />);
    const generatorButton = screen.getByTitle("Generator");
    fireEvent.click(generatorButton);

    const cell44 = screen.getByTestId("cell-4-4");
    fireEvent.click(cell44);

    expect(cell44.getAttribute("data-cell-type")).toBe(null);
  });

  it("cannot place a generator next to another room", () => {
    // We use debug mode to set up the initial state
    const { screen } = renderWithProviders(<App />, {
      queryString: "debug=true",
    });

    // Place a Garrison
    const garrisonButton = screen.getAllByTitle("Garrison")[0];
    fireEvent.click(garrisonButton);
    fireEvent.click(screen.getByTestId("cell-4-4"));

    // Turn off debug mode (simulated by state change or re-render if needed,
    // but here we just toggle the checkbox if it exists, or just rely on the fact that
    // getHighlightType doesn't care about debugMode state for the actual logic,
    // and handleCellClick uses the debugMode state).

    const debugCheckbox = screen.getByLabelText(
      "ignore placement restrictions",
    );
    fireEvent.click(debugCheckbox); // Toggle off

    const generatorButton = screen.getByTitle("Generator");
    fireEvent.click(generatorButton);

    const cell45 = screen.getByTestId("cell-4-5");
    fireEvent.click(cell45);

    expect(cell45.getAttribute("data-cell-type")).toBe(null);
  });

  it("cannot place a generator next to a path without a facing connection", () => {
    const { screen } = renderWithProviders(<App />, {
      queryString: "debug=true",
    });

    // Place a path1 (top-bottom) at 4,4
    fireEvent.click(screen.getByTitle("path1"));
    fireEvent.click(screen.getByTestId("cell-4-4"));

    const debugCheckbox = screen.getByLabelText(
      "ignore placement restrictions",
    );
    fireEvent.click(debugCheckbox); // Toggle off

    // Try to place Generator at 5,4 (Right of 4,4).
    // path1 at 4,4 only has top/bottom. Right is empty.
    fireEvent.click(screen.getByTitle("Generator"));
    const cell54 = screen.getByTestId("cell-5-4");
    fireEvent.click(cell54);

    expect(cell54.getAttribute("data-cell-type")).toBe(null);
  });

  it("CAN place a generator next to a path with a facing connection", () => {
    const { screen } = renderWithProviders(<App />, {
      queryString: "debug=true",
    });

    // Place a path2 (left-right) at 4,4
    fireEvent.click(screen.getByTitle("path2"));
    fireEvent.click(screen.getByTestId("cell-4-4"));

    const debugCheckbox = screen.getByLabelText(
      "ignore placement restrictions",
    );
    fireEvent.click(debugCheckbox); // Toggle off

    // Place Generator at 5,4 (Right of 4,4).
    // path2 at 4,4 has a 'right' connection.
    fireEvent.click(screen.getByTitle("Generator"));
    const cell54 = screen.getByTestId("cell-5-4");
    fireEvent.click(cell54);

    expect(cell54.getAttribute("data-cell-type")).toBe("room");
    expect(cell54.getAttribute("data-room-id")).toBe("Generator");
  });
});
