import type { Aircraft } from "./schema";
import { clamp } from "./math";

/** One servo step, shared by flight and the stationary control-test bench. */
export function advanceSurfaceCommand(
  previous: number,
  target: number,
  actuator: ReturnType<typeof surfaceActuation>,
  dt: number,
) {
  const change =
    (target - previous) *
    (actuator.responseSeconds
      ? 1 - Math.exp(-dt / actuator.responseSeconds)
      : 1);
  const limit =
    (actuator.rateLimitDegS * dt) / Math.max(0.001, actuator.maxDeg);
  return previous + clamp(change, -limit, limit);
}

/** Small-angle, rigid pushrod approximation. Horn ratio couples travel and speed.
 * Rated servo torque is metadata until measured hinge-load data is supplied. */
export function surfaceActuation(
  a: Aircraft,
  surface: Aircraft["surfaces"][number],
) {
  const c = surface.control;
  let maxDeg = c?.maxDeg ?? 0;
  let rateLimitDegS = c?.rateLimitDegS ?? Infinity;
  const linkage = c?.linkage;
  if (linkage) {
    const servo = a.parts.find((p) => p.id === linkage.servoPartId)!.servo!;
    const ratio = linkage.servoArmM / linkage.surfaceArmM;
    maxDeg = Math.min(maxDeg, linkage.servoTravelDeg * ratio);
    rateLimitDegS = Math.min(
      rateLimitDegS,
      (60 / servo.speedSecondsPer60Deg) * ratio,
    );
  }
  return { maxDeg, rateLimitDegS, responseSeconds: c?.responseSeconds ?? 0 };
}
