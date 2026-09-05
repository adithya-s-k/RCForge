import { z } from "zod";
import { clamp } from "./math";
import type { Controls } from "./simulation";

const rate = z.number().finite().min(0.1).max(1);
export const PilotResponseSchema = z
  .object({
    preset: z.enum(["gentle", "standard", "direct", "custom"]),
    rates: z.tuple([rate, rate, rate]).default([0.55, 0.45, 0.65]),
    expo: z.number().finite().min(0).max(0.8).default(0.4),
    smoothingSeconds: z.number().finite().min(0).max(0.2).default(0.09),
  })
  .strict();
export type PilotResponse = z.infer<typeof PilotResponseSchema>;
export type ResponsePreset = PilotResponse["preset"];
export const responsePresets = {
  gentle: { rates: [0.55, 0.45, 0.65], expo: 0.4, smoothingSeconds: 0.09 },
  standard: { rates: [0.8, 0.75, 0.85], expo: 0.2, smoothingSeconds: 0.035 },
  direct: { rates: [1, 1, 1], expo: 0, smoothingSeconds: 0 },
} satisfies Record<string, Omit<PilotResponse, "preset">>;
export function responseSettings(config?: PilotResponse): PilotResponse {
  const preset = config?.preset ?? "direct";
  return preset === "custom"
    ? { ...config!, rates: [...config!.rates] }
    : {
        preset,
        ...responsePresets[preset],
        rates: [...responsePresets[preset].rates],
      };
}
/** Transmitter-style dual rates and cubic expo; not an attitude controller.
 * Call once per physics step, after device calibration and before aircraft trim. */
export class PilotResponseFilter {
  private axes = [0, 0, 0];
  reset() {
    this.axes.fill(0);
  }
  step(input: Controls, settings: PilotResponse, dt: number): Controls {
    const blend =
      settings.smoothingSeconds === 0
        ? 1
        : -Math.expm1(-Math.max(0, dt) / settings.smoothingSeconds);
    const values = [input.roll, input.pitch, input.yaw].map((raw, i) => {
      const v = clamp(Number.isFinite(raw) ? raw : 0, -1, 1);
      const target =
        settings.rates[i] * ((1 - settings.expo) * v + settings.expo * v ** 3);
      this.axes[i] += (target - this.axes[i]) * blend;
      return this.axes[i];
    });
    return {
      roll: values[0],
      pitch: values[1],
      yaw: values[2],
      throttle: input.throttle,
    };
  }
}
/** Preserve the whole trim offset while scaling the available pilot authority. */
export function withPitchTrim(input: Controls, trim: number): Controls {
  return {
    ...input,
    pitch: trim + input.pitch * (input.pitch >= 0 ? 1 - trim : 1 + trim),
  };
}
