import * as T from "three";
import type { Scenery } from "../core/scenery";
import { seededRandom, surfaceTexture, terrainNoise } from "./terrain-material";
import { renderBudget } from "./render-budget";
import { landscapeHeight } from "./landscape";

/** Crossed foliage cards retain parallax without thousands of solid canopy blobs. */
function plantGeometry(kind: "oak" | "pine" | "scrub") {
  // Pixel bounds in the generated atlas. Alpha is retained, including canopy gaps.
  const rect =
    kind === "oak"
      ? [0, 50, 715, 980]
      : kind === "pine"
        ? [717, 50, 1198, 980]
        : [1175, 604, 1535, 980];
  const [left, top, right, bottom] = rect;
  const width = (right - left) / (bottom - top);
  const pos: number[] = [],
    uv: number[] = [],
    normals: number[] = [],
    indices: number[] = [];
  for (let p = 0; p < 2; p++) {
    const angle = (p * Math.PI) / 2,
      dx = (Math.cos(angle) * width) / 2,
      dz = (Math.sin(angle) * width) / 2;
    pos.push(-dx, 0, -dz, dx, 0, dz, -dx, 1, -dz, dx, 1, dz);
    for (let n = 0; n < 4; n++) normals.push(0, 1, 0);
    uv.push(
      left / 1536,
      1 - bottom / 1024,
      right / 1536,
      1 - bottom / 1024,
      left / 1536,
      1 - top / 1024,
      right / 1536,
      1 - top / 1024,
    );
    const i = p * 4;
    indices.push(i, i + 1, i + 2, i + 2, i + 1, i + 3);
  }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new T.Float32BufferAttribute(normals, 3));
  g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
  g.setIndex(indices);
  return g;
}

function grassTuft(dry: boolean) {
  // Curved, tapered geometry reads as blades from every angle, including chase view.
  const g = new T.BufferGeometry(),
    positions: number[] = [],
    colors: number[] = [],
    indices: number[] = [];
  const rand = seededRandom(94);
  for (let b = 0; b < renderBudget.grassBlades; b++) {
    const a = rand() * Math.PI * 2,
      h = 0.075 + rand() * 0.12,
      width = 0.003 + rand() * 0.003;
    const x = (rand() - 0.5) * 0.18,
      z = (rand() - 0.5) * 0.18;
    const dx = Math.cos(a) * width,
      dz = Math.sin(a) * width,
      bendX = Math.sin(a) * h * 0.42,
      bendZ = Math.cos(a) * h * 0.42;
    const i = positions.length / 3;
    positions.push(
      x - dx,
      0,
      z - dz,
      x + dx,
      0,
      z + dz,
      x - dx * 0.5 + bendX * 0.3,
      h * 0.58,
      z - dz * 0.5 + bendZ * 0.3,
      x + dx * 0.5 + bendX * 0.3,
      h * 0.58,
      z + dz * 0.5 + bendZ * 0.3,
      x + bendX,
      h,
      z + bendZ,
    );
    const root = dry ? [0.14, 0.095, 0.04] : [0.048, 0.07, 0.014];
    const middle = dry ? [0.29, 0.2, 0.09] : [0.11, 0.15, 0.03];
    const tip = dry ? [0.4, 0.31, 0.16] : [0.18, 0.23, 0.065];
    colors.push(...root, ...root, ...middle, ...middle, ...tip);
    indices.push(i, i + 1, i + 2, i + 2, i + 1, i + 3, i + 2, i + 3, i + 4);
  }
  g.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  g.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

export function addVegetation(field: T.Group, profile: Scenery) {
  const dry = profile.surface === "dirt",
    alpine = profile.surface === "grass";
  const rand = seededRandom(profile.seed + 380),
    dummy = new T.Object3D();
  const atlas = surfaceTexture("lite/vegetation-atlas.png", true);
  atlas.wrapS = atlas.wrapT = T.ClampToEdgeWrapping;
  const plants = new T.InstancedMesh(
    plantGeometry(dry ? "scrub" : alpine ? "pine" : "oak"),
    new T.MeshBasicMaterial({
      map: atlas,
      alphaTest: 0.48,
      side: T.DoubleSide,
      color: dry ? "#e1d2b8" : "#bac6ae",
      alphaToCoverage: true,
    }),
    profile.treeCount,
  );
  const clusters = Array.from({ length: 24 }, (_, i) => {
    const angle = (i * Math.PI * 2) / 24 + rand() * 0.25;
    const r = 160 + rand() * (i < 8 ? 120 : 650);
    return [Math.cos(angle) * r + 45, Math.sin(angle) * r];
  });
  for (let i = 0; i < plants.count; i++) {
    const cluster = clusters[i % clusters.length];
    const spread = dry ? 170 : 90;
    let x = cluster[0] + (rand() + rand() - 1) * spread,
      z = cluster[1] + (rand() + rand() - 1) * spread;
    // An unobstructed runway and flight line, with a few trees defining the near field edge.
    if (Math.abs(z) < 43 && x > -65 && x < 210)
      z = Math.sign(z || 1) * (48 + rand() * 50);
    const height = dry
      ? 0.3 + rand() * 1.15
      : alpine
        ? 9 + rand() * 15
        : 8 + rand() * 12;
    dummy.position.set(
      x,
      Math.max(-0.015, landscapeHeight(x, z, profile) - 0.25),
      z,
    );
    dummy.rotation.set(0, rand() * Math.PI * 2, 0);
    dummy.scale.set(height * (0.85 + rand() * 0.35), height, height);
    dummy.updateMatrix();
    plants.setMatrixAt(i, dummy.matrix);
    plants.setColorAt(
      i,
      new T.Color().setHSL(
        dry ? 0.1 : 0.18,
        dry ? 0.08 : 0.09,
        0.78 + rand() * 0.18,
      ),
    );
  }
  // Distant foliage does not render into the aircraft shadow map.
  field.add(plants);

  const material = new T.MeshBasicMaterial({
    vertexColors: true,
    side: T.DoubleSide,
  });
  const count = dry ? renderBudget.dryGrassTufts : renderBudget.grassTufts;
  const grass = new T.InstancedMesh(grassTuft(dry), material, count);
  for (let i = 0; i < count; i++) {
    const close = i < count * 0.9;
    const x = -8 + (rand() - 0.5) * (close ? 48 : 250),
      z = -14 + (rand() - 0.5) * (close ? 40 : 160);
    // Mown landing strip, equipment footprint, and observer path stay clear.
    const excluded =
      (Math.abs(z) < 8.7 && x > -55 && x < 170) ||
      (x > -42 && x < -18 && z > -33 && z < -20);
    const patchiness = terrainNoise(x * 0.18, z * 0.18);
    dummy.position.set(x, excluded ? -3 : -0.015, z);
    dummy.rotation.set(0, rand() * Math.PI * 2, 0);
    const height = (dry ? 0.6 : 0.65) + rand() * (dry ? 1.3 : 0.8);
    dummy.scale.setScalar(
      height *
        (0.6 + patchiness * 0.8) *
        T.MathUtils.smoothstep(Math.abs(z), 8.7, 13),
    );
    dummy.updateMatrix();
    grass.setMatrixAt(i, dummy.matrix);
    grass.setColorAt(
      i,
      new T.Color().setHSL(
        dry ? 0.09 : 0.18,
        0.12 + rand() * 0.15,
        0.65 + rand() * 0.28,
      ),
    );
  }
  field.add(grass);
}
