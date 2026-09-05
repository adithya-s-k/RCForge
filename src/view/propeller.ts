import * as T from "three";

/** Lightweight tapered/twisted two-sided blade. Radius is physical; section,
 * sweep and twist are cosmetic estimates, not a manufacturer's blade CAD or
 * an aerodynamic pitch model. Local X is the shaft, Y points toward the tip. */
export function propellerBlade(
  radius: number,
  handedness: 1 | -1 = 1,
): T.BufferGeometry {
  const radial = 12,
    chordwise = 6;
  const positions: number[] = [],
    indices: number[] = [];
  const stride = (chordwise + 1) * 2;
  for (let i = 0; i <= radial; i++) {
    const t = i / radial;
    const r = radius * (0.07 + 0.93 * t);
    const chord =
      radius * (0.06 * (1 - t) + 0.19 * Math.sin(Math.PI * t) ** 0.7);
    const sweep = radius * 0.035 * t * t;
    const pitch = handedness * (0.5 - 0.32 * t);
    for (let side = 0; side < 2; side++) {
      for (let j = 0; j <= chordwise; j++) {
        const u = j / chordwise - 0.5;
        const thickness =
          Math.sin(Math.PI * (u + 0.5)) *
          radius *
          0.007 *
          (1 - t) *
          (side ? -1 : 1);
        positions.push(
          u * chord * Math.sin(pitch) + thickness,
          Math.sqrt(r * r - sweep * sweep),
          sweep + u * chord * Math.cos(pitch),
        );
      }
    }
  }
  for (let i = 0; i < radial; i++) {
    for (let side = 0; side < 2; side++) {
      for (let j = 0; j < chordwise; j++) {
        const a = i * stride + side * (chordwise + 1) + j;
        const b = a + stride;
        if (side) indices.push(a, a + 1, b, a + 1, b + 1, b);
        else indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
  }
  // The root closes against the hub. Leading/trailing edges and tip taper shut.
  for (let j = 0; j < chordwise; j++) {
    const b = j + chordwise + 1;
    indices.push(j, j + 1, b, j + 1, b + 1, b);
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
