import * as T from "three";
import type { Scenery } from "../core/scenery";
import { seededRandom, terrainNoise as noise } from "./terrain-material";

import { renderBudget } from "./render-budget";
import { mountainMaterial } from "./mountain-material";
import alpineTerrain from "./data/alpine-height.json";
import mesaTerrain from "./data/mesa-height.json";

/** Bilinear sampling of metre-valued DEM data; field clearing is a deliberate visual edit. */
export function landscapeHeight(x: number, z: number, profile: Scenery) {
  const radius = Math.hypot(x, z);
  const rise = T.MathUtils.smoothstep(radius, 430, 1100);
  if (profile.surface === "asphalt") {
    const rolling =
      noise(x * 0.00065 + profile.seed, z * 0.00065) * 150 +
      noise(x * 0.002, z * 0.002) * 24;
    return rolling * T.MathUtils.smoothstep(radius, 700, 1900) - 1.5;
  }
  const data = profile.surface === "grass" ? alpineTerrain : mesaTerrain;
  const u = T.MathUtils.clamp(
    (x / data.extentM + 0.5) * (data.grid - 1),
    0,
    data.grid - 1.0001,
  );
  const v = T.MathUtils.clamp(
    (z / data.extentM + 0.5) * (data.grid - 1),
    0,
    data.grid - 1.0001,
  );
  const col = Math.floor(u),
    row = Math.floor(v),
    i = row * data.grid + col;
  const a = T.MathUtils.lerp(
    data.elevationsM[i],
    data.elevationsM[i + 1],
    u - col,
  );
  const b = T.MathUtils.lerp(
    data.elevationsM[i + data.grid],
    data.elevationsM[i + data.grid + 1],
    u - col,
  );
  const elevation = Math.max(0, T.MathUtils.lerp(a, b, v - row) - data.datumM);
  return elevation * rise - 1.5;
}

/** Distant visual terrain. The usable airfield retains its flat collision surface. */
export function addLandscape(field: T.Group, profile: Scenery) {
  const dry = profile.surface === "dirt";
  const geometry = new T.PlaneGeometry(
    12000,
    12000,
    renderBudget.terrainSegments,
    renderBudget.terrainSegments,
  );
  geometry.rotateX(-Math.PI / 2);
  const p = geometry.getAttribute("position");
  for (let i = 0; i < p.count; i++)
    p.setY(i, landscapeHeight(p.getX(i), p.getZ(i), profile));
  geometry.computeVertexNormals();
  const occlusion = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      z = p.getZ(i);
    const surrounding =
      (landscapeHeight(x - 90, z, profile) +
        landscapeHeight(x + 90, z, profile) +
        landscapeHeight(x, z - 90, profile) +
        landscapeHeight(x, z + 90, profile)) /
      4;
    occlusion[i] =
      1 - T.MathUtils.clamp((surrounding - p.getY(i)) / 100, 0, 0.28);
  }
  geometry.setAttribute(
    "terrainOcclusion",
    new T.BufferAttribute(occlusion, 1),
  );
  field.add(new T.Mesh(geometry, mountainMaterial(geometry, profile)));

  const rand = seededRandom(profile.seed + 25),
    dummy = new T.Object3D();
  const rockGeometry = new T.IcosahedronGeometry(1, 1),
    rp = rockGeometry.getAttribute("position");
  for (let i = 0; i < rp.count; i++) {
    const x = rp.getX(i),
      y = rp.getY(i),
      z = rp.getZ(i);
    const d = 0.85 + noise(x * 5, z * 5) * 0.3;
    rp.setXYZ(i, x * d, y * (0.55 + noise(x * 3, y * 2) * 0.3), z * d);
  }
  rockGeometry.computeVertexNormals();
  const rocks = new T.InstancedMesh(
    rockGeometry,
    new T.MeshStandardMaterial({
      color: dry ? "#baa187" : "#a4aa99",
      roughness: 1,
    }),
    dry ? 60 : 18,
  );
  for (let i = 0; i < rocks.count; i++) {
    const x = -100 + rand() * 400;
    let z = (rand() - 0.5) * 300;
    if (Math.abs(z) < 15) z = Math.sign(z || 1) * (15 + rand() * 40);
    const size = i < 25 ? 0.4 + rand() * 0.8 : 0.04 + rand() * 0.22;
    dummy.position.set(x, size * 0.12, z);
    dummy.scale.set(size * (0.9 + rand()), size, size * (0.8 + rand()));
    dummy.rotation.set(rand() * 0.25, rand() * Math.PI * 2, rand() * 0.2);
    dummy.updateMatrix();
    rocks.setMatrixAt(i, dummy.matrix);
  }
  rocks.receiveShadow = true;
  field.add(rocks);
}

/** Quiet sky gradient and a soft sun; no HDR download or atmospheric scattering pass. */
export function createSky(profile: Scenery) {
  const dry = profile.surface === "dirt";
  const sky = new T.Mesh(
    new T.SphereGeometry(8500, 24, 12),
    new T.ShaderMaterial({
      side: T.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        zenith: { value: new T.Color(dry ? "#91b3c6" : "#81aecd") },
        horizon: { value: new T.Color(profile.fog) },
        sunDirection: { value: new T.Vector3(...profile.sun).normalize() },
        sunTint: { value: new T.Color(profile.sunColor) },
      },
      vertexShader: `varying vec3 skyDirection;
      void main() { skyDirection = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `varying vec3 skyDirection;
      uniform vec3 zenith, horizon, sunDirection, sunTint;
      void main() {
        vec3 direction = normalize(skyDirection);
        float elevation = pow(max(direction.y, 0.0), 0.45);
        vec3 color = mix(horizon, zenith, elevation);
        float sun = max(dot(direction, sunDirection), 0.0);
        color += sunTint * (pow(sun, 64.0) * 0.08 + smoothstep(0.9997, 0.99995, sun) * 1.1);
        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    }),
  );
  sky.renderOrder = -10;
  return sky;
}
