import { z } from "zod";
import { axisQ, mulQ, type Vec3 } from "../../src/core/math";
import { runLocal, type ReferenceCase } from "./cases";

const finite = z.number().finite();
const vec = z.tuple([finite, finite, finite]);
const sample = z.object({
  time: finite,
  position: vec,
  velocity: vec,
  omega: vec,
  attitude: vec,
});
const resultCase = z.object({
  id: z.string(),
  mass: z.object({
    mass: finite.positive(),
    cg: vec,
    inertia: z.tuple([vec, vec, vec]),
  }),
  loads: z.array(z.object({ force: vec, torque: vec })),
  trajectory: z.array(sample),
});
export const referenceSchema = z.object({
  engine: z.literal("JSBSim"),
  version: z.literal("1.3.1"),
  upstreamCommit: z.literal("3b25f25e49b42d0489c04ac805674fc1450ca579"),
  requestSHA256: z.string().regex(/^[a-f0-9]{64}$/),
  cases: z.array(resultCase).min(1),
});
export type ReferenceOutput = z.infer<typeof referenceSchema>;
export interface Metric {
  name: string;
  value: number;
  limit: number;
  pass: boolean;
}
export interface CaseComparison {
  id: string;
  pass: boolean;
  metrics: Metric[];
}
const norm = (a: number[], b: number[]) =>
  Math.hypot(...a.map((x, i) => x - b[i]));
function attitudeError(a: Vec3, b: Vec3) {
  const q = (e: Vec3) =>
    mulQ(
      axisQ([0, 0, 1], e[2]),
      mulQ(axisQ([0, 1, 0], e[1]), axisQ([1, 0, 0], e[0])),
    );
  const qa = q(a),
    qb = q(b);
  return (
    2 *
    Math.acos(Math.min(1, Math.abs(qa.reduce((v, x, i) => v + x * qb[i], 0))))
  );
}

export function validateCoverage(
  cases: ReferenceCase[],
  input: unknown,
  hash: string,
) {
  const result = referenceSchema.parse(input);
  if (result.requestSHA256 !== hash)
    throw new Error("Reference input digest mismatch");
  if (
    result.cases.length !== cases.length ||
    new Set(result.cases.map((c) => c.id)).size !== cases.length
  )
    throw new Error("Missing, extra or duplicate reference cases");
  for (const c of cases) {
    const r = result.cases.find((r) => r.id === c.id);
    if (!r || r.loads.length !== c.conditions.length)
      throw new Error(`Missing load samples: ${c.id}`);
    const count = c.duration ? Math.round(c.duration / c.samplePeriod) + 1 : 0;
    if (r.trajectory.length !== count)
      throw new Error(`Wrong trajectory length: ${c.id}`);
    r.trajectory.forEach((s, i) => {
      if (Math.abs(s.time - i * c.samplePeriod) > 1e-8)
        throw new Error(`Unaligned sample time: ${c.id}`);
    });
  }
  return result;
}

function trajectoryError(
  a: ReturnType<typeof runLocal>["trajectory"],
  b: z.infer<typeof resultCase>["trajectory"],
  key: "position" | "velocity" | "omega" | "attitude",
) {
  return Math.max(
    ...a.map((s, i) =>
      key === "attitude"
        ? attitudeError(s.attitude, b[i].attitude)
        : norm(s[key], b[i][key]),
    ),
  );
}

export function compareCase(
  c: ReferenceCase,
  reference: z.infer<typeof resultCase>,
): CaseComparison {
  const a = runLocal(c),
    metrics: Metric[] = [];
  const record = (name: string, value: number, limit: number) =>
    metrics.push({
      name,
      value,
      limit,
      pass: Number.isFinite(value) && value <= limit,
    });
  record("Mass error (kg)", Math.abs(a.mass.mass - reference.mass.mass), 1e-10);
  record("CG error (m)", norm(a.mass.cg, reference.mass.cg), 1e-10);
  record(
    "Inertia tensor error (kg m²)",
    norm(a.mass.inertia.flat(), reference.mass.inertia.flat()),
    1e-10,
  );
  record(
    "Maximum force error (N)",
    Math.max(...a.loads.map((f, i) => norm(f.force, reference.loads[i].force))),
    1e-8,
  );
  record(
    "Maximum moment error (Nm)",
    Math.max(
      ...a.loads.map((f, i) => norm(f.torque, reference.loads[i].torque)),
    ),
    1e-8,
  );
  if (c.duration) {
    const fine = runLocal(c, 1 / 240);
    const limits = {
      position: 0.005,
      velocity: 0.005,
      omega: 0.01,
      attitude: 0.002,
    };
    for (const key of ["position", "velocity", "omega", "attitude"] as const) {
      const error = trajectoryError(a.trajectory, reference.trajectory, key);
      record(
        `Maximum ${key} error (${key === "position" ? "m" : key === "velocity" ? "m/s" : key === "omega" ? "rad/s" : "rad"})`,
        error,
        limits[key],
      );
      // Fine-step agreement must improve; 20 µ-units allows reference sphere,
      // ECEF cancellation and near-zero quaternion angle roundoff (documented).
      record(
        `240 Hz ${key} convergence`,
        trajectoryError(fine.trajectory, reference.trajectory, key),
        error * 0.7 + 2e-5,
      );
    }
  }
  return { id: c.id, pass: metrics.every((m) => m.pass), metrics };
}

export function compareReferenceResolution(
  c: ReferenceCase,
  coarse: z.infer<typeof resultCase>,
  fine: z.infer<typeof resultCase>,
): Metric[] {
  if (!c.duration) return [];
  return (["position", "velocity", "omega", "attitude"] as const).map((key) => {
    const value = trajectoryError(coarse.trajectory, fine.trajectory, key);
    const limit = key === "position" ? 2e-5 : 1e-5;
    return {
      name: `JSBSim 3840/7680 Hz ${key} convergence`,
      value,
      limit,
      pass: Number.isFinite(value) && value <= limit,
    };
  });
}
