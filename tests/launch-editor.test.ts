import { describe, it, expect } from "vitest";
import bronco from "../aircraft/ft-bronco.json";
import tiny from "../aircraft/ft-tiny-trainer.json";
import raptor from "../aircraft/ft-22-raptor.json";
import trainer from "./fixtures/generic-trainer.json";
import { parseAircraft } from "../src/core/schema";
import { fitLandingGear, launchState, launchTrim } from "../src/core/launch";
import { setTotalMass, setLongitudinalCG } from "../src/core/editor";
import { massProperties } from "../src/core/aircraft";
import {
  Simulation,
  neutralControls,
  calmEnvironment,
} from "../src/core/simulation";
const a = parseAircraft(bronco);
describe("mass and balance editor", () => {
  it("scales mass and inertia together while retaining CG", () => {
    const p = massProperties(a),
      q = massProperties(setTotalMass(a, p.mass * 2));
    expect(q.mass).toBeCloseTo(p.mass * 2, 10);
    q.cg.forEach((v, i) => expect(v).toBeCloseTo(p.cg[i], 10));
    q.inertia.forEach((row, i) =>
      row.forEach((v, j) => expect(v).toBeCloseTo(p.inertia[i][j] * 2, 10)),
    );
  });
  it("achieves requested CG by moving battery and preserves total mass", () => {
    const out = setLongitudinalCG(a, 0.06),
      p = massProperties(out);
    expect(p.cg[0]).toBeCloseTo(a.reference.leadingEdgeXM - 0.06, 10);
    expect(p.mass).toBeCloseTo(massProperties(a).mass, 10);
    expect(out.parts.find((p) => p.kind === "battery")!.positionM).not.toEqual(
      a.parts.find((p) => p.kind === "battery")!.positionM,
    );
  });
  it("rejects invalid mass and impossible CG", () => {
    expect(() => setTotalMass(a, NaN)).toThrow();
    expect(() => setLongitudinalCG(a, 100)).toThrow();
  });
});
describe("launch and wheel contact", () => {
  it.each([bronco, tiny, raptor, trainer])(
    "releases $id with trim for its hand-launch speed",
    (data) => {
      const model = parseAircraft(data),
        initial = launchState(model, "hand");
      const trim = launchTrim(model, "hand");
      expect(trim.converged).toBe(true);
      const sim = new Simulation(model, calmEnvironment(), initial);
      expect(Math.hypot(...initial.velocity)).toBeCloseTo(8.5, 9);
      expect(initial.motors[0]).toBeCloseTo(trim.controls.throttle, 9);
      for (let i = 0; i < 600; i++) sim.step(trim.controls);
      expect(sim.state.status).toBe("flying");
      expect(-sim.state.position[2]).toBeGreaterThan(1.7);
      expect(sim.state.position[0]).toBeGreaterThan(20);
    },
  );
  it("requires gear for ground launch and fits gear only once", () => {
    expect(() => launchState(a, "ground")).toThrow();
    const g = fitLandingGear(a);
    expect(massProperties(g).mass).toBeCloseTo(0.875, 10);
    expect(fitLandingGear(g)).toEqual(g);
    expect(a.contactPoints.some((p) => p.kind === "wheel")).toBe(false);
  });
  it("holds an unpowered aircraft on its wheels", () => {
    const g = fitLandingGear(a),
      sim = new Simulation(g, calmEnvironment(), launchState(g, "ground"));
    for (let i = 0; i < 1200; i++) sim.step(neutralControls());
    expect(sim.state.status).toBe("grounded");
    expect(Math.abs(sim.state.position[0])).toBeLessThan(0.3);
    expect(sim.state.position[2]).toBeLessThan(-0.15);
    expect(Math.hypot(...sim.state.velocity)).toBeLessThan(0.03);
  });
  it("accelerates and takes off under power", () => {
    const g = fitLandingGear(a),
      sim = new Simulation(g, calmEnvironment(), launchState(g, "ground"));
    for (let i = 0; i < 1200; i++)
      sim.step({ ...neutralControls(), throttle: 0.8, pitch: 0.25 });
    expect(sim.state.status).toBe("flying");
    expect(sim.state.position[0]).toBeGreaterThan(30);
    expect(-sim.state.position[2]).toBeGreaterThan(5);
  });
  it("preserves forward speed at a gentle wheel touchdown", () => {
    const g = fitLandingGear(a),
      s = launchState(g, "ground");
    s.position[2] -= 0.01;
    s.velocity = [6, 0, 0.5];
    s.status = "flying";
    const sim = new Simulation(g, calmEnvironment(), s);
    for (let i = 0; i < 20; i++) sim.step(neutralControls());
    expect(sim.state.status).toBe("grounded");
    expect(sim.state.velocity[0]).toBeGreaterThan(4);
  });
  it("detects a hard wheel impact", () => {
    const g = fitLandingGear(a),
      s = launchState(g, "ground");
    s.velocity = [8, 0, 6];
    s.status = "flying";
    const sim = new Simulation(g, calmEnvironment(), s);
    sim.step(neutralControls());
    expect(sim.state.status).toBe("crashed");
  });
  it("uses distinct hand and trimmed airborne states", () => {
    const hand = launchState(a, "hand"),
      air = launchState(a, "airborne");
    expect(hand.position[2]).toBe(-1.7);
    expect(hand.velocity[2]).toBeLessThan(0);
    expect(air.position[2]).toBe(-22);
    expect(Math.hypot(...air.velocity)).toBeCloseTo(12, 4);
  });
});
