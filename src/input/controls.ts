import { clamp } from "../core/math";
import { cleanControls, type Controls } from "../core/simulation";
import { ownsKeyboard } from "./ui-focus";
export type Channel = keyof Controls;
/** Shared, read-only input surface for browser HID and the Arduino serial bridge. */
export interface InputDevice {
  id: string;
  index: number;
  connected: boolean;
  mapping: string;
  axes: readonly number[];
  buttons: readonly { value: number; pressed: boolean; touched: boolean }[];
  timestamp: number;
}
export interface AxisBinding {
  axis: number;
  min: number;
  center: number;
  max: number;
  reversed: boolean;
  deadzone: number;
  expo: number;
}
export interface ControllerProfile {
  version: 1;
  deviceId: string;
  bindings: Record<Channel, AxisBinding>;
}
export const channels: Channel[] = ["roll", "pitch", "yaw", "throttle"];
export function defaultProfile(id = ""): ControllerProfile {
  const binding = (axis: number, reversed = false): AxisBinding => ({
    axis,
    min: -1,
    center: 0,
    max: 1,
    reversed,
    deadzone: 0.04,
    expo: 0,
  });
  return {
    version: 1,
    deviceId: id,
    bindings: {
      roll: binding(0),
      pitch: binding(1),
      yaw: binding(2),
      throttle: binding(3, true),
    },
  };
}
export function normalizeAxis(
  raw: number,
  b: AxisBinding,
  throttle = false,
): number {
  if (!Number.isFinite(raw)) return 0;
  if (throttle) {
    const v = clamp((raw - b.min) / Math.max(0.001, b.max - b.min), 0, 1);
    return b.reversed ? 1 - v : v;
  }
  let v =
    raw >= b.center
      ? (raw - b.center) / Math.max(0.001, b.max - b.center)
      : (raw - b.center) / Math.max(0.001, b.center - b.min);
  v = clamp(v, -1, 1) * (b.reversed ? -1 : 1);
  v =
    Math.abs(v) <= b.deadzone
      ? 0
      : (Math.sign(v) * (Math.abs(v) - b.deadzone)) / (1 - b.deadzone);
  return (1 - b.expo) * v + b.expo * v * v * v;
}
export function mapGamepad(
  axes: readonly number[],
  profile: ControllerProfile,
): Controls {
  const c = {} as Controls;
  for (const ch of channels) {
    const b = profile.bindings[ch];
    c[ch] =
      axes[b.axis] === undefined
        ? 0
        : normalizeAxis(axes[b.axis], b, ch === "throttle");
  }
  return cleanControls(c);
}
export function validProfile(raw: unknown): raw is ControllerProfile {
  if (!raw || typeof raw !== "object") return false;
  const p = raw as ControllerProfile;
  return (
    p.version === 1 &&
    typeof p.deviceId === "string" &&
    channels.every((ch) => {
      const b = p.bindings?.[ch];
      return (
        b &&
        Number.isInteger(b.axis) &&
        b.axis >= 0 &&
        b.axis < 64 &&
        [b.min, b.center, b.max, b.deadzone, b.expo].every(Number.isFinite) &&
        b.min < b.max &&
        b.center >= b.min &&
        b.center <= b.max &&
        b.deadzone >= 0 &&
        b.deadzone < 0.5 &&
        b.expo >= 0 &&
        b.expo <= 1 &&
        typeof b.reversed === "boolean"
      );
    })
  );
}
export function saveProfile(p: ControllerProfile) {
  try {
    localStorage.setItem("rcforge.controller." + p.deviceId, JSON.stringify(p));
    return true;
  } catch {
    return false;
  }
}
export function loadProfile(
  id: string,
  fallback = defaultProfile(id),
): ControllerProfile {
  try {
    const p = JSON.parse(
      localStorage.getItem("rcforge.controller." + id) || "null",
    );
    if (validProfile(p) && p.deviceId === id) return p;
  } catch {
    /* unavailable browser storage */
  }
  return fallback;
}
export class InputManager {
  testBench = false;
  walking = false;
  active = true;
  source: "keyboard" | "controller" = "keyboard";
  keys = new Set<string>();
  throttle = 0.5;
  profile = defaultProfile();
  deviceIndex = -1;
  extraDevices: () => InputDevice[] = () => [];
  private keyboard = { roll: 0, pitch: 0, yaw: 0 };
  constructor(private onInterrupt: (reason: string) => void) {
    window.addEventListener("keydown", (e) => {
      if (!this.active || ownsKeyboard(e.target)) return;
      if (
        [
          "Space",
          "ShiftLeft",
          "ShiftRight",
          "Equal",
          "Minus",
          "NumpadAdd",
          "NumpadSubtract",
          "KeyI",
          "KeyJ",
          "KeyK",
          "KeyL",
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
          "KeyW",
          "KeyS",
          "KeyA",
          "KeyD",
          "KeyQ",
          "KeyE",
        ].includes(e.code)
      ) {
        e.preventDefault();
        this.keys.add(e.code);
        if (!e.repeat && this.source === "keyboard" && !this.testBench) {
          if (["Space", "Equal", "NumpadAdd"].includes(e.code))
            this.throttle = clamp(this.throttle + 0.05, 0, 1);
          if (
            ["ShiftLeft", "ShiftRight", "Minus", "NumpadSubtract"].includes(
              e.code,
            )
          )
            this.throttle = clamp(this.throttle - 0.05, 0, 1);
        }
      }
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));
    window.addEventListener("blur", () => {
      this.clear();
      onInterrupt("Paused — window lost focus");
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.clear();
        onInterrupt("Paused — tab hidden");
      }
    });
    window.addEventListener("gamepaddisconnected", (e) => {
      if (e.gamepad.index === this.deviceIndex) {
        this.clear();
        onInterrupt("Controller disconnected — reconnect and resume");
      }
    });
  }
  clear() {
    this.keys.clear();
    this.keyboard = { roll: 0, pitch: 0, yaw: 0 };
  }
  devices(): InputDevice[] {
    let pads: Gamepad[] = [];
    try {
      pads = Array.from(navigator.getGamepads?.() ?? []).filter(
        (p): p is Gamepad => p !== null && p.connected,
      );
    } catch {
      /* Serial input can still work if HID access is unavailable. */
    }
    return [...pads, ...this.extraDevices()];
  }
  selected(): InputDevice | undefined {
    return this.devices().find((p) => p.index === this.deviceIndex);
  }
  read(dt: number): Controls {
    if (this.source === "controller") {
      const device = this.selected();
      if (!device) {
        this.onInterrupt("No controller detected");
        return { roll: 0, pitch: 0, yaw: 0, throttle: 0 };
      }
      if (device.id !== this.profile.deviceId) {
        this.onInterrupt("Controller changed — select and calibrate it");
        return { roll: 0, pitch: 0, yaw: 0, throttle: 0 };
      }
      return mapGamepad(device.axes, this.profile);
    }
    const has = (...codes: string[]) =>
      codes.some(
        (c) =>
          this.keys.has(c) &&
          !(this.walking && ["KeyW", "KeyA", "KeyS", "KeyD"].includes(c)),
      )
        ? 1
        : 0;
    const target = {
      roll: has("ArrowRight", "KeyD") - has("ArrowLeft", "KeyA"),
      pitch: has("ArrowDown", "KeyS") - has("ArrowUp", "KeyW"),
      yaw: has("KeyE") - has("KeyQ"),
    };
    for (const ch of ["roll", "pitch", "yaw"] as const)
      this.keyboard[ch] +=
        (target[ch] - this.keyboard[ch]) * (1 - Math.exp(-dt * 9));
    if (!this.testBench)
      this.throttle = clamp(
        this.throttle +
          (has("Space", "Equal", "NumpadAdd") -
            has("ShiftLeft", "ShiftRight", "Minus", "NumpadSubtract")) *
            dt *
            0.35,
        0,
        1,
      );
    return { ...this.keyboard, throttle: this.throttle };
  }
}
