/** Visual budgets only. Physics retains its independent 120 Hz step. */
export const renderBudget = {
  maxPixelRatio: 1.25,
  maxPixels: 2_100_000,
  shadowSize: 1024,
  terrainSegments: 128,
  grassTufts: 2400,
  dryGrassTufts: 600,
  grassBlades: 3,
  idleFramesPerSecond: 30,
} as const;

export function renderPixelRatio(
  width: number,
  height: number,
  deviceRatio: number,
) {
  return Math.min(
    deviceRatio,
    renderBudget.maxPixelRatio,
    Math.sqrt(renderBudget.maxPixels / Math.max(1, width * height)),
  );
}
