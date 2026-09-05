import * as T from "three";
import { TransformControls } from "three/addons/controls/TransformControls.js";
import type { Aircraft } from "../core/schema";
import { moveComponent } from "../core/components";
import { massProperties } from "../core/aircraft";
import type { Vec3 } from "../core/math";
import type { AircraftVisual } from "./model";
import { ComponentFocus } from "./component-focus";

/** Cancelable visual placement. Core mass properties provide the live balance
 * marker; the aircraft draft and running simulation remain untouched. */
export class ComponentPlacementView {
  readonly controls: TransformControls;
  private proxy = new T.Object3D();
  private focus = new ComponentFocus();
  private working: Aircraft;
  private base: Vec3;
  private cg: Vec3;
  private targets: { object: T.Object3D; position: T.Vector3 }[];
  private materials: { mesh: T.Mesh; original: T.Material | T.Material[] }[] =
    [];
  private transparentMaterials = new Map<T.Material, T.Material>();
  onChange?: (position: Vec3) => void;
  private release = () =>
    this.controls.pointerUp({ button: 0 } as PointerEvent);
  constructor(
    private scene: T.Scene,
    private canvas: HTMLCanvasElement,
    camera: T.Camera,
    private visual: AircraftVisual,
    a: Aircraft,
    private partId: string,
  ) {
    this.working = structuredClone(a);
    this.base = [...a.parts.find((p) => p.id === partId)!.positionM];
    this.cg = massProperties(a).cg;
    this.targets = visual.group.children
      .filter(
        (o) =>
          o.userData.partId === partId ||
          o.userData.pairedPartId === partId ||
          o.name === `fpv-camera:${partId}`,
      )
      .map((object) => ({ object, position: object.position.clone() }));
    this.controls = new TransformControls(camera, canvas);
    this.controls.setSpace("local");
    this.controls.setSize(0.85);
    this.controls.setColors("#ef8c84", "#a7d08d", "#8ebfec", "#ffffff");
    this.controls.showE = false;
    this.controls.showXYZE = false;
    this.proxy.quaternion.setFromAxisAngle(new T.Vector3(1, 0, 0), Math.PI / 2);
    scene.add(this.proxy, this.controls.getHelper(), this.focus.group);
    this.controls.attach(this.proxy);
    this.setPosition(this.base);
    this.controls.addEventListener("objectChange", () => {
      const p = this.proxy.position;
      this.setPosition([p.x + this.cg[0], p.z + this.cg[1], -p.y + this.cg[2]]);
      this.onChange?.(this.position);
    });
    canvas.addEventListener("pointercancel", this.release);
    canvas.addEventListener("lostpointercapture", this.release);
    window.addEventListener("blur", this.release);
  }
  get position(): Vec3 {
    return [...this.working.parts.find((p) => p.id === this.partId)!.positionM];
  }
  get dragging() {
    return this.controls.dragging;
  }
  pointerDown(e: PointerEvent) {
    if (e.button !== 0) return false;
    const rect = this.canvas.getBoundingClientRect();
    this.controls.pointerHover({
      x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
      y: (-(e.clientY - rect.top) / rect.height) * 2 + 1,
      button: e.button,
    } as PointerEvent);
    return this.controls.axis !== null;
  }
  setPosition(position: Vec3) {
    const p = position.map((v) => T.MathUtils.clamp(v, -10, 10)) as Vec3;
    p.forEach((v, i) => moveComponent(this.working, this.partId, i, v));
    this.proxy.position.set(
      p[0] - this.cg[0],
      -(p[2] - this.cg[2]),
      p[1] - this.cg[1],
    );
    this.proxy.updateMatrixWorld(true);
    const delta = new T.Vector3(...p.map((v, i) => v - this.base[i]));
    for (const t of this.targets) t.object.position.copy(t.position).add(delta);
    this.focus.set(
      this.working.parts.find((p) => p.id === this.partId),
      this.cg,
    );
    const next = massProperties(this.working).cg;
    this.visual.cg.position.set(
      ...(next.map((v, i) => v - this.cg[i]) as Vec3),
    );
  }
  prepare(camera: T.Camera) {
    this.controls.camera = camera;
    this.visual.cg.visible = true;
  }
  setTransparentAirframe(enabled: boolean) {
    this.restoreMaterials();
    if (!enabled) return;
    for (const child of this.visual.group.children) {
      const part = this.working.parts.find(
        (p) => p.id === child.userData.partId,
      );
      if (
        !child.name.startsWith("surface:") &&
        !["body", "wing", "boom", "tail"].includes(part?.kind ?? "")
      )
        continue;
      child.traverse((o) => {
        if (!(o instanceof T.Mesh)) return;
        this.materials.push({ mesh: o, original: o.material });
        const copy = (m: T.Material) => {
          let material = this.transparentMaterials.get(m);
          if (!material) {
            material = m.clone();
            material.transparent = true;
            material.opacity = 0.2;
            material.depthWrite = false;
            this.transparentMaterials.set(m, material);
          }
          return material;
        };
        o.material = Array.isArray(o.material)
          ? o.material.map(copy)
          : copy(o.material);
      });
    }
  }
  private restoreMaterials() {
    for (const { mesh, original } of this.materials) mesh.material = original;
    this.materials = [];
    this.transparentMaterials.forEach((m) => m.dispose());
    this.transparentMaterials.clear();
  }
  dispose() {
    this.restoreMaterials();
    this.release();
    this.controls.dispose();
    this.scene.remove(this.proxy, this.controls.getHelper(), this.focus.group);
    this.focus.dispose();
    for (const t of this.targets) t.object.position.copy(t.position);
    this.visual.cg.position.set(0, 0, 0);
    this.canvas.removeEventListener("pointercancel", this.release);
    this.canvas.removeEventListener("lostpointercapture", this.release);
    window.removeEventListener("blur", this.release);
  }
}
