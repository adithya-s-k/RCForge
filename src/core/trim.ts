import type { Aircraft } from "./schema";
import { surfaceCommand } from "./surface-control";
import {
  Simulation,
  initialState,
  calmEnvironment,
  type Controls,
  GRAVITY,
} from "./simulation";
import {
  rotate,
  invert,
  matVec,
  clamp,
  radians,
  type Vec3,
  type Mat3,
} from "./math";
/** Solve longitudinal steady flight only; not an autopilot or a fidelity guarantee. */
export function findTrim(
  a: Aircraft,
  speed = a.reference.trimSpeedMps ?? 12,
  environment = calmEnvironment(),
  flightPathDeg = 0,
) {
  const sim = new Simulation(a, environment);
  if (a.vehicleType === "multirotor") {
    let lo = 0,
      hi = 1;
    const trial = initialState(a, 0, 3, 0);
    for (let n = 0; n < 45; n++) {
      const mid = (lo + hi) / 2;
      trial.motors.fill(mid);
      const f = sim.forces(trial, { roll: 0, pitch: 0, yaw: 0, throttle: mid });
      if (-f.force[2] < sim.properties.mass * GRAVITY) lo = mid;
      else hi = mid;
    }
    const throttle = (lo + hi) / 2,
      controls = { roll: 0, pitch: 0, yaw: 0, throttle: clamp(throttle, 0, 1) },
      state = initialState(a, 0, 3, 0);
    state.motors.fill(controls.throttle);
    const f = sim.forces(state, controls),
      residual: [number, number, number] = [
        f.force[2] + sim.properties.mass * GRAVITY,
        f.torque[0],
        f.torque[1],
      ];
    return {
      controls,
      state,
      converged: throttle < 1 && Math.hypot(...residual) < 0.01,
      residual,
      pitchDeg: 0,
    };
  }
  const flightPath = radians(flightPathDeg);
  const velocity: Vec3 = [
    speed * Math.cos(flightPath),
    0,
    -speed * Math.sin(flightPath),
  ];
  const residual = (x: Vec3): Vec3 => {
    const s = initialState(a, speed, 18, x[0]);
    s.velocity = [...velocity];
    s.motors.fill(x[2]);
    const f = sim.forces(s, { roll: 0, pitch: x[1], yaw: 0, throttle: x[2] });
    const world = rotate(s.orientation, f.force);
    return [world[0], world[2] + sim.properties.mass * GRAVITY, f.torque[1]];
  };
  let x: Vec3 = [3 + flightPathDeg, 0.1, 0.5];
  for (let n = 0; n < 25; n++) {
    const r = residual(x);
    if (Math.hypot(...r) < 1e-5) break;
    const jac: Mat3 = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];
    for (let j = 0; j < 3; j++) {
      const y = [...x] as Vec3;
      y[j] += 0.0001;
      const v = residual(y);
      for (let i = 0; i < 3; i++) jac[i][j] = (v[i] - r[i]) / 0.0001;
    }
    try {
      const dx = matVec(invert(jac), r);
      x = [
        clamp(x[0] - dx[0], -10 + flightPathDeg, 15 + flightPathDeg),
        clamp(x[1] - dx[1], -1, 1),
        clamp(x[2] - dx[2], 0, 1),
      ];
    } catch {
      break;
    }
  }
  const controls: Controls = { roll: 0, pitch: x[1], yaw: 0, throttle: x[2] };
  const state = initialState(a, speed, 18, x[0]);
  state.velocity = [...velocity];
  state.motors.fill(x[2]);
  state.surfaceCommands = a.surfaces.map((s) =>
    s.control ? surfaceCommand(s.control, controls) : 0,
  );
  return {
    controls,
    state,
    converged: Math.hypot(...residual(x)) < 0.01,
    residual: residual(x),
    pitchDeg: x[0],
  };
}
