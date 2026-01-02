import type { Plugin } from "vite";
import { defineConfig, type UserConfig } from "vite";
import react from "@vitejs/plugin-react";
import {
  CdnBundleLoader,
  FileLoader,
} from "./node_modules/pathofexile-dat/dist/cli/bundle-loaders";
import { exportTables } from "./node_modules/pathofexile-dat/dist/cli/export-tables";
import * as path from "node:path";
import fs from "node:fs/promises";

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

export interface DatExportOptions {
  tables: (string | { name: string; columns: string[] })[];
  onProcessLang?: (
    lang: string,
    load: <T>(file: string) => Promise<T[]>,
  ) => Promise<Record<string, unknown>>;
  outputRoot?: string;
}

const datExport = (options: DatExportOptions): Plugin => {
  const { tables, outputRoot = path.join("src", "data", "generated") } =
    options;
  let cacheDir = ".cache";

  async function load(lang: string, file: string) {
    const tablePath = path.join("tables", lang, `${file}.json`);
    const content = await fs.readFile(tablePath, "utf-8");
    return JSON.parse(content);
  }

  return {
    name: "dat-export",
    configResolved(config) {
      cacheDir = path.join(config.cacheDir, "poe-data");
    },

    async buildStart() {
      await fs.mkdir(outputRoot, { recursive: true });
      const cdnUrl = await fetch("https://ggpk.exposed/version?poe=2").then(
        (r) => r.text(),
      );
      const patch = cdnUrl.split("/").find((v) => v.match(/\d+(\.\d+)+/));
      if (!patch) {
        throw new Error("Could not find patch version from cdnUrl");
      }
      const versionFile = path.join(outputRoot, `version.json`);
      // compare patch to existing version
      const existingVersion = await fs
        .readFile(versionFile, "utf-8")
        .catch(() => null);
      if (existingVersion === patch) {
        console.log(`Version ${patch} already exported, skipping export`);
        return;
      }
      await fs.writeFile(versionFile, patch);
      const cdnBundleLoader = await CdnBundleLoader.create(
        path.join(cacheDir, "bundles"),
        patch,
      );

      const loader = await FileLoader.create(cdnBundleLoader);
      const exportedFiles = path.join(cacheDir, "exported");

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
        const rooms = (await load(lang, "Incursion2Rooms")) as IncursionRoom[];
        const mods = (await load(lang, "Mods")) as Record<string, number>[];
        const stats = (await load(lang, "Stats")) as Record<string, string>[];
        const levels = (await load(
          lang,
          "Incursion2RoomPerLevel",
        )) as IncursionRoomPerLevel[];

        const indexToId = Object.fromEntries(
          rooms.map((room) => [room._index, room.Id]),
        );

        combined.Incursion2Medallions = await load(
          lang,
          "Incursion2Medallions",
        );
        combined.Incursion2Rooms = Object.fromEntries(
          rooms.map((room) => {
            const Levels: Record<string, unknown>[] = [];
            for (const level of levels) {
              if (level.Room === room._index) {
                Levels[level.Level] = {
                  ...level,
                  Room: room.Id,
                  ModStats: !level.Mod
                    ? []
                    : [1, 2, 3, 4]
                        .map((i) => stats[mods[level.Mod!][`Stat${i}`]]?.Id)
                        .filter(Boolean),
                };
              }
            }
            return [
              room.Id,
              {
                ...room,
                Levels,
                MaxLevel: Levels.filter(Boolean).at(-1)?.Level ?? 0,
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
    datExport({
      tables: [
        "Incursion2Rooms",
        "Incursion2RoomPerLevel",
        "Incursion2Medallions",
        "Mods",
        "Stats",
      ],
    }),
    react(),
  ],
  test: {
    globals: true,
    environment: "jsdom",
  },
} as UserConfig);
