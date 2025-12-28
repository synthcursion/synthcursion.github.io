# vite-plugin-poe-dat-export

Vite plugin to export Path of Exile data tables using `pathofexile-dat`.

## Installation

```bash
npm install vite-plugin-poe-dat-export pathofexile-dat
```

## Usage

In your `vite.config.ts`:

```typescript
import { defineConfig } from "vite";
import { datExport } from "vite-plugin-poe-dat-export";
import { CdnBundleLoader, FileLoader } from "pathofexile-dat/dist/cli/bundle-loaders";
import { exportTables } from "pathofexile-dat/dist/cli/export-tables";

export default defineConfig({
  plugins: [
    datExport({
      CdnBundleLoader,
      FileLoader,
      exportTables,
      tables: ["Incursion2Rooms"],
      onProcessLang: async (lang, load) => {
        const rooms = await load("Incursion2Rooms");
        return { rooms };
      }
    })
  ]
});
```

## Options

- `tables`: List of tables to export. Can be strings or objects with `name` and `columns`.
- `onProcessLang`: Callback to process exported data for each language.
- `outputRoot`: Directory to save the processed JSON files (default: `src/data/generated`).
- `CdnBundleLoader`, `FileLoader`, `exportTables`: Dependencies that must be passed from `pathofexile-dat/dist/cli/*`.
