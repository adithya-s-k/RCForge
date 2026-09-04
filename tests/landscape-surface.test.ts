import { expect, it } from "vitest";
import * as T from "three";
import { sceneries } from "../src/core/scenery";
import {
  createLandscapeGeometry,
  landscapeHeight,
  landscapeSurfaceHeight,
} from "../src/view/landscape";

it("anchors vegetation to rendered terrain triangles rather than the unsampled DEM", () => {
  let sourceDisagreement = 0;
  for (const profile of Object.values(sceneries)) {
    const geometry = createLandscapeGeometry(profile);
    const material = new T.MeshBasicMaterial();
    const mesh = new T.Mesh(geometry, material);
    mesh.updateMatrixWorld();
    const ray = new T.Raycaster();
    for (const x of [-1237, -843, -497, -42, 0, 123, 613, 987, 1381]) {
      for (const z of [-1107, -659, -12, 167, 534, 1087]) {
        ray.set(new T.Vector3(x, 10000, z), new T.Vector3(0, -1, 0));
        const hit = ray.intersectObject(mesh)[0];
        expect(hit).toBeDefined();
        const surface = landscapeSurfaceHeight(x, z, profile);
        expect(Math.abs(surface - hit.point.y)).toBeLessThan(0.002);
        sourceDisagreement = Math.max(
          sourceDisagreement,
          Math.abs(landscapeHeight(x, z, profile) - surface),
        );
      }
    }
    geometry.dispose();
    material.dispose();
  }
  // This scenario must cover places where analytic/source sampling would float
  // or bury a tree; agreement on the flat runway alone is not sufficient.
  expect(sourceDisagreement).toBeGreaterThan(5);
});
