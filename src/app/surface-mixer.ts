import type { Aircraft } from "../core/schema";
import {
  mixingAxes,
  mixingWeights,
  setMixingWeights,
  applyMixingTemplate,
  type MixingTemplate,
} from "../core/control-mixing";
import { $, escape } from "./dom";

/** The same per-surface mixer is available to every fixed-wing definition. */
export class SurfaceMixer {
  constructor(
    private getAircraft: () => Aircraft,
    private register: (
      id: string,
      edit: (out: Aircraft, value: number) => void,
    ) => void,
    private commitPending: () => void,
    private replace: (a: Aircraft) => void,
    private notify: (s: string) => void,
  ) {}
  render() {
    const a = this.getAircraft(),
      host = $("surface-mixer");
    host.hidden = a.vehicleType === "multirotor";
    if (host.hidden) return;
    const surfaces = a.surfaces
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => s.control);
    const focused = host.contains?.(document.activeElement)
      ? (document.activeElement as HTMLElement)
      : null;
    const focusId = focused?.id;
    const open = host.querySelector("details")?.open;
    host.innerHTML = `<details ${open ? "open" : ""}><summary>Surface mixing · ${surfaces.length} outputs</summary><p class="small muted">Contributions to each surface. Negative reverses direction; combined commands stop at the mechanical limit. Changes are aircraft drafts.</p>${surfaces
      .map(({ s, i }) => {
        const w = mixingWeights(s.control!);
        return `<fieldset class="surface-mix-fields"><legend>${escape(s.id.replaceAll("-", " "))}</legend><div class="mix-axis-fields">${mixingAxes.map((axis) => `<label>${axis[0].toUpperCase() + axis.slice(1)} · %<input id="mix-${i}-${axis}" aria-label="${escape(s.id)} ${axis} mix percent" type="number" min="-200" max="200" step="5" value="${w[axis] * 100}"/></label>`).join("")}</div><div class="mix-output-row"><label>Surface limit · ±°<input id="mix-${i}-travel" aria-label="${escape(s.id)} surface limit degrees" type="number" min="0" max="45" step="0.5" value="${s.control!.maxDeg}"/></label><button id="mix-${i}-reverse" title="Reverse every input contribution to this surface">Reverse output</button></div></fieldset>`;
      })
      .join(
        "",
      )}${surfaces.length >= 2 ? `<details><summary>Apply a paired mix</summary><label>Mix type<select id="mix-template"><option value="elevon">Elevons · roll + pitch</option><option value="v-tail">V-tail · upward</option><option value="a-tail">A-tail · inverted</option><option value="ailerons">Ailerons · roll only</option></select></label><div class="two-col">${["left", "right"].map((side, i) => `<label>${i === 0 ? "Left surface" : "Right surface"}<select id="mix-${side}">${surfaces.map(({ s }, j) => `<option value="${escape(s.id)}" ${j === i ? "selected" : ""}>${escape(s.id.replaceAll("-", " "))}</option>`).join("")}</select></label>`).join("")}</div><p class="small muted">Sets wiring on the chosen pair. It does not reshape the airframe. Verify direction in the live test.</p><button id="apply-mix-template" class="wide">Apply mix to draft</button></details>` : ""}</details>`;
    const mutate = (fn: () => Aircraft) => {
      try {
        this.commitPending();
        const next = fn();
        next.provenance.controlMixing = {
          status: "estimated",
          note: "User-edited surface mixing and travel. Check direction, limits and trim before flight; these settings are not measured calibration.",
        };
        this.replace(next);
      } catch (e) {
        this.notify(e instanceof Error ? e.message : String(e));
      }
    };
    for (const { i } of surfaces) {
      for (const axis of mixingAxes)
        this.register(`mix-${i}-${axis}`, (out, v) => {
          const control = out.surfaces[i].control!;
          setMixingWeights(control, {
            ...mixingWeights(control),
            [axis]: v / 100,
          });
        });
      this.register(
        `mix-${i}-travel`,
        (out, v) => (out.surfaces[i].control!.maxDeg = v),
      );
      $(`mix-${i}-reverse`).onclick = () =>
        mutate(() => {
          const out = structuredClone(this.getAircraft()),
            control = out.surfaces[i].control!,
            weights = mixingWeights(control);
          for (const axis of mixingAxes) weights[axis] *= -1;
          setMixingWeights(control, weights);
          return out;
        });
    }
    if (surfaces.length >= 2)
      $("apply-mix-template").onclick = () => {
        const left = $<HTMLSelectElement>("mix-left").value,
          right = $<HTMLSelectElement>("mix-right").value,
          template = $<HTMLSelectElement>("mix-template")
            .value as MixingTemplate;
        mutate(() =>
          applyMixingTemplate(this.getAircraft(), left, right, template),
        );
      };
    if (focusId) $(focusId)?.focus({ preventScroll: true });
  }
}
