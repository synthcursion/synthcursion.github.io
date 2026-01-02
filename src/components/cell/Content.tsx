import React from "react";
import { useAppSelector } from "src/hooks/store.ts";
import { getIconPath } from "src/utils/getIconPath.tsx";
import { roomsData } from "src/data/constants.ts";
import { selectCell } from "src/store/selectors/selectCell.ts";

export const Content: React.FC<{ x: number; y: number }> = ({ x, y }) => {
  const cell = useAppSelector((state) => selectCell(state, x, y));

  return (
    <div className="cell-content">
      {cell?.type === "room" && (
        <img
          src={`/ggpk/roomgeneric${cell.isPowered ? "powered" : ""}.png`}
          className="room-generic-bg"
          alt=""
        />
      )}
      {cell ? (
        <img
          src={getIconPath(cell)}
          className="main-icon"
          alt={
            cell.type === "room" && cell.roomId
              ? `${roomsData[cell.roomId]?.Name} (T${cell.tier})`
              : cell.pathType
          }
        />
      ) : (
        <img src="/ggpk/incursion2tileempty.png" className="main-icon" alt="" />
      )}
      {cell?.roomToRoomConnections?.map((dir) => {
        const isVertical = dir === "top" || dir === "bottom";
        const suffix = isVertical ? "vertical" : "horizontal";
        return (
          <img
            key={`r2r-${dir}`}
            src={`/ggpk/roomconnectroom${suffix}${cell.isPowered ? "powered" : ""}.png`}
            className={`room-connect room-connect-${dir}`}
            alt=""
          />
        );
      })}
      {cell?.roomToPathConnections?.map((dir) => {
        const fileDir = dir === "top" ? "up" : dir === "bottom" ? "down" : dir;
        return (
          <img
            key={`r2p-${dir}`}
            src={`/ggpk/roomconnect${fileDir}${cell.isPowered ? "powered" : ""}.png`}
            className={`room-connect room-connect-${dir} r2p-conn`}
            alt=""
          />
        );
      })}
      {cell?.roomToPathPermanentConnections?.map((dir) => {
        const isVertical = dir === "top" || dir === "bottom";
        const suffix = isVertical ? "1" : "2";
        return (
          <img
            key={`r2p-perm-${dir}`}
            src={`/ggpk/pathconnect${suffix}${cell.isPowered ? "powered" : ""}.png`}
            className={`room-connect room-connect-${dir} r2p-conn`}
            alt=""
          />
        );
      })}
      {cell?.pathToPathConnections?.map((dir) => {
        const isVertical = dir === "top" || dir === "bottom";
        const suffix = isVertical ? "1" : "2";
        return (
          <img
            key={`p2p-${dir}`}
            src={`/ggpk/pathconnect${suffix}${cell.isPowered ? "powered" : ""}.png`}
            className={`room-connect room-connect-${dir} p2p-conn`}
            alt=""
          />
        );
      })}
      {cell?.pathToRoomConnections?.map((dir) => {
        const fileDir = dir === "top" ? "up" : dir === "bottom" ? "down" : dir;
        return (
          <img
            key={`p2r-${dir}`}
            src={`/ggpk/roomconnect${fileDir}${cell.isPowered ? "powered" : ""}.png`}
            className={`room-connect room-connect-${dir} p2r-conn`}
            alt=""
          />
        );
      })}
      {cell?.pathToRoomPermanentConnections?.map((dir) => {
        const isVertical = dir === "top" || dir === "bottom";
        const suffix = isVertical ? "1" : "2";
        return (
          <img
            key={`p2r-perm-${dir}`}
            src={`/ggpk/pathconnect${suffix}${cell.isPowered ? "powered" : ""}.png`}
            className={`room-connect room-connect-${dir} p2r-conn`}
            alt=""
          />
        );
      })}
    </div>
  );
};
