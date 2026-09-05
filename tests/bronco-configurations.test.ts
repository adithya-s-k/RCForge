import { expect, it } from "vitest";
import * as T from "three";
import vtail from "../aircraft/ft-bronco.json";
import conventional from "../aircraft/ft-bronco-conventional.json";
import { parseAircraft } from "../src/core/schema";
import { massProperties } from "../src/core/aircraft";
import { findTrim } from "../src/core/trim";
import { launchState, launchTrim } from "../src/core/launch";
import {
  Simulation,
  neutralControls,
  calmEnvironment,
} from "../src/core/simulation";
import { buildAircraft, disposeAircraft } from "../src/view/model";

const variants = [vtail, conventional];

it.each(variants)(
  "balances $id longitudinally and laterally with each component counted once",
  (raw) => {
    const a = parseAircraft(raw),
      p = massProperties(a);
    expect(p.mass).toBeCloseTo(0.83, 12);
    expect(
      p.mass - a.parts.find((p) => p.id === "battery")!.massKg,
    ).toBeCloseTo(0.64, 12);
    expect(a.reference.leadingEdgeXM - p.cg[0]).toBeCloseTo(0.051, 12);
    expect(p.cg[1]).toBeCloseTo(0, 12);
    expect(new Set(a.parts.map((p) => p.id)).size).toBe(a.parts.length);
    const pack = a.parts.find((p) => p.id === "battery")!;
    const body = a.parts.find((p) => p.id === "fuselage")!;
    expect(Math.abs(pack.positionM[1]) + pack.sizeM[1] / 2).toBeLessThan(
      body.sizeM[1] / 2,
    );
  },
);

it.each(variants)(
  "seats the $id wing above its fuselage and booms, with its mass and contacts following the skin",
  (raw) => {
    const a = parseAircraft(raw),
      model = buildAircraft(a),
      cg = massProperties(a).cg;
    model.group.updateMatrixWorld(true);
    for (const part of a.parts.filter((p) =>
      ["fuselage", "left-boom", "right-boom"].includes(p.id),
    )) {
      const s = a.surfaces.find(
        (s) =>
          s.foamWing &&
          (part.positionM[1] <= 0 ? s.positionM[1] < 0 : s.positionM[1] > 0),
      )!;
      const visual = model.group.getObjectByName(`surface:${s.id}`)!;
      // Ray upward from below the wing: the first hit is its lower skin.
      const ray = new T.Raycaster(
        new T.Vector3(
          -0.02 - cg[0],
          (part.positionM[1] || -0.01) - cg[1],
          1 - cg[2],
        ),
        new T.Vector3(0, 0, -1),
      );
      const hits = ray.intersectObject(visual, true);
      expect(hits.length).toBeGreaterThan(0);
      const stations = part
        .bodyLoft!.map((p) => ({
          x: part.positionM[0] + p.x * part.sizeM[0],
          z: part.positionM[2] + p.top * part.sizeM[2],
        }))
        .sort((a, b) => a.x - b.x);
      const i = stations.findIndex((p) => p.x >= -0.02),
        l = stations[i - 1],
        r = stations[i];
      const roof = l.z + ((r.z - l.z) * (-0.02 - l.x)) / (r.x - l.x);
      const clearance = roof - (hits[0].point.z + cg[2]); // Positive Z is down.
      expect(clearance).toBeGreaterThan(-0.0001);
      expect(clearance).toBeLessThan(0.001);
    }
    for (const s of a.surfaces.filter((s) => s.foamWing)) {
      const mass = a.parts.find((p) => p.id === s.id)!;
      expect(mass.positionM[2]).toBeLessThan(s.positionM[2]);
      expect(mass.positionM[2]).toBeGreaterThan(
        s.positionM[2] - s.foamWing!.foldHeightM,
      );
      const tip = a.contactPoints.find(
        (p) =>
          p.spanLinked &&
          Math.sign(p.positionM[1]) === Math.sign(s.positionM[1]),
      )!;
      expect(tip.positionM[2]).toBeCloseTo(
        s.positionM[2] + s.foamWing!.boardThicknessM / 2,
        10,
      );
    }
    disposeAircraft(model.group);
  },
);

it("reconstructs the conventional H-tail outline and aft-swept fixed fins from sheet 3", () => {
  const a = parseAircraft(conventional);
  const tail = a.surfaces.find((s) => s.id === "elevator")!;
  const fins = a.surfaces.filter((s) => s.kind === "vertical-tail");
  expect(tail.spanM).toBeCloseTo(((1937.96 - 868.88) * 0.0254) / 72, 10);
  expect(tail.spanM * tail.chordM).toBeCloseTo(0.0425975425, 8);
  expect(fins).toHaveLength(2);
  expect(fins[1].positionM[1] - fins[0].positionM[1]).toBeCloseTo(0.343027, 9);
  expect(a.parts.filter((p) => p.servo)).toHaveLength(3);
  for (const fin of fins) {
    expect(fin.control).toBeUndefined();
    expect(fin.spanM).toBeCloseTo(0.170533689, 8);
    expect(fin.spanM * fin.chordM).toBeCloseTo(0.0168203, 7);
    const outline = fin.panel!.outline.map(([x, y]) => [
      fin.positionM[0] + x * fin.chordM,
      fin.positionM[2] - y * fin.spanM,
    ]);
    const top = outline.filter((p) => p[1] < -0.17);
    expect(top).toHaveLength(2);
    // The long root fillet points forward; the upper fin sweeps aft.
    expect(Math.max(...top.map((p) => p[0]))).toBeLessThan(
      Math.max(...outline.map((p) => p[0])) - 0.1,
    );
    expect(Math.max(...outline.map((p) => p[1]))).toBeCloseTo(
      tail.positionM[2],
      10,
    );
    expect(fin.positionM[0]).toBeLessThan(-0.55);
  }
});

it("uses differential thrust for conventional yaw, with no fictitious moving rudders", () => {
  const a = parseAircraft(conventional),
    controls = { ...neutralControls(), throttle: 0.4 };
  const sim = new Simulation(a),
    state = findTrim(a).state;
  // forces() reads actual motor spool state, so compare settled yaw commands.
  const base = sim.forces(state, controls);
  const yawState = structuredClone(state);
  yawState.motors = [0.6, 0.2];
  expect(
    sim.forces(yawState, { ...controls, yaw: 0.2 }).torque[2] - base.torque[2],
  ).toBeGreaterThan(0);
  const unpowered = structuredClone(a);
  unpowered.motors = [];
  const glider = new Simulation(unpowered),
    zero = neutralControls();
  expect(glider.forces(state, { ...zero, yaw: 1 }).torque).toEqual(
    glider.forces(state, zero).torque,
  );
  const slip = structuredClone(state);
  slip.velocity[1] = 1;
  expect(
    glider.forces(slip, zero).torque[2] - glider.forces(state, zero).torque[2],
  ).toBeGreaterThan(0);
});

it.each(variants)(
  "holds balanced trim and clears the ground during the $id hand release",
  (raw) => {
    const a = parseAircraft(raw),
      trim = findTrim(a),
      sim = new Simulation(a, calmEnvironment(), trim.state);
    expect(trim.converged).toBe(true);
    const start = sim.state.position[2],
      soc = sim.state.batterySoc;
    for (let i = 0; i < 1200; i++) {
      sim.state.batterySoc = soc;
      sim.step(trim.controls);
    }
    expect(Math.abs(sim.state.position[2] - start)).toBeLessThan(0.02);
    const handTrim = launchTrim(a, "hand");
    expect(handTrim.converged).toBe(true);
    const hand = new Simulation(a, calmEnvironment(), launchState(a, "hand"));
    for (let i = 0; i < 600; i++) hand.step(handTrim.controls);
    expect(hand.state.status).toBe("flying");
    expect(-hand.state.position[2]).toBeGreaterThan(5);
  },
);
