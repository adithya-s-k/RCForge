import { it, expect } from "vitest";
import { defaultProfile } from "../src/input/controls";
import { assignAxis, movedAxis } from "../src/input/mapping";
it("swaps occupied assignments and retains physical axis calibration", () => {
  const p = defaultProfile();
  p.bindings.yaw.min = -0.8;
  const original = structuredClone(p);
  assignAxis(p, "roll", 2);
  expect(p.bindings.roll).toEqual(original.bindings.yaw);
  expect(p.bindings.yaw).toEqual(original.bindings.roll);
  expect(new Set(Object.values(p.bindings).map((b) => b.axis)).size).toBe(4);
});
it("ignores small noise and ambiguous simultaneous motion", () => {
  expect(movedAxis([0, 0, 0], [0.1, 0.05, 0])).toBeNull();
  expect(movedAxis([0, 0, 0], [0.7, 0.68, 0])).toBeNull();
  expect(movedAxis([0, 0.2, 0], [0, -0.7, 0])).toBe(1);
});
it("unassigned axes reset endpoint calibration", () => {
  const p = defaultProfile();
  p.bindings.roll.min = -0.6;
  assignAxis(p, "roll", 5);
  expect(p.bindings.roll.axis).toBe(5);
  expect(p.bindings.roll.min).toBe(-1);
  expect(() => assignAxis(p, "pitch", -1)).toThrow();
});
