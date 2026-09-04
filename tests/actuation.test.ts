import { expect, it } from "vitest";
import raptor from "../aircraft/ft-22-raptor.json";
import { parseAircraft } from "../src/core/schema";
import { surfaceActuation } from "../src/core/actuation";
import {
  Simulation,
  initialState,
  neutralControls,
} from "../src/core/simulation";
import { findTrim } from "../src/core/trim";
import { createRecording, replayRecording } from "../src/core/experiment";
import { massProperties } from "../src/core/aircraft";
it("sets FT-22 elevon authority through physical travel and horn ratio", () => {
  const a = parseAircraft(raptor),
    w = a.surfaces.find((s) => s.control)!,
    c = w.control!,
    servo = a.parts.find((p) => p.id === c.linkage!.servoPartId)!;
  expect(c.maxDeg).toBe(40);
  expect(surfaceActuation(a, w).maxDeg).toBeCloseTo(40, 10);
  expect(surfaceActuation(a, w).rateLimitDegS).toBeCloseTo(480, 10);
  servo.servo!.speedSecondsPer60Deg = 0.2;
  expect(surfaceActuation(a, w).rateLimitDegS).toBeCloseTo(240, 10);
  c.linkage!.surfaceArmM *= 2;
  expect(surfaceActuation(a, w).maxDeg).toBeCloseTo(20, 10);
  expect(surfaceActuation(a, w).rateLimitDegS).toBeCloseTo(120, 10);
});
it("limits the first control step instead of teleporting a servo to its target", () => {
  const a = parseAircraft(raptor),
    i = a.surfaces.findIndex((s) => s.control),
    w = a.surfaces[i];
  a.parts.find(
    (p) => p.id === w.control!.linkage!.servoPartId,
  )!.servo!.speedSecondsPer60Deg = 1;
  const sim = new Simulation(a, undefined, initialState(a, 12, 100)),
    recording = createRecording(sim),
    c = { ...neutralControls(), pitch: 1 };
  sim.step(c);
  recording.frames.push(c);
  const deflection =
    Math.abs(sim.state.surfaceCommands![i]) * sim.actuations[i].maxDeg;
  expect(deflection).toBeGreaterThan(0);
  expect(deflection).toBeLessThanOrEqual(
    sim.actuations[i].rateLimitDegS / 120 + 1e-10,
  );
  expect(replayRecording(recording)).toEqual(sim.state);
  const trim = findTrim(a);
  expect(trim.converged).toBe(true);
  expect(trim.state.surfaceCommands![i]).toBeCloseTo(-trim.controls.pitch, 10);
});
it("counts servo replacement mass once and rejects impossible actuator assignments", () => {
  const a = parseAircraft(raptor),
    p = a.parts.find((p) => p.servo)!,
    before = massProperties(a);
  p.massKg += 0.0044;
  expect(massProperties(a).mass - before.mass).toBeCloseTo(0.0044, 12);
  expect(massProperties(a).cg[1]).not.toBeCloseTo(before.cg[1], 6);
  const c = a.surfaces.find((s) => s.control)!.control!;
  c.linkage!.servoTravelDeg = 90;
  expect(() => parseAircraft(a)).toThrow(/rated range/);
  c.linkage!.servoTravelDeg = 25;
  c.linkage!.servoPartId = "battery";
  expect(() => parseAircraft(a)).toThrow(/servo mass component/);
});
