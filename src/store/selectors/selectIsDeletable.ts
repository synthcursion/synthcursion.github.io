import { createAppSelector } from "src/store";
import { GRID_SIZE, roomsData, ENTRY } from "src/utils/gameUtils";
import { isReachableFromEntry } from "./selectReachableCells";
import { isPlaceableAt } from "./selectIsPlaceableAt";

export const selectIsDeletable = createAppSelector(
  [(state) => state.game.grid],
  (grid) => {
    return (x: number, y: number): boolean => {
      if (x === ENTRY.x && y === ENTRY.y) return false;
      const cellToDelete = grid[x][y];
      if (!cellToDelete) return false;

      // Boss and reward rooms are always deletable
      if (cellToDelete.type === "room" && cellToDelete.roomId) {
        const room = roomsData[cellToDelete.roomId];
        if (room?.IsBossReward) return true;
      }

      // Create a hypothetical grid where the cell is removed
      const nextGrid = grid.map((row) => [...row]);
      nextGrid[x][y] = null;

      // Check reachability in the new grid
      const reachable = isReachableFromEntry(nextGrid);
      const reachableBefore = isReachableFromEntry(grid);

      // Any non-boss, non-reward room must still be reachable from ENTRY
      // IF it was reachable before deleting the cell.
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          const cell = nextGrid[r][c];
          if (cell && cell.type === "room" && cell.roomId) {
            const room = roomsData[cell.roomId];
            if (
              room &&
              !room.IsBossReward &&
              room.Id !== "Architect" &&
              room.Id !== "Atziri" &&
              reachableBefore.has(`${r},${c}`) &&
              !reachable.has(`${r},${c}`)
            ) {
              return false;
            }
          }
        }
      }

      // Also check local placement validity for immediate neighbors
      const neighbors = [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
      ];

      for (const [nx, ny] of neighbors) {
        if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
          const neighbor = nextGrid[nx][ny];
          if (neighbor) {
            if (!isPlaceableAt(nx, ny, nextGrid, neighbor)) {
              return false;
            }
          }
        }
      }

      return true;
    };
  },
);
