import type { Direction, PathType } from "src/types.ts";
import { PATH_TYPES } from "src/data/constants.ts/gameUtils.ts";

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
