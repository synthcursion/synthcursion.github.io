import { useAppSelector } from "src/hooks/store.ts";
import { selectCalculatedGrid } from "src/store/selectors/selectCalculatedGrid.ts";
import { selectGetHighlightType } from "src/store/selectors/selectGetHighlightType.ts";
import type { FC } from "react";

export const Highlight: FC<{ x: number; y: number }> = ({ x, y }) => {
  const calculatedGrid = useAppSelector(selectCalculatedGrid);
  const showRemovableGlow = useAppSelector(
    (state) => state.game.showRemovableGlow,
  );
  const showInvalidGlow = useAppSelector((state) => state.game.showInvalidGlow);
  const getHighlightType = useAppSelector(selectGetHighlightType);

  const cell = calculatedGrid[x]?.[y];
  return (
    getHighlightType(x, y) &&
    cell?.roomId !== "Architect" &&
    (getHighlightType(x, y) === "regular" ||
      getHighlightType(x, y) === "strong" ||
      (getHighlightType(x, y) === "deletable" && showRemovableGlow) ||
      (getHighlightType(x, y) === "invalid" && showInvalidGlow)) && (
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
    )
  );
};
