import type { GridCell } from "src/types.ts";
import { roomsData } from "src/data/constants.ts";

export function getIconPath(cell: GridCell) {
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
}
