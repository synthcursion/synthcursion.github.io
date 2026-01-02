import type { Direction, GridCell, PathType } from "src/types.ts";
import { GRID_SIZE, PATH_TYPES, roomsData } from "src/data/constants.ts";

export const getConnectionsFromPathType = (
  type: PathType,
): Record<Direction, boolean> => {
  const connections = PATH_TYPES[type];
  return {
    top: connections.includes("top"),
    bottom: connections.includes("bottom"),
    left: connections.includes("left"),
    right: connections.includes("right"),
  };
};
export const getPathTypeFromConnections = (
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
