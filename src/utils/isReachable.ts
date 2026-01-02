import type { GridCell } from "src/types.ts";
import { ENTRY, GRID_SIZE } from "src/data/constants.ts";
import {
  getConnectionsFromPathType,
  getRoomToPathConnections,
  getRoomToRoomConnections,
} from "src/utils/getConnections.ts";

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
