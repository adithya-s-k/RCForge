import * as T from "three";

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

export function terrainMaterial(dry: boolean, mown = false, prepared = false) {
  const material = new T.MeshStandardMaterial({
    map: surfaceTexture(`lite/${dry ? "dry-ground" : "turf"}-color.jpg`, true),
    color: dry ? "#fff3dd" : "#d1d8b5",
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
      `varying vec3 vFieldPosition;\n${noiseGLSL}\n` + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      `
      vec2 fieldUV = vec2(vFieldPosition.x, -vFieldPosition.z) / ${dry ? "4.0" : "1.4"};
      vec4 fieldAlbedo = texture2D(map, fieldUV);
      // Sub-pixel detail fades to a quiet base tone instead of shimmering.
      // This prevents repeating highlights and shimmer in grazing/chase views.
      float distanceFade = smoothstep(25.0, 180.0, length(vViewPosition));
      fieldAlbedo.rgb = mix(fieldAlbedo.rgb, vec3(${dry ? "0.31285, 0.18295, 0.08432" : "0.12, 0.155, 0.075"}), distanceFade * 0.96);
      ${prepared ? (dry ? "fieldAlbedo.rgb = mix(fieldAlbedo.rgb, vec3(0.36, 0.27, 0.16), 0.65);" : "fieldAlbedo.rgb *= 1.3;") : ""}
      fieldAlbedo.rgb = mix(vec3(dot(fieldAlbedo.rgb, vec3(0.299,0.587,0.114))), fieldAlbedo.rgb, 0.68);
      float macro = fieldNoise(vFieldPosition.xz * 0.011) * 0.12 + fieldNoise(vFieldPosition.xz * 0.047) * 0.06;
      diffuseColor *= vec4(fieldAlbedo.rgb * (0.9 + macro), 1.0);
      ${mown && !dry ? "diffuseColor.rgb *= 0.98 + 0.035 * sin(vFieldPosition.x * 0.85);" : ""}
    `,
    );
  };
  material.customProgramCacheKey = () =>
    `field-lite-v1-${dry}-${mown}-${prepared}`;
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
