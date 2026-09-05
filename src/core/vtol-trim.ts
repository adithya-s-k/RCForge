import type { Aircraft } from "./schema";
import {
  Simulation,
  initialState,
  calmEnvironment,
  GRAVITY,
  type Controls,
} from "./simulation";
import { vtolMotorIndices } from "./vtol";
import { axisQ, mulQ, radians, rotate, clamp } from "./math";

/** Six physical equilibrium unknowns: roll, pitch, three motor commands and
 * rear yaw tilt. This solves hover forces/torques, not a controller response. */
export function findVtolHoverTrim(
  a: Aircraft,
  environment = calmEnvironment(),
) {
  const sim = new Simulation(a, environment),
    ids = vtolMotorIndices(a);
  const controls: Controls = {
    roll: 0,
    pitch: 0,
    yaw: 0,
    throttle: 0.5,
    vtol: { mode: "hover", assistance: a.vtol!.defaultAssistance },
  };
  const stateFor = (x: number[]) => {
    const s = initialState(a, 0, 3, 0);
    s.orientation = mulQ(
      axisQ([0, 1, 0], radians(x[1])),
      axisQ([1, 0, 0], radians(x[0])),
    );
    ids.forEach((id, i) => (s.motors[id] = x[i + 2]));
    s.vtol!.rearTiltDeg = x[5];
    s.surfaceCommands = a.surfaces.map(() => 0);
    return s;
  };
  const residual = (x: number[]) => {
    const s = stateFor(x),
      f = sim.forces(s, controls),
      world = rotate(s.orientation, f.force);
    return [
      world[0],
      world[1],
      world[2] + sim.properties.mass * GRAVITY,
      ...f.torque,
    ];
  };
  let x = [0, 0, 0.75, 0.75, 0.65, -4];
  for (let iteration = 0; iteration < 35; iteration++) {
    const r = residual(x);
    if (Math.hypot(...r) < 1e-7) break;
    const matrix = r.map((v) => [0, 0, 0, 0, 0, 0, v]);
    for (let j = 0; j < 6; j++) {
      const y = [...x];
      y[j] += 0.0001;
      const f = residual(y);
      for (let i = 0; i < 6; i++) matrix[i][j] = (f[i] - r[i]) / 0.0001;
    }
    let singular = false;
    for (let j = 0; j < 6; j++) {
      let pivot = j;
      for (let i = j + 1; i < 6; i++)
        if (Math.abs(matrix[i][j]) > Math.abs(matrix[pivot][j])) pivot = i;
      [matrix[pivot], matrix[j]] = [matrix[j], matrix[pivot]];
      const divisor = matrix[j][j];
      if (Math.abs(divisor) < 1e-9) {
        singular = true;
        break;
      }
      for (let k = j; k <= 6; k++) matrix[j][k] /= divisor;
      for (let i = 0; i < 6; i++)
        if (i !== j) {
          const scale = matrix[i][j];
          for (let k = j; k <= 6; k++) matrix[i][k] -= scale * matrix[j][k];
        }
    }
    if (singular) break;
    x = x.map((v, i) =>
      clamp(
        v - matrix[i][6],
        i < 2 ? -15 : i < 5 ? 0 : -a.vtol!.yawTiltDeg,
        i < 2 ? 15 : i < 5 ? 1 : a.vtol!.yawTiltDeg,
      ),
    );
  }
  const r = residual(x);
  return {
    controls,
    state: stateFor(x),
    residual: r,
    converged: Math.hypot(...r) < 0.01,
    pitchDeg: x[1],
  };
}
