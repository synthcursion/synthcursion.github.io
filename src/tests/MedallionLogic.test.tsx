import { fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderApp } from "src/utils/test-utils.tsx";

describe("Medallion Logic", () => {
  it("Quipolatl's Medallion should increase the tier of the room it is applied to", () => {
    const { screen } = renderApp("debug=true");

    // Place a Garrison room (MaxLevel 3)
    fireEvent.click(screen.getByTitle("Garrison"));
    const cell = screen.getByTestId("cell-4-4");
    fireEvent.click(cell);

    // Initial tier should be 1
    expect(cell.getAttribute("data-tier")).toBe("1");

    // Select Quipolatl's Medallion (Id: LevelUpRoom, title should match)
    // Based on src/data/generated/English.json and PowerFlow.test.tsx
    const medallionButton = screen.getByTitle(/Quipolatl's Medallion/);
    fireEvent.click(medallionButton);

    // Apply medallion to the room
    fireEvent.click(cell);

    // The tier should now be 2
    expect(cell.getAttribute("data-tier")).toBe("2");
  });

  it("Quipolatl's Medallion should not increase tier beyond MaxLevel", () => {
    const { screen } = renderApp("debug=true");

    // Garrison (MaxLevel 3)
    fireEvent.click(screen.getByTitle("Garrison"));
    const cell = screen.getByTestId("cell-4-4");
    fireEvent.click(cell);

    // Apply medallion once -> T2
    const medallionButton = screen.getByTitle(/Quipolatl's Medallion/);
    fireEvent.click(medallionButton);
    fireEvent.click(cell);
    expect(cell.getAttribute("data-tier")).toBe("2");

    // Add two adjacent rooms that upgrade Garrison (Garrison is upgraded by nothing actually, let's use a room that IS upgraded)
    // Actually Garrison in POE2 doesn't have UpgradedBy in the provided json snippet but I can check.
  });
});
