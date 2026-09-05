import * as T from "three";
import { TransformControls } from "three/addons/controls/TransformControls.js";
import type { Aircraft } from "../core/schema";
import type { Vec3 } from "../core/math";
import {
  cameraPlacement,
  type CameraPlacement,
} from "../core/camera-placement";
import { componentRotation } from "./component-pose";
import { fpvMount, placeFpvCamera } from "./fpv-camera";
import type { AircraftVisual } from "./model";

const conversion = new T.Quaternion().setFromAxisAngle(
  new T.Vector3(1, 0, 0),
  Math.PI / 2,
);
const fromScene = (v: T.Vector3): Vec3 => [v.x, v.z, -v.y];
const toScene = (v: readonly number[]) => new T.Vector3(v[0], -v[2], v[1]);

/** Keep the complete rotated housing outside the picked tangent plane. */
export function cameraSurfacePosition(
  point: T.Vector3,
  normal: T.Vector3,
  size: readonly number[],
  rotation: T.Quaternion,
) {
  const n = normal.clone().normalize();
  const local = n.clone().applyQuaternion(rotation.clone().invert());
  const support =
    (Math.abs(local.x) * size[0] +
      Math.abs(local.y) * size[1] +
      Math.abs(local.z) * size[2]) /
    2;
  return point.clone().addScaledVector(n, support + 0.002);
}

/** Temporary studio manipulation. Uses the existing mesh and renderer, not a second simulation. */
export class CameraPlacementView {
  readonly controls: TransformControls;
  private proxy = new T.Object3D();
  private lens = new T.PerspectiveCamera(90, 16 / 9, 0.003, 200);
  private cone: T.CameraHelper;
  private overlay = document.createElement("div");
  private working: Aircraft;
  private part: Aircraft["parts"][number];
  private housing: T.Object3D;
  private pickMode = false;
  private lastCamera: T.Camera;
  private mode: "translate" | "rotate" = "translate";
  private coneVisible = true;
  private updating = false;
  private releaseGesture = () =>
    this.controls.pointerUp({ button: 0 } as PointerEvent);
  onChange?: (pose: CameraPlacement) => void;
  onGesture?: () => void;
  onPick?: (success: boolean) => void;
  constructor(
    private scene: T.Scene,
    private renderer: T.WebGLRenderer,
    camera: T.Camera,
    private visual: AircraftVisual,
    a: Aircraft,
    private cg: Vec3,
    container: HTMLElement,
  ) {
    this.working = structuredClone(a);
    this.part = this.working.parts.find((p) => p.id === a.fpv?.partId)!;
    this.housing = visual.group.getObjectByName(`fpv-camera:${this.part.id}`)!;
    this.lastCamera = camera;
    this.controls = new TransformControls(camera, renderer.domElement);
    renderer.domElement.addEventListener("pointercancel", this.releaseGesture);
    renderer.domElement.addEventListener(
      "lostpointercapture",
      this.releaseGesture,
    );
    window.addEventListener("blur", this.releaseGesture);
    this.controls.setSpace("local");
    this.controls.setSize(0.8);
    this.controls.setColors("#ef8c84", "#a7d08d", "#8ebfec", "#ffffff");
    this.controls.showE = false;
    this.controls.showXYZE = false;
    scene.add(this.proxy, this.controls.getHelper());
    this.controls.attach(this.proxy);
    this.cone = new T.CameraHelper(this.lens);
    this.cone.setColors(
      new T.Color("#c6d1da"),
      new T.Color("#c6d1da"),
      new T.Color("#c6d1da"),
      new T.Color("#a7d08d"),
      new T.Color("#8ebfec"),
    );
    const material = this.cone.material as T.LineBasicMaterial;
    material.transparent = true;
    material.opacity = 0.35;
    material.depthWrite = false;
    scene.add(this.cone);
    this.overlay.className = "camera-lens-preview";
    this.overlay.innerHTML =
      '<span>LIVE LENS · 16:9</span><i aria-hidden="true"></i><small>Stationary aircraft · mount preview</small>';
    this.overlay.setAttribute("aria-label", "Live FPV lens preview");
    container.append(this.overlay);
    this.controls.addEventListener("mouseDown", () => this.onGesture?.());
    this.controls.addEventListener("objectChange", () => {
      if (this.updating) return;
      if (this.mode === "translate") {
        this.part.positionM = fromScene(this.proxy.position).map((v, i) =>
          T.MathUtils.clamp(v + cg[i], -10, 10),
        ) as Vec3;
      } else {
        const q = conversion.clone().invert().multiply(this.proxy.quaternion);
        const e = new T.Euler().setFromQuaternion(q, "ZYX");
        this.part.orientationDeg = [e.x, e.y, e.z].map(
          T.MathUtils.radToDeg,
        ) as Vec3;
      }
      this.updatePose();
      this.onChange?.(cameraPlacement(this.working));
    });
    this.updatePose();
  }
  get dragging() {
    return this.controls.dragging;
  }
  private pointer(e: PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
      y: 1 - ((e.clientY - rect.top) / rect.height) * 2,
      button: e.button,
    };
  }
  /** Called before the studio orbit handler, including touch pointer-down. */
  pointerDown(e: PointerEvent) {
    if (e.button !== 0) return false;
    if (this.pickMode) {
      e.stopImmediatePropagation();
      const ray = new T.Raycaster();
      ray.setFromCamera(
        new T.Vector2(this.pointer(e).x, this.pointer(e).y),
        this.lastCamera,
      );
      this.visual.group.updateMatrixWorld(true);
      const hit = ray.intersectObject(this.visual.group, true).find((h) => {
        for (let o: T.Object3D | null = h.object; o; o = o.parent) {
          if (
            !o.visible ||
            o === this.housing ||
            o === this.visual.cg ||
            this.visual.propellers.includes(o as T.Group)
          )
            return false;
        }
        return !!h.face;
      });
      if (hit?.face) {
        this.onGesture?.();
        const normal = hit.face.normal
          .clone()
          .applyNormalMatrix(
            new T.Matrix3().getNormalMatrix(hit.object.matrixWorld),
          );
        if (normal.dot(ray.ray.direction) > 0) normal.negate();
        const rotation = conversion
          .clone()
          .multiply(componentRotation(this.part));
        const position = cameraSurfacePosition(
          hit.point,
          normal,
          this.part.sizeM,
          rotation,
        );
        this.part.positionM = fromScene(position).map((v, i) =>
          T.MathUtils.clamp(v + this.cg[i], -10, 10),
        ) as Vec3;
        this.setPick(false);
        this.updatePose();
        this.onChange?.(cameraPlacement(this.working));
        this.onPick?.(true);
      } else this.onPick?.(false);
      return true;
    }
    // Three's implementation takes normalized x/y/button here; its external
    // declaration still calls that record PointerEvent.
    this.controls.pointerHover(this.pointer(e) as PointerEvent);
    return this.controls.axis !== null;
  }
  setPick(value: boolean) {
    this.pickMode = value;
    this.controls.enabled = !value;
    this.controls.getHelper().visible = !value;
    this.renderer.domElement.style.cursor = value ? "crosshair" : "grab";
  }
  setMode(mode: "translate" | "rotate") {
    this.mode = mode;
    this.setPick(false);
    this.controls.setMode(mode);
    this.updatePose();
  }
  setSnap(enabled: boolean) {
    this.controls.setTranslationSnap(enabled ? 0.005 : null);
    this.controls.setRotationSnap(enabled ? T.MathUtils.degToRad(5) : null);
  }
  setCone(value: boolean) {
    this.coneVisible = value;
  }
  setPose(pose: CameraPlacement) {
    this.part.positionM = [...pose.positionM];
    this.part.orientationDeg = [...pose.orientationDeg];
    this.working.fpv!.fovDeg = pose.fovDeg;
    this.updatePose();
  }
  private updatePose() {
    this.updating = true;
    this.housing.position
      .set(...this.part.positionM)
      .sub(new T.Vector3(...this.cg));
    this.housing.quaternion.copy(componentRotation(this.part));
    this.proxy.position.copy(
      toScene(this.part.positionM.map((v, i) => v - this.cg[i])),
    );
    this.proxy.quaternion.copy(conversion);
    if (this.mode === "rotate")
      this.proxy.quaternion.multiply(componentRotation(this.part));
    this.proxy.updateMatrixWorld(true);
    placeFpvCamera(
      this.lens,
      fpvMount(this.working, this.cg)!,
      new T.Vector3(),
      conversion,
    );
    this.lens.far = Math.max(0.06, this.working.reference.spanM * 0.1);
    this.lens.updateProjectionMatrix();
    this.lens.updateMatrixWorld(true);
    this.cone.update();
    this.lens.far = 200;
    this.lens.updateProjectionMatrix();
    this.updating = false;
  }
  prepare(camera: T.Camera) {
    this.lastCamera = camera;
    this.controls.camera = camera;
    this.cone.visible = this.coneVisible;
  }
  renderPreview() {
    const size = this.renderer.getSize(new T.Vector2());
    const w = Math.floor(Math.min(300, size.x * 0.42)),
      h = Math.floor((w * 9) / 16),
      x = size.x - w - 16,
      y = 44;
    Object.assign(this.overlay.style, {
      width: `${w}px`,
      height: `${h}px`,
      right: "16px",
      bottom: `${y}px`,
    });
    const helper = this.controls.getHelper(),
      helperVisible = helper.visible,
      coneVisible = this.cone.visible;
    helper.visible = this.cone.visible = false;
    const shadowUpdate = this.renderer.shadowMap.autoUpdate;
    this.renderer.shadowMap.autoUpdate = false;
    try {
      this.renderer.setScissorTest(true);
      this.renderer.setViewport(x, y, w, h);
      this.renderer.setScissor(x, y, w, h);
      this.renderer.render(this.scene, this.lens);
    } finally {
      this.renderer.setScissorTest(false);
      this.renderer.setViewport(0, 0, size.x, size.y);
      this.renderer.shadowMap.autoUpdate = shadowUpdate;
      helper.visible = helperVisible;
      this.cone.visible = coneVisible;
    }
  }
  dispose() {
    this.renderer.domElement.removeEventListener(
      "pointercancel",
      this.releaseGesture,
    );
    this.renderer.domElement.removeEventListener(
      "lostpointercapture",
      this.releaseGesture,
    );
    window.removeEventListener("blur", this.releaseGesture);
    this.controls.detach();
    this.controls.dispose();
    this.scene.remove(this.proxy, this.controls.getHelper(), this.cone);
    this.cone.dispose();
    this.overlay.remove();
    this.renderer.domElement.style.cursor = "";
  }
}
