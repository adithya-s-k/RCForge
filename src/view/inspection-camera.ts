import * as T from "three";

export type InspectionView = "perspective" | "top" | "side";

/** Fit every assembled corner at the current orbit angle, including narrow panels. */
export function inspectionDistance(
  bodySize: T.Vector3,
  backward: T.Vector3,
  aspect: number,
  fovDeg = 42,
) {
  const right = new T.Vector3()
    .crossVectors(new T.Vector3(0, 1, 0), backward)
    .normalize();
  const up = new T.Vector3().crossVectors(backward, right).normalize();
  const tanV = Math.tan(T.MathUtils.degToRad(fovDeg / 2));
  let distance = 0;
  for (const x of [-0.5, 0.5])
    for (const y of [-0.5, 0.5])
      for (const z of [-0.5, 0.5]) {
        const corner = new T.Vector3(
          x * bodySize.x,
          y * bodySize.z,
          z * bodySize.y,
        );
        distance = Math.max(
          distance,
          corner.dot(backward) +
            1.28 *
              Math.max(
                Math.abs(corner.dot(right)) / (tanV * aspect),
                Math.abs(corner.dot(up)) / tanV,
              ),
        );
      }
  return Math.max(distance, 0.1);
}

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
