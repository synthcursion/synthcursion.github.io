import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import App from "./App";

// Mock URL and window.history since the App uses it for persistence
const mockReplaceState = vi.fn();
Object.defineProperty(window, "history", {
  value: {
    replaceState: mockReplaceState,
  },
});

// Mocking window.location.search
Object.defineProperty(window, "location", {
  value: {
    search: "",
    href: "http://localhost/",
  },
  writable: true,
});

describe("Reward Room Placement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.location.search = "";
  });

  it("CAN place a reward room in isolation", () => {
    render(<App />);

    // Currency Vault is a reward room (IsBossReward: true)
    // Find Currency Vault button
    const rewardRoomBtn = screen.getAllByTitle("Currency Vault")[0];
    fireEvent.click(rewardRoomBtn);

    // Try to place it at 8,8 (far from entry at 4,0)
    const cell88 = screen.getByTestId("cell-8-8");
    fireEvent.click(cell88);

    // It should be placed
    expect(cell88.getAttribute("data-cell-type")).toBe("room");
    expect(cell88.getAttribute("data-room-id")).toBe("CurrencyReward");
  });

  it("cannot place a regular room in isolation", () => {
    render(<App />);

    // Garrison is NOT a reward room
    const regularRoomBtn = screen.getAllByTitle("Garrison")[0];
    fireEvent.click(regularRoomBtn);

    // Try to place it at 8,8
    const cell88 = screen.getByTestId("cell-8-8");
    fireEvent.click(cell88);

    // It should NOT be placed
    expect(cell88.getAttribute("data-cell-type")).toBe(null);
  });
});
