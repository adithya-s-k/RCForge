import { surfaceDemand } from "../core/surface-control";
import { ControlPreview } from "../core/control-preview";
import { $, escape } from "./dom";

export function renderControlTest(preview: ControlPreview) {
  const a = preview.aircraft;
  $("control-test-readings").innerHTML =
    a.vehicleType === "multirotor"
      ? `<p class="small muted">${a.multirotor!.mode === "angle" ? "Angle mode · commanded tilt" : "Rate mode · commanded rotation"}. Motors remain off on the bench.</p>${["Roll", "Pitch", "Yaw"].map((name, i) => `<div class="control-test-row"><span>${name}</span><output id="test-axis-${i}">0</output></div>`).join("")}`
      : a.surfaces
          .map((s, i) =>
            !s.control
              ? ""
              : `<div class="control-test-row"><span>${escape(s.id.replaceAll("-", " "))}</span><output id="test-surface-${i}">0.0°</output><small id="test-limit-${i}">±${preview.actuations[i].maxDeg.toFixed(1)}° max</small><div class="deflection-track"><i id="test-travel-${i}"></i></div></div>`,
          )
          .join("") ||
        '<p class="small muted">No movable surfaces on this aircraft.</p>';
  if (a.vtol) {
    $("control-test-readings").insertAdjacentHTML(
      "afterbegin",
      `<div class="vtol-bench"><label>Tilt mechanism test<select id="vtol-bench-mode"><option value="hover">Vertical / hover</option><option value="cruise">Forward / cruise</option></select></label><p class="small muted">Enable Test sticks. Yaw tilts the rear motor sideways; the front pair convert together. Propellers remain off.</p><div class="control-test-row"><span>Front left tilt</span><output id="test-tilt-left">0°</output></div><div class="control-test-row"><span>Front right tilt</span><output id="test-tilt-right">0°</output></div><div class="control-test-row"><span>Rear yaw tilt</span><output id="test-tilt-rear">0°</output></div></div>`,
    );
    $("vtol-bench-mode").onchange = () =>
      (preview.tiltMode = $<HTMLSelectElement>("vtol-bench-mode").value as
        "hover" | "cruise");
  }
}
export function updateControlTest(preview: ControlPreview, status: string) {
  $("control-test-status").textContent = status;
  const a = preview.aircraft;
  if (a.vtol) {
    $("test-tilt-rear").textContent = `${preview.rearTiltDeg.toFixed(1)}°`;
    $("test-tilt-left").textContent = `${preview.tiltDeg[0].toFixed(1)}°`;
    $("test-tilt-right").textContent = `${preview.tiltDeg[1].toFixed(1)}°`;
  }
  if (a.vehicleType === "multirotor") {
    const c = a.multirotor!;
    [
      preview.controls.roll,
      preview.controls.pitch,
      preview.controls.yaw,
    ].forEach((v, i) => {
      const angle = i < 2 && c.mode === "angle";
      $("test-axis-" + i).textContent =
        `${(v * (angle ? c.maxTiltDeg : c.maxRateDegS)).toFixed(1)}${angle ? "° tilt" : "°/s"}`;
    });
  } else
    a.surfaces.forEach((s, i) => {
      if (!s.control) return;
      const v = preview.deflections[i];
      const saturated =
        Math.abs(surfaceDemand(s.control, preview.controls)) > 1;
      $(`test-limit-${i}`).textContent = saturated
        ? "Mix limit"
        : `±${preview.actuations[i].maxDeg.toFixed(1)}° max`;
      $(`test-limit-${i}`).classList.toggle("mix-saturated", saturated);
      $("test-surface-" + i).textContent =
        `${(v * preview.actuations[i].maxDeg).toFixed(1)}°`;
      $("test-travel-" + i).style.left = `${50 + v * 48}%`;
    });
}
