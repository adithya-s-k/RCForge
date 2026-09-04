import { it, expect } from "vitest";
import bronco from "../aircraft/ft-bronco.json";
import tiny from "../aircraft/ft-tiny-trainer.json";
import raptor from "../aircraft/ft-22-raptor.json";
import { surfaceCommand } from "../src/core/surface-control";
import { aircraftChannels } from "../src/app/aircraft-channels";
import {
  Simulation,
  initialState,
  neutralControls,
} from "../src/core/simulation";
import { parseAircraft } from "../src/core/schema";
import { massProperties } from "../src/core/aircraft";
import { findTrim } from "../src/core/trim";
import { runExperiment } from "../src/core/experiment";
import { calmEnvironment } from "../src/core/simulation";
it("Bronco balances at the published CG with the reference battery and dry mass", () => {
  const a = parseAircraft(bronco),
    p = massProperties(a);
  expect(p.mass).toBeCloseTo(0.83, 9);
  expect(
    p.mass - a.parts.find((p) => p.kind === "battery")!.massKg,
  ).toBeCloseTo(0.64, 9);
  expect(a.reference.leadingEdgeXM - p.cg[0]).toBeCloseTo(0.051, 9);
  expect(a.motors.every((m) => m.propDiameterM === 0.2032)).toBe(true);
});
it("FT-22 accounts for its dry build and mixes elevons with no invented rudder", () => {
  const a = parseAircraft(raptor),
    p = massProperties(a);
  expect(p.mass).toBeCloseTo(0.32, 10);
  expect(
    p.mass - a.parts.find((p) => p.kind === "battery")!.massKg,
  ).toBeCloseTo(0.235, 10);
  expect(0.4 - p.cg[0]).toBeCloseTo(0.4, 10);
  const elevons = a.surfaces.filter((s) => s.control);
  expect(
    elevons.map((s) =>
      surfaceCommand(s.control!, { ...neutralControls(), pitch: 1 }),
    ),
  ).toEqual([-1, -1]);
  expect(
    elevons.map((s) =>
      surfaceCommand(s.control!, { ...neutralControls(), roll: 1 }),
    ),
  ).toEqual([1, -1]);
  const sim = new Simulation(a),
    state = initialState(a, 12, 20, 0),
    zero = sim.forces(state, neutralControls());
  expect(
    sim.forces(state, { ...neutralControls(), roll: 0.2 }).torque[0] -
      zero.torque[0],
  ).toBeGreaterThan(0);
  expect(
    sim.forces(state, { ...neutralControls(), pitch: 0.2 }).torque[1] -
      zero.torque[1],
  ).toBeGreaterThan(0);
  expect(sim.forces(state, { ...neutralControls(), yaw: 0.5 }).torque).toEqual(
    zero.torque,
  );
  expect(findTrim(a).converged).toBe(true);
  expect(aircraftChannels(a)).toEqual(["pitch", "roll", "throttle"]);
  const trim = findTrim(a),
    higher = initialState(a, 12, 20, trim.pitchDeg + 1),
    lower = initialState(a, 12, 20, trim.pitchDeg - 1);
  higher.motors.fill(trim.controls.throttle);
  lower.motors.fill(trim.controls.throttle);
  expect(
    sim.forces(higher, trim.controls).torque[1] -
      sim.forces(lower, trim.controls).torque[1],
  ).toBeLessThan(0);
});
it("Tiny Trainer separates published dry reference mass from assumed battery mass", () => {
  const a = parseAircraft(tiny),
    p = massProperties(a);
  expect(
    p.mass - a.parts.find((p) => p.kind === "battery")!.massKg,
  ).toBeCloseTo(0.193, 9);
  expect(p.mass).toBeCloseTo(0.253, 9);
  expect(
    a.surfaces
      .filter((s) => s.kind === "wing")
      .every((s) => s.control?.axis === "roll"),
  ).toBe(true);
  expect(findTrim(a).converged).toBe(true);
  const result = runExperiment(a, calmEnvironment(), "cruise", 10);
  expect(result.finalState.status).not.toBe("crashed");
  expect(result.finalState.position[2]).toBeCloseTo(-18, 2);
});
