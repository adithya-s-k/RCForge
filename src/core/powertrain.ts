import type { Aircraft } from "./schema";
import { clamp } from "./math";
export function interpolate<T>(
  points: readonly T[],
  x: number,
  coordinate: (p: T) => number,
  value: (p: T) => number,
) {
  if (x <= coordinate(points[0])) return value(points[0]);
  for (let i = 1; i < points.length; i++)
    if (x <= coordinate(points[i])) {
      const t =
        (x - coordinate(points[i - 1])) /
        (coordinate(points[i]) - coordinate(points[i - 1]));
      return value(points[i - 1]) * (1 - t) + value(points[i]) * t;
    }
  return value(points[points.length - 1]);
}
/** Quasi-static resistive battery. Bench current is scaled by terminal voltage at fixed command. */
export function powertrain(
  a: Aircraft,
  commands: number[],
  soc = a.battery?.initialSoc ?? 1,
  density = 1.225,
) {
  const bench = a.motors.map((m, i) => {
    const command = clamp(commands[i] ?? 0, 0, 1),
      p = m.performance;
    return {
      thrust: p
        ? interpolate(
            p.points,
            command,
            (v) => v.command,
            (v) => v.thrustN,
          )
        : m.maxThrustN * command,
      current: p
        ? interpolate(
            p.points,
            command,
            (v) => v.command,
            (v) => v.currentA,
          )
        : 0,
    };
  });
  const battery = a.battery;
  const ocv = battery
    ? battery.cells *
      interpolate(
        battery.voltageCurve,
        clamp(soc, 0, 1),
        (v) => v.soc,
        (v) => v.voltsPerCell,
      )
    : 0;
  const conductance = bench.reduce(
    (sum, p, i) =>
      sum + p.current / (a.motors[i].performance?.referenceVoltage ?? 1),
    0,
  );
  const voltage = battery
    ? Math.max(
        0,
        (ocv - battery.resistanceOhm * battery.avionicsCurrentA) /
          (1 + battery.resistanceOhm * conductance),
      )
    : 0;
  const current =
    battery && soc > 0 ? conductance * voltage + battery.avionicsCurrentA : 0;
  const thrust = bench.map((p, i) => {
    const performance = a.motors[i].performance;
    const ratio = battery
      ? soc > 0
        ? voltage / performance!.referenceVoltage
        : 0
      : 1;
    return (
      (p.thrust * ratio * ratio * density) /
      (performance?.referenceDensityKgM3 ?? 1.225)
    );
  });
  return {
    thrust,
    voltage: soc > 0 ? voltage : 0,
    current,
    powerW: voltage * current,
    soc: clamp(soc, 0, 1),
  };
}
