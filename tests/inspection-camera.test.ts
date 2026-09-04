import { expect, it } from "vitest";
import * as T from "three";
import { fitInspectionCamera } from "../src/view/inspection-camera";
it.each(["top", "side"] as const)(
  "fits the %s drawing view in wide and narrow panels without perspective distortion",
  (view) => {
    for (const aspect of [0.65, 1, 2.3]) {
      const camera = new T.OrthographicCamera(),
        size = new T.Vector3(0.7, 1.1, 0.18),
        center = new T.Vector3(0.2, 0.03, -0.1);
      fitInspectionCamera(camera, view, size, center, aspect);
      for (const x of [-0.35, 0.35])
        for (const y of [-0.09, 0.09])
          for (const z of [-0.55, 0.55]) {
            const clip = new T.Vector3(x, y, z).add(center).project(camera);
            expect(Math.abs(clip.x)).toBeLessThan(0.79);
            expect(Math.abs(clip.y)).toBeLessThan(0.79);
            expect(Math.abs(clip.z)).toBeLessThan(1);
          }
      const direction = camera.getWorldDirection(new T.Vector3());
      expect(
        direction.distanceTo(
          view === "top" ? new T.Vector3(0, -1, 0) : new T.Vector3(0, 0, -1),
        ),
      ).toBeLessThan(1e-10);
      const p = center.clone().project(camera),
        q = center.clone().addScaledVector(direction, 0.1).project(camera);
      expect(p.x).toBeCloseTo(q.x, 10);
      expect(p.y).toBeCloseTo(q.y, 10);
    }
  },
);
