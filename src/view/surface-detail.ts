/** Shared WebGL2 surface detail. Three texture taps, no extra maps or geometry.
 * Random-offset triangular blending follows Deliot/Heitz's tiling principle;
 * this lightweight variant uses sharpened weights, not histogram transforms.
 * See docs/scenery-rendering.md for sources, cost and visual-only limits.
 */
export const surfaceDetailGLSL = /* glsl */ `
  vec2 surfaceOffset(vec2 cell) {
    // Integer-cell identity is stable in world space, including negative coordinates.
    vec3 h = fract(vec3(cell.x, cell.y, cell.x) * vec3(0.1031, 0.1030, 0.0973));
    h += dot(h, h.yzx + 33.33);
    return fract((h.xx + h.yz) * h.zy);
  }

  vec3 naturalSurface(sampler2D surfaceMap, vec2 uv) {
    // Derivatives must precede the cell discontinuities: implicit LOD there
    // produces blurry triangle seams and shimmer as the observer moves.
    vec2 dx = dFdx(uv), dy = dFdy(uv);
    vec2 skew = vec2(uv.x - uv.y * 0.577350269, uv.y * 1.154700538);
    vec2 cell = floor(skew), f = fract(skew);
    vec2 corner = f.x + f.y < 1.0 ? vec2(0.0) : vec2(1.0);
    vec3 weights = f.x + f.y < 1.0
      ? vec3(1.0 - f.x - f.y, f.x, f.y)
      : vec3(f.x + f.y - 1.0, 1.0 - f.y, 1.0 - f.x);
    // Favor each patch's interior to retain grain instead of washing it out.
    weights *= weights;
    weights /= dot(weights, vec3(1.0));
    return textureGrad(surfaceMap, uv + surfaceOffset(cell + corner), dx, dy).rgb * weights.x
      + textureGrad(surfaceMap, uv + surfaceOffset(cell + vec2(1, 0)), dx, dy).rgb * weights.y
      + textureGrad(surfaceMap, uv + surfaceOffset(cell + vec2(0, 1)), dx, dy).rgb * weights.z;
  }

  // Surface-gradient bump shading reuses filtered albedo/soil detail. No
  // displacement, extra fetches, shadow geometry or changes to wheel contact.
  vec3 surfaceRelief(vec3 eyePosition, vec3 surfaceNormal, float height) {
    vec3 dx = dFdx(eyePosition), dy = dFdy(eyePosition);
    vec3 acrossX = cross(dy, surfaceNormal), acrossY = cross(surfaceNormal, dx);
    float determinant = dot(dx, acrossX);
    vec3 gradient = (dFdx(height) * acrossX + dFdy(height) * acrossY)
      * sign(determinant) / max(abs(determinant), 0.00000001);
    // Bound slopes so tiny/grazing triangles cannot produce glitter or black normals.
    gradient /= max(1.0, length(gradient) / 0.32);
    return normalize(surfaceNormal - gradient);
  }
`;
