import { expect, it } from "vitest";
import trainer from "../aircraft/simple-trainer.json";
import { parseAircraft } from "../src/core/schema";
import { surfacePolar, STANDARD_AIR_VISCOSITY } from "../src/core/aerodynamics";
import { airDensity, airKinematicViscosity } from "../src/core/scenery";
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
import { surveyEnvelope } from "../src/core/envelope";
import { modifyAircraft, defaultChanges } from "../src/core/aircraft";

// Synthetic finite-wing coefficients with a known analytical interpolation.
// These are test fixtures, not airfoil measurements or an aircraft calibration.
function aircraftWithTables() {
  const a = parseAircraft(trainer);
  a.surfaces[0].reynoldsPolars = {
    convention: "finite-wing",
    source: "Synthetic interpolation fixture; not measured",
    tables: [100000, 400000].map((reynolds, i) => ({
      reynolds,
      points: [-10, 0, 10].map((alphaDeg) => ({
        alphaDeg,
        cl: alphaDeg * (i ? 0.08 : 0.04),
        cd: i ? 0.04 : 0.08,
        cm: i ? -0.02 : -0.04,
      })),
    })),
  };
  return a;
}
const fallback = { cl: 0.1, cd: 1, cm: 0 };

it("keeps polar data for CG edits but invalidates finite-wing tables after a span change", () => {
  const a = aircraftWithTables();
  expect(
    modifyAircraft(a, { ...defaultChanges, batteryShiftM: 0.01 }).surfaces[0]
      .reynoldsPolars,
  ).toEqual(a.surfaces[0].reynoldsPolars);
  const changed = modifyAircraft(a, { ...defaultChanges, spanScale: 1.2 });
  expect(changed.surfaces[0].reynoldsPolars).toBeUndefined();
  expect(changed.provenance.modifiedWingAerodynamics.status).toBe("estimated");
  expect(a.surfaces[0].reynoldsPolars).toBeDefined();
});

it("interpolates angle linearly and Reynolds number logarithmically", () => {
  const s = aircraftWithTables().surfaces[0];
  const c = surfacePolar(s, 5, 200000, fallback);
  expect(c.cl).toBeCloseTo(0.3, 12);
  expect(c.cd).toBeCloseTo(0.06, 12);
  expect(c.cm).toBeCloseTo(-0.03, 12);
  expect(c.outsideEnvelope).toBe(false);
  expect(c.source).toBe("reynolds-table");
});
it("clamps Reynolds boundaries and reports data limits, including zero speed", () => {
  const s = aircraftWithTables().surfaces[0];
  expect(surfacePolar(s, 5, 0, fallback)).toMatchObject({
    cl: 0.2,
    outsideEnvelope: true,
  });
  expect(surfacePolar(s, 5, 900000, fallback)).toMatchObject({
    cl: 0.4,
    outsideEnvelope: true,
  });
  expect(surfacePolar(s, 0, 100000, fallback).outsideEnvelope).toBe(false);
});
it("blends each table's own angular boundary continuously into post-stall fallback", () => {
  const s = aircraftWithTables().surfaces[0];
  expect(surfacePolar(s, 10, 100000, fallback).cl).toBeCloseTo(0.4);
  expect(surfacePolar(s, 16, 100000, fallback).cl).toBeCloseTo(0.25);
  expect(surfacePolar(s, 22, 100000, fallback).cl).toBeCloseTo(0.1);
  expect(surfacePolar(s, -90, 200000, fallback)).toMatchObject({
    ...fallback,
    outsideEnvelope: true,
  });
  s.reynoldsPolars!.tables[1].points[2].alphaDeg = 20;
  // High endpoint does not flag the unused low-Re table's narrower range.
  expect(surfacePolar(s, 15, 400000, fallback).outsideEnvelope).toBe(false);
});
it("rejects ambiguous, unsorted, negative-drag and nonfinite polar data", () => {
  const base = aircraftWithTables();
  expect(() => parseAircraft(base)).not.toThrow();
  const mutate = (f: (a: typeof base) => void) => {
    const a = structuredClone(base);
    f(a);
    expect(() => parseAircraft(a)).toThrow();
  };
  mutate((a) => {
    a.surfaces[0].polar = a.surfaces[0].reynoldsPolars!.tables[0].points;
  });
  mutate((a) => {
    a.surfaces[0].reynoldsPolars!.tables.reverse();
  });
  mutate((a) => {
    a.surfaces[0].reynoldsPolars!.tables[0].points.reverse();
  });
  mutate((a) => {
    a.surfaces[0].reynoldsPolars!.tables[0].points[1].cd = -0.1;
  });
  mutate((a) => {
    a.surfaces[0].reynoldsPolars!.tables[0].reynolds = Infinity;
  });
});
it("uses local chord/speed/viscosity in forces without adding induced drag twice", () => {
  const a = aircraftWithTables();
  a.surfaces = [a.surfaces[0]];
  a.surfaces[0].incidenceDeg = 0;
  a.motors = [];
  a.fuselageDragAreaM2 = 0;
  delete a.bodyDragAreaM2;
  const sim = new Simulation(a);
  const speed = 12;
  sim.environment.kinematicViscosityM2S =
    (speed * a.surfaces[0].chordM) / 200000;
  const force = sim.forces(initialState(a, speed, 100, 0), neutralControls());
  const qS =
    0.5 * 1.225 * speed ** 2 * a.surfaces[0].spanM * a.surfaces[0].chordM;
  expect(force.force[0]).toBeCloseTo(-qS * 0.06, 10);
  expect(force.surfaces[0].reynolds).toBeCloseTo(200000, 9);
  expect(force.surfaces[0].outsidePolarEnvelope).toBe(false);
});
it("replays the Reynolds model and environment exactly, and rejects old engine recordings", () => {
  const a = aircraftWithTables(),
    sim = new Simulation(a, undefined, initialState(a, 12, 100));
  sim.environment.kinematicViscosityM2S = 1.7e-5;
  const recording = createRecording(sim),
    c = { ...neutralControls(), throttle: 0.3, pitch: 0.05 };
  for (let i = 0; i < 240; i++) {
    sim.step(c);
    recording.frames.push(c);
  }
  expect(
    replayRecording(parseRecording(JSON.parse(JSON.stringify(recording)))),
  ).toEqual(sim.state);
  expect(() =>
    parseRecording({ ...recording, simulationVersion: "0.5.0" }),
  ).toThrow();
});
it("matches standard-air viscosity and increases kinematic viscosity at hot/high sites", () => {
  expect(airKinematicViscosity(15, airDensity(15, 0))).toBeCloseTo(
    STANDARD_AIR_VISCOSITY,
    8,
  );
  expect(airKinematicViscosity(32, airDensity(32, 1500))).toBeGreaterThan(
    STANDARD_AIR_VISCOSITY,
  );
});
it("reports failed trim and source coverage instead of treating finite output as validation", () => {
  const a = aircraftWithTables();
  a.motors.forEach((m) => {
    m.maxThrustN = 0.0001;
    delete m.performance;
  });
  delete a.battery; // This deliberately underpowered fixture has no electrical model.
  const survey = surveyEnvelope(a);
  expect(survey.points).toHaveLength(45);
  expect(survey.points.some((p) => !p.trimmed)).toBe(true);
  expect(survey.points.some((p) => p.surfaces.some((s) => s.outsideData))).toBe(
    true,
  );
  expect(survey.nonfiniteLoads).toBe(0);
});
