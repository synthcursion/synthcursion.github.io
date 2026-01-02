import { Tooltip } from "react-tooltip";
import "./App.css";
import type { Direction, GridCell, IncursionRoom } from "./types";
import { useAppDispatch, useAppSelector } from "./hooks/store";
import {
  handleCellClick,
  setHoveredCell,
  setShowSidebar,
  setShowTotalStats,
} from "./store/gameSlice";
import { Sidebar } from "./components/Sidebar";
import "./index.css";
import {
  ENTRY,
  getConnectionsFromPathType,
  GRID_SIZE,
  processDescription,
  roomsData,
} from "./utils/gameUtils";
import { selectRoomsByType } from "src/store/selectors/selectRoomsByType.ts";
import { selectCalculatedGrid } from "src/store/selectors/selectCalculatedGrid.ts";
import { selectTotalStats } from "src/store/selectors/selectTotalStats.ts";
import { selectGetHighlightType } from "src/store/selectors/selectGetHighlightType.ts";
import { selectIsPlaceableAt } from "src/store/selectors/selectIsPlaceableAt.ts";
import { selectIsDeletable } from "src/store/selectors/selectIsDeletable.ts";
import {
  getRoomToRoomConnections,
  getRoomToPathConnections,
  isReachableFromEntry,
} from "src/store/selectors/selectReachableCells.ts";

export function App() {
  const dispatch = useAppDispatch();
  const grid = useAppSelector((state) => state.game.grid);
  const selectedType = useAppSelector((state) => state.game.selectedType);
  const selectedRoomId = useAppSelector((state) => state.game.selectedRoomId);
  const selectedPathType = useAppSelector(
    (state) => state.game.selectedPathType,
  );
  const hoveredCell = useAppSelector((state) => state.game.hoveredCell);
  const debug = useAppSelector((state) => state.game.debug);
  const showSidebar = useAppSelector((state) => state.game.showSidebar);
  const showTotalStats = useAppSelector((state) => state.game.showTotalStats);
  const showRemovableGlow = useAppSelector(
    (state) => state.game.showRemovableGlow,
  );
  const showInvalidGlow = useAppSelector((state) => state.game.showInvalidGlow);

  const roomsByType = useAppSelector(selectRoomsByType);

  const calculatedGrid = useAppSelector(selectCalculatedGrid);

  const totalStats = useAppSelector(selectTotalStats);
  const getHighlightType = useAppSelector(selectGetHighlightType);
  const isPlaceableAt = useAppSelector(selectIsPlaceableAt);
  const isDeletable = useAppSelector(selectIsDeletable);

  const getIconPath = (cell: GridCell) => {
    if (cell.type === "room") {
      const room = roomsData[cell.roomId!];
      if (!room) return "/ggpk/roomgeneric.png";

      // Try to find the specific tier first
      const roomInfo = room.Levels[cell.tier!] ?? room.MaxLevel;

      if (roomInfo && roomInfo.Icon_DDSFile) {
        const fileName = roomInfo.Icon_DDSFile.split("/")
          .pop()
          ?.replace(".dds", ".png")
          .toLowerCase();
        return `/ggpk/${fileName}`;
      }
      return "/ggpk/roomgeneric.png";
    } else if (cell.type === "path") {
      return `/ggpk/${cell.pathType}${cell.isPowered ? "powered" : ""}.png`;
    }
    return "/ggpk/incursion2tileempty.png";
  };

  const getCellPosition = (x: number, y: number) => {
    // x increases -> moves Down-Right (label: Right)
    // x decreases -> moves Up-Left (label: Left)
    // y increases -> moves Up-Right (label: Top)
    // y decreases -> moves Down-Left (label: Bottom)
    const centerX = 1425;
    const centerY = 738;
    const width = 1240;
    const height = 1016;

    return {
      left: `${centerX + (x + y - 8) * (width / 16)}px`,
      top: `${centerY + (x - y) * (height / 16)}px`,
      width: `${width / 8}px`,
      height: `${height / 8}px`,
    };
  };

  const getHoverInfo = () => {
    if (!hoveredCell) return null;
    const { x, y } = hoveredCell;

    if (x === 4 && y === 9) {
      const atziriRoom = roomsData["Atziri"];
      return (
        <div className="hover-info">
          <div className="hover-header">Cell (4, 9)</div>
          <div className="hover-room-name">
            {atziriRoom?.Name || "Atziri's Chamber"}
          </div>
          <div className="hover-section">
            <div className="section-title">Description:</div>
            <div className="hover-description">
              The final chamber of the Queen.
            </div>
          </div>
        </div>
      );
    }

    const cell = calculatedGrid[x][y];
    return (
      <div className="hover-info">
        <div className="hover-header">
          Cell ({x}, {y})
        </div>
        {cell && cell.type === "room" && cell.roomId && (
          <>
            <div className="hover-room-name">
              {roomsData[cell.roomId]?.Name} (T
              {cell.tier})
            </div>
            {cell.upgradedByRooms && cell.upgradedByRooms.length > 0 && (
              <div className="hover-section">
                <div className="section-title">Upgraded By:</div>
                <ul>
                  {cell.upgradedByRooms.map((name, i) => (
                    <li key={i}>{name}</li>
                  ))}
                  {cell.medallionType && (
                    <li>
                      {cell.medallionType === "medallion_lock"
                        ? "Juatalotli's Medallion (Lock)"
                        : "Quipolatl's Medallion (+1)"}
                    </li>
                  )}
                </ul>
              </div>
            )}
            {cell.isPowered &&
              cell.poweredByGenerators &&
              cell.poweredByGenerators.length > 0 && (
                <div className="hover-section">
                  <div className="section-title">Powered By:</div>
                  <ul>
                    {cell.poweredByGenerators.map((gen, i) => (
                      <li key={i}>
                        Generator at ({gen.x}, {gen.y}) [T{gen.tier}] (Dist:{" "}
                        {gen.distance})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
          </>
        )}
        {cell && cell.type === "path" && (
          <>
            <div className="hover-room-name">Path: {cell.pathType}</div>
            {cell.isPowered &&
              cell.poweredByGenerators &&
              cell.poweredByGenerators.length > 0 && (
                <div className="hover-section">
                  <div className="section-title">Powered By:</div>
                  <ul>
                    {cell.poweredByGenerators.map((gen, i) => (
                      <li key={i}>
                        Generator at ({gen.x}, {gen.y}) [T{gen.tier}] (Dist:{" "}
                        {gen.distance})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
          </>
        )}
        {!cell && <div className="hover-empty">Empty Cell</div>}
      </div>
    );
  };

  const renderRoomTooltip = (room: IncursionRoom) => {
    const upgradesRooms = Object.values(roomsData).filter((r) =>
      r.UpgradedBy.includes(room.Id),
    );
    const convertsRooms = Object.values(roomsData).filter((r) =>
      r.ConvertedBy.includes(room.Id),
    );

    return (
      <div className="room-tooltip">
        <div className="tooltip-title">{room.Name}</div>
        {room.UpgradedBy.length > 0 && (
          <div className="tooltip-section">
            <span className="tooltip-label">Upgraded By:</span>{" "}
            {room.UpgradedBy.map((id) => roomsData[id]?.Name || id).join(", ")}
          </div>
        )}
        {upgradesRooms.length > 0 && (
          <div className="tooltip-section">
            <span className="tooltip-label">Upgrades:</span>{" "}
            {upgradesRooms.map((r) => r.Name).join(", ")}
          </div>
        )}
        {room.ConvertedBy.length > 0 && (
          <div className="tooltip-section">
            <span className="tooltip-label">
              Converted to ${room.ConvertedTo} By:
            </span>{" "}
            {room.ConvertedBy.map((id) => roomsData[id]?.Name || id).join(", ")}
          </div>
        )}
        {convertsRooms.length > 0 && (
          <div className="tooltip-section">
            <span className="tooltip-label">Converts:</span>{" "}
            {convertsRooms.map(({ Name }) => Name).join(", ")}
          </div>
        )}

        <div className="tooltip-levels">
          {room.Levels.filter(Boolean).map((lvl) => (
            <div key={lvl.Level} className="tooltip-level-info">
              {room.MaxLevel > 1 && (
                <div className="tooltip-level-header">
                  Tier {lvl.Level}: {lvl.Name}
                </div>
              )}
              <div className="tooltip-description">
                {processDescription(lvl.Description)}
              </div>
              {lvl.Description2 && (
                <div className="tooltip-description">
                  {processDescription(lvl.Description2)}
                </div>
              )}
              {lvl.ModStats && lvl.ModStats.length > 0 && (
                <ul className="tooltip-stats">
                  {lvl.ModStats.map((stat, i) => (
                    <li key={stat}>
                      {stat}: +{lvl.ModValues[i]}%
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={`app-container ${!showSidebar ? "sidebar-hidden" : ""}`}>
      <button
        className="toggle-sidebar"
        onClick={() => dispatch(setShowSidebar(!showSidebar))}
        title={showSidebar ? "Hide Sidebar" : "Show Sidebar"}
      >
        {showSidebar ? "◀" : "▶"}
      </button>

      {showTotalStats &&
        (Object.keys(totalStats.mods).length > 0 ||
          Object.keys(totalStats.descriptions).length > 0) && (
          <div className="total-stats">
            <div className="close-stats-container">
              <button
                className="close-stats"
                onClick={() => dispatch(setShowTotalStats(false))}
              >
                Hide stats
              </button>
            </div>
            <ul>
              {Object.entries(totalStats.mods).map(([stat, value]) => (
                <li key={stat}>
                  <span>{stat}</span>
                  <span>{value > 0 ? `+${value}` : value}%</span>
                </li>
              ))}
              {Object.entries(totalStats.descriptions).map(([desc, count]) => (
                <li key={desc}>
                  <span>{desc}</span>
                  <span>x{count}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

      {!showTotalStats &&
        (Object.keys(totalStats.mods).length > 0 ||
          Object.keys(totalStats.descriptions).length > 0) && (
          <button
            className="show-stats-btn"
            onClick={() => dispatch(setShowTotalStats(true))}
            title="Show Total Stats"
          >
            Show Stats
          </button>
        )}

      <Sidebar roomsByType={roomsByType} calculatedGrid={calculatedGrid} />

      <Tooltip
        id="room-tooltip"
        place="right"
        className="custom-tooltip"
        render={({ content }) => {
          if (!content) return null;
          const room = roomsData[content];
          if (room) return renderRoomTooltip(room);
          return <div className="room-tooltip">{content}</div>;
        }}
      />

      <div className="grid-container">
        {getHoverInfo()}
        <div className="grid-background">
          <div className="grid">
            {calculatedGrid.map((row, x) =>
              row.map((cell, y) => (
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
                  {getHighlightType(x, y) &&
                    cell?.roomId !== "Architect" &&
                    (getHighlightType(x, y) === "regular" ||
                      getHighlightType(x, y) === "strong" ||
                      (getHighlightType(x, y) === "deletable" &&
                        showRemovableGlow) ||
                      (getHighlightType(x, y) === "invalid" &&
                        showInvalidGlow)) && (
                      <img
                        src={
                          getHighlightType(x, y) === "strong"
                            ? "/ggpk/incursion2tileglowstrong.png"
                            : getHighlightType(x, y) === "deletable" ||
                                getHighlightType(x, y) === "invalid"
                              ? "/ggpk/incursion2tileglowred.png"
                              : "/ggpk/incursion2tileglowregular.png"
                        }
                        className={`placement-glow ${getHighlightType(x, y) === "invalid" ? "invalid-glow" : ""}`}
                        alt=""
                      />
                    )}
                  {hoveredCell?.x === x && hoveredCell?.y === y && (
                    <img
                      src="/ggpk/incursion2tileglowframe.png"
                      className="hover-glow"
                      alt=""
                    />
                  )}
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
                      <img
                        src="/ggpk/incursion2tileempty.png"
                        className="main-icon"
                        alt=""
                      />
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
                      const fileDir =
                        dir === "top" ? "up" : dir === "bottom" ? "down" : dir;
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
                      const fileDir =
                        dir === "top" ? "up" : dir === "bottom" ? "down" : dir;
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
              )),
            )}
            {/* Atziri's Chamber at fixed location (4, 9) */}
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
                {calculatedGrid[4][9]?.roomToPathPermanentConnections?.map(
                  (dir) => {
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
                  },
                )}
                <img
                  src="/ggpk/iconatziri.png"
                  className="main-icon"
                  alt="Atziri's Chamber"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
