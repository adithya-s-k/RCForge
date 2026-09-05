import { hostAllows, requireHostAccess } from "./host";
import { $ } from "./dom";
import {
  ArduinoInput,
  SERIAL_DEVICE_INDEX,
  type RcSerialApi,
} from "../input/rc-serial";
import type { InputManager } from "../input/controls";
import type { ControllerPage } from "./controllers";

export function setupArduino(
  input: InputManager,
  controller: ControllerPage,
  pause: (reason?: string) => void,
) {
  const api = (navigator as Navigator & { serial?: RcSerialApi }).serial;
  const connect = $<HTMLButtonElement>("arduino-connect"),
    disconnect = $<HTMLButtonElement>("arduino-disconnect");
  let selectWhenReady = false;
  const bridge = new ArduinoInput((state) => {
    connect.disabled = [
      "connecting",
      "waiting",
      "live",
      "signal-lost",
    ].includes(state);
    disconnect.hidden = !["waiting", "live", "signal-lost"].includes(state);
    $("arduino-status").textContent = {
      disconnected: "Connect the board after uploading the bridge sketch.",
      connecting: "Choose your Arduino USB port…",
      waiting:
        "USB connected · Waiting for bridge data. Check the sketch and 115200 baud.",
      live: "Live transmitter input · Calibrate below before flight.",
      "signal-lost":
        "Input stopped · Check wiring, transmitter power and CH6 RUN switch.",
      error: `Connection ended · ${bridge.error || "Reconnect the Arduino."}`,
    }[state];
    $("arduino-status").dataset.state = state;
    if (state === "live" && selectWhenReady) {
      selectWhenReady = false;
      if (
        controller.type === "transmitter" &&
        hostAllows({ kind: "input", id: "transmitter" })
      ) {
        input.deviceIndex = SERIAL_DEVICE_INDEX;
        controller.selectType("transmitter");
      }
    }
    if (
      state !== "live" &&
      input.source === "controller" &&
      input.deviceIndex === SERIAL_DEVICE_INDEX
    ) {
      input.clear();
      pause(
        "Arduino input stopped — check the connection, then resume manually.",
      );
    }
  });
  input.extraDevices = () => bridge.devices();
  connect.disabled = !api;
  if (!api)
    $("arduino-status").textContent =
      "Arduino USB requires a browser with Web Serial, such as desktop Chrome, at localhost or HTTPS. USB joystick adapters use Find devices.";
  connect.onclick = () => {
    if (!api || !requireHostAccess({ kind: "input", id: "transmitter" }))
      return;
    pause();
    input.clear();
    selectWhenReady = true;
    void bridge.connect(api);
  };
  disconnect.onclick = () => {
    selectWhenReady = false;
    disconnect.disabled = true;
    void bridge.disconnect().finally(() => {
      disconnect.disabled = false;
    });
  };
  return bridge;
}
