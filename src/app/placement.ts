import { $ } from "./dom";
import { validatePlacement, type Placement } from "../core/placement";
import type { LaunchMode } from "../core/launch";

type Target = "aircraft" | "pilot";
interface PositionOptions {
  get: () => {
    mode: LaunchMode;
    position: number[];
    headingDeg: number;
    pilot: { x: number; z: number };
    pilotHeadingDeg: number;
    camera: string;
    surface: string;
  };
  apply: (p: Placement | null) => void;
  defaults: () => Placement;
  movePilot: (north: number, east: number) => void;
  pause: () => void;
  preview: (p: Placement | null) => void;
  focusView: () => void;
}
const clamp = (n: number, low: number, high: number) =>
  Math.max(low, Math.min(high, n));
const wrap = (n: number) => ((n % 360) + 360) % 360;

/** One map for the launch point and the observer. Aircraft edits are drafts; observer moves are live. */
export function placementUI(options: PositionOptions) {
  const panel = $("position-panel");
  const map = document.getElementById(
    "position-map",
  ) as unknown as SVGSVGElement;
  let target: Target = "aircraft";
  let draft: Placement = { northM: 0, eastM: 0, altitudeM: 1.7, headingDeg: 0 };
  let dirty = false;
  let radius = 95,
    centerNorth = 35,
    centerEast = 0;
  let dragging: {
    id: number;
    pin: Target | null;
    x: number;
    y: number;
    north: number;
    east: number;
    cn: number;
    ce: number;
    matrix: DOMMatrix;
    moved: boolean;
    dx: number;
    dy: number;
  } | null = null;
  const number = (id: string) => $<HTMLInputElement>(id).valueAsNumber;
  const writeCoordinates = (north: number, east: number) => {
    $<HTMLInputElement>("place-north").value = north.toFixed(1);
    $<HTMLInputElement>("place-east").value = east.toFixed(1);
  };
  const setMessage = (message: string) => {
    $("position-feedback").textContent = message;
  };
  const setError = (message = "") => {
    $("position-error").textContent = message;
  };
  const markerTransform = (north: number, east: number, heading = 0) =>
    "translate(" +
    east +
    " " +
    -north +
    ") rotate(" +
    heading +
    ") scale(" +
    radius / 180 +
    ")";
  const draw = () => {
    const state = options.get();
    map.setAttribute(
      "viewBox",
      [
        centerEast - radius,
        -centerNorth - radius * 0.7,
        radius * 2,
        radius * 1.4,
      ].join(" "),
    );
    $("position-aircraft").setAttribute(
      "transform",
      markerTransform(draft.northM, draft.eastM, draft.headingDeg),
    );
    $("position-aircraft-actual").setAttribute(
      "transform",
      markerTransform(state.position[0], state.position[1], state.headingDeg),
    );
    $("position-aircraft-actual").style.display = dirty ? "" : "none";
    $("position-pilot").setAttribute(
      "transform",
      markerTransform(state.pilot.x, state.pilot.z, state.pilotHeadingDeg),
    );
    $("position-sightline").setAttribute(
      "d",
      "M" +
        state.pilot.z +
        " " +
        -state.pilot.x +
        "L" +
        draft.eastM +
        " " +
        -draft.northM,
    );
    $("position-sightline").setAttribute("stroke-width", String(radius / 180));
    $("position-sightline").setAttribute(
      "stroke-dasharray",
      [radius / 35, radius / 45].join(" "),
    );
    const width = map.getBoundingClientRect().width;
    $("position-map-scale").textContent =
      Math.round((radius * 2 * 58) / Math.max(1, width)) + " m";
    $("position-map-runway").setAttribute(
      "fill",
      state.surface === "asphalt"
        ? "#778187"
        : state.surface === "dirt"
          ? "#aa8e69"
          : "#73865b",
    );
    $("position-pending").hidden = !dirty;
    const values = [
      number("place-north"),
      number("place-east"),
      number("place-height"),
    ];
    const valid =
      values.every(Number.isFinite) &&
      Math.abs(values[0]) <= 2000 &&
      Math.abs(values[1]) <= 2000 &&
      (state.mode === "ground" || (values[2] >= 0.3 && values[2] <= 1000));
    $("apply-placement").toggleAttribute("disabled", !dirty || !valid);
    $("position-coordinate-summary").textContent =
      "N " +
      (target === "aircraft" ? draft.northM : state.pilot.x).toFixed(0) +
      " · E " +
      (target === "aircraft" ? draft.eastM : state.pilot.z).toFixed(0);
    $("place-heading-value").textContent =
      String(Math.round(draft.headingDeg)).padStart(3, "0") +
      "° " +
      ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][
        Math.round(draft.headingDeg / 45) % 8
      ];
    $("track-plane").toggleAttribute("disabled", state.camera !== "ground");
    $("walk-mode").toggleAttribute("disabled", state.camera !== "ground");
  };
  const fit = () => {
    const p = options.get().pilot;
    centerNorth = (draft.northM + p.x) / 2;
    centerEast = (draft.eastM + p.z) / 2;
    radius = clamp(
      Math.max(
        Math.abs(draft.eastM - p.z) * 0.75,
        Math.abs(draft.northM - p.x) * 1.05,
        35,
      ),
      20,
      2200,
    );
    draw();
  };
  const showTarget = (next: Target) => {
    target = next;
    map.append($("position-" + target));
    document
      .querySelectorAll<HTMLButtonElement>("[data-position-target]")
      .forEach((button) => {
        const selected = button.dataset.positionTarget === target;
        button.classList.toggle("active", selected);
        button.setAttribute("aria-pressed", String(selected));
      });
    for (const pin of ["aircraft", "pilot"] as const)
      $("position-" + pin).classList.toggle("selected", pin === target);
    $("position-aircraft-tools").hidden = target !== "aircraft";
    $("position-pilot-tools").hidden = target !== "pilot";
    $("apply-placement").hidden = target !== "aircraft";
    $("position-done").hidden = target !== "pilot";
    $("default-placement").hidden = target !== "aircraft";
    const p = options.get().pilot;
    writeCoordinates(
      target === "aircraft" ? draft.northM : p.x,
      target === "aircraft" ? draft.eastM : p.z,
    );
    $("position-map-hint").textContent =
      "Drag markers · click to " +
      (target === "aircraft" ? "place aircraft" : "move here");
    map.setAttribute(
      "aria-description",
      "Drag the background to pan. Arrow keys move the selected marker one metre; hold Shift for ten metres.",
    );
    setMessage(
      target === "pilot"
        ? "Pilot eye height · 1.7 m"
        : dirty
          ? "Preview · placing restarts the flight"
          : "Choose a new start position",
    );
    setError();
    draw();
  };
  const changedAircraft = () => {
    dirty = true;
    setError();
    $<HTMLInputElement>("place-heading").value = String(draft.headingDeg);
    if (target === "aircraft") writeCoordinates(draft.northM, draft.eastM);
    options.preview(draft);
    setMessage("Preview · placing restarts the flight");
    draw();
  };
  const placePoint = (north: number, east: number) => {
    north = clamp(north, -2000, 2000);
    east = clamp(east, -2000, 2000);
    if (target === "aircraft") {
      draft = { ...draft, northM: north, eastM: east };
      changedAircraft();
    } else {
      options.movePilot(north, east);
      writeCoordinates(north, east);
      setError();
      setMessage("Viewpoint moved · aircraft unchanged");
      draw();
    }
  };
  const close = (focus = true) => {
    panel.hidden = true;
    $("open-placement").setAttribute("aria-expanded", "false");
    options.preview(null);
    if (focus) options.focusView();
  };
  const open = () => {
    if (!panel.hidden) {
      close();
      return;
    }
    options.pause();
    const state = options.get();
    draft = {
      northM: state.position[0],
      eastM: state.position[1],
      altitudeM: Math.max(0.3, -state.position[2]),
      headingDeg: wrap(state.headingDeg),
    };
    dirty = false;
    panel.hidden = false;
    $("open-placement").setAttribute("aria-expanded", "true");
    $("page-fly").classList.add("setup-collapsed");
    $("toggle-flight-setup").setAttribute("aria-expanded", "false");
    $("position-height-control").hidden = state.mode === "ground";
    $("position-ground-note").hidden = state.mode !== "ground";
    $<HTMLInputElement>("place-heading").value = String(draft.headingDeg);
    $<HTMLInputElement>("place-height").value = draft.altitudeM.toFixed(1);
    showTarget(target);
    fit();
    document
      .querySelector<HTMLButtonElement>(
        '[data-position-target="' + target + '"]',
      )
      ?.focus();
  };
  $("open-placement").onclick = open;
  $("close-position").onclick = () => close();
  $("position-done").onclick = () => close();
  document
    .querySelectorAll<HTMLButtonElement>("[data-position-target]")
    .forEach(
      (b) => (b.onclick = () => showTarget(b.dataset.positionTarget as Target)),
    );
  $("position-zoom-in").onclick = () => {
    radius = clamp(radius / 1.5, 20, 2200);
    draw();
  };
  $("position-zoom-out").onclick = () => {
    radius = clamp(radius * 1.5, 20, 2200);
    draw();
  };
  $("position-fit").onclick = fit;
  map.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      radius = clamp(radius * Math.exp(e.deltaY * 0.0015), 20, 2200);
      draw();
    },
    { passive: false },
  );
  map.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    const inverse = map.getScreenCTM()?.inverse();
    if (!inverse) return;
    const pin = (e.target as Element).closest<SVGGElement>(
      "[data-position-pin]",
    )?.dataset.positionPin as Target | undefined;
    if (pin) showTarget(pin);
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(inverse);
    const actual = options.get().pilot;
    dragging = {
      id: e.pointerId,
      pin: pin ?? null,
      x: e.clientX,
      y: e.clientY,
      north: -p.y,
      east: p.x,
      cn: centerNorth,
      ce: centerEast,
      matrix: inverse,
      moved: false,
      dx: (target === "aircraft" ? draft.eastM : actual.z) - p.x,
      dy: (target === "aircraft" ? draft.northM : actual.x) + p.y,
    };
    map.setPointerCapture(e.pointerId);
    map.focus();
    e.preventDefault();
  });
  map.addEventListener("pointermove", (e) => {
    if (!dragging || dragging.id !== e.pointerId) return;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(
      dragging.matrix,
    );
    if (Math.hypot(e.clientX - dragging.x, e.clientY - dragging.y) > 4)
      dragging.moved = true;
    if (dragging.pin) placePoint(-p.y + dragging.dy, p.x + dragging.dx);
    else if (dragging.moved) {
      centerNorth = clamp(dragging.cn + p.y + dragging.north, -2000, 2000);
      centerEast = clamp(dragging.ce - p.x + dragging.east, -2000, 2000);
      draw();
    }
  });
  map.addEventListener("pointerup", (e) => {
    if (!dragging || dragging.id !== e.pointerId) return;
    if (!dragging.pin && !dragging.moved)
      placePoint(dragging.north, dragging.east);
    dragging = null;
    map.releasePointerCapture(e.pointerId);
  });
  map.addEventListener("pointercancel", () => {
    dragging = null;
  });
  map.addEventListener("keydown", (e) => {
    const pin = (e.target as Element).closest<SVGGElement>(
      "[data-position-pin]",
    )?.dataset.positionPin as Target | undefined;
    if (pin && pin !== target) showTarget(pin);
    if (["Enter", " "].includes(e.key) && pin) {
      e.preventDefault();
      e.stopPropagation();
      showTarget(pin);
      return;
    }
    if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key))
      return;
    e.preventDefault();
    e.stopPropagation();
    const p = options.get().pilot,
      step = e.shiftKey ? 10 : 1;
    const north = target === "aircraft" ? draft.northM : p.x,
      east = target === "aircraft" ? draft.eastM : p.z;
    placePoint(
      north + (e.key === "ArrowUp" ? step : e.key === "ArrowDown" ? -step : 0),
      east +
        (e.key === "ArrowRight" ? step : e.key === "ArrowLeft" ? -step : 0),
    );
  });
  for (const id of ["place-north", "place-east"])
    $(id).oninput = () => {
      const north = number("place-north"),
        east = number("place-east");
      if (
        ![north, east].every(Number.isFinite) ||
        Math.abs(north) > 2000 ||
        Math.abs(east) > 2000
      ) {
        setError("Enter north and east between −2,000 and 2,000 m.");
        $("apply-placement").toggleAttribute("disabled", true);
        return;
      }
      // Keep the field being edited intact, including an unfinished minus/decimal.
      const focused = document.activeElement as HTMLInputElement;
      const value = focused.value;
      placePoint(north, east);
      focused.value = value;
    };
  $("place-heading").oninput = () => {
    draft.headingDeg = number("place-heading");
    changedAircraft();
  };
  $("place-height").oninput = () => {
    const height = number("place-height");
    if (!Number.isFinite(height) || height < 0.3 || height > 1000) {
      setError("Launch height must be 0.3–1,000 m.");
      $("apply-placement").toggleAttribute("disabled", true);
      return;
    }
    draft.altitudeM = height;
    const value = $<HTMLInputElement>("place-height").value;
    changedAircraft();
    $<HTMLInputElement>("place-height").value = value;
  };
  $("place-runway").onclick = () => {
    draft.headingDeg = 0;
    placePoint(-30, 0);
    fit();
  };
  $("place-near-me").onclick = () => {
    const state = options.get(),
      p = state.pilot;
    draft.headingDeg = Math.round(state.pilotHeadingDeg) % 360;
    const angle = (draft.headingDeg * Math.PI) / 180;
    placePoint(p.x + Math.cos(angle) * 5, p.z + Math.sin(angle) * 5);
    fit();
  };
  $("stand-near").onclick = () => {
    const p = options.get().position;
    options.movePilot(p[0] - 2, p[1] - 3);
    writeCoordinates(p[0] - 2, p[1] - 3);
    setError();
    setMessage("Standing beside aircraft");
    fit();
  };
  $("pilot-home").onclick = () => {
    options.movePilot(-8, -14);
    writeCoordinates(-8, -14);
    setError();
    setMessage("Back at the flight line");
    fit();
  };
  $("default-placement").onclick = () => {
    draft = options.defaults();
    $<HTMLInputElement>("place-height").value = draft.altitudeM.toFixed(1);
    changedAircraft();
    fit();
  };
  $("apply-placement").onclick = () => {
    try {
      // Validate the visible values, never stale values from a previous valid draft.
      const p = validatePlacement({
        ...draft,
        northM: number("place-north"),
        eastM: number("place-east"),
        altitudeM:
          options.get().mode === "ground" ? 0.3 : number("place-height"),
      });
      options.apply(p);
      dirty = false;
      options.preview(null);
      setError();
      setMessage("Aircraft placed · ready to fly");
      fit();
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    }
  };
  return {
    open,
    close,
    isOpen: () => !panel.hidden,
    pickGround: (north: number, east: number) => {
      if (!panel.hidden) placePoint(north, east);
    },
    update: () => {
      if (panel.hidden || dragging) return;
      if (
        target === "pilot" &&
        !["place-north", "place-east"].includes(
          document.activeElement?.id ?? "",
        )
      ) {
        const p = options.get().pilot;
        writeCoordinates(p.x, p.z);
      }
      draw();
    },
  };
}
