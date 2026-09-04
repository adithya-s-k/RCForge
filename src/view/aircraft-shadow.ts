import * as T from "three";

/** Fit the existing sun shadow to the aircraft and its landing surface, in scene metres. */
export function followAircraftShadow(
  light: T.DirectionalLight,
  aircraftPosition: T.Vector3,
  sunDirection: readonly [number, number, number],
  aircraftRadius: number,
  groundHeight = 0,
) {
  const direction = new T.Vector3(...sunDirection).normalize();
  // Caster and ground projection lie on the same light ray: altitude needs
  // more depth, not a wider map that would lose the small airframe's silhouette.
  const rayLength = (aircraftPosition.y - groundHeight) / direction.y;
  const center = aircraftPosition
    .clone()
    .addScaledVector(direction, -rayLength / 2);
  const halfSize = Math.max(16, aircraftRadius * 1.5 + 2);
  const right = new T.Vector3().crossVectors(light.up, direction).normalize();
  const up = new T.Vector3().crossVectors(direction, right);
  const texel = (halfSize * 2) / light.shadow.mapSize.x;
  // Keep the light's sampling grid fixed in world space while the aircraft moves.
  // Moving continuously by fractions of a texel makes ground shadows shimmer.
  for (const axis of [right, up]) {
    const offset = center.dot(axis);
    center.addScaledVector(axis, Math.round(offset / texel) * texel - offset);
  }
  // Low sun stretches the receiver footprint along the ray as well.
  const distance = Math.abs(rayLength) / 2 + aircraftRadius / direction.y + 8;
  light.target.position.copy(center);
  light.position.copy(center).addScaledVector(direction, distance);
  const camera = light.shadow.camera;
  Object.assign(camera, {
    left: -halfSize,
    right: halfSize,
    top: halfSize,
    bottom: -halfSize,
    near: 1,
    far: distance * 2,
  });
  camera.updateProjectionMatrix();
  // A constant offset in metres avoids an increasingly detached shadow at height.
  light.shadow.bias = -0.002 / (camera.far - camera.near);
}
