import { expect, it, vi } from "vitest";
import * as T from "three";
import { batchStatic } from "../src/view/batch-static";
it("reduces static draws while retaining transformed bounds, materials and animated siblings", () => {
  const root = new T.Group(),
    staticGroup = new T.Group(),
    nested = new T.Group();
  root.add(staticGroup);
  staticGroup.add(nested);
  root.position.set(4, -2, 8);
  staticGroup.position.set(-0.2, 0.4, 0.1);
  nested.position.set(0.2, -0.5, 0.3);
  nested.scale.set(2, 1, 0.5);
  nested.rotation.z = 0.4;
  const material = new T.MeshStandardMaterial();
  const geometries = [
    new T.BoxGeometry(1, 2, 3),
    new T.CylinderGeometry(0.2, 0.2, 1, 12),
  ];
  for (let i = 0; i < 2; i++) {
    const m = new T.Mesh(geometries[i], material);
    m.position.x = i;
    m.castShadow = m.receiveShadow = true;
    nested.add(m);
  }
  const prop = new T.Group();
  root.add(prop);
  prop.add(new T.Mesh(new T.BoxGeometry(), material));
  const before = new T.Box3().setFromObject(staticGroup),
    dispose = geometries.map((g) => vi.spyOn(g, "dispose"));
  batchStatic(staticGroup);
  const after = new T.Box3().setFromObject(staticGroup);
  expect(before.min.distanceTo(after.min)).toBeLessThan(1e-6);
  expect(before.max.distanceTo(after.max)).toBeLessThan(1e-6);
  let count = 0;
  staticGroup.traverse((o) => {
    if (o instanceof T.Mesh) {
      count++;
      expect(o.castShadow).toBe(true);
      expect(o.material).toBe(material);
    }
  });
  expect(count).toBe(1);
  expect(prop.children).toHaveLength(1);
  dispose.forEach((d) => expect(d).toHaveBeenCalledOnce());
});

it("keeps the detailed quad within a small model submission budget", async () => {
  const { buildQuad } = await import("../src/view/quad-model");
  const { parseAircraft } = await import("../src/core/schema");
  const small = (await import("../aircraft/quad-x-5inch.json")).default;
  const large = (await import("../aircraft/quad-x-450.json")).default;
  // Only CPU geometry construction is exercised; no graphics performance claim.
  vi.stubGlobal("document", {
    createElement: () => ({
      getContext: () => ({ fillRect() {}, fillStyle: "" }),
    }),
  });
  try {
    for (const data of [small, large]) {
      const visual = buildQuad(parseAircraft(data));
      let meshes = 0,
        triangles = 0;
      visual.group.traverse((o) => {
        if (o instanceof T.Mesh) {
          meshes++;
          triangles +=
            (o.geometry.index?.count ?? o.geometry.attributes.position.count) /
            3;
        }
      });
      expect(meshes).toBeLessThanOrEqual(35);
      expect(triangles).toBeLessThan(25000);
      expect(visual.propellers).toHaveLength(4);
    }
  } finally {
    vi.unstubAllGlobals();
  }
});
