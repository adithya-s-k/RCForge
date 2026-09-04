import { it, expect } from "vitest";
import bronco from "../aircraft/ft-bronco.json";
import { parseAircraft } from "../src/core/schema";
import { surfaceCommand } from "../src/core/surface-control";
import { axisQ, rotate, add, scale, radians } from "../src/core/math";
import {
  Simulation,
  initialState,
  neutralControls,
} from "../src/core/simulation";
const a = parseAircraft(bronco),
  tails = a.surfaces.filter((s) => s.id.includes("ruddervator"));
it("joins both inverted-V panels at the apex and booms", () => {
  expect(tails).toHaveLength(2);
  const ends = tails.map((s) => {
    const span = rotate(axisQ([1, 0, 0], radians(s.rollDeg)), [0, 1, 0]);
    return [-1, 1].map((sign) =>
      add(s.positionM, scale(span, (sign * s.spanM) / 2)),
    );
  });
  expect(ends[0][1][1]).toBeCloseTo(0, 10);
  expect(ends[1][0][1]).toBeCloseTo(0, 10);
  expect(ends[0][1][2]).toBeCloseTo(-0.254 / Math.sqrt(2), 10);
  expect(ends[1][0][2]).toBeCloseTo(-0.254 / Math.sqrt(2), 10);
  expect(ends[0][0][2]).toBeCloseTo(0, 10);
  expect(ends[1][1][2]).toBeCloseTo(0, 10);
});
it("mixes symmetric pitch and differential yaw within servo travel", () => {
  const pitch = { ...neutralControls(), pitch: 0.5 },
    yaw = { ...neutralControls(), yaw: 0.5 };
  expect(tails.map((t) => surfaceCommand(t.control!, pitch))).toEqual([
    -0.5, -0.5,
  ]);
  expect(tails.map((t) => surfaceCommand(t.control!, yaw))).toEqual([
    0.5, -0.5,
  ]);
  expect(
    tails.map((t) =>
      surfaceCommand(t.control!, { ...pitch, pitch: 1, yaw: 1 }),
    ),
  ).toEqual([0, -1]);
});
it("produces yaw authority from ruddervators without motors or fins", () => {
  const b = structuredClone(a);
  b.motors = [];
  const sim = new Simulation(b),
    s = initialState(b, 12, 20, 0),
    zero = sim.forces(s, neutralControls());
  const yaw = sim.forces(s, { ...neutralControls(), yaw: 0.5 });
  expect(yaw.torque[2] - zero.torque[2]).toBeGreaterThan(0);
  const pitch = sim.forces(s, { ...neutralControls(), pitch: 0.5 });
  expect(pitch.torque[1] - zero.torque[1]).toBeGreaterThan(0);
  expect(pitch.torque[2]).toBeCloseTo(0, 8);
});
