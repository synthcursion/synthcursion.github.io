import type { Plugin, ResolvedConfig, UserConfig } from "vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import {
  CdnBundleLoader,
  FileLoader,
} from "./node_modules/pathofexile-dat/dist/cli/bundle-loaders";
import { exportTables } from "./node_modules/pathofexile-dat/dist/cli/export-tables";
import * as path from "node:path";
import fs from "fs/promises";
import { F } from "vitest/dist/chunks/config.d.D2ROskhv";

const LANGS = [
  "English",
  "French",
  "German",
  "Japanese",
  "Korean",
  "Portuguese",
  "Russian",
  "Spanish",
  "Thai",
  "Traditional Chinese",
];

const includeAll = [] as string[];
includeAll.includes = () => true;

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

async function load<F extends keyof Types>(lang: string, file: F) {
  const tablePath = path.join("tables", lang, `${file}.json`);
  const content = await fs.readFile(tablePath, "utf-8");
  return JSON.parse(content) as Types[F][];
}

const datExport = (
  tables: (string | { name: string; columns: string[] })[],
): Plugin => {
  let cacheDir = ".cache";

  return {
    name: "dat-export",
    configResolved(config: ResolvedConfig) {
      cacheDir = path.join(config.cacheDir, "poe-data");
    },

    async buildStart() {
      const cdnUrl = await fetch("https://ggpk.exposed/version?poe=2").then(
        (r) => r.text(),
      );
      const patch = cdnUrl.split("/").find((v) => v.match(/\d+(\.\d+)+/));
      const cdnBundleLoader = await CdnBundleLoader.create(
        path.join(cacheDir, "bundles"),
        patch!,
      );

      const loader = await FileLoader.create(cdnBundleLoader);
      const exportedFiles = path.join(cacheDir, "exported");
      const outputRoot = path.join("src", "data", "generated");

      console.log(`Exporting data for version`, patch, "to", exportedFiles);
      for (const tr of LANGS) {
        await fs.mkdir(path.join("tables", tr), { recursive: true });
      }

      await exportTables(
        {
          patch,
          translations: LANGS,
          tables: tables.map((table) =>
            typeof table === "string"
              ? { name: table, columns: includeAll }
              : table,
          ),
        },
        exportedFiles,
        loader,
      );

      for (const lang of LANGS) {
        const combined: Record<string, unknown> = {};
        const rooms = await load(lang, "Incursion2Rooms");
        const levels = await load(lang, "Incursion2RoomPerLevel");

        const indexToId = Object.fromEntries(
          rooms.map((room) => [room._index, room.Id]),
        );

        combined.Incursion2Medallions = await load(
          lang,
          "Incursion2Medallions",
        );
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

        await fs.writeFile(
          path.join(outputRoot, `${lang}.json`),
          JSON.stringify(combined, null, 2),
        );
      }

      await fs.rm("./tables", { recursive: true });
    },
  };
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    datExport([
      "Incursion2Rooms",
      "Incursion2RoomPerLevel",
      "Incursion2Medallions",
    ]),
    react(),
  ],
  test: {
    globals: true,
    environment: "jsdom",
  },
} as UserConfig);
