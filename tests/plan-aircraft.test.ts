import { it, expect } from "vitest";
import bronco from "../aircraft/ft-bronco.json";
import tiny from "../aircraft/ft-tiny-trainer.json";
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
