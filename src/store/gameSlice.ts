import {
  createSlice,
  type PayloadAction,
  createAsyncThunk,
} from "@reduxjs/toolkit";
import type { GridCell, PathType } from "../types";
import queryString from "query-string";
import {
  ENTRY,
  getConnectionsFromPathType,
  getPathTypeFromConnections,
  GRID_SIZE,
  roomsData,
} from "../utils/gameUtils";
import { getHighlightType, isDeletable } from "../utils/gridLogic";
import type { RootState } from "./index";

export const handleCellClick = createAsyncThunk(
  "game/handleCellClick",
  async ({ x, y }: { x: number; y: number }, { getState, dispatch }) => {
    const state = getState() as RootState;
    const { grid, selectedType, selectedRoomId, selectedPathType, debug } =
      state.game;

    if (x === ENTRY.x && y === ENTRY.y) return;

    const newGrid = [...grid.map((row) => [...row])];

    const updateCellConnections = (
      row: number,
      col: number,
      currentGrid: (GridCell | null)[][],
    ) => {
      const cell = currentGrid[row][col];
      if (!cell || cell.type !== "path") return;

      const {
        top: t,
        bottom: b,
        left: l,
        right: r,
      } = getConnectionsFromPathType(cell.pathType!);
      let top = t,
        bottom = b,
        left = l,
        right = r;

      const isNeighbor = (nx: number, ny: number) => {
        if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE)
          return false;
        return !!currentGrid[nx][ny];
      };

      if (isNeighbor(row, col + 1)) {
        const neighbor = currentGrid[row][col + 1];
        if (neighbor?.type === "path" || debug) top = true;
      }
      if (isNeighbor(row, col - 1)) {
        const neighbor = currentGrid[row][col - 1];
        if (neighbor?.type === "path" || debug) bottom = true;
      }
      if (isNeighbor(row - 1, col)) {
        const neighbor = currentGrid[row - 1][col];
        if (neighbor?.type === "path" || debug) left = true;
      }
      if (isNeighbor(row + 1, col)) {
        const neighbor = currentGrid[row + 1][col];
        if (neighbor?.type === "path" || debug) right = true;
      }

      currentGrid[row][col] = {
        ...cell,
        pathType: getPathTypeFromConnections(top, bottom, left, right),
      };
    };

    const canPlace = getHighlightType(
      x,
      y,
      grid,
      selectedType,
      selectedRoomId,
      selectedPathType,
      debug,
    );
    if (
      (selectedType === "room" || selectedType === "path") &&
      !canPlace &&
      !debug
    )
      return;

    if (selectedType === "empty") {
      if (!isDeletable(x, y, grid) && !debug) return;
      newGrid[x][y] = null;
    } else if (selectedType === "medallion") {
      const cell = newGrid[x][y];
      if (cell && cell.type === "room") {
        if (
          selectedRoomId === "medallion_levelup" ||
          selectedRoomId === "medallion_lock"
        ) {
          const isRemoving = cell.medallionType === selectedRoomId;

          if (!cell.medallionType || isRemoving) {
            if (
              selectedRoomId === "medallion_levelup" &&
              !isRemoving &&
              !debug
            ) {
              // We need calculatedGrid here. We can get it from a selector or just re-calculate it.
              // For simplicity, let's use the selector if possible, or just skip this check if it's too hard to get.
              // Actually, we can import the selector.
              const { selectCalculatedGrid } =
                await import("./selectors/selectCalculatedGrid");
              const calculatedGrid = selectCalculatedGrid(state);
              const calcCell = calculatedGrid[x][y];
              if (calcCell?.tier && calcCell.roomId) {
                if (calcCell.tier >= roomsData[calcCell.roomId].MaxLevel)
                  return;
              }
            }

            newGrid[x][y] = {
              ...cell,
              medallionType: isRemoving ? undefined : selectedRoomId,
            };
          }
        }
      }
    } else if (selectedType === "room") {
      const existingCell = grid[x][y];
      if (
        existingCell?.type === "room" &&
        existingCell.roomId === selectedRoomId
      ) {
        if (!isDeletable(x, y, grid) && !debug) return;
        newGrid[x][y] = null;
      } else {
        if (selectedRoomId === "Architect") {
          const exists = grid.some((row) =>
            row.some(
              (cell) => cell?.type === "room" && cell.roomId === "Architect",
            ),
          );
          if (exists) return;
        }

        newGrid[x][y] = {
          type: "room",
          roomId: selectedRoomId,
          tier: 1,
          isPowered: false,
        };
      }
    } else if (selectedType === "path") {
      const existingCell = grid[x][y];
      if (existingCell?.type === "path") {
        if (!isDeletable(x, y, grid) && !debug) return;
        newGrid[x][y] = null;
      } else {
        const isPath = (nx: number, ny: number) => {
          if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE)
            return false;
          return newGrid[nx][ny]?.type === "path";
        };

        const top = isPath(x, y + 1);
        const bottom = isPath(x, y - 1);
        const left = isPath(x - 1, y);
        const right = isPath(x + 1, y);

        const initialConnections = getConnectionsFromPathType(selectedPathType);

        newGrid[x][y] = {
          type: "path",
          pathType: getPathTypeFromConnections(
            initialConnections.top || top,
            initialConnections.bottom || bottom,
            initialConnections.left || left,
            initialConnections.right || right,
          ),
          isPowered: false,
        };
      }
    }

    if (newGrid[x][y] !== grid[x][y]) {
      const neighbors = [
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1],
      ];

      neighbors.forEach(([nr, nc]) => {
        if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
          updateCellConnections(nr, nc, newGrid);
        }
      });
    }

    dispatch(setGrid(newGrid));
  },
);

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
