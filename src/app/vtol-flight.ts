import type { Simulation } from "../core/simulation";
import type { VtolCommand } from "../core/vtol-config";
import { $ } from "./dom";

export class VtolFlight {
  command: VtolCommand = { mode: "hover", assistance: "beginner" };
  private aircraftId = "";
  private replay = false;
  private configuredDefault?: VtolCommand["assistance"];
  constructor(
    private get: () => Simulation,
    private notify: (text: string) => void,
    private centerThrottle: () => void,
  ) {
    $("flight-vtol").innerHTML =
      `<div class="response-title"><strong>Tiltrotor</strong><a href="/docs/next/bronco-vtol/" target="_blank" rel="noopener">Guide ↗</a></div>
      <div class="segmented" role="group" aria-label="VTOL flight mode"><button id="vtol-hover">Hover</button><button id="vtol-cruise">Cruise</button></div>
      <label for="vtol-assistance">Assistance</label><select id="vtol-assistance"><option value="beginner">Beginner · position hold</option><option value="intermediate">Intermediate · angle mode</option></select>
      <p id="vtol-assistance-detail" class="small muted"></p><div class="vtol-tilt-meter"><span>Front tilt</span><meter id="vtol-tilt-meter" min="0" max="90" value="0"></meter><output id="vtol-tilt-reading">0° / 0°</output></div>
      <div class="setup-line"><span>Rear yaw tilt</span><output id="vtol-rear-tilt">0°</output></div><p id="vtol-status" class="small" role="status"></p><button id="vtol-center-power" class="wide">Center throttle · hold altitude <kbd>H</kbd></button>`;
    $("vtol-hover").onclick = () => this.request("hover");
    $("vtol-cruise").onclick = () => this.request("cruise");
    $("quick-vtol").onclick = () => this.toggle();
    $("vtol-center-power").onclick = () => this.centerThrottle();
    $("vtol-assistance").onchange = () => {
      this.command.assistance = $<HTMLSelectElement>("vtol-assistance")
        .value as VtolCommand["assistance"];
    };
  }
  reset() {
    const a = this.get().aircraft;
    if (
      a.id !== this.aircraftId ||
      a.vtol?.defaultAssistance !== this.configuredDefault
    )
      this.command.assistance = a.vtol?.defaultAssistance ?? "beginner";
    this.aircraftId = a.id;
    this.configuredDefault = a.vtol?.defaultAssistance;
    this.command.mode = "hover";
  }
  request(mode: VtolCommand["mode"]) {
    const sim = this.get();
    if (!sim.aircraft.vtol || this.replay) return;
    if (
      mode === "cruise" &&
      -sim.state.position[2] < sim.aircraft.vtol.transitionAltitudeM
    ) {
      this.notify(
        `Climb above ${sim.aircraft.vtol.transitionAltitudeM} m before requesting cruise.`,
      );
      return;
    }
    this.command.mode = mode;
  }
  cycleAssistance() {
    if (this.get().aircraft.vtol && !this.replay)
      this.command.assistance =
        this.command.assistance === "beginner" ? "intermediate" : "beginner";
  }
  toggle() {
    this.request(this.command.mode === "hover" ? "cruise" : "hover");
  }
  update(keyboard: boolean, replayCommand?: VtolCommand, replay = false) {
    const sim = this.get(),
      v = sim.state.vtol,
      a = sim.aircraft;
    this.replay = replay;
    $("flight-vtol").hidden = !v;
    $("quick-vtol").hidden = !v;
    if (!v) return;
    const command = replayCommand ?? this.command;
    for (const name of ["beginner", "intermediate"] as const) {
      const option = $("vtol-assistance").querySelector<HTMLOptionElement>(
        `option[value="${name}"]`,
      )!;
      option.textContent = `${name === "beginner" ? "Beginner" : "Intermediate"} · ${a.vtol!.profiles[name].positionHold ? "position hold" : "angle mode"}`;
    }
    const phase = {
      hover: "Hover",
      accelerating: "Building airspeed",
      converting: "Tilting forward",
      cruise: "Cruise",
      returning: "Braking to hover",
    }[v.phase];
    const notices = {
      none: "",
      "climb-first": `Select Hover, climb above ${a.vtol!.transitionAltitudeM} m, then request Cruise again.`,
      "transition-aborted":
        "Conversion aborted. Hover recovery commanded; select Hover before retrying.",
      "power-cut": "Throttle zero · motors cut",
    };
    $("vtol-status").textContent =
      notices[v.notice] ||
      (v.saturated
        ? `${phase} · motor authority limited`
        : `${phase}${v.phase === "accelerating" ? ` · needs ${a.vtol!.transitionAirspeedMps} m/s airspeed` : ""}`);
    $("vtol-status").classList.toggle(
      "trim-limited",
      v.saturated || v.notice === "transition-aborted",
    );
    $<HTMLMeterElement>("vtol-tilt-meter").value =
      (v.tiltDeg[0] + v.tiltDeg[1]) / 2;
    $("vtol-rear-tilt").textContent = `${v.rearTiltDeg.toFixed(1)}°`;
    $("vtol-tilt-reading").textContent = v.tiltDeg
      .map((angle) => `${angle.toFixed(0)}°`)
      .join(" / ");
    const label = `${phase} <kbd>${keyboard ? "T" : "↔"}</kbd>`;
    if ($("quick-vtol").innerHTML !== label) $("quick-vtol").innerHTML = label;
    for (const mode of ["hover", "cruise"] as const) {
      $("vtol-" + mode).setAttribute(
        "aria-pressed",
        String(command.mode === mode),
      );
      $("vtol-" + mode).classList.toggle("active", command.mode === mode);
      $("vtol-" + mode).toggleAttribute("disabled", replay);
    }
    $<HTMLSelectElement>("vtol-assistance").value = command.assistance;
    $("vtol-assistance").toggleAttribute("disabled", replay);
    $("quick-vtol").toggleAttribute("disabled", replay);
    $("vtol-assistance-detail").textContent =
      v.phase === "cruise"
        ? "Self-levelled bank / pitch. Throttle controls motor power; altitude is manual."
        : `${a.vtol!.profiles[command.assistance].positionHold ? "Release direction sticks to brake and hold position." : "Sticks command lean angle; release to level. Drift is possible."} Center throttle holds height. Above climbs; below descends. Zero cuts power.`;
    $("vtol-center-power").hidden = !keyboard || replay || v.phase === "cruise";
  }
}
