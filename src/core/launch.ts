import type { Aircraft } from "./schema";
import { massProperties } from "./aircraft";
import { calmEnvironment, initialState, type State } from "./simulation";
import { findTrim } from "./trim";
import { axisQ, rotate, sub } from "./math";
export type LaunchMode = "ground" | "hand" | "airborne";
export function launchAirspeed(a: Aircraft, mode: LaunchMode) {
  return mode === "hand" ? 8.5 : (a.reference.trimSpeedMps ?? 12);
}
/** Trim the release operating point; this is initialization, never an autopilot. */
export function launchTrim(
  a: Aircraft,
  mode: LaunchMode,
  environment = calmEnvironment(),
) {
  return findTrim(
    a,
    launchAirspeed(a, mode),
    environment,
    mode === "hand" ? 8 : 0,
  );
}
/** Optional removable gear is a modeled modification, not part of the published Bronco. */
export function fitLandingGear(source: Aircraft): Aircraft {
  const a = structuredClone(source);
  if (a.vehicleType === "multirotor" || a.vehicleType === "vtol") return a;
  if (a.contactPoints.some((p) => p.kind === "wheel")) return a;
  const span = a.reference.spanM;
  a.parts.push({
    id: "removable-gear",
    kind: "equipment",
    massKg: 0.045,
    positionM: [-0.01, 0, 0.12],
    sizeM: [0.24, span * 0.42, 0.14],
    color: "#30343b",
  });
  for (const [id, x, y, steering] of [
    ["nose-wheel", 0.22, 0, true],
    ["left-wheel", -0.08, -span * 0.21, false],
    ["right-wheel", -0.08, span * 0.21, false],
  ] as const) {
    a.contactPoints.push({
      id,
      positionM: [x, y, 0.21],
      spanLinked: false,
      kind: "wheel",
      steering,
      wheelRadiusM: 0.032,
    });
  }
  a.provenance.landingGear = {
    status: "estimated",
    note: "Optional 45 g removable tricycle gear, estimated geometry and tire properties. Not in the published Bronco plans.",
  };
  return a;
}
export function launchState(
  a: Aircraft,
  mode: LaunchMode,
  environment = calmEnvironment(),
): State {
  const trim = launchTrim(a, mode, environment);
  if (a.vehicleType === "multirotor" || a.vehicleType === "vtol") {
    if (mode !== "ground") return trim.state;
    const s = initialState(a, 0, 0, 0),
      cg = massProperties(a).cg;
    s.position = [
      0,
      0,
      -Math.max(...a.contactPoints.map((p) => p.positionM[2] - cg[2])),
    ];
    s.status = "grounded";
    return s;
  }
  if (mode === "airborne") {
    const s = trim.state;
    s.position = [18, 0, -22];
    return s;
  }
  if (mode === "hand") {
    const s = trim.state;
    s.position = [-5, -10, -1.7];
    return s;
  }
  if (!a.contactPoints.some((p) => p.kind === "wheel"))
    throw new Error("Ground launch requires landing gear");
  const s = initialState(a, 0, 0, 0),
    cg = massProperties(a).cg;
  // A two-wheel taildragger rests on its main wheels and rear skid. Set that
  // geometric pose before launch instead of dropping its tail after Start.
  const wheels = a.contactPoints.filter((p) => p.kind === "wheel");
  const tailSkid = a.contactPoints.find(
    (p) => p.kind === "skid" && p.positionM[0] < cg[0],
  );
  const main = wheels[0];
  if (
    wheels.length === 2 &&
    tailSkid &&
    wheels.every(
      (p) =>
        p.positionM[0] > cg[0] &&
        Math.abs(p.positionM[0] - main.positionM[0]) < 1e-6 &&
        Math.abs(p.positionM[2] - main.positionM[2]) < 1e-6,
    )
  ) {
    const pitch = Math.atan2(
      main.positionM[2] - tailSkid.positionM[2],
      main.positionM[0] - tailSkid.positionM[0],
    );
    s.orientation = axisQ([0, 1, 0], pitch);
  }
  s.position = [
    0,
    0,
    -Math.max(
      ...a.contactPoints.map(
        (p) => rotate(s.orientation, sub(p.positionM, cg))[2],
      ),
    ),
  ];
  s.status = "grounded";
  return s;
}
