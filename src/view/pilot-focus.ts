/** A real camera lens change, never an aircraft scale or depth override. */
export function focusedPilotFov(
  baseFov: number,
  spanM: number,
  distanceM: number,
  tracking: boolean,
) {
  if (!tracking) return baseFov;
  // Retain peripheral ground cues nearby. At distance, smoothly approach at most
  // 1.8x focal length; tiny distant aircraft still have honest angular size limits.
  const distanceInSpans = distanceM / Math.max(0.1, spanM);
  const t = Math.max(0, Math.min(1, (distanceInSpans - 35) / 145));
  if (t === 0) return baseFov;
  const magnification = 1 + 0.8 * t * t * (3 - 2 * t);
  return (
    (2 * Math.atan(Math.tan((baseFov * Math.PI) / 360) / magnification) * 180) /
    Math.PI
  );
}
