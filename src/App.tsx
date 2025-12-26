import { useState, useEffect, useMemo } from "react";
import "./App.css";
import roomsDataRaw from "../tables/English/Incursion2Rooms.json";
import roomsPerLevelDataRaw from "../tables/English/Incursion2RoomPerLevel.json";
import type {
  IncursionRoom,
  IncursionRoomPerLevel,
  PathType,
  GridCell,
} from "./types";

const roomsData = roomsDataRaw as IncursionRoom[];
const roomsPerLevelData = roomsPerLevelDataRaw as IncursionRoomPerLevel[];

const GRID_SIZE = 9;

type Direction = "left" | "right" | "top" | "bottom";
const PATH_TYPES: Record<PathType, Direction[]> = {
  path1: ["top", "bottom"],
  path2: ["left", "right"],
  pathconnect1: ["top", "bottom"],
  pathconnect2: ["left", "right"],
  pathcornerbot: ["top", "left"],
  pathcornerleft: ["top", "right"],
  pathcornerright: ["bottom", "left"],
  pathcornertop: ["bottom", "right"],
  pathfourway: ["top", "bottom", "left", "right"],
  paththreeway1: ["top", "bottom", "right"],
  paththreeway2: ["bottom", "left", "right"],
  paththreeway3: ["top", "left", "right"],
  paththreeway4: ["bottom", "left", "top"],
};

const getConnectionsFromPathType = (type: PathType) => {
  const connections = PATH_TYPES[type];
  return {
    top: connections.includes("top"),
    bottom: connections.includes("bottom"),
    left: connections.includes("left"),
    right: connections.includes("right"),
  };
};

const getPathTypeFromConnections = (
  top: boolean,
  bottom: boolean,
  left: boolean,
  right: boolean,
): PathType => {
  const entries = Object.entries(PATH_TYPES) as [PathType, Direction[]][];

  // Try to find an exact match first
  const exactMatch = entries.find(([, conns]) => {
    const connectionsNeeded = [
      top ? "top" : null,
      bottom ? "bottom" : null,
      left ? "left" : null,
      right ? "right" : null,
    ].filter(Boolean);

    if (conns.length !== connectionsNeeded.length) return false;
    return connectionsNeeded.every((c) => conns.includes(c as Direction));
  });

  if (exactMatch) return exactMatch[0];

  // If no exact match, fall back to best fit or defaults
  if (top || bottom) return "path1";
  if (left || right) return "path2";
  return "path1";
};

function App() {
  const [grid, setGrid] = useState<(GridCell | null)[][]>(() => {
    const saved = new URLSearchParams(window.location.search).get("s");
    if (saved) {
      try {
        return JSON.parse(atob(saved));
      } catch (e) {
        console.error("Failed to load state from URL", e);
      }
    }
    return Array(GRID_SIZE)
      .fill(null)
      .map(() => Array(GRID_SIZE).fill(null));
  });

  const [selectedType, setSelectedType] = useState<
    "room" | "path" | "empty" | "medallion"
  >("room");
  const [selectedRoomCategory, setSelectedRoomCategory] = useState<
    "past" | "present" | "reward"
  >("past");
  const [selectedRoomId, setSelectedRoomId] = useState<string>("Garrison"); // Default to Garrison
  const [selectedPathType, setSelectedPathType] = useState<PathType>("path1");
  const [hoveredCell, setHoveredCell] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const roomsByType = useMemo(() => {
    const filtered = roomsData.filter(
      (r) =>
        !r.IsPathway &&
        r.Name !== "" &&
        r.Id !== "Nothing" &&
        r.Id !== "SacrificeRoom" &&
        r.Id !== "Path" &&
        r.Id !== "PoweredPath" &&
        r.Id !== "Entrance",
    );
    const past = filtered.filter((r) => !r.IsPresentDay && !r.IsBossReward);
    const present = filtered.filter((r) => r.IsPresentDay && !r.IsBossReward);
    const reward = filtered.filter((r) => r.IsBossReward);
    return { past, present, reward };
  }, []);

  const calculatedGrid = useMemo(() => {
    const newGrid = grid.map((row) =>
      row.map((cell) => (cell ? { ...cell } : null)),
    );

    // 1. Phase 1: Adjacency and Medallions
    newGrid.forEach((row, x) => {
      row.forEach((cell, y) => {
        if (cell && cell.type === "room") {
          cell.upgradedByRooms = [];
          const baseRoom = roomsData.find((rd) => rd.Id === cell.roomId);
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
                if (neighbor && neighbor.type === "room") {
                  const nBaseRoom = roomsData.find(
                    (rd) => rd.Id === neighbor.roomId,
                  );
                  if (nBaseRoom) {
                    connectedCounts[nBaseRoom.Id] =
                      (connectedCounts[nBaseRoom.Id] || 0) + 1;
                    connectedRoomNames[nBaseRoom.Id] = nBaseRoom.Name;
                  }
                }
              }
            });

            const upgradeByCounts: Record<string, number> = {};
            baseRoom.UpgradedBy.forEach((i) => {
              const id = roomsData[i].Id;
              upgradeByCounts[id] = (upgradeByCounts[id] || 0) + 1;
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
                for (const idStr in connectedCounts) {
                  const id = Number(idStr);
                  if (upgradeByCounts[id]) {
                    totalMatches += connectedCounts[id];
                    for (let i = 0; i < connectedCounts[id]; i++) {
                      cell.upgradedByRooms!.push(connectedRoomNames[id]);
                    }
                  }
                }
                bonus = totalMatches >= 3 ? 2 : 1;
              } else {
                bonus = 0;
              }
            } else {
              for (const id in upgradeByCounts) {
                if (upgradeByCounts[id] && connectedCounts[id]) {
                  const applied = Math.min(
                    connectedCounts[id],
                    upgradeByCounts[id],
                  );
                  bonus += applied;
                  for (let i = 0; i < applied; i++) {
                    cell.upgradedByRooms!.push(connectedRoomNames[id]);
                  }
                }
              }
            }

            const tier = 1 + bonus + (cell.hasMedallion ? 1 : 0);
            cell.tier = Math.min(3, tier);
          }
        }
      });
    });

    const calculatePower = (
      gridToPower: (GridCell | null)[][],
      gens: { x: number; y: number; tier: number }[],
    ) => {
      // Reset all power
      gridToPower.forEach((row) =>
        row.forEach((cell) => {
          if (cell) {
            cell.isPowered = false;
            cell.poweredByGenerators = [];
          }
        }),
      );

      gens.forEach((gen) => {
        const queue: { x: number; y: number; dist: number }[] = [
          { x: gen.x, y: gen.y, dist: 0 },
        ];
        const visited = new Set<string>();
        visited.add(`${gen.x},${gen.y}`);

        while (queue.length > 0) {
          const { x, y, dist } = queue.shift()!;

          if (gridToPower[x][y]) {
            // Check if already powered by this generator to avoid duplicates
            const alreadyPoweredByThisGen = gridToPower[x][
              y
            ]!.poweredByGenerators!.some((p) => p.x === gen.x && p.y === gen.y);
            if (!alreadyPoweredByThisGen) {
              gridToPower[x][y]!.isPowered = true;
              gridToPower[x][y]!.poweredByGenerators!.push({
                x: gen.x,
                y: gen.y,
                tier: gen.tier,
                distance: dist,
              });
            }
          }

          const maxRange = gen.tier + 2;
          if (dist >= maxRange) continue;

          // Check neighbors
          const neighbors = [
            { nr: x, nc: y + 1, side: "top" as const, opp: "bottom" as const },
            { nr: x, nc: y - 1, side: "bottom" as const, opp: "top" as const },
            { nr: x - 1, nc: y, side: "left" as const, opp: "right" as const },
            { nr: x + 1, nc: y, side: "right" as const, opp: "left" as const },
          ];

          neighbors.forEach(({ nr, nc, side, opp }) => {
            if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
              if (visited.has(`${nr},${nc}`)) return;

              const currentCell = gridToPower[x][y];
              const neighborCell = gridToPower[nr][nc];

              if (!neighborCell) return;

              // Rooms connect to everything adjacent
              // Paths connect based on their pathType
              let canConnect = false;
              if (currentCell?.type === "room") {
                const isCurrentGenerator = currentCell.roomId === "Generator";
                if (isCurrentGenerator) {
                  // Generators connect to all adjacent rooms and paths (if path has connection)
                  if (neighborCell.type === "room") {
                    canConnect = true;
                  } else if (neighborCell.type === "path") {
                    const conns = getConnectionsFromPathType(
                      neighborCell.pathType!,
                    );
                    if (conns[opp]) canConnect = true;
                  }
                } else {
                  // Non-generator rooms ONLY connect to other rooms
                  // This preserves the old behavior for room-to-room if we want it,
                  // BUT the new requirement might imply that even this should be restricted.
                  // "a room is considered powered if it is adjacent to any path tile..."
                  // If we want Room A (powered by path) to power Room B, we keep this.
                  // If we want Room B to ONLY be powered if it's NEXT TO A PATH, we should disable this.
                  if (neighborCell.type === "room") {
                    canConnect = true;
                  }
                }
              } else if (currentCell?.type === "path") {
                const currentConns = getConnectionsFromPathType(
                  currentCell.pathType!,
                );

                if (neighborCell.type === "room") {
                  const isGenerator = neighborCell.roomId === "Generator";
                  if (isGenerator) {
                    // Generators STILL require a connection to be powered from a path
                    if (currentConns[side]) canConnect = true;
                  } else {
                    // Non-generator rooms are powered if adjacent to a powered path
                    // REGARDLESS of path's connections
                    canConnect = true;
                  }
                } else if (neighborCell.type === "path") {
                  // Paths STILL require valid connection from both sides
                  if (currentConns[side]) {
                    const neighborConns = getConnectionsFromPathType(
                      neighborCell.pathType!,
                    );
                    if (neighborConns[opp]) canConnect = true;
                  }
                }
              }

              if (canConnect) {
                visited.add(`${nr},${nc}`);
                // Only paths and generator rooms propagate power further
                // Non-generator rooms are "terminal" in the power flow from paths
                const isNonGeneratorRoom =
                  neighborCell.type === "room" &&
                  neighborCell.roomId !== "Generator";

                if (!isNonGeneratorRoom) {
                  queue.push({ x: nr, y: nc, dist: dist + 1 });
                } else {
                  // Still need to record that it is powered
                  // This is already done by the pop from queue if we pushed it,
                  // but since we are NOT pushing it, we do it here.
                  if (gridToPower[nr][nc]) {
                    // Check if already powered by this generator to avoid duplicates
                    const alreadyPoweredByThisGen = gridToPower[nr][
                      nc
                    ]!.poweredByGenerators!.some(
                      (p) => p.x === gen.x && p.y === gen.y,
                    );
                    if (!alreadyPoweredByThisGen) {
                      gridToPower[nr][nc]!.isPowered = true;
                      gridToPower[nr][nc]!.poweredByGenerators!.push({
                        x: gen.x,
                        y: gen.y,
                        tier: gen.tier,
                        distance: dist + 1,
                      });
                    }
                  }
                }
              }
            }
          });
        }
      });
    };

    // 2. Calculate Power based on Phase 1 Tiers
    const generators: { x: number; y: number; tier: number }[] = [];
    newGrid.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell && cell.type === "room" && cell.roomId === "Generator") {
          generators.push({ x: r, y: c, tier: cell.tier || 1 });
        }
      });
    });

    calculatePower(newGrid, generators);

    // 3. Phase 2: Add Power-based upgrades
    newGrid.forEach((row) => {
      row.forEach((cell) => {
        if (cell && cell.type === "room") {
          const baseRoom = roomsData.find((r) => r.Id === cell.roomId);
          if (baseRoom && cell.isPowered && baseRoom.UpgradedByPower > 0) {
            const uniqueGens = cell.poweredByGenerators?.length || 0;
            const powerBonus = Math.min(uniqueGens, baseRoom.UpgradedByPower);
            cell.tier = Math.min(3, (cell.tier || 1) + powerBonus);
          }
        }
      });
    });

    // Power might need to be recalculated if generators got upgraded by power
    let genTierChanged = false;
    newGrid.forEach((row, x) => {
      row.forEach((cell, y) => {
        if (cell && cell.type === "room" && cell.roomId === "Generator") {
          const oldTier = generators.find((g) => g.x === x && g.y === y)?.tier;
          if (cell.tier !== oldTier) {
            genTierChanged = true;
          }
        }
      });
    });

    if (genTierChanged) {
      // Re-calculate power
      const finalGenerators: { x: number; y: number; tier: number }[] = [];
      newGrid.forEach((row, r) => {
        row.forEach((cell, c) => {
          if (cell && cell.type === "room" && cell.roomId === "Generator") {
            finalGenerators.push({ x: r, y: c, tier: cell.tier! });
          }
        });
      });
      calculatePower(newGrid, finalGenerators);
    }

    return newGrid;
  }, [grid]);

  useEffect(() => {
    // Only serialize raw grid, not calculated
    const serialized = btoa(JSON.stringify(grid));
    const url = new URL(window.location.href);
    url.searchParams.set("s", serialized);
    window.history.replaceState({}, "", url.toString());
  }, [grid]);

  // Sync selectedRoomId when category changes
  useEffect(() => {
    const categoryRooms = roomsByType[selectedRoomCategory];
    if (categoryRooms.length > 0) {
      if (!categoryRooms.find((r) => r.Id === selectedRoomId)) {
        setSelectedRoomId(categoryRooms[0].Id);
      }
    }
  }, [selectedRoomCategory, roomsByType, selectedRoomId]);

  const handleCellClick = (x: number, y: number) => {
    const newGrid = [...grid.map((row) => [...row])];

    const updateCellConnections = (
      row: number,
      col: number,
      currentGrid: (GridCell | null)[][],
      triggeringR: number,
      triggeringC: number,
    ) => {
      const cell = currentGrid[row][col];
      if (!cell || cell.type !== "path") return;

      let { top, bottom, left, right } = getConnectionsFromPathType(
        cell.pathType!,
      );

      // Check if the triggering cell is an adjacent neighbor that exists
      const isNeighbor = (nx: number, ny: number) => {
        if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE)
          return false;
        return !!currentGrid[nx][ny];
      };

      // Add connection if neighbor exists
      // Top/Bottom are mapped to Column +/- 1 (visual Up-Right/Down-Left)
      // Left/Right are mapped to Row +/- 1 (visual Up-Left/Down-Right)
      if (
        row === triggeringR &&
        col + 1 === triggeringC &&
        isNeighbor(triggeringR, triggeringC)
      )
        top = true;
      if (
        row === triggeringR &&
        col - 1 === triggeringC &&
        isNeighbor(triggeringR, triggeringC)
      )
        bottom = true;
      if (
        row - 1 === triggeringR &&
        col === triggeringC &&
        isNeighbor(triggeringR, triggeringC)
      )
        left = true;
      if (
        row + 1 === triggeringR &&
        col === triggeringC &&
        isNeighbor(triggeringR, triggeringC)
      )
        right = true;

      // Also always check all neighbors during initial placement or whenever triggered
      // to ensure we don't miss existing ones
      if (isNeighbor(row, col + 1)) top = true;
      if (isNeighbor(row, col - 1)) bottom = true;
      if (isNeighbor(row - 1, col)) left = true;
      if (isNeighbor(row + 1, col)) right = true;

      cell.pathType = getPathTypeFromConnections(top, bottom, left, right);
    };

    if (selectedType === "empty") {
      newGrid[x][y] = null;
    } else if (selectedType === "medallion") {
      const cell = newGrid[x][y];
      if (cell && cell.type === "room") {
        newGrid[x][y] = {
          ...cell,
          hasMedallion: !cell.hasMedallion,
        };
      }
    } else if (selectedType === "room") {
      newGrid[x][y] = {
        type: "room",
        roomId: selectedRoomId,
        tier: 1, // Will be calculated
        isPowered: false, // Will be calculated
        hasMedallion: false,
      };
    } else if (selectedType === "path") {
      // For new paths, use the selectedPathType but also check neighbors
      // Top/Bottom are mapped to Column +/- 1 (visual Up-Right/Down-Left)
      // Left/Right are mapped to Row +/- 1 (visual Up-Left/Down-Right)
      const top = y + 1 < GRID_SIZE && !!newGrid[x][y + 1];
      const bottom = y - 1 >= 0 && !!newGrid[x][y - 1];
      const left = x - 1 >= 0 && !!newGrid[x - 1][y];
      const right = x + 1 < GRID_SIZE && !!newGrid[x + 1][y];

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

    // Update neighbors if they are paths
    if (selectedType === "path") {
      const neighbors = [
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1],
      ];

      neighbors.forEach(([nr, nc]) => {
        if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
          updateCellConnections(nr, nc, newGrid, x, y);
        }
      });
    }

    setGrid(newGrid);
  };

  const getIconPath = (cell: GridCell) => {
    if (cell.type === "room") {
      const roomInfo = roomsPerLevelData.find(
        (r) => roomsData[r.Room].Id === cell.roomId && r.Level === cell.tier,
      );
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

  const shareLayout = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      alert("Link copied to clipboard!");
    });
  };

  const getCellPosition = (x: number, y: number) => {
    // Row 0 is the 'bottom' row, Column 0 is the 'left' column.
    // Based on visual orientation:
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
    const cell = calculatedGrid[x][y];
    return (
      <div className="hover-info">
        <div className="hover-header">
          Cell ({x}, {y})
        </div>
        {cell && cell.type === "room" && (
          <>
            <div className="hover-room-name">
              {roomsData.find((rd) => rd.Id === cell.roomId)?.Name} (T
              {cell.tier})
            </div>
            {cell.upgradedByRooms && cell.upgradedByRooms.length > 0 && (
              <div className="hover-section">
                <div className="section-title">Upgraded By:</div>
                <ul>
                  {cell.upgradedByRooms.map((name, i) => (
                    <li key={i}>{name}</li>
                  ))}
                  {cell.hasMedallion && <li>Quipolatl's Medallion (+1)</li>}
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

  return (
    <div className="app-container">
      <div className="sidebar">
        <div className="header">
          <h2>Temple Builder</h2>
          <p className="subtitle">Plan your PoE2 Incursion Temple</p>
        </div>
        <div className="tool-section">
          <button
            className={selectedType === "room" ? "active" : ""}
            onClick={() => setSelectedType("room")}
          >
            Room
          </button>
          <button
            className={selectedType === "path" ? "active" : ""}
            onClick={() => setSelectedType("path")}
          >
            Path
          </button>
          <button
            className={selectedType === "empty" ? "active" : ""}
            onClick={() => setSelectedType("empty")}
          >
            Eraser
          </button>
          <button
            className={selectedType === "medallion" ? "active" : ""}
            onClick={() => setSelectedType("medallion")}
            title="Quipolatl's Medallion (+1 Tier)"
          >
            Medal
          </button>
        </div>

        {selectedType === "room" && (
          <div className="options">
            <div className="tool-section">
              <button
                className={selectedRoomCategory === "past" ? "active" : ""}
                onClick={() => setSelectedRoomCategory("past")}
              >
                Past
              </button>
              <button
                className={selectedRoomCategory === "present" ? "active" : ""}
                onClick={() => setSelectedRoomCategory("present")}
              >
                Present
              </button>
              <button
                className={selectedRoomCategory === "reward" ? "active" : ""}
                onClick={() => setSelectedRoomCategory("reward")}
              >
                Reward
              </button>
            </div>
            <label>Select Room:</label>
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
            >
              {roomsByType[selectedRoomCategory].map((r) => (
                <option key={r.Id} value={r.Id}>
                  {r.Name}
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedType === "path" && (
          <div className="options">
            <label>Select Path:</label>
            <div className="path-grid">
              {Object.keys(PATH_TYPES).map((pt) => (
                <img
                  key={pt}
                  src={`/ggpk/${pt}.png`}
                  className={selectedPathType === pt ? "selected" : ""}
                  onClick={() => setSelectedPathType(pt as PathType)}
                  title={pt}
                />
              ))}
            </div>
          </div>
        )}

        <div className="actions">
          <button onClick={shareLayout}>Share Link</button>
          <button
            onClick={() =>
              setGrid(
                Array(GRID_SIZE)
                  .fill(null)
                  .map(() => Array(GRID_SIZE).fill(null)),
              )
            }
          >
            Clear Grid
          </button>
        </div>

        <div className="help-text">
          <p>Instructions:</p>
          <ul>
            <li>Select a tool (Room, Path, Eraser, Medal)</li>
            <li>Configure options (Room type)</li>
            <li>Click on the grid to place/remove/apply medal</li>
            <li>Tiers and Power are calculated automatically</li>
            <li>
              Upgrades: +1 per connected 'UpgradedBy' room (max 3). Special: 3x
              rooms need 2 copies for first upgrade.
            </li>
            <li>Use "Share Link" to copy your layout URL</li>
            <li>Hover over a cell to see detailed information</li>
          </ul>
        </div>
      </div>

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
                  onMouseEnter={() => setHoveredCell({ x, y })}
                  onMouseLeave={() => setHoveredCell(null)}
                  data-powered={cell?.isPowered}
                  data-tier={cell?.tier}
                  data-cell-type={cell?.type}
                  data-room-id={cell?.roomId}
                  data-testid={`cell-${x}-${y}`}
                >
                  {hoveredCell?.x === x && hoveredCell?.y === y && (
                    <img
                      src="/ggpk/incursion2tileglowframe.png"
                      className="hover-glow"
                      alt=""
                    />
                  )}
                  <div className="cell-content">
                    {cell ? (
                      <img
                        src={getIconPath(cell)}
                        alt={
                          cell.type === "room"
                            ? `${roomsData.find((r) => r.Id === cell.roomId)?.Name} (T${cell.tier})`
                            : cell.pathType
                        }
                      />
                    ) : (
                      <img src="/ggpk/incursion2tileempty.png" alt="" />
                    )}
                  </div>
                  {cell?.type === "room" && cell.tier && cell.tier > 1 && (
                    <img
                      src={`/ggpk/roomtier${cell.tier}.png`}
                      className="tier-icon"
                      alt={`Tier ${cell.tier}`}
                    />
                  )}
                  {cell?.hasMedallion && (
                    <img
                      src="/ggpk/medallionleveluproom.png"
                      className="medallion-icon"
                      alt="Medallion"
                    />
                  )}
                </div>
              )),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
