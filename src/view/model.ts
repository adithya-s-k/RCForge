import { orientComponent } from "./component-pose";
import { surfaceActuation } from "../core/actuation";
import { buildQuad } from "./quad-model";
import { buildPanel } from "./planform";
import { buildFoamWing } from "./foam-wing";
import { propellerBlade } from "./propeller";
import { disposeModel } from "./dispose-model";
import type { SurfaceControl } from "../core/surface-control";
import * as T from "three";
import type { Aircraft } from "../core/schema";
import { massProperties } from "../core/aircraft";
import { radians, type Vec3 } from "../core/math";
import type { Controls } from "../core/simulation";
export interface AircraftVisual {
  group: T.Group;
  propellers: T.Group[];
  controls: {
    surfaceId: string;
    pivot: T.Group;
    hingeAxis?: T.Vector3;
    axis: keyof Controls;
    gain: number;
    control: SurfaceControl;
    max: number;
  }[];
  cg: T.Group;
}
const foam = new T.MeshStandardMaterial({
  color: "#e9e7df",
  roughness: 0.83,
  metalness: 0,
});
const underside = new T.MeshStandardMaterial({
  color: "#aeb8bc",
  roughness: 0.8,
});
const dark = new T.MeshStandardMaterial({
  color: "#23282d",
  roughness: 0.55,
  metalness: 0.35,
});
const aluminum = new T.MeshStandardMaterial({
  color: "#98a3aa",
  roughness: 0.32,
  metalness: 0.8,
});
const orange = new T.MeshStandardMaterial({
  color: "#ad3c25",
  roughness: 0.55,
});
const sharedPalette = new Set<T.Material>([
  foam,
  underside,
  dark,
  aluminum,
  orange,
]);
export function disposeAircraft(root: T.Object3D) {
  disposeModel(root, sharedPalette);
}
function mesh(
  g: T.BufferGeometry,
  m: T.Material | T.Material[],
  parent: T.Object3D,
  pos: Vec3 = [0, 0, 0],
) {
  const v = new T.Mesh(g, m);
  v.position.set(...pos);
  v.castShadow = true;
  v.receiveShadow = true;
  parent.add(v);
  return v;
}
function box(parent: T.Object3D, d: Vec3, p: Vec3, m: T.Material) {
  return mesh(new T.BoxGeometry(...d), m, parent, p);
}
/** Sections follow assembled fuselage cross sections in the body frame. */
function loft(
  parent: T.Object3D,
  sections: {
    x: number;
    width: number;
    top: number;
    bottom: number;
    topColor?: string;
  }[],
  material: T.Material,
  y = 0,
) {
  const vertices: number[] = [],
    indices: number[] = [];
  const materials: T.Material[] = [material];
  const colors = new Map<string, number>();
  const groups: { start: number; material: number }[] = [];
  for (const s of sections) {
    vertices.push(
      s.x,
      y - s.width / 2,
      s.top,
      s.x,
      y + s.width / 2,
      s.top,
      s.x,
      y + s.width / 2,
      s.bottom,
      s.x,
      y - s.width / 2,
      s.bottom,
    );
  }
  for (let i = 0; i < sections.length - 1; i++)
    for (let j = 0; j < 4; j++) {
      const a = i * 4 + j,
        b = i * 4 + ((j + 1) % 4),
        c = (i + 1) * 4 + j,
        d = (i + 1) * 4 + ((j + 1) % 4);
      let materialIndex = 0;
      const color = sections[i].topColor;
      if (j === 0 && color) {
        if (!colors.has(color)) {
          colors.set(color, materials.length);
          materials.push(
            new T.MeshStandardMaterial({ color, roughness: 0.55 }),
          );
        }
        materialIndex = colors.get(color)!;
      }
      groups.push({ start: indices.length, material: materialIndex });
      indices.push(a, b, c, b, d, c);
    }
  indices.push(0, 2, 1, 0, 3, 2);
  const n = (sections.length - 1) * 4;
  indices.push(n, n + 1, n + 2, n, n + 2, n + 3);
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(vertices, 3));
  // One draw group per finish, rather than one per face/section.
  const ordered: number[] = [];
  for (let index = 0; index < materials.length; index++) {
    const start = ordered.length;
    for (const entry of groups)
      if (entry.material === index)
        ordered.push(...indices.slice(entry.start, entry.start + 6));
    if (index === 0) ordered.push(...indices.slice(-12));
    g.addGroup(start, ordered.length - start, index);
  }
  g.setIndex(ordered);
  const flat = g.toNonIndexed();
  g.dispose();
  flat.computeVertexNormals();
  return mesh(flat, materials.length === 1 ? material : materials, parent);
}
function airfoil(chord: number, span: number, thickness = 0.105, cutoff = 1) {
  const v: number[] = [],
    idx: number[] = [],
    N = 30;
  for (const y of [-span / 2, span / 2])
    for (let side = 0; side < 2; side++)
      for (let i = 0; i <= N; i++) {
        const t = (i / N) * cutoff,
          yt =
            5 *
            thickness *
            (0.2969 * Math.sqrt(t) -
              0.126 * t -
              0.3516 * t * t +
              0.2843 * t ** 3 -
              0.1036 * t ** 4);
        const camber = 0.016 * Math.sin(Math.PI * t);
        v.push(
          chord * (0.25 - t),
          y,
          chord * (-camber + (side === 0 ? -yt : yt * 0.55)),
        );
      }
  const row = N + 1;
  for (let side = 0; side < 2; side++)
    for (let i = 0; i < N; i++) {
      const a = side * row + i,
        b = a + 2 * row;
      if (side === 0) idx.push(a, b, a + 1, a + 1, b, b + 1);
      else idx.push(a, a + 1, b, a + 1, b + 1, b);
    }
  for (const edge of [0, 1])
    for (let i = 0; i < N; i++) {
      const a = edge * 2 * row + i,
        b = a + row;
      idx.push(a, a + 1, b, a + 1, b + 1, b);
    }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(v, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
/** Folded foamboard profile, with a flatter lower skin and a beveled leading edge. */
function foldedWing(
  chord: number,
  span: number,
  cutoff: number,
  side: number,
  tipTaper = false,
) {
  const profile = [
    [0, 0],
    [0.03, -0.035],
    [0.25, -0.105],
    [0.48, -0.1],
    [cutoff, -0.006],
    [cutoff, 0.008],
    [0.03, 0.008],
  ];
  const shape = new T.Shape();
  profile.forEach(([x, z], i) =>
    i
      ? shape.lineTo(chord * (0.25 - x), chord * z)
      : shape.moveTo(chord * (0.25 - x), chord * z),
  );
  shape.closePath();
  const g = new T.ExtrudeGeometry(shape, {
    depth: span,
    bevelEnabled: false,
    steps: 12,
  });
  const p = g.getAttribute("position");
  for (let i = 0; i < p.count; i++) {
    const y = p.getZ(i) - span / 2,
      outward = (side * y) / span + 0.5;
    const taper = tipTaper ? Math.max(0, (outward - 0.82) / 0.18) : 0;
    p.setXYZ(i, p.getX(i) - chord * 0.2 * taper, y, p.getY(i));
  }
  // Swapping extrusion Y/Z changes handedness; reverse winding to keep outside faces visible.
  for (const name of ["position", "uv"]) {
    const attr = g.getAttribute(name);
    for (let i = 0; i < attr.count; i += 3)
      for (let k = 0; k < attr.itemSize; k++) {
        const n = (i + 1) * attr.itemSize + k,
          m = (i + 2) * attr.itemSize + k;
        const tmp = attr.array[n];
        attr.array[n] = attr.array[m];
        attr.array[m] = tmp;
      }
  }
  g.computeVertexNormals();
  return g;
}
function flatPanel(chord: number, span: number, cutoff: number, fin = false) {
  const shape = new T.Shape();
  const points = fin
    ? [
        [0.25, -0.5],
        [0.25, -0.28],
        [0.08, 0.32],
        [-0.04, 0.5],
        [0.25 - cutoff, 0.5],
        [0.25 - cutoff, -0.5],
      ]
    : [
        [0.25, -0.42],
        [0.12, -0.5],
        [0.25 - cutoff, -0.5],
        [0.25 - cutoff, 0.5],
        [0.12, 0.5],
        [0.25, 0.42],
      ];
  points.forEach(([x, y], i) =>
    i ? shape.lineTo(x * chord, y * span) : shape.moveTo(x * chord, y * span),
  );
  shape.closePath();
  const g = new T.ExtrudeGeometry(shape, { depth: 0.005, bevelEnabled: false });
  g.translate(0, 0, -0.0025);
  return g;
}
function rod(parent: T.Object3D, a: Vec3, b: Vec3, r: number, m: T.Material) {
  const start = new T.Vector3(...a),
    end = new T.Vector3(...b),
    delta = end.clone().sub(start);
  const v = mesh(new T.CylinderGeometry(r, r, delta.length(), 8), m, parent);
  v.position.copy(start.add(end).multiplyScalar(0.5));
  v.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), delta.normalize());
  return v;
}
/** Paint on the Bronco's folded cabin; photo-guided, not separate structure. */
function broncoCabin(parent: T.Group, part: Aircraft["parts"][number]) {
  const glass = new T.MeshStandardMaterial({
    color: "#23262a",
    roughness: 0.67,
    metalness: 0,
    side: T.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const sx = part.sizeM[0] / 0.447,
    sz = part.sizeM[2] / 0.132;
  const px = (x: number) => part.positionM[0] + (x - 0.1035) * sx;
  const pz = (z: number) => part.positionM[2] + (z - 0.045) * sz;
  const panes = [
    [
      [0.077, -0.033],
      [0.128, -0.037],
      [0.128, 0.022],
      [0.077, 0.018],
    ],
    [
      [0.133, -0.037],
      [0.17, -0.03],
      [0.19, -0.014],
      [0.207, 0.006],
      [0.197, 0.022],
      [0.133, 0.022],
    ],
  ];
  for (const side of [-1, 1])
    for (const pane of panes) {
      const shape = new T.Shape(
        pane.map(([x, z]) => new T.Vector2(px(x), pz(z))),
      );
      const geometry = new T.ShapeGeometry(shape);
      const pos = geometry.getAttribute("position");
      for (let i = 0; i < pos.count; i++)
        pos.setXYZ(
          i,
          pos.getX(i),
          part.positionM[1] + side * (part.sizeM[1] / 2 + 0.0003),
          pos.getY(i),
        );
      geometry.computeVertexNormals();
      mesh(geometry, glass, parent).name = "cockpit-window";
    }
  // Narrow white roof mullion follows each curved station instead of floating
  // a flat rectangle above the skin. Paint adds no hidden component mass.
  const positions: number[] = [],
    indices: number[] = [];
  const firstPaint = part.bodyLoft!.findIndex((s) => s.topColor);
  const lastPaint = part.bodyLoft!.reduce(
    (last, s, i) => (s.topColor ? i : last),
    -1,
  );
  const stations = part.bodyLoft!.slice(firstPaint, lastPaint + 2);
  for (const side of [-1, 0, 1]) {
    const first = positions.length / 3;
    for (const s of stations) {
      const x = part.positionM[0] + s.x * part.sizeM[0];
      const z = part.positionM[2] + s.top * part.sizeM[2] - 0.0004;
      const centerY =
        part.positionM[1] + side * ((s.width * part.sizeM[1]) / 2 - 0.0015);
      positions.push(x, centerY - 0.0015, z, x, centerY + 0.0015, z);
    }
    for (let i = 0; i < stations.length - 1; i++) {
      const n = first + i * 2;
      indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
    }
  }
  const roofHeight = (x: number) => {
    const local = (x - part.positionM[0]) / part.sizeM[0];
    const sections = part.bodyLoft!;
    const i = Math.max(
      1,
      sections.findIndex((s) => s.x >= local),
    );
    const a = sections[i - 1],
      b = sections[i];
    return (
      part.positionM[2] +
      T.MathUtils.lerp(a.top, b.top, (local - a.x) / (b.x - a.x)) *
        part.sizeM[2] -
      0.0005
    );
  };
  for (const center of [0.08, 0.131]) {
    const x0 = px(center - 0.0014),
      x1 = px(center + 0.0014);
    const y0 = part.positionM[1] - part.sizeM[1] * 0.5;
    const y1 = part.positionM[1] + part.sizeM[1] * 0.5;
    const n = positions.length / 3;
    positions.push(
      x0,
      y0,
      roofHeight(x0),
      x0,
      y1,
      roofHeight(x0),
      x1,
      y0,
      roofHeight(x1),
      x1,
      y1,
      roofHeight(x1),
    );
    indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
  }
  const roof = new T.BufferGeometry();
  roof.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  roof.setIndex(indices);
  roof.computeVertexNormals();
  mesh(roof, foam, parent).name = "cockpit-mullion";
}
export function buildAircraft(a: Aircraft): AircraftVisual {
  if (a.vehicleType === "multirotor") return buildQuad(a);
  const group = new T.Group(),
    propellers: T.Group[] = [],
    controls: AircraftVisual["controls"] = [];
  const isBronco = a.id === "ft-bronco",
    isTiny = a.id === "ft-tiny-trainer",
    planModel = isBronco || isTiny,
    baseColor = isBronco
      ? foam
      : new T.MeshStandardMaterial({ color: "#e2e5e7", roughness: 0.8 });
  const marking = new T.MeshStandardMaterial({
    color: isBronco ? "#e9e7df" : "#285982",
    roughness: 0.7,
  });
  const propellerMaterial = isBronco
    ? new T.MeshStandardMaterial({ color: "#c8c6bc", roughness: 0.62 })
    : dark;
  for (const p of a.parts) {
    const firstChild = group.children.length;
    if ((p.kind === "body" || p.kind === "boom") && p.bodyLoft) {
      const [x, y, z] = p.positionM,
        [l, w, h] = p.sizeM;
      loft(
        group,
        p.bodyLoft.map((s) => ({
          x: x + s.x * l,
          width: s.width * w,
          top: z + s.top * h,
          bottom: z + s.bottom * h,
          topColor: s.topColor,
        })),
        baseColor,
        y,
      );
      if (isBronco && p.id === "fuselage") broncoCabin(group, p);
    } else if (p.kind === "body" && isTiny) {
      const [x, y, z] = p.positionM,
        [l, w, h] = p.sizeM;
      loft(
        group,
        [
          { x: x - l / 2, width: 0.012, top: z - 0.012, bottom: z + 0.014 },
          { x: x - l * 0.1, width: w, top: z - h / 2, bottom: z + h / 2 },
          { x: x + l * 0.3, width: w, top: z - h / 2, bottom: z + h / 2 },
          {
            x: x + l / 2,
            width: w * 0.82,
            top: z - h * 0.4,
            bottom: z + h * 0.4,
          },
        ],
        baseColor,
        y,
      );
    } else if (p.kind === "body") {
      const [x, y, z] = p.positionM,
        [l, w, h] = p.sizeM;
      loft(
        group,
        [
          {
            x: x - l * 0.5,
            width: w * 0.65,
            top: z - h * 0.35,
            bottom: z + h * 0.28,
          },
          { x: x - l * 0.18, width: w, top: z - h * 0.5, bottom: z + h * 0.5 },
          { x: x + l * 0.14, width: w, top: z - h * 0.5, bottom: z + h * 0.5 },
          {
            x: x + l * 0.34,
            width: w * 0.85,
            top: z - h * 0.28,
            bottom: z + h * 0.43,
          },
          {
            x: x + l * 0.46,
            width: w * (isBronco ? 0.78 : 0.48),
            top: z + h * 0.02,
            bottom: z + h * 0.28,
          },
          {
            x: x + l * 0.5,
            width: w * (isBronco ? 0.5 : 0.12),
            top: z + h * 0.12,
            bottom: z + h * 0.18,
          },
        ],
        baseColor,
        y,
      );
      const glass = new T.MeshStandardMaterial({
        color: "#191b1e",
        roughness: 0.42,
        metalness: 0,
      });
      if (isBronco)
        for (const side of [-1, 1]) {
          box(
            group,
            [l * 0.22, 0.0015, h * 0.38],
            [x + l * 0.08, y + side * w * 0.501, z - h * 0.27],
            glass,
          );
          box(
            group,
            [0.004, 0.002, h * 0.4],
            [x + l * 0.07, y + side * w * 0.505, z - h * 0.27],
            baseColor,
          );
        }
      loft(
        group,
        [
          {
            x: x - l * 0.14,
            width: w * 0.85,
            top: z - h * 0.49,
            bottom: z - h * 0.43,
          },
          {
            x: x + l * 0.02,
            width: w * 0.8,
            top: z - h * 0.52,
            bottom: z - h * 0.42,
          },
          {
            x: x + l * 0.19,
            width: w * 0.72,
            top: z - h * 0.5,
            bottom: z - h * 0.38,
          },
          {
            x: x + l * 0.32,
            width: w * 0.52,
            top: z - h * 0.4,
            bottom: z - h * 0.34,
          },
        ],
        glass,
        y,
      );
      box(
        group,
        [0.005, w * 0.84, 0.006],
        [x + l * 0.04, y, z - h * 0.52],
        baseColor,
      );
      box(
        group,
        [0.007, w * 0.76, 0.006],
        [x + l * 0.18, y, z - h * 0.5],
        baseColor,
      );
      box(
        group,
        [l * 0.16, w * 0.6, 0.003],
        [x - l * 0.29, y, z - h * 0.36],
        dark,
      );
    } else if (p.kind === "boom") {
      const [x, y, z] = p.positionM,
        [l, w, h] = p.sizeM;
      loft(
        group,
        [
          {
            x: x - l / 2,
            width: w * 0.78,
            top: z - h * 0.32,
            bottom: z + h * 0.27,
          },
          { x: x + l * 0.25, width: w, top: z - h * 0.5, bottom: z + h * 0.5 },
          {
            x: x + l / 2,
            width: w * 1.2,
            top: z - h * 0.6,
            bottom: z + h * 0.6,
          },
        ],
        baseColor,
        y,
      );
    } else if (
      p.kind === "motor" &&
      !isTiny &&
      !a.parts.some((p) => p.bodyLoft)
    ) {
      const [x, y, z] = p.positionM;
      loft(
        group,
        [
          { x: x - 0.19, width: 0.035, top: z - 0.014, bottom: z + 0.022 },
          { x: x - 0.09, width: 0.068, top: z - 0.035, bottom: z + 0.037 },
          { x: x + 0.025, width: 0.06, top: z - 0.028, bottom: z + 0.028 },
        ],
        baseColor,
        y,
      );
    } else if (p.servo) {
      const housing = new T.Group();
      housing.position.set(...p.positionM);
      group.add(housing);
      box(housing, p.sizeM, [0, 0, 0], dark);
      const surface = a.surfaces.find(
        (s) => s.control?.linkage?.servoPartId === p.id,
      );
      if (surface?.control?.linkage) {
        const control = surface.control,
          linkage = control.linkage!;
        const horn = new T.Group();
        horn.position.z = -p.sizeM[2] / 2 - 0.002;
        housing.add(horn);
        box(
          horn,
          [linkage.servoArmM + 0.003, 0.003, 0.002],
          [linkage.servoArmM / 2, 0, 0],
          baseColor,
        );
        controls.push({
          surfaceId: surface.id,
          pivot: horn,
          axis: control.axis,
          gain: control.gain,
          control,
          hingeAxis: new T.Vector3(0, 0, 1),
          max: radians(
            (surfaceActuation(a, surface).maxDeg * linkage.surfaceArmM) /
              linkage.servoArmM,
          ),
        });
      }
    } else if (p.kind === "battery") {
      const battery = box(
        group,
        p.sizeM,
        p.positionM,
        new T.MeshStandardMaterial({ color: p.color, roughness: 0.66 }),
      );
      battery.name = "battery";
    }
    orientComponent(group, p, group.children.slice(firstChild));
  }
  if (isTiny) {
    // Retention hardware is included in the structural mass allocation.
    // These assembly positions are visual estimates around the measured wing chord.
    const wing = a.surfaces.find((s) => s.foamWing);
    if (wing?.foamWing) {
      const leading = wing.positionM[0] + wing.chordM / 4;
      const trailing = leading - wing.foamWing.rootChordM;
      const rootZ =
        wing.positionM[2] -
        ((Math.sign(wing.positionM[1]) * wing.spanM) / 2) *
          Math.sin(radians(wing.rollDeg));
      const dowelZ = rootZ + 0.005;
      const band = new T.MeshStandardMaterial({
        color: "#aa9871",
        roughness: 0.95,
      });
      for (const x of [leading + 0.009, trailing - 0.009])
        rod(group, [x, -0.029, dowelZ], [x, 0.029, dowelZ], 0.0013, aluminum);
      for (const side of [-1, 1]) {
        const points: Vec3[] = [
          [leading + 0.009, side * 0.025, dowelZ],
          [leading - 0.003, side * 0.021, rootZ - 0.003],
          [
            leading - wing.foamWing.rootChordM * 0.25,
            side * 0.012,
            rootZ - wing.foamWing.foldHeightM - 0.003,
          ],
          [
            leading - wing.foamWing.rootChordM * 0.48,
            -side * 0.001,
            rootZ - wing.foamWing.foldHeightM - 0.003,
          ],
          [trailing, -side * 0.021, rootZ - 0.004],
          [trailing - 0.009, -side * 0.025, dowelZ],
        ];
        for (let j = 1; j < points.length; j++)
          rod(group, points[j - 1], points[j], 0.0007, band);
      }
    }
  }
  for (const s of a.surfaces) {
    const surface = new T.Group();
    surface.position.set(...s.positionM);
    surface.rotation.x = radians(s.rollDeg);
    surface.rotation.y = radians(s.incidenceDeg);
    group.add(surface);
    if (s.panel || s.foamWing) {
      const panel = s.foamWing
        ? buildFoamWing(s, baseColor)
        : buildPanel(s, baseColor);
      surface.add(panel.group);
      if (s.control && panel.pivot)
        controls.push({
          surfaceId: s.id,
          pivot: panel.pivot,
          hingeAxis: panel.hingeAxis,
          axis: s.control.axis,
          gain: s.control.gain,
          control: s.control,
          max: radians(surfaceActuation(a, s).maxDeg),
        });
      continue;
    }
    const side = Math.sign(s.positionM[1]) || 1,
      hinge = planModel ? (isBronco ? 0.765 : 0.77) : 0.72;
    if (s.kind === "wing") {
      mesh(
        planModel
          ? foldedWing(s.chordM, s.spanM, s.control ? hinge : 1, side, isTiny)
          : airfoil(s.chordM, s.spanM, 0.105, s.control ? 0.72 : 1),
        baseColor,
        surface,
      );
      // Distinct tip/underside markings preserve orientation at realistic viewing distances.
      if (!planModel) {
        box(
          surface,
          [s.chordM * 0.68, 0.035, 0.001],
          [-s.chordM * 0.2, side * s.spanM * 0.35, -s.chordM * 0.04],
          marking,
        );
        box(
          surface,
          [s.chordM * 0.5, 0.023, 0.001],
          [-s.chordM * 0.25, side * s.spanM * 0.28, -s.chordM * 0.048],
          dark,
        );
      }
      if (!s.control?.linkage)
        box(
          surface,
          [isTiny ? 0.019 : 0.028, isTiny ? 0.009 : 0.014, 0.009],
          [-s.chordM * 0.3, -side * s.spanM * 0.16, -0.014],
          dark,
        );
    } else {
      mesh(
        planModel
          ? flatPanel(
              s.chordM,
              s.spanM,
              s.control ? hinge : 1,
              s.kind === "vertical-tail",
            )
          : airfoil(s.chordM, s.spanM, 0.045, s.control ? 0.72 : 1),
        baseColor,
        surface,
      );
      box(
        surface,
        [s.chordM * 0.6, 0.022, 0.001],
        [-s.chordM * 0.22, s.spanM * 0.36, -0.004],
        marking,
      );
    }
    if (s.control) {
      const pivot = new T.Group();
      pivot.position.x = s.chordM * (0.25 - hinge);
      const fraction =
        planModel && s.kind === "wing" ? (isBronco ? 0.61 : 0.72) : 0.98;
      const center =
        planModel && s.kind === "wing"
          ? (side * s.spanM * (1 - fraction)) / 2
          : 0;
      const controlChord = s.chordM * (1 - hinge);
      if (fraction < 0.98)
        box(
          surface,
          [controlChord, s.spanM * (1 - fraction), 0.005],
          [
            pivot.position.x - controlChord / 2,
            (-side * s.spanM * fraction) / 2,
            0,
          ],
          baseColor,
        );
      surface.add(pivot);
      box(
        pivot,
        [controlChord, s.spanM * fraction, 0.005],
        [-controlChord / 2, center, 0],
        s.kind === "wing" ? baseColor : baseColor,
      );
      box(
        pivot,
        [0.008, 0.002, 0.012],
        [-controlChord * 0.3, center, -0.006],
        dark,
      );
      controls.push({
        surfaceId: s.id,
        pivot,
        axis: s.control.axis,
        gain: s.control.gain,
        control: s.control,
        max: radians(surfaceActuation(a, s).maxDeg),
      });
    }
  }
  for (const motor of a.motors) {
    const [x, y, z] = motor.positionM;
    const motorPart = a.parts.find((p) => p.id === motor.partId);
    // A pusher's mass sits ahead of its prop disk; use the authored installation.
    const shaft = motorPart && motorPart.positionM[0] > x + 0.001 ? -1 : 1;
    const center: Vec3 = motorPart?.positionM ?? [x - shaft * 0.012, y, z];
    const size: Vec3 =
      motorPart?.sizeM ??
      (isTiny ? [0.019, 0.024, 0.024] : [0.027, 0.034, 0.034]);
    const engine = mesh(
      new T.CylinderGeometry(0.5, 0.5, 1, 24),
      orange,
      group,
      center,
    );
    // Cylinder local Y becomes body X. The housing follows the same dimensions
    // as the component ledger; cosmetic vents add no separate mass.
    engine.scale.set(size[1], size[0], size[2]);
    engine.rotation.z = Math.PI / 2;
    engine.name = `motor-housing:${motor.id}`;
    for (let i = 0; i < 8; i++) {
      const ang = (i * Math.PI) / 4;
      rod(
        group,
        [
          center[0] - size[0] * 0.35,
          center[1] + Math.cos(ang) * size[1] * 0.46,
          center[2] + Math.sin(ang) * size[2] * 0.46,
        ],
        [
          center[0] + size[0] * 0.35,
          center[1] + Math.cos(ang) * size[1] * 0.46,
          center[2] + Math.sin(ang) * size[2] * 0.46,
        ],
        Math.min(size[1], size[2]) * 0.035,
        dark,
      );
    }
    const prop = new T.Group();
    prop.position.set(x + shaft * 0.008, y, z);
    prop.rotation.x = Math.PI / 2;
    rod(
      group,
      [center[0], center[1], center[2]],
      [prop.position.x, y, z],
      Math.min(size[1], size[2]) * 0.075,
      aluminum,
    );
    group.add(prop);
    propellers.push(prop);
    const radius = motor.propDiameterM / 2;
    const bladeCount = motor.propBlades ?? 2;
    const bladeGeometry = propellerBlade(radius, motor.spin === "ccw" ? -1 : 1);
    for (let i = 0; i < bladeCount; i++) {
      const bladeRoot = new T.Group();
      bladeRoot.rotation.x = (i * Math.PI * 2) / bladeCount;
      prop.add(bladeRoot);
      mesh(bladeGeometry, propellerMaterial, bladeRoot);
    }
    const hub = mesh(
      new T.ConeGeometry(isTiny ? 0.006 : 0.01, isTiny ? 0.01 : 0.018, 20),
      aluminum,
      prop,
      [shaft * 0.009, 0, 0],
    );
    hub.rotation.z = (-shaft * Math.PI) / 2;
  }
  for (const contact of a.contactPoints.filter((p) => p.kind === "wheel")) {
    const [x, y, z] = contact.positionM,
      r = contact.wheelRadiusM;
    rod(group, [x * 0.6, y * 0.65, 0.065], [x, y, z - r], 0.0026, aluminum);
    const wheel = mesh(new T.CylinderGeometry(r, r, 0.014, 24), dark, group, [
      x,
      y,
      z - r,
    ]);
    const hub = mesh(
      new T.CylinderGeometry(r * 0.43, r * 0.43, 0.015, 18),
      aluminum,
      group,
      [x, y, z - r],
    );
    wheel.name = contact.id;
    hub.name = contact.id + "-hub";
  }
  const properties = massProperties(a);
  for (const child of group.children)
    child.position.sub(new T.Vector3(...properties.cg));
  const cg = new T.Group();
  const indicator = mesh(
    new T.SphereGeometry(0.012, 16, 12),
    new T.MeshBasicMaterial({ color: "#edb561", depthTest: false }),
    cg,
  );
  indicator.renderOrder = 20;
  for (const axis of [
    [0.06, 0, 0],
    [0, 0.06, 0],
    [0, 0, 0.06],
  ] as Vec3[])
    rod(
      cg,
      axis.map((v) => -v) as Vec3,
      axis,
      0.0015,
      new T.MeshBasicMaterial({ color: "#edb561", depthTest: false }),
    );
  cg.visible = false;
  group.add(cg);
  return { group, propellers, controls, cg };
}
