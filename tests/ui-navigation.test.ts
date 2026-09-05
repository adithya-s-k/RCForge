import { afterEach, expect, it, vi } from "vitest";
import { navigateSetting } from "../src/app/controller-actions";

afterEach(() => vi.unstubAllGlobals());

class Control {
  tabIndex = 0;
  role = "";
  hidden = false;
  disabled = false;
  getAttribute() {
    return this.role;
  }
  getClientRects() {
    return [1];
  }
  closest() {
    return this.hidden ? {} : null;
  }
  matches() {
    return this.disabled;
  }
  focus = vi.fn();
  click = vi.fn();
  dispatchEvent = vi.fn();
}
class Select extends Control {
  selectedIndex = 0;
  options = [new Control(), new Control(), new Control()];
}
class Input extends Control {
  type = "range";
  value = "100";
  readOnly = false;
  stepUp() {
    this.value = String(Math.min(100, Number(this.value) + 1));
  }
  stepDown() {
    this.value = String(Math.max(0, Number(this.value) - 1));
  }
}
function setup(
  controls: Control[],
  active: Control | null = null,
  modal?: Control[],
) {
  const doc = {
    activeElement: active,
    querySelector: () => (modal ? { querySelectorAll: () => modal } : null),
    querySelectorAll: () => controls,
  };
  vi.stubGlobal("document", doc);
  vi.stubGlobal("HTMLSelectElement", Select);
  vi.stubGlobal("HTMLInputElement", Input);
  return doc;
}

it("controller navigation reaches inactive setup tabs but skips hidden and disabled controls", () => {
  const active = new Control(),
    disabled = new Control(),
    hidden = new Control(),
    inactive = new Control();
  active.role = inactive.role = "tab";
  disabled.disabled = hidden.hidden = true;
  inactive.tabIndex = -1;
  const doc = setup([active, disabled, hidden, inactive], active);
  navigateSetting("next");
  expect(inactive.focus).toHaveBeenCalledOnce();
  expect(hidden.focus).not.toHaveBeenCalled();
  expect(disabled.focus).not.toHaveBeenCalled();
  doc.activeElement = inactive;
  navigateSetting("previous");
  expect(active.focus).toHaveBeenCalledOnce();
});

it("starts at the first or last control without focus and wraps at both ends", () => {
  const controls = [new Control(), new Control(), new Control()];
  const doc = setup(controls);
  navigateSetting("previous");
  expect(controls[2]!.focus).toHaveBeenCalledOnce();
  expect(controls[1]!.focus).not.toHaveBeenCalled();
  navigateSetting("next");
  expect(controls[0]!.focus).toHaveBeenCalledOnce();
  doc.activeElement = controls[2]!;
  navigateSetting("next");
  expect(controls[0]!.focus).toHaveBeenCalledTimes(2);
  doc.activeElement = controls[0]!;
  navigateSetting("previous");
  expect(controls[2]!.focus).toHaveBeenCalledTimes(2);
});

it("traps controller navigation and activation inside an open modal", () => {
  const launch = new Control(),
    close = new Control(),
    aircraft = new Control();
  const doc = setup([launch, close, aircraft], launch, [close, aircraft]);
  navigateSetting("activate");
  expect(launch.click).not.toHaveBeenCalled();
  expect(close.focus).toHaveBeenCalledOnce();
  doc.activeElement = aircraft;
  navigateSetting("next");
  expect(close.focus).toHaveBeenCalledTimes(2);
  navigateSetting("activate");
  expect(aircraft.click).toHaveBeenCalledOnce();
  expect(launch.focus).not.toHaveBeenCalled();
});

it("skips unavailable options without emitting a change at dropdown boundaries", () => {
  const select = new Select();
  select.options[1]!.disabled = true;
  setup([select], select);
  navigateSetting("increase");
  expect(select.selectedIndex).toBe(2);
  expect(select.dispatchEvent).toHaveBeenCalledOnce();
  navigateSetting("increase");
  expect(select.dispatchEvent).toHaveBeenCalledOnce();
  select.options[1]!.disabled = false;
  select.options[1]!.hidden = true;
  navigateSetting("decrease");
  expect(select.selectedIndex).toBe(0);
  expect(select.dispatchEvent).toHaveBeenCalledTimes(2);
});

it("emits numeric edits only when the value changes and respects read-only inputs", () => {
  const input = new Input();
  setup([input], input);
  navigateSetting("increase");
  expect(input.dispatchEvent).not.toHaveBeenCalled();
  navigateSetting("decrease");
  expect(input.value).toBe("99");
  expect(input.dispatchEvent.mock.calls.map(([event]) => event.type)).toEqual([
    "input",
    "change",
  ]);
  input.readOnly = true;
  navigateSetting("decrease");
  expect(input.value).toBe("99");
});

it("ignores navigation when the current scope has no interactive controls", () => {
  const stale = new Control();
  setup([], stale);
  navigateSetting("activate");
  navigateSetting("next");
  expect(stale.click).not.toHaveBeenCalled();
});
