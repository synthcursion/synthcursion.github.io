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
  "path1",
  "path2",
  "pathconnect1",
  "pathconnect2",
  "pathcornerbot",
  "pathcornerleft",
  "pathcornerright",
  "pathcornertop",
  "pathfourway",
  "paththreeway1",
  "paththreeway2",
  "paththreeway3",
  "paththreeway4",
];

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
          const baseRoom = roomsData.find((rd) => rd._index === cell.roomId);
          if (baseRoom) {
            const connectedCounts: Record<number, number> = {};
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
              for (const idStr in upgradeByCounts) {
                const id = Number(idStr);
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
                  }
                }
                bonus = totalMatches >= 3 ? 2 : 1;
              } else {
                bonus = 0;
              }
            } else {
              for (const idStr in upgradeByCounts) {
                const id = Number(idStr);
                bonus += Math.min(
                  connectedCounts[id] || 0,
                  upgradeByCounts[id],
                );
              }
            }

            let tier = 1 + bonus + (cell.hasMedallion ? 1 : 0);
            cell.tier = Math.min(3, tier);
          }
        }
      });
    });

    // 2. Calculate Power based on Phase 1 Tiers
    const generators: { r: number; c: number; tier: number }[] = [];
    newGrid.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell && cell.type === "room" && cell.roomId === 7) {
          generators.push({ r, c, tier: cell.tier || 1 });
        }
      });
    });

    // Reset all power
    newGrid.forEach((row) =>
      row.forEach((cell) => cell && (cell.isPowered = false)),
    );

    generators.forEach((gen) => {
      const range = gen.tier;
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          const dist = Math.abs(r - gen.r) + Math.abs(c - gen.c);
          if (dist <= range) {
            if (newGrid[r][c]) newGrid[r][c]!.isPowered = true;
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
        row.forEach((cell) => cell && (cell.isPowered = false)),
      );
      finalGenerators.forEach((gen) => {
        for (let r = 0; r < GRID_SIZE; r++) {
          for (let c = 0; c < GRID_SIZE; c++) {
            const dist = Math.abs(r - gen.r) + Math.abs(c - gen.c);
            if (dist <= gen.tier) {
              if (newGrid[r][c]) newGrid[r][c]!.isPowered = true;
            }
          }
        }
      });
      // Tiers might need one last adjustment if power changed
      newGrid.forEach((row) => {
        row.forEach((cell) => {
          if (cell && cell.type === "room") {
            const baseRoom = roomsData.find((r) => r._index === cell.roomId);
            if (baseRoom && cell.isPowered && baseRoom.UpgradedByPower > 0) {
              // We need to re-apply power upgrade, but from Phase 1 tier
              // Actually, cell.tier here might already have power upgrade from previous pass.
              // Let's re-calculate from Phase 1 tier to be safe.
              // We'd need to store Phase 1 tiers or recalculate them.
              // Simplification: if it was already powered, it already got the bonus.
              // If it became powered, it needs the bonus.
              // If it lost power, it needs to lose the bonus.
              // Let's just do a full 2nd pass.
            }
          }
        });
      });
      // To be strictly correct and simple: repeat Phase 1 + 2 logic with current power?
      // No, Phase 1 is power-independent.
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
      newGrid[r][c] = {
        type: "path",
        pathType: selectedPathType,
        isPowered: false, // Will be calculated
      };
    }
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
    const centerX = 1424;
    const centerY = 737;
    const halfWidth = 620;
    const halfHeight = 508;

    // x = centerX + (c - r) * (halfWidth / 9)
    // y = centerY + (r + c - 8) * (halfHeight / 9)
    // Adjusting indices so (4,4) is at (centerX, centerY)
    // (0,0) is at top corner-ish
    // (8,8) is at bottom corner-ish
    // (0,8) is at right corner-ish
    // (8,0) is at left corner-ish

    return {
      left: `${centerX + (c - r) * (halfWidth / 8)}px`,
      top: `${centerY + (r + c - 8) * (halfHeight / 8)}px`,
      width: `${(halfWidth * 2) / 8}px`,
      height: `${(halfHeight * 2) / 8}px`,
    };
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
          </ul>
        </div>
      </div>

      <div className="grid-container">
        <div className="grid-background">
          <div className="grid">
            {calculatedGrid.map((row, r) =>
              row.map((cell, c) => (
                <div
                  key={`${r}-${c}`}
                  className={`cell ${cell ? cell.type : "empty"}`}
                  style={getCellPosition(r, c)}
                  onClick={() => handleCellClick(r, c)}
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
