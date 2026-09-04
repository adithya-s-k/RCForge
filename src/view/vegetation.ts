import * as T from "three";
import type { Scenery } from "../core/scenery";
import { seededRandom, surfaceTexture, terrainNoise } from "./terrain-material";
import { renderBudget } from "./render-budget";
import { landscapeSurfaceHeight } from "./landscape";

/** Crossed foliage cards retain parallax without thousands of solid canopy blobs. */
function plantGeometry(kind: number) {
  // Independent silhouettes with transparent gutters. Bounds avoid adjacent crowns.
  const rect = [
    [0, 0, 634, 622],
    [638, 0, 1064, 626],
    [1070, 0, 1536, 627],
    [0, 637, 590, 1002],
    [596, 638, 1104, 999],
    [1110, 638, 1536, 995],
  ][kind];
  const [left, top, right, bottom] = rect;
  const width = (right - left) / (bottom - top);
  const pos: number[] = [],
    uv: number[] = [],
    normals: number[] = [],
    indices: number[] = [];
  for (let p = 0; p < 3; p++) {
    const angle = (p * Math.PI) / 3,
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
  const atlas = surfaceTexture("vegetation-v2.png", true);
  atlas.wrapS = atlas.wrapT = T.ClampToEdgeWrapping;
  // Keep an alpha-tested, depth-writing cutout. No sorting, temporal noise or
  // bright opaque backing; the new atlas has foliage-colored transparent RGB.
  const foliage = new T.MeshBasicMaterial({
    map: atlas,
    alphaTest: 0.38,
    side: T.DoubleSide,
    color: dry ? "#ded5c3" : "#d5dbcd",
    alphaToCoverage: true,
  });
  foliage.onBeforeCompile = (shader) => {
    shader.vertexShader = "varying float plantHeight;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\nplantHeight = position.y;",
    );
    shader.fragmentShader =
      "varying float plantHeight;\n" + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      `#include <map_fragment>
       // Soft self-occlusion makes crowns sit above the shaded lower branches.
       diffuseColor.rgb *= 1.5 * mix(0.7, 1.0, smoothstep(0.0, 0.8, plantHeight));`,
    );
  };
  foliage.customProgramCacheKey = () => "foliage-v2";
  const variants = dry ? [5, 4] : alpine ? [2, 2, 1, 4] : [0, 1, 3, 4];
  const counts = new Map<number, number>();
  for (let i = 0; i < profile.treeCount; i++) {
    const variant = variants[i % variants.length];
    counts.set(variant, (counts.get(variant) ?? 0) + 1);
  }
  // Irregular woodland edges and small groves, rather than radial rows of trees.
  const clusters = Array.from({ length: 14 }, () => {
    const angle = rand() * Math.PI * 2,
      r = 150 + rand() ** 1.6 * 1050;
    return [Math.cos(angle) * r + 45, Math.sin(angle) * r];
  });
  const shade = new T.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
    vertexShader: `varying vec2 shadeUV;
      #include <common>
      #include <logdepthbuf_pars_vertex>
      void main() { shadeUV = uv; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
      #include <logdepthbuf_vertex>
      }`,
    fragmentShader: `varying vec2 shadeUV;
      #include <logdepthbuf_pars_fragment>
      void main() {
      #include <logdepthbuf_fragment>
      float r = length(shadeUV - 0.5) * 2.0;
      gl_FragColor = vec4(0.025, 0.030, 0.017, (1.0 - smoothstep(0.05, 1.0, r)) * 0.20);
      }`,
  });
  const shadeGeometry = new T.PlaneGeometry(1, 1);
  shadeGeometry.rotateX(-Math.PI / 2);
  const shades = new T.InstancedMesh(shadeGeometry, shade, profile.treeCount);
  let plantIndex = 0;
  for (const [kind, count] of counts) {
    const plants = new T.InstancedMesh(plantGeometry(kind), foliage, count);
    for (let i = 0; i < count; i++) {
      const cluster = clusters[plantIndex % clusters.length];
      const spread = dry ? 180 : 85;
      const x = cluster[0] + (rand() + rand() - 1) * spread;
      let z = cluster[1] + (rand() + rand() - 1) * spread;
      if (Math.abs(z) < 60 && x > -120 && x < 260)
        z = Math.sign(z || 1) * (70 + rand() * 55);
      const height =
        kind >= 4
          ? (dry ? 0.5 : 1.2) + rand() * 2.0
          : kind === 2
            ? 12 + rand() * 12
            : 7 + rand() * 11;
      const ground = Math.max(0, landscapeSurfaceHeight(x, z, profile));
      dummy.position.set(x, ground - 0.06, z);
      dummy.rotation.set(0, rand() * Math.PI * 2, 0);
      dummy.scale.set(height * (0.8 + rand() * 0.35), height, height);
      dummy.updateMatrix();
      plants.setMatrixAt(i, dummy.matrix);
      plants.setColorAt(
        i,
        new T.Color().setHSL(
          dry ? 0.1 : 0.2,
          0.04 + rand() * 0.06,
          0.82 + rand() * 0.15,
        ),
      );
      // Small static contact occlusion on the flat field only; no extra shadow pass.
      dummy.position.set(x, 0.012, z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(ground > 0.05 ? 0 : height * 0.7);
      dummy.updateMatrix();
      shades.setMatrixAt(plantIndex++, dummy.matrix);
    }
    plants.computeBoundingSphere();
    field.add(plants);
  }
  shades.computeBoundingSphere();
  field.add(shades);

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
