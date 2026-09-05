import { afterEach, expect, it, vi } from "vitest";
import { ControllerActions } from "../src/app/controller-actions";
import { defaultProfile, type InputManager } from "../src/input/controls";

afterEach(() => vi.unstubAllGlobals());
it("hides and disables VTOL shortcuts on other aircraft without losing saved bindings", () => {
  const elements = new Map<string, any>();
  const el = (id: string) => {
    if (!elements.has(id))
      elements.set(id, {
        value: id === "flight-input-type" ? "transmitter" : "",
        innerHTML: "",
        textContent: "",
        hidden: false,
        dataset: {},
        classList: { toggle: vi.fn() },
        toggleAttribute: vi.fn(),
      });
    return elements.get(id);
  };
  vi.stubGlobal("document", {
    getElementById: el,
    querySelector: el,
    querySelectorAll: () => [],
    addEventListener: () => {},
  });
  vi.stubGlobal("window", { addEventListener: () => {} });
  vi.stubGlobal("localStorage", {
    getItem: (key: string) =>
      key.startsWith("rcforge.actions.")
        ? JSON.stringify({
            reset: "b0",
            vtolMode: "b1",
            vtolHover: "a4-",
            vtolCruise: "a4+",
          })
        : null,
    setItem: vi.fn(),
  });
  const device = {
    id: "test-radio",
    axes: [0, 0, 0, 0, 0],
    buttons: [{ value: 0 }, { value: 0 }],
    mapping: "",
  };
  const input = {
    selected: () => device,
    profile: defaultProfile(device.id),
    source: "controller",
  } as unknown as InputManager;
  const perform = vi.fn();
  const actions = new ControllerActions(input, perform);
  actions.update(true, { vtol: true });
  const saved = structuredClone(actions.bindings);
  device.buttons[1].value = 1;
  actions.update(true, { vtol: true });
  expect(perform).toHaveBeenLastCalledWith("vtolMode");
  expect(el("vtol-radio-shortcuts").hidden).toBe(false);
  expect(el("controller-actions").innerHTML).toContain(
    'data-action="vtolMode"',
  );
  actions.update(true, { vtol: false });
  expect(el("vtol-radio-shortcuts").hidden).toBe(true);
  expect(el("flight-shortcut-legend").innerHTML).not.toContain("VTOL");
  expect(el("controller-actions").innerHTML).not.toContain(
    'data-action="vtolMode"',
  );
  device.buttons[1].value = 0;
  actions.update(true, { vtol: false });
  device.buttons[1].value = 1;
  actions.update(true, { vtol: false });
  expect(perform).toHaveBeenCalledTimes(1);
  device.buttons[0].value = 1;
  actions.update(true, { vtol: false });
  expect(perform).toHaveBeenLastCalledWith("reset");
  // Switching back while the mode button is held must not trigger a transition.
  actions.update(true, { vtol: true });
  expect(perform).toHaveBeenCalledTimes(2);
  device.buttons[1].value = 0;
  actions.update(true, { vtol: true });
  device.buttons[1].value = 1;
  actions.update(true, { vtol: true });
  expect(perform).toHaveBeenCalledTimes(3);
  expect(actions.bindings).toEqual(saved);
});
