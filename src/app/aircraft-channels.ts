import type { Aircraft } from "../core/schema";
import type { Controls } from "../core/simulation";

/** Show only commands wired to a physical surface or motor in this definition. */
export function aircraftChannels(
  a: Aircraft,
): Exclude<keyof Controls, "vtol">[] {
  if (a.vehicleType === "multirotor" || a.vtol)
    return ["pitch", "roll", "yaw", "throttle"];
  const axes = (["pitch", "roll", "yaw"] as const).filter(
    (axis) =>
      a.surfaces.some(
        (s) =>
          s.control &&
          (s.control.axis === axis ? s.control.gain : 0) +
            (s.control.mix?.[axis] ?? 0) !==
            0,
      ) ||
      (axis === "yaw" && a.motors.some((m) => m.yawMix !== 0)),
  );
  return a.motors.length ? [...axes, "throttle"] : axes;
}
