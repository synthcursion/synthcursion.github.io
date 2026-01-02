import { useAppDispatch, useAppSelector } from "src/hooks/store.ts";
import { getCellPosition } from "src/utils/getCellPosition.tsx";
import { handleCellClick } from "src/store/thunk/handleCellClick.ts";
import { setHoveredCell } from "src/store/gameSlice.ts";
import { Highlight } from "src/components/cell/Highlight.tsx";
import React from "react";
import { Content } from "src/components/cell/Content.tsx";
import { selectCell } from "src/store/selectors/selectCell.ts";

export const Cell: React.FC<{ x: number; y: number }> = ({ x, y }) => {
  const dispatch = useAppDispatch();
  const hoveredCell = useAppSelector((state) => state.game.hoveredCell);
  const cell = useAppSelector((state) => selectCell(state, x, y));

  return (
    <div
      key={`${x}-${y}`}
      className={`cell ${cell ? cell.type : "empty"}`}
      style={getCellPosition(x, y)}
      onClick={() => dispatch(handleCellClick({ x, y }))}
      onMouseEnter={() => dispatch(setHoveredCell({ x, y }))}
      onMouseLeave={() => dispatch(setHoveredCell(null))}
      data-powered={cell?.isPowered}
      data-tier={cell?.tier}
      data-cell-type={cell?.type}
      data-room-id={cell?.roomId}
      data-testid={`cell-${x}-${y}`}
    >
      <Highlight x={x} y={y} />
      {hoveredCell?.x === x && hoveredCell?.y === y && (
        <img
          src="/ggpk/incursion2tileglowframe.png"
          className="hover-glow"
          alt=""
        />
      )}
      <Content x={x} y={y} />
      {cell?.type === "room" && cell.tier && cell.tier > 1 && (
        <img
          src={`/ggpk/roomtier${cell.tier}.png`}
          className="tier-icon"
          alt={`Tier ${cell.tier}`}
        />
      )}
      {cell?.medallionType && (
        <img
          src={
            cell.medallionType === "medallion_lock"
              ? "/ggpk/incursion2tileglowmedallionlock.png"
              : "/ggpk/incursion2tileglowmedallionlevelup.png"
          }
          className="medallion-glow"
          alt=""
        />
      )}
      {cell?.medallionType && (
        <img
          src="/ggpk/medallionleveluproom.png"
          className="medallion-icon"
          alt="Medallion"
        />
      )}
    </div>
  );
};
