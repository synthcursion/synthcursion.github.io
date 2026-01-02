import { fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderApp } from "src/utils/test-utils.tsx";

describe("Spymaster Placement and Conversion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const initialStateQuery =
    "?rooms[]=Garrison-5-0&rooms[]=Commander-5-1&rooms[]=Garrison-5-2&rooms[]=Garrison-6-1&rooms[]=Armoury-6-2";

  it("validates that a spymaster is highlighted as placeable, with a strong glow, at 6,0", () => {
    const { screen } = renderApp(initialStateQuery + "&debug=true");

    // Select Spymaster
    const spymasterButton = screen.getAllByTitle("Spymaster")[0];
    fireEvent.click(spymasterButton);

    const cell60 = screen.getByTestId("cell-6-0");
    // We need to wait for the next tick for the highlight to update or just trigger it
    fireEvent.mouseOver(cell60);
    const glow = cell60.querySelector(".placement-glow");

    expect(glow).toBeTruthy();
    expect(glow?.getAttribute("src")).toContain("incursion2tileglowstrong.png");
  });

  it("converts garrisons after placing spymaster at 6,0", async () => {
    const { screen } = renderApp(initialStateQuery + "&debug=true");

    // Select Spymaster
    const spymasterButton = screen.getAllByTitle("Spymaster")[0];
    fireEvent.click(spymasterButton);

    // Place Spymaster at 6,0
    const cell60 = screen.getByTestId("cell-6-0");
    fireEvent.mouseOver(cell60); // Ensure highlight state is updated if needed
    fireEvent.click(cell60);

    // Verify conversions
    // Garrison at 5,0 -> t2 legion barracks
    // Garrison at 6,1 -> t3 legion barracks
    const cell50 = screen.getByTestId("cell-5-0");
    const cell61 = screen.getByTestId("cell-6-1");

    expect(cell50.getAttribute("data-room-id")).toBe("ViperLegionBarracks");
    expect(cell50.getAttribute("data-tier")).toBe("2");

    expect(cell61.getAttribute("data-room-id")).toBe("ViperLegionBarracks");
    expect(cell61.getAttribute("data-tier")).toBe("3");
  });
});
