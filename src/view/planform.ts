import * as T from "three";
import type { Aircraft } from "../core/schema";

type Point = [number, number];
type Surface = Aircraft["surfaces"][number];

/** Split an authored outline at its hinge; no new geometry is made per frame. */
export function splitPanel(
  points: Point[],
  hinge: [Point, Point],
  aft: boolean,
): Point[] {
  const [a, b] = hinge;
  const distance = (p: Point) =>
    ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])) *
    (aft ? 1 : -1);
  const result: Point[] = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i],
      q = points[(i + 1) % points.length];
    const dp = distance(p),
      dq = distance(q);
    if (dp >= -1e-9) result.push(p);
    if ((dp > 1e-9 && dq < -1e-9) || (dp < -1e-9 && dq > 1e-9)) {
      const t = dp / (dp - dq);
      result.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
    }
  }
  return result;
}

export function panelGeometry(points: Point[], thickness: number) {
  if (points.length < 3) return null;
  const area = points.reduce((sum, p, i) => {
    const q = points[(i + 1) % points.length];
    return sum + p[0] * q[1] - q[0] * p[1];
  }, 0);
  if (Math.abs(area) < 1e-10) return null;
  const shape = new T.Shape(points.map((p) => new T.Vector2(...p)));
  shape.closePath();
  const geometry = new T.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: false,
    curveSegments: 1,
  });
  geometry.translate(0, 0, -thickness / 2);
  return geometry;
}

export function buildPanel(surface: Surface, material: T.Material) {
  const panel = surface.panel!;
  const toMeters = ([x, y]: Point): Point => [
    x * surface.chordM,
    y * surface.spanM,
  ];
  const points = panel.outline.map(toMeters);
  const group = new T.Group();
  const add = (outline: Point[], parent: T.Object3D) => {
    const geometry = panelGeometry(outline, panel.thicknessM);
    if (!geometry) return;
    const mesh = new T.Mesh(geometry, material);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
  };
  if (!surface.control) {
    add(points, group);
    return { group };
  }
  const hinge = (
    panel.controlHinge ?? [
      [-0.5, -0.5],
      [-0.5, 0.5],
    ]
  ).map(toMeters) as [Point, Point];
  add(splitPanel(points, hinge, false), group);
  const pivot = new T.Group();
  pivot.position.set(hinge[0][0], hinge[0][1], 0);
  group.add(pivot);
  add(
    splitPanel(points, hinge, true).map(([x, y]) => [
      x - hinge[0][0],
      y - hinge[0][1],
    ]),
    pivot,
  );
  const hingeAxis = new T.Vector3(
    hinge[1][0] - hinge[0][0],
    hinge[1][1] - hinge[0][1],
    0,
  ).normalize();
  return { group, pivot, hingeAxis };
}
