import { parseAircraft, type Aircraft } from "./schema";
import type { SurfaceControl } from "./surface-control";
export const mixingAxes = ["roll", "pitch", "yaw"] as const;
export type MixingAxis = (typeof mixingAxes)[number];
export type MixingTemplate = "elevon" | "v-tail" | "a-tail" | "ailerons";
export function mixingWeights(control: SurfaceControl) {
  return Object.fromEntries(
    mixingAxes.map((axis) => [
      axis,
      (control.axis === axis ? control.gain : 0) + (control.mix?.[axis] ?? 0),
    ]),
  ) as Record<MixingAxis, number>;
}
/** Canonicalize the authored sum to avoid counting the primary axis twice. */
export function setMixingWeights(
  control: SurfaceControl,
  weights: Record<MixingAxis, number>,
) {
  for (const axis of mixingAxes)
    if (!Number.isFinite(weights[axis]) || Math.abs(weights[axis]) > 2)
      throw new Error("Mix contributions must be between -200% and +200%.");
  control.gain = weights[control.axis];
  control.mix = Object.fromEntries(
    mixingAxes
      .filter((axis) => axis !== control.axis && weights[axis] !== 0)
      .map((axis) => [axis, weights[axis]]),
  );
}
export function applyMixingTemplate(
  aircraft: Aircraft,
  leftId: string,
  rightId: string,
  template: MixingTemplate,
): Aircraft {
  const a = structuredClone(aircraft);
  const left = a.surfaces.find((s) => s.id === leftId),
    right = a.surfaces.find((s) => s.id === rightId);
  if (!left?.control || !right?.control || left === right)
    throw new Error("Choose two different movable surfaces.");
  if (left.positionM[1] >= right.positionM[1])
    throw new Error("Left must be to the aircraft's left of Right (body Y).");
  if (!["elevon", "v-tail", "a-tail", "ailerons"].includes(template))
    throw new Error("Unknown mixing template.");
  for (const [i, s] of [left, right].entries()) {
    const sign = i === 0 ? 1 : -1;
    setMixingWeights(s.control!, {
      roll: template === "elevon" || template === "ailerons" ? sign : 0,
      pitch: template === "ailerons" ? 0 : -1,
      yaw: template === "v-tail" ? -sign : template === "a-tail" ? sign : 0,
    });
  }
  a.provenance.controlMixing = {
    status: "estimated",
    note: `User-selected ${template} wiring for ${leftId} / ${rightId}. Geometry and mechanical travel unchanged; verify control direction and trim for the actual installation.`,
  };
  return parseAircraft(a);
}
