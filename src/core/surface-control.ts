import type { Aircraft } from "./schema";
import type { Controls } from "./simulation";
import { clamp } from "./math";
export type SurfaceControl = NonNullable<
  Aircraft["surfaces"][number]["control"]
>;
/** Shared by physics and animation; mixed commands saturate at physical servo travel. */
export function surfaceCommand(control: SurfaceControl, c: Controls) {
  let value = c[control.axis] * control.gain;
  for (const axis of ["roll", "pitch", "yaw"] as const)
    value += c[axis] * (control.mix?.[axis] ?? 0);
  return clamp(value, -1, 1);
}
