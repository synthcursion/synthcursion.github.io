import { createAppSelector } from "src/store";
import { selectCalculatedGrid } from "src/store/selectors/selectCalculatedGrid.ts";

export const selectHoveredCell = createAppSelector(
  [selectCalculatedGrid, (state) => state.game.hoveredCell],
  (grid, cell) => cell && grid[cell.x]?.[cell.y],
);
