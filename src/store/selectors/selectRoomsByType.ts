import { createAppSelector } from "src/store";
import { roomsData } from "src/data/constants.ts";

export const selectRoomsByType = createAppSelector(
  [
    (state) =>
      state.game.grid.some((row) =>
        row.some((cell) => cell?.roomId === "Architect"),
      ),
  ],
  (architectExists) => {
    const filtered = Object.values(roomsData).filter(
      (r) =>
        !r.IsPathway &&
        r.Name !== "" &&
        r.Id !== "Nothing" &&
        r.Id !== "SacrificeRoom" &&
        r.Id !== "Path" &&
        r.Id !== "PoweredPath" &&
        r.Id !== "Atziri" &&
        r.Id !== "Entrance" &&
        r.Id !== "ViperLegionBarracks" &&
        r.Id !== "TranscendentBarracks" &&
        r.Id !== "DeadSpymaster" &&
        !(r.Id === "Architect" && architectExists),
    );
    const past = {
      regular: filtered.filter((r) => !r.IsPresentDay && !r.IsBossReward),
      reward: filtered.filter((r) => !r.IsPresentDay && r.IsBossReward),
    };
    const present = {
      regular: filtered.filter((r) => r.IsPresentDay && !r.IsBossReward),
      reward: filtered.filter((r) => r.IsPresentDay && r.IsBossReward),
    };
    return { present, past };
  },
);
