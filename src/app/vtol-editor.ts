import type { Aircraft } from "../core/schema";
import { findTrim } from "../core/trim";
import { calmEnvironment } from "../core/simulation";
import { $, escape } from "./dom";

export function renderVtolEditor(
  a: Aircraft,
  register: (id: string, edit: (a: Aircraft, n: number) => void) => void,
  change: (edit: (a: Aircraft) => void) => void,
) {
  const host = $("vtol-config"),
    v = a.vtol;
  host.hidden = !v;
  if (!v) return;
  const field = (
    id: string,
    label: string,
    value: number,
    min: number,
    max: number,
    step = 1,
  ) =>
    `<label>${label}<input id="${id}" type="number" min="${min}" max="${max}" step="${step}" value="${Number(value.toFixed(4))}"/></label>`;
  host.innerHTML = `<div class="response-title"><strong>Tricopter VTOL</strong><a href="/docs/next/bronco-vtol/" target="_blank" rel="noopener">Model & radio setup ↗</a></div>
    <p class="small muted">Two independent front tilt servos · rear yaw-tilt servo. Changes apply with the aircraft.</p>
    <div class="vtol-editor-profiles">${(["beginner", "intermediate"] as const)
      .map((name) => {
        const p = v.profiles[name];
        return `<fieldset><legend>${name === "beginner" ? "Beginner" : "Intermediate"}</legend><div class="response-fields">${field(`vtol-${name}-bankDeg`, "Bank limit · °", p.bankDeg, 5, 60)}${field(`vtol-${name}-pitchDeg`, "Pitch limit · °", p.pitchDeg, 5, 35)}${field(`vtol-${name}-yawRateDegS`, "Yaw rate · °/s", p.yawRateDegS, 10, 180)}${field(`vtol-${name}-climbMps`, "Climb / descent · m/s", p.climbMps, 0.3, 8, 0.1)}${field(`vtol-${name}-horizontalSpeedMps`, "Position-mode speed · m/s", p.horizontalSpeedMps, 1, 15, 0.5)}</div><label class="check-label"><input id="vtol-${name}-positionHold" type="checkbox" ${p.positionHold ? "checked" : ""}/> Brake and hold position in hover</label></fieldset>`;
      })
      .join("")}</div>
    <div class="response-fields"><label>Default assistance<select id="vtol-default"><option value="beginner" ${v.defaultAssistance === "beginner" ? "selected" : ""}>Beginner</option><option value="intermediate" ${v.defaultAssistance === "intermediate" ? "selected" : ""}>Intermediate</option></select></label>${field("vtol-tiltRateDegS", "Conversion rate · °/s", v.tiltRateDegS, 3, 60)}${field("vtol-transitionAirspeedMps", "Conversion airspeed · m/s", v.transitionAirspeedMps, 5, 35, 0.5)}${field("vtol-transitionAltitudeM", "Minimum conversion height · m", v.transitionAltitudeM, 2, 30)}</div>
    <details><summary>Servo limits & controller tuning</summary><p class="small muted">Tilt is 0° vertical / 90° forward. Rear yaw tilts sideways. Servo travel and speed come from the installed components; the slower conversion rate shapes the maneuver.</p><div class="response-fields">${field("vtol-yawTiltDeg", "Rear yaw limit · °", v.yawTiltDeg, 5, 30)}${field("vtol-transitionTimeoutS", "Conversion timeout · s", v.transitionTimeoutS, 10, 60)}${field("vtol-attitudeGain", "Angle-loop gain · 1/s", v.attitudeGain, 0.5, 8, 0.1)}${field("vtol-rateGain", "Rate-loop gain · 1/s", v.rateGain, 1, 20, 0.5)}${field("vtol-cruisePitchDeg", "Cruise pitch reference · °", v.cruisePitchDeg, -5, 12, 0.1)}${field("vtol-cruisePitchTrim", "Cruise elevator trim · −1…1", v.cruisePitchTrim, -1, 1, 0.01)}</div><button id="vtol-solve-trim">Recalculate cruise trim at ${a.reference.trimSpeedMps ?? 12} m/s</button><p id="vtol-trim-result" class="small muted" role="status"></p><div class="vtol-servo-summary">${[
      v.leftServoPartId,
      v.rightServoPartId,
      v.rearServoPartId,
    ]
      .map((id) => {
        const p = a.parts.find((p) => p.id === id)!;
        return `<span>${escape(p.model ?? id)} · ${(p.massKg * 1000).toFixed(0)} g · ${p.servo!.travelDeg}° · ${p.servo!.speedSecondsPer60Deg} s/60°</span>`;
      })
      .join(
        "",
      )}</div><p class="small muted">Simulation gains are not ArduPilot parameters. Mass, motor/prop data and battery charge constrain what the controller can achieve.</p></details>`;
  for (const name of ["beginner", "intermediate"] as const) {
    for (const key of [
      "bankDeg",
      "pitchDeg",
      "yawRateDegS",
      "climbMps",
      "horizontalSpeedMps",
    ] as const)
      register(
        `vtol-${name}-${key}`,
        (out, n) => (out.vtol!.profiles[name][key] = n),
      );
    $("vtol-" + name + "-positionHold").onchange = () => {
      const checked = $<HTMLInputElement>(
        "vtol-" + name + "-positionHold",
      ).checked;
      change((out) => {
        out.vtol!.profiles[name].positionHold = checked;
      });
    };
  }
  for (const key of [
    "tiltRateDegS",
    "transitionAirspeedMps",
    "transitionAltitudeM",
    "yawTiltDeg",
    "transitionTimeoutS",
    "attitudeGain",
    "rateGain",
    "cruisePitchDeg",
    "cruisePitchTrim",
  ] as const)
    register("vtol-" + key, (out, n) => (out.vtol![key] = n));
  $("vtol-default").onchange = () => {
    const selected = $<HTMLSelectElement>("vtol-default").value as
      "beginner" | "intermediate";
    change((out) => {
      out.vtol!.defaultAssistance = selected;
    });
  };
  $("vtol-solve-trim").onclick = () => {
    change((out) => {
      const trim = findTrim(
        out,
        out.reference.trimSpeedMps ?? 12,
        calmEnvironment(),
        0,
        "cruise",
      );
      if (!trim.converged)
        throw new Error(
          "No cruise equilibrium found. Inspect CG, surfaces and available thrust.",
        );
      out.vtol!.cruisePitchDeg = trim.pitchDeg;
      out.vtol!.cruisePitchTrim = trim.controls.pitch;
    });
  };
}
