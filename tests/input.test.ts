import { describe, it, expect, vi, afterEach } from "vitest";
import {
  defaultProfile,
  normalizeAxis,
  mapGamepad,
  validProfile,
  saveProfile,
  loadProfile,
} from "../src/input/controls";
describe("input normalization", () => {
  it("uses asymmetric endpoints around the captured center", () => {
    const b = {
      ...defaultProfile().bindings.roll,
      min: -0.8,
      center: 0.1,
      max: 0.9,
      deadzone: 0,
    };
    expect(normalizeAxis(-0.8, b)).toBe(-1);
    expect(normalizeAxis(0.1, b)).toBe(0);
    expect(normalizeAxis(0.9, b)).toBe(1);
  });
  it("handles full-range non-centering throttle and reversal", () => {
    const b = { ...defaultProfile().bindings.throttle, min: -0.7, max: 0.8 };
    expect(normalizeAxis(-0.7, b, true)).toBe(1);
    expect(normalizeAxis(0.8, b, true)).toBe(0);
    expect(normalizeAxis(0.05, b, true)).toBeCloseTo(0.5);
  });
  it("suppresses center noise, preserves endpoints and applies expo", () => {
    const b = { ...defaultProfile().bindings.roll, deadzone: 0.05, expo: 0.5 };
    expect(normalizeAxis(0.02, b)).toBe(0);
    expect(normalizeAxis(1, b)).toBe(1);
    expect(normalizeAxis(0.5, b)).toBeLessThan(0.5);
  });
  it("supports a custom transmitter axis order", () => {
    const p = defaultProfile("FS-i6 adapter");
    p.bindings.roll.axis = 2;
    p.bindings.pitch.axis = 0;
    p.bindings.throttle.axis = 1;
    p.bindings.yaw.axis = 3;
    const c = mapGamepad([0, -1, 1, 0], p);
    expect(c).toEqual({ roll: 1, pitch: 0, yaw: 0, throttle: 1 });
  });
  it("returns safe zeros for missing and nonfinite axes", () => {
    const p = defaultProfile();
    expect(mapGamepad([], p)).toEqual({
      roll: 0,
      pitch: 0,
      yaw: 0,
      throttle: 0,
    });
    expect(normalizeAxis(NaN, p.bindings.throttle, true)).toBe(0);
  });
  it("rejects broken calibration and untrusted profiles", () => {
    const p = defaultProfile();
    p.bindings.roll.min = p.bindings.roll.max;
    expect(validProfile(p)).toBe(false);
    expect(validProfile(null)).toBe(false);
    expect(validProfile({ version: 1, deviceId: "x", bindings: {} })).toBe(
      false,
    );
  });
});
describe("controller profile persistence", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("roundtrips a profile by device id", () => {
    const data = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      setItem: (k: string, v: string) => data.set(k, v),
      getItem: (k: string) => data.get(k),
    });
    const p = defaultProfile("adapter");
    p.bindings.yaw.axis = 4;
    expect(saveProfile(p)).toBe(true);
    expect(loadProfile("adapter")).toEqual(p);
    expect(loadProfile("other").deviceId).toBe("other");
  });
  it("survives unavailable storage", () => {
    vi.stubGlobal("localStorage", {
      setItem: () => {
        throw new Error();
      },
      getItem: () => {
        throw new Error();
      },
    });
    expect(saveProfile(defaultProfile())).toBe(false);
    expect(loadProfile("device")).toEqual(defaultProfile("device"));
  });
});

describe("device acquisition and interruption", () => {
  afterEach(() => vi.unstubAllGlobals());
  async function setup() {
    const win = new EventTarget(),
      doc = Object.assign(new EventTarget(), { hidden: false }),
      interrupt = vi.fn();
    vi.stubGlobal("window", win);
    vi.stubGlobal("document", doc);
    class TestElement {}
    vi.stubGlobal("Element", TestElement);
    vi.stubGlobal("HTMLElement", class extends TestElement {});
    vi.stubGlobal("navigator", { getGamepads: () => [] });
    const { InputManager } = await import("../src/input/controls");
    return { win, doc, interrupt, input: new InputManager(interrupt) };
  }
  it("keyboard pitch follows pull-back convention and blur clears held keys", async () => {
    const { input, win, interrupt } = await setup();
    win.dispatchEvent(Object.assign(new Event("keydown"), { code: "KeyS" }));
    expect(input.read(0.1).pitch).toBeGreaterThan(0);
    win.dispatchEvent(new Event("blur"));
    expect(input.read(0.1).pitch).toBe(0);
    expect(interrupt).toHaveBeenCalled();
  });
  it("an absent controller interrupts and returns zero throttle", async () => {
    const { input, interrupt } = await setup();
    input.source = "controller";
    expect(input.read(0.01).throttle).toBe(0);
    expect(interrupt).toHaveBeenCalledWith("No controller detected");
  });
  it("a disconnect interrupts the selected device only", async () => {
    const { input, win, interrupt } = await setup();
    input.deviceIndex = 2;
    win.dispatchEvent(
      Object.assign(new Event("gamepaddisconnected"), {
        gamepad: { index: 1 },
      }),
    );
    expect(interrupt).not.toHaveBeenCalled();
    win.dispatchEvent(
      Object.assign(new Event("gamepaddisconnected"), {
        gamepad: { index: 2 },
      }),
    );
    expect(interrupt).toHaveBeenCalled();
  });
  it("does not silently accept a replacement device at the same index", async () => {
    const { input, interrupt } = await setup();
    input.source = "controller";
    input.deviceIndex = 0;
    input.profile = defaultProfile("original");
    vi.stubGlobal("navigator", {
      getGamepads: () => [
        { connected: true, index: 0, id: "replacement", axes: [0, 0, 0, -1] },
      ],
    });
    expect(input.read(0.01).throttle).toBe(0);
    expect(interrupt).toHaveBeenCalled();
  });
});
