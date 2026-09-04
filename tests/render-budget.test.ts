import { expect, it } from "vitest";
import { renderBudget, renderPixelRatio } from "../src/view/render-budget";

it.each([
  [390, 844, 3],
  [1366, 912, 2],
  [1920, 1080, 2],
  [3840, 2160, 2],
])("bounds the drawing buffer on a %i × %i display", (width, height, dpr) => {
  const ratio = renderPixelRatio(width, height, dpr);
  expect(ratio).toBeGreaterThan(0);
  expect(ratio).toBeLessThanOrEqual(dpr);
  expect(ratio).toBeLessThanOrEqual(renderBudget.maxPixelRatio);
  expect(width * height * ratio ** 2).toBeLessThanOrEqual(
    renderBudget.maxPixels + 1,
  );
});

it("does not supersample a standard-density laptop screen", () => {
  expect(renderPixelRatio(1366, 768, 1)).toBe(1);
});
