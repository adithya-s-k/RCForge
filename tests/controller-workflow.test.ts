import { it, expect, vi, afterEach } from "vitest";
import { ControllerPage } from "../src/app/controllers";
import { defaultProfile, type InputManager } from "../src/input/controls";
afterEach(() => vi.unstubAllGlobals());
function setup() {
  const elements = new Map<string, any>();
  const el = (id: string) => {
    if (!elements.has(id))
      elements.set(id, {
        style: {},
        classList: { toggle: () => {} },
        toggleAttribute: () => {},
        setAttribute: () => {},
        value: "",
        textContent: "",
        hidden: false,
      });
    return elements.get(id);
  };
  vi.stubGlobal("document", {
    getElementById: el,
    querySelector: el,
    querySelectorAll: () => [],
  });
  vi.stubGlobal("localStorage", { getItem: () => null, setItem: vi.fn() });
  const device = {
    id: "test-hardware",
    index: 0,
    axes: [0, 0, 0, 0],
    buttons: [],
    mapping: "",
  };
  const input = {
    profile: defaultProfile(device.id),
    source: "controller",
    deviceIndex: 0,
    devices: () => [device],
    selected: () => device,
    read: () => ({ roll: 0, pitch: 0, yaw: 0, throttle: 0 }),
  } as unknown as InputManager;
  const page = new ControllerPage(
    input,
    () => {},
    () => {},
  );
  page.selectType("joystick");
  return { el, input, page, device };
}
it("cancel restores the exact original profile after partial capture", () => {
  const { el, input, page, device } = setup(),
    original = structuredClone(input.profile);
  el("capture-centers").onclick();
  el("capture-range").onclick();
  device.axes = [-0.8, -0.7, 0.6, 0.9];
  page.update();
  expect(page.ready()).toBe(false);
  el("cancel-calibration").onclick();
  expect(input.profile).toEqual(original);
  expect(page.ready()).toBe(true);
});
it("requires travel on both sides of neutral and saves captured ranges", () => {
  const { el, input, page, device } = setup();
  el("capture-centers").onclick();
  el("capture-range").onclick();
  device.axes = [0.9, 0.9, 0.9, 0.9];
  page.update();
  el("finish-calibration").onclick();
  expect(page.ready()).toBe(false);
  expect(el("calibration-status").textContent).toContain("both endpoints");
  device.axes = [-0.85, -0.8, -0.9, -0.9];
  page.update();
  el("finish-calibration").onclick();
  expect(page.ready()).toBe(true);
  expect(input.profile.bindings.roll.min).toBe(-0.85);
  expect(input.profile.bindings.roll.max).toBe(0.9);
  expect(localStorage.setItem).toHaveBeenCalled();
});
it("keeps a disconnected input selected instead of falling back to another controller", () => {
  const { input, page, device, el } = setup();
  const other = {
    ...device,
    id: "other-controller",
    index: 1,
    connected: true,
    timestamp: 0,
  };
  input.devices = () => [other];
  input.selected = () => undefined;
  page.refresh();
  expect(input.deviceIndex).toBe(0);
  expect(input.profile.deviceId).toBe("test-hardware");
  expect(el("device-select").innerHTML).toContain(
    "Selected input disconnected",
  );
  expect(page.ready()).toBe(false);
  const reconnected = { ...device, connected: true, timestamp: 1 };
  input.devices = () => [other, reconnected];
  input.selected = () => reconnected;
  page.refresh();
  expect(input.deviceIndex).toBe(0);
  expect(page.ready()).toBe(true);
});
