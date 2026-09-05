import {
  cameraPlacement,
  type CameraPlacement,
} from "../core/camera-placement";
import type { Aircraft } from "../core/schema";
import type { FlightScene } from "../view/scene";
import type { CameraPlacementView } from "../view/camera-placement";
import { $, escape } from "./dom";
import "../view/fpv-placement.css";

/** A cancelable placement session; only Done writes into the aircraft draft. */
export class FpvPlacementDialog {
  private dialog = document.createElement("dialog");
  private pose!: CameraPlacement;
  private original!: CameraPlacement;
  private history: CameraPlacement[] = [];
  private view?: CameraPlacementView;
  private aircraft?: Aircraft;
  private previousParent?: HTMLElement;
  private returnFocus?: HTMLElement;
  private tool: "translate" | "rotate" | "pick" = "translate";
  constructor(
    private scene: FlightScene,
    private save: (pose: CameraPlacement) => void,
    private closed: () => void,
  ) {
    this.dialog.className = "fpv-placement-dialog";
    this.dialog.setAttribute("aria-labelledby", "camera-placement-title");
    this.dialog.addEventListener("cancel", (e) => {
      e.preventDefault();
      this.close(false);
    });
    document.body.append(this.dialog);
  }
  open(a: Aircraft) {
    if (this.dialog.open) return;
    this.aircraft = a;
    this.pose = cameraPlacement(a);
    this.original = structuredClone(this.pose);
    this.history = [];
    this.returnFocus = document.activeElement as HTMLElement;
    this.previousParent = $("viewport").parentElement!;
    this.dialog.innerHTML = `<header class="camera-placement-header"><div><h2 id="camera-placement-title">Place FPV camera</h2><span>${escape(a.name)}</span></div><div><button id="camera-placement-cancel">Cancel</button><button id="camera-placement-done" class="primary">Use placement</button></div></header>
      <div class="camera-placement-layout"><div class="camera-placement-stage" id="camera-placement-stage"><div class="camera-placement-tools" role="group" aria-label="Camera placement tool"><button data-camera-tool="translate" aria-pressed="true">Move</button><button data-camera-tool="rotate" aria-pressed="false">Rotate</button><button data-camera-tool="pick" aria-pressed="false">Pick surface</button></div><div class="camera-placement-views" role="group" aria-label="Camera placement inspection view"><button data-camera-view="perspective" aria-pressed="true">Perspective</button><button data-camera-view="top" aria-pressed="false">Top</button><button data-camera-view="side" aria-pressed="false">Side</button></div><p id="camera-placement-hint" class="camera-placement-hint" role="status"></p></div>
      <aside class="camera-placement-settings"><div class="camera-placement-section"><h3>Mount position</h3><p>Drag the arrows, or pick a spot on the airframe.</p><div class="camera-position-fields">${["Forward · X", "Right · Y", "Down · Z"].map((label, i) => `<label>${label}<div><input aria-label="Camera ${["X", "Y", "Z"][i]} position in millimeters" data-pose-position="${i}" type="number" step="0.1" min="-10000" max="10000"/><span>mm</span></div></label>`).join("")}</div><button id="camera-centerline">Center on airframe</button></div>
      <div class="camera-placement-section"><h3>Aim & lens</h3>${[
        ["tilt", "Tilt up", -90, 90],
        ["pan", "Pan right", -180, 180],
        ["roll", "Roll right", -180, 180],
        ["fov", "Vertical field of view", 40, 120],
      ]
        .map(
          ([key, label, min, max]) =>
            `<label class="camera-aim-field">${label}<output id="camera-${key}-value"></output><input id="camera-${key}" type="range" aria-label="Camera ${label}" min="${min}" max="${max}" step="1"/></label>`,
        )
        .join("")}<button id="camera-level">Face forward & level</button></div>
      <div class="camera-placement-options"><label><input id="camera-snap" type="checkbox"/> Snap · 5 mm / 5°</label><label><input id="camera-cone" type="checkbox" checked/> Show view cone</label></div><div class="camera-placement-history"><button id="camera-undo" disabled>Undo</button><button id="camera-reset">Reset placement</button></div><p class="camera-placement-note">The lens preview shows airframe obstructions. Surface picks leave a 2 mm gap; inspect the mount's fit. Changes stay in your aircraft draft until applied.</p><p id="camera-placement-error" role="alert" hidden></p></aside></div>`;
    $("camera-placement-stage").append($("viewport"));
    this.dialog.showModal();
    this.view = this.scene.beginCameraPlacement(a);
    this.view.onGesture = () => this.remember();
    this.view.onChange = (pose) => {
      this.pose = pose;
      this.sync();
    };
    this.view.onPick = (success) => {
      if (success) this.setTool("translate");
      else
        $("camera-placement-hint").textContent =
          "Pick the aircraft surface. Drag with the right mouse button to orbit.";
    };
    $("camera-placement-cancel").onclick = () => this.close(false);
    $("camera-placement-done").onclick = () => this.close(true);
    this.dialog
      .querySelectorAll<HTMLButtonElement>("[data-camera-tool]")
      .forEach(
        (b) =>
          (b.onclick = () =>
            this.setTool(b.dataset.cameraTool as typeof this.tool)),
      );
    this.dialog
      .querySelectorAll<HTMLButtonElement>("[data-camera-view]")
      .forEach(
        (b) =>
          (b.onclick = () => {
            this.scene.setInspectionView(
              b.dataset.cameraView as "perspective" | "top" | "side",
            );
          }),
      );
    this.dialog
      .querySelectorAll<HTMLInputElement>("[data-pose-position]")
      .forEach((field) => {
        let editing = false;
        field.onfocus = () => {
          editing = false;
        };
        field.oninput = () => {
          field.setCustomValidity("");
          $("camera-placement-error").hidden = true;
          const value = Number(field.value) / 1000;
          if (
            !field.value.trim() ||
            !field.checkValidity() ||
            !Number.isFinite(value)
          ) {
            field.setCustomValidity(
              "Enter a position between −10000 and 10000 mm.",
            );
            return;
          }
          if (!editing) {
            this.remember();
            editing = true;
          }
          this.pose.positionM[Number(field.dataset.posePosition)] = value;
          this.applyPreview();
        };
        field.onchange = () => {
          if (!field.checkValidity()) field.reportValidity();
        };
      });
    const axis = { tilt: 1, pan: 2, roll: 0 } as const;
    for (const key of ["tilt", "pan", "roll", "fov"] as const) {
      const field = $<HTMLInputElement>(`camera-${key}`);
      field.onpointerdown = () => this.remember();
      field.onkeydown = (e) => {
        if (!e.repeat) this.remember();
      };
      field.oninput = () => {
        if (key === "fov") this.pose.fovDeg = Number(field.value);
        else this.pose.orientationDeg[axis[key]] = Number(field.value);
        this.applyPreview();
      };
    }
    $("camera-centerline").onclick = () => {
      this.remember();
      this.pose.positionM[1] = 0;
      this.applyPreview();
    };
    $("camera-level").onclick = () => {
      this.remember();
      this.pose.orientationDeg = [0, 0, 0];
      this.applyPreview();
    };
    $("camera-undo").onclick = () => {
      const previous = this.history.pop();
      if (previous) {
        this.pose = previous;
        this.applyPreview();
      }
    };
    $("camera-reset").onclick = () => {
      this.remember();
      this.pose = structuredClone(this.original);
      this.applyPreview();
    };
    $("camera-snap").onchange = () =>
      this.view?.setSnap($<HTMLInputElement>("camera-snap").checked);
    $("camera-cone").onchange = () =>
      this.view?.setCone($<HTMLInputElement>("camera-cone").checked);
    this.setTool("translate");
    this.sync();
  }
  inspectionView(view: string) {
    this.dialog
      .querySelectorAll<HTMLButtonElement>("[data-camera-view]")
      .forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.cameraView === view)),
      );
  }
  private remember() {
    if (JSON.stringify(this.history.at(-1)) === JSON.stringify(this.pose))
      return;
    this.history.push(structuredClone(this.pose));
    if (this.history.length > 40) this.history.shift();
    this.sync();
  }
  private applyPreview() {
    this.view?.setPose(this.pose);
    this.sync();
  }
  private sync() {
    this.dialog
      .querySelectorAll<HTMLInputElement>("[data-pose-position]")
      .forEach((field) => {
        if (document.activeElement !== field) {
          field.value = String(
            Number(
              (
                this.pose.positionM[Number(field.dataset.posePosition)] * 1000
              ).toFixed(1),
            ),
          );
          field.setCustomValidity("");
        }
      });
    for (const [key, value] of [
      ["tilt", this.pose.orientationDeg[1]],
      ["pan", this.pose.orientationDeg[2]],
      ["roll", this.pose.orientationDeg[0]],
      ["fov", this.pose.fovDeg],
    ] as const) {
      $<HTMLInputElement>(`camera-${key}`).value = String(value);
      $(`camera-${key}-value`).textContent = `${value.toFixed(0)}°`;
    }
    $<HTMLButtonElement>("camera-undo").disabled = this.history.length === 0;
  }
  private setTool(tool: typeof this.tool) {
    this.tool = tool;
    if (tool === "pick") this.view?.setPick(true);
    else this.view?.setMode(tool);
    this.dialog
      .querySelectorAll<HTMLButtonElement>("[data-camera-tool]")
      .forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.cameraTool === tool)),
      );
    $("camera-placement-hint").textContent =
      tool === "pick"
        ? "Click a surface to mount here · Right-drag to orbit"
        : tool === "rotate"
          ? "Drag a ring to aim · Drag empty space to orbit"
          : "Drag arrows to move · X forward · Y right · Z down";
  }
  close(save: boolean) {
    if (!this.dialog.open) return;
    if (save) {
      const invalid =
        this.dialog.querySelector<HTMLInputElement>("input:invalid");
      if (invalid) {
        invalid.reportValidity();
        return;
      }
      try {
        this.save(structuredClone(this.pose));
      } catch (e) {
        $("camera-placement-error").hidden = false;
        $("camera-placement-error").textContent =
          e instanceof Error ? e.message : "Check the camera setup.";
        return;
      }
    }
    this.scene.endCameraPlacement();
    this.view = undefined;
    if (this.aircraft && !save) this.scene.setAircraft(this.aircraft);
    this.previousParent?.append($("viewport"));
    this.dialog.close();
    this.closed();
    this.returnFocus?.focus({ preventScroll: true });
    this.dialog.remove();
  }
}
