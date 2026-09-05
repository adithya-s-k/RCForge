import { it, expect } from "vitest";
import quad from "../aircraft/quad-x-5inch.json";
import { parseAircraft } from "../src/core/schema";
import { findTrim } from "../src/core/trim";
import {
  Simulation,
  neutralControls,
  calmEnvironment,
} from "../src/core/simulation";
import { launchState } from "../src/core/launch";
import { rotorCommands } from "../src/core/multirotor";
import { runExperiment, replayRecording } from "../src/core/experiment";
const a = parseAircraft(quad);
it("balances hover at constant supply voltage for ten seconds", () => {
  const constantSupply = structuredClone(a);
  constantSupply.battery!.voltageCurve.forEach((p) => (p.voltsPerCell = 3.9));
  const trim = findTrim(constantSupply);
  expect(trim.converged).toBe(true);
  const sim = new Simulation(constantSupply, calmEnvironment(), trim.state);
  for (let i = 0; i < 1200; i++) sim.step(trim.controls);
  expect(sim.state.position[2]).toBeCloseTo(-3, 5);
  expect(Math.hypot(...sim.state.omega)).toBeLessThan(1e-6);
});
it("produces correctly signed roll, pitch and yaw torque from mixed rotors", () => {
  const trim = findTrim(a),
    sim = new Simulation(a);
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
it("takes off vertically from its landing feet", () => {
  const sim = new Simulation(a, calmEnvironment(), launchState(a, "ground"));
  for (let i = 0; i < 240; i++)
    sim.step({ ...neutralControls(), throttle: 0.3 });
  expect(sim.state.status).toBe("flying");
  expect(-sim.state.position[2]).toBeGreaterThan(1);
});
it("cuts all motors at zero throttle", () => {
  const s = findTrim(a).state;
  s.omega = [1, 1, 1];
  expect(
    rotorCommands(a, s, { roll: 1, pitch: 1, yaw: 1, throttle: 0 }),
  ).toEqual([0, 0, 0, 0]);
});
it("replays controlled quad maneuvers exactly", () => {
  const r = runExperiment(a, calmEnvironment(), "roll-pulse", 5);
  expect(replayRecording(r.recording)).toEqual(r.finalState);
  expect(r.finalState.status).toBe("flying");
});
it("rejects unsupported layouts and missing controller parameters", () => {
  expect(() => parseAircraft({ ...quad, multirotor: undefined })).toThrow();
  const b = structuredClone(quad);
  b.motors[0].positionM[0] = 0;
  expect(() => parseAircraft(b)).toThrow();
});
