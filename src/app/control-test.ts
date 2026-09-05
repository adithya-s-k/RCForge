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
}
export function updateControlTest(preview: ControlPreview, status: string) {
  $("control-test-status").textContent = status;
  const a = preview.aircraft;
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
