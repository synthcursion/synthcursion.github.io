import { useAppDispatch, useAppSelector } from "../hooks/store";
import {
  setCopyStatus,
  setDebug,
  setGrid,
  setSelectedPathType,
  setSelectedRoomId,
  setSelectedType,
  setShowInvalidGlow,
  setShowRemovableGlow,
  setShowSidebar,
} from "../store/gameSlice";
import type { IncursionRoom, PathType } from "../types";
import data from "../data/generated/English.json";
import { selectRoomsByType } from "src/store/selectors/selectRoomsByType.ts";
import { selectHoveredCell } from "src/store/selectors/selectHoveredCell.ts";

const roomsData = data.Incursion2Rooms as Record<string, IncursionRoom>;

const GRID_SIZE = 9;
const ENTRY = { x: 4, y: 0 };

const PATH_TYPES: Record<string, string[]> = {
  path1: ["top", "bottom"],
  path2: ["left", "right"],
  pathcornerbot: ["top", "left"],
  pathcornerleft: ["top", "right"],
  pathcornerright: ["bottom", "left"],
  pathcornertop: ["bottom", "right"],
  pathfourway: ["top", "bottom", "left", "right"],
  paththreeway1: ["top", "bottom", "right"],
  paththreeway2: ["bottom", "left", "right"],
  paththreeway3: ["top", "left", "right"],
  paththreeway4: ["bottom", "left", "top"],
};

export const Sidebar = () => {
  const dispatch = useAppDispatch();
  const selectedType = useAppSelector((state) => state.game.selectedType);
  const selectedRoomId = useAppSelector((state) => state.game.selectedRoomId);
  const selectedPathType = useAppSelector(
    (state) => state.game.selectedPathType,
  );
  const hoveredCell = useAppSelector(selectHoveredCell);
  const debug = useAppSelector((state) => state.game.debug);
  const showRemovableGlow = useAppSelector(
    (state) => state.game.showRemovableGlow,
  );
  const showInvalidGlow = useAppSelector((state) => state.game.showInvalidGlow);
  const copyStatus = useAppSelector((state) => state.game.copyStatus);
  const showSidebar = useAppSelector((state) => state.game.showSidebar);
  const roomsByType = useAppSelector(selectRoomsByType);

  const hoveredRoom = hoveredCell && roomsData[hoveredCell.roomId || ""];

  const shareLayout = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      dispatch(setCopyStatus(true));
      setTimeout(() => {
        dispatch(setCopyStatus(false));
      }, 5000);
    });
  };

  if (!showSidebar) {
    return (
      <button
        className="toggle-sidebar"
        onClick={() => dispatch(setShowSidebar(!showSidebar))}
        title={showSidebar ? "Hide Sidebar" : "Show Sidebar"}
      >
        {showSidebar ? "◀" : "▶"}
      </button>
    );
  }

  return (
    <div className="sidebar">
      <div className="header">
        <h2>Temple Builder</h2>
      </div>
      <div className="options">
        <div className="room-selector-grid">
          {/* Rooms */}
          {Object.entries(roomsByType).map(([category, types]) => (
            <div key={category} className="room-category">
              <h4>{category.charAt(0).toUpperCase() + category.slice(1)}</h4>
              {Object.entries(types).map(([subCategory, rooms]) => (
                <div key={subCategory} className="room-subcategory">
                  <div className="room-grid">
                    {rooms.map((r) => {
                      const roomInfo = r.Levels.find(Boolean);

                      const iconDDS = roomInfo?.Icon_DDSFile || r.Icon_DDSFile;
                      const iconName = iconDDS
                        .split("/")
                        .pop()
                        ?.replace(".dds", ".png")
                        .toLowerCase();
                      const iconUrl = iconName
                        ? `/ggpk/${iconName}`
                        : "/ggpk/roomgeneric.png";
                      return (
                        <div
                          key={r.Id}
                          className={`room-item ${
                            selectedType === "room" && selectedRoomId === r.Id
                              ? "selected"
                              : ""
                          } ${
                            hoveredRoom &&
                            (r.UpgradedBy.includes(hoveredRoom.Id) ||
                              hoveredRoom.UpgradedBy.includes(r.Id) ||
                              r.ConvertedBy.includes(hoveredRoom.Id) ||
                              hoveredRoom.ConvertedBy.includes(r.Id))
                              ? "affects-hovered"
                              : ""
                          }`}
                          onClick={() => {
                            dispatch(setSelectedType("room"));
                            dispatch(setSelectedRoomId(r.Id));
                          }}
                          data-tooltip-id="room-tooltip"
                          data-tooltip-content={r.Id}
                          title={r.Name}
                        >
                          <img src={iconUrl} alt={r.Name} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}

          {/* Paths */}
          <div className="room-category">
            <h4>Paths</h4>
            <div className="room-grid">
              {Object.keys(PATH_TYPES).map((pt) => (
                <div
                  key={pt}
                  className={`room-item ${selectedType === "path" && selectedPathType === pt ? "selected" : ""}`}
                  onClick={() => {
                    dispatch(setSelectedType("path"));
                    dispatch(setSelectedPathType(pt as PathType));
                  }}
                  data-tooltip-id="room-tooltip"
                  data-tooltip-content={pt}
                  title={pt}
                >
                  <img src={`/ggpk/${pt}.png`} alt={pt} />
                </div>
              ))}
            </div>
          </div>

          <div className="room-category">
            <h4>Other</h4>
            <div className="room-grid">
              {[
                {
                  id: "medallion_levelup",
                  title:
                    "Quipolatl's Medallion (Use to increase the Tier of a Room (up to a maximum of 3))",
                  icon: "incursion2tileglowmedallionlevelup.png",
                },
                {
                  id: "medallion_lock",
                  title:
                    "Juatalotli's Medallion (Use to prevent the next Destabilisation of a Room)",
                  icon: "incursion2tileglowmedallionlock.png",
                },
              ].map((m) => (
                <div
                  key={m.id}
                  className={`room-item ${selectedType === "medallion" && selectedRoomId === m.id ? "selected" : ""}`}
                  onClick={() => {
                    dispatch(setSelectedType("medallion"));
                    dispatch(setSelectedRoomId(m.id));
                  }}
                  data-tooltip-id="room-tooltip"
                  data-tooltip-content={m.title}
                  title={m.title}
                >
                  <img src={`/ggpk/${m.icon}`} alt={m.title} />
                </div>
              ))}
              <div
                className={`room-item ${selectedType === "empty" ? "selected" : ""}`}
                onClick={() => dispatch(setSelectedType("empty"))}
                data-tooltip-id="room-tooltip"
                data-tooltip-content="Eraser"
                title="Eraser"
              >
                <img src="/ggpk/incursion2tileempty.png" alt="Eraser" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="actions">
        <label className="debug-checkbox">
          <input
            type="checkbox"
            checked={debug}
            onChange={(e) => dispatch(setDebug(e.target.checked))}
          />
          ignore placement restrictions
        </label>
        <label className="debug-checkbox">
          <input
            type="checkbox"
            checked={showRemovableGlow}
            onChange={(e) => dispatch(setShowRemovableGlow(e.target.checked))}
          />
          highlight removable rooms
        </label>
        <label className="debug-checkbox">
          <input
            type="checkbox"
            checked={showInvalidGlow}
            onChange={(e) => dispatch(setShowInvalidGlow(e.target.checked))}
          />
          highlight invalid rooms
        </label>
        <button onClick={shareLayout}>
          {copyStatus ? "Link copied" : "Share Link"}
        </button>
        <button
          onClick={() =>
            dispatch(
              setGrid(
                Array(GRID_SIZE)
                  .fill(null)
                  .map((_, x) =>
                    Array(GRID_SIZE)
                      .fill(null)
                      .map((_, y) => {
                        if (x === ENTRY.x && y === ENTRY.y) {
                          return { type: "path", pathType: "pathfourway" };
                        }
                        return null;
                      }),
                  ),
              ),
            )
          }
        >
          Clear Grid
        </button>
      </div>
    </div>
  );
};
