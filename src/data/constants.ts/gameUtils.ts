import data from "src/data/generated/English.json";
import type { Direction, IncursionRoom, PathType } from "src/types.ts";

export const roomsData = data.Incursion2Rooms as Record<string, IncursionRoom>;

export const GRID_SIZE = 9;

export const RANGE = Array.from({ length: GRID_SIZE }, (_, i) => i);

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

export function processDescription(text: string) {
  if (!text) return text;
  return text.replace(/\[[^|\]]+\|([^\]]+)]/g, "$1");
}
