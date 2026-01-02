import { useAppSelector } from "src/hooks/store.ts";
import { selectHighlightType } from "src/store/selectors/selectHighlightType.ts";
import type { FC } from "react";
import { selectCell } from "src/store/selectors/selectCell.ts";

export const Highlight: FC<{ x: number; y: number }> = ({ x, y }) => {
  const cell = useAppSelector((state) => selectCell(state, x, y));
  const showRemovableGlow = useAppSelector(
    (state) => state.game.showRemovableGlow,
  );
  const showInvalidGlow = useAppSelector((state) => state.game.showInvalidGlow);
  const highlightType = useAppSelector((state) =>
    selectHighlightType(state, x, y),
  );

  if (!highlightType || cell?.roomId === "Architect") return null;
  if (highlightType === "deletable" && !showRemovableGlow) return null;
  if (highlightType === "invalid" && !showInvalidGlow) return null;
  return (
    <img
      src={
        highlightType === "strong"
          ? "/ggpk/incursion2tileglowstrong.png"
          : highlightType === "deletable" || highlightType === "invalid"
            ? "/ggpk/incursion2tileglowred.png"
            : "/ggpk/incursion2tileglowregular.png"
      }
      className={`placement-glow ${highlightType === "invalid" ? "invalid-glow" : ""}`}
      alt=""
    />
  );
};
