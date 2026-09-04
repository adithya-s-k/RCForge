import * as T from "three";
import type { Scenery } from "../core/scenery";
import { terrainNoise, noiseGLSL } from "./terrain-material";

/** Baked slope/height plus filtered world-space strata; no extra image maps. */
export function mountainMaterial(geometry: T.BufferGeometry, profile: Scenery) {
  const dry = profile.surface === "dirt",
    alpine = profile.surface === "grass";
  const low = new T.Color(dry ? "#827157" : alpine ? "#66715b" : "#68745a");
  const rock = new T.Color(dry ? "#94755b" : "#757a79");
  const snow = new T.Color("#bcc7cb");
  const p = geometry.getAttribute("position"),
    n = geometry.getAttribute("normal");
  const occlusion = geometry.getAttribute("terrainOcclusion");
  const colors = new Float32Array(p.count * 3),
    color = new T.Color();
  for (let i = 0; i < p.count; i++) {
    const height = p.getY(i),
      slope = 1 - n.getY(i);
    const grain = terrainNoise(p.getX(i) * 0.006, p.getZ(i) * 0.006);
    const exposed = Math.max(
      T.MathUtils.smoothstep(slope, 0.12, 0.48),
      T.MathUtils.smoothstep(
        height + grain * 80,
        alpine ? 420 : 130,
        alpine ? 900 : 350,
      ),
    );
    color.copy(low).lerp(rock, exposed);
    if (alpine)
      color.lerp(
        snow,
        T.MathUtils.smoothstep(height + grain * 120, 1750, 2100) *
          T.MathUtils.smoothstep(n.getY(i), 0.65, 0.94),
      );
    color.multiplyScalar((0.88 + grain * 0.16) * occlusion.getX(i));
    color.toArray(colors, i * 3);
  }
  geometry.setAttribute("color", new T.BufferAttribute(colors, 3));
  const material = new T.MeshLambertMaterial({ vertexColors: true });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = "varying vec3 terrainPoint;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\nterrainPoint = position;",
    );
    shader.fragmentShader =
      "varying vec3 terrainPoint;\n" + noiseGLSL + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <color_fragment>",
      `
      #include <color_fragment>
      vec2 p = terrainPoint.xz;
      float large = fieldNoise(p * 0.008);
      float ridge = fieldNoise(p * 0.037 + vec2(large * 4.0, terrainPoint.y * 0.018));
      float footprint = max(length(dFdx(p)), length(dFdy(p)));
      float detail = 1.0 - smoothstep(4.0, 35.0, footprint);
      float strata = sin(terrainPoint.y * 0.12 + large * 8.0 + ridge) * 0.5 + 0.5;
      diffuseColor.rgb *= 0.83 + large * 0.23 + (ridge - 0.5) * 0.24 * detail;
      diffuseColor.rgb *= ${dry ? "0.90 + strata * 0.15 * detail" : "1.0"};
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.88, 0.94, 0.88),
        ${dry ? "0.0" : "smoothstep(0.42, 0.75, ridge) * 0.38"});
    `,
    );
  };
  material.customProgramCacheKey = () => `landscape-strata-v2-${dry}`;
  return material;
}
