import { createAppSelector } from "src/store";
import queryString from "query-string";
import { ENTRY } from "src/data/constants.ts/gameUtils.ts";

export const selectQueryParams = createAppSelector(
  [(state) => state.game.grid, (state) => state.game.debug],
  (grid, debug) => {
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

    return queryString.stringify(
      { rooms, paths, medallions, ...(debug ? { debug } : {}) },
      { arrayFormat: "bracket" },
    );
  },
);
