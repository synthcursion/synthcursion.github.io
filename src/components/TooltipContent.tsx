import type { FC } from "react";
import { processDescription, roomsData } from "src/data/constants.ts";

export const TooltipContent: FC<{ content: string | null }> = ({ content }) => {
  if (!content) return null;
  const room = roomsData[content];
  if (!room) return <div className="room-tooltip">{content}</div>;
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
