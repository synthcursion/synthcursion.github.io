import { useAppSelector } from "src/hooks/store.ts";
import { roomsData } from "src/data/constants.ts";
import { selectHoveredCell } from "src/store/selectors/selectHoveredCell.ts";

export function HoverInfo() {
  const hoveredCell = useAppSelector((state) => state.game.hoveredCell);
  const cell = useAppSelector(selectHoveredCell);

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
}
