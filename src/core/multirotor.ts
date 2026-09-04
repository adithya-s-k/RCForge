import type { Aircraft } from "./schema";
import type { Controls, State } from "./simulation";
import { clamp, euler, radians } from "./math";
/** Simple rate-P controller, optional angle outer loop; no position or altitude hold. */
export function rotorCommands(a: Aircraft, s: State, c: Controls) {
  const config = a.multirotor!;
  const angles = euler(s.orientation),
    maxRate = radians(config.maxRateDegS);
  const target = [c.roll, c.pitch, c.yaw].map((v, i) =>
    i < 2 && config.mode === "angle"
      ? clamp(
          (v * radians(config.maxTiltDeg) - angles[i]) * config.attitudeGain,
          -maxRate,
          maxRate,
        )
      : v * maxRate,
  );
  const demand = target.map((v, i) =>
    clamp((v - s.omega[i]) * config.rateGain, -0.3, 0.3),
  );
  const maxX = Math.max(...a.motors.map((m) => Math.abs(m.positionM[0]))),
    maxY = Math.max(...a.motors.map((m) => Math.abs(m.positionM[1])));
  return a.motors.map((m) =>
    c.throttle <= 0
      ? 0
      : clamp(
          c.throttle +
            ((-m.positionM[1] / maxY) * demand[0] +
              (m.positionM[0] / maxX) * demand[1] +
              (m.spin === "cw" ? -1 : 1) * demand[2]) *
              Math.min(1, c.throttle / 0.1),
          0,
          1,
        ),
  );
}
