import { calmEnvironment } from "./simulation";
import type { Aircraft } from "./schema";
import { launchState, type LaunchMode } from "./launch";
import { axisQ, mulQ, radians, rotate } from "./math";
export interface Placement {
  northM: number;
  eastM: number;
  altitudeM: number;
  headingDeg: number;
}
export function validatePlacement(p: Placement) {
  if (
    ![p.northM, p.eastM, p.altitudeM, p.headingDeg].every(Number.isFinite) ||
    Math.abs(p.northM) > 2000 ||
    Math.abs(p.eastM) > 2000 ||
    p.altitudeM < 0.3 ||
    p.altitudeM > 1000 ||
    p.headingDeg < 0 ||
    p.headingDeg > 360
  )
    throw new Error(
      "Position must be within ±2000 m, height 0.3–1000 m, and heading 0–360°.",
    );
  return p;
}
/** Translate and yaw the complete launch state, including velocity; ground height is wheel/foot clearance. */
export function placedLaunch(
  a: Aircraft,
  mode: LaunchMode,
  p: Placement | null,
  environment = calmEnvironment(),
) {
  const s = launchState(a, mode, environment);
  if (!p) return s;
  validatePlacement(p);
  const yaw = axisQ([0, 0, 1], radians(p.headingDeg));
  s.position[0] = p.northM;
  s.position[1] = p.eastM;
  if (mode !== "ground") s.position[2] = -p.altitudeM;
  s.orientation = mulQ(yaw, s.orientation);
  s.velocity = rotate(yaw, s.velocity);
  return s;
}
