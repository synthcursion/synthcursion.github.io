import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "src/App.tsx";
import { renderWithProviders } from "src/utils/test-utils.tsx";

describe("Room Conversion Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("converts Garrison to Legion Barracks when placed next to Spymaster", async () => {
    const { screen } = renderWithProviders(<App />, {
      queryString: "debug=true",
    });

    // Place Garrison at 4,4
    fireEvent.click(screen.getAllByTitle("Garrison")[0]);
    fireEvent.click(screen.getByTestId("cell-4-4"));

    // Check it's Garrison initially
    let cell44 = screen.getByTestId("cell-4-4");
    expect(cell44.getAttribute("data-room-id")).toBe("Garrison");

    // Place Spymaster at 4,5
    fireEvent.click(screen.getAllByTitle("Spymaster")[0]);
    fireEvent.click(screen.getByTestId("cell-4-5"));

    // Verify Garrison at 4,4 converted to Legion Barracks
    cell44 = screen.getByTestId("cell-4-4");
    expect(cell44.getAttribute("data-room-id")).toBe("ViperLegionBarracks");
  });

  it("converts Legion Barracks to Transcendent Barracks when placed next to Synthflesh Lab", async () => {
    const { screen } = renderWithProviders(<App />, {
      queryString: "debug=true",
    });

    // Place Garrison at 4,4
    fireEvent.click(screen.getAllByTitle("Garrison")[0]);
    fireEvent.click(screen.getByTestId("cell-4-4"));

    // Place Spymaster at 4,5 -> Converts Garrison to Legion Barracks
    fireEvent.click(screen.getAllByTitle("Spymaster")[0]);
    fireEvent.click(screen.getByTestId("cell-4-5"));

    let cell44 = screen.getByTestId("cell-4-4");
    expect(cell44.getAttribute("data-room-id")).toBe("ViperLegionBarracks");

    // Place Synthflesh Lab at 5,4
    fireEvent.click(screen.getAllByTitle("Synthflesh Lab")[0]);
    fireEvent.click(screen.getByTestId("cell-5-4"));

    // Verify Legion Barracks at 4,4 converted to Transcendent Barracks
    cell44 = screen.getByTestId("cell-4-4");
    expect(cell44.getAttribute("data-room-id")).toBe("TranscendentBarracks");
  });
});
