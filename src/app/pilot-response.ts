import {
  PilotResponseSchema,
  responseSettings,
  type PilotResponse,
  type ResponsePreset,
} from "../core/pilot-response";
import type { Aircraft } from "../core/schema";
import { $ } from "./dom";

export const responseLabels = {
  gentle: "Gentle",
  standard: "Standard",
  direct: "Direct",
  custom: "Custom",
};
/** Personal per-aircraft input preferences; the recorded controls are already shaped. */
export class ResponsePanel {
  onSaveToAircraft?: (settings: PilotResponse) => void;
  settings = responseSettings();
  private aircraftId = "";
  private aircraft?: Aircraft;
  private custom?: PilotResponse;
  constructor() {
    $("quick-response").onchange = () =>
      this.choose(
        $<HTMLSelectElement>("quick-response").value as ResponsePreset,
      );
  }
  selectAircraft(a: Aircraft) {
    this.aircraft = a;
    if (this.aircraftId !== a.id) {
      this.aircraftId = a.id;
      this.settings = responseSettings(a.pilotResponse);
      this.custom =
        a.pilotResponse?.preset === "custom"
          ? structuredClone(a.pilotResponse)
          : undefined;
      try {
        const parsed = PilotResponseSchema.safeParse(
          JSON.parse(
            localStorage.getItem("rcforge.response." + a.id) ?? "null",
          ),
        );
        if (parsed.success) this.settings = responseSettings(parsed.data);
        const custom = PilotResponseSchema.safeParse(
          JSON.parse(
            localStorage.getItem("rcforge.response-custom." + a.id) ?? "null",
          ),
        );
        if (custom.success && custom.data.preset === "custom")
          this.custom = custom.data;
      } catch {
        /* Keep the authored default when storage is unavailable. */
      }
    }
    this.render();
  }
  choose(preset: ResponsePreset) {
    if (!Object.hasOwn(responseLabels, preset)) return;
    this.settings = responseSettings(
      preset === "custom" && this.custom
        ? this.custom
        : { ...this.settings, preset },
    );
    this.save();
  }
  cycle() {
    const modes: ResponsePreset[] = ["gentle", "standard", "direct"];
    if (this.custom) modes.push("custom");
    this.choose(
      modes[(modes.indexOf(this.settings.preset) + 1) % modes.length],
    );
  }
  private save(render = true) {
    let saved = true;
    if (this.settings.preset === "custom")
      this.custom = structuredClone(this.settings);
    try {
      localStorage.setItem(
        "rcforge.response." + this.aircraftId,
        JSON.stringify(this.settings),
      );
      if (this.custom)
        localStorage.setItem(
          "rcforge.response-custom." + this.aircraftId,
          JSON.stringify(this.custom),
        );
    } catch {
      saved = false;
    }
    if (render) this.render();
    else {
      $<HTMLSelectElement>("quick-response").value = this.settings.preset;
      document
        .querySelectorAll<HTMLButtonElement>("[data-response]")
        .forEach((b) => {
          b.classList.toggle(
            "active",
            b.dataset.response === this.settings.preset,
          );
          b.setAttribute(
            "aria-pressed",
            String(b.dataset.response === this.settings.preset),
          );
        });
      for (const prefix of ["flight", "editor"]) {
        const host = $(`${prefix}-response`);
        host.querySelector("summary")!.textContent =
          "Fine-tune response · Custom";
        // Keep the other workspace synchronized without replacing a field mid-keystroke.
        if (!host.contains(document.activeElement)) {
          this.settings.rates.forEach(
            (v, i) =>
              ($<HTMLInputElement>(`${prefix}-response-rate-${i}`).value =
                String(Math.round(v * 100))),
          );
          $<HTMLInputElement>(`${prefix}-response-expo`).value = String(
            Math.round(this.settings.expo * 100),
          );
          $<HTMLInputElement>(`${prefix}-response-smoothing`).value = String(
            Math.round(this.settings.smoothingSeconds * 1000),
          );
        }
      }
    }
    for (const prefix of ["flight", "editor"])
      $(`${prefix}-response-save-state`).textContent = saved
        ? "Saved for this aircraft on this browser."
        : "Session only. Browser storage is unavailable.";
  }
  render() {
    const s = this.settings;
    $<HTMLSelectElement>("quick-response").value = s.preset;
    const quad = this.aircraft?.vehicleType === "multirotor";
    for (const prefix of ["flight", "editor"]) {
      const host = $(`${prefix}-response`);
      const focused = host.contains(document.activeElement)
        ? (document.activeElement as HTMLInputElement)
        : null;
      const focusId = focused?.id;
      const focusRate = focused?.dataset.responseRate;
      const open = host.querySelector("details")?.open;
      host.innerHTML = `<div class="response-title"><strong>Control response</strong><small>Cycle <kbd>C</kbd></small></div><div class="segmented response-presets" role="group" aria-label="Control response">${(["gentle", "standard", "direct"] as const).map((p) => `<button data-response="${p}" aria-pressed="${p === s.preset}" class="${p === s.preset ? "active" : ""}">${responseLabels[p]}</button>`).join("")}</div>
      <p class="small muted">${this.aircraft?.vtol ? "Pilot stick rates before VTOL assistance. Change assistance limits in the aircraft editor." : quad ? `Softer ${this.aircraft?.multirotor?.mode === "angle" ? "tilt" : "rotation rate"} commands. Throttle stays manual.` : "Lower rates soften stick response. They do not self-level the aircraft."}</p>
      <details ${open || s.preset === "custom" ? "open" : ""}><summary>Fine-tune response${s.preset === "custom" ? " · Custom" : ""}</summary><div class="response-fields">${s.rates.map((rate, i) => `<label>${["Roll", "Pitch", "Yaw"][i]} limit · %<input id="${prefix}-response-rate-${i}" data-response-rate="${i}" type="number" min="10" max="100" step="1" value="${Math.round(rate * 100)}"/></label>`).join("")}<label>Soft center · %<input id="${prefix}-response-expo" type="number" min="0" max="80" step="1" value="${Math.round(s.expo * 100)}"/></label><label>Smoothing · ms<input id="${prefix}-response-smoothing" type="number" min="0" max="200" step="1" value="${Math.round(s.smoothingSeconds * 1000)}"/></label></div><p class="small muted">Applied after device expo, before trim. Limits reduce available pilot authority; smoothing adds response delay.</p><button id="${prefix}-response-restore">Use aircraft default</button></details><small id="${prefix}-response-save-state" class="muted">Per aircraft · local preference</small>`;
      host
        .querySelectorAll<HTMLButtonElement>("[data-response]")
        .forEach(
          (b) =>
            (b.onclick = () =>
              this.choose(b.dataset.response as ResponsePreset)),
        );
      const bind = (
        field: HTMLInputElement,
        edit: (out: PilotResponse, value: number) => void,
      ) => {
        const commit = (finished: boolean) => {
          field.setCustomValidity("");
          if (!field.value.trim()) field.setCustomValidity("Enter a number.");
          if (!field.checkValidity()) {
            if (finished) field.reportValidity();
            return;
          }
          const next = structuredClone(this.settings);
          next.preset = "custom";
          edit(next, Number(field.value));
          const parsed = PilotResponseSchema.safeParse(next);
          if (!parsed.success) {
            field.setCustomValidity("Enter a value within the stated range.");
            field.reportValidity();
            return;
          }
          this.settings = parsed.data;
          this.save(finished);
        };
        field.oninput = () => commit(false);
        field.onchange = () => commit(true);
      };
      host
        .querySelectorAll<HTMLInputElement>("[data-response-rate]")
        .forEach((f) =>
          bind(
            f,
            (out, v) => (out.rates[Number(f.dataset.responseRate)] = v / 100),
          ),
        );
      bind(
        $<HTMLInputElement>(`${prefix}-response-expo`),
        (out, v) => (out.expo = v / 100),
      );
      bind(
        $<HTMLInputElement>(`${prefix}-response-smoothing`),
        (out, v) => (out.smoothingSeconds = v / 1000),
      );
      if (prefix === "editor") {
        const save = document.createElement("button");
        save.textContent = "Save response in aircraft draft";
        save.className = "wide";
        save.onclick = () => {
          for (const field of host.querySelectorAll<HTMLInputElement>("input"))
            if (!field.reportValidity()) return;
          this.onSaveToAircraft?.(structuredClone(this.settings));
        };
        host.append(save);
      }
      $(`${prefix}-response-restore`).onclick = () => {
        this.settings = responseSettings(this.aircraft?.pilotResponse);
        this.save();
      };
      if (focusId) $(focusId)?.focus({ preventScroll: true });
      else if (focusRate !== undefined)
        host
          .querySelector<HTMLInputElement>(
            `[data-response-rate="${focusRate}"]`,
          )
          ?.focus({ preventScroll: true });
    }
  }
}
