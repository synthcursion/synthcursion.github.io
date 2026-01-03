import { expect, test } from "vitest";
import { store } from "src/store";
import { loadStateFromQuery } from "src/store/gameSlice";
import { selectQueryParams } from "src/store/selectors/selectQueryParams";

test("loadStateFromQuery updates the state correctly", () => {
  const query =
    "?rooms[]=Commander-5-0&rooms[]=Garrison-6-0&selected=Commander";
  store.dispatch(loadStateFromQuery(query));

  const state = store.getState();
  expect(state.game.grid[5][0]?.type).toBe("room");
  expect((state.game.grid[5][0] as any).roomId).toBe("Commander");
  expect(state.game.grid[6][0]?.type).toBe("room");
  expect((state.game.grid[6][0] as any).roomId).toBe("Garrison");
  expect(state.game.selectedRoomId).toBe("Commander");

  const currentQuery = selectQueryParams(state, true);
  // queryString.parse/stringify might change order or format slightly,
  // but let's check if the essential parts are there.
  expect(currentQuery).toContain("rooms[]=Commander-5-0");
  expect(currentQuery).toContain("rooms[]=Garrison-6-0");
  expect(currentQuery).toContain("selected=Commander");
});
