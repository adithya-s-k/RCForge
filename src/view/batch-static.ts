import * as T from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/** Batch a dedicated, static construction group. Animated parts stay outside it.
 * All meshes must own their geometry and share the same shadow settings. */
export function batchStatic(root: T.Group) {
  const batches = new Map<T.Material, T.Mesh[]>();
  root.updateMatrixWorld(true);
  const inverse = root.matrixWorld.clone().invert();
  root.traverse((o) => {
    if (!(o instanceof T.Mesh) || Array.isArray(o.material)) return;
    const list = batches.get(o.material) ?? [];
    list.push(o);
    batches.set(o.material, list);
  });
  for (const [material, meshes] of batches) {
    if (meshes.length < 2) continue;
    const transformed = meshes.map((o) => {
      const g = o.geometry.index
        ? o.geometry.toNonIndexed()
        : o.geometry.clone();
      return g.applyMatrix4(inverse.clone().multiply(o.matrixWorld));
    });
    const geometry = mergeGeometries(transformed);
    transformed.forEach((g) => g.dispose());
    if (!geometry) continue;
    const combined = new T.Mesh(geometry, material);
    combined.castShadow = meshes[0].castShadow;
    combined.receiveShadow = meshes[0].receiveShadow;
    meshes.forEach((o) => {
      o.removeFromParent();
      o.geometry.dispose();
    });
    root.add(combined);
  }
}
