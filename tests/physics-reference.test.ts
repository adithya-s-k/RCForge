import { describe, expect, it } from "vitest";
import bronco from "../aircraft/ft-bronco.json";
import { parseAircraft } from "../src/core/schema";
import { referenceCases, runLocal } from "../scripts/reference/cases";
import { compareCase, validateCoverage } from "../scripts/reference/compare";

const cases = referenceCases([parseAircraft(bronco)]);
const hash = "a".repeat(64);
// Synthetic report data tests the comparison machinery, not engine agreement.
// The separate CI job executes real JSBSim; these tests do not require Python.
const sample = () => ({
  engine: "JSBSim",
  version: "1.3.1",
  upstreamCommit: "3b25f25e49b42d0489c04ac805674fc1450ca579",
  requestSHA256: hash,
  cases: cases.map((c) => runLocal(c)),
});

describe("independent-reference comparison contracts", () => {
  it("retains source mass/geometry while explicitly isolating subsystems", () => {
    const source = parseAircraft(bronco),
      generated = referenceCases([source]);
    expect(generated[0].aircraft.parts).toEqual(source.parts);
    expect(generated[0].aircraft.surfaces).toEqual(source.surfaces);
    expect(generated[0].aircraft.motors).toEqual([]);
    expect(source.motors.length).toBeGreaterThan(0);
    expect(
      generated.find((c) => c.mode === "propulsion")!.aircraft.motors,
    ).toEqual(source.motors);
    expect(
      generated.find((c) => c.id.endsWith("moved-component"))!.aircraft.parts,
    ).not.toEqual(source.parts);
  });
  it("rejects empty, incomplete, duplicate and stale reference output", () => {
    for (const edit of [
      (r: ReturnType<typeof sample>) => {
        r.cases = [];
      },
      (r: ReturnType<typeof sample>) => {
        r.cases.pop();
      },
      (r: ReturnType<typeof sample>) => {
        r.cases[1] = r.cases[0];
      },
      (r: ReturnType<typeof sample>) => {
        r.requestSHA256 = "b".repeat(64);
      },
      (r: ReturnType<typeof sample>) => {
        r.cases[0].loads.pop();
      },
    ]) {
      const r = sample();
      edit(r);
      expect(() => validateCoverage(cases, r, hash)).toThrow();
    }
  });
  it("rejects nonfinite values, incomplete trajectories and unaligned samples", () => {
    const r = sample();
    r.cases[0].loads[0].force[0] = NaN;
    expect(() => validateCoverage(cases, r, hash)).toThrow();
    const shifted = sample();
    shifted.cases[1].trajectory[1].time += 0.01;
    expect(() => validateCoverage(cases, shifted, hash)).toThrow(/Unaligned/);
    const incomplete = sample();
    incomplete.cases[1].trajectory.pop();
    expect(() => validateCoverage(cases, incomplete, hash)).toThrow(/length/);
  });
  it("fails when a reference force, moment or center of gravity disagrees", () => {
    for (const target of ["force", "torque", "cg"] as const) {
      const r = validateCoverage(cases, sample(), hash).cases[0];
      if (target === "cg") r.mass.cg[0] += 0.01;
      else r.loads[0][target][0] += 0.01;
      expect(compareCase(cases[0], r).pass).toBe(false);
    }
  });
  it("detects a materially incorrect flight path even when static loads agree", () => {
    const r = validateCoverage(cases, sample(), hash).cases[1];
    r.trajectory.at(-1)!.position[2] += 0.1;
    expect(compareCase(cases[1], r).pass).toBe(false);
  });
});
