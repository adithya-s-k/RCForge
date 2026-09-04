import { channels, type Channel, type ControllerProfile } from "./controls";
/** Exchange whole bindings so calibration stays attached to its physical axis. */
export function assignAxis(
  profile: ControllerProfile,
  channel: Channel,
  axis: number,
) {
  if (!Number.isInteger(axis) || axis < 0 || axis >= 64)
    throw new Error("Invalid axis");
  const other = channels.find(
    (ch) => ch !== channel && profile.bindings[ch].axis === axis,
  );
  if (other) {
    const previous = profile.bindings[channel];
    profile.bindings[channel] = profile.bindings[other];
    profile.bindings[other] = previous;
  } else
    profile.bindings[channel] = {
      ...profile.bindings[channel],
      axis,
      min: -1,
      max: 1,
      center: 0,
    };
}
export function movedAxis(before: readonly number[], after: readonly number[]) {
  const deltas = after.map((v, i) => Math.abs(v - (before[i] ?? v)));
  const highest = Math.max(...deltas);
  if (highest < 0.35) return null;
  const index = deltas.indexOf(highest),
    runner = Math.max(0, ...deltas.filter((_, i) => i !== index));
  return highest - runner > 0.12 ? index : null;
}
