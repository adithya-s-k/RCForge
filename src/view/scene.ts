import { powertrain } from "../core/powertrain";
import { sceneries, type SceneryId } from "../core/scenery";
import { surfaceCommand } from "../core/surface-control";
import * as T from "three";
import type { Aircraft } from "../core/schema";
import type { Simulation, Controls } from "../core/simulation";
import { massProperties } from "../core/aircraft";
import { type Vec3 } from "../core/math";
import { buildAircraft, disposeAircraft, type AircraftVisual } from "./model";
import { createField } from "./field";
import type { Placement } from "../core/placement";
import { renderBudget, renderPixelRatio } from "./render-budget";
import { followAircraftShadow } from "./aircraft-shadow";
import { fitInspectionCamera, type InspectionView } from "./inspection-camera";
const studioSun: [number, number, number] = [-3, 6, 4];
const toWorld = (v: Vec3) => new T.Vector3(v[0], -v[2], v[1]);
const conversion = new T.Quaternion().setFromAxisAngle(
  new T.Vector3(1, 0, 0),
  Math.PI / 2,
);
export type CameraMode = "ground" | "chase" | "orbit";
/** Fixed physical pilot position; only head direction changes. No automatic zoom. */
export class FlightScene {
  renderer: T.WebGLRenderer;
  scene = new T.Scene();
  camera = new T.PerspectiveCamera(55, 1, 0.15, 10000);
  private drawingCamera = new T.OrthographicCamera();
  private inspectionView: InspectionView = "perspective";
  private modelSize = new T.Vector3(1, 1, 1);
  private modelCenter = new T.Vector3();
  onInspectionView?: (view: InspectionView) => void;
  mode: CameraMode = "ground";
  showForces = false;
  showCG = false;
  pilotFov = 55;
  walking = false;
  trackAircraft = true;
  chaseDistance = 4.8;
  private lookYaw = 0;
  private lookPitch = 0;
  private chaseForward = new T.Vector3(1, 0, 0);
  readonly pilotPosition = new T.Vector3(-8, 1.7, -14);
  private pilotDestination: T.Vector3 | null = null;
  private placementMarker = new T.Group();
  private placementArrow = new T.ArrowHelper(
    new T.Vector3(1, 0, 0),
    new T.Vector3(),
    2,
    0xe9b567,
    0.35,
    0.18,
  );
  private placementRing = new T.Mesh(
    new T.RingGeometry(1.1, 1.18, 48),
    new T.MeshBasicMaterial({
      color: 0xe9b567,
      side: T.DoubleSide,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    }),
  );
  onGroundPick?: (north: number, east: number) => void;
  private visual?: AircraftVisual;
  private cg: Vec3 = [0, 0, 0];
  private span = 1.086;
  private shadowRadius = 1;
  private studio = false;
  private axisGuide = document.createElement("div");
  private scenery: SceneryId = "club";
  private sun = new T.DirectionalLight();
  private hemisphere = new T.HemisphereLight("#d6e3f1", "#788266", 2.1);
  private studioFloorHeight = -0.27;
  private field: ReturnType<typeof createField>;
  private studioGroup = new T.Group();
  private arrows: T.ArrowHelper[] = [];
  private forces = new T.Group();
  private orbitYaw = 0.65;
  private orbitPitch = 0.35;
  private orbitZoom = 1;
  private dragging = false;
  private snap = true;
  private heading = new T.Vector3(0, 0, 1);
  private observer: ResizeObserver;
  constructor(private container: HTMLElement) {
    this.renderer = new T.WebGLRenderer({
      antialias: true,
      logarithmicDepthBuffer: true,
      powerPreference: "default",
    });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFShadowMap;
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    const canvas = this.renderer.domElement;
    canvas.tabIndex = 0;
    canvas.setAttribute("aria-label", "Interactive 3D aircraft view");
    container.append(canvas);
    this.axisGuide.className = "axis-guide";
    this.axisGuide.setAttribute(
      "aria-label",
      "Aircraft axes: X forward, Y right, Z down",
    );
    this.axisGuide.innerHTML = `<svg viewBox="0 0 146 86" role="img" aria-label="Aircraft orientation axes">${["X", "Y", "Z"].map((a, i) => `<g stroke="${["#ef8c84", "#a7d08d", "#8ebfec"][i]}"><line id="axis-line-${a}" x1="73" y1="43"/><text id="axis-text-${a}" fill="${["#ef8c84", "#a7d08d", "#8ebfec"][i]}" stroke="none">${a}</text></g>`).join("")}<circle cx="73" cy="43" r="2" fill="#dce4e8"/></svg><small>X Forward · Y Right · Z Down</small>`;
    container.append(this.axisGuide);
    this.scene.add(this.hemisphere);
    const sun = (this.sun = new T.DirectionalLight("#fff4dc", 3.2));
    sun.position.set(25, 60, -35);
    sun.castShadow = true;
    sun.shadow.mapSize.set(renderBudget.shadowSize, renderBudget.shadowSize);
    sun.shadow.normalBias = 0.006;
    this.scene.add(sun, sun.target);
    this.field = createField(this.scene);
    this.scene.add(this.forces, this.studioGroup);
    this.placementMarker.visible = false;
    this.placementRing.rotation.x = -Math.PI / 2;
    this.placementMarker.add(this.placementRing, this.placementArrow);
    this.scene.add(this.placementMarker);
    const floor = new T.Mesh(
      new T.PlaneGeometry(200, 200),
      new T.MeshStandardMaterial({ color: "#252627", roughness: 0.94 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.27;
    floor.receiveShadow = true;
    this.studioGroup.add(floor);
    const grid = new T.GridHelper(8, 40, "#44474a", "#2e3134");
    grid.position.y = -0.268;
    this.studioGroup.add(grid);
    canvas.addEventListener("pointerdown", (e) => {
      if (this.mode === "orbit" || this.mode === "ground") {
        this.dragging = true;
        canvas.setPointerCapture(e.pointerId);
      }
    });
    canvas.addEventListener("pointermove", (e) => {
      // Capture can be lost to a panel, tab switch or system gesture without pointerup.
      if (e.buttons === 0) this.dragging = false;
      if (this.dragging && this.mode === "ground") {
        this.lookYaw -= e.movementX * 0.004;
        this.lookPitch = T.MathUtils.clamp(
          this.lookPitch - e.movementY * 0.004,
          -1.2,
          1.2,
        );
      }
      if (this.dragging && this.mode === "orbit") {
        if (
          this.inspectionView !== "perspective" &&
          (e.movementX || e.movementY)
        ) {
          this.inspectionView = "perspective";
          this.onInspectionView?.("perspective");
        }
        this.orbitYaw -= e.movementX * 0.006;
        this.orbitPitch = T.MathUtils.clamp(
          this.orbitPitch + e.movementY * 0.004,
          -0.08,
          1.35,
        );
      }
    });
    canvas.addEventListener("pointerup", () => (this.dragging = false));
    canvas.addEventListener("pointercancel", () => (this.dragging = false));
    canvas.addEventListener(
      "lostpointercapture",
      () => (this.dragging = false),
    );
    canvas.addEventListener("dblclick", (e) => {
      if (this.studio || !this.onGroundPick) return;
      const rect = canvas.getBoundingClientRect();
      const ray = new T.Raycaster();
      ray.setFromCamera(
        new T.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          1 - ((e.clientY - rect.top) / rect.height) * 2,
        ),
        this.camera,
      );
      const point = ray.ray.intersectPlane(
        new T.Plane(new T.Vector3(0, 1, 0), 0),
        new T.Vector3(),
      );
      if (point) this.onGroundPick(point.x, point.z);
    });
    canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        if (this.mode === "orbit")
          this.orbitZoom = T.MathUtils.clamp(
            this.orbitZoom + e.deltaY * 0.001,
            0.45,
            2.4,
          );
        else if (this.mode === "chase")
          this.chaseDistance = T.MathUtils.clamp(
            this.chaseDistance + e.deltaY * 0.01,
            1.8,
            20,
          );
        else if (this.mode === "ground")
          this.pilotFov = T.MathUtils.clamp(
            this.pilotFov + e.deltaY * 0.025,
            20,
            80,
          );
      },
      { passive: false },
    );
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(container);
    this.resize();
  }
  get needsSmoothMotion() {
    return (
      this.dragging ||
      !!this.pilotDestination ||
      Math.abs(this.lookYaw) + Math.abs(this.lookPitch) > 0.002
    );
  }
  private resize() {
    const w = this.container.clientWidth,
      h = this.container.clientHeight;
    if (!w || !h) return;
    this.renderer.setPixelRatio(renderPixelRatio(w, h, devicePixelRatio));
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
  private disposeVisual() {
    if (!this.visual) return;
    this.scene.remove(this.visual.group);
    disposeAircraft(this.visual.group);
  }
  setAircraft(a: Aircraft) {
    this.disposeVisual();
    this.visual = buildAircraft(a);
    this.scene.add(this.visual.group);
    const bounds = new T.Box3().setFromObject(this.visual.group);
    this.shadowRadius =
      Math.max(bounds.min.length(), bounds.max.length()) + 0.25;
    this.cg = massProperties(a).cg;
    // The rotor diagonal excludes propeller tips; frame the full rendered model.
    const size = bounds.getSize(new T.Vector3());
    this.modelSize.copy(size);
    const center = bounds.getCenter(new T.Vector3());
    this.modelCenter.set(center.x, -center.z, center.y);
    this.studioFloorHeight = -bounds.max.z - 0.02;
    this.studioGroup.children[0].position.y = this.studioFloorHeight;
    this.studioGroup.children[1].position.y = this.studioFloorHeight + 0.002;
    this.span = Math.max(a.reference.spanM, size.x, size.y, size.z);
    this.arrows.forEach((arrow) => arrow.dispose());
    this.forces.clear();
    this.arrows = a.surfaces.map(() => {
      const arrow = new T.ArrowHelper(
        new T.Vector3(0, 1, 0),
        new T.Vector3(),
        0.1,
        0xf3bb68,
        0.02,
        0.01,
      );
      this.forces.add(arrow);
      return arrow;
    });
    this.snap = true;
  }
  setCamera(mode: CameraMode) {
    this.mode = mode;
    this.snap = true;
  }
  locateAircraft() {
    this.trackAircraft = true;
    this.lookYaw = this.lookPitch = 0;
    this.snap = true;
  }
  aircraftScreenPoint(position: Vec3) {
    const point = toWorld(position);
    const distance = point.distanceTo(this.camera.position);
    point.project(this.camera);
    if (
      point.z < -1 ||
      point.z > 1 ||
      Math.abs(point.x) > 1 ||
      Math.abs(point.y) > 1
    )
      return null;
    return { x: (point.x + 1) * 50, y: (1 - point.y) * 50, distance };
  }
  setScenery(id: SceneryId) {
    if (this.scenery === id) return;
    this.scenery = id;
    this.field.dispose();
    this.field = createField(this.scene, sceneries[id]);
    const p = sceneries[id];
    this.sun.position.set(...p.sun);
    this.sun.color.set(p.sunColor);
    this.sun.intensity = p.sunIntensity;
    this.setStudio(this.studio);
  }
  setStudio(value: boolean) {
    this.studio = value;
    this.field.field.visible = !value;
    this.field.sky.visible = !value;
    this.studioGroup.visible = value;
    const site = sceneries[this.scenery];
    this.sun.color.set(value ? "#ffffff" : site.sunColor);
    this.sun.intensity = value ? 2.6 : site.sunIntensity;
    this.sun.shadow.intensity = value ? 0.45 : 1;
    this.sun.shadow.normalBias = value ? 0.001 : 0.006;
    this.hemisphere.color.set(value ? "#e7edf5" : "#d6e3f1");
    this.hemisphere.groundColor.set(value ? "#73777d" : "#788266");
    this.hemisphere.intensity = value ? 3 : 2.1;
    this.scene.background = value ? new T.Color("#1d2024") : null;
    this.scene.fog = value
      ? new T.Fog("#1d2024", 8, 50)
      : new T.Fog(sceneries[this.scenery].fog, 1800, 13000);
    if (value) this.setCamera("orbit");
    this.resize();
  }
  setInspectionView(view: InspectionView) {
    this.dragging = false;
    this.inspectionView = view;
    this.onInspectionView?.(view);
    this.mode = "orbit";
    this.orbitYaw = view === "side" ? Math.PI / 2 : 0.65;
    this.orbitPitch = view === "top" ? 1.35 : view === "side" ? 0.02 : 0.35;
    this.snap = true;
  }
  get pilotMapPosition() {
    return this.pilotDestination ?? this.pilotPosition;
  }
  get pilotHeadingDeg() {
    const forward = this.camera.getWorldDirection(new T.Vector3());
    return ((Math.atan2(forward.z, forward.x) * 180) / Math.PI + 360) % 360;
  }
  movePilotTo(north: number, east: number) {
    if (![north, east].every(Number.isFinite)) return;
    this.pilotDestination = new T.Vector3(
      T.MathUtils.clamp(north, -2000, 2000),
      1.7,
      T.MathUtils.clamp(east, -2000, 2000),
    );
    if (this.mode !== "ground") this.setCamera("ground");
  }
  previewPosition(p: Placement | null, ground: boolean) {
    this.placementMarker.visible = !!p && !this.studio;
    if (!p) return;
    const angle = (p.headingDeg * Math.PI) / 180;
    this.placementRing.position.set(p.northM, 0.035, p.eastM);
    this.placementArrow.position.set(
      p.northM,
      ground ? 0.22 : p.altitudeM,
      p.eastM,
    );
    this.placementArrow.setDirection(
      new T.Vector3(Math.cos(angle), 0, Math.sin(angle)),
    );
  }
  moveObserver(keys: Set<string>, dt: number) {
    if (this.studio || this.mode !== "ground") return;
    const has = (key: string) => (keys.has(key) ? 1 : 0);
    const f =
        has("KeyI") -
        has("KeyK") +
        (this.walking ? has("KeyW") - has("KeyS") : 0),
      r =
        has("KeyL") -
        has("KeyJ") +
        (this.walking ? has("KeyD") - has("KeyA") : 0);
    const forward = new T.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    const right = new T.Vector3().crossVectors(forward, new T.Vector3(0, 1, 0));
    const motion = forward.multiplyScalar(f).addScaledVector(right, r);
    if (motion.lengthSq() > 0) {
      this.pilotDestination = null;
      this.pilotPosition.add(motion.normalize().multiplyScalar(2.2 * dt));
    }
    this.pilotPosition.y = 1.7;
  }
  clearTrail() {} // Retained call compatibility; trails are intentionally absent in pilot flight.
  render(sim: Simulation, c: Controls, dt: number) {
    if (!this.visual) return;
    if (!this.studio && this.pilotDestination) {
      this.pilotPosition.lerp(this.pilotDestination, 1 - Math.exp(-dt * 10));
      if (
        this.pilotPosition.distanceToSquared(this.pilotDestination) < 0.0001
      ) {
        this.pilotPosition.copy(this.pilotDestination);
        this.pilotDestination = null;
      }
    }
    this.resizeIfNeeded();
    const s = sim.state,
      pos = this.studio ? new T.Vector3(0, 0, 0) : toWorld(s.position);
    this.visual.group.position.copy(pos);
    followAircraftShadow(
      this.sun,
      pos,
      this.studio ? studioSun : sceneries[this.scenery].sun,
      this.shadowRadius,
      this.studio ? this.studioFloorHeight : 0,
      this.studio ? 1 : 16,
    );
    this.visual.group.quaternion
      .copy(conversion)
      .multiply(
        this.studio ? new T.Quaternion() : new T.Quaternion(...s.orientation),
      );
    this.visual.cg.visible = this.showCG && this.studio;
    for (const v of this.visual.controls) {
      const index = sim.aircraft.surfaces.findIndex(
        (s) => s.id === v.surfaceId,
      );
      const deflection =
        (!this.studio && s.surfaceCommands?.[index] !== undefined
          ? s.surfaceCommands[index]
          : surfaceCommand(v.control, c)) * v.max;
      if (v.hingeAxis)
        v.pivot.quaternion.setFromAxisAngle(v.hingeAxis, deflection);
      else v.pivot.rotation.y = deflection;
    }
    const rotorPower = powertrain(
      sim.aircraft,
      s.motors,
      s.batterySoc,
      sim.environment.densityKgM3,
    );
    this.visual.propellers.forEach(
      (p, i) =>
        (p.rotation.x +=
          dt *
          (this.studio
            ? 0
            : Math.sqrt(
                rotorPower.thrust[i] / sim.aircraft.motors[i].maxThrustN,
              ) || 0) *
          260 *
          (sim.aircraft.vehicleType === "multirotor" &&
          sim.aircraft.motors[i].spin === "ccw"
            ? -1
            : 1)),
    );
    let desired: T.Vector3,
      target = this.studio ? this.modelCenter.clone() : pos.clone();
    if (this.mode === "ground") {
      desired = this.pilotPosition;
      this.camera.position.copy(desired);
      this.camera.fov = this.pilotFov;
      const direction = this.trackAircraft
        ? pos.clone().sub(desired).normalize()
        : this.heading.clone();
      this.heading
        .lerp(direction, this.snap ? 1 : 1 - Math.exp(-dt * 9))
        .normalize();
      const look = this.heading
        .clone()
        .applyAxisAngle(new T.Vector3(0, 1, 0), this.lookYaw);
      const right = new T.Vector3()
        .crossVectors(look, new T.Vector3(0, 1, 0))
        .normalize();
      look.applyAxisAngle(right, this.lookPitch);
      target = desired.clone().add(look);
      if (!this.dragging && this.trackAircraft) {
        this.lookYaw *= Math.exp(-dt * 3);
        this.lookPitch *= Math.exp(-dt * 3);
      }
    } else if (this.mode === "chase") {
      const forward = new T.Vector3(1, 0, 0).applyQuaternion(
        this.visual.group.quaternion,
      );
      forward.y = 0;
      if (forward.lengthSq() < 0.01) forward.copy(this.chaseForward);
      forward.normalize();
      this.chaseForward
        .lerp(forward, this.snap ? 1 : 1 - Math.exp(-dt * 3))
        .normalize();
      desired = pos
        .clone()
        .addScaledVector(this.chaseForward, -this.chaseDistance)
        .add(new T.Vector3(0, this.chaseDistance * 0.24, 0));
      desired.y = Math.max(0.45, desired.y);
      this.camera.position.lerp(desired, this.snap ? 1 : 1 - Math.exp(-dt * 6));
      target.addScaledVector(this.chaseForward, 0.6);
      this.camera.fov = 52;
    } else {
      const distance =
        this.span *
        2.1 *
        this.orbitZoom *
        Math.max(1, 0.85 / this.camera.aspect);
      desired = target
        .clone()
        .add(
          new T.Vector3(
            Math.cos(this.orbitYaw) * Math.cos(this.orbitPitch),
            Math.sin(this.orbitPitch),
            Math.sin(this.orbitYaw) * Math.cos(this.orbitPitch),
          ).multiplyScalar(distance),
        );
      this.camera.position.copy(desired);
      this.camera.fov = 42;
    }
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(target);
    this.camera.updateProjectionMatrix();
    let viewCamera: T.Camera = this.camera;
    if (this.studio && this.inspectionView !== "perspective") {
      fitInspectionCamera(
        this.drawingCamera,
        this.inspectionView,
        this.modelSize,
        this.modelCenter,
        this.camera.aspect,
        this.orbitZoom,
      );
      viewCamera = this.drawingCamera;
    }
    this.snap = false;
    this.forces.visible = this.showForces;
    sim.lastForces.surfaces.forEach((f, i) => {
      const arrow = this.arrows[i];
      if (!arrow) return;
      const v = new T.Vector3(...f.force).applyQuaternion(
        this.visual!.group.quaternion,
      );
      arrow.visible = v.length() > 0.02;
      arrow.position
        .set(...f.position)
        .sub(new T.Vector3(...this.cg))
        .applyQuaternion(this.visual!.group.quaternion)
        .add(pos);
      arrow.setDirection(v.clone().normalize());
      arrow.setLength(
        Math.max(0.01, Math.min(1, v.length() * 0.045)),
        0.035,
        0.02,
      );
      arrow.setColor(f.stalled ? 0xef6c53 : 0xf3bb68);
    });
    const wind = sim.environment.windMps;
    this.field.sock.rotation.y = -Math.atan2(wind[1] || 0.1, wind[0] || 0.5);
    this.field.sock.rotation.z = Math.max(
      -0.9,
      -0.6 + Math.hypot(...wind) * 0.12,
    );
    if (this.studio) {
      const inverseView = viewCamera.quaternion.clone().invert();
      [
        new T.Vector3(1, 0, 0),
        new T.Vector3(0, 1, 0),
        new T.Vector3(0, 0, 1),
      ].forEach((v, i) => {
        v.applyQuaternion(this.visual!.group.quaternion).applyQuaternion(
          inverseView,
        );
        const key = ["X", "Y", "Z"][i],
          x = 73 + v.x * 31,
          y = 43 - v.y * 31;
        const line = this.axisGuide.querySelector(`#axis-line-${key}`)!,
          label = this.axisGuide.querySelector(`#axis-text-${key}`)!;
        line.setAttribute("x2", String(x));
        line.setAttribute("y2", String(y));
        label.setAttribute("x", String(x + 4));
        label.setAttribute("y", String(y - 3));
      });
    }
    this.axisGuide.hidden = !this.studio;
    this.axisGuide.style.right = this.studio ? "14px" : "auto";
    this.axisGuide.style.left = this.studio ? "auto" : "14px";
    this.axisGuide.style.top = this.studio ? "58px" : "90px";
    if (!this.studio) this.field.update(this.camera);
    this.renderer.render(this.scene, viewCamera);
  }
  private resizeIfNeeded() {
    const size = this.renderer.getSize(new T.Vector2());
    if (
      size.x !== this.container.clientWidth ||
      size.y !== this.container.clientHeight
    )
      this.resize();
  }
  dispose() {
    this.observer.disconnect();
    this.disposeVisual();
    this.field.dispose();
    this.placementRing.geometry.dispose();
    this.placementRing.material.dispose();
    this.placementArrow.dispose();
    this.arrows.forEach((arrow) => arrow.dispose());
    this.sun.shadow.dispose();
    this.renderer.dispose();
  }
}
