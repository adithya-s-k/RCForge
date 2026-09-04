import * as T from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { Aircraft } from "../core/schema";
import { massProperties } from "../core/aircraft";
import type { AircraftVisual } from "./model";

/** Cosmetic construction detail. SI dimensions and rotor stations come from the aircraft definition.
 * Electronics/wiring are included in the frame mass allocation, not added as hidden mass. */
export function buildQuad(a: Aircraft): AircraftVisual {
  const group = new T.Group(),
    propellers: T.Group[] = [];
  const mat = (color: string, roughness = 0.6, metalness = 0) =>
    new T.MeshStandardMaterial({ color, roughness, metalness });
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#20252a";
  ctx.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      ctx.fillStyle = (x + y) % 2 ? "#343a40" : "#24292e";
      ctx.fillRect(x * 8, y * 8, 7, 7);
      ctx.fillStyle = "#41464b";
      ctx.fillRect(
        x * 8 + 1,
        y * 8 + 1,
        (x + y) % 2 ? 1 : 5,
        (x + y) % 2 ? 5 : 1,
      );
    }
  const weave = new T.CanvasTexture(canvas);
  weave.colorSpace = T.SRGBColorSpace;
  weave.wrapS = weave.wrapT = T.RepeatWrapping;
  weave.repeat.set(3, 2);
  weave.anisotropy = 8;
  const carbon = new T.MeshStandardMaterial({
    map: weave,
    roughness: 0.48,
    metalness: 0.2,
  });
  const black = mat("#171b20", 0.62),
    metal = mat("#77818c", 0.3, 0.8),
    copper = mat("#ad6535", 0.4, 0.7),
    rubber = mat("#26282a", 0.92),
    pcb = mat("#214d46", 0.65);
  const mesh = (
    g: T.BufferGeometry,
    m: T.Material,
    p: number[],
    parent: T.Object3D = group,
  ) => {
    const o = new T.Mesh(g, m);
    o.position.set(p[0], p[1], p[2]);
    o.castShadow = true;
    o.receiveShadow = true;
    parent.add(o);
    return o;
  };
  const box = (
    size: number[],
    p: number[],
    m: T.Material,
    r = 0.001,
    parent: T.Object3D = group,
  ) =>
    mesh(
      new RoundedBoxGeometry(
        size[0],
        size[1],
        size[2],
        2,
        Math.min(r, ...size.map((v) => v / 3)),
      ),
      m,
      p,
      parent,
    );
  const cylinder = (
    r: number,
    h: number,
    p: number[],
    m: T.Material,
    parent: T.Object3D = group,
  ) => {
    const o = mesh(new T.CylinderGeometry(r, r, h, 24), m, p, parent);
    o.rotation.x = Math.PI / 2;
    return o;
  };
  const wire = (points: number[][], m: T.Material, r = 0.001) =>
    mesh(
      new T.TubeGeometry(
        new T.CatmullRomCurve3(
          points.map((p) => new T.Vector3(...(p as [number, number, number]))),
        ),
        16,
        r,
        6,
        false,
      ),
      m,
      [0, 0, 0],
    );
  // Thin sandwich plates, standoffs, flight-controller stack and arm clamps.
  const frameScale = a.reference.spanM / 0.225;
  box(
    [0.098 * frameScale, 0.043 * frameScale, 0.003],
    [0, 0, 0.003],
    carbon,
    0.004,
  );
  box(
    [0.088 * frameScale, 0.039 * frameScale, 0.0025],
    [0, 0, -0.002],
    carbon,
    0.004,
  );
  for (const x of [-0.032, 0.032])
    for (const y of [-0.015, 0.015]) {
      cylinder(0.0025, 0.013, [x * frameScale, y * frameScale, -0.0065], black);
      cylinder(0.003, 0.0015, [x * frameScale, y * frameScale, -0.014], metal);
      box(
        [0.0028, 0.0007, 0.0004],
        [x * frameScale, y * frameScale, -0.015],
        black,
        0.0001,
      );
    }
  box([0.031, 0.031, 0.0015], [0, 0, -0.006], pcb);
  box([0.009, 0.009, 0.002], [0.006, 0, -0.008], black);
  for (const y of [-0.012, 0.012])
    for (let x = -0.012; x < 0.012; x += 0.004)
      box([0.002, 0.0015, 0.001], [x, y, -0.0075], metal, 0.0002);
  const battery = a.parts.find((p) => p.kind === "battery");
  if (battery) {
    const [x, y, z] = battery.positionM,
      [l, w, h] = battery.sizeM;
    box([l, w, h], [x, y, z], mat("#343b43", 0.48), 0.004);
    // Shrink-wrap seams, label and two full retention straps follow edited battery dimensions.
    for (const side of [-1, 1])
      box(
        [l * 0.91, 0.0005, h * 0.73],
        [x, y + side * (w / 2 + 0.0003), z],
        mat("#50575d", 0.7),
        0.0002,
      );
    box(
      [l * 0.7, w * 0.72, 0.0003],
      [x, y, z - h / 2 - 0.0003],
      mat("#c9ccbd", 0.82),
      0.0001,
    );
    for (const dx of [-0.3, 0.3]) {
      box(
        [0.007, w + 0.002, 0.0012],
        [x + dx * l, y, z - h / 2 - 0.001],
        rubber,
      );
      for (const s of [-1, 1])
        box(
          [0.007, 0.0012, h],
          [x + dx * l, y + s * (w / 2 + 0.001), z],
          rubber,
        );
      box(
        [0.01, 0.009, 0.002],
        [x + dx * l, y + w / 2 - 0.004, z - h / 2 - 0.0025],
        black,
      );
    }
    for (const [dy, color] of [
      [-0.002, "#a52f25"],
      [0.002, "#181b1d"],
    ] as const)
      wire(
        [
          [x - l / 2, y + dy, z],
          [x - l / 2 - 0.014, y + dy, z - 0.005],
          [x - l / 2 - 0.016, y + 0.017 + dy, -0.011],
          [x - l / 2 + 0.008, y + 0.018 + dy, -0.006],
        ],
        mat(color),
        0.0015,
      );
    box(
      [0.011, 0.008, 0.006],
      [x - l / 2 - 0.01, y + 0.018, -0.01],
      mat("#b79b3d"),
      0.001,
    );
  }
  for (const m of a.motors) {
    const [x, y, z] = m.positionM;
    const arm = box(
      [Math.hypot(x, y), 0.012, 0.005],
      [x / 2, y / 2, 0.002],
      carbon,
    );
    arm.rotation.z = Math.atan2(y, x);
    cylinder(0.014, 0.003, [x, y, z + 0.023], carbon);
    cylinder(0.0125, 0.003, [x, y, z + 0.021], black);
    cylinder(0.0105, 0.009, [x, y, z + 0.014], copper);
    cylinder(0.013, 0.003, [x, y, z + 0.008], black);
    // Open bell windows reveal copper stator windings.
    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI) / 6;
      const rib = box(
        [0.002, 0.003, 0.009],
        [x + Math.cos(angle) * 0.0118, y + Math.sin(angle) * 0.0118, z + 0.014],
        black,
        0.0005,
      );
      rib.rotation.z = angle;
    }
    for (const offset of [-0.002, 0, 0.002])
      wire(
        [
          [x, y + offset, z + 0.02],
          [x * 0.75, y * 0.75 + offset, 0.0005],
          [x * 0.25, y * 0.25 + offset, -0.001],
        ],
        black,
        0.00065,
      );
    cylinder(0.004, 0.005, [x, y, z + 0.004], metal);
    const holder = new T.Group();
    holder.position.set(x, y, z);
    holder.rotation.y = Math.PI / 2;
    group.add(holder);
    const prop = new T.Group();
    holder.add(prop);
    propellers.push(prop);
    const plastic = mat(x > 0 ? "#ac5938" : "#667b85", 0.35, 0.05);
    const hub = cylinder(0.006, 0.003, [0, 0, 0], plastic, prop);
    hub.rotation.set(0, 0, Math.PI / 2);
    // Swept, tapered, pitched airfoil blades. Rotation axis remains local X for animation.
    const radius = m.propDiameterM / 2,
      sign = m.spin === "cw" ? 1 : -1;
    for (let blade = 0; blade < 3; blade++) {
      const positions: number[] = [],
        indices: number[] = [];
      const stations = 18;
      for (let i = 0; i <= stations; i++) {
        const t = i / stations,
          r = 0.005 + (radius - 0.005) * t;
        const chord =
          radius * (0.12 + 0.12 * Math.sin(Math.PI * t)) * (1 - 0.75 * t ** 7);
        const sweep = sign * radius * 0.13 * t * t,
          pitch = sign * (0.46 - 0.29 * t);
        for (let side = 0; side < 2; side++)
          for (let j = 0; j <= 8; j++) {
            const u = j / 8 - 0.5,
              thickness =
                Math.sin(Math.PI * (u + 0.5)) * 0.00065 * (side ? -1 : 1);
            positions.push(
              u * chord * Math.sin(pitch) + thickness,
              r,
              sweep + u * chord * Math.cos(pitch),
            );
          }
      }
      for (let i = 0; i < stations; i++)
        for (let side = 0; side < 2; side++)
          for (let j = 0; j < 8; j++) {
            const n = i * 18 + side * 9 + j,
              b = n + 18;
            indices.push(n, b, n + 1, n + 1, b, b + 1);
          }
      const geom = new T.BufferGeometry();
      geom.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
      geom.setIndex(indices);
      geom.computeVertexNormals();
      plastic.side = T.DoubleSide;
      const o = mesh(geom, plastic, [0, 0, 0], prop);
      o.rotation.x = (blade * Math.PI * 2) / 3;
    }
    const nut = cylinder(0.0035, 0.004, [x, y, z - 0.004], metal);
    nut.name = "propeller-locknut";
  }
  box([0.019, 0.019, 0.017], [0.043 * frameScale, 0, -0.006], black, 0.003);
  const lens = cylinder(0.006, 0.008, [0.056 * frameScale, 0, -0.009], black);
  lens.rotation.set(0, 0, Math.PI / 2);
  const glass = cylinder(
    0.0046,
    0.0007,
    [0.0605 * frameScale, 0, -0.009],
    mat("#1f4959", 0.12, 0.65),
  );
  glass.rotation.set(0, 0, Math.PI / 2);
  wire(
    [
      [-0.035 * frameScale, 0, -0.003],
      [-0.055 * frameScale, 0, -0.015],
      [-0.069 * frameScale, 0, -0.035],
    ],
    black,
    0.0013,
  );
  cylinder(0.004, 0.012, [-0.069 * frameScale, 0, -0.04], rubber);
  for (const p of a.contactPoints)
    box(
      [0.012, 0.014, 0.023],
      [p.positionM[0], p.positionM[1], p.positionM[2] - 0.0115],
      rubber,
      0.003,
    );
  const cgValue = massProperties(a).cg;
  for (const child of group.children)
    child.position.sub(new T.Vector3(...cgValue));
  const cg = new T.Group();
  cg.add(
    new T.Mesh(
      new T.SphereGeometry(0.003, 16, 12),
      new T.MeshBasicMaterial({ color: "#edb561", depthTest: false }),
    ),
  );
  group.add(cg);
  return { group, propellers, controls: [], cg };
}
