import { createAppSelector } from "src/store";
import { selectCalculatedGrid } from "src/store/selectors/selectCalculatedGrid.ts";

export const selectCell = createAppSelector(
  [selectCalculatedGrid, (_, x: number) => x, (_, _x, y: number) => y],
  (grid, x, y) => grid[x]?.[y],
);
