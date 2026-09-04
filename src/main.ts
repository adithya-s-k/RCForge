import "./view/flight-navigation.css";
import { createFlightNavigation } from "./view/flight-navigation";
import { setupArduino } from "./app/arduino";
import { renderBudget } from "./view/render-budget";
import {
  sceneries,
  airDensity,
  airKinematicViscosity,
  type SceneryId,
} from "./core/scenery";
import { powertrain } from "./core/powertrain";
import { batteryUsage } from "./core/components";
import largeQuadData from "../aircraft/quad-x-450.json";
import detailedQuadData from "../aircraft/quad-x-6s.json";
import { setupCatalog } from "./app/catalog";
import { ControllerActions, navigateSetting } from "./app/controller-actions";
import { rotate } from "./core/math";
import { placedLaunch, type Placement } from "./core/placement";
import { placementUI } from "./app/placement";
import "./style.css";
import "./workbench.css";
import "./view/position-panel.css";
import "./view/flight-feedback.css";
import { ZodError } from "zod";
import broncoData from "../aircraft/ft-bronco.json";
import quadData from "../aircraft/quad-x-5inch.json";
import tinyTrainerData from "../aircraft/ft-tiny-trainer.json";
import raptorData from "../aircraft/ft-22-raptor.json";
import trainerData from "../aircraft/simple-trainer.json";
import { workbenchMarkup } from "./view/workbench";
import { FlightScene, type CameraMode } from "./view/scene";
import { FlightAudio } from "./view/audio";
import { parseAircraft, type Aircraft } from "./core/schema";
import {
  Simulation,
  calmEnvironment,
  FIXED_DT,
  cleanControls,
  type Controls,
} from "./core/simulation";
import { massProperties } from "./core/aircraft";
import { findTrim } from "./core/trim";
import {
  fitLandingGear,
  launchState,
  launchTrim,
  type LaunchMode,
} from "./core/launch";
import { aircraftChannels } from "./app/aircraft-channels";
import {
  createRecording,
  parseRecording,
  sample,
  type Recording,
} from "./core/experiment";
import { InputManager } from "./input/controls";
import { ControllerPage } from "./app/controllers";
import { AircraftEditor } from "./app/editor";
import { setupExperiments } from "./app/experiments";
import { $, escape, download } from "./app/dom";
import { ownsKeyboard } from "./input/ui-focus";
import { flightAction, flightFeedback } from "./app/flight-session";
import { setupTabs } from "./app/tabs";
$("app").innerHTML = workbenchMarkup();
const flightOverlaySizes = new ResizeObserver((entries) => {
  for (const entry of entries) {
    const variable = entry.target.classList.contains("flight-bottom")
      ? "--flight-hud-height"
      : "--flight-guide-height";
    $("page-fly").style.setProperty(
      variable,
      `${entry.target.getBoundingClientRect().height}px`,
    );
  }
});
for (const selector of [".flight-bottom", ".flight-key-guide"])
  flightOverlaySizes.observe(document.querySelector(selector)!);
const originals = [
  parseAircraft(broncoData),
  parseAircraft(tinyTrainerData),
  parseAircraft(raptorData),
  parseAircraft(trainerData),
  parseAircraft(quadData),
  parseAircraft(detailedQuadData),
  parseAircraft(largeQuadData),
];
let baseline = originals[0],
  aircraft = structuredClone(baseline),
  environment = calmEnvironment(),
  mode: LaunchMode = "ground",
  page = "fly",
  running = false,
  started = false,
  replay: Recording | null = null,
  replayIndex = 0,
  pitchTrim = 0,
  accumulator = 0;
let placement: Placement | null = null;
const initialAircraft = physicalAircraft();
let sim = new Simulation(
    initialAircraft,
    environment,
    launchState(initialAircraft, mode),
  ),
  controls: Controls = { roll: 0, pitch: 0, yaw: 0, throttle: 0 },
  recording = createRecording(sim),
  editorSim = sim;
let scene: FlightScene | undefined;
let flightCamera: "ground" | "chase" = "ground";
let locatorUntil = 0;
const audio = new FlightAudio();
let pauseReason = "";
let notificationTimer: ReturnType<typeof setTimeout> | undefined;
function dismissNotification() {
  clearTimeout(notificationTimer);
  $("notification").hidden = true;
}
function message(text: string, persistent = false) {
  clearTimeout(notificationTimer);
  $("notification-text").textContent = text;
  $("notification").hidden = false;
  if (!persistent) notificationTimer = setTimeout(dismissNotification, 10000);
}
$("dismiss-notification").onclick = dismissNotification;
function errorText(e: unknown) {
  return e instanceof ZodError
    ? e.issues
        .slice(0, 3)
        .map((v) => v.path.join(".") + ": " + v.message)
        .join("; ")
    : e instanceof Error
      ? e.message
      : String(e);
}
function pause(reason?: string) {
  const wasRunning = running;
  running = false;
  accumulator = 0;
  document.body.dataset.running = "false";
  $("toggle-flight-setup").setAttribute(
    "aria-expanded",
    String(!$("page-fly").classList.contains("setup-collapsed")),
  );
  if (wasRunning) pauseReason = reason ?? "";
  audio.update(0, 0, false);
}
const input = new InputManager((reason) => pause(reason));
const controller = new ControllerPage(input, () => pause(), message);
const arduino = setupArduino(input, controller, pause);
function physicalAircraft() {
  return mode === "ground" ? fitLandingGear(aircraft) : aircraft;
}
function updateFlightInfo() {
  const a = physicalAircraft();
  const quad = a.vehicleType === "multirotor";
  document.querySelectorAll<HTMLButtonElement>("[data-launch]").forEach((b) => {
    b.disabled = quad && b.dataset.launch === "hand";
    b.classList.toggle("active", b.dataset.launch === mode);
    b.setAttribute("aria-pressed", String(b.dataset.launch === mode));
    if (b.dataset.launch === "airborne")
      b.textContent = quad ? "Hover" : "In flight";
  });
  const scenario = $<HTMLSelectElement>("scenario");
  for (const option of scenario.options) {
    option.disabled = quad && ["glide", "stall"].includes(option.value);
    if (option.value === "cruise")
      option.textContent = quad ? "Stationary hover" : "Trimmed cruise";
  }
  if (quad && ["glide", "stall"].includes(scenario.value))
    scenario.value = "cruise";
  $("experiment-description").textContent = quad
    ? "Starts in hover at 3 m with calculated power. Pitch and roll pulses test the configured controller. No altitude hold."
    : "Each aircraft starts at 12 m/s and 18 m with its own calculated trim. Field weather is retained.";
  $("flight-control-note").textContent = quad
    ? `${a.multirotor!.mode === "angle" ? "Self-leveling angle" : "Angular-rate"} control · manual throttle · estimated model`
    : "Unstabilized controls. Aircraft coefficients are estimates.";
  if (quad)
    $("launch-description").textContent =
      mode === "ground"
        ? "Start on landing feet. Increase power gradually; this quad has no altitude hold."
        : `Start in stationary hover at ${placement?.altitudeM ?? 3} m with calculated hover power.`;
  else
    $("launch-description").textContent =
      mode === "ground"
        ? "Start stationary on the ground. Build airspeed, then rotate."
        : mode === "hand"
          ? `Release at ${placement?.altitudeM ?? 1.7} m and 8.5 m/s, trimmed for a gentle climb.`
          : `Start at ${placement?.altitudeM ?? 22} m and 12 m/s with calculated trim.`;
  $("flight-mass").textContent =
    (massProperties(a).mass * 1000).toFixed(0) + " g";
  $("flight-model-info").textContent =
    `${a.name} · ${(a.reference.spanM * 1000).toFixed(0)} mm ${quad ? "motor diagonal" : "span"} · ${quad ? "Four rotors" : a.motors.length === 2 ? "Twin motor" : "Single motor"}`;
  $("flight-gear").textContent = quad
    ? "Four landing feet"
    : mode === "ground"
      ? "Removable tricycle (+45 g)"
      : "Belly landing";
}
function showScenery(env: typeof environment) {
  const id = (
    env.sceneryId && Object.hasOwn(sceneries, env.sceneryId)
      ? env.sceneryId
      : "club"
  ) as SceneryId;
  const site = sceneries[id];
  scene?.setScenery(id);
  $<HTMLSelectElement>("scenery-select").value = id;
  $("scenery-label").textContent = site.name.toUpperCase();
  $("scenery-conditions").textContent =
    `${site.temperatureC} °C · ${site.elevationM} m elevation · ${env.densityKgM3.toFixed(3)} kg/m³`;
}
function reset() {
  const cameraMode = flightCamera;
  showScenery(environment);
  pause();
  if (aircraft.vehicleType === "multirotor" && mode === "hand") mode = "ground";
  started = false;
  replay = null;
  replayIndex = 0;
  input.clear();
  const a = physicalAircraft(),
    trim = launchTrim(a, mode, environment);
  pitchTrim = trim.controls.pitch;
  sim = new Simulation(
    a,
    environment,
    placedLaunch(a, mode, placement, environment),
  );
  controls = {
    roll: 0,
    pitch: pitchTrim,
    yaw: 0,
    throttle: mode === "ground" ? 0 : trim.controls.throttle,
  };
  input.throttle = controls.throttle;
  sim.lastForces = sim.forces(sim.state, controls);
  recording = createRecording(sim);
  scene?.setAircraft(page === "aircraft" ? editor.draft : a);
  if (page === "aircraft") scene?.setCamera("orbit");
  else setFlightCamera(cameraMode);
  $<HTMLInputElement>("pitch-trim").value = String(Math.round(pitchTrim * 100));
  $("pitch-trim-value").textContent = Math.round(pitchTrim * 100) + "%";
  $("pause").hidden = false;
  $("launch").innerHTML = "Start flight";
  $("notification").hidden = true;
  $("throttle").toggleAttribute("disabled", input.source === "controller");
  updateFlightInfo();
  stats();
}
async function launch() {
  if (!scene) {
    message("WebGL is unavailable. Enable hardware acceleration to fly.");
    return;
  }
  if (!replay && !controller.ready()) {
    location.hash = "/controllers";
    return;
  }
  if (!replay && recording.frames.length >= 36000) {
    message("Recording limit reached. Export and reset.");
    return;
  }
  if (
    replay &&
    (replayIndex >= replay.frames.length ||
      sim.state.status === "crashed" ||
      sim.state.status === "landed")
  ) {
    sim = new Simulation(
      replay.aircraft,
      replay.environment,
      replay.initialState,
    );
    replayIndex = 0;
  } else if (
    !replay &&
    (sim.state.status === "crashed" || sim.state.status === "landed")
  )
    reset();
  positioning.close(false);
  running = true;
  started = true;
  accumulator = 0;
  input.clear();
  document.body.dataset.running = "true";
  $("page-fly").classList.add("setup-collapsed");
  $("pause").hidden = false;
  $("toggle-flight-setup").setAttribute("aria-expanded", "false");
  stats();
  $("notification").hidden = true;
  scene.renderer.domElement.focus();
  await audio.start();
}
function loadAircraft(a: Aircraft) {
  baseline = originals.find((v) => v.id === a.id) ?? a;
  aircraft = structuredClone(a);
  try {
    const saved = localStorage.getItem("rcforge.aircraft.v3." + a.id);
    if (saved) aircraft = parseAircraft(JSON.parse(saved));
  } catch {}
  editor.switchTo(aircraft);
  reset();
  invalidate();
  fillSelects();
}
function fillSelects() {
  for (const id of ["flight-aircraft", "editor-aircraft"]) {
    $(id).innerHTML = originals
      .map((a) => `<option value="${a.id}">${escape(a.name)}</option>`)
      .join("");
    $<HTMLSelectElement>(id).value = aircraft.id;
  }
}
const editor = new AircraftEditor(
  aircraft,
  (a) => {
    const unapplied =
      editor.hasPending || JSON.stringify(a) !== JSON.stringify(aircraft);
    $("editor-state").textContent = unapplied
      ? "Unapplied changes"
      : "Applied to flight";
    $("editor-state").classList.toggle("pending", unapplied);
    editorSim = new Simulation(a, calmEnvironment(), findTrim(a).state);
    editorSim.lastForces = editorSim.forces(
      editorSim.state,
      findTrim(a).controls,
    );
    if (page === "aircraft") scene?.setAircraft(a);
  },
  message,
);
const invalidate = setupExperiments(
  () => ({ baseline, aircraft, environment }),
  () => pause(),
);
function route() {
  positioning.close(false);
  const next = location.hash.replace(/^#\//, "") || "fly";
  window.scrollTo(0, 0);
  page = ["fly", "aircraft", "controllers", "experiments"].includes(next)
    ? next
    : "fly";
  pause();
  input.clear();
  input.active = page === "fly" || page === "controllers";
  for (const id of ["fly", "aircraft", "controllers", "experiments"])
    $("page-" + id).hidden = id !== page;
  document.querySelectorAll<HTMLAnchorElement>("[data-route]").forEach((a) => {
    a.classList.toggle("active", a.dataset.route === page);
    if (a.dataset.route === page) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  if (page === "fly") {
    $("flight-stage").append($("viewport"));
    scene?.setStudio(false);
    scene?.setAircraft(sim.aircraft);
    setFlightCamera(flightCamera);
  }
  if (page === "aircraft") {
    $("editor-stage").append($("viewport"));
    scene?.setStudio(true);
    scene?.setAircraft(editor.draft);
    if (scene) scene.showCG = $<HTMLInputElement>("show-cg").checked;
  }
  if (page === "controllers") controller.refresh();
  if (page === "experiments") {
    $("experiment-aircraft").textContent = aircraft.name;
    updateExperimentInfo();
  }
}
window.addEventListener("hashchange", route);
const positioning = placementUI({
  get: () => {
    const forward = rotate(sim.state.orientation, [1, 0, 0]);
    return {
      mode,
      position: sim.state.position,
      headingDeg:
        ((Math.atan2(forward[1], forward[0]) * 180) / Math.PI + 360) % 360,
      pilot: scene?.pilotMapPosition ?? { x: -8, z: -14 },
      pilotHeadingDeg: scene?.pilotHeadingDeg ?? 0,
      camera: scene?.mode ?? "ground",
      surface:
        sceneries[(environment.sceneryId ?? "club") as SceneryId].surface,
    };
  },
  apply: (p) => {
    placement = p;
    reset();
  },
  defaults: () => {
    const state = launchState(physicalAircraft(), mode, environment);
    return {
      northM: state.position[0],
      eastM: state.position[1],
      altitudeM: Math.max(0.3, -state.position[2]),
      headingDeg: 0,
    };
  },
  movePilot: (north, east) => {
    scene?.movePilotTo(north, east);
    setFlightCamera("ground");
  },
  pause: () => {
    pause();
    input.clear();
  },
  preview: (p) => scene?.previewPosition(p, mode === "ground"),
  focusView: () => scene?.renderer.domElement.focus(),
});
const updateNavigation = createFlightNavigation(() => {
  if (!positioning.isOpen()) positioning.open();
});
setupTabs($("flight-setup-tabs"), (id) => {
  document
    .querySelectorAll<HTMLElement>("[data-setup-panel]")
    .forEach((panel) => {
      panel.hidden = panel.dataset.setupPanel !== id;
    });
});
$("toggle-flight-setup").onclick = () => {
  positioning.close(false);
  const wasRunning = running;
  if (wasRunning) pause();
  const closed = wasRunning
    ? false
    : !$("page-fly").classList.contains("setup-collapsed");
  $("page-fly").classList.toggle("setup-collapsed", closed);
  $("toggle-flight-setup").setAttribute("aria-expanded", String(!closed));
};
$("close-flight-setup").onclick = () => {
  $("page-fly").classList.add("setup-collapsed");
  $("toggle-flight-setup").setAttribute("aria-expanded", "false");
  scene?.renderer.domElement.focus();
};
document.querySelectorAll<HTMLButtonElement>("[data-controller-tab]").forEach(
  (button) =>
    (button.onclick = () => {
      document.querySelector<HTMLElement>(
        ".controller-layout",
      )!.dataset.section = button.dataset.controllerTab;
      document
        .querySelectorAll<HTMLButtonElement>("[data-controller-tab]")
        .forEach((b) => {
          b.classList.toggle("active", b === button);
          b.setAttribute("aria-pressed", String(b === button));
        });
    }),
);
$("launch").onclick = () => void launch();
$("pause").onclick = () => {
  if (running) {
    pause();
    scene?.renderer.domElement.focus();
  } else void launch();
};
$("reset").onclick = () => {
  positioning.close(false);
  reset();
  scene?.renderer.domElement.focus();
};
document.querySelectorAll<HTMLButtonElement>("[data-launch]").forEach(
  (b) =>
    (b.onclick = () => {
      const next = b.dataset.launch as LaunchMode;
      if (next !== mode && placement) {
        const start = launchState(
          next === "ground" ? fitLandingGear(aircraft) : aircraft,
          next,
          environment,
        );
        placement = {
          ...placement,
          altitudeM: Math.max(0.3, -start.position[2]),
        };
      }
      mode = next;
      reset();
    }),
);
for (const id of ["flight-aircraft", "editor-aircraft"])
  $(id).onchange = () =>
    loadAircraft(
      originals.find((a) => a.id === $<HTMLSelectElement>(id).value)!,
    );
setupCatalog(
  () =>
    originals.map((a) => {
      if (a.id === aircraft.id) return aircraft;
      try {
        const saved = localStorage.getItem("rcforge.aircraft.v3." + a.id);
        if (saved) return parseAircraft(JSON.parse(saved));
      } catch {}
      return a;
    }),
  () => aircraft.id,
  () => {
    pause();
    input.clear();
  },
  loadAircraft,
);
function updateExperimentInfo() {
  const pending =
    editor.hasPending ||
    JSON.stringify(editor.draft) !== JSON.stringify(aircraft);
  $("experiment-aircraft").textContent = aircraft.name;
  $("experiment-draft-note").hidden = !pending;
  $("experiment-config").textContent =
    JSON.stringify(baseline) === JSON.stringify(aircraft)
      ? "Original configuration. Both traces will match until you apply an edit."
      : "Original model compared with your applied configuration.";
}
function applyDraft() {
  try {
    editor.commitPending();
    aircraft = parseAircraft(editor.draft);
    findTrim(aircraft);
    let stored = true;
    try {
      localStorage.setItem(
        "rcforge.aircraft.v3." + aircraft.id,
        JSON.stringify(aircraft),
      );
    } catch {
      stored = false;
    }
    $("editor-state").textContent = "Applied to flight";
    $("editor-state").classList.remove("pending");
    reset();
    if (page === "aircraft") {
      scene?.setStudio(true);
      scene?.setAircraft(editor.draft);
    }
    invalidate();
    updateExperimentInfo();
    message(
      stored
        ? "Aircraft saved locally and applied to flight."
        : "Aircraft applied. Browser storage unavailable; export JSON to keep your changes.",
    );
    return true;
  } catch (e) {
    message(errorText(e), true);
    return false;
  }
}
$("save-aircraft").onclick = () => {
  applyDraft();
};
$("apply-and-fly").onclick = () => {
  if (applyDraft()) location.hash = "/fly";
};
$("apply-experiment-draft").onclick = () => {
  if (applyDraft()) $("run-experiment").click();
};
$("restore-aircraft").onclick = () => {
  editor.set(baseline);
  message("Original aircraft restored in the editor. Apply to flight to save.");
};
$("export-aircraft").onclick = () => {
  try {
    editor.commitPending();
    download(editor.draft.id + ".json", JSON.stringify(editor.draft, null, 2));
  } catch (e) {
    message(errorText(e), true);
  }
};
$("import-aircraft-button").onclick = () => $("import-aircraft").click();
$<HTMLInputElement>("import-aircraft").onchange = async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  try {
    if (file.size > 1000000) throw new Error("Aircraft file exceeds 1 MB");
    const a = parseAircraft(JSON.parse(await file.text()));
    findTrim(a);
    const index = originals.findIndex((v) => v.id === a.id);
    if (index < 0) originals.push(a);
    baseline = a;
    aircraft = structuredClone(a);
    editor.set(a);
    fillSelects();
    reset();
    scene?.setStudio(true);
    scene?.setAircraft(a);
    invalidate();
    message(
      "Aircraft imported. Review mass, CG and assumptions before flight.",
    );
  } catch (e) {
    message(errorText(e), true);
  }
  (e.target as HTMLInputElement).value = "";
};
for (const id of ["wind-speed", "wind-direction", "gusts"])
  $(id).onchange = () => {
    const speed = Number($<HTMLInputElement>("wind-speed").value),
      angle =
        (Number($<HTMLSelectElement>("wind-direction").value) * Math.PI) / 180;
    if (!Number.isFinite(speed) || speed < 0 || speed > 12) {
      message("Wind speed must be between 0 and 12 m/s.");
      return;
    }
    environment = {
      ...environment,
      windMps: [-speed * Math.cos(angle), speed * Math.sin(angle), 0],
      gustMps: $<HTMLInputElement>("gusts").checked ? 1 : 0,
    };
    reset();
    invalidate();
  };
function setFlightCamera(camera: "ground" | "chase") {
  flightCamera = camera;
  scene?.setCamera(camera);
  document
    .querySelectorAll<HTMLButtonElement>("[data-camera]")
    .forEach((button) => {
      const selected = button.dataset.camera === camera;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  $("camera-description").textContent =
    camera === "chase"
      ? "Following aircraft · chase view"
      : "Pilot view · eye height 1.7 m";
}
function locateAircraft() {
  if (!scene) return;
  scene.locateAircraft();
  $<HTMLInputElement>("track-plane").checked = true;
  locatorUntil = performance.now() + 5000;
  scene.renderer.domElement.focus();
}
$("locate-aircraft").onclick = locateAircraft;
document
  .querySelectorAll<HTMLButtonElement>("[data-camera]")
  .forEach((button) => {
    button.onclick = (event) => {
      setFlightCamera(button.dataset.camera as "ground" | "chase");
      // Pointer users can keep flying immediately; keyboard activation keeps native focus.
      if (event.detail > 0) scene?.renderer.domElement.focus();
    };
  });
document.querySelectorAll<HTMLButtonElement>("[data-inspect]").forEach(
  (b) =>
    (b.onclick = () => {
      scene?.setInspectionView(
        b.dataset.inspect as "top" | "side" | "perspective",
      );
      document
        .querySelectorAll<HTMLButtonElement>("[data-inspect]")
        .forEach((v) => v.classList.toggle("active", v === b));
    }),
);
$("walk-mode").onchange = () => {
  input.walking = $<HTMLInputElement>("walk-mode").checked;
  if (scene) scene.walking = input.walking;
  input.clear();
};
$("track-plane").onchange = () => {
  if (scene) scene.trackAircraft = $<HTMLInputElement>("track-plane").checked;
};
$("show-cg").onchange = () => {
  if (scene) scene.showCG = $<HTMLInputElement>("show-cg").checked;
};
$("pilot-fov").oninput = () => {
  if (scene) {
    const value = Number($<HTMLInputElement>("pilot-fov").value);
    if (scene.mode === "chase") scene.chaseDistance = value;
    else scene.pilotFov = value;
  }
};
$("sound").onchange = () =>
  (audio.enabled = $<HTMLInputElement>("sound").checked);
$("throttle").oninput = () =>
  (input.throttle = Number($<HTMLInputElement>("throttle").value) / 100);
$("pitch-trim").oninput = () => {
  pitchTrim = Number($<HTMLInputElement>("pitch-trim").value) / 100;
  $("pitch-trim-value").textContent = Math.round(pitchTrim * 100) + "%";
};
$("help-button").onclick = () => {
  pause();
  $<HTMLDialogElement>("help").showModal();
};
$("close-help").onclick = () => $<HTMLDialogElement>("help").close();
window.addEventListener("keydown", (e) => {
  if (e.defaultPrevented) return;
  if (e.code === "Escape" && positioning.isOpen()) {
    e.preventDefault();
    positioning.close();
    return;
  }
  if (page !== "fly" || ownsKeyboard(e.target)) return;
  if (e.code === "KeyF" && !e.repeat) locateAircraft();
  if (e.code === "KeyV" && !e.repeat)
    setFlightCamera(flightCamera === "ground" ? "chase" : "ground");
  if (e.code === "KeyP" && !e.repeat) {
    e.preventDefault();
    if (running) pause();
    else void launch();
  }
  if (
    !e.repeat &&
    (["KeyI", "KeyJ", "KeyK", "KeyL"].includes(e.code) ||
      (input.walking && ["KeyW", "KeyA", "KeyS", "KeyD"].includes(e.code)))
  )
    scene?.moveObserver(new Set([e.code]), 1 / 30);
  if (e.code === "Enter" && !e.repeat) {
    e.preventDefault();
    if (!running) void launch();
  }
  if (e.code === "KeyX" && input.source === "keyboard") input.throttle = 0;
  if (e.code === "KeyR" && !e.repeat) {
    positioning.close(false);
    reset();
  }
});
$("export-flight").onclick = () =>
  download(recording.aircraft.id + "-flight.json", JSON.stringify(recording));
$("import-replay-button").onclick = () => $("import-replay").click();
$<HTMLInputElement>("import-replay").onchange = async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  try {
    if (file.size > 15000000) throw new Error("Recording exceeds 15 MB");
    const r = parseRecording(JSON.parse(await file.text())),
      next = new Simulation(r.aircraft, r.environment, r.initialState);
    pause();
    replay = r;
    replayIndex = 0;
    recording = r;
    sim = next;
    controls = r.frames[0]
      ? cleanControls(r.frames[0])
      : { roll: 0, pitch: 0, yaw: 0, throttle: 0 };
    sim.lastForces = sim.forces(sim.state, controls);
    scene?.setAircraft(r.aircraft);
    showScenery(r.environment);
    $("throttle").setAttribute("disabled", "");
    location.hash = "/fly";
    $("launch").textContent = "Play recording";
    message("Recording ready. Begin playback from the pilot station.");
  } catch (e) {
    message(errorText(e), true);
  }
  (e.target as HTMLInputElement).value = "";
};
$("scenery-select").onchange = () => {
  const id = $<HTMLSelectElement>("scenery-select").value as SceneryId;
  const site = sceneries[id];
  environment = {
    ...environment,
    sceneryId: id,
    surface: site.surface,
    densityKgM3: airDensity(site.temperatureC, site.elevationM),
    kinematicViscosityM2S: airKinematicViscosity(
      site.temperatureC,
      airDensity(site.temperatureC, site.elevationM),
    ),
  };
  reset();
  invalidate();
};
function stats() {
  const session = {
    running,
    started,
    status: sim.state.status,
    replay: !!replay,
    replayComplete: !!replay && replayIndex >= replay.frames.length,
    inputReady: input.source === "keyboard" || !!input.selected(),
  };
  const action = flightAction(session);
  const feedback = flightFeedback({
    ...session,
    mode,
    keyboard: input.source === "keyboard",
    quad: sim.aircraft.vehicleType === "multirotor",
    pauseReason,
  });
  $("flight-feedback").dataset.tone = feedback.tone;
  for (const [id, value] of [
    ["flight-cue-title", feedback.title],
    ["flight-cue-detail", feedback.detail],
    ["flight-model-label", sim.aircraft.name],
  ]) {
    if ($(id).textContent !== value) $(id).textContent = value;
  }
  $("flight-cue-detail").hidden = !feedback.detail;
  const hint =
    input.source === "keyboard"
      ? running
        ? "P"
        : "Enter"
      : controllerActions.hint("toggle");
  for (const id of ["pause", "launch"]) {
    const button = $(id);
    const label = `${action}${hint ? ` <kbd>${escape(hint)}</kbd>` : ""}`;
    if (button.innerHTML !== label) button.innerHTML = label;
    button.setAttribute("aria-label", action);
  }
  $("pause").classList.toggle("primary", !running);
  $("flight-input-status").textContent =
    input.source === "keyboard"
      ? "Ready · Space raises power, Shift lowers it."
      : input.selected()
        ? "Connected · Check mapping before launch."
        : "No input detected. Connect your device or choose Keyboard.";
  const power = powertrain(
    sim.aircraft,
    sim.state.motors,
    sim.state.batterySoc,
    sim.environment.densityKgM3,
  );
  $("battery-telemetry").hidden = !sim.aircraft.battery;
  $("battery-hud").hidden = !sim.aircraft.battery;
  $("battery-hud-soc").textContent = `${(power.soc * 100).toFixed(0)}%`;
  $("battery-hud-voltage").textContent =
    `${power.voltage.toFixed(1)} V · ${power.current.toFixed(1)} A`;
  $("battery-hud").classList.toggle("low-battery", power.soc < 0.2);
  const usage = batteryUsage(sim.aircraft, power.soc, power.current);
  $("battery-hud").title = usage
    ? `${usage.usedMah.toFixed(0)} mAh used · ${usage.remainingMah.toFixed(0)} mAh remaining${usage.minutesToReserve === null ? "" : ` · about ${usage.minutesToReserve.toFixed(1)} min to 20% at this current`}. Model estimate; load changes in flight.`
    : "";
  if (sim.aircraft.battery)
    $("battery-telemetry").textContent =
      `${sim.aircraft.battery.cells}S ${sim.aircraft.battery.chemistry} · ${(power.soc * 100).toFixed(0)}% · ${power.voltage.toFixed(1)} V · ${power.current.toFixed(1)} A · ${usage!.usedMah.toFixed(0)} / ${sim.aircraft.battery.capacityMah} mAh used`;

  const s = sim.state;
  $("speed").textContent = sim.lastForces.airspeed.toFixed(1);
  $("altitude").textContent = (-s.position[2]).toFixed(1);
  $("distance").textContent = Math.hypot(
    s.position[0] - (scene?.pilotPosition.x ?? -8),
    s.position[1] - (scene?.pilotPosition.z ?? -14),
  ).toFixed(0);
  $("vertical-speed").textContent = (-s.velocity[2]).toFixed(1);
  $("throttle-value").textContent =
    Math.round(
      (running || replay || input.source === "controller"
        ? controls.throttle
        : input.throttle) * 100,
    ) + "%";
  $<HTMLInputElement>("throttle").value = String(
    (running || replay || input.source === "controller"
      ? controls.throttle
      : input.throttle) * 100,
  );
  $("flight-clock").textContent = `${Math.floor(s.time / 60)
    .toString()
    .padStart(2, "0")}:${(s.time % 60).toFixed(1).padStart(4, "0")}`;
  $("flight-status").textContent =
    s.status === "crashed"
      ? "IMPACT"
      : s.status === "landed"
        ? "LANDED"
        : running
          ? replay
            ? "REPLAY"
            : s.status === "grounded"
              ? "GROUND ROLL"
              : "IN FLIGHT"
          : started
            ? "PAUSED"
            : "READY";
  $("stall-warning").hidden =
    !running ||
    s.status !== "flying" ||
    sim.lastForces.airspeed < 3 ||
    !sim.lastForces.surfaces.some((f) => f.kind === "wing" && f.stalled);
  if (scene) {
    const chase = scene.mode === "chase",
      slider = $<HTMLInputElement>("pilot-fov");
    $("view-range-label").textContent = chase
      ? "Follow distance"
      : "View angle";
    slider.min = chase ? "2" : "20";
    slider.max = chase ? "20" : "80";
    slider.step = chase ? "0.1" : "1";
    $("fov-value").textContent = chase
      ? scene.chaseDistance.toFixed(1) + " m"
      : Math.round(scene.pilotFov) + "°";
    slider.value = String(chase ? scene.chaseDistance : scene.pilotFov);
  }
}
$("quick-input").onclick = () => {
  positioning.close(false);
  pause();
  $("page-fly").classList.remove("setup-collapsed");
  $("toggle-flight-setup").setAttribute("aria-expanded", "true");
  $<HTMLButtonElement>("setup-tab-input").click();
  $("flight-input-type").focus();
};
$("quick-guide").onclick = () => $("help-button").click();
$("flight-input-type").onchange = () => {
  pause();
  input.clear();
  controller.selectType(
    $<HTMLSelectElement>("flight-input-type")
      .value as import("./app/controllers").InputType,
  );
};
const controllerActions = new ControllerActions(input, (action) => {
  if (
    ["next", "previous", "activate", "decrease", "increase"].includes(action)
  ) {
    navigateSetting(action);
    return;
  }
  if (controller.calibrating) return;
  if (action === "settings") {
    pause();
    location.hash = page === "controllers" ? "#/fly" : "#/controllers";
    return;
  }
  if (page !== "fly" || (positioning.isOpen() && action !== "camera")) return;
  if (action === "reset") reset();
  if (action === "toggle") {
    if (running) pause();
    else void launch();
  }
  if (action === "camera")
    document
      .querySelector<HTMLButtonElement>(
        `[data-camera="${scene?.mode === "chase" ? "ground" : "chase"}"]`,
      )
      ?.click();
});
let previous = 0,
  lastDraw = 0,
  drawAccumulator = 0,
  lastUI = 0;
function frame(now: number) {
  const dt = Math.min((now - previous) / 1000 || 0, 0.05);
  previous = now;
  try {
    arduino.poll();
    controllerActions.update(
      document.hasFocus() && !document.querySelector("dialog[open]"),
    );
    if (!running && page === "fly" && input.source === "keyboard" && !replay)
      input.read(dt);
    if (running && page === "fly") {
      accumulator += dt;
      while (accumulator >= FIXED_DT && running) {
        if (replay) {
          if (replayIndex >= replay.frames.length) {
            pause();
            message("Replay complete. Begin flight to replay again, or reset.");
            break;
          }
          controls = replay.frames[replayIndex++];
        } else {
          const raw = input.read(FIXED_DT);
          if (!running) break;
          controls = cleanControls({
            ...raw,
            pitch:
              pitchTrim +
              raw.pitch * (raw.pitch >= 0 ? 1 - pitchTrim : 1 + pitchTrim),
          });
        }
        sim.step(controls);
        accumulator -= FIXED_DT;
        if (!replay) {
          recording.frames.push({ ...controls });
          if (recording.frames.length % 12 === 0)
            recording.samples.push(sample(sim, controls));
          if (recording.frames.length >= 36000) {
            pause();
            message("Recording limit reached. Export and reset.");
          }
        }
        if (["crashed", "landed"].includes(sim.state.status)) {
          pause();
        }
      }
    }
    if (page === "fly") scene?.moveObserver(input.keys, dt);
    const activeView =
      running || input.keys.size > 0 || scene?.needsSmoothMotion;
    const renderInterval =
      1000 / (activeView ? 60 : renderBudget.idleFramesPerSecond);
    drawAccumulator += dt * 1000;
    if (drawAccumulator >= renderInterval - 0.5) {
      const viewDt = Math.min((now - lastDraw) / 1000, 0.1);
      if (page === "fly") {
        scene?.render(sim, controls, viewDt);
        const target =
          now < locatorUntil
            ? scene?.aircraftScreenPoint(sim.state.position)
            : null;
        $("aircraft-locator").hidden = !target;
        if (target) {
          $("aircraft-locator").style.left = `${target.x}%`;
          $("aircraft-locator").style.top = `${target.y}%`;
          $("locator-distance").textContent = `${target.distance.toFixed(0)} m`;
        }
      } else if (page === "aircraft")
        scene?.render(
          editorSim,
          { roll: 0, pitch: 0, yaw: 0, throttle: 0 },
          viewDt,
        );
      drawAccumulator =
        Math.max(0, drawAccumulator - renderInterval) % renderInterval;
      lastDraw = now;
    }
    audio.update(
      controls.throttle,
      Math.hypot(
        sim.state.position[0] - (scene?.camera.position.x ?? -8),
        sim.state.position[1] - (scene?.camera.position.z ?? -14),
      ),
      running && page === "fly",
    );
    if (now - lastUI > 100) {
      stats();
      positioning.update();
      if (page === "fly")
        updateNavigation(sim.state, scene?.pilotPosition ?? { x: -8, z: -14 });
      const hardware = input.source === "controller";
      const source = hardware
        ? controller.type === "transmitter"
          ? "RC transmitter"
          : controller.type === "joystick"
            ? "Flight stick"
            : "Gamepad"
        : "Keyboard";
      $("quick-input").textContent =
        `${source}${hardware && !input.selected() ? " · disconnected" : ""} ▾`;
      $("quick-input").classList.toggle(
        "input-offline",
        hardware && !input.selected(),
      );
      const bindings = hardware
        ? aircraftChannels(aircraft)
            .map(
              (ch) =>
                `<span><kbd>A${input.profile.bindings[ch].axis + 1}</kbd> ${ch}</span>`,
            )
            .join("")
        : aircraftChannels(aircraft)
            .map(
              (ch) =>
                ({
                  pitch: "<span><kbd>↑ ↓</kbd> Pitch</span>",
                  roll: "<span><kbd>← →</kbd> Roll</span>",
                  yaw: "<span><kbd>Q E</kbd> Yaw</span>",
                  throttle:
                    '<span class="power-hint"><kbd>Space</kbd> Power + <kbd>Shift</kbd> −</span>',
                })[ch],
            )
            .join("");
      if ($("flight-input-guide").innerHTML !== bindings)
        $("flight-input-guide").innerHTML = bindings;
      const resetHint = hardware ? controllerActions.hint("reset") : "R";
      const resetLabel = `Reset${resetHint ? ` <kbd>${escape(resetHint)}</kbd>` : ""}`;
      if ($("reset").innerHTML !== resetLabel)
        $("reset").innerHTML = resetLabel;
      $("reset").setAttribute("aria-label", "Reset flight");
      if (page === "controllers") controller.update();
      lastUI = now;
    }
  } catch (e) {
    pause();
    message(errorText(e), true);
  }
  requestAnimationFrame(frame);
}
try {
  scene = new FlightScene($("viewport"));
  scene.onInspectionView = (view) => {
    document
      .querySelectorAll<HTMLButtonElement>("[data-inspect]")
      .forEach((button) => {
        const selected = button.dataset.inspect === view;
        button.classList.toggle("active", selected);
        button.setAttribute("aria-pressed", String(selected));
      });
  };
  scene.onGroundPick = (north, east) => positioning.pickGround(north, east);
} catch (e) {
  message("3D rendering unavailable: " + errorText(e), true);
}
fillSelects();
loadAircraft(baseline);
$("scenery-select").dispatchEvent(new Event("change"));
// Start beside the parked aircraft, before the first rendered frame.
scene?.pilotPosition.set(
  sim.state.position[0] - 2,
  1.7,
  sim.state.position[1] - 3,
);
route();
controller.selectType("keyboard");
requestAnimationFrame(frame);
