import { it, expect } from "vitest";
import quad from "../aircraft/quad-x-6s.json";
import trainer from "../aircraft/simple-trainer.json";
import { parseAircraft } from "../src/core/schema";
import { powertrain } from "../src/core/powertrain";
import { massProperties } from "../src/core/aircraft";
import { setTotalMass } from "../src/core/editor";
import { airDensity } from "../src/core/scenery";
import {
  Simulation,
  initialState,
  neutralControls,
} from "../src/core/simulation";
import {
  createRecording,
  parseRecording,
  replayRecording,
} from "../src/core/experiment";
it("battery bench interpolation and voltage sag satisfy V=OCV-IR", () => {
  const a = parseAircraft(quad),
    soc = 0.5;
  const p = powertrain(a, [0.5, 0.5, 0.5, 0.5], soc);
  expect(p.voltage).toBeCloseTo(
    6 * 3.8 - p.current * a.battery!.resistanceOhm,
    10,
  );
  expect(p.thrust[0]).toBeCloseTo(2.5 * (p.voltage / 22.2) ** 2, 10);
  const empty = powertrain(a, [1, 1, 1, 1], 0);
  expect(empty.thrust).toEqual([0, 0, 0, 0]);
  expect(empty.current).toBe(0);
  const full = powertrain(a, [0.5, 0.5, 0.5, 0.5], 1);
  expect(full.thrust[0]).toBeGreaterThan(p.thrust[0]);
});
it("depletion is charge-conserving, bounded and recorded for deterministic replay", () => {
  const a = parseAircraft(quad);
  const s = initialState(a, 0, 100, 0);
  s.motors.fill(0.5);
  const sim = new Simulation(a, undefined, s),
    recording = createRecording(sim);
  const c = { ...neutralControls(), throttle: 0.5 };
  const before = sim.state.batterySoc!,
    current = powertrain(a, s.motors, before).current;
  sim.step(c);
  recording.frames.push(c);
  expect(sim.state.batterySoc).toBeCloseTo(
    before - current / 120 / (a.battery!.capacityMah * 3.6),
    10,
  );
  for (let i = 0; i < 240; i++) {
    sim.step(c);
    recording.frames.push(c);
  }
  expect(sim.state.batterySoc).toBeLessThan(before);
  expect(
    replayRecording(parseRecording(JSON.parse(JSON.stringify(recording)))),
  ).toEqual(sim.state);
  const tiny = parseAircraft(quad);
  tiny.battery!.capacityMah = 0.01;
  const drained = new Simulation(tiny, undefined, initialState(tiny, 0, 100));
  for (let i = 0; i < 120; i++) drained.step({ ...c, throttle: 1 });
  expect(drained.state.batterySoc).toBe(0);
});
it("material names add no hidden mass and principal inertias rotate into body axes", () => {
  const a = parseAircraft(trainer);
  a.parts = [
    {
      ...a.parts[0],
      massKg: 2,
      positionM: [0, 0, 0],
      inertiaDiagonalKgM2: [1, 2, 3],
      orientationDeg: [0, 0, 90],
      material: { name: "Test material", densityKgM3: 9999 },
    },
  ];
  const p = massProperties(a);
  // This inertia fixture replaces the entire assembly with one test cuboid.
  for (const surface of a.surfaces)
    if (surface.control) delete surface.control.linkage;
  delete a.battery;
  for (const motor of a.motors) delete motor.partId;
  expect(p.mass).toBe(2);
  expect(p.cg).toEqual([0, 0, 0]);
  expect(p.inertia[0][0]).toBeCloseTo(2, 10);
  expect(p.inertia[1][1]).toBeCloseTo(1, 10);
  expect(massProperties(setTotalMass(a, 4)).inertia[0][0]).toBeCloseTo(4, 10);
});
it("hot high-altitude air reduces thrust and lift at the same speed", () => {
  const density = airDensity(32, 1500);
  expect(density).toBeLessThan(airDensity(15, 0));
  expect(airDensity(15, 0)).toBeCloseTo(1.225, 3);
  const a = parseAircraft(quad);
  const nominal = powertrain(a, [0.5, 0.5, 0.5, 0.5], 1, 1.225),
    thin = powertrain(a, [0.5, 0.5, 0.5, 0.5], 1, density);
  expect(thin.thrust[0] / nominal.thrust[0]).toBeCloseTo(density / 1.225, 10);
});
it("rejects contradictory component data and malformed lookup curves", () => {
  const a = structuredClone(quad);
  a.battery.partId = "missing";
  expect(() => parseAircraft(a)).toThrow(/Battery/);
  const b = structuredClone(quad);
  b.motors[0].performance.points[1].command = 0;
  expect(() => parseAircraft(b)).toThrow(/Performance/);
  const c = parseAircraft(trainer);
  c.parts[0].inertiaDiagonalKgM2 = [1, 1, 10];
  expect(() => parseAircraft(c)).toThrow(/triangle/);
});
it("polar data feeds forces without double-counting induced drag", () => {
  const a = parseAircraft(trainer);
  a.motors = [];
  a.fuselageDragAreaM2 = 0;
  a.surfaces = [
    {
      ...a.surfaces[0],
      positionM: massProperties(a).cg,
      rollDeg: 0,
      incidenceDeg: 0,
      control: undefined,
      polar: [
        { alphaDeg: -20, cl: 1, cd: 0.1, cm: 0 },
        { alphaDeg: 0, cl: 1, cd: 0.1, cm: 0 },
        { alphaDeg: 20, cl: 1, cd: 0.1, cm: 0 },
      ],
    },
  ];
  const sim = new Simulation(a),
    f = sim.forces(initialState(a, 10, 100, 0), neutralControls());
  const q = 0.5 * 1.225 * 100 * a.surfaces[0].spanM * a.surfaces[0].chordM;
  expect(f.force[2]).toBeCloseTo(-q, 8);
  expect(f.force[0]).toBeCloseTo(-q * 0.1, 8);
});
it("servo travel follows its rate limit and remains replayable", () => {
  const a = parseAircraft(trainer);
  const w = a.surfaces.find((w) => w.control?.axis === "pitch")!;
  w.control!.responseSeconds = 0.1;
  w.control!.rateLimitDegS = 20;
  const sim = new Simulation(a, undefined, initialState(a, 12, 100));
  sim.step(neutralControls());
  const before = sim.state.surfaceCommands![a.surfaces.indexOf(w)];
  sim.step({ ...neutralControls(), pitch: 1 });
  const after = sim.state.surfaceCommands![a.surfaces.indexOf(w)];
  expect(Math.abs(after - before)).toBeGreaterThan(0);
  expect(Math.abs(after - before) * w.control!.maxDeg).toBeLessThanOrEqual(
    20 / 120 + 1e-10,
  );
  const recording = createRecording(sim);
  for (let i = 0; i < 120; i++) {
    const c = { ...neutralControls(), pitch: 0.3 };
    sim.step(c);
    recording.frames.push(c);
  }
  expect(replayRecording(parseRecording(recording))).toEqual(sim.state);
});
it("axis-specific body drag opposes motion and differs by projected area", () => {
  const a = parseAircraft(quad);
  a.bodyDragAreaM2 = [0.01, 0.02, 0.04];
  const sim = new Simulation(a),
    c = neutralControls();
  const x = initialState(a, 10, 100);
  x.orientation = [0, 0, 0, 1];
  const y = structuredClone(x);
  y.velocity = [0, 10, 0];
  expect(sim.forces(y, c).force[1]).toBeCloseTo(
    sim.forces(x, c).force[0] * 2,
    10,
  );
});
it("grass increases wheel rolling resistance relative to asphalt", async () => {
  const { fitLandingGear, launchState } = await import("../src/core/launch");
  const { resolveGroundContacts } = await import("../src/core/ground");
  const a = fitLandingGear(parseAircraft(trainer)),
    p = massProperties(a);
  const s = launchState(a, "ground");
  s.velocity = [2, 0, 0.08];
  const asphalt = structuredClone(s),
    grass = structuredClone(s);
  resolveGroundContacts(asphalt, a, p, neutralControls(), 1 / 120, "asphalt");
  resolveGroundContacts(grass, a, p, neutralControls(), 1 / 120, "grass");
  expect(grass.velocity[0]).toBeLessThan(asphalt.velocity[0]);
});
