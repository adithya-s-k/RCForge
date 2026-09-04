import { expect, it } from "vitest";
import { attitude, mapRadius } from "../src/view/flight-navigation";
import { axisQ, radians } from "../src/core/math";
it("shows NED heading and independent bank/pitch without confusing yaw with course", () => {
  expect(attitude([0, 0, 0, 1])).toEqual({ roll: 0, pitch: 0, heading: 0 });
  expect(attitude(axisQ([0, 0, 1], radians(90))).heading).toBeCloseTo(90);
  expect(attitude(axisQ([0, 0, 1], radians(-90))).heading).toBeCloseTo(270);
  expect(attitude(axisQ([1, 0, 0], radians(30))).roll).toBeCloseTo(30);
  expect(attitude(axisQ([0, 1, 0], radians(20))).pitch).toBeCloseTo(20);
});
it("keeps the pilot, aircraft and entire runway within map bounds after relocating", () => {
  for (const pilot of [
    { x: -8, z: -14 },
    { x: 1400, z: 3000 },
    { x: -3000, z: 50 },
  ]) {
    const p: [number, number, number] = [2500, -1900, -30],
      r = mapRadius(p, pilot);
    expect(Math.abs(p[1] - pilot.z)).toBeLessThan(r);
    for (const north of [p[0], -37, 133])
      expect(Math.abs(north - pilot.x)).toBeLessThan(r * 0.68);
    expect(Math.abs(pilot.z)).toBeLessThan(r);
  }
});
