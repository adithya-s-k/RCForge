import { it, expect } from "vitest";
import bronco from "../aircraft/ft-bronco.json";
import { parseAircraft } from "../src/core/schema";
import { fitLandingGear, launchState } from "../src/core/launch";
import { placedLaunch } from "../src/core/placement";
import { rotate, length } from "../src/core/math";
const a = parseAircraft(bronco),
  p = { northM: 42, eastM: -17, altitudeM: 25, headingDeg: 90 };
it("places and rotates launch velocity and orientation together", () => {
  const s = placedLaunch(a, "airborne", p),
    base = launchState(a, "airborne");
  expect(s.position).toEqual([42, -17, -25]);
  expect(s.velocity[0]).toBeCloseTo(0, 8);
  expect(s.velocity[1]).toBeCloseTo(base.velocity[0], 8);
  expect(length(s.velocity)).toBeCloseTo(length(base.velocity), 10);
  const forward = rotate(s.orientation, [1, 0, 0]);
  expect(forward[0]).toBeCloseTo(0, 8);
  expect(forward[1]).toBeGreaterThan(0.99);
});
it("ground height remains contact clearance regardless of requested altitude", () => {
  const gear = fitLandingGear(a);
  expect(placedLaunch(gear, "ground", p).position[2]).toBe(
    launchState(gear, "ground").position[2],
  );
  expect(placedLaunch(gear, "ground", p).velocity).toEqual([0, 0, 0]);
});
it("retains defaults and rejects invalid coordinates", () => {
  expect(placedLaunch(a, "hand", null)).toEqual(launchState(a, "hand"));
  expect(() => placedLaunch(a, "airborne", { ...p, northM: NaN })).toThrow();
  expect(() => placedLaunch(a, "airborne", { ...p, altitudeM: -1 })).toThrow();
  expect(() => placedLaunch(a, "airborne", { ...p, eastM: 2001 })).toThrow();
});
