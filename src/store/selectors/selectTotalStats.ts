import { createAppSelector } from "src/store";
import { selectCalculatedGrid } from "src/store/selectors/selectCalculatedGrid.ts";
import { roomsData } from "src/utils/gameUtils.ts";

export const selectTotalStats = createAppSelector(
  [selectCalculatedGrid],
  (calculatedGrid) => {
    const mods: Record<string, number> = {};
    const descriptions: Record<string, number> = {};
    calculatedGrid.forEach((row) => {
      row.forEach((cell) => {
        if (cell && cell.type === "room" && cell.roomId && cell.tier) {
          const roomData = roomsData[cell.roomId];
          if (roomData && roomData.Levels[cell.tier]) {
            const levelData = roomData.Levels[cell.tier];
            levelData.ModStats.forEach((stat, idx) => {
              const value = levelData.ModValues[idx] || 0;
              if (value !== 0) {
                mods[stat] = (mods[stat] || 0) + value;
              }
            });
            if (levelData.Description) {
              const desc = levelData.Description.split("\n")[0].trim();
              if (desc) {
                descriptions[desc] = (descriptions[desc] || 0) + 1;
              }
            }
            if (levelData.Description2) {
              const desc2 = levelData.Description2.trim();
              if (desc2 && desc2 !== levelData.Description?.trim()) {
                descriptions[desc2] = (descriptions[desc2] || 0) + 1;
              }
            }
          }
        }
      });
    });
    return { mods, descriptions };
  },
);
