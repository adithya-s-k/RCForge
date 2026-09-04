import { sceneries, type Scenery } from "../core/scenery";
import { addFieldDetails } from "./field-details";
import * as T from "three";
import { terrainMaterial } from "./terrain-material";
import { addVegetation } from "./vegetation";
import { addLandscape, createSky } from "./landscape";
import { addRunway } from "./runway";
/** Adjacent terrain patches share edges, never overlapping depth surfaces. */
function patch(
  width: number,
  height: number,
  hole?: { x: number; width: number; height: number },
) {
  const shape = new T.Shape();
  shape.moveTo(-width / 2, -height / 2);
  shape.lineTo(width / 2, -height / 2);
  shape.lineTo(width / 2, height / 2);
  shape.lineTo(-width / 2, height / 2);
  shape.closePath();
  if (hole) {
    const h = new T.Path(),
      x = hole.x,
      w = hole.width / 2,
      z = hole.height / 2;
    h.moveTo(x - w, -z);
    h.lineTo(x - w, z);
    h.lineTo(x + w, z);
    h.lineTo(x + w, -z);
    h.closePath();
    shape.holes.push(h);
  }
  const g = new T.ShapeGeometry(shape),
    position = g.getAttribute("position"),
    uv = g.getAttribute("uv");
  for (let i = 0; i < position.count; i++)
    uv.setXY(
      i,
      position.getX(i) / width + 0.5,
      position.getY(i) / height + 0.5,
    );
  return g;
}
export function createField(scene: T.Scene, profile: Scenery = sceneries.club) {
  const field = new T.Group();
  scene.add(field);
  addFieldDetails(field);
  addVegetation(field, profile);
  const groundMaterial = terrainMaterial(profile.surface === "dirt");
  addLandscape(field, profile, groundMaterial.map!);
  const ground = new T.Mesh(
    patch(6000, 6000, { x: 58, width: 220, height: 22 }),
    groundMaterial,
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  field.add(ground);
  const strip = new T.Mesh(
    patch(220, 22, { x: -10, width: 172, height: 8.4 }),
    groundMaterial,
  );
  strip.rotation.x = -Math.PI / 2;
  strip.position.set(58, 0, 0);
  strip.receiveShadow = true;
  field.add(strip);
  const shoulderMaterial = terrainMaterial(profile.surface !== "grass");
  shoulderMaterial.color.set(
    profile.surface === "asphalt"
      ? "#b3b5ab"
      : profile.surface === "grass"
        ? "#d1d8b5"
        : "#fff3dd",
  );
  const shoulder = new T.Mesh(
    patch(172, 8.4, { x: 0, width: 170, height: 7 }),
    shoulderMaterial,
  );
  shoulder.rotation.x = -Math.PI / 2;
  shoulder.position.x = 48;
  shoulder.receiveShadow = true;
  field.add(shoulder);
  addRunway(field, profile);
  // Low-profile safety fence, pilot marker and a small flight table establish human scale.
  const metal = new T.MeshStandardMaterial({
    color: "#5b6665",
    metalness: 0.45,
    roughness: 0.55,
  });
  for (let x = -16; x <= 12; x += 4) {
    const p = new T.Mesh(new T.CylinderGeometry(0.025, 0.025, 0.8, 8), metal);
    p.position.set(x, 0.4, 11);
    field.add(p);
  }
  for (const y of [0.3, 0.7]) {
    const rail = new T.Mesh(new T.CylinderGeometry(0.012, 0.012, 28, 8), metal);
    rail.rotation.z = Math.PI / 2;
    rail.position.set(-2, y, 11);
    field.add(rail);
  }
  const table = new T.Mesh(
    new T.BoxGeometry(1.6, 0.06, 0.55),
    new T.MeshStandardMaterial({ color: "#8e8878" }),
  );
  table.position.set(-12, 0.82, 16);
  table.castShadow = true;
  field.add(table);
  for (const dx of [-0.65, 0.65])
    for (const dz of [-0.2, 0.2]) {
      const leg = new T.Mesh(new T.BoxGeometry(0.04, 0.8, 0.04), metal);
      leg.position.set(-12 + dx, 0.4, 16 + dz);
      field.add(leg);
    }
  const pole = new T.Mesh(new T.CylinderGeometry(0.025, 0.035, 4, 12), metal);
  pole.position.set(12, 2, 15);
  field.add(pole);
  const sock = new T.Group();
  sock.position.set(12, 4, 15);
  field.add(sock);
  for (let i = 0; i < 5; i++) {
    const cone = new T.Mesh(
      new T.CylinderGeometry(
        0.14 - i * 0.021,
        0.16 - i * 0.021,
        0.22,
        12,
        1,
        true,
      ),
      new T.MeshStandardMaterial({
        color: i % 2 ? "#e5e2d6" : "#b84f28",
        side: T.DoubleSide,
      }),
    );
    cone.rotation.z = Math.PI / 2;
    cone.position.x = 0.11 + i * 0.22;
    sock.add(cone);
  }
  const sky = createSky(profile);
  scene.add(sky);
  return {
    field,
    sky,
    sock,
    update: (camera: T.Camera) => {
      sky.position.copy(camera.position);
    },
    dispose: () => {
      scene.remove(field, sky);
      const geometries = new Set<T.BufferGeometry>(),
        materials = new Set<T.Material>(),
        textures = new Set<T.Texture>();
      for (const root of [field, sky])
        root.traverse((o) => {
          if (o instanceof T.Mesh) {
            if (o instanceof T.InstancedMesh) o.dispose();
            geometries.add(o.geometry);
            for (const m of Array.isArray(o.material)
              ? o.material
              : [o.material]) {
              materials.add(m);
              for (const v of Object.values(m))
                if (v instanceof T.Texture) textures.add(v);
              for (const texture of m.userData.ownedTextures ?? [])
                textures.add(texture);
            }
          }
        });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
  };
}
