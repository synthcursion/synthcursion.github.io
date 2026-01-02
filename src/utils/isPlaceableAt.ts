import type { GridCell } from "src/types.ts";
import {
  ENTRY,
  GRID_SIZE,
  roomsData,
} from "src/data/constants.ts/gameUtils.ts";
import { getConnectionsFromPathType } from "src/utils/getConnections.ts";

export const isPlaceableAt = (
  x: number,
  y: number,
  targetGrid: (GridCell | null)[][],
  cellToPlace: GridCell,
): boolean => {
  if (x === ENTRY.x && y === ENTRY.y) return true;

  // Boss/reward rooms are always placeable (but need to be reachable, checked elsewhere)
  if (cellToPlace.type === "room" && cellToPlace.roomId) {
    const roomId = cellToPlace.roomId;
    const room = roomsData[roomId];
    if (room?.IsBossReward) return true;
  }

  if (cellToPlace.type === "path") {
    const connections = getConnectionsFromPathType(cellToPlace.pathType!);
    const neighbors = [
      { nx: x, ny: y + 1, side: "top" as const },
      { nx: x, ny: y - 1, side: "bottom" as const },
      { nx: x - 1, ny: y, side: "left" as const },
      { nx: x + 1, ny: y, side: "right" as const },
    ];

    let canPlace = false;
    neighbors.forEach(({ nx, ny, side }) => {
      if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
        const neighbor = targetGrid[nx][ny];
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

    return canPlace;
  }

  if (cellToPlace.type !== "room" || !cellToPlace.roomId) return false;

  const roomId2 = cellToPlace.roomId;
  const room2 = roomsData[roomId2];
  if (!room2) return false;

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
      const neighbor = targetGrid[nx][ny];
      if (!neighbor) {
        // Check if it's the ENTRY
        if (nx === ENTRY.x && ny === ENTRY.y) {
          canPlaceRegular = true;
        }
        return;
      }

      if (neighbor.type === "path") {
        if (roomId2 === "Generator") {
          const conns = getConnectionsFromPathType(neighbor.pathType!);
          if (conns[opp]) {
            canPlaceRegular = true;
          }
        } else {
          canPlaceRegular = true;
        }
      } else if (neighbor.type === "room" && neighbor.roomId) {
        if (roomId2 === "Generator") return; // Generators only next to paths

        const nBaseRoom = roomsData[neighbor.roomId];
        if (!nBaseRoom) return;

        // Check if it's an Architect or Reward room
        if (
          roomId2 === "Architect" ||
          nBaseRoom.IsBossReward ||
          room2.IsBossReward
        ) {
          canPlaceRegular = true;
        }

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
            const nn = targetGrid[nnx][nny];
            if (nn && nn.type === "room" && nn.roomId === roomId2) {
              if (nnx !== x || nny !== y) {
                currentUpgradesByType++;
              } else {
                // If checking an existing room, don't count itself against the limit
                canPlaceStrong = true;
              }
            }
          }
        });

        if (
          nUpgradedByCounts[roomId2] &&
          currentUpgradesByType < nUpgradedByCounts[roomId2]
        ) {
          canPlaceStrong = true;
        }

        // Check if neighbor upgrades selected room
        const selectedUpgradedByCounts: Record<string, number> = {};
        room2.UpgradedBy.forEach((id) => {
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

  if (canPlaceStrong || canPlaceRegular) return true;

  // Reward rooms can be placed anywhere
  if (room2.IsBossReward) {
    return true;
  }

  // Architect's Chamber can be placed anywhere, but only if one doesn't exist
  if (roomId2 === "Architect") {
    // If we are checking IF it's placeable, and it ALREADY exists at (x,y), then it is placeable there.
    // But isPlaceableAt is usually called for checking if a placement is valid.
    // If it exists ELSEWHERE, return false.
    const existsElsewhere = targetGrid.some((row, rx) =>
      row.some(
        (cell, ry) =>
          cell?.type === "room" &&
          cell.roomId === "Architect" &&
          (rx !== x || ry !== y),
      ),
    );
    if (!existsElsewhere) return true;
  }

  // Special rule: if grid is completely empty (except for the unremovable ENTRY path), only allow cells next to entryway
  const isEmpty = targetGrid.every((row, tx) =>
    row.every((cell, ty) => {
      if (tx === ENTRY.x && ty === ENTRY.y) return true;
      if (tx === x && ty === y) return true; // Ignore the cell we are checking
      return !cell;
    }),
  );
  if (isEmpty && roomId2 !== "Generator") {
    const isNextToEntry =
      (Math.abs(x - ENTRY.x) === 1 && y === ENTRY.y) ||
      (x === ENTRY.x && Math.abs(y - ENTRY.y) === 1);
    if (isNextToEntry) return true;
  }

  return false;
};
