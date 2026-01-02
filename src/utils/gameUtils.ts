import data from "../data/generated/English.json";
import type { Direction, IncursionRoom, PathType } from "../types";

export const roomsData = data.Incursion2Rooms as Record<string, IncursionRoom>;

export const GRID_SIZE = 9;

export const ENTRY = { x: 4, y: 0 };

export const PATH_TYPES: Record<PathType, Direction[]> = {
  path1: ["top", "bottom"],
  path2: ["left", "right"],
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
