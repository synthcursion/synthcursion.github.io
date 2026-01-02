import { createAppSelector } from "src/store";
import {
  ENTRY,
  GRID_SIZE,
  roomsData,
} from "src/data/constants.ts/gameUtils.ts";
import { isReachableFromEntry } from "./selectReachableCells.ts";
import { isPlaceableAt } from "./selectIsPlaceableAt";
import { getConnectionsFromPathType } from "src/utils/pathConnections.ts";

export const selectGetHighlightType = createAppSelector(
  [
    (state) => state.game.grid,
    (state) => state.game.selectedType,
    (state) => state.game.selectedRoomId,
    (state) => state.game.selectedPathType,
    (state) => state.game.debug,
    (state) => state, // to get the full state for other selectors if needed, but we can just use the functions
  ],
  (grid, selectedType, selectedRoomId, selectedPathType, debug, state) => {
    // We need isDeletable but it's already a selector that returns a function.
    // However, isDeletable depends on grid, which we have.
    // To avoid duplication, we can extract the logic or just use the logic from the other selectors.

    const isDeletable = (x: number, y: number): boolean => {
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

      // Re-use logic from reachable cells
      // We need to import it or have it accessible
      // Since it's a utility-like function in the other selector, maybe it should be in a utility file?
      // For now, I'll use the one from selectReachableCells

      const reachable = isReachableFromEntry(nextGrid);
      const reachableBefore = isReachableFromEntry(grid);

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

    return (
      x: number,
      y: number,
    ): "regular" | "strong" | "deletable" | "invalid" | null => {
      if (grid[x][y]) {
        const cell = grid[x][y]!;
        const isPlaceable = isPlaceableAt(x, y, grid, cell);
        if (!isPlaceable) {
          return "invalid";
        }

        if (isDeletable(x, y)) {
          return "deletable";
        }

        return null;
      }

      if (selectedType === "path") {
        const connections = getConnectionsFromPathType(selectedPathType);
        const neighbors = [
          { nx: x, ny: y + 1, side: "top" as const },
          { nx: x, ny: y - 1, side: "bottom" as const },
          { nx: x - 1, ny: y, side: "left" as const },
          { nx: x + 1, ny: y, side: "right" as const },
        ];

        let canPlace = false;
        neighbors.forEach(({ nx, ny, side }) => {
          if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
            const neighbor = grid[nx][ny];
            if (neighbor && connections[side]) {
              if (neighbor.type === "path") {
                canPlace = true;
              } else if (
                neighbor.type === "room" &&
                neighbor.roomId === "Generator"
              ) {
                canPlace = true;
              }
            }
          }
        });

        if (canPlace) return "regular";

        return null;
      }

      if (selectedType !== "room" || !selectedRoomId) return null;

      const selectedRoom = roomsData[selectedRoomId];
      if (!selectedRoom) return null;

      const neighbors = [
        { nx: x - 1, ny: y, opp: "right" as const },
        { nx: x + 1, ny: y, opp: "left" as const },
        { nx: x, ny: y - 1, opp: "top" as const },
        { nx: x, ny: y + 1, opp: "bottom" as const },
      ];

      let canPlaceRegular = false;
      let canPlaceStrong = false;

      neighbors.forEach(({ nx, ny, opp }) => {
        if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
          const neighbor = grid[nx][ny];
          if (!neighbor) return;

          if (neighbor.type === "path") {
            if (selectedRoomId === "Generator") {
              const conns = getConnectionsFromPathType(neighbor.pathType!);
              if (conns[opp]) {
                canPlaceRegular = true;
              }
            } else {
              canPlaceRegular = true;
            }
          } else if (neighbor.type === "room" && neighbor.roomId) {
            if (selectedRoomId === "Generator") return; // Generators only next to paths

            const nBaseRoom = roomsData[neighbor.roomId];
            if (!nBaseRoom) return;

            // Check if selected room upgrades neighbor
            const nUpgradedByCounts: Record<string, number> = {};
            nBaseRoom.UpgradedBy.forEach((id) => {
              const upgradeRoom = roomsData[id];
              if (upgradeRoom) {
                nUpgradedByCounts[id] = (nUpgradedByCounts[id] || 0) + 1;
              }
            });

            // Check if neighbor already upgraded by this type of room
            const nNeighbors = [
              [nx - 1, ny],
              [nx + 1, ny],
              [nx, ny - 1],
              [nx, ny + 1],
            ];
            let currentUpgradesByType = 0;
            nNeighbors.forEach(([nnx, nny]) => {
              if (nnx >= 0 && nnx < GRID_SIZE && nny >= 0 && nny < GRID_SIZE) {
                const nn = grid[nnx][nny];
                if (nn && nn.type === "room" && nn.roomId === selectedRoomId) {
                  currentUpgradesByType++;
                }
              }
            });

            if (
              (nUpgradedByCounts[selectedRoomId] &&
                currentUpgradesByType < nUpgradedByCounts[selectedRoomId]) ||
              nBaseRoom.ConvertedBy.includes(selectedRoomId)
            ) {
              canPlaceStrong = true;
            }

            // Check if neighbor upgrades selected room
            const selectedUpgradedByCounts: Record<string, number> = {};
            selectedRoom.UpgradedBy.forEach((id) => {
              const upgradeRoom = roomsData[id];
              if (upgradeRoom) {
                selectedUpgradedByCounts[id] =
                  (selectedUpgradedByCounts[id] || 0) + 1;
              }
            });

            if (selectedUpgradedByCounts[neighbor.roomId]) {
              canPlaceStrong = true;
            }
          }
        }
      });

      if (canPlaceStrong) return "strong";
      if (canPlaceRegular || debug) return "regular";

      // Reward rooms can be placed anywhere
      if (selectedRoom?.IsBossReward) {
        return "regular";
      }

      // Architect's Chamber can be placed anywhere, but only if one doesn't exist
      if (selectedRoomId === "Architect") {
        const exists = grid.some((row) =>
          row.some(
            (cell) => cell?.type === "room" && cell.roomId === "Architect",
          ),
        );
        if (!exists) return "regular";
      }

      // Special rule: if grid is completely empty (except for the unremovable ENTRY path), only allow cells next to entryway
      const isEmpty = grid.every((row, x) =>
        row.every((cell, y) => {
          if (x === ENTRY.x && y === ENTRY.y) return true;
          return !cell;
        }),
      );
      if (isEmpty && selectedRoomId !== "Generator") {
        const isNextToEntry =
          (Math.abs(x - ENTRY.x) === 1 && y === ENTRY.y) ||
          (x === ENTRY.x && Math.abs(y - ENTRY.y) === 1);
        if (isNextToEntry) return "regular";
      }

      return debug ? "regular" : null;
    };
  },
);
