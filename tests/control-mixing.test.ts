import { expect, it } from "vitest";
import {
  applyMixingTemplate,
  mixingWeights,
  setMixingWeights,
} from "../src/core/control-mixing";
import { surfaceCommand, surfaceDemand } from "../src/core/surface-control";
import { parseAircraft } from "../src/core/schema";
import { neutralControls } from "../src/core/simulation";
import bronco from "../aircraft/ft-bronco.json";
import trainer from "../aircraft/ft-tiny-trainer.json";

it("configures elevon mixing on another aircraft without changing its geometry or mechanics", () => {
  const a = parseAircraft(trainer),
    mixed = applyMixingTemplate(a, "left-wing", "right-wing", "elevon");
  const [left, right] = mixed.surfaces.slice(0, 2).map((s) => s.control!);
  expect(surfaceCommand(left, { ...neutralControls(), pitch: 1 })).toBe(-1);
  expect(surfaceCommand(right, { ...neutralControls(), pitch: 1 })).toBe(-1);
  expect(surfaceCommand(left, { ...neutralControls(), roll: 1 })).toBe(1);
  expect(surfaceCommand(right, { ...neutralControls(), roll: 1 })).toBe(-1);
  expect(
    surfaceCommand(left, { ...neutralControls(), roll: 1, pitch: 1 }),
  ).toBe(0);
  expect(
    surfaceDemand(right, { ...neutralControls(), roll: 1, pitch: 1 }),
  ).toBe(-2);
  expect(
    surfaceCommand(right, { ...neutralControls(), roll: 1, pitch: 1 }),
  ).toBe(-1);
  expect(mixed.parts).toEqual(a.parts);
  expect(mixed.surfaces.map(({ control, ...geometry }) => geometry)).toEqual(
    a.surfaces.map(({ control, ...geometry }) => geometry),
  );
  expect(left.linkage).toEqual(a.surfaces[0].control!.linkage);
  expect(parseAircraft(JSON.parse(JSON.stringify(mixed)))).toEqual(mixed);
});
it("supports both tail orientations and keeps unchanged axes off", () => {
  const a = parseAircraft(bronco);
  for (const type of ["a-tail", "v-tail"] as const) {
    const mixed = applyMixingTemplate(
      a,
      "left-ruddervator",
      "right-ruddervator",
      type,
    );
    const [left, right] = mixed.surfaces.slice(2).map((s) => s.control!);
    expect(surfaceCommand(left, { ...neutralControls(), pitch: 1 })).toBe(-1);
    expect(surfaceCommand(right, { ...neutralControls(), pitch: 1 })).toBe(-1);
    const l = surfaceCommand(left, { ...neutralControls(), yaw: 1 }),
      r = surfaceCommand(right, { ...neutralControls(), yaw: 1 });
    expect(l).toBe(type === "a-tail" ? 1 : -1);
    expect(l).toBe(-r);
    expect(surfaceCommand(left, { ...neutralControls(), roll: 1 })).toBe(0);
  }
});
it("canonicalizes primary-axis contributions and rejects ambiguous pairs or invalid weights", () => {
  const a = parseAircraft(bronco),
    c = a.surfaces[2].control!;
  c.mix!.pitch = 0.2;
  const weights = mixingWeights(c);
  expect(weights.pitch).toBe(-0.8);
  const before = surfaceCommand(c, {
    roll: 0.2,
    pitch: 0.4,
    yaw: 0.1,
    throttle: 0,
  });
  setMixingWeights(c, weights);
  expect(c.mix!.pitch).toBeUndefined();
  expect(
    surfaceCommand(c, { roll: 0.2, pitch: 0.4, yaw: 0.1, throttle: 0 }),
  ).toBeCloseTo(before, 12);
  expect(() => setMixingWeights(c, { roll: NaN, pitch: 0, yaw: 0 })).toThrow();
  expect(() =>
    applyMixingTemplate(a, "left-wing", "left-wing", "elevon"),
  ).toThrow(/different/);
  expect(() =>
    applyMixingTemplate(a, "right-wing", "left-wing", "elevon"),
  ).toThrow(/Left/);
});
