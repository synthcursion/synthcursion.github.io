import { getCellPosition } from "src/utils/getCellPosition.tsx";
import { setHoveredCell } from "src/store/gameSlice.ts";
import { useAppDispatch, useAppSelector } from "src/hooks/store.ts";
import { selectCalculatedGrid } from "src/store/selectors/selectCalculatedGrid.ts";

/* Atziri's Chamber at fixed location (4, 9) */
export const AtziriRoom = () => {
  const dispatch = useAppDispatch();
  const calculatedGrid = useAppSelector(selectCalculatedGrid);
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
        <img
          src={`/ggpk/roomgeneric${calculatedGrid[4][9]?.isPowered ? "powered" : ""}.png`}
          className="room-generic-bg"
          alt=""
        />
        {calculatedGrid[4][9]?.roomToRoomConnections?.map((dir) => {
          const isVertical = dir === "top" || dir === "bottom";
          const suffix = isVertical ? "vertical" : "horizontal";
          return (
            <img
              key={`r2r-${dir}`}
              src={`/ggpk/roomconnectroom${suffix}${calculatedGrid[4][9]?.isPowered ? "powered" : ""}.png`}
              className={`room-connect room-connect-${dir}`}
              alt=""
            />
          );
        })}
        {calculatedGrid[4][9]?.roomToPathConnections?.map((dir) => {
          const fileDir =
            dir === "top" ? "up" : dir === "bottom" ? "down" : dir;
          return (
            <img
              key={`r2p-${dir}`}
              src={`/ggpk/roomconnect${fileDir}${calculatedGrid[4][9]?.isPowered ? "powered" : ""}.png`}
              className={`room-connect room-connect-${dir} r2p-conn`}
              alt=""
            />
          );
        })}
        {calculatedGrid[4][9]?.roomToPathPermanentConnections?.map((dir) => {
          const isVertical = dir === "top" || dir === "bottom";
          const suffix = isVertical ? "1" : "2";
          return (
            <img
              key={`r2p-perm-${dir}`}
              src={`/ggpk/pathconnect${suffix}${calculatedGrid[4][9]?.isPowered ? "powered" : ""}.png`}
              className={`room-connect room-connect-${dir} r2p-conn`}
              alt=""
            />
          );
        })}
        <img
          src="/ggpk/iconatziri.png"
          className="main-icon"
          alt="Atziri's Chamber"
        />
      </div>
    </div>
  );
};
