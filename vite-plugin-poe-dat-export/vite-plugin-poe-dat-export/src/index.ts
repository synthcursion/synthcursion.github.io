import type { Plugin, ResolvedConfig } from "vite";
import * as path from "node:path";
import fs from "node:fs/promises";

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
// @ts-ignore
includeAll.includes = () => true;

export interface DatExportOptions {
  tables: (string | { name: string; columns: string[] })[];
  onProcessLang?: (
    lang: string,
    load: <T>(file: string) => Promise<T[]>,
  ) => Promise<Record<string, any>>;
  outputRoot?: string;
  // Dependencies from pathofexile-dat
  CdnBundleLoader: any;
  FileLoader: any;
  exportTables: any;
}

export const datExport = (options: DatExportOptions): Plugin => {
  const {
    tables,
    onProcessLang,
    outputRoot = path.join("src", "data", "generated"),
    CdnBundleLoader,
    FileLoader,
    exportTables,
  } = options;
  let cacheDir = ".cache";

  async function load<T>(lang: string, file: string) {
    const tablePath = path.join("tables", lang, `${file}.json`);
    const content = await fs.readFile(tablePath, "utf-8");
    return JSON.parse(content) as T[];
  }

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
      if (!patch) {
        throw new Error("Could not find patch version from cdnUrl");
      }
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

      if (onProcessLang) {
        await fs.mkdir(outputRoot, { recursive: true });
        for (const lang of LANGS) {
          const combined = await onProcessLang(lang, (file) =>
            load(lang, file),
          );
          await fs.writeFile(
            path.join(outputRoot, `${lang}.json`),
            JSON.stringify(combined, null, 2),
          );
        }
      }

      await fs.rm("./tables", { recursive: true });
    },
  };
};
