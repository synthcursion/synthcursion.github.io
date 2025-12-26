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

const PATH_TYPES: PathType[] = [
  "path1", // top to bottom
  "path2", // left to right
  "pathconnect1", // rendered on the top or bottom of a cell to bridge path-to-path connections
  "pathconnect2", // rendered on the left or right of a cell to bridge path-to-path connections
  "pathcornerbot", // connects left to top ('bot' refers to the isometric location of the corner)
  "pathcornerleft", // connects top to right
  "pathcornerright", // connects left to bottom
  "pathcornertop", // connects bottom to right
  "pathfourway",
  "paththreeway1", // connects all but left
  "paththreeway2", // connects all but top
  "paththreeway3", // connects all but bottom
  "paththreeway4", // connects all but right
];

const getConnectionsFromPathType = (type: PathType) => {
  const top = [
    "path1",
    "pathcornerbot",
    "pathcornerright",
    "pathfourway",
    "paththreeway1",
    "paththreeway3",
    "paththreeway4",
    "pathconnect1",
  ].includes(type);
  const bottom = [
    "path1",
    "pathcornerleft",
    "pathcornertop",
    "pathfourway",
    "paththreeway1",
    "paththreeway2",
    "paththreeway4",
    "pathconnect1",
  ].includes(type);
  const left = [
    "path2",
    "pathcornerbot",
    "pathcornerleft",
    "pathfourway",
    "paththreeway2",
    "paththreeway3",
    "paththreeway4",
    "pathconnect2",
  ].includes(type);
  const right = [
    "path2",
    "pathcornerright",
    "pathcornertop",
    "pathfourway",
    "paththreeway1",
    "paththreeway2",
    "paththreeway3",
    "pathconnect2",
  ].includes(type);
  return { top, bottom, left, right };
};

const getPathTypeFromConnections = (
  top: boolean,
  bottom: boolean,
  left: boolean,
  right: boolean,
): PathType => {
  const count = [top, bottom, left, right].filter(Boolean).length;
  if (count === 4) return "pathfourway";
  if (count === 3) {
    if (!left) return "paththreeway1";
    if (!top) return "paththreeway2";
    if (!bottom) return "paththreeway3";
    if (!right) return "paththreeway4";
  }
  if (count === 2) {
    if (top && bottom) return "path1";
    if (left && right) return "path2";
    if (left && top) return "pathcornerbot";
    if (top && right) return "pathcornerright";
    if (left && bottom) return "pathcornerleft";
    if (bottom && right) return "pathcornertop";
  }
  if (top || bottom) return "path1";
  if (left || right) return "path2";
  return "path1"; // Default
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
  const [selectedRoomId, setSelectedRoomId] = useState<number>(3); // Default to Garrison
  const [selectedPathType, setSelectedPathType] = useState<PathType>("path1");
  const [hoveredCell, setHoveredCell] = useState<{
    r: number;
    c: number;
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
    const past = filtered.filter((r) => r.IsPastExclusive && !r.IsBossReward);
    const present = filtered.filter(
      (r) => !r.IsPastExclusive && !r.IsBossReward,
    );
    const reward = filtered.filter((r) => r.IsBossReward);
    return { past, present, reward };
  }, []);

  const calculatedGrid = useMemo(() => {
    const newGrid = grid.map((row) =>
      row.map((cell) => (cell ? { ...cell } : null)),
    );

    // 1. Phase 1: Adjacency and Medallions
    newGrid.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell && cell.type === "room") {
          cell.upgradedByRooms = [];
          const baseRoom = roomsData.find((rd) => rd._index === cell.roomId);
          if (baseRoom) {
            const connectedCounts: Record<number, number> = {};
            const connectedRoomNames: Record<number, string> = {};
            const neighbors = [
              [r - 1, c],
              [r + 1, c],
              [r, c - 1],
              [r, c + 1],
            ];
            neighbors.forEach(([nr, nc]) => {
              if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
                const neighbor = newGrid[nr][nc];
                if (neighbor && neighbor.type === "room") {
                  connectedCounts[neighbor.roomId!] =
                    (connectedCounts[neighbor.roomId!] || 0) + 1;
                  const nBaseRoom = roomsData.find(
                    (rd) => rd._index === neighbor.roomId,
                  );
                  if (nBaseRoom) {
                    connectedRoomNames[neighbor.roomId!] = nBaseRoom.Name;
                  }
                }
              }
            });

            const upgradeByCounts: Record<number, number> = {};
            baseRoom.UpgradedBy.forEach((id) => {
              upgradeByCounts[id] = (upgradeByCounts[id] || 0) + 1;
            });

            let bonus = 0;
            const hasThreeCopy = Object.values(upgradeByCounts).some(
              (count) => count === 3,
            );

            if (hasThreeCopy) {
              let hasTwoOfThree = false;
              let upgradeId = -1;
              for (const idStr in upgradeByCounts) {
                const id = Number(idStr);
                if (
                  upgradeByCounts[id] === 3 &&
                  (connectedCounts[id] || 0) >= 2
                ) {
                  hasTwoOfThree = true;
                  upgradeId = id;
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
              for (const idStr in upgradeByCounts) {
                const id = Number(idStr);
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

            let tier = 1 + bonus + (cell.hasMedallion ? 1 : 0);
            cell.tier = Math.min(3, tier);
          }
        }
      });
    });

    // 2. Calculate Power based on Phase 1 Tiers
    const generators: { r: number; c: number; tier: number; name: string }[] =
      [];
    newGrid.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell && cell.type === "room" && cell.roomId === 7) {
          generators.push({ r, c, tier: cell.tier || 1, name: "Generator" });
        }
      });
    });

    // Reset all power
    newGrid.forEach((row) =>
      row.forEach((cell) => {
        if (cell) {
          cell.isPowered = false;
          cell.poweredByGenerators = [];
        }
      }),
    );

    generators.forEach((gen) => {
      const range = gen.tier;
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          const dist = Math.abs(r - gen.r) + Math.abs(c - gen.c);
          if (dist <= range) {
            if (newGrid[r][c]) {
              newGrid[r][c]!.isPowered = true;
              newGrid[r][c]!.poweredByGenerators!.push({
                r: gen.r,
                c: gen.c,
                tier: gen.tier,
              });
            }
          }
        }
      }
    });

    // 3. Phase 2: Add Power-based upgrades
    newGrid.forEach((row) => {
      row.forEach((cell) => {
        if (cell && cell.type === "room") {
          const baseRoom = roomsData.find((r) => r._index === cell.roomId);
          if (baseRoom && cell.isPowered && baseRoom.UpgradedByPower > 0) {
            cell.tier = Math.min(
              3,
              (cell.tier || 1) + baseRoom.UpgradedByPower,
            );
          }
        }
      });
    });

    // Power might need to be recalculated if generators got upgraded by power
    let genTierChanged = false;
    newGrid.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell && cell.type === "room" && cell.roomId === 7) {
          const oldTier = generators.find((g) => g.r === r && g.c === c)?.tier;
          if (cell.tier !== oldTier) {
            genTierChanged = true;
          }
        }
      });
    });

    if (genTierChanged) {
      // Re-calculate power
      const finalGenerators: { r: number; c: number; tier: number }[] = [];
      newGrid.forEach((row, r) => {
        row.forEach((cell, c) => {
          if (cell && cell.type === "room" && cell.roomId === 7) {
            finalGenerators.push({ r, c, tier: cell.tier! });
          }
        });
      });
      newGrid.forEach((row) =>
        row.forEach((cell) => {
          if (cell) {
            cell.isPowered = false;
            cell.poweredByGenerators = [];
          }
        }),
      );
      finalGenerators.forEach((gen) => {
        for (let r = 0; r < GRID_SIZE; r++) {
          for (let c = 0; c < GRID_SIZE; c++) {
            const dist = Math.abs(r - gen.r) + Math.abs(c - gen.c);
            if (dist <= gen.tier) {
              if (newGrid[r][c]) {
                newGrid[r][c]!.isPowered = true;
                newGrid[r][c]!.poweredByGenerators!.push({
                  r: gen.r,
                  c: gen.c,
                  tier: gen.tier,
                });
              }
            }
          }
        }
      });
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
      if (!categoryRooms.find((r) => r._index === selectedRoomId)) {
        setSelectedRoomId(categoryRooms[0]._index);
      }
    }
  }, [selectedRoomCategory, roomsByType, selectedRoomId]);

  const handleCellClick = (r: number, c: number) => {
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
      const isNeighbor = (nr: number, nc: number) => {
        if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE)
          return false;
        return !!currentGrid[nr][nc];
      };

      // Add connection if neighbor exists
      if (
        row + 1 === triggeringR &&
        col === triggeringC &&
        isNeighbor(triggeringR, triggeringC)
      )
        top = true;
      if (
        row - 1 === triggeringR &&
        col === triggeringC &&
        isNeighbor(triggeringR, triggeringC)
      )
        bottom = true;
      if (
        row === triggeringR &&
        col - 1 === triggeringC &&
        isNeighbor(triggeringR, triggeringC)
      )
        left = true;
      if (
        row === triggeringR &&
        col + 1 === triggeringC &&
        isNeighbor(triggeringR, triggeringC)
      )
        right = true;

      // Also always check all neighbors during initial placement or whenever triggered
      // to ensure we don't miss existing ones
      if (isNeighbor(row + 1, col)) top = true;
      if (isNeighbor(row - 1, col)) bottom = true;
      if (isNeighbor(row, col - 1)) left = true;
      if (isNeighbor(row, col + 1)) right = true;

      cell.pathType = getPathTypeFromConnections(top, bottom, left, right);
    };

    if (selectedType === "empty") {
      newGrid[r][c] = null;
    } else if (selectedType === "medallion") {
      const cell = newGrid[r][c];
      if (cell && cell.type === "room") {
        newGrid[r][c] = {
          ...cell,
          hasMedallion: !cell.hasMedallion,
        };
      }
    } else if (selectedType === "room") {
      newGrid[r][c] = {
        type: "room",
        roomId: selectedRoomId,
        tier: 1, // Will be calculated
        isPowered: false, // Will be calculated
        hasMedallion: false,
      };
    } else if (selectedType === "path") {
      // For new paths, use the selectedPathType but also check neighbors
      const top = r + 1 < GRID_SIZE && !!newGrid[r + 1][c];
      const bottom = r - 1 >= 0 && !!newGrid[r - 1][c];
      const left = c - 1 >= 0 && !!newGrid[r][c - 1];
      const right = c + 1 < GRID_SIZE && !!newGrid[r][c + 1];

      const initialConnections = getConnectionsFromPathType(selectedPathType);

      newGrid[r][c] = {
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
    const neighbors = [
      [r + 1, c],
      [r - 1, c],
      [r, c + 1],
      [r, c - 1],
    ];

    neighbors.forEach(([nr, nc]) => {
      if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
        updateCellConnections(nr, nc, newGrid, r, c);
      }
    });

    setGrid(newGrid);
  };

  const getIconPath = (cell: GridCell) => {
    if (cell.type === "room") {
      const roomInfo = roomsPerLevelData.find(
        (r) => r.Room === cell.roomId && r.Level === cell.tier,
      );
      if (roomInfo && roomInfo.Icon_DDSFile) {
        const fileName = roomInfo.Icon_DDSFile.split("/")
          .pop()
          ?.replace(".dds", ".png")
          .toLowerCase();
        return `/ggpk/${fileName}`;
      }
      // Fallback to roomsData if level specific not found
      const baseRoom = roomsData.find((r) => r._index === cell.roomId);
      if (baseRoom && baseRoom.Icon_DDSFile) {
        let fileName = baseRoom.Icon_DDSFile.split("/")
          .pop()
          ?.replace(".dds", ".png")
          .toLowerCase();
        // Map RoomHoverX to iconX if needed
        if (fileName?.startsWith("roomhover")) {
          fileName = fileName.replace("roomhover", "icon");
        }
        return `/ggpk/${fileName}`;
      }
      return cell.isPowered
        ? "/ggpk/roomgenericpowered.png"
        : "/ggpk/roomgeneric.png";
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

  const getCellPosition = (r: number, c: number) => {
    // Row 0 is the bottom row, rendered on the lower left edge
    // col 0 is the left column, rendered on the upper left edge
    const centerX = 1425;
    const centerY = 738;
    const width = 1240;
    const height = 1016;

    return {
      left: `${centerX + (r + c - 8) * (width / 16)}px`,
      top: `${centerY + (r - c) * (height / 16)}px`,
      width: `${width / 8}px`,
      height: `${height / 8}px`,
    };
  };

  const getHoverInfo = () => {
    if (!hoveredCell) return null;
    const { r, c } = hoveredCell;
    const cell = calculatedGrid[r][c];
    return (
      <div className="hover-info">
        <div className="hover-header">
          Cell ({r}, {c})
        </div>
        {cell && cell.type === "room" && (
          <>
            <div className="hover-room-name">
              {roomsData.find((rd) => rd._index === cell.roomId)?.Name} (T
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
                        Generator at ({gen.r}, {gen.c}) [T{gen.tier}]
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
                        Generator at ({gen.r}, {gen.c}) [T{gen.tier}]
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
              onChange={(e) => setSelectedRoomId(Number(e.target.value))}
            >
              {roomsByType[selectedRoomCategory].map((r) => (
                <option key={r._index} value={r._index}>
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
              {PATH_TYPES.map((pt) => (
                <img
                  key={pt}
                  src={`/ggpk/${pt}.png`}
                  className={selectedPathType === pt ? "selected" : ""}
                  onClick={() => setSelectedPathType(pt)}
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
            {calculatedGrid.map((row, r) =>
              row.map((cell, c) => (
                <div
                  key={`${r}-${c}`}
                  className={`cell ${cell ? cell.type : "empty"}`}
                  style={getCellPosition(r, c)}
                  onClick={() => handleCellClick(r, c)}
                  onMouseEnter={() => setHoveredCell({ r, c })}
                  onMouseLeave={() => setHoveredCell(null)}
                >
                  {cell ? (
                    <div className="cell-content">
                      <img src={getIconPath(cell)} alt="" />
                      {cell.type === "room" && cell.tier && (
                        <span className="tier">T{cell.tier}</span>
                      )}
                      {cell.hasMedallion && (
                        <img
                          src="/ggpk/medallionleveluproom.png"
                          className="medallion-icon"
                          alt="Medallion"
                        />
                      )}
                      {cell.isPowered && <div className="powered-glow" />}
                    </div>
                  ) : (
                    <img src="/ggpk/incursion2tileempty.png" alt="" />
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
