import type { Aircraft } from "../core/schema";
import type { Vec3 } from "../core/math";
import { massProperties } from "../core/aircraft";
import { moveComponent } from "../core/components";
import { findTrim } from "../core/trim";
import type { FlightScene } from "../view/scene";
import type { ComponentPlacementView } from "../view/component-placement";
import { $, escape } from "./dom";
import "../view/fpv-placement.css";

export class ComponentPlacementDialog {
  private dialog = document.createElement("dialog");
  private view?: ComponentPlacementView;
  private previousParent?: HTMLElement;
  private focus?: HTMLElement;
  private working?: Aircraft;
  private partId = "";
  private original!: Vec3;
  constructor(
    private scene: FlightScene,
    private save: (id: string, p: Vec3) => void,
    private closed: () => void,
  ) {
    this.dialog.className = "fpv-placement-dialog component-placement-dialog";
    this.dialog.setAttribute("aria-labelledby", "component-placement-title");
    this.dialog.addEventListener("cancel", (e) => {
      e.preventDefault();
      this.close(false);
    });
  }
  open(a: Aircraft, id: string) {
    const part = a.parts.find((p) => p.id === id)!;
    this.partId = id;
    this.working = structuredClone(a);
    this.original = [...part.positionM];
    this.focus = document.activeElement as HTMLElement;
    this.previousParent = $("viewport").parentElement!;
    this.dialog.innerHTML = `<header class="camera-placement-header"><div><h2 id="component-placement-title">Place component</h2><span>${escape(id.replaceAll("-", " "))} · ${(part.massKg * 1000).toFixed(1)} g</span></div><div><button id="component-placement-cancel">Cancel</button><button id="component-placement-done" class="primary">Use placement</button></div></header><div class="camera-placement-layout"><div class="camera-placement-stage" id="component-placement-stage"><div class="camera-placement-tools" aria-label="Component inspection view">${["Perspective", "Top", "Side"].map((name) => `<button data-component-view="${name.toLowerCase()}" aria-pressed="${name === "Perspective"}">${name}</button>`).join("")}</div><p class="camera-placement-hint">Drag an axis to move · Drag empty space to orbit · Gold marker is the CG</p></div><aside class="camera-placement-settings"><div class="camera-placement-section"><h3>Installation position</h3><div class="camera-position-fields">${["X · Forward", "Y · Right", "Z · Down"].map((label, i) => `<label>${label}<div><input data-component-position="${i}" aria-label="Component ${["X", "Y", "Z"][i]} position in millimeters" type="number" min="-10000" max="10000" step="1" value="${(part.positionM[i] * 1000).toFixed(1)}" required/><span>mm</span></div></label>`).join("")}</div><label class="check-label"><input id="component-xray" type="checkbox" checked/> See through airframe</label><button id="component-centerline">Center laterally</button><button id="component-placement-reset">Restore position</button></div><div class="camera-placement-section"><h3>Live balance</h3><div id="component-live-balance" class="component-balance-output" role="status"></div><p>Mass and inertia update from the component ledger. Check installation clearance; there is no collision constraint.</p></div>${a.vtol ? '<div class="camera-placement-section"><h3>Hover load balance</h3><button id="component-check-hover">Check motor headroom</button><p id="component-hover-result" role="status">Check after moving heavy parts.</p></div>' : ""}<p id="component-placement-error" class="camera-placement-note" role="alert"></p></aside></div>`;
    document.body.append(this.dialog);
    this.dialog.showModal();
    $("component-placement-stage").append($("viewport"));
    this.view = this.scene.beginComponentPlacement(a, id);
    this.view.onChange = (p) => this.update(p);
    this.view.setTransparentAirframe(true);
    $("component-xray").onchange = () =>
      this.view?.setTransparentAirframe(
        $<HTMLInputElement>("component-xray").checked,
      );
    this.dialog
      .querySelectorAll<HTMLButtonElement>("[data-component-view]")
      .forEach(
        (b) =>
          (b.onclick = () => {
            this.scene.setInspectionView(
              b.dataset.componentView as "perspective" | "top" | "side",
            );
            this.dialog
              .querySelectorAll("[data-component-view]")
              .forEach((el) =>
                el.setAttribute("aria-pressed", String(el === b)),
              );
          }),
      );
    this.dialog
      .querySelectorAll<HTMLInputElement>("[data-component-position]")
      .forEach(
        (field) =>
          (field.oninput = () => {
            if (!field.checkValidity() || !field.value.trim()) return;
            const p = this.view!.position;
            p[Number(field.dataset.componentPosition)] =
              field.valueAsNumber / 1000;
            this.view!.setPosition(p);
            this.update(p, field);
          }),
      );
    $("component-centerline").onclick = () => {
      const p = this.view!.position;
      p[1] = 0;
      this.view!.setPosition(p);
      this.update(p);
    };
    $("component-placement-reset").onclick = () => {
      this.view!.setPosition(this.original);
      this.update(this.original);
    };
    $("component-placement-cancel").onclick = () => this.close(false);
    $("component-placement-done").onclick = () => this.close(true);
    if (a.vtol)
      $("component-check-hover").onclick = () => {
        const trim = findTrim(this.working!);
        $("component-hover-result").textContent = trim.converged
          ? this.working!.motors.map(
              (m, i) =>
                `${m.id.replace("motor-", "")}: ${(trim.state.motors[i] * 100).toFixed(0)}% command`,
            ).join(" · ") +
            " at initial battery charge. Lower leaves more control headroom."
          : "No hover equilibrium found. Move the CG within the rotor support area or revise available thrust.";
      };
    this.update(this.original);
  }
  private update(p: Vec3, editing?: HTMLInputElement) {
    p.forEach((v, i) => moveComponent(this.working!, this.partId, i, v));
    this.dialog
      .querySelectorAll<HTMLInputElement>("[data-component-position]")
      .forEach((field) => {
        if (field !== editing)
          field.value = (
            p[Number(field.dataset.componentPosition)] * 1000
          ).toFixed(1);
      });
    const props = massProperties(this.working!),
      aft = (this.working!.reference.leadingEdgeXM - props.cg[0]) * 1000;
    $("component-live-balance").innerHTML =
      `<strong>${(this.working!.vehicleType === "multirotor" ? props.cg[0] * 1000 : aft).toFixed(1)} <small>${this.working!.vehicleType === "multirotor" ? "mm forward of aircraft datum" : "mm aft of wing LE"}</small></strong><span>${(props.mass * 1000).toFixed(0)} g total · Y ${(props.cg[1] * 1000).toFixed(1)} mm · Z ${(props.cg[2] * 1000).toFixed(1)} mm</span>`;
    if (this.working!.vtol)
      $("component-hover-result").textContent =
        "Placement changed. Recheck motor headroom.";
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
        this.save(this.partId, this.view!.position);
      } catch (e) {
        $("component-placement-error").textContent =
          e instanceof Error ? e.message : "Check the installation.";
        return;
      }
    }
    this.scene.endComponentPlacement();
    this.view = undefined;
    this.previousParent?.append($("viewport"));
    this.dialog.close();
    this.dialog.remove();
    this.closed();
    this.focus?.focus({ preventScroll: true });
  }
}
