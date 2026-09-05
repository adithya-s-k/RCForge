import { expect, it } from "vitest";
import * as T from "three";
import bronco from "../aircraft/ft-bronco.json";
import quad from "../aircraft/quad-x-6s.json";
import { parseAircraft } from "../src/core/schema";
import { installFpvCamera } from "../src/core/fpv";
import {
  cameraPlacement,
  withCameraPlacement,
} from "../src/core/camera-placement";
import { massProperties } from "../src/core/aircraft";
import { cameraSurfacePosition } from "../src/view/camera-placement";
import { fpvMount } from "../src/view/fpv-camera";

it.each([bronco, quad])(
  "commits mount pose once without changing component mass or unrelated edits on $id",
  (raw) => {
    const a = installFpvCamera(parseAircraft(raw));
    a.parts[0].massKg += 0.01;
    const before = structuredClone(a),
      pose = cameraPlacement(a);
    pose.positionM = [0.31, 0.025, -0.13];
    pose.orientationDeg = [12, 28, -35];
    pose.fovDeg = 104;
    const result = withCameraPlacement(a, pose);
    expect(a).toEqual(before);
    expect(cameraPlacement(result)).toEqual(pose);
    expect(result.parts.map((p) => p.massKg)).toEqual(
      a.parts.map((p) => p.massKg),
    );
    expect(result.parts.filter((p) => p.id !== a.fpv!.partId)).toEqual(
      a.parts.filter((p) => p.id !== a.fpv!.partId),
    );
    expect(massProperties(result).cg).not.toEqual(massProperties(a).cg);
    expect(massProperties(result).inertia).not.toEqual(
      massProperties(a).inertia,
    );
    expect(result.surfaces).toEqual(a.surfaces);
    expect(result.battery).toEqual(a.battery);
    const mount = fpvMount(result, massProperties(result).cg)!;
    expect(mount.fov).toBe(104);
    expect(mount.forward.z).toBeLessThan(0);
  },
);

it("rejects invalid placements while leaving the existing mount intact", () => {
  const a = installFpvCamera(parseAircraft(bronco)),
    pose = cameraPlacement(a);
  expect(() => cameraPlacement(parseAircraft(bronco))).toThrow("Install");
  for (const invalid of [
    { ...pose, positionM: [NaN, 0, 0] },
    { ...pose, positionM: [11, 0, 0] },
    { ...pose, orientationDeg: [0, Infinity, 0] },
    { ...pose, fovDeg: 180 },
  ])
    expect(() => withCameraPlacement(a, invalid as typeof pose)).toThrow();
  expect(cameraPlacement(a)).toEqual(pose);
});

it("keeps every housing corner outside a picked surface after arbitrary mount rotations", () => {
  const point = new T.Vector3(0.21, 0.07, -0.15),
    size = [0.03, 0.022, 0.026];
  for (const normal of [
    new T.Vector3(0, 1, 0),
    new T.Vector3(0.2, 0.8, -0.3).normalize(),
    new T.Vector3(1, 0, 0),
  ]) {
    for (const angles of [
      [0, 0, 0],
      [0.2, 0.6, 1.3],
      [1.1, -0.7, 0.5],
    ]) {
      const rotation = new T.Quaternion().setFromEuler(
        new T.Euler(angles[0], angles[1], angles[2], "ZYX"),
      );
      const center = cameraSurfacePosition(point, normal, size, rotation);
      const distances = [];
      for (const x of [-0.5, 0.5])
        for (const y of [-0.5, 0.5])
          for (const z of [-0.5, 0.5]) {
            const corner = new T.Vector3(x * size[0], y * size[1], z * size[2])
              .applyQuaternion(rotation)
              .add(center);
            distances.push(corner.sub(point).dot(normal));
          }
      expect(Math.min(...distances)).toBeCloseTo(0.002, 12);
    }
  }
});
