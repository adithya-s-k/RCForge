import { powertrain } from "../core/powertrain";
import { findTrim } from "../core/trim";
import { $, escape } from "./dom";
import {
  massProperties,
  modifyAircraft,
  defaultChanges,
} from "../core/aircraft";
import { setTotalMass, setLongitudinalCG } from "../core/editor";
import { parseAircraft, type Aircraft } from "../core/schema";
import { ZodError } from "zod";
import { SurfaceMixer } from "./surface-mixer";
import { ComponentWorkshop } from "./component-workshop";
import { moveComponent } from "../core/components";
function numericValue(field: HTMLInputElement) {
  const value = Number(field.value);
  if (!field.value.trim() || !Number.isFinite(value))
    throw new Error("Enter a number.");
  if (field.min !== "" && value < Number(field.min))
    throw new Error(`Minimum ${field.min}.`);
  if (field.max !== "" && value > Number(field.max))
    throw new Error(`Maximum ${field.max}.`);
  return value;
}
export class AircraftEditor {
  draft: Aircraft;
  private workshop: ComponentWorkshop;
  private mixer: SurfaceMixer;
  private pending = new Map<string, string>();
  private editError: unknown = null;
  private errors = new Map<string, string>();
  private selectionInitialized = false;
  private drafts = new Map<
    string,
    {
      draft: Aircraft;
      pending: Map<string, string>;
      errors: Map<string, string>;
    }
  >();
  get hasPending() {
    return this.pending.size > 0;
  }
  private track(id: string, value: string) {
    this.pending.set(id, value);
    this.errors.delete(id);
    $<HTMLInputElement>(id).setCustomValidity("");
    $(id).removeAttribute("aria-invalid");
    this.renderPending();
    $("editor-state").textContent = "Unapplied changes";
    $("editor-state").classList.add("pending");
  }
  private fail(id: string, value: string, error: unknown) {
    this.editError = error;
    this.pending.set(id, value);
    this.errors.set(
      id,
      error instanceof ZodError
        ? error.issues[0].message
        : error instanceof Error
          ? error.message
          : String(error),
    );
    this.update();
    this.changed(this.draft);
  }
  private renderPending() {
    document
      .querySelectorAll<HTMLInputElement>(".editor-page [aria-invalid]")
      .forEach((field) => {
        field.removeAttribute("aria-invalid");
        field.setCustomValidity("");
      });
    for (const [id, value] of this.pending) {
      const field = $<HTMLInputElement>(id);
      if (field) field.value = value;
    }
    const messages: string[] = [];
    for (const [id, error] of this.errors) {
      const field = $<HTMLInputElement>(id);
      if (!field) continue;
      field.setAttribute("aria-invalid", "true");
      field.setCustomValidity(error);
      messages.push(
        `${field.labels?.[0]?.textContent || field.getAttribute("aria-label") || id}: ${error}`,
      );
    }
    $("editor-error").hidden = !messages.length;
    $("editor-error").textContent = messages.join(" ");
  }
  commitPending() {
    const entries = [...this.pending];
    for (const [id, value] of entries) {
      $<HTMLInputElement>(id).value = value;
      this.editError = null;
      $(id).dispatchEvent(new Event("change"));
      if (this.editError) throw this.editError;
    }
  }
  private registerNumber(
    id: string,
    edit: (out: Aircraft, value: number) => void,
  ) {
    const field = $<HTMLInputElement>(id);
    field.oninput = () => this.track(id, field.value);
    field.onchange = () => {
      const raw = field.value;
      try {
        const out = structuredClone(this.draft);
        edit(out, numericValue(field));
        out.provenance.componentEdits = {
          status: "estimated",
          note: "User-edited component specifications. Mass, CG, inertia, battery and actuation recomputed. Edited values are not manufacturer measurements.",
        };
        this.draft = parseAircraft(out);
        this.pending.delete(id);
        this.errors.delete(id);
        this.update();
        this.changed(this.draft);
      } catch (e) {
        this.fail(id, raw, e);
      }
    };
  }
  constructor(
    a: Aircraft,
    private changed: (a: Aircraft) => void,
    private notify: (s: string) => void,
    selected: (part: Aircraft["parts"][number] | undefined) => void = () => {},
  ) {
    this.draft = structuredClone(a);
    this.workshop = new ComponentWorkshop(
      () => this.draft,
      (id, edit) => this.registerNumber(id, edit),
      () => this.commitPending(),
      (out) => {
        this.draft = out;
        this.update();
        this.changed(out);
      },
      this.notify,
      selected,
    );
    this.mixer = new SurfaceMixer(
      () => this.draft,
      (id, edit) => this.registerNumber(id, edit),
      () => this.commitPending(),
      (out) => {
        this.draft = parseAircraft(out);
        this.update();
        this.changed(this.draft);
      },
      this.notify,
    );
    const action = (id: string, fn: (value: number) => Aircraft) => {
      $(id).oninput = () => this.track(id, $<HTMLInputElement>(id).value);
      $(id).onchange = () => {
        const raw = $<HTMLInputElement>(id).value;
        try {
          const value = numericValue($<HTMLInputElement>(id));
          this.draft = parseAircraft(fn(value));
          this.pending.delete(id);
          this.errors.delete(id);
          $<HTMLInputElement>(id).setCustomValidity("");
          $(id).removeAttribute("aria-invalid");
          this.draft.provenance.editor = {
            status: "calculated",
            note: "User-edited component masses and geometry. Mass, CG and inertia recomputed; aerodynamic coefficients remain estimates.",
          };
          this.update();
          changed(this.draft);
        } catch (e) {
          this.fail(id, raw, e);
        }
      };
    };
    action("edit-mass", (value) => setTotalMass(this.draft, value / 1000));
    action("edit-cg", (value) => setLongitudinalCG(this.draft, value / 1000));
    action("edit-span", (value) =>
      modifyAircraft(this.draft, {
        ...defaultChanges,
        spanScale: value / 1000 / this.draft.reference.spanM,
      }),
    );
    action("edit-throws", (value) => {
      const a = structuredClone(this.draft);
      a.surfaces.forEach((s) => {
        if (s.control) s.control.maxDeg = value;
      });
      return a;
    });
    action("edit-thrust", (value) => {
      const a = structuredClone(this.draft);
      a.motors.forEach((m) => {
        m.performance?.points.forEach(
          (p) => (p.thrustN *= value / m.maxThrustN),
        );
        m.maxThrustN = value;
      });
      return a;
    });
    this.update();
  }
  set(a: Aircraft) {
    this.selectionInitialized = true;
    this.pending.clear();
    this.errors.clear();
    this.drafts.delete(a.id);
    this.draft = structuredClone(a);
    this.update();
    this.changed(this.draft);
  }
  /** Aircraft selection retains each unfinished draft, including raw invalid fields. */
  switchTo(a: Aircraft) {
    if (this.selectionInitialized)
      this.drafts.set(this.draft.id, {
        draft: structuredClone(this.draft),
        pending: new Map(this.pending),
        errors: new Map(this.errors),
      });
    this.selectionInitialized = true;
    const saved = this.drafts.get(a.id);
    this.draft = structuredClone(saved?.draft ?? a);
    this.pending = new Map(saved?.pending);
    this.errors = new Map(saved?.errors);
    this.editError = null;
    this.update();
    this.changed(this.draft);
  }
  editFpv() {
    $("editor-components-tab").click();
    this.workshop.selectFpv();
  }
  setPilotResponse(settings: NonNullable<Aircraft["pilotResponse"]>) {
    this.commitPending();
    this.draft = parseAircraft({
      ...this.draft,
      pilotResponse: structuredClone(settings),
    });
    this.update();
    this.changed(this.draft);
  }
  update() {
    const a = this.draft,
      p = massProperties(a),
      cg = a.reference.leadingEdgeXM - p.cg[0];
    $("editor-model-name").textContent = a.name;
    $("component-summary").innerHTML =
      `<button id="open-components" class="wide">Edit components →</button><small class="muted">${a.battery ? `${a.battery.cells}S · ${a.battery.capacityMah} mAh · ` : ""}${a.parts.length} installed parts</small>`;
    $("open-components").onclick = () => $("editor-components-tab").click();
    $("editor-component-status").textContent =
      `${(p.mass * 1000).toFixed(0)} g · ${a.parts.length} parts`;
    this.workshop.render();
    this.mixer.render();
    const quad = a.vehicleType === "multirotor";
    $("mass-scope").textContent = quad
      ? "Includes all components and battery."
      : a.contactPoints.some((p) => p.kind === "wheel")
        ? "Includes installed landing gear and battery."
        : "Ground starts add removable gear to this mass.";
    $("mass-evidence").textContent = quad
      ? `Component total: ${(p.mass * 1000).toFixed(0)} g. Each listed component is counted once. Rendered detail adds no hidden mass; replace estimates with measured values.`
      : `Component total: ${(p.mass * 1000).toFixed(0)} g. Replace estimated component weights with measured values for your build.`;
    document.querySelector('label[for="edit-span"]')!.textContent = quad
      ? "Motor diagonal · mm"
      : "Wingspan · mm";
    $<HTMLInputElement>("edit-span").min = quad ? "100" : "400";
    document.querySelector('label[for="edit-cg"]')!.textContent = quad
      ? "CG aft datum · mm"
      : "CG aft of LE · mm";
    $("edit-throws").toggleAttribute("disabled", quad);
    $("edit-throws").parentElement!.hidden = quad;
    document.querySelector<HTMLElement>(".balance-track")!.hidden = quad;
    $("loading-label").textContent = quad ? "Thrust / weight" : "Wing loading";
    $("stall-label").textContent = quad
      ? "Estimated hover command"
      : "Estimated stall speed";
    $("quad-config").hidden = !quad;
    if (quad) {
      $("quad-config").innerHTML =
        `<div class="section-kicker">ROTOR SETUP · SI UNITS · body X forward, Y right, Z down</div><p class="small muted">Thrust and response must be measured for your motor, prop and battery combination. Spin means viewed from above. Changing spin flips the complete diagonal pair pattern. Mode is a simple internal controller, not Betaflight or PX4 firmware.</p><div class="two-col"><label>Flight mode<select id="quad-mode"><option value="angle" ${a.multirotor!.mode === "angle" ? "selected" : ""}>Angle / self-level</option><option value="rate" ${a.multirotor!.mode === "rate" ? "selected" : ""}>Rate / acro</option></select></label><label>Max tilt · degrees<input id="quad-tilt" type="number" value="${a.multirotor!.maxTiltDeg}"/></label></div><div class="component-scroll"><table><thead><tr><th>Rotor</th><th>X / m</th><th>Y / m</th><th>Z / m</th><th>Max thrust / N</th><th>Prop / m</th><th>Lag / s</th><th>Torque / thrust · m</th><th>Spin</th></tr></thead><tbody>${a.motors.map((m, i) => `<tr><th>${escape(m.id)}</th>${[...m.positionM, m.maxThrustN, m.propDiameterM, m.responseSeconds, m.torquePerThrustM].map((v, j) => `<td><input id="rotor-${i}-${j}" type="number" step="0.001" value="${Number(Number(v).toFixed(4))}" aria-label="${escape(m.id)} ${["X", "Y", "Z", "thrust", "propeller", "lag", "torque ratio"][j]}"/></td>`).join("")}<td><select id="spin-${i}"><option ${m.spin === "cw" ? "selected" : ""}>cw</option><option ${m.spin === "ccw" ? "selected" : ""}>ccw</option></select></td></tr>`).join("")}</tbody></table></div>`;
      const register = (
        id: string,
        edit: (out: Aircraft, value: string) => void,
      ) => {
        const field = $<HTMLInputElement>(id);
        field.oninput = () => this.track(id, field.value);
        field.onchange = () => {
          const raw = field.value;
          try {
            if (field.type === "number") numericValue(field);
            const out = structuredClone(this.draft);
            edit(out, field.value);
            this.draft = parseAircraft(out);
            this.pending.delete(id);
            this.errors.delete(id);
            this.changed(this.draft);
            this.update();
          } catch (e) {
            this.fail(id, raw, e);
          }
        };
      };
      register(
        "quad-mode",
        (out, v) => (out.multirotor!.mode = v as "angle" | "rate"),
      );
      register(
        "quad-tilt",
        (out, v) => (out.multirotor!.maxTiltDeg = Number(v)),
      );
      a.motors.forEach((m, i) => {
        for (let j = 0; j < 7; j++)
          register(`rotor-${i}-${j}`, (out, v) => {
            const motor = out.motors[i],
              n = Number(v);
            if (j < 3) {
              const delta = n - motor.positionM[j];
              motor.positionM[j] = n;
              const part = out.parts.find((p) => p.id === motor.partId);
              const prop = out.parts.find((p) => p.id === motor.propPartId);
              if (part) part.positionM[j] += delta;
              if (prop) prop.positionM[j] += delta;
            } else if (j === 3) {
              motor.performance?.points.forEach(
                (p) => (p.thrustN *= n / motor.maxThrustN),
              );
              motor.maxThrustN = n;
            } else if (j === 4) motor.propDiameterM = n;
            else if (j === 5) motor.responseSeconds = n;
            else motor.torquePerThrustM = n;
          });
        register(`spin-${i}`, (out, v) => {
          if (out.motors[i].spin !== v)
            for (const m of out.motors) m.spin = m.spin === "cw" ? "ccw" : "cw";
        });
      });
    }

    const values: Record<string, number> = {
      "edit-mass": p.mass * 1000,
      "edit-cg": cg * 1000,
      "edit-span": a.reference.spanM * 1000,
      "edit-throws": a.surfaces.find((s) => s.control)?.control?.maxDeg ?? 0,
      "edit-thrust": a.motors[0]?.maxThrustN ?? 0,
    };
    for (const [id, value] of Object.entries(values))
      $<HTMLInputElement>(id).value = value.toFixed(
        id === "edit-thrust" ? 2 : 1,
      );
    $("edit-loading").textContent =
      ((p.mass * 10) / a.reference.areaM2).toFixed(1) + " g/dm²";
    const wing = a.surfaces.find((s) => s.kind === "wing"),
      clmax = wing ? (wing.liftSlope * wing.stallDeg * Math.PI) / 180 : 1;
    $("edit-stall").textContent =
      Math.sqrt(
        (2 * p.mass * 9.80665) / (1.225 * a.reference.areaM2 * clmax),
      ).toFixed(1) + " m/s";
    if (quad) {
      const available = powertrain(
        a,
        a.motors.map(() => 1),
      ).thrust.reduce((sum, v) => sum + v, 0);
      $("edit-loading").textContent =
        (available / (p.mass * 9.80665)).toFixed(2) + " : 1";
      $("edit-stall").textContent =
        (findTrim(a).controls.throttle * 100).toFixed(1) + "%";
    }

    $("cg-marker").style.left =
      Math.max(0, Math.min(100, (cg / (wing?.chordM ?? 0.2)) * 100)) + "%";
    $("inertia").textContent = p.inertia
      .map((row) => row.map((v) => v.toFixed(5).padStart(8)).join(" "))
      .join("\n");
    $("components").innerHTML = a.parts
      .map(
        (part, i) =>
          `<tr><th>${escape(part.id)}<small>${part.kind}</small></th>${[part.massKg * 1000, ...part.positionM.map((n) => n * 1000)].map((v, j) => `<td><input id="component-${i}-${j}" aria-label="${escape(part.id)} ${["mass grams", "X millimeters", "Y millimeters", "Z millimeters"][j]}" type="number" step="${j === 0 ? "1" : "0.5"}" ${j === 0 ? 'min="0.1"' : ""} value="${v.toFixed(1)}" data-part="${i}" data-value="${j}"/></td>`).join("")}</tr>`,
      )
      .join("");
    $("components")
      .querySelectorAll<HTMLInputElement>("input")
      .forEach((input) => {
        input.oninput = () => this.track(input.id, input.value);
        input.onchange = () => {
          const raw = input.value;
          try {
            const clone = structuredClone(this.draft),
              part = clone.parts[Number(input.dataset.part)],
              index = Number(input.dataset.value),
              value = numericValue(input) / 1000;
            if (index === 0) {
              if (part.inertiaDiagonalKgM2)
                part.inertiaDiagonalKgM2 = part.inertiaDiagonalKgM2.map(
                  (v) => (v * value) / part.massKg,
                ) as [number, number, number];
              part.massKg = value;
            } else moveComponent(clone, part.id, index - 1, value);
            const next = parseAircraft(clone);
            massProperties(next);
            this.draft = next;
            this.pending.delete(input.id);
            this.errors.delete(input.id);
            this.update();
            this.changed(next);
          } catch (e) {
            this.fail(input.id, raw, e);
          }
        };
      });
    $("provenance").innerHTML = Object.entries(a.provenance)
      .map(
        ([key, v]) =>
          `<p><strong>${escape(key)} · ${v.status}</strong>${escape(v.note)}${v.url && /^https?:/.test(v.url) ? `<a href="${escape(v.url)}" target="_blank" rel="noopener noreferrer">Source ↗</a>` : ""}</p>`,
      )
      .join("");
    this.renderPending();
  }
}
