import * as T from "three";
import { surfaceDetailGLSL } from "./surface-detail";

/** Local CC0 scans; see public/scenery/README.md. All distances are metres. */
export function surfaceTexture(name: string, color = false) {
  const texture = new T.TextureLoader().load(
    `${import.meta.env.BASE_URL}scenery/${name}`,
  );
  texture.wrapS = texture.wrapT = T.RepeatWrapping;
  texture.anisotropy = 4;
  if (color) texture.colorSpace = T.SRGBColorSpace;
  return texture;
}

export const noiseGLSL = /* glsl */ `
  float fieldHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float fieldNoise(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(fieldHash(i), fieldHash(i + vec2(1,0)), f.x),
      mix(fieldHash(i + vec2(0,1)), fieldHash(i + vec2(1,1)), f.x), f.y);
  }
`;

export function terrainMaterial(
  dry: boolean,
  prepared = false,
  options: { map?: T.Texture; mountain?: boolean } = {},
) {
  const material = new T.MeshStandardMaterial({
    map:
      options.map ??
      surfaceTexture(`lite/${dry ? "dry-ground" : "turf"}-color.jpg`, true),
    vertexColors: options.mountain ?? false,
    color: dry ? "#e8ddd0" : "#bdc4b0",
    roughness: 1,
  });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader =
      `varying vec3 vFieldPosition;\n` + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `
      #include <begin_vertex>
      vFieldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    `,
    );
    shader.fragmentShader =
      `varying vec3 vFieldPosition;\n${noiseGLSL}\n${surfaceDetailGLSL}\n` +
      shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      `
      vec2 fieldPoint = vFieldPosition.xz;
      // Rotate the sampling frame away from the runway. Adjacent meshes use
      // the identical world coordinates, so their texture patches join exactly.
      vec2 fieldUV = mat2(0.8, -0.6, 0.6, 0.8) * fieldPoint / ${dry ? "4.0" : "1.4"};
      vec3 fieldAlbedo = naturalSurface(map, fieldUV);
      float footprint = max(length(dFdx(fieldPoint)), length(dFdy(fieldPoint)));
      float fineDetail = 1.0 - smoothstep(0.035, 0.24, footprint);
      // Match the source's linear-light mean at distance, rather than changing
      // its hue at a fixed camera radius. Mipmaps still filter each detail tap.
      vec3 fieldMean = vec3(${dry ? "0.30894, 0.18086, 0.08330" : "0.12445, 0.15838, 0.03478"});
      fieldAlbedo = mix(fieldMean, fieldAlbedo, 0.25 + 0.75 * fineDetail);
      vec2 broadPoint = mat2(0.932, 0.362, -0.362, 0.932) * fieldPoint;
      float broad = fieldNoise(broadPoint * 0.008 + vec2(7.3, 19.1));
      float patches = fieldNoise(broadPoint * 0.061 + vec2(broad * 2.7, 31.7));
      float grain = fieldNoise(broadPoint * 0.73 + vec2(12.4, 4.9));
      // Low-contrast landcover, not large blurry green clouds.
      float variation = (broad - 0.5) * 0.08 + (patches - 0.5) * 0.07;
      float soilPockets = smoothstep(0.57, 0.77, patches + (grain - 0.5) * 0.22);
      float tussock = fieldNoise(broadPoint * 0.21 + vec2(patches * 2.0));
      // Continuous maintenance zone; no separate rectangular lawn tile.
      float clearing = 1.0 - smoothstep(0.0, 8.0,
        max(abs(fieldPoint.x - 48.0) - 92.0, abs(fieldPoint.y) - 4.0));
      float preparedStrip = ${prepared ? "1.0" : "0.0"}
        * (1.0 - smoothstep(2.7, 3.5, abs(fieldPoint.y)))
        * (1.0 - smoothstep(83.8, 85.0, abs(fieldPoint.x - 48.0)));
      fieldAlbedo *= 1.0 + variation * (1.0 - preparedStrip * 0.5);
      ${
        dry
          ? "fieldAlbedo *= mix(vec3(0.90, 0.94, 1.0), vec3(1.07, 1.03, 0.94), patches); vec3 packedSoil = fieldMean * vec3(1.18, 1.37, 1.70) + (fieldAlbedo - fieldMean) * 0.25; fieldAlbedo = mix(fieldAlbedo, packedSoil, preparedStrip * 0.85);"
          : "fieldAlbedo *= mix(vec3(0.92, 0.98, 0.94), vec3(1.07, 1.02, 0.91), patches); fieldAlbedo = mix(fieldAlbedo, vec3(0.145, 0.128, 0.075), soilPockets * 0.10 * (1.0 - clearing)); fieldAlbedo *= 1.0 + (tussock - 0.5) * 0.05; fieldAlbedo *= 1.0 + clearing * 0.06 + preparedStrip * 0.14;"
      }
      fieldAlbedo = mix(vec3(dot(fieldAlbedo, vec3(0.299,0.587,0.114))), fieldAlbedo, 0.72);
      diffuseColor.rgb *= fieldAlbedo;
      ${
        options.mountain
          ? `
      // The airfield and foothills use identical albedo and lighting at their
      // intersection. Rock/altitude colors emerge gradually above that join.
      vec2 mountainPoint = vFieldPosition.xz;
      float mountainLarge = fieldNoise(mountainPoint * 0.008);
      float mountainRidge = fieldNoise(mountainPoint * 0.037
        + vec2(mountainLarge * 4.0, vFieldPosition.y * 0.018));
      float mountainDetail = 1.0 - smoothstep(4.0, 35.0, footprint);
      vec3 mountainAlbedo = vColor.rgb * (0.83 + mountainLarge * 0.23
        + (mountainRidge - 0.5) * 0.24 * mountainDetail);
      ${
        dry
          ? `
      float strata = sin(vFieldPosition.y * 0.12 + mountainLarge * 8.0 + mountainRidge) * 0.5 + 0.5;
      mountainAlbedo *= 0.90 + strata * 0.15 * mountainDetail;
      `
          : `
      mountainAlbedo = mix(mountainAlbedo, mountainAlbedo * vec3(0.88, 0.94, 0.88),
        smoothstep(0.42, 0.75, mountainRidge) * 0.38);
      `
      }
      diffuseColor.rgb = mix(diffuseColor.rgb, mountainAlbedo,
        smoothstep(2.0, 85.0, vFieldPosition.y));
      `
          : ""
      }
      float fieldHeight = ((grain - 0.5) * ${dry ? "0.035" : "0.018"}
        + dot(fieldAlbedo - fieldMean, vec3(0.299, 0.587, 0.114)) * 0.025)
        * fineDetail * (1.0 - preparedStrip * 0.65);
    `,
    );
    // Vertex colors already form the altitude layer above. Multiplying them a
    // second time would reintroduce a dark seam where the landscape meets Y=0.
    if (options.mountain)
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <color_fragment>",
        "",
      );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <normal_fragment_maps>",
      "#include <normal_fragment_maps>\nnormal = surfaceRelief(-vViewPosition, normal, fieldHeight);",
    );
  };
  material.customProgramCacheKey = () =>
    `field-natural-v5-${dry}-${prepared}-${!!options.mountain}`;
  return material;
}

export function seededRandom(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

const hash = (x: number, z: number) => {
  const n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return n - Math.floor(n);
};
export function terrainNoise(x: number, z: number) {
  const ix = Math.floor(x),
    iz = Math.floor(z);
  let fx = x - ix,
    fz = z - iz;
  fx *= fx * (3 - 2 * fx);
  fz *= fz * (3 - 2 * fz);
  return T.MathUtils.lerp(
    T.MathUtils.lerp(hash(ix, iz), hash(ix + 1, iz), fx),
    T.MathUtils.lerp(hash(ix, iz + 1), hash(ix + 1, iz + 1), fx),
    fz,
  );
}
