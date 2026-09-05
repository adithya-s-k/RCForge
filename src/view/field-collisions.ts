import * as T from "three";
import type { Obstacle } from "../core/obstacles";

/** Scenery construction exports a frozen collision snapshot to the app. NED boundary. */
export function collectFieldObstacles(root: T.Group): Obstacle[] {
  const obstacles: Obstacle[] = [];
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (!(o instanceof T.Mesh)) return;
    const kind = o.userData.collision as "solid" | "foliage" | undefined;
    if (!kind) return;
    const count = o instanceof T.InstancedMesh ? o.count : 1;
    for (let i = 0; i < count; i++) {
      const matrix = o.matrixWorld.clone();
      if (o instanceof T.InstancedMesh) {
        const instance = new T.Matrix4();
        o.getMatrixAt(i, instance);
        matrix.multiply(instance);
      }
      o.geometry.computeBoundingBox();
      const bounds = o.geometry.boundingBox!.clone().applyMatrix4(matrix);
      const center = bounds.getCenter(new T.Vector3()),
        half = bounds.getSize(new T.Vector3()).multiplyScalar(0.5);
      const add = (
        id: string,
        shape: Obstacle["shape"],
        c: T.Vector3,
        h: T.Vector3,
      ) =>
        obstacles.push({
          id,
          shape,
          center: [c.x, c.z, -c.y],
          halfSize: [
            Math.max(0.002, h.x),
            Math.max(0.002, h.z),
            Math.max(0.002, h.y),
          ],
        });
      const id = `${o.name || kind}:${obstacles.length}`;
      if (kind === "foliage") {
        // Crown excludes transparent card corners; a narrow trunk reaches the ground.
        add(
          `${id}:crown`,
          "ellipsoid",
          new T.Vector3(center.x, bounds.min.y + half.y * 1.25, center.z),
          new T.Vector3(half.x * 0.76, half.y * 0.73, half.z * 0.76),
        );
        add(
          `${id}:trunk`,
          "box",
          new T.Vector3(center.x, bounds.min.y + half.y * 0.45, center.z),
          new T.Vector3(
            Math.max(0.025, half.y * 0.025),
            half.y * 0.45,
            Math.max(0.025, half.y * 0.025),
          ),
        );
      } else add(id, "box", center, half);
    }
  });
  return obstacles;
}
