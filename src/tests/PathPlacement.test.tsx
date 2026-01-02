import { fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "src/App.tsx";
import { renderWithProviders } from "src/utils/test-utils.tsx";

describe("Path Placement Restrictions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("cannot place a path in isolation if the grid is not empty", () => {
    const { screen } = renderWithProviders(<App />, {
      queryString: "debug=true",
    });

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
    const { screen } = renderWithProviders(<App />, {
      queryString: "debug=true",
    });

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
    const { screen } = renderWithProviders(<App />, {
      queryString: "debug=true",
    });

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
    const { screen } = renderWithProviders(<App />, {
      queryString: "debug=true",
    });

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
