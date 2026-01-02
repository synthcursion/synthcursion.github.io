import type { Direction, GridCell } from "../types";
import {
  ENTRY,
  GRID_SIZE,
  roomsData,
} from "src/data/constants.ts/gameUtils.ts";
import { getConnectionsFromPathType } from "src/utils/pathConnections.ts";

export const getRoomToRoomConnections = (
  x: number,
  y: number,
  currentGrid: (GridCell | null)[][],
): Direction[] => {
  const cell = currentGrid[x][y];
  if (!cell || cell.type !== "room" || !cell.roomId) return [];

  const connections: Direction[] = [];
  const neighbors: { nx: number; ny: number; dir: Direction }[] = [
    { nx: x, ny: y + 1, dir: "top" },
    { nx: x, ny: y - 1, dir: "bottom" },
    { nx: x - 1, ny: y, dir: "left" },
    { nx: x + 1, ny: y, dir: "right" },
  ];

  neighbors.forEach(({ nx, ny, dir }) => {
    let neighborCell: GridCell | null | undefined;
    if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
      neighborCell = currentGrid[nx][ny];
    } else if (nx === 4 && ny === 9) {
      neighborCell = { type: "room", roomId: "Atziri" };
    } else if (nx === 4 && ny === -1) {
      neighborCell = {
        type: "path",
        pathType: "pathfourway",
      };
    }

    if (neighborCell && neighborCell.type === "room" && neighborCell.roomId) {
      const currentRoom = roomsData[cell.roomId!];
      const otherRoom = roomsData[neighborCell.roomId!];

      if (!currentRoom || !otherRoom) return;

      const isArchitect =
        cell.roomId === "Architect" || neighborCell.roomId === "Architect";
      const isReward = currentRoom.IsBossReward || otherRoom.IsBossReward;
      const isUpgrade =
        currentRoom.UpgradedBy.includes(neighborCell.roomId!) ||
        otherRoom.UpgradedBy.includes(cell.roomId!);

      const isConversion =
        currentRoom.ConvertedBy.includes(neighborCell.roomId!) ||
        otherRoom.ConvertedBy.includes(cell.roomId!);

      if (isArchitect || isReward || isUpgrade || isConversion) {
        connections.push(dir);
      }
    }
  });

  return connections;
};

export const getRoomToPathConnections = (
  x: number,
  y: number,
  currentGrid: (GridCell | null)[][],
): Direction[] => {
  const cell = currentGrid[x][y];
  if (!cell || cell.type !== "room" || !cell.roomId) return [];
  if (cell.roomId === "Generator") return [];

  const connections: Direction[] = [];
  const neighbors: { nx: number; ny: number; dir: Direction }[] = [
    { nx: x, ny: y + 1, dir: "top" },
    { nx: x, ny: y - 1, dir: "bottom" },
    { nx: x - 1, ny: y, dir: "left" },
    { nx: x + 1, ny: y, dir: "right" },
  ];

  const oppositeDir: Record<Direction, Direction> = {
    top: "bottom",
    bottom: "top",
    left: "right",
    right: "left",
  };

  neighbors.forEach(({ nx, ny, dir }) => {
    let neighborCell: GridCell | null | undefined;
    if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
      neighborCell = currentGrid[nx][ny];
    } else if (nx === 4 && ny === -1) {
      neighborCell = {
        type: "path",
        pathType: "pathfourway",
      };
    }

    if (neighborCell && neighborCell.type === "path" && neighborCell.pathType) {
      const pathConns = getConnectionsFromPathType(neighborCell.pathType);
      if (!pathConns[oppositeDir[dir]]) {
        connections.push(dir);
      }
    }
  });

  return connections;
};

export const isReachableFromEntry = (
  currentGrid: (GridCell | null)[][],
): Set<string> => {
  const reachable = new Set<string>();
  const queue: { x: number; y: number }[] = [{ x: ENTRY.x, y: ENTRY.y }];
  reachable.add(`${ENTRY.x},${ENTRY.y}`);

  while (queue.length > 0) {
    const { x, y } = queue.shift()!;

    const neighbors = [
      { nr: x, nc: y + 1, side: "top" as const, opp: "bottom" as const },
      { nr: x, nc: y - 1, side: "bottom" as const, opp: "top" as const },
      { nr: x - 1, nc: y, side: "left" as const, opp: "right" as const },
      { nr: x + 1, nc: y, side: "right" as const, opp: "left" as const },
    ];

    neighbors.forEach(({ nr, nc, side, opp }) => {
      if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
        if (reachable.has(`${nr},${nc}`)) return;

        const currentCell = currentGrid[x][y];
        const neighborCell = currentGrid[nr][nc];

        if (!neighborCell) return;

        let canConnect = false;
        if (currentCell?.type === "room") {
          const r2r = getRoomToRoomConnections(x, y, currentGrid);
          const r2p = getRoomToPathConnections(x, y, currentGrid);

          if (neighborCell.type === "room") {
            if (r2r.includes(side)) canConnect = true;
          } else if (neighborCell.type === "path") {
            const pathConns = getConnectionsFromPathType(
              neighborCell.pathType!,
            );
            if (pathConns[opp] || r2p.includes(side)) canConnect = true;
          }
        } else if (currentCell?.type === "path") {
          const pathConns = getConnectionsFromPathType(currentCell.pathType!);
          if (pathConns[side]) {
            canConnect = true;
          } else if (neighborCell.type === "path") {
            const neighborConns = getConnectionsFromPathType(
              neighborCell.pathType!,
            );
            if (neighborConns[opp]) canConnect = true;
          } else if (neighborCell.type === "room") {
            const r2p = getRoomToPathConnections(nr, nc, currentGrid);
            if (r2p.includes(opp)) canConnect = true;
          }
        }

        if (canConnect) {
          reachable.add(`${nr},${nc}`);
          queue.push({ x: nr, y: nc });
        }
      }
    });
  }

  return reachable;
};

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
    if (room?.IsBossReward || roomId === "Architect" || roomId === "Atziri")
      return true;
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

        // Check if neighbor converts this room
        if (nBaseRoom.ConvertedBy.includes(roomId2)) {
          canPlaceStrong = true;
        }

        // Check if neighbor is upgraded by this room
        if (nBaseRoom.UpgradedBy.includes(roomId2)) {
          canPlaceStrong = true;
        }

        // Check if neighbor is converted by this room
        if (nBaseRoom.ConvertedBy.includes(roomId2)) {
          canPlaceStrong = true;
        }

        // Check if this room is upgraded by neighbor
        if (room2.UpgradedBy.includes(neighbor.roomId)) {
          canPlaceStrong = true;
        }

        // Check if this room is converted by neighbor
        if (room2.ConvertedBy.includes(neighbor.roomId)) {
          canPlaceStrong = true;
        }
      }
    }
  });

  return canPlaceRegular || canPlaceStrong;
};

export const isDeletable = (
  x: number,
  y: number,
  grid: (GridCell | null)[][],
): boolean => {
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
        const isArchitect = cell.roomId === "Architect";
        const isAtziri = cell.roomId === "Atziri";

        if (
          room &&
          !room.IsBossReward &&
          !isArchitect &&
          !isAtziri &&
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

export const getHighlightType = (
  x: number,
  y: number,
  grid: (GridCell | null)[][],
  selectedType: string,
  selectedRoomId: string,
  selectedPathType: any,
  debug: boolean = false,
): "regular" | "strong" | "deletable" | "invalid" | null => {
  if (grid[x][y]) {
    const cell = grid[x][y]!;
    const isPlaceable = isPlaceableAt(x, y, grid, cell);
    if (!isPlaceable) {
      return "invalid";
    }

    if (isDeletable(x, y, grid)) {
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

    if (canPlace || debug) return "regular";

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
      if (!neighbor) {
        if (nx === ENTRY.x && ny === ENTRY.y) {
          canPlaceRegular = true;
        }
        return;
      }

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
        if (selectedRoomId === "Generator") return;

        const nBaseRoom = roomsData[neighbor.roomId];
        if (!nBaseRoom) return;

        if (
          selectedRoomId === "Architect" ||
          nBaseRoom.IsBossReward ||
          selectedRoom.IsBossReward
        ) {
          canPlaceRegular = true;
        }

        const nUpgradedByCounts: Record<string, number> = {};
        nBaseRoom.UpgradedBy.forEach((id) => {
          const upgradeRoom = roomsData[id];
          if (upgradeRoom) {
            nUpgradedByCounts[id] = (nUpgradedByCounts[id] || 0) + 1;
          }
        });

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

        if (selectedRoom.ConvertedBy.includes(neighbor.roomId)) {
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
      row.some((cell) => cell?.type === "room" && cell.roomId === "Architect"),
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
