import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { datExport } from "./vite-plugin-poe-dat-export";
import {
  CdnBundleLoader,
  FileLoader,
} from "./node_modules/pathofexile-dat/dist/cli/bundle-loaders";
import { exportTables } from "./node_modules/pathofexile-dat/dist/cli/export-tables";

interface IncursionRoom {
  _index: number;
  Id: string;
  IsPathway: boolean;
  UpgradedBy: number[];
  ConvertedBy: number[];
  ConvertedTo: number[];
  UpgradedByPower: number;
  IsPresentDay: boolean;
  IsBossReward: boolean;
  Name: string;
  Icon_DDSFile: string;
  Levels: IncursionRoomPerLevel[];
}

interface IncursionRoomPerLevel {
  _index: number;
  Room: number;
  Level: number;
  Id: string;
  Description: string;
  Name: string;
  Icon_DDSFile: string;
  Mod: number | null;
  ModValues: number[];
  Description2: string;
}

interface IncursionMedallion {
  _index: number;
  Id: string;
  Name: string;
  FlavourText: string;
  Icon_DDSFile: string;
  Description: string;
}

type Types = {
  Incursion2Rooms: IncursionRoom;
  Incursion2RoomPerLevel: IncursionRoomPerLevel;
  Incursion2Medallions: IncursionMedallion;
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    datExport({
      CdnBundleLoader,
      FileLoader,
      exportTables,
      tables: [
        "Incursion2Rooms",
        "Incursion2RoomPerLevel",
        "Incursion2Medallions",
      ],
      async onProcessLang(lang, load) {
        const combined: Record<string, unknown> = {};
        const rooms = (await load("Incursion2Rooms")) as IncursionRoom[];
        const levels = (await load(
          "Incursion2RoomPerLevel",
        )) as IncursionRoomPerLevel[];

        const indexToId = Object.fromEntries(
          rooms.map((room) => [room._index, room.Id]),
        );

        combined.Incursion2Medallions = await load("Incursion2Medallions");
        combined.Incursion2Rooms = Object.fromEntries(
          rooms.map((room) => {
            const Levels: unknown[] = [];
            for (const level of levels) {
              if (level.Room === room._index) {
                Levels[level.Level] = level;
              }
            }
            return [
              room.Id,
              {
                ...room,
                Levels: Levels.filter(Boolean),
                UpgradedBy: room.UpgradedBy.map((idx) => indexToId[idx]),
                ConvertedBy: room.ConvertedBy.map((idx) => indexToId[idx]),
                ConvertedTo: room.ConvertedTo.map((idx) => indexToId[idx]),
              },
            ];
          }),
        );
        return combined;
      },
    }),
    react(),
  ],
  test: {
    globals: true,
    environment: "jsdom",
  },
});
