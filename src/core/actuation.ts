import type { Aircraft } from "./schema";

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
