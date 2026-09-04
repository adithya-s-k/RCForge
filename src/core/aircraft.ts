import type { Aircraft } from "./schema";
import {
  rotate,
  axisQ,
  mulQ,
  radians,
  add,
  scale,
  sub,
  invert,
  type Mat3,
  type Vec3,
} from "./math";
export function massProperties(a: Aircraft) {
  const mass = a.parts.reduce((s, p) => s + p.massKg, 0);
  const cg = scale(
    a.parts.reduce<Vec3>(
      (s, p) => add(s, scale(p.positionM, p.massKg)),
      [0, 0, 0],
    ),
    1 / mass,
  );
  const inertia: Mat3 = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (const p of a.parts) {
    const r = sub(p.positionM, cg),
      d = p.sizeM,
      m = p.massKg;
    const diagonal = p.inertiaDiagonalKgM2 ?? [
      (m * (d[1] ** 2 + d[2] ** 2)) / 12,
      (m * (d[0] ** 2 + d[2] ** 2)) / 12,
      (m * (d[0] ** 2 + d[1] ** 2)) / 12,
    ];
    const angles = p.orientationDeg ?? [0, 0, 0];
    const q = mulQ(
      axisQ([0, 0, 1], radians(angles[2])),
      mulQ(
        axisQ([0, 1, 0], radians(angles[1])),
        axisQ([1, 0, 0], radians(angles[0])),
      ),
    );
    const axes = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ].map((v) => rotate(q, v as Vec3));
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++)
        inertia[i][j] +=
          axes.reduce(
            (sum, axis, k) => sum + diagonal[k] * axis[i] * axis[j],
            0,
          ) +
          m *
            ((i === j ? r.reduce((sum, v) => sum + v * v, 0) : 0) -
              r[i] * r[j]);
  }
  return { mass, cg, inertia, inverseInertia: invert(inertia) };
}
export interface DesignChanges {
  spanScale: number;
  batteryShiftM: number;
  thrustScale: number;
  throwsScale: number;
}
export const defaultChanges: DesignChanges = {
  spanScale: 1,
  batteryShiftM: 0,
  thrustScale: 1,
  throwsScale: 1,
};
/** Each edit is applied to a pristine baseline, never cumulatively. */
export function modifyAircraft(base: Aircraft, c: DesignChanges): Aircraft {
  const a = structuredClone(base);
  if (a.vehicleType === "multirotor") {
    for (const p of a.parts) {
      p.positionM[0] *= c.spanScale;
      p.positionM[1] *= c.spanScale;
      if (p.kind === "body") {
        if (c.spanScale !== 1) delete p.inertiaDiagonalKgM2;
        p.sizeM[0] *= c.spanScale;
        p.sizeM[1] *= c.spanScale;
      }
    }
    for (const m of a.motors) {
      m.positionM[0] *= c.spanScale;
      m.positionM[1] *= c.spanScale;
    }
    for (const p of a.contactPoints) {
      p.positionM[0] *= c.spanScale;
      p.positionM[1] *= c.spanScale;
    }
  }
  for (const p of a.parts) {
    if (p.kind === "wing") {
      if (c.spanScale !== 1) delete p.inertiaDiagonalKgM2;
      p.positionM[1] *= c.spanScale;
      p.sizeM[1] *= c.spanScale;
      p.massKg *= c.spanScale;
    }
    if (p.kind === "battery") p.positionM[0] += c.batteryShiftM;
  }
  for (const s of a.surfaces) {
    if (s.kind === "wing") {
      s.spanM *= c.spanScale;
      s.positionM[1] *= c.spanScale;
      s.aspectRatio *= c.spanScale;
    }
    if (s.control) s.control.maxDeg *= c.throwsScale;
  }
  for (const p of a.contactPoints)
    if (p.spanLinked) p.positionM[1] *= c.spanScale;
  for (const m of a.motors) {
    m.maxThrustN *= c.thrustScale;
    m.performance?.points.forEach((p) => (p.thrustN *= c.thrustScale));
  }
  a.reference.spanM *= c.spanScale;
  a.reference.areaM2 *= c.spanScale;
  a.reference.cgFromLeadingEdgeM =
    a.reference.leadingEdgeXM - massProperties(a).cg[0];
  if (
    Object.keys(defaultChanges).some(
      (key) =>
        c[key as keyof DesignChanges] !==
        defaultChanges[key as keyof DesignChanges],
    )
  ) {
    a.provenance.designEdits = {
      status: "calculated",
      note: `Modified from ${base.name}: span ×${c.spanScale}, battery shift ${c.batteryShiftM} m forward, thrust ×${c.thrustScale}, throws ×${c.throwsScale}. Wing mass scales linearly with span; mass properties are recalculated. Original source notes describe the baseline, not the modified design.`,
    };
  }
  return a;
}
