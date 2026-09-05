import { expect, it } from "vitest";
import * as T from "three";
import { propellerBlade } from "../src/view/propeller";

it.each([0.0635, 0.1016, 0.1143])(
  "keeps a tapered blade within its %s m radius with an outward closed surface",
  (radius) => {
    for (const handedness of [1, -1] as const) {
      const geometry = propellerBlade(radius, handedness);
      const positions = geometry.getAttribute("position");
      const indices = geometry.index!;
      let maxRadius = 0,
        volume = 0;
      for (let i = 0; i < positions.count; i++) {
        const p = new T.Vector3().fromBufferAttribute(positions, i);
        expect(p.toArray().every(Number.isFinite)).toBe(true);
        maxRadius = Math.max(maxRadius, Math.hypot(p.y, p.z));
        expect(Math.hypot(p.y, p.z)).toBeLessThanOrEqual(radius + 1e-8);
      }
      expect(maxRadius).toBeCloseTo(radius, 7);
      for (let i = 0; i < indices.count; i += 3) {
        const [a, b, c] = [0, 1, 2].map((j) =>
          new T.Vector3().fromBufferAttribute(positions, indices.getX(i + j)),
        );
        volume += a.dot(b.cross(c)) / 6;
      }
      expect(volume).toBeGreaterThan(0);
      expect(indices.count / 3).toBeLessThan(310);
      geometry.dispose();
    }
  },
);
