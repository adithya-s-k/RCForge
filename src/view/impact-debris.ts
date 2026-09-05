import * as T from "three";
import type { Aircraft } from "../core/schema";
import { massProperties } from "../core/aircraft";
import { seededRandom } from "./terrain-material";

/** A bounded visual aftermath. Does not advance, damage or alter the recorded aircraft. */
export class ImpactDebris {
  readonly group = new T.Group();
  private pieces: {
    object: T.Mesh;
    velocity: T.Vector3;
    spin: T.Vector3;
    corners: T.Vector3[];
    drag: number;
  }[] = [];
  private elapsed = 0;
  private settled = false;
  constructor(
    private groundHeight: (x: number, z: number) => number = () => 0,
  ) {}
  get active() {
    return this.pieces.length > 0;
  }
  get moving() {
    return this.active && !this.settled && this.elapsed < 20;
  }
  start(root: T.Group, aircraft: Aircraft, velocity: T.Vector3) {
    this.clear();
    root.updateMatrixWorld(true);
    const cg = new T.Vector3(...massProperties(aircraft).cg);
    const parts = aircraft.parts
      .filter((p) =>
        ["body", "wing", "tail", "battery", "motor"].includes(p.kind),
      )
      .slice(0, 16);
    if (!parts.length) return;
    const anchors = parts.map((p) => new T.Vector3(...p.positionM).sub(cg));
    const buckets = anchors.map(
      () =>
        new Map<
          T.Material,
          {
            position: number[];
            normal: number[];
            uv: number[];
            color: number[];
          }
        >(),
    );
    const inverse = root.matrixWorld.clone().invert(),
      point = new T.Vector3();
    // Split even batched carbon frames at component stations. Keep original triangles,
    // UVs and materials, including any currently deflected control surfaces.
    root.traverseVisible((o) => {
      if (!(o instanceof T.Mesh)) return;
      const g: T.BufferGeometry = o.geometry.index
        ? o.geometry.toNonIndexed()
        : o.geometry.clone();
      g.applyMatrix4(inverse.clone().multiply(o.matrixWorld));
      const p = g.getAttribute("position"),
        n = g.getAttribute("normal"),
        uv = g.getAttribute("uv"),
        color = g.getAttribute("color");
      for (let i = 0; i < p.count; i += 3) {
        point.set(0, 0, 0);
        for (let j = 0; j < 3; j++)
          point.add(new T.Vector3().fromBufferAttribute(p, i + j));
        point.multiplyScalar(1 / 3);
        let selected = 0,
          best = Infinity;
        anchors.forEach((a, k) => {
          const distance = point.distanceToSquared(a);
          if (distance < best) {
            best = distance;
            selected = k;
          }
        });
        const material = Array.isArray(o.material)
          ? o.material[
              g.groups.find((v) => i >= v.start && i < v.start + v.count)
                ?.materialIndex ?? 0
            ]
          : o.material;
        if (!material || !material.visible) continue;
        let b = buckets[selected].get(material);
        if (!b) {
          b = { position: [], normal: [], uv: [], color: [] };
          buckets[selected].set(material, b);
        }
        for (let j = 0; j < 3; j++) {
          const k = i + j;
          b.position.push(
            p.getX(k) - anchors[selected].x,
            p.getY(k) - anchors[selected].y,
            p.getZ(k) - anchors[selected].z,
          );
          b.normal.push(n?.getX(k) ?? 0, n?.getY(k) ?? 0, n?.getZ(k) ?? 1);
          b.uv.push(uv?.getX(k) ?? 0, uv?.getY(k) ?? 0);
          b.color.push(
            color?.getX(k) ?? 1,
            color?.getY(k) ?? 1,
            color?.getZ(k) ?? 1,
          );
        }
      }
      g.dispose();
    });
    const random = seededRandom(aircraft.id.length * 337 + 17),
      rotation = root.getWorldQuaternion(new T.Quaternion());
    const speed = Math.min(30, velocity.length()),
      forward = velocity.clone().clampLength(0, 30);
    buckets.forEach((materials, k) => {
      if (!materials.size) return;
      const geometry = new T.BufferGeometry(),
        attributes = {
          position: [] as number[],
          normal: [] as number[],
          uv: [] as number[],
          color: [] as number[],
        },
        palette: T.Material[] = [];
      for (const [material, data] of materials) {
        geometry.addGroup(
          attributes.position.length / 3,
          data.position.length / 3,
          palette.length,
        );
        palette.push(material);
        for (const name of Object.keys(
          attributes,
        ) as (keyof typeof attributes)[])
          for (const value of data[name]) attributes[name].push(value);
      }
      for (const [name, values] of Object.entries(attributes))
        geometry.setAttribute(
          name,
          new T.Float32BufferAttribute(values, name === "uv" ? 2 : 3),
        );
      geometry.computeBoundingBox();
      const object = new T.Mesh(geometry, palette);
      object.name = `debris:${parts[k].id}`;
      object.position.copy(anchors[k]).applyMatrix4(root.matrixWorld);
      object.quaternion.copy(rotation);
      object.castShadow = true;
      object.receiveShadow = true;
      // Actual support vertices avoid balancing a fragment on an invisible box.
      const corners: T.Vector3[] = [],
        positions = geometry.getAttribute("position");
      for (const x of [-1, 0, 1])
        for (const y of [-1, 0, 1])
          for (const z of [-1, 0, 1]) {
            if (!x && !y && !z) continue;
            const direction = new T.Vector3(x, y, z),
              vertex = new T.Vector3();
            let best = -Infinity,
              index = 0;
            for (let i = 0; i < positions.count; i++) {
              const score = vertex
                .fromBufferAttribute(positions, i)
                .dot(direction);
              if (score > best) {
                best = score;
                index = i;
              }
            }
            corners.push(new T.Vector3().fromBufferAttribute(positions, index));
          }
      const outward = anchors[k]
        .clone()
        .applyQuaternion(rotation)
        .normalize()
        .multiplyScalar(Math.min(2, speed * 0.08));
      const v = forward
        .clone()
        .multiplyScalar(0.25 + random() * 0.2)
        .add(outward);
      v.y = Math.min(
        2.5,
        Math.abs(v.y) * 0.15 + speed * (0.015 + random() * 0.025),
      );
      const spin = new T.Vector3(
        random() - 0.5,
        random() - 0.5,
        random() - 0.5,
      ).multiplyScalar(Math.min(12, speed * 0.55));
      this.pieces.push({
        object,
        velocity: v,
        spin,
        corners,
        drag: Math.min(1.6, 0.06 / Math.sqrt(parts[k].massKg)),
      });
      this.group.add(object);
    });
    this.settlePenetrations();
  }
  private bottom(p: (typeof this.pieces)[number]) {
    return (
      Math.min(
        ...p.corners.map(
          (v) => v.clone().applyQuaternion(p.object.quaternion).y,
        ),
      ) + p.object.position.y
    );
  }
  private settlePenetrations() {
    for (const p of this.pieces) {
      const y = this.bottom(p);
      const floor =
        this.groundHeight(p.object.position.x, p.object.position.z) + 0.004;
      if (y < floor) p.object.position.y += floor - y;
    }
  }
  update(dt: number) {
    // Substeps make bounce behavior stable at both idle and flight render cadences.
    let remaining = Math.min(0.1, Math.max(0, dt));
    while (remaining > 1e-8 && this.moving) {
      const h = Math.min(1 / 120, remaining);
      remaining -= h;
      this.elapsed += h;
      for (const p of this.pieces) {
        p.velocity.y -= 9.80665 * h;
        p.velocity.multiplyScalar(Math.exp(-p.drag * h));
        p.object.position.addScaledVector(p.velocity, h);
        const angle = p.spin.length() * h;
        if (angle > 1e-6)
          p.object.quaternion.premultiply(
            new T.Quaternion().setFromAxisAngle(
              p.spin.clone().normalize(),
              angle,
            ),
          );
        const bottom = this.bottom(p);
        const floor =
          this.groundHeight(p.object.position.x, p.object.position.z) + 0.004;
        if (bottom < floor) {
          p.object.position.y += floor - bottom;
          const supports = p.corners.map((v) =>
            v.clone().applyQuaternion(p.object.quaternion),
          );
          const minY = Math.min(...supports.map((v) => v.y));
          const touching = supports.filter((v) => v.y < minY + 0.01);
          const contact = touching
            .reduce((v, r) => v.add(r), new T.Vector3())
            .multiplyScalar(1 / touching.length);
          // Gravity tips the centre over its contact, instead of freezing upright shards.
          const tipping = contact.clone().cross(new T.Vector3(0, 1, 0));
          p.spin.addScaledVector(
            tipping,
            (9.80665 * h) / Math.max(0.003, contact.lengthSq()),
          );
          p.velocity.y =
            Math.abs(p.velocity.y) > 0.45 ? Math.abs(p.velocity.y) * 0.18 : 0;
          const friction = Math.exp(-7 * h);
          p.velocity.x *= friction;
          p.velocity.z *= friction;
          p.spin.multiplyScalar(Math.exp(-8 * h));
        }
      }
      if (this.elapsed > 6)
        this.settled = this.pieces.every(
          (p) =>
            this.bottom(p) -
              this.groundHeight(p.object.position.x, p.object.position.z) <
              0.02 && p.velocity.length() < 0.08,
        );
    }
  }
  clear() {
    // Materials/textures are borrowed from the intact model and stay owned by it.
    this.pieces.forEach((p) => p.object.geometry.dispose());
    this.pieces = [];
    this.group.clear();
    this.elapsed = 0;
    this.settled = false;
  }
}
