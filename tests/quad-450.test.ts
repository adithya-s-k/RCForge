import { expect, it } from "vitest";
import source from "../aircraft/quad-x-450.json";
import { parseAircraft } from "../src/core/schema";
import { massProperties } from "../src/core/aircraft";
import { findTrim } from "../src/core/trim";
import {
  Simulation,
  calmEnvironment,
  neutralControls,
} from "../src/core/simulation";
import { launchState } from "../src/core/launch";
import { rotorCommands } from "../src/core/multirotor";
import { runExperiment, replayRecording } from "../src/core/experiment";
import { euler } from "../src/core/math";
const a = parseAircraft(source);
it("accounts for the complete utility quad and manufacturer reference without double counting", () => {
  const p = massProperties(a);
  expect(p.mass).toBeCloseTo(1.007, 10);
  expect(p.cg[0]).toBeCloseTo(0, 12);
  expect(p.cg[1]).toBeCloseTo(0, 12);
  expect(
    a.parts
      .filter((p) => p.kind === "body" || p.kind === "boom")
      .reduce((n, p) => n + p.massKg, 0),
  ).toBeCloseTo(0.282, 10);
  expect(a.motors[0].performance!.points.at(-1)!.thrustN).toBeCloseTo(
    0.64 * 9.80665,
    10,
  );
  expect(a.motors[0].performance!.points.at(-1)!.currentA).toBe(9.5);
  expect(a.provenance.commandMapping.status).toBe("estimated");
});
it("lifts from the ground and remains controllable as the battery discharges", () => {
  const trim = findTrim(a);
  expect(trim.converged).toBe(true);
  const sim = new Simulation(a, calmEnvironment(), launchState(a, "ground"));
  for (let i = 0; i < 360; i++)
    sim.step({ ...neutralControls(), throttle: 0.65 });
  expect(sim.state.status).toBe("flying");
  expect(-sim.state.position[2]).toBeGreaterThan(3);
  expect(sim.state.batterySoc).toBeLessThan(a.battery!.initialSoc);
  for (const [ch, axis] of [
    ["roll", 0],
    ["pitch", 1],
    ["yaw", 2],
  ] as const) {
    const s = structuredClone(trim.state),
      c = { ...trim.controls, [ch]: 0.2 };
    s.motors = rotorCommands(a, s, c);
    expect(sim.forces(s, c).torque[axis]).toBeGreaterThan(0);
  }
});
it("recovers level attitude after angle-mode input and exactly replays its electrical state", () => {
  const r = runExperiment(a, calmEnvironment(), "roll-pulse", 10);
  expect(r.finalState.status).toBe("flying");
  expect(Math.abs(euler(r.finalState.orientation)[0])).toBeLessThan(0.001);
  expect(Math.hypot(...r.finalState.omega)).toBeLessThan(0.001);
  expect(replayRecording(r.recording)).toEqual(r.finalState);
});
it("rejects missing or double-counted motor references and invalid blade counts", () => {
  const b = structuredClone(a);
  b.motors[0].partId = "battery";
  expect(() => parseAircraft(b)).toThrow(/motor mass component/);
  b.motors[0].partId = b.motors[1].partId;
  expect(() => parseAircraft(b)).toThrow(/cannot represent two/);
  b.motors[0].partId = a.motors[0].partId;
  b.motors[0].propBlades = 2.5;
  expect(() => parseAircraft(b)).toThrow();
});
