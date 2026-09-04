import { massProperties } from "./aircraft";
import { parseAircraft, type Aircraft } from "./schema";
export function setTotalMass(a: Aircraft, massKg: number): Aircraft {
  if (!Number.isFinite(massKg) || massKg < 0.1 || massKg > 10)
    throw new Error("Total mass must be between 100 g and 10 kg");
  const out = structuredClone(a),
    ratio = massKg / massProperties(a).mass;
  out.parts.forEach((p) => {
    p.massKg *= ratio;
    if (p.inertiaDiagonalKgM2)
      p.inertiaDiagonalKgM2 = p.inertiaDiagonalKgM2.map((v) => v * ratio) as [
        number,
        number,
        number,
      ];
  });
  return parseAircraft(out);
}
export function setLongitudinalCG(a: Aircraft, aftOfLE: number): Aircraft {
  const out = structuredClone(a),
    battery = out.parts.find((p) => p.kind === "battery");
  if (!battery)
    throw new Error("Add a battery mass component to adjust CG automatically");
  const props = massProperties(out),
    target = out.reference.leadingEdgeXM - aftOfLE;
  battery.positionM[0] +=
    ((target - props.cg[0]) * props.mass) / battery.massKg;
  if (
    !Number.isFinite(battery.positionM[0]) ||
    Math.abs(battery.positionM[0]) > 2
  )
    throw new Error("Requested CG requires an implausible battery position");
  out.reference.cgFromLeadingEdgeM = aftOfLE;
  return parseAircraft(out);
}
