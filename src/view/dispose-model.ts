import * as T from "three";

/** Release model-owned GPU resources once, retaining the fixed-wing shared palette. */
export function disposeModel(root: T.Object3D, shared = new Set<T.Material>()) {
  const geometries = new Set<T.BufferGeometry>();
  const materials = new Set<T.Material>();
  const textures = new Set<T.Texture>();
  root.traverse((object) => {
    if (!(
      object instanceof T.Mesh ||
      object instanceof T.Line ||
      object instanceof T.Points
    ))
      return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material)
      ? object.material
      : [object.material]) {
      if (shared.has(material)) continue;
      materials.add(material);
      for (const value of Object.values(material))
        if (value instanceof T.Texture) textures.add(value);
    }
  });
  textures.forEach((texture) => texture.dispose());
  materials.forEach((material) => material.dispose());
  geometries.forEach((geometry) => geometry.dispose());
}
