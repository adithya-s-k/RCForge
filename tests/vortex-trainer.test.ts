import { expect, it } from "vitest";
import * as T from "three";
import raw from "../aircraft/vt-simple-trainer.json";
import tiny from "../aircraft/ft-tiny-trainer.json";
import { parseAircraft, type Aircraft } from "../src/core/schema";
import {
  massProperties,
  modifyAircraft,
  defaultChanges,
} from "../src/core/aircraft";
import { axisQ, rotate, sub, euler } from "../src/core/math";
import {
  Simulation,
  initialState,
  neutralControls,
  calmEnvironment,
} from "../src/core/simulation";
import { launchState, launchTrim, fitLandingGear } from "../src/core/launch";
import { placedLaunch } from "../src/core/placement";
import { findTrim } from "../src/core/trim";
import {
  createRecording,
  parseRecording,
  replayRecording,
  runExperiment,
} from "../src/core/experiment";
import { aircraftChannels } from "../src/app/aircraft-channels";
import { buildAircraft, disposeAircraft } from "../src/view/model";
import { ControlPreview } from "../src/core/control-preview";
import { responseSettings } from "../src/core/pilot-response";

const a = parseAircraft(raw);
const zero = neutralControls();

it("uses the authored cruise speed in default trim, airborne launch and experiments", () => {
  const trim = findTrim(a);
  expect(trim.converged).toBe(true);
  expect(Math.hypot(...trim.state.velocity)).toBeCloseTo(9, 10);
  expect(Math.hypot(...launchState(a, "airborne").velocity)).toBeCloseTo(9, 10);
  const cruise = runExperiment(a, calmEnvironment(), "cruise", 5);
  expect(Math.hypot(...cruise.recording.initialState.velocity)).toBeCloseTo(
    9,
    10,
  );
  expect(cruise.finalState.status).toBe("flying");
  const glide = runExperiment(a, calmEnvironment(), "glide", 5);
  expect(glide.finalState.status).toBe("flying");
  expect(glide.summary.finalAltitudeM).toBeLessThan(18);
  expect(glide.summary.finalAltitudeM).toBeGreaterThan(5);
  // Existing definitions retain the historical 12 m/s default.
  expect(
    Math.hypot(...findTrim(parseAircraft(tiny)).state.velocity),
  ).toBeCloseTo(12, 10);
});

it("keeps the published mass separate from estimated allocation and ambiguous CG", () => {
  const p = massProperties(a);
  expect(p.mass).toBeCloseTo(0.5, 12);
  expect(
    p.mass - a.parts.find((p) => p.kind === "battery")!.massKg,
  ).toBeCloseTo(0.35, 12);
  expect(a.parts.filter((p) => p.servo).map((p) => p.massKg)).toEqual([
    0.009, 0.009,
  ]);
  expect(a.motors[0].propDiameterM).toBeCloseTo(9 * 0.0254, 12);
  expect(a.reference.leadingEdgeXM - p.cg[0]).toBeCloseTo(0.058, 12);
  expect(p.cg[1]).toBeCloseTo(0, 12);
  expect(a.provenance.balance.status).toBe("estimated");
  expect(a.provenance.aerodynamics.status).toBe("estimated");
  expect(a.provenance.powertrain.status).toBe("estimated");
  expect(fitLandingGear(a)).toEqual(a);
});

const edge = (s: Aircraft["surfaces"][number], end: number) => {
  const offset = rotate(axisQ([1, 0, 0], (s.rollDeg * Math.PI) / 180), [
    0,
    (end * s.spanM) / 2,
    0,
  ]);
  return s.positionM.map((v, i) => v + offset[i]);
};
it.each([0.8, 1, 1.2])(
  "keeps polyhedral panel joints, mass and collision tips aligned at span scale %s",
  (scale) => {
    const changed = modifyAircraft(a, { ...defaultChanges, spanScale: scale });
    expect(changed.reference.spanM).toBeCloseTo(1.4 * scale, 12);
    for (const [label, side] of [
      ["left", -1],
      ["right", 1],
    ] as const) {
      const inner = changed.surfaces.find(
        (s) => s.id === `${label}-inner-wing`,
      )!;
      const outer = changed.surfaces.find(
        (s) => s.id === `${label}-outer-wing`,
      )!;
      const joint = edge(inner, side),
        root = edge(outer, -side),
        tip = edge(outer, side);
      expect(joint[1]).toBeCloseTo(root[1], 12);
      expect(joint[2]).toBeCloseTo(root[2], 12);
      expect(tip[1]).toBeCloseTo(side * 0.7 * scale, 12);
      expect(tip[2]).toBeLessThan(root[2] - 0.05 * scale);
      const contact = changed.contactPoints.find(
        (p) => p.id === `${label}-wingtip`,
      )!;
      expect(contact.positionM[1]).toBeCloseTo(tip[1], 12);
      expect(contact.positionM[2]).toBeCloseTo(tip[2], 12);
      const part = changed.parts.find((p) => p.id === outer.id)!;
      expect(part.positionM[2] - outer.positionM[2]).toBeCloseTo(-0.008, 12);
      expect(part.massKg).toBeCloseTo(0.0215 * scale, 12);
    }
    expect(changed.reference.areaM2).toBeCloseTo(
      changed.surfaces
        .filter((s) => s.kind === "wing")
        .reduce((sum, s) => sum + s.spanM * s.chordM, 0),
      12,
    );
    expect(massProperties(changed).mass).toBeCloseTo(0.388 + 0.112 * scale, 12);
  },
);

it("preserves the Tiny Trainer root join and component offset during a span edit", () => {
  const b = parseAircraft(tiny),
    changed = modifyAircraft(b, { ...defaultChanges, spanScale: 1.2 });
  for (const s of b.surfaces.filter((s) => s.kind === "wing")) {
    const next = changed.surfaces.find((t) => t.id === s.id)!;
    expect(edge(next, -Math.sign(s.positionM[1]))[2]).toBeCloseTo(
      edge(s, -Math.sign(s.positionM[1]))[2],
      10,
    );
  }
});

it("turns through rudder and polyhedral sideslip without inventing ailerons", () => {
  expect(aircraftChannels(a)).toEqual(["pitch", "yaw", "throttle"]);
  expect(a.surfaces.filter((s) => s.control).map((s) => s.id)).toEqual([
    "elevator",
    "rudder",
  ]);
  const sim = new Simulation(a),
    state = initialState(a, 10, 50, 0),
    base = sim.forces(state, zero);
  expect(sim.forces(state, { ...zero, roll: 0.5 }).torque).toEqual(base.torque);
  expect(
    sim.forces(state, { ...zero, pitch: 0.2 }).torque[1] - base.torque[1],
  ).toBeGreaterThan(0);
  expect(
    sim.forces(state, { ...zero, yaw: 0.2 }).torque[2] - base.torque[2],
  ).toBeGreaterThan(0);
  const slip = structuredClone(state);
  slip.velocity[1] = 1;
  expect(sim.forces(slip, zero).torque[0] - base.torque[0]).toBeLessThan(0);
  const turns = [];
  for (const yaw of [-0.2, 0.2]) {
    const tr = findTrim(a, 9),
      fly = new Simulation(a, calmEnvironment(), tr.state);
    for (let i = 0; i < 240; i++) fly.step({ ...tr.controls, yaw });
    const attitude = euler(fly.state.orientation);
    expect(attitude[0] * yaw).toBeGreaterThan(0.02);
    expect(attitude[2] * yaw).toBeGreaterThan(0.02);
    turns.push(attitude);
  }
  expect(turns[0][0]).toBeCloseTo(-turns[1][0], 10);
  expect(turns[0][2]).toBeCloseTo(-turns[1][2], 10);
});

it.each([0, 90, 217])(
  "rests on both main wheels and the skid before and after Start at heading %s",
  (headingDeg) => {
    const state = placedLaunch(a, "ground", {
      northM: 12,
      eastM: -4,
      altitudeM: 1,
      headingDeg,
    });
    const cg = massProperties(a).cg;
    for (const p of a.contactPoints) {
      const height =
        state.position[2] + rotate(state.orientation, sub(p.positionM, cg))[2];
      if (p.kind === "wheel" || p.kind === "skid")
        expect(height).toBeCloseTo(0, 10);
      else expect(height).toBeLessThan(-0.001);
    }
    const sim = new Simulation(a, calmEnvironment(), state);
    for (let i = 0; i < 1200; i++) sim.step(zero);
    expect(sim.state.status).toBe("grounded");
    expect(
      Math.hypot(sim.state.position[0] - 12, sim.state.position[1] + 4),
    ).toBeLessThan(0.001);
    expect(euler(sim.state.orientation)[1]).toBeCloseTo(
      euler(state.orientation)[1],
      3,
    );
  },
);

it("takes off from installed gear and preserves a balanced hand release", () => {
  const sim = new Simulation(a, calmEnvironment(), launchState(a, "ground"));
  for (let i = 0; i < 12 * 120; i++)
    sim.step({
      ...zero,
      throttle: i < 360 ? 0 : 0.55,
      pitch: i < 720 ? 0 : 0.14,
    });
  expect(sim.state.status).toBe("flying");
  expect(-sim.state.position[2]).toBeGreaterThan(5);
  expect(sim.state.position[0]).toBeGreaterThan(40);
  const trim = launchTrim(a, "hand");
  expect(trim.converged).toBe(true);
  const hand = new Simulation(a, calmEnvironment(), launchState(a, "hand"));
  for (let i = 0; i < 600; i++) hand.step(trim.controls);
  expect(hand.state.status).toBe("flying");
  expect(-hand.state.position[2]).toBeGreaterThan(5);
});

it("matches editor servo movement, battery consumption and exact replay during a rudder maneuver", () => {
  const trim = findTrim(a, 9),
    sim = new Simulation(a, calmEnvironment(), trim.state);
  const recording = createRecording(sim),
    bench = new ControlPreview(a);
  const direct = responseSettings();
  // Start both actuators at neutral to compare their full transient response.
  sim.state.surfaceCommands!.fill(0);
  recording.initialState.surfaceCommands!.fill(0);
  for (let i = 0; i < 240; i++) {
    const c = { ...trim.controls, pitch: 0.18, yaw: i < 120 ? 0.25 : 0 };
    sim.step(c);
    recording.frames.push(c);
    bench.step(c, direct);
    sim.state.surfaceCommands!.forEach((v, j) =>
      expect(v).toBeCloseTo(bench.deflections[j], 12),
    );
  }
  expect(sim.state.batterySoc!).toBeLessThan(a.battery!.initialSoc);
  const replay = replayRecording(
    parseRecording(JSON.parse(JSON.stringify(recording))),
  );
  expect(replay).toEqual(sim.state);
});

it("renders the rounded tail outlines and wing dimensions inside the shared budget", () => {
  const visual = buildAircraft(a);
  visual.cg.visible = false;
  const bounds = new T.Box3().setFromObject(visual.group),
    size = bounds.getSize(new T.Vector3());
  expect(size.y).toBeCloseTo(1.4, 2);
  expect(size.x).toBeCloseTo(0.8, 2);
  let triangles = 0,
    draws = 0;
  visual.group.traverse((o) => {
    if (!(o instanceof T.Mesh)) return;
    const g = o.geometry;
    draws += Array.isArray(o.material) ? g.groups.length : 1;
    triangles += (g.index?.count ?? g.getAttribute("position").count) / 3;
    expect([...g.getAttribute("position").array].every(Number.isFinite)).toBe(
      true,
    );
  });
  expect(draws).toBeLessThan(100);
  expect(triangles).toBeLessThan(15000);
  for (const s of a.surfaces.filter((s) => s.panel)) {
    const points = s.panel!.outline;
    const area =
      Math.abs(
        points.reduce((sum, p, i) => {
          const q = points[(i + 1) % points.length];
          return sum + p[0] * q[1] - q[0] * p[1];
        }, 0),
      ) / 2;
    expect(area).toBeCloseTo(1, 10);
    expect(visual.group.getObjectByName(`surface:${s.id}`)).toBeDefined();
  }
  expect(
    visual.controls.every((c) => ["elevator", "rudder"].includes(c.surfaceId)),
  ).toBe(true);
  expect(visual.group.getObjectByName("tail-skid")).toBeDefined();
  disposeAircraft(visual.group);
});
