import { it, expect, vi, afterEach } from "vitest";
import { InputManager } from "../src/input/controls";
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
