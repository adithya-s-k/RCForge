import { afterEach, expect, it, vi } from "vitest";
import * as T from "three";
import bronco from "../aircraft/ft-bronco.json";
import quad from "../aircraft/quad-x-6s.json";
import { parseAircraft } from "../src/core/schema";
import { massProperties } from "../src/core/aircraft";
import { installFpvCamera, removeFpvCamera } from "../src/core/fpv";
import {
  fpvMount,
  placeFpvCamera,
  buildFpvHousing,
} from "../src/view/fpv-camera";
import { buildAircraft, disposeAircraft } from "../src/view/model";

afterEach(() => vi.unstubAllGlobals());
it("installs once, changes mass/CG and removes the camera transactionally", () => {
  const original = parseAircraft(bronco),
    a = installFpvCamera(original),
    before = massProperties(original),
    after = massProperties(a);
  expect(after.mass - before.mass).toBeCloseTo(0.025, 12);
  expect(after.cg[2]).toBeLessThan(before.cg[2]);
  expect(after.inertia).not.toEqual(before.inertia);
  expect(installFpvCamera(a)).toEqual(a);
  expect(original.fpv).toBeUndefined();
  expect(massProperties(removeFpvCamera(a))).toEqual(before);
  const invalid = structuredClone(a);
  invalid.fpv!.partId = "missing";
  expect(() => parseAircraft(invalid)).toThrow(/FPV/);
  invalid.fpv!.partId = "battery";
  expect(() => parseAircraft(invalid)).toThrow(/FPV/);
  invalid.fpv!.partId = a.fpv!.partId;
  invalid.fpv!.fovDeg = 180;
  expect(() => parseAircraft(invalid)).toThrow();
});
it("reuses an existing quad camera without double-counting its mass", () => {
  const a = parseAircraft(quad);
  delete a.fpv;
  const mounted = installFpvCamera(a);
  expect(mounted.fpv!.partId).toBe("camera");
  expect(mounted.parts).toEqual(a.parts);
  expect(massProperties(mounted)).toEqual(massProperties(a));
});
it("places the optical center at the mounted lens, relative to CG and body attitude", () => {
  const a = installFpvCamera(parseAircraft(bronco));
  const p = a.parts.find((p) => p.id === a.fpv!.partId)!;
  p.positionM = [0.3, 0.05, -0.08];
  p.orientationDeg = [10, 25, 30];
  const cg = massProperties(a).cg,
    mount = fpvMount(a, cg)!;
  const housing = buildFpvHousing(a)!;
  const lens = new T.Vector3(p.sizeM[0] / 2 + 0.006, 0, 0)
    .applyQuaternion(housing.quaternion)
    .add(housing.position);
  expect(
    mount.position
      .clone()
      .add(new T.Vector3(...cg))
      .distanceTo(lens),
  ).toBeLessThan(1e-12);
  const conversion = new T.Quaternion().setFromAxisAngle(
    new T.Vector3(1, 0, 0),
    Math.PI / 2,
  );
  const attitude = new T.Quaternion().setFromEuler(
    new T.Euler(0.7, 0.2, -1.2, "ZYX"),
  );
  const body = conversion.clone().multiply(attitude),
    camera = new T.PerspectiveCamera(),
    position = new T.Vector3(200, 30, 400);
  placeFpvCamera(camera, mount, position, body);
  const forward = camera.getWorldDirection(new T.Vector3());
  expect(
    forward.distanceTo(mount.forward.clone().applyQuaternion(body)),
  ).toBeLessThan(1e-12);
  expect(
    camera.up.distanceTo(mount.up.clone().applyQuaternion(body)),
  ).toBeLessThan(1e-12);
  expect(
    camera.position.distanceTo(
      mount.position.clone().applyQuaternion(body).add(position),
    ),
  ).toBeLessThan(1e-12);
  expect(camera.near).toBe(0.003);
  expect(camera.fov).toBe(90);
  disposeAircraft(housing);
});
it("looks forward when level and rolls the horizon with the aircraft", () => {
  const a = installFpvCamera(parseAircraft(bronco)),
    mount = fpvMount(a, massProperties(a).cg)!;
  const camera = new T.PerspectiveCamera();
  const conversion = new T.Quaternion().setFromAxisAngle(
    new T.Vector3(1, 0, 0),
    Math.PI / 2,
  );
  placeFpvCamera(camera, mount, new T.Vector3(), conversion);
  expect(
    camera
      .getWorldDirection(new T.Vector3())
      .distanceTo(new T.Vector3(1, 0, 0)),
  ).toBeLessThan(1e-12);
  expect(camera.up.distanceTo(new T.Vector3(0, 1, 0))).toBeLessThan(1e-12);
  conversion.multiply(
    new T.Quaternion().setFromAxisAngle(new T.Vector3(1, 0, 0), Math.PI / 2),
  );
  placeFpvCamera(camera, mount, new T.Vector3(), conversion);
  expect(camera.up.distanceTo(new T.Vector3(0, 0, 1))).toBeLessThan(1e-12);
});
it.each([bronco, quad])("renders one camera installation on $id", (data) => {
  vi.stubGlobal("document", {
    createElement: () => ({
      getContext: () => ({ fillRect() {}, fillStyle: "" }),
    }),
  });
  const a = installFpvCamera(parseAircraft(data)),
    visual = buildAircraft(a);
  const cameras: T.Object3D[] = [];
  visual.group.traverse((o) => {
    if (o.name.startsWith("fpv-camera:")) cameras.push(o);
  });
  expect(cameras).toHaveLength(1);
  expect(
    cameras[0].position.distanceTo(
      new T.Vector3(
        ...a.parts.find((p) => p.id === a.fpv!.partId)!.positionM,
      ).sub(new T.Vector3(...massProperties(a).cg)),
    ),
  ).toBeLessThan(1e-12);
  disposeAircraft(visual.group);
});
