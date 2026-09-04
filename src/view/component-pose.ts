import * as T from "three";
import type { Aircraft } from "../core/schema";

type Part = Aircraft["parts"][number];

/** Component-local principal/envelope axes, Rz Ry Rx, in the body frame. */
export function componentRotation(part: Part) {
  return new T.Quaternion().setFromEuler(
    new T.Euler(
      ...((part.orientationDeg ?? [0, 0, 0]).map(T.MathUtils.degToRad) as [
        number,
        number,
        number,
      ]),
      "ZYX",
    ),
  );
}

/** Existing construction is authored in datum coordinates. Rotate about this
 * component's own CG, preserving all child offsets and animated pivots. */
export function orientComponent(
  parent: T.Group,
  part: Part,
  children: T.Object3D[],
) {
  if (!children.length) return;
  const assembly = new T.Group();
  assembly.name = `component:${part.id}`;
  assembly.userData.partId = part.id;
  assembly.position.set(...part.positionM);
  assembly.quaternion.copy(componentRotation(part));
  for (const child of children) {
    child.position.sub(assembly.position);
    assembly.add(child);
  }
  parent.add(assembly);
  return assembly;
}
