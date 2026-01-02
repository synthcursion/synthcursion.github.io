import { createAsyncThunk } from "@reduxjs/toolkit";
import type { RootState } from "src/store";
import {
  ENTRY,
  GRID_SIZE,
  roomsData,
} from "src/data/constants.ts/gameUtils.ts";
import type { GridCell } from "src/types.ts";
import { getHighlightType, isDeletable } from "src/utils/gridLogic.ts";
import { setGrid } from "src/store/gameSlice.ts";
import { selectCalculatedGrid } from "src/store/selectors/selectCalculatedGrid.ts";
import {
  getConnectionsFromPathType,
  getPathTypeFromConnections,
} from "src/utils/getConnections.ts";

export const handleCellClick = createAsyncThunk(
  "game/handleCellClick",
  ({ x, y }: { x: number; y: number }, { getState, dispatch }) => {
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
