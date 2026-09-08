import { afterEach, expect, it, vi } from "vitest";
import { InputManager, defaultProfile } from "../src/input/controls";
import {
  ArduinoInput,
  rcChecksum,
  type RcSerialPort,
} from "../src/input/rc-serial";
import { Simulation, FIXED_DT, calmEnvironment } from "../src/core/simulation";
import {
  PilotResponseFilter,
  responseSettings,
  withPitchTrim,
} from "../src/core/pilot-response";
import { launchState, launchTrim } from "../src/core/launch";
import { bundledAircraft } from "../src/app/bundled-aircraft";
import {
  createRecording,
  parseRecording,
  replayRecording,
} from "../src/core/experiment";
import { rotate } from "../src/core/math";

afterEach(() => vi.unstubAllGlobals());
function setup() {
  const windowEvents = new EventTarget(),
    documentEvents = new EventTarget();
  vi.stubGlobal("window", windowEvents);
  vi.stubGlobal("document", documentEvents);
  vi.stubGlobal("navigator", { getGamepads: () => [] });
  vi.stubGlobal("Element", class {});
  vi.stubGlobal("HTMLElement", class {});
  let running = true;
  const input = new InputManager(() => {
    running = false;
    input.clear();
  });
  return {
    input,
    windowEvents,
    running: () => running,
    pause: () => {
      running = false;
    },
    resume: () => {
      running = true;
    },
  };
}
function rig(id: string) {
  const aircraft = bundledAircraft.find((a) => a.id === id)!;
  const environment = calmEnvironment();
  const trim = launchTrim(aircraft, "airborne", environment).controls;
  const sim = new Simulation(
    aircraft,
    environment,
    launchState(aircraft, "airborne", environment),
  );
  const recording = createRecording(sim),
    filter = new PilotResponseFilter();
  return {
    sim,
    trim,
    recording,
    step: (input: InputManager) => {
      const controls = withPitchTrim(
        filter.step(input.read(FIXED_DT), responseSettings(), FIXED_DT),
        trim.pitch,
      );
      sim.step(controls);
      recording.frames.push(controls);
    },
  };
}

it.each(["vt-simple-trainer", "ft-bronco", "ft-tiny-trainer"])(
  "%s: keyboard yaw reaches the airframe and replay preserves the resulting motion",
  (id) => {
    const s = setup(),
      r = rig(id);
    s.input.throttle = r.trim.throttle;
    s.windowEvents.dispatchEvent(
      Object.assign(new Event("keydown"), { code: "KeyE", repeat: false }),
    );
    for (let i = 0; i < 12; i++) r.step(s.input);
    expect(r.sim.state.omega[2]).toBeGreaterThan(0);
    for (let i = 12; i < 60; i++) r.step(s.input);
    s.windowEvents.dispatchEvent(
      Object.assign(new Event("keyup"), { code: "KeyE" }),
    );
    // Rate can reverse during a lateral oscillation; net heading must still
    // turn right. Requiring a positive rate forever would reject valid dynamics.
    const forward = rotate(r.sim.state.orientation, [1, 0, 0]);
    expect(Math.atan2(forward[1], forward[0])).toBeGreaterThan(0);
    expect(
      replayRecording(parseRecording(JSON.parse(JSON.stringify(r.recording)))),
    ).toEqual(r.sim.state);
    s.windowEvents.dispatchEvent(new Event("blur"));
    expect(s.running()).toBe(false);
    expect(s.input.read(FIXED_DT).yaw).toBe(0);
  },
);

it.each(["PPM", "PWM"])(
  "%s packets reach yaw/motors; STOP and timeout pause without auto-resume",
  async (mode) => {
    const s = setup(),
      r = rig("vt-simple-trainer");
    let now = 0,
      controller!: ReadableStreamDefaultController<Uint8Array>;
    const port: RcSerialPort = {
      readable: new ReadableStream({
        start: (c) => {
          controller = c;
        },
      }),
      open: async () => {},
      close: async () => {},
      getInfo: () => ({}),
    };
    const bridge = new ArduinoInput(
      (state) => {
        if (state === "signal-lost" || state === "error") s.pause();
      },
      () => now,
    );
    const send = (sequence: number, valid = 1) => {
      const pulses = [1500, 1500, 1500, 1800, 1500, valid ? 2000 : 1000];
      const body = `RCF1,${sequence},${valid},${mode},6,${pulses.join(",")}`;
      const line = `${body}*${rcChecksum(body).toString(16).padStart(4, "0")}\r\n`;
      // USB may split the frame at any byte boundary.
      controller.enqueue(new TextEncoder().encode(line.slice(0, 13)));
      controller.enqueue(new TextEncoder().encode(line.slice(13)));
    };
    await bridge.connect({ requestPort: async () => port });
    send(1);
    await vi.waitFor(() => expect(bridge.state).toBe("live"));
    const device = bridge.devices()[0];
    s.input.source = "controller";
    s.input.deviceIndex = device.index;
    s.input.extraDevices = () => bridge.devices();
    s.input.profile = defaultProfile(device.id);
    s.input.profile.bindings.throttle.axis = 2;
    s.input.profile.bindings.throttle.reversed = false;
    s.input.profile.bindings.yaw.axis = 3;
    for (let i = 0; i < 24; i++) {
      now = i * FIXED_DT * 1000;
      if (s.running()) r.step(s.input);
    }
    expect(r.sim.state.omega[2]).toBeGreaterThan(0);
    expect(r.sim.state.motors[0]).toBeGreaterThan(0);
    expect(
      replayRecording(parseRecording(JSON.parse(JSON.stringify(r.recording)))),
    ).toEqual(r.sim.state);
    send(2, 0);
    await vi.waitFor(() => expect(bridge.state).toBe("signal-lost"));
    expect(s.running()).toBe(false);
    expect(bridge.devices()).toEqual([]);
    const time = r.sim.state.time;
    send(3);
    await vi.waitFor(() => expect(bridge.state).toBe("live"));
    expect(s.running()).toBe(false);
    expect(r.sim.state.time).toBe(time);
    s.resume();
    now += 251;
    bridge.poll();
    expect(s.running()).toBe(false);
    expect(bridge.devices()).toEqual([]);
    await bridge.disconnect();
  },
);
