import catalogData from "../../components/catalog.json";
import {
  ComponentCatalogSchema,
  componentType,
  replaceComponent,
  moveComponent,
} from "../core/components";
import { massProperties } from "../core/aircraft";
import { componentDifferences } from "../core/component-reference";
import { surfaceActuation } from "../core/actuation";
import { type Aircraft } from "../core/schema";
import { $, escape } from "./dom";
import { installFpvCamera, removeFpvCamera } from "../core/fpv";

export const componentCatalog = ComponentCatalogSchema.parse(catalogData);
type Edit = (out: Aircraft, value: number) => void;
type Register = (id: string, edit: Edit) => void;
const numberField = (
  id: string,
  label: string,
  value: number,
  min: number,
  max: number,
  step = 1,
) =>
  `<label>${label}<input id="${id}" type="number" value="${Number(value.toFixed(4))}" min="${min}" max="${max}" step="${step}"/></label>`;

/** Compact component details share the editor's draft and validation transaction. */
export class ComponentWorkshop {
  private partId = "";
  private aircraftId = "";
  private category = "all";
  private browse = false;
  private candidate = "";
  private query = "";
  selectFpv() {
    this.category = "all";
    this.partId = this.getAircraft().fpv?.partId ?? "";
    this.browse = false;
    this.render();
    $(this.partId ? "component-detail" : "add-fpv-camera").scrollIntoView({
      block: "nearest",
    });
  }
  constructor(
    private getAircraft: () => Aircraft,
    private register: Register,
    private commitPending: () => void,
    private replace: (a: Aircraft) => void,
    private notify: (message: string) => void,
    private selected: (
      part: Aircraft["parts"][number] | undefined,
    ) => void = () => {},
    private placeCamera: () => void = () => {},
  ) {}
  private navigate(fn: () => void) {
    try {
      this.commitPending();
      fn();
      this.render();
    } catch (e) {
      this.notify(
        e instanceof Error ? e.message : "Correct the highlighted value first.",
      );
    }
  }
  render() {
    const host = $("component-workshop");
    const focused = document.activeElement as HTMLElement | null;
    const restoreScroll =
      typeof window !== "undefined" && host.contains?.(focused);
    const scrollY = restoreScroll ? window.scrollY : 0;
    const focusId = restoreScroll ? focused?.id : undefined;
    const listScroll =
      host.querySelector<HTMLElement>(".workshop-parts")?.scrollTop ?? 0;
    const openDetails = [
      ...host.querySelectorAll<HTMLDetailsElement>("details[open]"),
    ].map((d) => d.id);
    const restoreView = () => {
      const list = host.querySelector<HTMLElement>(".workshop-parts");
      if (list) list.scrollTop = listScroll;
      for (const id of openDetails) {
        const detail = $<HTMLDetailsElement>(id);
        if (detail) detail.open = true;
      }
      if (restoreScroll) {
        if (focusId) $(focusId)?.focus({ preventScroll: true });
        window.scrollTo({ top: scrollY, behavior: "instant" });
      }
    };
    const a = this.getAircraft();
    const typeOf = (p: Aircraft["parts"][number]) =>
      a.motors.some((m) => m.propPartId === p.id)
        ? "propeller"
        : componentType(p);
    if (this.aircraftId !== a.id) {
      this.aircraftId = a.id;
      this.partId = a.battery?.partId ?? a.parts[0].id;
      this.category = "all";
      this.browse = false;
      this.candidate = "";
    }
    const visible = a.parts.filter(
      (p) =>
        this.category === "all" ||
        typeOf(p) === this.category ||
        (this.category === "structure" &&
          ["body", "wing", "boom", "tail"].includes(p.kind)),
    );
    let part = visible.find((p) => p.id === this.partId) ?? visible[0];
    if (part) this.partId = part.id;
    this.selected(part);
    const total = massProperties(a);
    $("component-workshop").innerHTML =
      `<div class="workshop-heading"><div><h2>Components</h2><span>${a.parts.length} parts · ${(total.mass * 1000).toFixed(0)} g assembled</span></div><span class="small muted">Changes apply with the aircraft</span></div><div class="workshop-layout"><div class="workshop-inventory"><label class="sr-only" for="component-filter">Component type</label><select id="component-filter">${[
        ["all", "All components"],
        ["battery", "Batteries"],
        ["servo", "Servos"],
        ["motor", "Motors"],
        ["propeller", "Propellers"],
        ["equipment", "Electronics & hardware"],
        ["structure", "Structure"],
      ]
        .map(
          ([v, l]) =>
            `<option value="${v}" ${this.category === v ? "selected" : ""}>${l}</option>`,
        )
        .join(
          "",
        )}</select><label class="compact-part-picker">Installed part<select id="component-picker">${visible.map((p) => `<option value="${escape(p.id)}" ${p.id === part?.id ? "selected" : ""}>${escape(p.id.replaceAll("-", " "))} · ${(p.massKg * 1000).toFixed(1)} g</option>`).join("")}</select></label><div class="workshop-parts" role="group" aria-label="Installed components">${visible.map((p) => `<button data-component-id="${escape(p.id)}" aria-pressed="${p.id === part?.id}" class="${p.id === part?.id ? "active" : ""}"><span><b>${escape(p.id.replaceAll("-", " "))}</b><small>${escape(p.model ?? p.material?.name ?? p.kind)}</small></span><strong>${(p.massKg * 1000).toFixed(1)}<small>g</small></strong></button>`).join("") || '<p class="muted">No components of this type.</p>'}</div></div><div id="component-detail" class="component-detail"></div></div>`;
    const cameraBar = document.createElement("div");
    cameraBar.className = "fpv-install-bar";
    const mounted = a.parts.find((p) => p.id === a.fpv?.partId);
    cameraBar.innerHTML = mounted
      ? `<div><strong>FPV camera mounted</strong><small>${(mounted.massKg * 1000).toFixed(1)} g · ${a.fpv!.fovDeg}° vertical view</small></div><button id="edit-fpv-camera">Adjust camera</button>`
      : '<div><strong>Onboard FPV camera</strong><small>Mount a camera to fly from the aircraft.</small></div><button id="add-fpv-camera">Add FPV camera</button>';
    host.querySelector(".workshop-heading")!.after(cameraBar);
    if (mounted)
      $("edit-fpv-camera").onclick = () => {
        this.navigate(() => {
          this.category = "all";
          this.partId = mounted.id;
        });
        this.placeCamera();
      };
    else
      $("add-fpv-camera").onclick = () => {
        this.navigate(() => {
          const next = installFpvCamera(this.getAircraft());
          this.category = "all";
          this.partId = next.fpv!.partId;
          this.replace(next);
          this.notify(
            "Camera added to draft. Adjust its mount, then Apply & fly.",
          );
        });
        if (this.getAircraft().fpv) this.placeCamera();
      };
    $("component-filter").onchange = () =>
      this.navigate(() => {
        this.category = $<HTMLSelectElement>("component-filter").value;
        this.candidate = "";
        this.browse = false;
      });
    $("component-picker").onchange = () =>
      this.navigate(() => {
        this.partId = $<HTMLSelectElement>("component-picker").value;
        this.candidate = "";
        this.browse = false;
      });
    $("component-workshop")
      .querySelectorAll<HTMLButtonElement>("[data-component-id]")
      .forEach(
        (b) =>
          (b.onclick = () =>
            this.navigate(() => {
              this.partId = b.dataset.componentId!;
              this.candidate = "";
              this.browse = false;
            })),
      );
    if (!part) {
      restoreView();
      return;
    }
    const partIndex = a.parts.indexOf(part);
    const type = typeOf(part);
    const propMotor = a.motors.find((m) => m.propPartId === part.id);
    const choices = componentCatalog.entries.filter(
      (e) => e.type === type && a.fpv?.partId !== part.id,
    );
    const linked = a.surfaces
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => s.control?.linkage?.servoPartId === part.id);
    const b = a.battery?.partId === part.id ? a.battery : undefined;
    const fpv = a.fpv?.partId === part.id ? a.fpv : undefined;
    const motorIndex = a.motors.findIndex((m) => m.partId === part.id);
    const motor = a.motors[motorIndex];
    const reference = componentCatalog.entries.find(
      (e) => e.id === part.catalogId,
    );
    const differences = reference
      ? componentDifferences(a, part.id, reference)
      : [];
    const id = (key: string) => `part-detail-${partIndex}-${key}`;
    const f = (
      key: string,
      label: string,
      value: number,
      min: number,
      max: number,
      step = 1,
    ) => numberField(id(key), label, value, min, max, step);
    const candidate = componentCatalog.entries.find(
      (e) => e.id === this.candidate && e.type === type,
    );
    let next: Aircraft | undefined,
      error = "";
    if (candidate)
      try {
        next = replaceComponent(a, part.id, candidate);
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
      }
    const delta = next ? massProperties(next) : undefined;
    $("component-detail").innerHTML =
      `<div class="component-detail-heading"><div><span class="eyebrow">${escape(type)}</span><h3>${escape(part.model ?? part.id.replaceAll("-", " "))}</h3></div>${propMotor?.partId ? '<button id="paired-motor">Motor / prop package</button>' : choices.length ? '<button id="browse-components" aria-expanded="' + this.browse + '">' + (this.browse ? "Close catalog" : "Replace component…") + "</button>" : ""}</div>
    ${
      this.browse
        ? `<div class="parts-catalog"><label for="parts-search">Find a replacement</label><input type="search" id="parts-search" placeholder="Name or manufacturer" value="${escape(this.query)}"/><div id="parts-matches">${
            choices
              .filter((e) =>
                `${e.name} ${e.description}`
                  .toLowerCase()
                  .includes(this.query.toLowerCase()),
              )
              .map(
                (e) =>
                  `<button class="part-choice" data-part-choice="${e.id}" aria-pressed="${candidate?.id === e.id}"><b>${escape(e.name)}</b><small>${escape(e.description)}</small></button>`,
              )
              .join("") || '<p class="muted">No matching parts.</p>'
          }</div>${
            candidate
              ? `<div class="part-replacement"><h4>${escape(candidate.name)}</h4>${
                  delta
                    ? `<div class="component-effects"><span>Aircraft mass<strong>${(total.mass * 1000).toFixed(0)} → ${(delta.mass * 1000).toFixed(0)} g</strong></span><span>CG movement<strong>${
                        delta.cg
                          .map((v, i) => {
                            const mm = (v - total.cg[i]) * 1000;
                            return Math.abs(mm) < 0.05
                              ? ""
                              : `${Math.abs(mm).toFixed(1)} mm ${
                                  [
                                    ["aft", "forward"],
                                    ["left", "right"],
                                    ["up", "down"],
                                  ][i][mm > 0 ? 1 : 0]
                                }`;
                          })
                          .filter(Boolean)
                          .join(" · ") || "Unchanged"
                      }</strong></span></div>`
                    : ""
                }${candidate.type === "motor" && motor ? `<div class="component-effects"><span>Propeller diameter<strong>${(motor.propDiameterM * 1000).toFixed(0)} → ${(candidate.motor.propDiameterM * 1000).toFixed(0)} mm</strong></span><span>Curve voltage<strong>${candidate.motor.performance!.referenceVoltage.toFixed(1)} V</strong></span></div>${candidate.motor.propDiameterM > motor.propDiameterM + 0.001 ? '<p class="component-note">Larger propeller: inspect blade clearance and the mount before flight. Physical fit is not guaranteed.</p>' : ""}` : ""}<details id="part-evidence-${candidate.id}" class="component-evidence"><summary>Specifications & model assumptions</summary><p class="small muted">${escape(candidate.evidence)}</p><div class="component-sources">${candidate.sources.map((s) => (/^https?:/.test(s.url) ? `<a href="${escape(s.url)}" target="_blank" rel="noopener noreferrer">${escape(s.title)} ↗</a>` : "")).join("")}</div></details>${error ? `<p class="editor-error">${escape(error)}</p>` : '<button id="confirm-component" class="primary">Use this component</button>'}</div>`
              : '<p class="small muted">Select a part to review its effect before replacing.</p>'
          }</div>`
        : ""
    }
    <div class="component-installed" ${this.browse ? "hidden" : ""}><div class="component-fields">${f("mass", "Mass · g", part.massKg * 1000, 0.1, 100000, 0.1)}${b ? f("capacity", "Capacity · mAh", b.capacityMah, 1, 100000, 50) + f("cells", "Cells · S", b.cells, 1, 24) + f("charge", "Starting charge · %", b.initialSoc * 100, 0, 100) + f("resistance", "Pack resistance · mΩ", b.resistanceOhm * 1000, 0, 10000, 1) : ""}${part.servo ? f("speed", "Speed · s / 60°", part.servo.speedSecondsPer60Deg, 0.001, 5, 0.01) + f("range", "Rated total travel · °", part.servo.travelDeg, 1, 270) : ""}${motor ? f("thrust", "Static thrust · N", motor.maxThrustN, 0.01, 1000, 0.1) + f("lag", "Motor response · s", motor.responseSeconds, 0.001, 5, 0.01) : ""}</div>
    ${reference ? `<div class="component-reference ${differences.length ? "modified" : ""}"><strong>${differences.length ? "Modified setup" : "Catalog setup"}</strong><span>${differences.length ? `Changed: ${escape(differences.join(" · "))}` : "Specifications match the catalog model."}</span></div><details id="installed-reference-${partIndex}" class="component-evidence"><summary>Catalog source & assumptions</summary><p class="small muted">${escape(reference.evidence)}</p><div class="component-sources">${reference.sources.map((s) => (/^https?:/.test(s.url) ? `<a href="${escape(s.url)}" target="_blank" rel="noopener noreferrer">${escape(s.title)} ↗</a>` : "")).join("")}</div></details>` : ""}
    ${part.kind === "battery" && !b ? `<p class="component-note">This saved design has no electrical model. Restore the original aircraft to use its latest battery setup, or add battery and motor-current data in the JSON.</p>` : ""}
    ${b ? `<div class="component-effects"><span>Nominal energy<strong>${((b.capacityMah * b.cells * 3.7) / 1000).toFixed(1)} Wh</strong></span><span>Voltage model<strong>${b.cells}S · ${(b.cells * 3.7).toFixed(1)} V nominal</strong></span></div><p class="small muted">Capacity sets stored charge. Mass sets weight, CG and inertia. Resistance causes voltage sag under load.</p>${a.motors.some((m) => m.performance && Math.abs(m.performance.referenceVoltage - b.cells * 3.7) > 1) ? '<p class="component-note">Motor curves use a different reference voltage. Output is extrapolated; supply matching bench data for this pack.</p>' : ""}` : ""}
    ${
      part.servo
        ? `<p class="small muted">Rated at ${part.servo.ratedVoltage} V · no-load speed. Horn ratio changes surface travel and speed.</p>${
            linked
              .map(({ s, i }) => {
                const l = s.control!.linkage!,
                  act = surfaceActuation(a, s);
                return `<fieldset class="linkage-fields"><legend>${escape(s.id.replaceAll("-", " "))} · ±${act.maxDeg.toFixed(1)}° effective</legend><div class="component-fields">${numberField(`link-${i}-travel`, "Servo command · ±°", l.servoTravelDeg, 0.1, 135, 0.5)}${numberField(`link-${i}-servo-arm`, "Servo horn · mm", l.servoArmM * 1000, 0.1, 200, 0.5)}${numberField(`link-${i}-surface-arm`, "Surface horn · mm", l.surfaceArmM * 1000, 0.1, 200, 0.5)}${numberField(`link-${i}-limit`, "Surface limit · ±°", s.control!.maxDeg, 0, 45, 0.5)}</div><small class="muted">${act.rateLimitDegS.toFixed(0)}°/s surface rate · ${((act.maxDeg / act.rateLimitDegS) * 1000).toFixed(0)} ms center-to-end, before configured lag</small></fieldset>`;
              })
              .join("") ||
            '<p class="component-note">No control surface is linked to this servo yet.</p>'
          }`
        : ""
    }
    ${propMotor ? '<p class="small muted">Mass and installation are editable here. Replace the motor/prop package together to keep the performance curve paired.</p>' : ""}
    ${motor?.propPartId ? '<button id="paired-propeller" class="component-link">Inspect paired propeller →</button>' : ""}
    ${motor ? `<p class="small muted">${escape(motor.propeller ?? "Configured propeller")} · ${(motor.propDiameterM * 1000).toFixed(0)} mm · ${motor.performance ? motor.performance.referenceVoltage.toFixed(1) + " V curve" : "No current curve"}. Editing thrust scales the existing force curve; it does not invent measured current data.</p>` : ""}
    <details id="part-installation-${partIndex}" class="component-position"><summary>Installation position & dimensions</summary><p class="small muted">Body axes: X forward · Y right · Z down. Millimeters from the aircraft datum.</p><div class="component-fields component-axis-fields">${part.positionM.map((v, i) => f(`pos-${i}`, `${["X", "Y", "Z"][i]} position · mm`, v * 1000, -10000, 10000, 0.5)).join("")}</div><div class="component-fields component-axis-fields">${part.sizeM.map((v, i) => f(`size-${i}`, `${["Length X", "Width Y", "Height Z"][i]} · mm`, v * 1000, 0.1, 10000, 0.5)).join("")}</div>${part.kind === "battery" || part.servo || fpv ? `<div class="component-fields component-axis-fields">${(part.orientationDeg ?? [0, 0, 0]).map((v, i) => f(`angle-${i}`, `Installation ${["roll", "pitch", "yaw"][i]} · °`, v, -180, 180, 1)).join("")}</div>` : ""}</details>
    ${part.catalogId && !reference ? `<small class="muted">External catalog reference: ${escape(part.catalogId)}. Specifications are stored in this aircraft; this catalog is not installed.</small>` : ""}</div>`;
    const bind = (key: string, edit: Edit) => this.register(id(key), edit);
    if (fpv) {
      const cameraControls = document.createElement("div");
      cameraControls.className = "fpv-mount-fields";
      cameraControls.innerHTML = `<div class="response-title"><strong>Camera view</strong><button id="remove-fpv-camera">Remove camera</button></div><button id="place-fpv-camera" class="primary fpv-place-action">Place camera in 3D ↗</button><div class="component-fields">${f("fpv-fov", "Vertical field of view · °", fpv.fovDeg, 40, 120)}${f("fpv-tilt", "Camera tilt up · °", part.orientationDeg?.[1] ?? 0, -90, 90)}</div><p class="small muted">Place and aim on the model with a live lens preview. Precise dimensions remain available below.</p>`;
      $("component-detail")
        .querySelector(".component-detail-heading")!
        .after(cameraControls);
      bind("fpv-fov", (out, v) => (out.fpv!.fovDeg = v));
      $("place-fpv-camera").onclick = () => this.placeCamera();
      bind("fpv-tilt", (out, v) => {
        out.parts[partIndex].orientationDeg ??= [0, 0, 0];
        out.parts[partIndex].orientationDeg[1] = v;
      });
      $("remove-fpv-camera").onclick = () =>
        this.navigate(() => this.replace(removeFpvCamera(this.getAircraft())));
    }
    bind("mass", (out, v) => {
      const p = out.parts[partIndex];
      if (p.inertiaDiagonalKgM2)
        p.inertiaDiagonalKgM2 = p.inertiaDiagonalKgM2.map(
          (n) => (n * v) / 1000 / p.massKg,
        ) as [number, number, number];
      p.massKg = v / 1000;
    });
    for (let j = 0; j < 3; j++) {
      bind(`pos-${j}`, (out, v) => {
        moveComponent(out, out.parts[partIndex].id, j, v / 1000);
      });
      bind(`size-${j}`, (out, v) => {
        out.parts[partIndex].sizeM[j] = v / 1000;
        delete out.parts[partIndex].inertiaDiagonalKgM2;
      });
      if (part.kind === "battery" || part.servo || fpv)
        bind(`angle-${j}`, (out, v) => {
          const p = out.parts[partIndex];
          p.orientationDeg ??= [0, 0, 0];
          p.orientationDeg[j] = v;
        });
    }
    if (b) {
      bind("capacity", (out, v) => {
        out.battery!.capacityMah = v;
      });
      bind("cells", (out, v) => {
        out.battery!.cells = v;
      });
      bind("charge", (out, v) => {
        out.battery!.initialSoc = v / 100;
      });
      bind("resistance", (out, v) => {
        out.battery!.resistanceOhm = v / 1000;
      });
    }
    if (part.servo) {
      bind("speed", (out, v) => {
        out.parts[partIndex].servo!.speedSecondsPer60Deg = v;
      });
      bind("range", (out, v) => {
        out.parts[partIndex].servo!.travelDeg = v;
      });
      for (const { i } of linked) {
        this.register(`link-${i}-travel`, (out, v) => {
          out.surfaces[i].control!.linkage!.servoTravelDeg = v;
        });
        this.register(`link-${i}-servo-arm`, (out, v) => {
          out.surfaces[i].control!.linkage!.servoArmM = v / 1000;
        });
        this.register(`link-${i}-surface-arm`, (out, v) => {
          out.surfaces[i].control!.linkage!.surfaceArmM = v / 1000;
        });
        this.register(`link-${i}-limit`, (out, v) => {
          out.surfaces[i].control!.maxDeg = v;
        });
      }
    }
    if (motor) {
      bind("thrust", (out, v) => {
        const m = out.motors[motorIndex];
        m.performance?.points.forEach((p) => (p.thrustN *= v / m.maxThrustN));
        m.maxThrustN = v;
      });
      bind("lag", (out, v) => {
        out.motors[motorIndex].responseSeconds = v;
      });
    }
    const inspectPair = (partId: string) =>
      this.navigate(() => {
        this.category = "all";
        this.partId = partId;
        this.browse = false;
        this.candidate = "";
      });
    if (propMotor?.partId)
      $("paired-motor").onclick = () => inspectPair(propMotor.partId!);
    if (motor?.propPartId)
      $("paired-propeller").onclick = () => inspectPair(motor.propPartId!);
    if (choices.length)
      $("browse-components").onclick = () =>
        this.navigate(() => {
          this.browse = !this.browse;
          this.query = "";
        });
    if (this.browse) {
      $("parts-search").oninput = () => {
        this.query = $<HTMLInputElement>("parts-search").value;
        const selection = this.query.length;
        this.render();
        const field = $<HTMLInputElement>("parts-search");
        field.focus();
        field.setSelectionRange(selection, selection);
      };
      $("parts-matches")
        .querySelectorAll<HTMLButtonElement>("[data-part-choice]")
        .forEach(
          (button) =>
            (button.onclick = () =>
              this.navigate(() => {
                this.candidate = button.dataset.partChoice!;
              })),
        );
      if (candidate && next)
        $("confirm-component").onclick = () =>
          this.navigate(() => {
            const replacement = replaceComponent(
              this.getAircraft(),
              this.partId,
              candidate,
            );
            this.browse = false;
            this.candidate = "";
            this.replace(replacement);
            this.notify(`${candidate.name} added to draft. Apply when ready.`);
          });
    }
    restoreView();
  }
}
