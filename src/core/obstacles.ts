import { z } from "zod";
import type { Aircraft } from "./schema";
import type { State } from "./simulation";
import {
  add,
  sub,
  scale,
  rotate,
  axisQ,
  mulQ,
  radians,
  length,
  type Vec3,
} from "./math";

const coordinate = z.number().finite().min(-100000).max(100000);
const vector = z.tuple([coordinate, coordinate, coordinate]);
export const ObstacleSchema = z
  .object({
    id: z.string().min(1).max(120),
    shape: z.enum(["box", "ellipsoid"]),
    center: vector,
    halfSize: z.tuple([
      z.number().positive().max(200),
      z.number().positive().max(200),
      z.number().positive().max(200),
    ]),
  })
  .strict();
export const ObstaclesSchema = z.array(ObstacleSchema).max(2048);
export type Obstacle = z.infer<typeof ObstacleSchema>;
type Probe = { center: Vec3; radius: number };

/** Installed part envelopes, relative to CG. Closely spaced spheres form capsules.
 * Includes the wing span and moved components, rather than only testing the CG. */
export function aircraftCollisionProbes(a: Aircraft, cg: Vec3): Probe[] {
  return a.parts.flatMap((p) => {
    const angles = p.orientationDeg ?? [0, 0, 0];
    const q = mulQ(
      axisQ([0, 0, 1], radians(angles[2])),
      mulQ(
        axisQ([0, 1, 0], radians(angles[1])),
        axisQ([1, 0, 0], radians(angles[0])),
      ),
    );
    const axis = p.sizeM.indexOf(Math.max(...p.sizeM));
    const other = p.sizeM.filter((_, i) => i !== axis);
    const radius = Math.max(0.008, Math.hypot(...other) / 2);
    const extent = Math.max(0, p.sizeM[axis] / 2 - radius * 0.5);
    const steps = Math.max(1, Math.min(32, Math.ceil((2 * extent) / radius)));
    return Array.from({ length: steps + 1 }, (_, i) => {
      const offset: Vec3 = [0, 0, 0];
      offset[axis] = -extent + (2 * extent * i) / steps;
      return { center: sub(add(p.positionM, rotate(q, offset)), cg), radius };
    });
  });
}

/** Swept sphere / inflated primitive intersection. Returns first impact fraction. */
export function obstacleHit(
  from: Vec3,
  to: Vec3,
  radius: number,
  o: Obstacle,
): number | null {
  const p = sub(from, o.center),
    d = sub(to, from);
  const h = o.halfSize.map((v) => v + radius) as Vec3;
  if (o.shape === "ellipsoid") {
    const c = p.reduce((s, v, i) => s + (v / h[i]) ** 2, -1);
    if (c <= 0) return 0;
    const a = d.reduce((s, v, i) => s + (v / h[i]) ** 2, 0);
    const b = 2 * p.reduce((s, v, i) => s + (v * d[i]) / h[i] ** 2, 0);
    const disc = b * b - 4 * a * c;
    if (a < 1e-15 || disc < 0) return null;
    const t = (-b - Math.sqrt(disc)) / (2 * a);
    return t >= 0 && t <= 1 ? t : null;
  }
  let enter = 0,
    exit = 1;
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-12) {
      if (Math.abs(p[i]) > h[i]) return null;
    } else {
      const a = (-h[i] - p[i]) / d[i],
        b = (h[i] - p[i]) / d[i];
      enter = Math.max(enter, Math.min(a, b));
      exit = Math.min(exit, Math.max(a, b));
      if (enter > exit) return null;
    }
  }
  return enter;
}

/** Immutable field snapshot with cheap aircraft-envelope broad phase. No render dependency. */
export class ObstacleCollisions {
  private probes: Probe[];
  private radius: number;
  constructor(a: Aircraft, cg: Vec3) {
    this.probes = aircraftCollisionProbes(a, cg);
    this.radius = Math.max(
      ...this.probes.map((p) => length(p.center) + p.radius),
    );
  }
  resolve(before: State, after: State, obstacles: readonly Obstacle[]) {
    let first = Infinity;
    for (const o of obstacles) {
      if (
        obstacleHit(before.position, after.position, this.radius, {
          ...o,
          shape: "box",
        }) === null
      )
        continue;
      for (const p of this.probes) {
        const start = add(
          before.position,
          rotate(before.orientation, p.center),
        );
        const end = add(after.position, rotate(after.orientation, p.center));
        const hit = obstacleHit(start, end, p.radius, o);
        if (hit !== null) first = Math.min(first, hit);
      }
    }
    if (!Number.isFinite(first)) return false;
    after.position = add(
      before.position,
      scale(sub(after.position, before.position), Math.max(0, first - 1e-5)),
    );
    after.status = "crashed";
    after.velocity = [0, 0, 0];
    after.omega = [0, 0, 0];
    after.motors.fill(0);
    return true;
  }
}
