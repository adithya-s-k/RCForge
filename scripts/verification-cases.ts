import type { Aircraft } from "../src/core/schema";
import {
  Simulation,
  initialState,
  neutralControls,
  GRAVITY,
  calmEnvironment,
  type State,
} from "../src/core/simulation";
import { findTrim } from "../src/core/trim";
import {
  add,
  sub,
  scale,
  cross,
  dot,
  length,
  rotate,
  matVec,
  axisQ,
  mulQ,
  normalizeQ,
  type Vec3,
  type Quat,
} from "../src/core/math";
export interface Check {
  aircraft: string;
  check: string;
  pass: boolean;
  metric: number;
  limit: number;
}
export function extraChecks(a: Aircraft): Check[] {
  const checks: Check[] = [],
    record = (check: string, metric: number, limit: number) =>
      checks.push({
        aircraft: a.id,
        check,
        pass: Number.isFinite(metric) && metric <= limit,
        metric,
        limit,
      });
  const vacuum = structuredClone(a);
  vacuum.surfaces = [];
  vacuum.motors = [];
  vacuum.fuselageDragAreaM2 = 0;
  vacuum.angularDamping = [0, 0, 0];
  const spin = initialState(vacuum, 0, 10000, 0);
  spin.omega = [0.8, 1.1, -0.6];
  const tumbling = new Simulation(vacuum, calmEnvironment(), spin),
    I = tumbling.properties.inertia;
  const momentum = (s: State) => rotate(s.orientation, matVec(I, s.omega)),
    energy = (s: State) => 0.5 * dot(s.omega, matVec(I, s.omega)),
    h0 = momentum(spin),
    e0 = energy(spin);
  for (let i = 0; i < 2400; i++) tumbling.step(neutralControls());
  record(
    "Torque-free angular momentum relative error, 20 s",
    length(sub(momentum(tumbling.state), h0)) / length(h0),
    0.001,
  );
  record(
    "Torque-free rotational energy relative error, 20 s",
    Math.abs(energy(tumbling.state) - e0) / e0,
    0.001,
  );
  vacuum.fuselageDragAreaM2 = 0.025;
  const falling = new Simulation(
    vacuum,
    calmEnvironment(),
    initialState(vacuum, 0, 10000, 0),
  );
  for (let i = 0; i < 1200; i++) falling.step(neutralControls());
  const terminal = Math.sqrt(
      (2 * falling.properties.mass * GRAVITY) / (1.225 * 0.025),
    ),
    v = terminal * Math.tanh((GRAVITY * 10) / terminal),
    z =
      -10000 +
      (terminal ** 2 / GRAVITY) *
        Math.log(Math.cosh((GRAVITY * 10) / terminal));
  record(
    "Analytical quadratic-drag fall velocity error (m/s)",
    Math.abs(falling.state.velocity[2] - v),
    0.001,
  );
  record(
    "Analytical quadratic-drag fall position error (m)",
    Math.abs(falling.state.position[2] - z),
    0.002,
  );
  const trim = findTrim(a),
    base = new Simulation(a, calmEnvironment(), trim.state),
    turned = structuredClone(trim.state),
    q = axisQ([0, 0, 1], 1.17);
  turned.position = rotate(q, turned.position);
  turned.velocity = rotate(q, turned.velocity);
  turned.orientation = mulQ(q, turned.orientation);
  const other = new Simulation(a, calmEnvironment(), turned);
  for (let i = 0; i < 480; i++) {
    const c = { ...trim.controls, roll: 0.08 };
    base.step(c);
    other.step(c);
  }
  record(
    "Yaw-coordinate invariance position error (m)",
    length(sub(other.state.position, rotate(q, base.state.position))),
    1e-7,
  );
  if (a.vehicleType === "fixed-wing") {
    const lagState = initialState(a, 0, 10000, 0);
    lagState.motors.fill(0);
    const lag = new Simulation(a, calmEnvironment(), lagState);
    for (let i = 0; i < 120; i++)
      lag.step({ ...neutralControls(), throttle: 0.4 });
    record(
      "Analytical motor first-order response error",
      Math.max(
        ...a.motors.map((m, i) =>
          Math.abs(
            lag.state.motors[i] - 0.4 * (1 - Math.exp(-1 / m.responseSeconds)),
          ),
        ),
      ),
      1e-12,
    );
    // Independent integration implementation; shares the aerodynamic force function explicitly.
    const c = { ...trim.controls, roll: 0.1 },
      reference = new Simulation(a),
      pack = (s: State) => [
        ...s.position,
        ...s.velocity,
        ...s.omega,
        ...s.orientation,
      ];
    const state = (v: number[]): State => ({
      ...structuredClone(trim.state),
      position: v.slice(0, 3) as Vec3,
      velocity: v.slice(3, 6) as Vec3,
      omega: v.slice(6, 9) as Vec3,
      orientation: normalizeQ(v.slice(9, 13) as Quat),
    });
    const derivative = (v: number[]) => {
      const s = state(v),
        f = reference.forces(s, c),
        accel = add(
          scale(rotate(s.orientation, f.force), 1 / reference.properties.mass),
          [0, 0, GRAVITY],
        ),
        alpha = matVec(
          reference.properties.inverseInertia,
          sub(
            f.torque,
            cross(s.omega, matVec(reference.properties.inertia, s.omega)),
          ),
        ),
        qd = mulQ(s.orientation, [...s.omega, 0] as Quat).map((x) => x * 0.5);
      return [...s.velocity, ...accel, ...alpha, ...qd];
    };
    let v = pack(trim.state);
    const dt = 1 / 1000;
    for (let i = 0; i < 2000; i++) {
      const k1 = derivative(v),
        k2 = derivative(v.map((x, j) => x + (dt * k1[j]) / 2)),
        k3 = derivative(v.map((x, j) => x + (dt * k2[j]) / 2)),
        k4 = derivative(v.map((x, j) => x + dt * k3[j]));
      v = v.map(
        (x, j) => x + (dt * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j])) / 6,
      );
    }
    const regular = new Simulation(a, calmEnvironment(), trim.state);
    for (let i = 0; i < 240; i++) regular.step(c);
    record(
      "Separate RK4 integrator, shared forces: position error (m)",
      length(sub(regular.state.position, state(v).position)),
      0.01,
    );
  }
  return checks;
}
