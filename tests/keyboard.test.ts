import { it, expect, vi, afterEach } from "vitest";
import { InputManager } from "../src/input/controls";
import trainer from "../aircraft/vt-simple-trainer.json";
import { parseAircraft } from "../src/core/schema";
import { Simulation, calmEnvironment } from "../src/core/simulation";
import { findTrim } from "../src/core/trim";
import { euler } from "../src/core/math";
import { keyboardTurnAxis } from "../src/app/aircraft-channels";
afterEach(() => vi.unstubAllGlobals());
function keyboard() {
  class TestElement {
    constructor(private owner = "[data-input-scope=ui]") {}
    matches() {
      return false;
    }
    closest(selector: string) {
      return selector.includes(this.owner) ? this : null;
    }
  }
  const handlers = new Map<string, (e: any) => void>();
  vi.stubGlobal("window", {
    addEventListener: (name: string, fn: (e: any) => void) =>
      handlers.set(name, fn),
  });
  vi.stubGlobal("document", { addEventListener: () => {} });
  vi.stubGlobal("Element", TestElement);
  vi.stubGlobal("HTMLElement", class extends TestElement {});
  const input = new InputManager(() => {});
  input.throttle = 0;
  return {
    input,
    mapMarker: new TestElement(),
    button: new TestElement("button"),
    dialog: new TestElement("dialog[open]"),
    key: (code: string, type = "keydown", target: TestElement | null = null) =>
      handlers.get(type)!({
        code,
        repeat: false,
        target,
        preventDefault: () => {},
      }),
  };
}
it("Space raises power, release retains it and Shift reduces it", () => {
  const { input, key } = keyboard();
  key("Space");
  expect(input.throttle).toBeCloseTo(0.05);
  input.read(1);
  expect(input.throttle).toBeCloseTo(0.4);
  key("Space", "keyup");
  input.read(1);
  expect(input.throttle).toBeCloseTo(0.4);
  key("ShiftLeft");
  input.read(0.5);
  expect(input.throttle).toBeCloseTo(0.175);
});
it("native buttons and dialogs retain Space and arrow keys", () => {
  const { input, key, button, dialog } = keyboard();
  for (const target of [button, dialog]) {
    key("Space", "keydown", target);
    key("ArrowDown", "keydown", target);
  }
  expect(input.read(0.5)).toMatchObject({ throttle: 0, pitch: 0 });
});
it("walking WASD does not steer the plane, while arrows still do", () => {
  const { input, key } = keyboard();
  input.walking = true;
  key("KeyS");
  expect(input.read(0.5).pitch).toBe(0);
  key("ArrowDown");
  expect(input.read(0.5).pitch).toBeGreaterThan(0.9);
});
it("inactive input ignores throttle shortcuts", () => {
  const { input, key } = keyboard();
  input.active = false;
  key("Space");
  expect(input.throttle).toBe(0);
});

it("tests surface input without changing the stored flight throttle", () => {
  const { input, key } = keyboard();
  input.throttle = 0.43;
  input.testBench = true;
  key("Space");
  key("ArrowDown");
  const c = input.read(0.5);
  expect(c.pitch).toBeGreaterThan(0.9);
  expect(input.throttle).toBe(0.43);
  key("Space", "keyup");
  key("ShiftLeft");
  input.read(0.5);
  expect(input.throttle).toBe(0.43);
});
it("position panel SVG controls do not change throttle or steer the aircraft", () => {
  const { input, key, mapMarker } = keyboard();
  key("Space", "keydown", mapMarker);
  key("ArrowDown", "keydown", mapMarker);
  expect(input.read(0.5)).toMatchObject({ throttle: 0, pitch: 0 });
  key("ArrowDown");
  expect(input.read(0.5).pitch).toBeGreaterThan(0.9);
});

it.each(["ArrowRight", "KeyD", "KeyE"])(
  "%s steers a rudder-only trainer without inventing roll control",
  (code) => {
    const { input, key } = keyboard();
    input.setKeyboardTurnAxis("yaw");
    key(code);
    expect(input.read(0.5)).toMatchObject({ roll: 0 });
    expect(input.read(0.5).yaw).toBeGreaterThan(0.99);
    key(code, "keyup");
    expect(input.read(1).yaw).toBeLessThan(0.001);
  },
);
it("rudder aliases do not double the command and opposing keys cancel", () => {
  const { input, key } = keyboard();
  input.setKeyboardTurnAxis("yaw");
  key("ArrowRight");
  key("KeyE");
  expect(input.read(1).yaw).toBeLessThanOrEqual(1);
  key("KeyQ");
  expect(Math.abs(input.read(1).yaw)).toBeLessThan(0.001);
});
it("switching aircraft clears held steering but preserves throttle and the hardware profile", () => {
  const { input, key } = keyboard();
  input.throttle = 0.47;
  const profile = structuredClone(input.profile);
  key("ArrowRight");
  expect(input.read(0.5).roll).toBeGreaterThan(0.9);
  input.setKeyboardTurnAxis("yaw");
  expect(input.read(1)).toEqual({ roll: 0, pitch: 0, yaw: 0, throttle: 0.47 });
  key("ArrowRight");
  expect(input.read(0.5).yaw).toBeGreaterThan(0.9);
  input.setKeyboardTurnAxis("roll");
  expect(input.read(1)).toEqual({ roll: 0, pitch: 0, yaw: 0, throttle: 0.47 });
  key("ArrowRight");
  expect(input.read(0.5)).toMatchObject({ yaw: 0 });
  expect(input.profile).toEqual(profile);
});
it("walking does not redirect A/D into the rudder; arrow keys still steer", () => {
  const { input, key } = keyboard();
  input.setKeyboardTurnAxis("yaw");
  input.walking = true;
  key("KeyD");
  expect(input.read(0.5).yaw).toBe(0);
  key("ArrowRight");
  expect(input.read(0.5).yaw).toBeGreaterThan(0.9);
});

it.each([
  ["KeyQ", -1],
  ["KeyE", 1],
  ["ArrowLeft", -1],
  ["ArrowRight", 1],
] as const)(
  "%s drives the trainer rudder through a complete simulated turn",
  (code, direction) => {
    const { input, key } = keyboard();
    const a = parseAircraft(trainer);
    input.setKeyboardTurnAxis(keyboardTurnAxis(a));
    const trim = findTrim(a);
    input.throttle = trim.controls.throttle;
    const sim = new Simulation(a, calmEnvironment(), trim.state);
    key(code);
    for (let i = 0; i < 120; i++) {
      const command = input.read(1 / 120);
      sim.step({
        ...command,
        yaw: command.yaw * 0.25,
        pitch: trim.controls.pitch,
      });
    }
    expect(euler(sim.state.orientation)[2] * direction).toBeGreaterThan(0.02);
    expect(sim.state.status).toBe("flying");
  },
);
