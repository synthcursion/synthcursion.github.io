import { fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderApp } from "src/utils/test-utils.tsx";

describe("Reward Room Placement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("CAN place a reward room in isolation", () => {
    const { screen } = renderApp();

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
    const { screen } = renderApp();

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
