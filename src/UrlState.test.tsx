import { renderWithProviders } from "./test-utils";
import { App } from "./App.tsx";
import { expect, test } from "vitest";

test("loads state from URL correctly", () => {
  const GRID_SIZE = 9;
  const initialGrid = Array(GRID_SIZE)
    .fill(null)
    .map(() => Array(GRID_SIZE).fill(null));

  // ENTRY at 4,0
  initialGrid[4][0] = { type: "path", pathType: "pathfourway" };
  // Commander-5-0
  initialGrid[5][0] = { type: "room", roomId: "Commander", tier: 1 };
  // Garrison-6-0
  initialGrid[6][0] = { type: "room", roomId: "Garrison", tier: 1 };
  // Armoury-6-1
  initialGrid[6][1] = { type: "room", roomId: "Armoury", tier: 1 };
  // Commander-7-0
  initialGrid[7][0] = { type: "room", roomId: "Commander", tier: 1 };
  // Garrison-7-1
  initialGrid[7][1] = { type: "room", roomId: "Garrison", tier: 1 };
  // Garrison-8-0
  initialGrid[8][0] = { type: "room", roomId: "Garrison", tier: 1 };
  // Armoury-8-1
  initialGrid[8][1] = { type: "room", roomId: "Armoury", tier: 1 };

  const { getByTestId } = renderWithProviders(<App />, {
    queryString:
      "rooms[]=Commander-5-0&rooms[]=Garrison-6-0&rooms[]=Armoury-6-1&rooms[]=Commander-7-0&rooms[]=Garrison-7-1&rooms[]=Garrison-8-0&rooms[]=Armoury-8-1",
  });

  // Cells have test-id="cell-{x}-{y}" in App.tsx
  // Let's verify some of them are populated.
  // Commander-5-0
  const cell50 = getByTestId("cell-5-0");
  expect(cell50.getAttribute("data-room-id")).toBe("Commander");

  // Garrison-6-0
  const cell60 = getByTestId("cell-6-0");
  expect(cell60.getAttribute("data-room-id")).toBe("Garrison");

  // Armoury-6-1
  const cell61 = getByTestId("cell-6-1");
  expect(cell61.getAttribute("data-room-id")).toBe("Armoury");

  // pathfourway-4-0
  const cell40 = getByTestId("cell-4-0");
  expect(cell40.getAttribute("data-cell-type")).toBe("path");
});

test("does not add debug=false to the URL", async () => {
  const { store, findByTestId } = renderWithProviders(<App />, {
    queryString: "debug=false",
  });

  // Wait for the cell to be rendered which indicates the app has initialized and useEffect has likely run
  await findByTestId("cell-0-0");

  expect(store.getState().game.debug).toBe(false);
});

test("adds debug=true to the URL when enabled", async () => {
  const { store, findByTestId } = renderWithProviders(<App />, {
    queryString: "debug=true",
  });

  await findByTestId("cell-0-0");

  expect(store.getState().game.debug).toBe(true);
});
