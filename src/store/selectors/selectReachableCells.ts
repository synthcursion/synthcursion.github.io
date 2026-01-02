import { createAppSelector } from "src/store";
import { Direction, GridCell } from "src/types";
import {
  ENTRY,
  GRID_SIZE,
  roomsData,
} from "src/data/constants.ts/gameUtils.ts";
import { getConnectionsFromPathType } from "src/utils/pathConnections.ts";

export const getRoomToRoomConnections = (
  x: number,
  y: number,
  currentGrid: (GridCell | null)[][],
): Direction[] => {
  const cell = currentGrid[x][y];
  if (!cell || cell.type !== "room" || !cell.roomId) return [];

  const connections: Direction[] = [];
  const neighbors: { nx: number; ny: number; dir: Direction }[] = [
    { nx: x, ny: y + 1, dir: "top" },
    { nx: x, ny: y - 1, dir: "bottom" },
    { nx: x - 1, ny: y, dir: "left" },
    { nx: x + 1, ny: y, dir: "right" },
  ];

  neighbors.forEach(({ nx, ny, dir }) => {
    let neighborCell: GridCell | null | undefined;
    if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
      neighborCell = currentGrid[nx][ny];
    } else if (nx === 4 && ny === 9) {
      neighborCell = { type: "room", roomId: "Atziri" };
    } else if (nx === 4 && ny === -1) {
      neighborCell = {
        type: "path",
        pathType: "pathfourway",
      };
    }

    if (neighborCell && neighborCell.type === "room" && neighborCell.roomId) {
      const currentRoom = roomsData[cell.roomId!];
      const otherRoom = roomsData[neighborCell.roomId!];

      if (!currentRoom || !otherRoom) return;

      const isArchitect =
        cell.roomId === "Architect" || neighborCell.roomId === "Architect";
      const isReward = currentRoom.IsBossReward || otherRoom.IsBossReward;
      const isUpgrade =
        currentRoom.UpgradedBy.includes(neighborCell.roomId!) ||
        otherRoom.UpgradedBy.includes(cell.roomId!);

      const isConversion =
        currentRoom.ConvertedBy.includes(neighborCell.roomId!) ||
        otherRoom.ConvertedBy.includes(cell.roomId!);

      if (isArchitect || isReward || isUpgrade || isConversion) {
        connections.push(dir);
      }
    }
  });

  return connections;
};

export const getRoomToPathConnections = (
  x: number,
  y: number,
  currentGrid: (GridCell | null)[][],
): Direction[] => {
  const cell = currentGrid[x][y];
  if (!cell || cell.type !== "room" || !cell.roomId) return [];
  if (cell.roomId === "Generator") return [];

  const connections: Direction[] = [];
  const neighbors: { nx: number; ny: number; dir: Direction }[] = [
    { nx: x, ny: y + 1, dir: "top" },
    { nx: x, ny: y - 1, dir: "bottom" },
    { nx: x - 1, ny: y, dir: "left" },
    { nx: x + 1, ny: y, dir: "right" },
  ];

  const oppositeDir: Record<Direction, Direction> = {
    top: "bottom",
    bottom: "top",
    left: "right",
    right: "left",
  };

  neighbors.forEach(({ nx, ny, dir }) => {
    let neighborCell: GridCell | null | undefined;
    if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
      neighborCell = currentGrid[nx][ny];
    } else if (nx === 4 && ny === -1) {
      neighborCell = {
        type: "path",
        pathType: "pathfourway",
      };
    }

    if (neighborCell && neighborCell.type === "path" && neighborCell.pathType) {
      const pathConns = getConnectionsFromPathType(neighborCell.pathType);
      if (!pathConns[oppositeDir[dir]]) {
        connections.push(dir);
      }
    }
  });

  return connections;
};

export const isReachableFromEntry = (
  currentGrid: (GridCell | null)[][],
): Set<string> => {
  const reachable = new Set<string>();
  const queue: { x: number; y: number }[] = [{ x: ENTRY.x, y: ENTRY.y }];
  reachable.add(`${ENTRY.x},${ENTRY.y}`);

  while (queue.length > 0) {
    const { x, y } = queue.shift()!;

    const neighbors = [
      { nr: x, nc: y + 1, side: "top" as const, opp: "bottom" as const },
      { nr: x, nc: y - 1, side: "bottom" as const, opp: "top" as const },
      { nr: x - 1, nc: y, side: "left" as const, opp: "right" as const },
      { nr: x + 1, nc: y, side: "right" as const, opp: "left" as const },
    ];

    neighbors.forEach(({ nr, nc, side, opp }) => {
      if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
        if (reachable.has(`${nr},${nc}`)) return;

        const currentCell = currentGrid[x][y];
        const neighborCell = currentGrid[nr][nc];

        if (!neighborCell) return;

        let canConnect = false;
        if (currentCell?.type === "room") {
          const r2r = getRoomToRoomConnections(x, y, currentGrid);
          const r2p = getRoomToPathConnections(x, y, currentGrid);

          if (neighborCell.type === "room") {
            if (r2r.includes(side)) canConnect = true;
          } else if (neighborCell.type === "path") {
            const conns = getConnectionsFromPathType(neighborCell.pathType!);
            if (r2p.includes(side) || conns[opp]) {
              canConnect = true;
            }
          }
        } else if (currentCell?.type === "path") {
          const currentConns = getConnectionsFromPathType(
            currentCell.pathType!,
          );
          if (neighborCell.type === "room") {
            const nr2p = getRoomToPathConnections(nr, nc, currentGrid);
            if (nr2p.includes(opp) || currentConns[side]) {
              canConnect = true;
            }
          } else if (neighborCell.type === "path") {
            if (currentConns[side]) {
              const neighborConns = getConnectionsFromPathType(
                neighborCell.pathType!,
              );
              if (neighborConns[opp]) canConnect = true;
            }
          }
        }

        if (canConnect) {
          reachable.add(`${nr},${nc}`);
          queue.push({ x: nr, y: nc });
        }
      }
    });
  }

  return reachable;
};

export const selectReachableCells = createAppSelector(
  [(state) => state.game.grid],
  (grid) => isReachableFromEntry(grid),
);
