import { useAppDispatch, useAppSelector } from "src/hooks/store.ts";
import { selectTotalStats } from "src/store/selectors/selectTotalStats.ts";
import { setShowTotalStats } from "src/store/gameSlice.ts";

export function TotalStats() {
  const dispatch = useAppDispatch();
  const showTotalStats = useAppSelector((state) => state.game.showTotalStats);
  const totalStats = useAppSelector(selectTotalStats);

  if (showTotalStats)
    return (
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
      )
    );
  else
    return (
      (Object.keys(totalStats.mods).length > 0 ||
        Object.keys(totalStats.descriptions).length > 0) && (
        <button
          className="show-stats-btn"
          onClick={() => dispatch(setShowTotalStats(true))}
          title="Show Total Stats"
        >
          Show Stats
        </button>
      )
    );
}