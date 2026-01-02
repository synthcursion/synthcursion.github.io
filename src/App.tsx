import { Tooltip } from "react-tooltip";
import "./App.css";
import type { Direction, GridCell, IncursionRoom } from "./types";
import { useAppDispatch, useAppSelector } from "./hooks/store";
import {
  setGrid,
  setHoveredCell,
  setShowSidebar,
  setShowTotalStats,
} from "./store/gameSlice";
import { Sidebar } from "./components/Sidebar";
import "./index.css";
import {
  ENTRY,
  getConnectionsFromPathType,
  getPathTypeFromConnections,
  GRID_SIZE,
  roomsData,
} from "./utils/gameUtils";
import { selectRoomsByType } from "src/store/selectors/selectRoomsByType.ts";
import { selectCalculatedGrid } from "src/store/selectors/selectCalculatedGrid.ts";
import { selectTotalStats } from "src/store/selectors/selectTotalStats.ts";

export function App() {
  const dispatch = useAppDispatch();
  const grid = useAppSelector((state) => state.game.grid);
  const selectedType = useAppSelector((state) => state.game.selectedType);
  const selectedRoomId = useAppSelector((state) => state.game.selectedRoomId);
  const selectedPathType = useAppSelector(
    (state) => state.game.selectedPathType,
  );
  const hoveredCell = useAppSelector((state) => state.game.hoveredCell);
  const debug = useAppSelector((state) => state.game.debug);
  const showSidebar = useAppSelector((state) => state.game.showSidebar);
  const showTotalStats = useAppSelector((state) => state.game.showTotalStats);
  const showRemovableGlow = useAppSelector(
    (state) => state.game.showRemovableGlow,
  );
  const showInvalidGlow = useAppSelector((state) => state.game.showInvalidGlow);

  const roomsByType = useAppSelector(selectRoomsByType);

  const calculatedGrid = useAppSelector(selectCalculatedGrid);

  const totalStats = useAppSelector(selectTotalStats);

  const getHighlightType = (
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

          // For the selected room, it has NO current neighbors yet (it's being placed)
          // except the one we are checking now.
          // So we only need to check if the neighbor we are looking at CAN upgrade the selected room.
          if (selectedUpgradedByCounts[neighbor.roomId]) {
            // Note: we don't need to check currentUpgradesByType for the selected room
            // because it's not placed yet, so it has 0 upgrades.
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

  const isPlaceableAt = (
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

  const getRoomToRoomConnections = (
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

  const getRoomToPathConnections = (
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

      if (
        neighborCell &&
        neighborCell.type === "path" &&
        neighborCell.pathType
      ) {
        const pathConns = getConnectionsFromPathType(neighborCell.pathType);
        if (!pathConns[oppositeDir[dir]]) {
          connections.push(dir);
        }
      }
    });

    return connections;
  };

  const isReachableFromEntry = (
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
              const conns = getConnectionsFromPathType(neighborCell.pathType!);
              if (r2p.includes(side) || conns[opp]) {
                canConnect = true;
              }
            }
          } else if (currentCell?.type === "path") {
            const currentConns = getConnectionsFromPathType(
              currentCell.pathType!,
            );
            if (neighborCell.type === "room") {
              const nr2p = getRoomToPathConnections(nr, nc, currentGrid);
              if (nr2p.includes(opp) || currentConns[side]) {
                canConnect = true;
              }
            } else if (neighborCell.type === "path") {
              if (currentConns[side]) {
                const neighborConns = getConnectionsFromPathType(
                  neighborCell.pathType!,
                );
                if (neighborConns[opp]) canConnect = true;
              }
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

  const handleCellClick = (x: number, y: number) => {
    if (x === ENTRY.x && y === ENTRY.y) return; // ENTRY is unremovable and unmodifiable

    const newGrid = [...grid.map((row) => [...row])];

    const updateCellConnections = (
      row: number,
      col: number,
      currentGrid: (GridCell | null)[][],
    ) => {
      const cell = currentGrid[row][col];
      if (!cell || cell.type !== "path") return;

      let { top, bottom, left, right } = getConnectionsFromPathType(
        cell.pathType!,
      );

      // Check all current neighbors to ensure they are connected
      const isNeighbor = (nx: number, ny: number) => {
        if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE)
          return false;
        return !!currentGrid[nx][ny];
      };

      if (isNeighbor(row, col + 1)) {
        // Only auto-connect if the neighbor is a path, OR if we are in debug mode
        const neighbor = currentGrid[row][col + 1];
        if (neighbor?.type === "path" || debug) top = true;
      }
      if (isNeighbor(row, col - 1)) {
        const neighbor = currentGrid[row][col - 1];
        if (neighbor?.type === "path" || debug) bottom = true;
      }
      if (isNeighbor(row - 1, col)) {
        const neighbor = currentGrid[row - 1][col];
        if (neighbor?.type === "path" || debug) left = true;
      }
      if (isNeighbor(row + 1, col)) {
        const neighbor = currentGrid[row + 1][col];
        if (neighbor?.type === "path" || debug) right = true;
      }

      currentGrid[row][col] = {
        ...cell,
        pathType: getPathTypeFromConnections(top, bottom, left, right),
      };
    };

    const canPlace = getHighlightType(x, y);
    // Only restrict placement if we are trying to place a ROOM or PATH
    if (
      (selectedType === "room" || selectedType === "path") &&
      !canPlace &&
      !debug
    )
      return;

    if (selectedType === "empty") {
      if (!isDeletable(x, y) && !debug) return;
      newGrid[x][y] = null;
    } else if (selectedType === "medallion") {
      const cell = newGrid[x][y];
      if (cell && cell.type === "room") {
        if (
          selectedRoomId === "medallion_levelup" ||
          selectedRoomId === "medallion_lock"
        ) {
          const isRemoving = cell.medallionType === selectedRoomId;

          // Only allow applying if no medallion, or removing existing same medallion
          if (!cell.medallionType || isRemoving) {
            // Restrictions for Quipolatl's Medallion (Level Up)
            if (
              selectedRoomId === "medallion_levelup" &&
              !isRemoving &&
              !debug
            ) {
              const calcCell = calculatedGrid[x][y];
              if (calcCell?.tier && calcCell.roomId) {
                if (calcCell.tier >= roomsData[calcCell.roomId].MaxLevel)
                  return;
              }
            }

            newGrid[x][y] = {
              ...cell,
              medallionType: isRemoving ? undefined : selectedRoomId,
            };
          }
        }
      }
    } else if (selectedType === "room") {
      const existingCell = grid[x][y];
      if (
        existingCell?.type === "room" &&
        existingCell.roomId === selectedRoomId
      ) {
        if (!isDeletable(x, y) && !debug) return;
        newGrid[x][y] = null;
      } else {
        // Architect's Chamber: only one allowed
        if (selectedRoomId === "Architect") {
          const exists = grid.some((row) =>
            row.some(
              (cell) => cell?.type === "room" && cell.roomId === "Architect",
            ),
          );
          if (exists) return;
        }

        newGrid[x][y] = {
          type: "room",
          roomId: selectedRoomId,
          tier: 1, // Will be calculated
          isPowered: false, // Will be calculated
        };
      }
    } else if (selectedType === "path") {
      const existingCell = grid[x][y];
      if (existingCell?.type === "path") {
        if (!isDeletable(x, y) && !debug) return;
        newGrid[x][y] = null;
      } else {
        // For new paths, use the selectedPathType but also check neighbors
        // Top/Bottom are mapped to Column +/- 1 (visual Up-Right/Down-Left)
        // Left/Right are mapped to Row +/- 1 (visual Up-Left/Down-Right)
        const isPath = (nx: number, ny: number) => {
          if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE)
            return false;
          return newGrid[nx][ny]?.type === "path";
        };

        const top = isPath(x, y + 1);
        const bottom = isPath(x, y - 1);
        const left = isPath(x - 1, y);
        const right = isPath(x + 1, y);

        const initialConnections = getConnectionsFromPathType(selectedPathType);

        newGrid[x][y] = {
          type: "path",
          pathType: getPathTypeFromConnections(
            initialConnections.top || top,
            initialConnections.bottom || bottom,
            initialConnections.left || left,
            initialConnections.right || right,
          ),
          isPowered: false, // Will be calculated
        };
      }
    }

    if (newGrid[x][y] !== grid[x][y]) {
      // Something changed, update neighbor paths to re-evaluate their connections
      const neighbors = [
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1],
      ];

      neighbors.forEach(([nr, nc]) => {
        if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
          updateCellConnections(nr, nc, newGrid);
        }
      });
    }

    dispatch(setGrid(newGrid));
  };

  const getIconPath = (cell: GridCell) => {
    if (cell.type === "room") {
      const room = roomsData[cell.roomId!];
      if (!room) return "/ggpk/roomgeneric.png";

      // Try to find the specific tier first
      const roomInfo = room.Levels[cell.tier!] ?? room.MaxLevel;

      if (roomInfo && roomInfo.Icon_DDSFile) {
        const fileName = roomInfo.Icon_DDSFile.split("/")
          .pop()
          ?.replace(".dds", ".png")
          .toLowerCase();
        return `/ggpk/${fileName}`;
      }
      return "/ggpk/roomgeneric.png";
    } else if (cell.type === "path") {
      return `/ggpk/${cell.pathType}${cell.isPowered ? "powered" : ""}.png`;
    }
    return "/ggpk/incursion2tileempty.png";
  };

  const getCellPosition = (x: number, y: number) => {
    // x increases -> moves Down-Right (label: Right)
    // x decreases -> moves Up-Left (label: Left)
    // y increases -> moves Up-Right (label: Top)
    // y decreases -> moves Down-Left (label: Bottom)
    const centerX = 1425;
    const centerY = 738;
    const width = 1240;
    const height = 1016;

    return {
      left: `${centerX + (x + y - 8) * (width / 16)}px`,
      top: `${centerY + (x - y) * (height / 16)}px`,
      width: `${width / 8}px`,
      height: `${height / 8}px`,
    };
  };

  const getHoverInfo = () => {
    if (!hoveredCell) return null;
    const { x, y } = hoveredCell;

    if (x === 4 && y === 9) {
      const atziriRoom = roomsData["Atziri"];
      return (
        <div className="hover-info">
          <div className="hover-header">Cell (4, 9)</div>
          <div className="hover-room-name">
            {atziriRoom?.Name || "Atziri's Chamber"}
          </div>
          <div className="hover-section">
            <div className="section-title">Description:</div>
            <div className="hover-description">
              The final chamber of the Queen.
            </div>
          </div>
        </div>
      );
    }

    const cell = calculatedGrid[x][y];
    return (
      <div className="hover-info">
        <div className="hover-header">
          Cell ({x}, {y})
        </div>
        {cell && cell.type === "room" && cell.roomId && (
          <>
            <div className="hover-room-name">
              {roomsData[cell.roomId]?.Name} (T
              {cell.tier})
            </div>
            {cell.upgradedByRooms && cell.upgradedByRooms.length > 0 && (
              <div className="hover-section">
                <div className="section-title">Upgraded By:</div>
                <ul>
                  {cell.upgradedByRooms.map((name, i) => (
                    <li key={i}>{name}</li>
                  ))}
                  {cell.medallionType && (
                    <li>
                      {cell.medallionType === "medallion_lock"
                        ? "Juatalotli's Medallion (Lock)"
                        : "Quipolatl's Medallion (+1)"}
                    </li>
                  )}
                </ul>
              </div>
            )}
            {cell.isPowered &&
              cell.poweredByGenerators &&
              cell.poweredByGenerators.length > 0 && (
                <div className="hover-section">
                  <div className="section-title">Powered By:</div>
                  <ul>
                    {cell.poweredByGenerators.map((gen, i) => (
                      <li key={i}>
                        Generator at ({gen.x}, {gen.y}) [T{gen.tier}] (Dist:{" "}
                        {gen.distance})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
          </>
        )}
        {cell && cell.type === "path" && (
          <>
            <div className="hover-room-name">Path: {cell.pathType}</div>
            {cell.isPowered &&
              cell.poweredByGenerators &&
              cell.poweredByGenerators.length > 0 && (
                <div className="hover-section">
                  <div className="section-title">Powered By:</div>
                  <ul>
                    {cell.poweredByGenerators.map((gen, i) => (
                      <li key={i}>
                        Generator at ({gen.x}, {gen.y}) [T{gen.tier}] (Dist:{" "}
                        {gen.distance})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
          </>
        )}
        {!cell && <div className="hover-empty">Empty Cell</div>}
      </div>
    );
  };

  const processDescription = (text: string) => {
    if (!text) return text;
    return text.replace(/\[[^|\]]+\|([^\]]+)]/g, "$1");
  };

  const renderRoomTooltip = (room: IncursionRoom) => {
    const upgradesRooms = Object.values(roomsData).filter((r) =>
      r.UpgradedBy.includes(room.Id),
    );
    const convertsRooms = Object.values(roomsData).filter((r) =>
      r.ConvertedBy.includes(room.Id),
    );

    return (
      <div className="room-tooltip">
        <div className="tooltip-title">{room.Name}</div>
        {room.UpgradedBy.length > 0 && (
          <div className="tooltip-section">
            <span className="tooltip-label">Upgraded By:</span>{" "}
            {room.UpgradedBy.map((id) => roomsData[id]?.Name || id).join(", ")}
          </div>
        )}
        {upgradesRooms.length > 0 && (
          <div className="tooltip-section">
            <span className="tooltip-label">Upgrades:</span>{" "}
            {upgradesRooms.map((r) => r.Name).join(", ")}
          </div>
        )}
        {room.ConvertedBy.length > 0 && (
          <div className="tooltip-section">
            <span className="tooltip-label">
              Converted to ${room.ConvertedTo} By:
            </span>{" "}
            {room.ConvertedBy.map((id) => roomsData[id]?.Name || id).join(", ")}
          </div>
        )}
        {convertsRooms.length > 0 && (
          <div className="tooltip-section">
            <span className="tooltip-label">Converts:</span>{" "}
            {convertsRooms.map(({ Name }) => Name).join(", ")}
          </div>
        )}

        <div className="tooltip-levels">
          {room.Levels.filter(Boolean).map((lvl) => (
            <div key={lvl.Level} className="tooltip-level-info">
              {room.MaxLevel > 1 && (
                <div className="tooltip-level-header">
                  Tier {lvl.Level}: {lvl.Name}
                </div>
              )}
              <div className="tooltip-description">
                {processDescription(lvl.Description)}
              </div>
              {lvl.Description2 && (
                <div className="tooltip-description">
                  {processDescription(lvl.Description2)}
                </div>
              )}
              {lvl.ModStats && lvl.ModStats.length > 0 && (
                <ul className="tooltip-stats">
                  {lvl.ModStats.map((stat, i) => (
                    <li key={stat}>
                      {stat}: +{lvl.ModValues[i]}%
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={`app-container ${!showSidebar ? "sidebar-hidden" : ""}`}>
      <button
        className="toggle-sidebar"
        onClick={() => dispatch(setShowSidebar(!showSidebar))}
        title={showSidebar ? "Hide Sidebar" : "Show Sidebar"}
      >
        {showSidebar ? "◀" : "▶"}
      </button>

      {showTotalStats &&
        (Object.keys(totalStats.mods).length > 0 ||
          Object.keys(totalStats.descriptions).length > 0) && (
          <div className="total-stats">
            <div className="close-stats-container">
              <button
                className="close-stats"
                onClick={() => dispatch(setShowTotalStats(false))}
              >
                Hide stats
              </button>
            </div>
            <ul>
              {Object.entries(totalStats.mods).map(([stat, value]) => (
                <li key={stat}>
                  <span>{stat}</span>
                  <span>{value > 0 ? `+${value}` : value}%</span>
                </li>
              ))}
              {Object.entries(totalStats.descriptions).map(([desc, count]) => (
                <li key={desc}>
                  <span>{desc}</span>
                  <span>x{count}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

      {!showTotalStats &&
        (Object.keys(totalStats.mods).length > 0 ||
          Object.keys(totalStats.descriptions).length > 0) && (
          <button
            className="show-stats-btn"
            onClick={() => dispatch(setShowTotalStats(true))}
            title="Show Total Stats"
          >
            Show Stats
          </button>
        )}

      <Sidebar roomsByType={roomsByType} calculatedGrid={calculatedGrid} />

      <Tooltip
        id="room-tooltip"
        place="right"
        className="custom-tooltip"
        render={({ content }) => {
          if (!content) return null;
          const room = roomsData[content];
          if (room) return renderRoomTooltip(room);
          return <div className="room-tooltip">{content}</div>;
        }}
      />

      <div className="grid-container">
        {getHoverInfo()}
        <div className="grid-background">
          <div className="grid">
            {calculatedGrid.map((row, x) =>
              row.map((cell, y) => (
                <div
                  key={`${x}-${y}`}
                  className={`cell ${cell ? cell.type : "empty"}`}
                  style={getCellPosition(x, y)}
                  onClick={() => handleCellClick(x, y)}
                  onMouseEnter={() => dispatch(setHoveredCell({ x, y }))}
                  onMouseLeave={() => dispatch(setHoveredCell(null))}
                  data-powered={cell?.isPowered}
                  data-tier={cell?.tier}
                  data-cell-type={cell?.type}
                  data-room-id={cell?.roomId}
                  data-testid={`cell-${x}-${y}`}
                >
                  {getHighlightType(x, y) &&
                    cell?.roomId !== "Architect" &&
                    (getHighlightType(x, y) === "regular" ||
                      getHighlightType(x, y) === "strong" ||
                      (getHighlightType(x, y) === "deletable" &&
                        showRemovableGlow) ||
                      (getHighlightType(x, y) === "invalid" &&
                        showInvalidGlow)) && (
                      <img
                        src={
                          getHighlightType(x, y) === "strong"
                            ? "/ggpk/incursion2tileglowstrong.png"
                            : getHighlightType(x, y) === "deletable" ||
                                getHighlightType(x, y) === "invalid"
                              ? "/ggpk/incursion2tileglowred.png"
                              : "/ggpk/incursion2tileglowregular.png"
                        }
                        className={`placement-glow ${getHighlightType(x, y) === "invalid" ? "invalid-glow" : ""}`}
                        alt=""
                      />
                    )}
                  {hoveredCell?.x === x && hoveredCell?.y === y && (
                    <img
                      src="/ggpk/incursion2tileglowframe.png"
                      className="hover-glow"
                      alt=""
                    />
                  )}
                  <div className="cell-content">
                    {cell?.type === "room" && (
                      <img
                        src={`/ggpk/roomgeneric${cell.isPowered ? "powered" : ""}.png`}
                        className="room-generic-bg"
                        alt=""
                      />
                    )}
                    {cell ? (
                      <img
                        src={getIconPath(cell)}
                        className="main-icon"
                        alt={
                          cell.type === "room" && cell.roomId
                            ? `${roomsData[cell.roomId]?.Name} (T${cell.tier})`
                            : cell.pathType
                        }
                      />
                    ) : (
                      <img
                        src="/ggpk/incursion2tileempty.png"
                        className="main-icon"
                        alt=""
                      />
                    )}
                    {cell?.roomToRoomConnections?.map((dir) => {
                      const isVertical = dir === "top" || dir === "bottom";
                      const suffix = isVertical ? "vertical" : "horizontal";
                      return (
                        <img
                          key={`r2r-${dir}`}
                          src={`/ggpk/roomconnectroom${suffix}${cell.isPowered ? "powered" : ""}.png`}
                          className={`room-connect room-connect-${dir}`}
                          alt=""
                        />
                      );
                    })}
                    {cell?.roomToPathConnections?.map((dir) => {
                      const fileDir =
                        dir === "top" ? "up" : dir === "bottom" ? "down" : dir;
                      return (
                        <img
                          key={`r2p-${dir}`}
                          src={`/ggpk/roomconnect${fileDir}${cell.isPowered ? "powered" : ""}.png`}
                          className={`room-connect room-connect-${dir} r2p-conn`}
                          alt=""
                        />
                      );
                    })}
                    {cell?.roomToPathPermanentConnections?.map((dir) => {
                      const isVertical = dir === "top" || dir === "bottom";
                      const suffix = isVertical ? "1" : "2";
                      return (
                        <img
                          key={`r2p-perm-${dir}`}
                          src={`/ggpk/pathconnect${suffix}${cell.isPowered ? "powered" : ""}.png`}
                          className={`room-connect room-connect-${dir} r2p-conn`}
                          alt=""
                        />
                      );
                    })}
                    {cell?.pathToPathConnections?.map((dir) => {
                      const isVertical = dir === "top" || dir === "bottom";
                      const suffix = isVertical ? "1" : "2";
                      return (
                        <img
                          key={`p2p-${dir}`}
                          src={`/ggpk/pathconnect${suffix}${cell.isPowered ? "powered" : ""}.png`}
                          className={`room-connect room-connect-${dir} p2p-conn`}
                          alt=""
                        />
                      );
                    })}
                    {cell?.pathToRoomConnections?.map((dir) => {
                      const fileDir =
                        dir === "top" ? "up" : dir === "bottom" ? "down" : dir;
                      return (
                        <img
                          key={`p2r-${dir}`}
                          src={`/ggpk/roomconnect${fileDir}${cell.isPowered ? "powered" : ""}.png`}
                          className={`room-connect room-connect-${dir} p2r-conn`}
                          alt=""
                        />
                      );
                    })}
                    {cell?.pathToRoomPermanentConnections?.map((dir) => {
                      const isVertical = dir === "top" || dir === "bottom";
                      const suffix = isVertical ? "1" : "2";
                      return (
                        <img
                          key={`p2r-perm-${dir}`}
                          src={`/ggpk/pathconnect${suffix}${cell.isPowered ? "powered" : ""}.png`}
                          className={`room-connect room-connect-${dir} p2r-conn`}
                          alt=""
                        />
                      );
                    })}
                  </div>
                  {cell?.type === "room" && cell.tier && cell.tier > 1 && (
                    <img
                      src={`/ggpk/roomtier${cell.tier}.png`}
                      className="tier-icon"
                      alt={`Tier ${cell.tier}`}
                    />
                  )}
                  {cell?.medallionType && (
                    <img
                      src={
                        cell.medallionType === "medallion_lock"
                          ? "/ggpk/incursion2tileglowmedallionlock.png"
                          : "/ggpk/incursion2tileglowmedallionlevelup.png"
                      }
                      className="medallion-glow"
                      alt=""
                    />
                  )}
                  {cell?.medallionType && (
                    <img
                      src="/ggpk/medallionleveluproom.png"
                      className="medallion-icon"
                      alt="Medallion"
                    />
                  )}
                </div>
              )),
            )}
            {/* Atziri's Chamber at fixed location (4, 9) */}
            <div
              className="cell room"
              style={getCellPosition(4, 9)}
              onMouseEnter={() => dispatch(setHoveredCell({ x: 4, y: 9 }))}
              onMouseLeave={() => dispatch(setHoveredCell(null))}
              data-cell-type="room"
              data-room-id="Atziri"
            >
              <div className="cell-content">
                <img
                  src={`/ggpk/roomgeneric${calculatedGrid[4][9]?.isPowered ? "powered" : ""}.png`}
                  className="room-generic-bg"
                  alt=""
                />
                {calculatedGrid[4][9]?.roomToRoomConnections?.map((dir) => {
                  const isVertical = dir === "top" || dir === "bottom";
                  const suffix = isVertical ? "vertical" : "horizontal";
                  return (
                    <img
                      key={`r2r-${dir}`}
                      src={`/ggpk/roomconnectroom${suffix}${calculatedGrid[4][9]?.isPowered ? "powered" : ""}.png`}
                      className={`room-connect room-connect-${dir}`}
                      alt=""
                    />
                  );
                })}
                {calculatedGrid[4][9]?.roomToPathConnections?.map((dir) => {
                  const fileDir =
                    dir === "top" ? "up" : dir === "bottom" ? "down" : dir;
                  return (
                    <img
                      key={`r2p-${dir}`}
                      src={`/ggpk/roomconnect${fileDir}${calculatedGrid[4][9]?.isPowered ? "powered" : ""}.png`}
                      className={`room-connect room-connect-${dir} r2p-conn`}
                      alt=""
                    />
                  );
                })}
                {calculatedGrid[4][9]?.roomToPathPermanentConnections?.map(
                  (dir) => {
                    const isVertical = dir === "top" || dir === "bottom";
                    const suffix = isVertical ? "1" : "2";
                    return (
                      <img
                        key={`r2p-perm-${dir}`}
                        src={`/ggpk/pathconnect${suffix}${calculatedGrid[4][9]?.isPowered ? "powered" : ""}.png`}
                        className={`room-connect room-connect-${dir} r2p-conn`}
                        alt=""
                      />
                    );
                  },
                )}
                <img
                  src="/ggpk/iconatziri.png"
                  className="main-icon"
                  alt="Atziri's Chamber"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
