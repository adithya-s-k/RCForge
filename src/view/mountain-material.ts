import * as T from "three";
import type { Scenery } from "../core/scenery";
import { terrainNoise, terrainMaterial } from "./terrain-material";

/** Shared field shading at the foothills; baked slope/height colors at altitude. */
export function mountainMaterial(
  geometry: T.BufferGeometry,
  profile: Scenery,
  fieldMap: T.Texture,
) {
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
  return terrainMaterial(dry, false, { map: fieldMap, mountain: true });
}
