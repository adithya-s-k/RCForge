import { describe, it, expect } from "vitest";
import bronco from "../aircraft/ft-bronco.json";
import trainer from "../aircraft/simple-trainer.json";
import { parseAircraft } from "../src/core/schema";
import {
  massProperties,
  modifyAircraft,
  defaultChanges,
} from "../src/core/aircraft";
import {
  Simulation,
  initialState,
  calmEnvironment,
  neutralControls,
  FIXED_DT,
  GRAVITY,
} from "../src/core/simulation";
import { findTrim } from "../src/core/trim";
import {
  runExperiment,
  replayRecording,
  parseRecording,
} from "../src/core/experiment";
import {
  axisQ,
  rotate,
  inverseQ,
  matVec,
  invert,
  sub,
  length,
  radians,
} from "../src/core/math";
const a = parseAircraft(bronco);
describe("aircraft definitions and physical properties", () => {
  it("rejects invalid dimensions with a component path", () => {
    const bad = structuredClone(bronco);
    bad.surfaces[0].spanM = -1;
    expect(() => parseAircraft(bad)).toThrow(/surfaces/);
  });
  it("rejects duplicate surface names", () => {
    const bad = structuredClone(bronco);
    bad.surfaces[1].id = bad.surfaces[0].id;
    expect(() => parseAircraft(bad)).toThrow(/Duplicate/);
  });
  it("rejects unexpected fields and nonfinite data", () => {
    expect(() => parseAircraft({ ...bronco, unknown: true })).toThrow();
    const bad = structuredClone(bronco);
    bad.parts[0].massKg = NaN;
    expect(() => parseAircraft(bad)).toThrow();
  });
  it("sums the published reference all-up mass and preserves lateral symmetry", () => {
    const p = massProperties(a);
    expect(p.mass).toBeCloseTo(0.83, 9);
    expect(p.cg[1]).toBeCloseTo(0, 9);
    expect(p.inertia[0][1]).toBeCloseTo(0, 9);
  });
  it("moves CG by battery mass fraction and changes pitch inertia", () => {
    const p = massProperties(a),
      m = modifyAircraft(a, { ...defaultChanges, batteryShiftM: 0.08 }),
      q = massProperties(m);
    expect(q.cg[0] - p.cg[0]).toBeCloseTo((0.19 * 0.08) / 0.83, 9);
    expect(q.inertia[1][1]).toBeGreaterThan(p.inertia[1][1]);
    expect(a.parts.find((p) => p.kind === "battery")?.positionM[0]).toBe(
      bronco.parts.find((p) => p.kind === "battery")!.positionM[0],
    );
  });
  it("scales visible wing mass and aerodynamic area together", () => {
    const m = modifyAircraft(a, { ...defaultChanges, spanScale: 1.2 });
    expect(m.surfaces[0].spanM / a.surfaces[0].spanM).toBeCloseTo(1.2);
    expect(m.parts[0].sizeM[1] / a.parts[0].sizeM[1]).toBeCloseTo(1.2);
    expect(m.parts[0].massKg / a.parts[0].massKg).toBeCloseTo(1.2);
  });
  it("scales uncontrolled wings and linked ground contacts by their role", () => {
    const base = structuredClone(a);
    delete base.surfaces[0].control;
    const modified = modifyAircraft(base, {
      ...defaultChanges,
      spanScale: 1.3,
    });
    expect(modified.surfaces[0].spanM / base.surfaces[0].spanM).toBeCloseTo(
      1.3,
    );
    const tip = base.contactPoints.findIndex((p) => p.spanLinked);
    expect(
      modified.contactPoints[tip].positionM[1] /
        base.contactPoints[tip].positionM[1],
    ).toBeCloseTo(1.3);
  });
  it("reconstructs a vector through the inertia tensor inverse", () => {
    const p = massProperties(a);
    expect(
      length(
        sub(matVec(invert(p.inertia), matVec(p.inertia, [1, 2, 3])), [1, 2, 3]),
      ),
    ).toBeLessThan(1e-10);
  });
  it("quaternion rotation and inverse agree", () => {
    const q = axisQ([1, 2, 3], 0.7);
    expect(
      length(sub(rotate(inverseQ(q), rotate(q, [4, 2, -1])), [4, 2, -1])),
    ).toBeLessThan(1e-10);
  });
});
describe("flight dynamics", () => {
  it("accelerates under gravity from rest", () => {
    const s = new Simulation(a, calmEnvironment(), initialState(a, 0, 100, 0));
    s.step(neutralControls());
    expect(s.state.velocity[2]).toBeCloseTo(GRAVITY * FIXED_DT, 3);
  });
  it("produces upward lift in forward airflow", () => {
    const sim = new Simulation(a);
    const f = sim.forces(initialState(a, 12, 100, 0), neutralControls());
    expect(f.force[2]).toBeLessThan(0);
    expect(f.torque[0]).toBeCloseTo(0, 8);
    expect(f.torque[2]).toBeCloseTo(0, 8);
  });
  it("positive pitch, roll and yaw commands generate correctly signed torques", () => {
    const sim = new Simulation(a),
      s = initialState(a, 12, 100, 0),
      zero = sim.forces(s, neutralControls()).torque;
    for (const [channel, index] of [
      ["roll", 0],
      ["pitch", 1],
      ["yaw", 2],
    ] as const) {
      const f = sim.forces(s, { ...neutralControls(), [channel]: 0.5 });
      expect(f.torque[index] - zero[index]).toBeGreaterThan(0);
    }
  });
  it("opposes an angular perturbation", () => {
    const sim = new Simulation(a),
      s = initialState(a, 12, 100, 0);
    const baseline = sim.forces(s, neutralControls());
    s.omega = [0.2, 0.2, 0.2];
    const f = sim.forces(s, neutralControls());
    for (let i = 0; i < 3; i++)
      expect(f.torque[i] - baseline.torque[i]).toBeLessThan(0);
  });
  it("stalls with finite forces at high angle of attack", () => {
    const sim = new Simulation(a),
      s = initialState(a, 12, 100, 40);
    const f = sim.forces(s, neutralControls());
    expect(
      f.surfaces.filter((v) => v.id.includes("wing")).every((v) => v.stalled),
    ).toBe(true);
    expect(f.force.every(Number.isFinite)).toBe(true);
  });
  it.each([a, parseAircraft(trainer)])(
    "finds and holds level trim at constant supply voltage for $id",
    (definition) => {
      const aircraft = structuredClone(definition);
      aircraft.battery!.voltageCurve.forEach((p) => (p.voltsPerCell = 3.9));
      const trim = findTrim(aircraft);
      expect(trim.converged).toBe(true);
      const result = runExperiment(aircraft, calmEnvironment(), "cruise", 20);
      expect(result.finalState.status).toBe("flying");
      expect(result.summary.finalAltitudeM).toBeCloseTo(18, 1);
      expect(result.summary.finalSpeedMps).toBeCloseTo(12, 1);
    },
  );
  it("uses air-relative velocity for wind", () => {
    const sim = new Simulation(a),
      s = initialState(a, 12, 100, 0);
    const f = sim.forces(s, neutralControls());
    sim.environment.windMps = [4, 0, 0];
    const wind = sim.forces(s, neutralControls());
    expect(wind.airspeed).toBeCloseTo(8);
    expect(Math.abs(wind.force[2])).toBeLessThan(Math.abs(f.force[2]));
  });
  it("preserves quaternion normalization during a maneuver", () => {
    const sim = new Simulation(
      a,
      calmEnvironment(),
      initialState(a, 12, 100, 0),
    );
    for (let i = 0; i < 1200; i++)
      sim.step({ roll: 0.15, pitch: 0.1, yaw: 0.05, throttle: 0.4 });
    expect(Math.hypot(...sim.state.orientation)).toBeCloseTo(1, 10);
  });
  it("converges across smaller timesteps on a pitch pulse", () => {
    const trim = findTrim(a);
    const run = (dt: number) => {
      const sim = new Simulation(a, calmEnvironment(), trim.state);
      for (let i = 0; i < Math.round(3 / dt); i++)
        sim.step(
          {
            ...trim.controls,
            pitch: trim.controls.pitch + (i * dt < 1 ? 0.15 : 0),
          },
          dt,
        );
      return sim.state;
    };
    const coarse = run(1 / 60),
      medium = run(1 / 120),
      fine = run(1 / 240);
    expect(length(sub(medium.position, fine.position))).toBeLessThan(0.02);
    expect(length(sub(medium.position, fine.position))).toBeLessThan(
      length(sub(coarse.position, fine.position)),
    );
  });
  it("ends flight on ground impact and never advances a crashed aircraft", () => {
    const state = initialState(a, 0, 0.2, 0);
    state.velocity = [0, 0, 8];
    const sim = new Simulation(a, calmEnvironment(), state);
    for (let i = 0; i < 20; i++) sim.step(neutralControls());
    expect(sim.state.status).toBe("crashed");
    const before = structuredClone(sim.state);
    sim.step(neutralControls());
    expect(sim.state).toEqual(before);
  });
  it("rejects invalid timesteps", () => {
    const sim = new Simulation(a);
    expect(() => sim.step(neutralControls(), 0)).toThrow();
    expect(() => sim.step(neutralControls(), 1)).toThrow();
  });
});
describe("repeatable experiments", () => {
  it("replays a gusty maneuver to the identical final state", () => {
    const env = calmEnvironment();
    env.gustMps = 1;
    env.windMps = [0, 2, 0];
    const run = runExperiment(a, env, "roll-pulse", 8),
      copy = parseRecording(JSON.parse(JSON.stringify(run.recording)));
    expect(replayRecording(copy)).toEqual(run.finalState);
  });
  it("reproduces seeded experiments", () => {
    const env = { ...calmEnvironment(), gustMps: 1 };
    expect(runExperiment(a, env, "glide", 4).finalState).toEqual(
      runExperiment(a, env, "glide", 4).finalState,
    );
  });
  it("rejects unsupported replay versions and invalid frames", () => {
    const r = runExperiment(a, calmEnvironment(), "cruise", 0.1).recording;
    expect(() =>
      parseRecording({ ...r, simulationVersion: "future" }),
    ).toThrow();
    r.frames[0].throttle = 2;
    expect(() => parseRecording(r)).toThrow();
  });
  it("rejects wrong motor counts", () => {
    const r = runExperiment(a, calmEnvironment(), "cruise", 0.1).recording;
    r.initialState.motors = [];
    expect(() => parseRecording(r)).toThrow(/motor count/);
  });
  it("a battery edit changes the required pitch trim", () => {
    const modified = modifyAircraft(a, {
      ...defaultChanges,
      batteryShiftM: 0.08,
    });
    expect(
      Math.abs(findTrim(modified).controls.pitch - findTrim(a).controls.pitch),
    ).toBeGreaterThan(0.05);
  });
});
