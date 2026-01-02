import { isAnyOf } from "@reduxjs/toolkit";
import queryString from "query-string";
import { setDebug, setGrid } from "src/store/gameSlice.ts";
import { startAppListening } from "src/store";
import { ENTRY } from "src/utils/gameUtils.ts";

startAppListening({
  matcher: isAnyOf(setGrid, setDebug),
  effect: (_action, listenerApi) => {
    const state = listenerApi.getState();
    const { grid, debug } = state.game;

    const rooms: string[] = [];
    const paths: string[] = [];
    const medallions: string[] = [];

    grid.forEach((row, x) => {
      row.forEach((cell, y) => {
        if (!cell || (x === ENTRY.x && y === ENTRY.y)) return;
        if (cell.type === "room") {
          rooms.push(`${cell.roomId}-${x}-${y}`);
          if (cell.medallionType) {
            medallions.push(`${cell.medallionType}-${x}-${y}`);
          }
        } else if (cell.type === "path") {
          paths.push(`${cell.pathType}-${x}-${y}`);
        }
      });
    });

    const search = queryString.stringify(
      { rooms, paths, medallions, ...(debug ? { debug } : {}) },
      { arrayFormat: "bracket" },
    );
    const url = new URL(window.location.href);
    url.search = search;
    window.history.replaceState({}, "", url.toString());
  },
});
