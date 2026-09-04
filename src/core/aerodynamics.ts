import type { Aircraft } from "./schema";
import { interpolate } from "./powertrain";
import { clamp } from "./math";

type Surface = Aircraft["surfaces"][number];
type Coefficients = { cl: number; cd: number; cm: number };
export const STANDARD_AIR_VISCOSITY = 1.4607e-5; // kinematic, m²/s at 15 °C / sea level

/** Interpolate angle, then log(Re). No extrapolation of measured coefficients.
 * Each table blends to the analytical fallback outside its own angle range.
 * Reynolds boundaries clamp, and coverage is reported rather than concealed.
 */
export function surfacePolar(
  surface: Surface,
  angleDeg: number,
  reynolds: number,
  fallback: Coefficients,
) {
  const family = surface.reynoldsPolars?.tables;
  const tables =
    family ?? (surface.polar ? [{ reynolds, points: surface.polar }] : []);
  if (!tables.length)
    return {
      ...fallback,
      source: "analytical" as const,
      outsideEnvelope: false,
    };
  const read = (table: (typeof tables)[number]) => {
    const points = table.points;
    const outside = Math.max(
      points[0].alphaDeg - angleDeg,
      angleDeg - points.at(-1)!.alphaDeg,
      0,
    );
    const weight = clamp(outside / 12, 0, 1);
    const values = { ...fallback };
    for (const key of ["cl", "cd", "cm"] as const)
      values[key] =
        interpolate(
          points,
          angleDeg,
          (p) => p.alphaDeg,
          (p) => p[key],
        ) *
          (1 - weight) +
        fallback[key] * weight;
    return { ...values, outside: outside > 0 };
  };
  let high = tables.findIndex((t) => t.reynolds >= reynolds);
  if (high < 0) high = tables.length - 1;
  const low = Math.max(0, high - 1);
  const a = read(tables[low]),
    b = read(tables[high]);
  const weight =
    low === high
      ? 0
      : clamp(
          Math.log(Math.max(1, reynolds) / tables[low].reynolds) /
            Math.log(tables[high].reynolds / tables[low].reynolds),
          0,
          1,
        );
  return {
    cl: a.cl + (b.cl - a.cl) * weight,
    cd: a.cd + (b.cd - a.cd) * weight,
    cm: a.cm + (b.cm - a.cm) * weight,
    source: family ? ("reynolds-table" as const) : ("polar-table" as const),
    outsideEnvelope:
      (weight < 1 && a.outside) ||
      (weight > 0 && b.outside) ||
      Boolean(
        family &&
        (reynolds < tables[0].reynolds || reynolds > tables.at(-1)!.reynolds),
      ),
  };
}
