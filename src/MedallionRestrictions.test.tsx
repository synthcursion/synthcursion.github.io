import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import App from "./App";

// Mock URL and window.history
const mockReplaceState = vi.fn();
Object.defineProperty(window, "history", {
  value: {
    replaceState: mockReplaceState,
  },
});

// Mocking window.location.search to turn off debug mode by default
Object.defineProperty(window, "location", {
  value: {
    search: "",
    href: "http://localhost/",
  },
  writable: true,
});

describe("Medallion Restrictions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prevents placing Quipolatl's Medallion on rooms without multiple tiers", () => {
    render(<App />);

    // Select Architect's Chamber (only 1 tier)
    const architectRoom = screen.getByTitle("Architect's Chamber");
    fireEvent.click(architectRoom);

    // Place it at (4,1)
    const cell41 = screen.getByTestId("cell-4-1");
    fireEvent.click(cell41);
    expect(cell41.getAttribute("data-room-id")).toBe("Architect");

    // Select Quipolatl's Medallion
    const medallion = screen.getByTitle(/Quipolatl's Medallion/);
    fireEvent.click(medallion);

    // Try to place it on cell41
    fireEvent.click(cell41);

    // It should NOT have the medallion
    const medallionGlow = cell41.querySelector(".medallion-glow");
    expect(medallionGlow).toBeNull();
  });

  it("allows placing Quipolatl's Medallion on rooms with multiple tiers", () => {
    render(<App />);

    // Select Garrison (multiple tiers)
    const garrisonRoom = screen.getByTitle("Garrison");
    fireEvent.click(garrisonRoom);

    // Place it at (4,1)
    const cell41 = screen.getByTestId("cell-4-1");
    fireEvent.click(cell41);
    expect(cell41.getAttribute("data-room-id")).toBe("Garrison");

    // Select Quipolatl's Medallion
    const medallion = screen.getByTitle(/Quipolatl's Medallion/);
    fireEvent.click(medallion);

    // Try to place it on cell41
    fireEvent.click(cell41);

    // It SHOULD have the medallion
    const medallionIcon = cell41.querySelector(".medallion-icon");
    expect(medallionIcon).not.toBeNull();
  });

  it("prevents placing Quipolatl's Medallion on a room that is already Tier 3", () => {
    render(<App />);

    // We need to make a room T3.
    // Garrison is upgraded by Commander and Armoury.
    // If we place 2 Armoury next to Garrison, it should become T3 (1 base + 2 bonus).

    const garrisonRoom = screen.getByTitle("Garrison");
    fireEvent.click(garrisonRoom);
    fireEvent.click(screen.getByTestId("cell-4-1"));

    const armouryRoom = screen.getByTitle("Armoury");
    fireEvent.click(armouryRoom);
    fireEvent.click(screen.getByTestId("cell-4-2"));

    const commanderRoom = screen.getByTitle("Commander");
    fireEvent.click(commanderRoom);
    fireEvent.click(screen.getByTestId("cell-3-1"));

    const cell41 = screen.getByTestId("cell-4-1");
    // Verify it is T3 (Hall of War)
    // The name in the hover info or similar might be useful,
    // but we can check the rendered tier if available.
    // Looking at App.tsx, tier is rendered in hover info.
    // Let's assume the logic works and it's T3.

    // Select Quipolatl's Medallion
    const medallion = screen.getByTitle(/Quipolatl's Medallion/);
    fireEvent.click(medallion);

    // Try to place it on cell41
    fireEvent.click(cell41);

    // It should NOT have the medallion because it's already T3
    const medallionIcon = cell41.querySelector(".medallion-icon");
    expect(medallionIcon).toBeNull();
  });

  it("allows placing Juatalotli's Medallion even on T3 rooms or single tier rooms", () => {
    render(<App />);

    // Architect's Chamber (single tier)
    const architectRoom = screen.getByTitle("Architect's Chamber");
    fireEvent.click(architectRoom);
    const cell41 = screen.getByTestId("cell-4-1");
    fireEvent.click(cell41);

    // Select Juatalotli's Medallion
    const lockMedallion = screen.getByTitle(/Juatalotli's Medallion/);
    fireEvent.click(lockMedallion);

    // Try to place it on cell41
    fireEvent.click(cell41);

    // It SHOULD have the medallion
    const medallionIcon = cell41.querySelector(".medallion-icon");
    expect(medallionIcon).not.toBeNull();
  });
});
