import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import App from "./App";
import data from "./data/generated/English.json";

const roomsData = data.Incursion2Rooms as any;

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
    search: "?debug=true",
    href: "http://localhost/?debug=true",
  },
  writable: true,
});

describe("Connection Logic Visuals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows room-to-room connection for Architect", () => {
    render(<App />);

    // Place Architect at 4,4
    fireEvent.click(screen.getByTitle("Architect's Chamber"));
    fireEvent.click(screen.getByTestId("cell-4-4"));

    // Place Garrison at 4,5
    fireEvent.click(screen.getByTitle("Garrison"));
    fireEvent.click(screen.getByTestId("cell-4-5"));

    // (4,5) is y+1 relative to (4,4) -> direction "top" for (4,4)
    // (4,4) is y-1 relative to (4,5) -> direction "bottom" for (4,5)

    const architectCell = screen.getByTestId("cell-4-4");
    const garrisonCell = screen.getByTestId("cell-4-5");

    // Check for connection images
    const r2r_top = architectCell.querySelector(
      'img[src*="roomconnectroomvertical"]',
    );
    const r2r_bot = garrisonCell.querySelector(
      'img[src*="roomconnectroomvertical"]',
    );

    expect(r2r_top).toBeTruthy();
    expect(r2r_bot).toBeTruthy();

    expect(r2r_top?.className).toContain("room-connect-top");
    expect(r2r_bot?.className).toContain("room-connect-bottom");
  });

  it("shows room-to-room connection for Reward rooms", () => {
    render(<App />);

    // Find a reward room. "Atziri" is one, but it's fixed at 4,9.
    // Let's find another one from data.
    const rewardRoom = Object.values(roomsData).find(
      (r: any) => r.IsBossReward && r.Id !== "Atziri",
    ) as any;

    fireEvent.click(screen.getByTitle(rewardRoom.Name));
    fireEvent.click(screen.getByTestId("cell-4-4"));

    // Place Garrison at 5,4 (right)
    fireEvent.click(screen.getByTitle("Garrison"));
    fireEvent.click(screen.getByTestId("cell-5-4"));

    const rewardCell = screen.getByTestId("cell-4-4");
    const garrisonCell = screen.getByTestId("cell-5-4");

    const r2r_right = rewardCell.querySelector(
      'img[src*="roomconnectroomhorizontal"]',
    );
    const r2r_left = garrisonCell.querySelector(
      'img[src*="roomconnectroomhorizontal"]',
    );

    expect(r2r_right).toBeTruthy();
    expect(r2r_left).toBeTruthy();

    expect(r2r_right?.className).toContain("room-connect-right");
    expect(r2r_left?.className).toContain("room-connect-left");
  });

  it("shows room-to-room connection for UpgradedBy rooms", () => {
    render(<App />);

    // Garrison is upgraded by Commander
    fireEvent.click(screen.getByTitle("Garrison"));
    fireEvent.click(screen.getByTestId("cell-4-4"));

    fireEvent.click(screen.getByTitle("Commander"));
    fireEvent.click(screen.getByTestId("cell-4-3")); // y-1 -> bottom of Garrison

    const garrisonCell = screen.getByTestId("cell-4-4");
    const commanderCell = screen.getByTestId("cell-4-3");

    const r2r_bot = garrisonCell.querySelector(
      'img[src*="roomconnectroomvertical"]',
    );
    const r2r_top = commanderCell.querySelector(
      'img[src*="roomconnectroomvertical"]',
    );

    expect(r2r_bot).toBeTruthy();
    expect(r2r_top).toBeTruthy();

    expect(r2r_bot?.className).toContain("room-connect-bottom");
    expect(r2r_top?.className).toContain("room-connect-top");
  });

  it("shows room-to-path connection when NOT connected to a path", () => {
    render(<App />);

    // Place a room at 4,4
    fireEvent.click(screen.getByTitle("Garrison"));
    fireEvent.click(screen.getByTestId("cell-4-4"));

    // Place path1 (top-bottom) at 4,5.
    // (4,5) is Bottom relative to (4,4).
    // path1 at (4,5) has top connection.
    // Garrison at (4,4) should NOT have room-to-path connection to (4,5) because they ARE connected.

    fireEvent.click(screen.getByTitle("path1"));
    fireEvent.click(screen.getByTestId("cell-4-5"));

    const garrisonCell = screen.getByTestId("cell-4-4");
    const r2p_bot = garrisonCell.querySelector('img[src*="roomconnectdown"]');
    expect(r2p_bot).toBeFalsy();

    // Now place path2 (left-right) at 4,3.
    // (4,3) is y-1 relative to (4,4) -> bottom.
    // path2 at (4,3) does NOT have top connection.
    // Garrison at (4,4) SHOULD have room-to-path connection to (4,3).

    fireEvent.click(screen.getByTitle("path2"));
    fireEvent.click(screen.getByTestId("cell-4-3"));

    const r2p_bot_after = garrisonCell.querySelector(
      'img[src*="roomconnectdown"]',
    );
    expect(r2p_bot_after).toBeTruthy();
    expect(r2p_bot_after?.className).toContain("room-connect-bottom");
  });

  it("shows powered connections when powered", () => {
    render(<App />);

    // Place Generator at 4,4
    fireEvent.click(screen.getByTitle("Generator"));
    fireEvent.click(screen.getByTestId("cell-4-4"));

    // Place Architect at 4,5 (y+1 -> Top)
    fireEvent.click(screen.getByTitle("Architect's Chamber"));
    fireEvent.click(screen.getByTestId("cell-4-5"));

    // Generator at 4,4 powers Architect at 4,5
    // 4,5 should have roomToRoom connection to 4,4 (bottom) and it should be powered.

    const architectCell = screen.getByTestId("cell-4-5");
    const r2r_powered = architectCell.querySelector(
      'img[src*="roomconnectroomverticalpowered"]',
    );
    expect(r2r_powered).toBeTruthy();
    expect(r2r_powered?.className).toContain("room-connect-bottom");

    // Check generic powered background
    const generic_powered = architectCell.querySelector(
      'img[src*="roomgenericpowered"]',
    );
    expect(generic_powered).toBeTruthy();
  });

  it("shows connection to Entry point (4,0)", () => {
    render(<App />);

    // Place a room at 4,1.
    // Entry is at 4,0. 4,0 is y-1 relative to 4,1 -> bottom.
    // 4,0 is fixed as a pathfourway.
    // So 4,1 should NOT have a connection to 4,0 because 4,0 HAS a top connection.

    fireEvent.click(screen.getByTitle("Garrison"));
    fireEvent.click(screen.getByTestId("cell-4-1"));

    const garrisonCell = screen.getByTestId("cell-4-1");
    const r2p_bot = garrisonCell.querySelector('img[src*="roomconnectdown"]');
    expect(r2p_bot).toBeFalsy();
  });

  it("Does not show connection to Atziri's Chamber (4,9)", () => {
    render(<App />);

    // Atziri is at 4,9. Place a room at 4,8.
    // 4,9 is y+1 relative to 4,8 -> top.
    fireEvent.click(screen.getByTitle("Garrison"));
    fireEvent.click(screen.getByTestId("cell-4-8"));

    const garrisonCell = screen.getByTestId("cell-4-8");
    const r2r_top = garrisonCell.querySelector(
      'img[src*="roomconnectroomvertical"]',
    );
    expect(r2r_top).toBeFalsy();
  });
});
