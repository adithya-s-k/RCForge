import * as T from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Aircraft } from "../core/schema";
import { panelGeometry } from "./planform";
type Surface = Aircraft["surfaces"][number];
/** Folded skin, with a separate bounded aileron and a genuinely narrowing tip. */
export function buildFoamWing(surface: Surface, material: T.Material) {
  const w = surface.foamWing!,
    side = Math.sign(surface.positionM[1]) || 1;
  const c = w.rootChordM,
    t = w.boardThicknessM,
    span = surface.spanM;
  const group = new T.Group(),
    geometries: T.BufferGeometry[] = [];
  const station = (f: number) => {
    const next = w.tipStations.findIndex((p) => p[0] >= f);
    if (next <= 0) return w.tipStations[0].slice(1);
    const a = w.tipStations[next - 1],
      b = w.tipStations[next],
      u = (f - a[0]) / (b[0] - a[0]);
    return [a[1] + u * (b[1] - a[1]), a[2] + u * (b[2] - a[2])];
  };
  const [start, end] = w.controlSpan;
  for (const [from, to, cutoff] of surface.control
    ? [
        [0, start, 1],
        [start, end, w.hingeFraction],
        [end, 1, 1],
      ]
    : [[0, 1, 1]]) {
    if (to - from < 1e-6) continue;
    const profile: [number, number][] = [
      [0, 0],
      [0.025, -t * 0.6],
      [0.25, -w.foldHeightM],
      [0.48, -w.foldHeightM * 0.95],
      [w.hingeFraction, -t / 2],
    ];
    if (cutoff > w.hingeFraction) profile.push([cutoff, -t / 2]);
    profile.push([cutoff, t / 2], [0, t / 2]);
    const shape = new T.Shape(profile.map(([u, z]) => new T.Vector2(u, z)));
    const g = new T.ExtrudeGeometry(shape, {
      depth: 1,
      bevelEnabled: false,
      steps: Math.max(2, Math.ceil((to - from) * 40)),
    });
    const pos = g.getAttribute("position");
    for (let i = 0; i < pos.count; i++) {
      const f = from + (to - from) * pos.getZ(i),
        [leading, trailing] = station(f);
      const sectionU = pos.getX(i);
      // A straight hinge remains fixed while the leading/trailing edges taper.
      const u =
        cutoff < 1
          ? leading + ((w.hingeFraction - leading) * sectionU) / w.hingeFraction
          : leading + (trailing - leading) * sectionU;
      const z = pos.getY(i);
      // Keep the board thickness at the tip while reducing the folded cavity.
      const height =
        z < -t / 2 ? -t / 2 + (z + t / 2) * (trailing - leading) : z;
      pos.setXYZ(
        i,
        surface.chordM * 0.25 - c * u,
        side * span * (f - 0.5),
        height,
      );
    }
    // X inversion and extrusion-axis swap cancel for the right half; left half mirrors winding.
    if (side < 0)
      for (const name of ["position", "uv"]) {
        const attr = g.getAttribute(name);
        for (let i = 0; i < attr.count; i += 3)
          for (let k = 0; k < attr.itemSize; k++) {
            const a = (i + 1) * attr.itemSize + k,
              b = (i + 2) * attr.itemSize + k,
              tmp = attr.array[a];
            attr.array[a] = attr.array[b];
            attr.array[b] = tmp;
          }
      }
    g.computeVertexNormals();
    geometries.push(g);
  }
  const skin = mergeGeometries(geometries)!;
  geometries.forEach((g) => g.dispose());
  const mesh = new T.Mesh(skin, material);
  mesh.castShadow = mesh.receiveShadow = true;
  group.add(mesh);
  if (!surface.control) return { group };
  const pivot = new T.Group();
  pivot.position.x = surface.chordM * 0.25 - c * w.hingeFraction;
  group.add(pivot);
  const fractions = [
    start,
    ...w.tipStations.map((p) => p[0]).filter((f) => f > start && f < end),
    end,
  ];
  const trailingEdge: [number, number][] = fractions.map((f) => [
    c * (w.hingeFraction - station(f)[1]),
    side * span * (f - 0.5),
  ]);
  const outline: [number, number][] = [
    [-0.0006, side * span * (start - 0.5)],
    ...trailingEdge,
    [-0.0006, side * span * (end - 0.5)],
  ];
  const control = new T.Mesh(panelGeometry(outline, t)!, material);
  control.castShadow = control.receiveShadow = true;
  pivot.add(control);
  return { group, pivot, hingeAxis: new T.Vector3(0, 1, 0) };
}
