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

      // // exportTables doesn't export the specified path so no point copying for now
      // for (const fileName of await readdir(exportedFiles)) {
      //   const source = await readFile(path.join(exportedFiles, fileName));
      //   this.emitFile({
      //     type: "asset",
      //     fileName,
      //     source,
      //   });
      // }
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
