import * as T from "three";

export type InspectionView = "perspective" | "top" | "side";

/** Exact orthographic drawing views in the renderer's X-forward, Y-up, Z-right frame. */
export function fitInspectionCamera(
  camera: T.OrthographicCamera,
  view: "top" | "side",
  bodySize: T.Vector3,
  center: T.Vector3,
  aspect: number,
  zoom = 1,
) {
  const width = view === "top" ? bodySize.y : bodySize.x;
  const height = view === "top" ? bodySize.x : bodySize.z;
  const halfHeight = Math.max(height, width / aspect) * 0.64 * zoom;
  camera.left = -halfHeight * aspect;
  camera.right = halfHeight * aspect;
  camera.top = halfHeight;
  camera.bottom = -halfHeight;
  const distance = Math.max(bodySize.length() * 2, 1);
  camera.near = 0.001;
  camera.far = distance * 4;
  camera.position
    .copy(center)
    .add(
      view === "top"
        ? new T.Vector3(0, distance, 0)
        : new T.Vector3(0, 0, distance),
    );
  camera.up.set(view === "top" ? 1 : 0, view === "top" ? 0 : 1, 0);
  camera.lookAt(center);
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();
}
