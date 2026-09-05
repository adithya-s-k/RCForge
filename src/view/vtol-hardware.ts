import * as T from "three";
import type { Aircraft } from "../core/schema";
import type { Vec3 } from "../core/math";

type Part = Aircraft["parts"][number];
/** Photo-guided installation detail. Every assembly has a corresponding mass
 * entry; screws, circuit detail and wires subdivide that entry, not its mass. */
export function vtolHardware() {
  const mat = (color: string, metalness = 0) =>
    new T.MeshStandardMaterial({
      color,
      roughness: metalness ? 0.42 : 0.8,
      metalness,
    });
  const plastic = mat("#292b2e"),
    printed = mat("#cc562f"),
    metal = mat("#90979a", 0.75),
    wood = mat("#af9469"),
    board = mat("#27403c"),
    gold = mat("#b7a05c", 0.5);
  const red = mat("#a5392c"),
    cable = mat("#181b20"),
    signal = mat("#b57e3f");
  function solid(
    parent: T.Object3D,
    geometry: T.BufferGeometry,
    material: T.Material,
    pos: Vec3,
  ) {
    const m = new T.Mesh(geometry, material);
    m.position.set(...pos);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  const box = (g: T.Object3D, size: Vec3, pos: Vec3, m = plastic) =>
    solid(g, new T.BoxGeometry(...size), m, pos);
  const rod = (
    g: T.Object3D,
    start: Vec3,
    end: Vec3,
    radius: number,
    material = metal,
  ) => {
    const a = new T.Vector3(...start),
      b = new T.Vector3(...end),
      d = b.clone().sub(a);
    const m = solid(
      g,
      new T.CylinderGeometry(radius, radius, d.length(), 10),
      material,
      [0, 0, 0],
    );
    m.position.copy(a.add(b).multiplyScalar(0.5));
    m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize());
    return m;
  };
  return {
    part(parent: T.Group, p: Part, a: Aircraft): boolean {
      const [x, y, z] = p.positionM,
        [l, w, h] = p.sizeM;
      if (p.id === "wiring") {
        const byId = (id: string) =>
          a.parts.find((p) => p.id === id)?.positionM;
        const wire = (
          from: Vec3,
          to: Vec3,
          material: T.Material,
          radius = 0.001,
        ) => {
          const mid: Vec3 = [
            (from[0] + to[0]) / 2,
            (from[1] + to[1]) / 2,
            Math.max(from[2], to[2]) + 0.012,
          ];
          solid(
            parent,
            new T.TubeGeometry(
              new T.CatmullRomCurve3([
                new T.Vector3(...from),
                new T.Vector3(...mid),
                new T.Vector3(...to),
              ]),
              12,
              radius,
              5,
              false,
            ),
            material,
            [0, 0, 0],
          );
        };
        const battery = byId(a.battery?.partId ?? "battery");
        for (const side of ["left", "right", "rear"]) {
          const esc = byId(`esc-${side}`),
            motor = a.motors.find((m) => m.id === `motor-${side}`);
          if (battery && esc)
            for (const offset of [-0.002, 0.002])
              wire(
                [battery[0] - 0.03, battery[1] + offset, battery[2]],
                [esc[0], esc[1] + offset, esc[2]],
                offset > 0 ? red : cable,
              );
          if (esc && motor)
            for (const offset of [-0.002, 0, 0.002])
              wire(
                [esc[0], esc[1] + offset, esc[2]],
                [
                  motor.positionM[0],
                  motor.positionM[1] + offset,
                  motor.positionM[2] + 0.009,
                ],
                cable,
                0.00075,
              );
        }
        const fc = byId("flight-controller");
        if (fc)
          for (const id of [
            a.vtol!.leftServoPartId,
            a.vtol!.rightServoPartId,
            a.vtol!.rearServoPartId,
          ]) {
            const servo = byId(id);
            if (servo)
              wire([fc[0], fc[1], fc[2] + 0.005], servo, signal, 0.00065);
          }
      } else if (
        p.id === "rear-motor-support" ||
        p.id.startsWith("front-support-")
      ) {
        box(parent, p.sizeM, p.positionM, wood).name = p.id;
        for (const offset of [-0.35, 0.35])
          box(
            parent,
            [l, 0.0005, 0.0003],
            [x, y + w * offset, z - h / 2 - 0.0002],
            gold,
          );
      } else if (
        p.id === "rear-yaw-bracket" ||
        p.id.startsWith("tilt-bracket-")
      ) {
        const rear = p.id === "rear-yaw-bracket",
          material = rear ? printed : plastic,
          rotor = a.motors.find(
            (m) =>
              m.id ===
              (rear
                ? a.vtol!.rearMotorId
                : p.id.endsWith("left")
                  ? a.vtol!.frontLeftMotorId
                  : a.vtol!.frontRightMotorId),
          )!,
          hinge = rotor.positionM,
          floor = z + h / 2 - 0.004,
          top = hinge[2] - 0.006;
        box(parent, [l, w, 0.004], [x, y, z + h / 2 - 0.002], material).name =
          p.id;
        // Rear bearings run along body X; front bearings along body Y.
        for (const side of [-1, 1]) {
          const pos: Vec3 = rear
            ? [hinge[0] + side * (l / 2 - 0.003), hinge[1], hinge[2]]
            : [hinge[0], hinge[1] + side * (w / 2 - 0.003), hinge[2]];
          box(
            parent,
            rear
              ? [0.006, w * 0.55, floor - top]
              : [l * 0.6, 0.006, floor - top],
            [pos[0], pos[1], (floor + top) / 2],
            material,
          );
          const axis: Vec3 = rear ? [0.004, 0, 0] : [0, 0.004, 0];
          rod(
            parent,
            pos.map((v, i) => v - axis[i]) as Vec3,
            pos.map((v, i) => v + axis[i]) as Vec3,
            0.005,
            metal,
          ).name = `tilt-bearing:${rotor.id}:${side}`;
          for (const end of [-1, 1]) {
            const bolt: Vec3 = [
              x + end * l * 0.36,
              y + side * w * 0.35,
              z + h / 2 - 0.004,
            ];
            solid(
              parent,
              new T.CylinderGeometry(0.0016, 0.0016, 0.001, 8),
              metal,
              bolt,
            ).rotation.x = Math.PI / 2;
          }
        }
      } else if (
        p.kind === "equipment" &&
        !p.servo &&
        !a.motors.some((m) => m.propPartId === p.id) &&
        p.id !== a.fpv?.partId &&
        p.id !== "vtol-skids"
      ) {
        const pcb = p.id === "flight-controller";
        box(parent, p.sizeM, p.positionM, pcb ? board : plastic).name =
          `equipment:${p.id}`;
        if (pcb) {
          const wingTop = -0.043;
          for (const dx of [-1, 1])
            for (const dy of [-1, 1])
              rod(
                parent,
                [x + dx * l * 0.37, y + dy * w * 0.37, z + h / 2],
                [x + dx * l * 0.37, y + dy * w * 0.37, wingTop],
                0.0015,
                plastic,
              );
          box(
            parent,
            [l * 0.38, w * 0.38, 0.003],
            [x, y, z - h / 2 - 0.001],
            plastic,
          );
          for (const side of [-1, 1])
            for (let i = 0; i < 5; i++)
              box(
                parent,
                [0.0015, 0.003, 0.005],
                [x + l * (i / 6 - 0.33), y + side * w * 0.42, z - h / 2],
                gold,
              );
          box(
            parent,
            [l * 0.16, w * 0.3, 0.004],
            [x + l * 0.39, y, z - h / 2],
            metal,
          );
        } else if (p.id.startsWith("esc-") || p.id === "vtol-bec") {
          for (let i = 0; i < 5; i++)
            box(
              parent,
              [l * 0.75, 0.0007, 0.001],
              [x, y + w * (i - 2) * 0.13, z - h / 2],
              metal,
            );
        } else if (p.id === "receiver") {
          rod(
            parent,
            [x - l / 2, y, z],
            [x - l / 2 - 0.025, y + 0.018, z - 0.02],
            0.0005,
            plastic,
          );
          for (let i = 0; i < 6; i++)
            box(
              parent,
              [0.002, 0.002, 0.002],
              [x + l * 0.4, y + (i - 2.5) * 0.0025, z - h / 2],
              gold,
            );
        }
      } else return false;
      return true;
    },
    motor(parent: T.Group, size: Vec3, center: Vec3) {
      const [l, w, h] = size,
        [x, y, z] = center;
      const can = solid(
        parent,
        new T.CylinderGeometry(0.5, 0.5, 1, 20),
        plastic,
        center,
      );
      can.scale.set(w, l * 0.57, h);
      can.rotation.z = Math.PI / 2;
      for (const side of [-1, 1]) {
        const cap = solid(
          parent,
          new T.CylinderGeometry(0.48, 0.46, 1, 20),
          printed,
          [x + side * l * 0.31, y, z],
        );
        cap.scale.set(w, l * 0.13, h);
        cap.rotation.z = Math.PI / 2;
      }
      for (let i = 0; i < 6; i++) {
        const t = (i * Math.PI) / 3;
        box(
          parent,
          [0.001, w * 0.15, h * 0.12],
          [x + l * 0.39, y + Math.cos(t) * w * 0.3, z + Math.sin(t) * h * 0.3],
          plastic,
        );
      }
      can.name = "vtol-motor-can";
    },
    cradle(pivot: T.Group, rear: boolean, size: Vec3, centerX: number) {
      // Authored along canonical +X shaft. The motor pivot supplies the actual tilt.
      const [l, w, h] = size;
      box(
        pivot,
        [0.005, w * 1.2, h * 1.2],
        [centerX - l / 2 - 0.0025, 0, 0],
        rear ? printed : plastic,
      ).name = "moving-motor-cradle";
      const plateX = centerX - l / 2 - 0.0025;
      for (const sign of [-1, 1])
        box(
          pivot,
          rear
            ? [Math.max(0.008, plateX + 0.006), 0.008, 0.005]
            : [Math.max(0.008, plateX + 0.006), 0.005, 0.008],
          rear ? [plateX / 2, 0, sign * 0.02] : [plateX / 2, sign * 0.02, 0],
          rear ? printed : plastic,
        );
      rod(
        pivot,
        rear ? [0, 0, -0.024] : [0, -0.025, 0],
        rear ? [0, 0, 0.024] : [0, 0.025, 0],
        0.0025,
        metal,
      ).name = "tilt-shaft";
    },
    servo(parent: T.Group, p: Part) {
      // Local servo shaft comes out of its top. orientationDeg installs it sideways.
      const [x, y, z] = p.positionM,
        [l, w, h] = p.sizeM;
      box(parent, [l * 1.2, w, 0.003], [x, y, z - h * 0.34]);
      rod(
        parent,
        [x + l * 0.27, y, z - h / 2],
        [x + l * 0.27, y, z - h / 2 - 0.005],
        0.004,
        metal,
      ).name = `servo-shaft:${p.id}`;
      const horn = new T.Group();
      horn.name = `tilt-servo-horn:${p.id}`;
      horn.position.set(x + l * 0.27, y, z - h / 2 - 0.006);
      parent.add(horn);
      box(horn, [0.014, 0.004, 0.002], [0.004, 0, 0], plastic);
      box(
        parent,
        [l * 0.6, 0.0005, h * 0.3],
        [x, y - w / 2 - 0.0002, z],
        p.model === "MG996R" ? printed : metal,
      );
    },
    rails(parent: T.Group, a: Aircraft) {
      for (const side of [-1, 1]) {
        const points = a.contactPoints
          .filter(
            (c) => c.kind === "skid" && Math.sign(c.positionM[1]) === side,
          )
          .sort((a, b) => a.positionM[0] - b.positionM[0]);
        if (points.length < 2) continue;
        const start = [...points[0].positionM] as Vec3,
          end = [...points.at(-1)!.positionM] as Vec3;
        start[0] -= 0.02;
        end[0] += 0.02;
        start[2] -= 0.003;
        end[2] -= 0.003;
        rod(parent, start, end, 0.003, plastic).name = "landing-skid-rail";
        rod(
          parent,
          end,
          [end[0] + 0.025, end[1], end[2] - 0.012],
          0.003,
          plastic,
        );
      }
    },
  };
}
