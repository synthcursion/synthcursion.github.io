import { createAppSelector } from "src/store";
import { GRID_SIZE, roomsData } from "src/data/constants.ts";
import type { Direction, GridCell } from "src/types.ts";
import { getConnectionsFromPathType } from "src/utils/getConnections.ts";

export const selectCalculatedGrid = createAppSelector(
  [(state) => state.game.grid],
  (grid) => {
    const newGrid = grid.map((row) =>
      row.map((cell) => (cell ? { ...cell } : null)),
    );

    // 0. Phase 0: Conversions
    let changed = true;
    let iterations = 0;
    while (changed && iterations < 5) {
      changed = false;
      iterations++;
      newGrid.forEach((row, x) => {
        row.forEach((cell, y) => {
          if (cell && cell.type === "room" && cell.roomId) {
            const currentRoom = roomsData[cell.roomId];
            if (!currentRoom) return;

            const neighbors = [
              [x - 1, y],
              [x + 1, y],
              [x, y - 1],
              [x, y + 1],
            ];
            for (let i = 0; i < currentRoom.ConvertedBy.length; i++) {
              const converterId = currentRoom.ConvertedBy[i];
              const convertToId = currentRoom.ConvertedTo[i];
              const converterRoom = roomsData[converterId];
              const convertToRoom = roomsData[convertToId];

              if (!converterRoom || !convertToRoom) continue;

              const isAdjacentToConverter = neighbors.some(([nx, ny]) => {
                if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
                  const neighbor = newGrid[nx][ny];
                  return (
                    neighbor &&
                    neighbor.type === "room" &&
                    neighbor.roomId === converterRoom.Id
                  );
                }
                return false;
              });

              if (isAdjacentToConverter) {
                if (cell.roomId !== convertToRoom.Id) {
                  cell.roomId = convertToRoom.Id;
                  changed = true;
                }
                break;
              }
            }
          }
        });
      });
    }

    // 1. Phase 1: Adjacency and Medallions
    newGrid.forEach((row, x) => {
      row.forEach((cell, y) => {
        if (cell && cell.type === "room" && cell.roomId) {
          cell.upgradedByRooms = [];
          const baseRoom = roomsData[cell.roomId];
          if (baseRoom) {
            const connectedCounts: Record<string, number> = {};
            const connectedRoomNames: Record<string, string> = {};
            const neighbors = [
              [x - 1, y],
              [x + 1, y],
              [x, y - 1],
              [x, y + 1],
            ];
            neighbors.forEach(([nr, nc]) => {
              if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
                const neighbor = newGrid[nr][nc];
                if (neighbor && neighbor.type === "room" && neighbor.roomId) {
                  const nBaseRoom = roomsData[neighbor.roomId];
                  if (nBaseRoom) {
                    connectedCounts[nBaseRoom.Id] =
                      (connectedCounts[nBaseRoom.Id] || 0) + 1;
                    connectedRoomNames[nBaseRoom.Id] = nBaseRoom.Name;
                  }
                }
              }
            });

            const upgradeByCounts: Record<string, number> = {};
            baseRoom.UpgradedBy.forEach((id) => {
              const upgradeRoom = roomsData[id];
              if (upgradeRoom) {
                upgradeByCounts[id] = (upgradeByCounts[id] || 0) + 1;
              }
            });

            let bonus = 0;
            const hasThreeCopy = Object.values(upgradeByCounts).some(
              (count) => count === 3,
            );

            if (hasThreeCopy) {
              let hasTwoOfThree = false;
              for (const id in upgradeByCounts) {
                if (
                  upgradeByCounts[id] === 3 &&
                  (connectedCounts[id] || 0) >= 2
                ) {
                  hasTwoOfThree = true;
                  break;
                }
              }
              if (hasTwoOfThree) {
                let totalMatches = 0;
                for (const id in upgradeByCounts) {
                  if (upgradeByCounts[id] === 3) {
                    totalMatches += connectedCounts[id] || 0;
                  }
                }
                if (totalMatches >= 3) {
                  bonus = 2;
                } else {
                  bonus = 1;
                }
              }
            } else {
              for (const id in upgradeByCounts) {
                if (connectedCounts[id]) {
                  bonus += connectedCounts[id];
                }
              }
            }

            if (bonus > 0) {
              for (const id in upgradeByCounts) {
                if (connectedCounts[id]) {
                  cell.upgradedByRooms!.push(connectedRoomNames[id]);
                }
              }
            }

            cell.tier = Math.min(1 + bonus, baseRoom.MaxLevel);
          }
        }
      });
    });

    // 2. Phase 2: Power and Generators
    const newGridWithPower = newGrid.map((row) =>
      row.map((cell) => {
        if (cell) {
          const newCell = { ...cell, isPowered: false };
          if (cell.type === "room") {
            newCell.poweredByGenerators = [];
          }
          return newCell;
        }
        return null;
      }),
    );

    const generators: { x: number; y: number; tier: number }[] = [];
    newGridWithPower.forEach((row, x) => {
      row.forEach((cell, y) => {
        if (cell && cell.type === "room" && cell.roomId === "Generator") {
          generators.push({ x, y, tier: cell.tier || 1 });
        }
      });
    });

    generators.forEach((gen) => {
      const queue: { x: number; y: number; dist: number }[] = [
        { x: gen.x, y: gen.y, dist: 0 },
      ];
      const visited = new Set<string>();
      visited.add(`${gen.x},${gen.y}`);

      while (queue.length > 0) {
        const { x, y, dist } = queue.shift()!;
        if (dist > gen.tier + 2) continue;

        const cell = newGridWithPower[x][y];
        if (cell) {
          cell.isPowered = true;
          if (cell.type === "room" && dist > 0) {
            cell.poweredByGenerators!.push({
              x: gen.x,
              y: gen.y,
              tier: gen.tier,
              distance: dist,
            });
          }
        }

        // Only generators (at dist 0) and paths can propagate power
        if (dist > 0 && cell?.type === "room") continue;

        const currentConnections =
          cell?.type === "path"
            ? getConnectionsFromPathType(cell.pathType!)
            : { top: true, bottom: true, left: true, right: true };

        const neighbors = [
          { nx: x, ny: y + 1, dir: "top" as const },
          { nx: x, ny: y - 1, dir: "bottom" as const },
          { nx: x - 1, ny: y, dir: "left" as const },
          { nx: x + 1, ny: y, dir: "right" as const },
        ];
        neighbors.forEach(({ nx, ny, dir }) => {
          if (
            nx >= 0 &&
            nx < GRID_SIZE &&
            ny >= 0 &&
            ny < GRID_SIZE &&
            !visited.has(`${nx},${ny}`)
          ) {
            const neighbor = newGridWithPower[nx][ny];
            if (neighbor) {
              const neighborConnections =
                neighbor.type === "path"
                  ? getConnectionsFromPathType(neighbor.pathType!)
                  : { top: true, bottom: true, left: true, right: true };

              const oppositeDir: Record<Direction, Direction> = {
                top: "bottom",
                bottom: "top",
                left: "right",
                right: "left",
              };

              if (
                currentConnections[dir] ||
                neighborConnections[oppositeDir[dir]]
              ) {
                // If current is a path, it MUST have connection in 'dir' to propagate
                // If neighbor is a path, it MUST have connection in 'oppositeDir' to receive
                const canPropagate =
                  cell?.type === "path" ? currentConnections[dir] : true;
                const canReceive =
                  neighbor.type === "path"
                    ? neighborConnections[oppositeDir[dir]]
                    : true;

                if (canPropagate && canReceive) {
                  visited.add(`${nx},${ny}`);
                  queue.push({ x: nx, y: ny, dist: dist + 1 });
                }
              }
            }
          }
        });
      }
    });

    // 2.1 Phase 2.1: Recalculate Tiers based on Power
    newGridWithPower.forEach((row) => {
      row.forEach((cell) => {
        if (cell && cell.type === "room") {
          if (cell.medallionType === "medallion_lock") return;

          const baseRoom = roomsData[cell.roomId!];
          if (baseRoom) {
            const numGenerators = cell.poweredByGenerators?.length || 0;
            const powerBonus =
              baseRoom.UpgradedByPower && numGenerators > 0 ? numGenerators : 0;
            const upgradeBonus = baseRoom.UpgradedBy.includes("Generator")
              ? numGenerators
              : 0;

            const totalPowerBonus = Math.max(powerBonus, upgradeBonus);

            if (totalPowerBonus > 0) {
              cell.tier = Math.min(
                cell.tier! + totalPowerBonus,
                baseRoom.MaxLevel,
              );
            }
          }
        }
      });
    });

    // 3. Phase 3: Path Connections
    const extendedGrid = [...newGridWithPower.map((row) => [...row])];
    const oppositeDir: Record<Direction, Direction> = {
      top: "bottom",
      bottom: "top",
      left: "right",
      right: "left",
    };

    extendedGrid.forEach((row, x) => {
      row.forEach((cell, y) => {
        if (!cell) return;

        cell.roomToRoomConnections = [];
        cell.roomToPathConnections = [];
        cell.roomToPathPermanentConnections = [];
        cell.pathToPathConnections = [];
        cell.pathToRoomConnections = [];
        cell.pathToRoomPermanentConnections = [];

        const neighbors = [
          { nx: x, ny: y + 1, dir: "top" },
          { nx: x, ny: y - 1, dir: "bottom" },
          { nx: x - 1, ny: y, dir: "left" },
          { nx: x + 1, ny: y, dir: "right" },
        ] as { nx: number; ny: number; dir: Direction }[];

        neighbors.forEach(({ nx, ny, dir }) => {
          let neighborCell: GridCell | null = null;
          if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
            neighborCell = extendedGrid[nx][ny];
          } else if (nx === 4 && ny === -1) {
            neighborCell = { type: "path", pathType: "pathfourway" };
          }

          if (!neighborCell) return;

          if (cell.type === "room") {
            if (neighborCell.type === "room") {
              const room = roomsData[cell.roomId!];
              const neighborRoom = roomsData[neighborCell.roomId!];
              if (room && neighborRoom) {
                const interacts =
                  room.UpgradedBy.includes(neighborRoom.Id) ||
                  neighborRoom.UpgradedBy.includes(room.Id) ||
                  room.ConvertedBy.includes(neighborRoom.Id) ||
                  neighborRoom.ConvertedBy.includes(room.Id) ||
                  room.Id === "Architect" ||
                  neighborRoom.Id === "Architect" ||
                  room.IsBossReward ||
                  neighborRoom.IsBossReward;

                if (interacts) {
                  cell.roomToRoomConnections!.push(dir);
                }
              }
            } else if (
              neighborCell.type === "path" ||
              (nx === 4 && ny === -1)
            ) {
              const neighborPathType = neighborCell?.pathType || "pathfourway";
              const neighborPathConns =
                getConnectionsFromPathType(neighborPathType);

              if (neighborPathConns[oppositeDir[dir]]) {
                cell.roomToPathPermanentConnections!.push(dir);
                if (neighborCell.type === "path") {
                  neighborCell.pathToRoomPermanentConnections =
                    neighborCell.pathToRoomPermanentConnections || [];
                  if (
                    !neighborCell.pathToRoomPermanentConnections.includes(
                      oppositeDir[dir],
                    )
                  ) {
                    neighborCell.pathToRoomPermanentConnections.push(
                      oppositeDir[dir],
                    );
                  }
                }
              } else {
                cell.roomToPathConnections!.push(dir);
                if (neighborCell.type === "path") {
                  neighborCell.pathToRoomConnections =
                    neighborCell.pathToRoomConnections || [];
                  if (
                    !neighborCell.pathToRoomConnections.includes(
                      oppositeDir[dir],
                    )
                  ) {
                    neighborCell.pathToRoomConnections.push(oppositeDir[dir]);
                  }
                }
              }
            }
          } else if (cell.type === "path") {
            const currentPathConns = getConnectionsFromPathType(
              cell.pathType || "path1",
            );

            if (neighborCell.type === "path" || (nx === 4 && ny === -1)) {
              const neighborPathType = neighborCell?.pathType || "pathfourway";
              const neighborPathConns =
                getConnectionsFromPathType(neighborPathType);

              if (
                currentPathConns[dir] ||
                neighborPathConns[oppositeDir[dir]]
              ) {
                if (!cell.pathToPathConnections!.includes(dir)) {
                  cell.pathToPathConnections!.push(dir);
                }
              }
            } else if (neighborCell.type === "room") {
              const neighborRoomId = neighborCell.roomId;
              if (neighborRoomId !== "Generator") {
                if (currentPathConns[dir]) {
                  if (!cell.pathToRoomPermanentConnections!.includes(dir)) {
                    cell.pathToRoomPermanentConnections!.push(dir);
                  }
                } else {
                  if (!cell.pathToRoomConnections!.includes(dir)) {
                    cell.pathToRoomConnections!.push(dir);
                  }
                }
              }
            }
          }
        });
      });
    });

    return extendedGrid;
  },
);
