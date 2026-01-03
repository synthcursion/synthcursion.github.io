import { createAppSelector } from "src/store";
import { ENTRY, GRID_SIZE, roomsData } from "src/data/constants.ts";
import { getConnectionsFromPathType } from "src/utils/getConnections.ts";
import { selectIsDeletable } from "src/store/selectors/selectIsDeletable.ts";
import { isPlaceableAt } from "src/utils/isPlaceableAt.ts";

import { selectCalculatedGrid } from "src/store/selectors/selectCalculatedGrid.ts";

export const selectHighlightType = createAppSelector(
  [
    selectCalculatedGrid,
    (state) => state.game.selectedType,
    (state) => state.game.selectedRoomId,
    (state) => state.game.selectedPathType,
    (state) => state.game.debug,
    (state, x, y) => selectIsDeletable(state, x, y),
    (_, x: number) => x,
    (_, _x, y: number) => y,
  ],
  (
    grid,
    selectedType,
    selectedRoomId,
    selectedPathType,
    debug,
    isDeletable,
    x,
    y,
  ) => {
    // We need isDeletable but it's already a selector that returns a function.
    // However, isDeletable depends on grid, which we have.
    // To avoid duplication, we can extract the logic or just use the logic from the other selectors.
    if (grid[x][y]) {
      const cell = grid[x][y]!;
      const isPlaceable = isPlaceableAt(x, y, grid, cell);
      if (!isPlaceable) {
        return "invalid";
      }

      if (isDeletable) {
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

          if (
            selectedUpgradedByCounts[neighbor.roomId] ||
            selectedRoom.ConvertedBy.includes(neighbor.roomId)
          ) {
            // Check how many of this neighbor type we already have adjacent to the place we want to put the selected room
            let currentSelectedUpgradesByType = 0;
            neighbors.forEach(({ nx: nnx, ny: nny }) => {
              if (nnx >= 0 && nnx < GRID_SIZE && nny >= 0 && nny < GRID_SIZE) {
                const nn = grid[nnx][nny];
                if (nn && nn.type === "room" && nn.roomId === neighbor.roomId) {
                  currentSelectedUpgradesByType++;
                }
              }
            });

            if (
              (selectedUpgradedByCounts[neighbor.roomId] &&
                currentSelectedUpgradesByType <=
                  selectedUpgradedByCounts[neighbor.roomId]) ||
              selectedRoom.ConvertedBy.includes(neighbor.roomId)
            ) {
              canPlaceStrong = true;
            }
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
  },
);
