import { parseAircraft, type Aircraft } from "./schema";
import { moveComponent } from "./components";
import type { Vec3 } from "./math";

export interface CameraPlacement {
  positionM: Vec3;
  orientationDeg: Vec3;
  fovDeg: number;
}

export function cameraPlacement(a: Aircraft): CameraPlacement {
  const p = a.parts.find((part) => part.id === a.fpv?.partId);
  if (!p || !a.fpv) throw new Error("Install an FPV camera first.");
  return {
    positionM: [...p.positionM],
    orientationDeg: [...(p.orientationDeg ?? [0, 0, 0])],
    fovDeg: a.fpv.fovDeg,
  };
}

/** One validated draft transaction; never mutate the applied aircraft during a drag. */
export function withCameraPlacement(
  a: Aircraft,
  pose: CameraPlacement,
): Aircraft {
  cameraPlacement(a);
  if (
    !pose.positionM.every((n) => Number.isFinite(n) && Math.abs(n) <= 10) ||
    !pose.orientationDeg.every(
      (n) => Number.isFinite(n) && Math.abs(n) <= 180,
    ) ||
    !Number.isFinite(pose.fovDeg)
  )
    throw new Error("Camera position or angle is out of range.");
  const out = structuredClone(a);
  const part = out.parts.find((p) => p.id === out.fpv!.partId)!;
  pose.positionM.forEach((value, axis) =>
    moveComponent(out, part.id, axis, value),
  );
  part.orientationDeg = [...pose.orientationDeg];
  out.fpv!.fovDeg = pose.fovDeg;
  out.provenance.cameraPlacement = {
    status: "estimated",
    note: "User-positioned FPV mount. Component mass retained; CG and inertia recomputed. Visual surface placement is not a verified mechanical fit.",
  };
  return parseAircraft(out);
}
