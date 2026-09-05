import * as T from "three";
import type { Aircraft } from "../core/schema";
import { fpvLensOffset } from "../core/fpv";
import { componentRotation } from "./component-pose";

/** Body/datum mount shared by the lens view and visible housing. */
export function fpvMount(a: Aircraft, cg: readonly number[]) {
  const part = a.parts.find((p) => p.id === a.fpv?.partId);
  if (!part) return undefined;
  const rotation = componentRotation(part);
  return {
    position: new T.Vector3(...fpvLensOffset(part))
      .applyQuaternion(rotation)
      .add(new T.Vector3(...part.positionM))
      .sub(new T.Vector3(cg[0], cg[1], cg[2])),
    forward: new T.Vector3(1, 0, 0).applyQuaternion(rotation),
    up: new T.Vector3(0, 0, -1).applyQuaternion(rotation),
    fov: a.fpv!.fovDeg,
  };
}
export function placeFpvCamera(
  camera: T.PerspectiveCamera,
  mount: NonNullable<ReturnType<typeof fpvMount>>,
  aircraftPosition: T.Vector3,
  bodyToScene: T.Quaternion,
) {
  camera.position
    .copy(mount.position)
    .applyQuaternion(bodyToScene)
    .add(aircraftPosition);
  camera.up.copy(mount.up).applyQuaternion(bodyToScene);
  camera.lookAt(
    mount.forward.clone().applyQuaternion(bodyToScene).add(camera.position),
  );
  camera.fov = mount.fov;
  camera.near = 0.003;
}
export function buildFpvHousing(a: Aircraft) {
  const part = a.parts.find((p) => p.id === a.fpv?.partId);
  if (!part) return undefined;
  const housing = new T.Group();
  housing.name = `fpv-camera:${part.id}`;
  housing.position.set(...part.positionM);
  housing.quaternion.copy(componentRotation(part));
  const body = new T.Mesh(
    new T.BoxGeometry(...part.sizeM),
    new T.MeshStandardMaterial({ color: part.color, roughness: 0.6 }),
  );
  const radius = Math.min(part.sizeM[1], part.sizeM[2]) * 0.29;
  const lens = new T.Mesh(
    new T.CylinderGeometry(radius, radius, 0.006, 16),
    new T.MeshStandardMaterial({
      color: "#15171b",
      roughness: 0.26,
      metalness: 0.25,
    }),
  );
  lens.rotation.z = -Math.PI / 2;
  lens.position.x = part.sizeM[0] / 2 + 0.0028;
  housing.add(body, lens);
  body.castShadow = lens.castShadow = true;
  return housing;
}
