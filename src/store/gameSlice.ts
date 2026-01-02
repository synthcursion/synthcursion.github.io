import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { GridCell, PathType } from "../types";
import queryString from "query-string";

const GRID_SIZE = 9;
const ENTRY = { x: 4, y: 0 };

export interface GameState {
  grid: (GridCell | null)[][];
  selectedType: "room" | "path" | "empty" | "medallion";
  selectedRoomId: string;
  selectedPathType: PathType;
  hoveredCell: { x: number; y: number } | null;
  debug: boolean;
  copyStatus: boolean;
  showSidebar: boolean;
  showTotalStats: boolean;
  showRemovableGlow: boolean;
  showInvalidGlow: boolean;
}

const getInitialGrid = (query: string): (GridCell | null)[][] => {
  const saved = queryString.parse(query, {
    arrayFormat: "bracket",
  });

  const rooms = (saved.rooms as string | string[]) || [];
  const paths = (saved.paths as string | string[]) || [];
  const medallions = (saved.medallions as string | string[]) || [];

  if (rooms.length > 0 || paths.length > 0 || medallions.length > 0) {
    const newGrid: (GridCell | null)[][] = Array(GRID_SIZE)
      .fill(null)
      .map(() => Array(GRID_SIZE).fill(null));

    newGrid[ENTRY.x][ENTRY.y] = { type: "path", pathType: "pathfourway" };

    const roomsList = Array.isArray(rooms) ? rooms : [rooms];
    const pathsList = Array.isArray(paths) ? paths : [paths];
    const medallionsList = Array.isArray(medallions)
      ? medallions
      : [medallions];

    roomsList.forEach((val) => {
      if (!val) return;
      const [roomId, x, y] = val.split("-");
      const ix = parseInt(x);
      const iy = parseInt(y);
      if (!isNaN(ix) && !isNaN(iy)) {
        newGrid[ix][iy] = { type: "room", roomId, tier: 1 };
      }
    });

    pathsList.forEach((val) => {
      if (!val) return;
      const [pathType, x, y] = val.split("-");
      const ix = parseInt(x);
      const iy = parseInt(y);
      if (!isNaN(ix) && !isNaN(iy)) {
        newGrid[ix][iy] = { type: "path", pathType: pathType as PathType };
      }
    });

    medallionsList.forEach((val) => {
      if (!val) return;
      const [medallionType, x, y] = val.split("-");
      const ix = parseInt(x);
      const iy = parseInt(y);
      if (!isNaN(ix) && !isNaN(iy)) {
        if (newGrid[ix][iy]?.type === "room") {
          newGrid[ix][iy]!.medallionType = medallionType;
        }
      }
    });

    return newGrid;
  }

  return Array(GRID_SIZE)
    .fill(null)
    .map((_, x) =>
      Array(GRID_SIZE)
        .fill(null)
        .map((_, y) => {
          if (x === ENTRY.x && y === ENTRY.y) {
            return { type: "path", pathType: "pathfourway" };
          }
          return null;
        }),
    );
};

export function getInitialState(
  query: string = window.location.search,
): GameState {
  return {
    grid: getInitialGrid(query),
    selectedType: "room",
    selectedRoomId: "Garrison",
    selectedPathType: "path1",
    hoveredCell: null,
    debug: (() => {
      const parsed = queryString.parse(query, {
        parseBooleans: true,
        arrayFormat: "bracket",
      });
      return (parsed.debug as boolean) || false;
    })(),
    copyStatus: false,
    showSidebar: true,
    showTotalStats: true,
    showRemovableGlow: true,
    showInvalidGlow: true,
  };
}

const initialState = getInitialState();

export const gameSlice = createSlice({
  name: "game",
  initialState,
  reducers: {
    setGrid: (state, action: PayloadAction<(GridCell | null)[][]>) => {
      state.grid = action.payload;
    },
    updateCell: (
      state,
      action: PayloadAction<{ x: number; y: number; cell: GridCell | null }>,
    ) => {
      const { x, y, cell } = action.payload;
      state.grid[x][y] = cell;
    },
    setSelectedType: (
      state,
      action: PayloadAction<GameState["selectedType"]>,
    ) => {
      state.selectedType = action.payload;
    },
    setSelectedRoomId: (state, action: PayloadAction<string>) => {
      state.selectedRoomId = action.payload;
    },
    setSelectedPathType: (state, action: PayloadAction<PathType>) => {
      state.selectedPathType = action.payload;
    },
    setHoveredCell: (
      state,
      action: PayloadAction<{ x: number; y: number } | null>,
    ) => {
      state.hoveredCell = action.payload;
    },
    setDebug: (state, action: PayloadAction<boolean>) => {
      state.debug = action.payload;
    },
    setCopyStatus: (state, action: PayloadAction<boolean>) => {
      state.copyStatus = action.payload;
    },
    setShowSidebar: (state, action: PayloadAction<boolean>) => {
      state.showSidebar = action.payload;
    },
    setShowTotalStats: (state, action: PayloadAction<boolean>) => {
      state.showTotalStats = action.payload;
    },
    setShowRemovableGlow: (state, action: PayloadAction<boolean>) => {
      state.showRemovableGlow = action.payload;
    },
    setShowInvalidGlow: (state, action: PayloadAction<boolean>) => {
      state.showInvalidGlow = action.payload;
    },
  },
});

export const {
  setGrid,
  setSelectedType,
  setSelectedRoomId,
  setSelectedPathType,
  setHoveredCell,
  setDebug,
  setCopyStatus,
  setShowSidebar,
  setShowTotalStats,
  setShowRemovableGlow,
  setShowInvalidGlow,
} = gameSlice.actions;

export default gameSlice.reducer;
