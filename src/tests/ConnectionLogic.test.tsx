import { fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "src/App.tsx";
import data from "src/data/generated/English.json";
import { renderWithProviders } from "src/utils/test-utils.tsx";

const roomsData = data.Incursion2Rooms as any;

describe("Connection Logic Visuals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows room-to-room connection for Architect", () => {
    const { screen } = renderWithProviders(<App />, {
      queryString: "debug=true",
    });

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
    const r2r_top = architectCell.querySelector(".room-connect-top");
    const r2r_bot = garrisonCell.querySelector(".room-connect-bottom");

    expect(r2r_top).toBeTruthy();
    expect(r2r_bot).toBeTruthy();

    expect(r2r_top?.getAttribute("src")).toContain("roomconnectroomvertical");
    expect(r2r_bot?.getAttribute("src")).toContain("roomconnectroomvertical");
  });

  it("shows room-to-room connection for Reward rooms", () => {
    const { screen } = renderWithProviders(<App />, {
      queryString: "debug=true",
    });

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
    const { screen } = renderWithProviders(<App />, {
      queryString: "debug=true",
    });

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
    const { screen } = renderWithProviders(<App />, {
      queryString: "debug=true",
    });

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
    const { screen } = renderWithProviders(<App />, {
      queryString: "debug=true",
    });

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
    const { screen } = renderWithProviders(<App />, {
      queryString: "debug=true",
    });

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
    const { screen } = renderWithProviders(<App />, {
      queryString: "debug=true",
    });

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

  it("shows path-to-path connection", () => {
    const { screen } = renderWithProviders(<App />, {
      queryString: "debug=true",
    });

    // Place path1 (top-bottom) at 4,4
    fireEvent.click(screen.getByTitle("path1"));
    fireEvent.click(screen.getByTestId("cell-4-4"));

    // Place path1 (top-bottom) at 4,5 (y+1 -> Top of 4,4)
    fireEvent.click(screen.getByTestId("cell-4-5"));

    const pathCell44 = screen.getByTestId("cell-4-4");
    const pathCell45 = screen.getByTestId("cell-4-5");

    // Both should have pathconnect1 (vertical)
    const p2p_44 = pathCell44.querySelector('img[src*="pathconnect1"]');
    const p2p_45 = pathCell45.querySelector('img[src*="pathconnect1"]');

    expect(p2p_44).toBeTruthy();
    expect(p2p_45).toBeTruthy();
    expect(p2p_44?.className).toContain("room-connect-top");
    expect(p2p_45?.className).toContain("room-connect-bottom");
  });

  it("shows path-to-room connection", () => {
    const { screen } = renderWithProviders(<App />, {
      queryString: "debug=true",
    });

    // Place Garrison at 4,4
    fireEvent.click(screen.getByTitle("Garrison"));
    fireEvent.click(screen.getByTestId("cell-4-4"));

    // Place path1 (top-bottom) at 4,5 (y+1 -> Top of 4,4)
    fireEvent.click(screen.getByTitle("path1"));
    fireEvent.click(screen.getByTestId("cell-4-5"));

    const pathCell = screen.getByTestId("cell-4-5");
    // Path at 4,5 has a permanent connection to 4,4 (bottom)
    const p2r_bot = pathCell.querySelector(".p2r-conn.room-connect-bottom");
    expect(p2r_bot).toBeTruthy();

    // Place path1 (top-bottom) at 5,4 (x+1 -> Right of 4,4)
    // path1 at 5,4 does NOT have a permanent connection to 4,4 (left).
    fireEvent.click(screen.getByTitle("path1"));
    fireEvent.click(screen.getByTestId("cell-5-4"));

    const pathCell54 = screen.getByTestId("cell-5-4");
    // path1 at 5,4 does NOT have a permanent connection to 4,4 (left).
    // BUT Garrison at 4,4 SHOULD have a room-to-path connection to 5,4 (right)
    // and path1 at 5,4 SHOULD have a path-to-room connection to 4,4 (left).

    const p2r_left = pathCell54.querySelector(".p2r-conn.room-connect-left");
    expect(p2r_left).toBeTruthy();

    const garrisonCell = screen.getByTestId("cell-4-4");
    const r2p_right = garrisonCell.querySelector(
      ".r2p-conn.room-connect-right",
    );
    expect(r2p_right).toBeTruthy();
  });

  it("shows pathconnect for permanent path-to-room connection", () => {
    const { screen } = renderWithProviders(<App />, {
      queryString: "debug=true",
    });

    // Entry point (4,0) is a pathfourway.
    // Place Garrison at (3,0) (x-1 -> Left)
    fireEvent.click(screen.getByTitle("Garrison"));
    fireEvent.click(screen.getByTestId("cell-3-0"));

    const entryCell = screen.getByTestId("cell-4-0");
    // Entry path should show pathconnect2 (horizontal) for the connection to Garrison
    const p2r_conn = entryCell.querySelector(".p2r-conn.room-connect-left");
    expect(p2r_conn).toBeTruthy();
    // According to the issue, it should be pathconnect, not roomconnect
    expect(p2r_conn?.getAttribute("src")).toContain("pathconnect2");
  });

  it("shows pathconnect for permanent room-to-path connection", () => {
    const { screen } = renderWithProviders(<App />, {
      queryString: "debug=true",
    });

    // Place Garrison at (3,0)
    fireEvent.click(screen.getByTitle("Garrison"));
    fireEvent.click(screen.getByTestId("cell-3-0"));

    // Entry point (4,0) is a pathfourway.
    // 4,0 is Right relative to 3,0.
    // Garrison at (3,0) is permanently connected to (4,0) because (4,0) is a 4-way path.

    const garrisonCell = screen.getByTestId("cell-3-0");
    // Garrison should show pathconnect2 (horizontal) for the connection to Entry path
    const r2p_conn = garrisonCell.querySelector(".r2p-conn.room-connect-right");
    expect(r2p_conn).toBeTruthy();
    expect(r2p_conn?.getAttribute("src")).toContain("pathconnect2");
  });
});
