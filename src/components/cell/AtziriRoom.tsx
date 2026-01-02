import { getCellPosition } from "src/utils/getCellPosition.tsx";
import { setHoveredCell } from "src/store/gameSlice.ts";
import { useAppDispatch } from "src/hooks/store.ts";

/* Atziri's Chamber at fixed location (4, 9) */
export const AtziriRoom = () => {
  const dispatch = useAppDispatch();
  return (
    <div
      className="cell room"
      style={getCellPosition(4, 9)}
      onMouseEnter={() => dispatch(setHoveredCell({ x: 4, y: 9 }))}
      onMouseLeave={() => dispatch(setHoveredCell(null))}
      data-cell-type="room"
      data-room-id="Atziri"
    >
      <div className="cell-content">
        <img src={`/ggpk/roomgeneric.png`} className="room-generic-bg" alt="" />
        {/* TODO render connection to path below */}
        <img
          src="/ggpk/iconatziri.png"
          className="main-icon"
          alt="Atziri's Chamber"
        />
      </div>
    </div>
  );
};
