export function getCellPosition(x: number, y: number) {
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
}
