import type { Aircraft } from "./schema";
import type { State, Controls } from "./simulation";
import type { massProperties } from "./aircraft";
import {
  add,
  sub,
  scale,
  cross,
  dot,
  rotate,
  inverseQ,
  matVec,
  unit,
  clamp,
  length,
  type Vec3,
} from "./math";
/** Sequential point impulses with wheel rolling/lateral friction. Flat terrain at world Z=0. */
export function resolveGroundContacts(
  s: State,
  a: Aircraft,
  properties: ReturnType<typeof massProperties>,
  c: Controls,
  dt: number,
  surface: "asphalt" | "grass" | "dirt" = "asphalt",
) {
  const lateralFriction =
    surface === "grass" ? 0.5 : surface === "dirt" ? 0.55 : 0.65;
  const rollingFriction =
    surface === "grass" ? 0.09 : surface === "dirt" ? 0.055 : 0.025;
  const { mass, cg, inverseInertia } = properties;
  const bodyToWorld = (v: Vec3) => rotate(s.orientation, v),
    worldToBody = (v: Vec3) => rotate(inverseQ(s.orientation), v);
  const inverseWorld = (v: Vec3) =>
    bodyToWorld(matVec(inverseInertia, worldToBody(v)));
  const pointVelocity = (r: Vec3) =>
    add(s.velocity, bodyToWorld(cross(s.omega, worldToBody(r))));
  const apply = (r: Vec3, impulse: Vec3) => {
    s.velocity = add(s.velocity, scale(impulse, 1 / mass));
    s.omega = add(
      s.omega,
      matVec(inverseInertia, worldToBody(cross(r, impulse))),
    );
  };
  const effectiveMass = (r: Vec3, n: Vec3) =>
    1 / mass + dot(n, cross(inverseWorld(cross(r, n)), r));
  const contacts = a.contactPoints.map((p) => {
    const r = bodyToWorld(sub(p.positionM, cg));
    return { p, r, depth: add(s.position, r)[2] };
  });
  const touching = contacts.filter((v) => v.depth >= -0.001);
  if (!touching.length) {
    s.status = "flying";
    return;
  }
  const hard = touching.some(
    (v) =>
      v.depth >= 0 &&
      (pointVelocity(v.r)[2] > (v.p.kind !== "body" ? 4 : 2.2) ||
        (v.p.kind === "body" && length(s.velocity) > 3)),
  );
  const body = touching.find((v) => v.depth >= 0 && v.p.kind === "body");
  if (hard || body) {
    const up = bodyToWorld([0, 0, -1]);
    s.status = !hard && up[2] < -0.9 ? "landed" : "crashed";
    s.position[2] -= Math.max(0, ...touching.map((v) => v.depth));
    s.velocity = [0, 0, 0];
    s.omega = [0, 0, 0];
    s.motors.fill(0);
    return;
  }
  s.status = "grounded";
  const wheels = touching.filter((v) => v.p.kind !== "body");
  for (let iteration = 0; iteration < 8; iteration++)
    for (const wheel of wheels) {
      const { r, p, depth } = wheel,
        n: Vec3 = [0, 0, -1];
      let velocity = pointVelocity(r);
      const bias = (Math.max(0, depth - 0.0001) * 0.15) / dt;
      const j = Math.max(0, (-dot(velocity, n) + bias) / effectiveMass(r, n));
      apply(r, scale(n, j));
      const steer = p.steering ? c.yaw * 0.45 : 0;
      const bodyForward = bodyToWorld([Math.cos(steer), Math.sin(steer), 0]);
      const forward = unit([bodyForward[0], bodyForward[1], 0]),
        side: Vec3 = [-forward[1], forward[0], 0];
      velocity = pointVelocity(r);
      const lateral = clamp(
        -dot(velocity, side) / effectiveMass(r, side),
        -lateralFriction * j,
        lateralFriction * j,
      );
      apply(r, scale(side, lateral));
      velocity = pointVelocity(r);
      const roll = clamp(
        -dot(velocity, forward) / effectiveMass(r, forward),
        -(p.kind === "skid" ? lateralFriction : rollingFriction) * j,
        (p.kind === "skid" ? lateralFriction : rollingFriction) * j,
      );
      apply(r, scale(forward, roll));
    }
  const depth = Math.max(0, ...wheels.map((v) => v.depth));
  s.position[2] -= depth * 0.65;
}
