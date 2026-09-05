import { parseAircraft, type Aircraft } from "./schema";

/** Lens is six millimetres forward of the housing face, in component axes. */
export function fpvLensOffset(
  part: Aircraft["parts"][number],
): [number, number, number] {
  return [part.sizeM[0] / 2 + 0.006, 0, 0];
}

/** A deliberately generic installation estimate; the mass ledger remains authoritative. */
export function installFpvCamera(aircraft: Aircraft): Aircraft {
  const a = structuredClone(aircraft);
  if (a.fpv) return a;
  let camera = a.parts.find(
    (p) =>
      ["camera", "fpv-camera"].includes(p.id) &&
      p.kind === "equipment" &&
      !p.servo,
  );
  if (!camera) {
    let id = "fpv-camera";
    for (let i = 2; a.parts.some((p) => p.id === id); i++)
      id = `fpv-camera-${i}`;
    const body = a.parts.find((p) => p.kind === "body") ?? a.parts[0];
    // Clear the top of the central assembly, including a top-mounted battery.
    const top = Math.min(
      body.positionM[2] - body.sizeM[2] / 2,
      ...a.parts
        .filter((p) => Math.abs(p.positionM[1]) < 0.06)
        .map((p) => p.positionM[2] - p.sizeM[2] / 2),
    );
    camera = {
      id,
      kind: "equipment",
      massKg: 0.025,
      positionM: [body.positionM[0] + body.sizeM[0] * 0.2, 0, top - 0.016],
      sizeM: [0.03, 0.022, 0.022],
      orientationDeg: [0, 0, 0],
      color: "#252529",
      model: "Generic FPV camera + mount (estimated)",
      material: { name: "Electronics / plastic mount", finish: "plastic" },
    };
    a.parts.push(camera);
  }
  a.fpv = { partId: camera.id, fovDeg: 90 };
  a.provenance.fpv = {
    status: "estimated",
    note: "Generic FPV camera installation. New kits allocate 25 g including mount; existing camera components retain their mass. Inspect clearance and replace mass, dimensions and pose with your hardware. FOV is vertical; no lens distortion or video link model.",
  };
  return parseAircraft(a);
}

export function removeFpvCamera(aircraft: Aircraft): Aircraft {
  const a = structuredClone(aircraft);
  if (!a.fpv) return a;
  const id = a.fpv.partId;
  if (a.motors.some((m) => m.partId === id || m.propPartId === id))
    throw new Error(
      "This component is also referenced by a motor. Detach that reference in the aircraft definition first.",
    );
  a.parts = a.parts.filter((p) => p.id !== id);
  delete a.fpv;
  a.provenance.fpv = {
    status: "estimated",
    note: "FPV camera removed from the mass ledger.",
  };
  return parseAircraft(a);
}
