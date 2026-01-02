import { Tooltip } from "react-tooltip";
import "./App.css";
import { useAppSelector } from "./hooks/store";
import { Sidebar } from "./components/Sidebar";
import "./index.css";
import { RANGE } from "src/data/constants.ts";
import { HoverInfo } from "src/components/HoverInfo.tsx";
import { AtziriRoom } from "src/components/cell/AtziriRoom.tsx";
import { Cell } from "src/components/cell/Cell.tsx";
import { TooltipContent } from "src/components/TooltipContent.tsx";
import { TotalStats } from "src/components/TotalStats.tsx";

export function App() {
  const showSidebar = useAppSelector((state) => state.game.showSidebar);

  return (
    <div className={`app-container ${!showSidebar ? "sidebar-hidden" : ""}`}>
      <Sidebar />
      <TotalStats />
      <Tooltip
        id="room-tooltip"
        place="right"
        className="custom-tooltip"
        render={({ content }) => <TooltipContent content={content} />}
      />

      <div className="grid-container">
        <HoverInfo />
        <div className="grid-background">
          <div className="grid">
            {RANGE.map((x) =>
              RANGE.map((y) => <Cell x={x} y={y} key={`${x}-${y}`} />),
            )}
            <AtziriRoom />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
