/** SI units. Right-handed body/world frames: X forward/north, Y right/east, Z down. */
export type Vec3 = [number, number, number];
export type Quat = [number, number, number, number]; // x, y, z, w; body to world
export const add = (a: Vec3, b: Vec3): Vec3 => [
  a[0] + b[0],
  a[1] + b[1],
  a[2] + b[2],
];
export const sub = (a: Vec3, b: Vec3): Vec3 => [
  a[0] - b[0],
  a[1] - b[1],
  a[2] - b[2],
];
export const scale = (a: Vec3, s: number): Vec3 => [
  a[0] * s,
  a[1] * s,
  a[2] * s,
];
export const dot = (a: Vec3, b: Vec3) =>
  a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const length = (a: Vec3) => Math.hypot(...a);
export const unit = (a: Vec3): Vec3 => scale(a, 1 / (length(a) || 1));
export const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));
export const radians = (d: number) => (d * Math.PI) / 180;
export const degrees = (r: number) => (r * 180) / Math.PI;
export const mulQ = (a: Quat, b: Quat): Quat => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
  a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
];
export const normalizeQ = (q: Quat): Quat => {
  const n = Math.hypot(...q);
  return q.map((v) => v / n) as Quat;
};
export const inverseQ = (q: Quat): Quat => [-q[0], -q[1], -q[2], q[3]];
export const rotate = (q: Quat, v: Vec3): Vec3 => {
  const t = scale(cross([q[0], q[1], q[2]], v), 2);
  return add(v, add(scale(t, q[3]), cross([q[0], q[1], q[2]], t)));
};
export const axisQ = (axis: Vec3, angle: number): Quat => [
  ...scale(unit(axis), Math.sin(angle / 2)),
  Math.cos(angle / 2),
];
export const advanceQ = (q: Quat, omega: Vec3, dt: number): Quat =>
  normalizeQ(mulQ(q, axisQ(omega, length(omega) * dt)));
export const euler = (q: Quat): Vec3 => [
  Math.atan2(2 * (q[3] * q[0] + q[1] * q[2]), 1 - 2 * (q[0] ** 2 + q[1] ** 2)),
  Math.asin(clamp(2 * (q[3] * q[1] - q[2] * q[0]), -1, 1)),
  Math.atan2(2 * (q[3] * q[2] + q[0] * q[1]), 1 - 2 * (q[1] ** 2 + q[2] ** 2)),
];
export type Mat3 = [Vec3, Vec3, Vec3];
export const matVec = (m: Mat3, v: Vec3): Vec3 => [
  dot(m[0], v),
  dot(m[1], v),
  dot(m[2], v),
];
export const invert = (m: Mat3): Mat3 => {
  const a = cross(m[1], m[2]),
    b = cross(m[2], m[0]),
    c = cross(m[0], m[1]);
  const d = dot(m[0], a);
  if (Math.abs(d) < 1e-12) throw new Error("Singular inertia tensor");
  return [
    [a[0] / d, b[0] / d, c[0] / d],
    [a[1] / d, b[1] / d, c[1] / d],
    [a[2] / d, b[2] / d, c[2] / d],
  ];
};
