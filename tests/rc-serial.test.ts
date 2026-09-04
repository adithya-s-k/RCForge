import { describe, expect, it, vi } from "vitest";
import {
  ArduinoInput,
  RcStream,
  parseRcPacket,
  rcChecksum,
  type RcSerialPort,
} from "../src/input/rc-serial";
import { defaultProfile, mapGamepad } from "../src/input/controls";

const packet = (
  sequence: number,
  valid = 1,
  pulses = [1500, 1500, 1000, 1500, 2000, 2000],
  mode = "PPM",
) => {
  const body = `RCF1,${sequence},${valid},${mode},${pulses.length},${pulses.join(",")}`;
  return `${body}*${rcChecksum(body).toString(16).padStart(4, "0")}\r\n`;
};
describe("Arduino serial protocol", () => {
  it("matches the published CRC-16/CCITT-FALSE check vector", () => {
    expect(rcChecksum("123456789")).toBe(0x29b1);
  });
  it("reassembles split reads and accepts multiple lines including sequence wrap", () => {
    const s = new RcStream(),
      first = packet(65535);
    s.feed(first.slice(0, 19), 0);
    expect(s.live(0)).toBe(false);
    s.feed(first.slice(19) + packet(0), 10);
    expect(s.packet?.sequence).toBe(0);
    expect(s.live(10)).toBe(true);
    expect(s.packet?.pulses).toEqual([1500, 1500, 1000, 1500, 2000, 2000]);
  });
  it("rejects bad CRC, malformed numbers, wrong counts, protocols and out-of-range pulses", () => {
    for (const value of [
      packet(1).replace("1500", "1501"),
      packet(65536),
      packet(1, 1, [2300, 1500, 1000, 1500]),
      packet(1, 1, [1500, 1500, 1000]),
      packet(1, 1, undefined, "IBUS"),
      "RCF1,1,1,PPM,4,1500*0000\r\n",
    ]) {
      expect(parseRcPacket(value.trim())).toBeNull();
    }
  });
  it("does not refresh stale input from duplicate or backward packets", () => {
    const s = new RcStream();
    s.feed(packet(4), 0);
    s.feed(packet(4) + packet(3), 240);
    expect(s.receivedAt).toBe(0);
    expect(s.live(251)).toBe(false);
  });
  it("stops immediately on invalid status and recovers only with a new valid packet", () => {
    const s = new RcStream();
    s.feed(packet(0), 0);
    s.feed(packet(1, 0), 20);
    expect(s.live(20)).toBe(false);
    s.feed(packet(2), 40);
    expect(s.live(40)).toBe(true);
  });
  it("discards oversized lines without losing synchronization with the next packet", () => {
    const s = new RcStream();
    s.feed("x".repeat(50000) + packet(0), 0);
    expect(s.packet).toBeNull();
    s.feed(packet(1), 20);
    expect(s.live(20)).toBe(true);
  });
});
function mockPort() {
  let source!: ReadableStreamDefaultController<Uint8Array>;
  const readable = new ReadableStream<Uint8Array>({
    start(c) {
      source = c;
    },
  });
  const port: RcSerialPort = {
    readable,
    open: vi.fn(async () => {}),
    close: vi.fn(async () => {}),
    getInfo: () => ({ usbVendorId: 0x2341, usbProductId: 0x43 }),
  };
  return {
    port,
    source,
    send: (s: string) => source.enqueue(new TextEncoder().encode(s)),
  };
}
describe("Arduino transport lifecycle", () => {
  it("exposes calibrated AETR axes and removes stale or stopped inputs without a fallback", async () => {
    let now = 0;
    const states: string[] = [],
      bridge = new ArduinoInput(
        (s) => states.push(s),
        () => now,
      ),
      mock = mockPort();
    await bridge.connect({ requestPort: async () => mock.port });
    expect(bridge.state).toBe("waiting");
    expect(mock.port.open).toHaveBeenCalledWith({ baudRate: 115200 });
    mock.send(packet(0));
    await vi.waitFor(() => expect(bridge.state).toBe("live"));
    const device = bridge.devices()[0],
      profile = defaultProfile(device.id);
    profile.bindings.throttle.axis = 2;
    profile.bindings.throttle.reversed = false;
    profile.bindings.yaw.axis = 3;
    expect(mapGamepad(device.axes, profile)).toEqual({
      roll: 0,
      pitch: 0,
      yaw: 0,
      throttle: 0,
    });
    now = 251;
    bridge.poll();
    expect(bridge.state).toBe("signal-lost");
    expect(bridge.devices()).toEqual([]);
    mock.send(packet(1));
    await vi.waitFor(() => expect(bridge.state).toBe("live"));
    mock.send(packet(2, 0));
    await vi.waitFor(() => expect(bridge.state).toBe("signal-lost"));
    await bridge.disconnect();
    expect(bridge.state).toBe("disconnected");
    expect(mock.port.close).toHaveBeenCalledOnce();
    expect(mock.port.readable?.locked).toBe(false);
    expect(states).toEqual([
      "connecting",
      "waiting",
      "live",
      "signal-lost",
      "live",
      "signal-lost",
      "disconnected",
    ]);
  });
  it("releases the reader after a physical-style stream error and allows a fresh session", async () => {
    const bridge = new ArduinoInput(),
      mock = mockPort();
    await bridge.connect({ requestPort: async () => mock.port });
    mock.send(packet(300));
    await vi.waitFor(() => expect(bridge.state).toBe("live"));
    mock.source.error(new Error("Device removed"));
    await vi.waitFor(() => expect(bridge.state).toBe("error"));
    expect(bridge.devices()).toEqual([]);
    expect(mock.port.readable?.locked).toBe(false);
    const next = mockPort();
    await bridge.connect({ requestPort: async () => next.port });
    next.send(packet(0));
    await vi.waitFor(() => expect(bridge.state).toBe("live"));
    await bridge.disconnect();
    expect(next.port.close).toHaveBeenCalledOnce();
  });
  it("observes STOP even when STOP and RUN arrive in one USB chunk", async () => {
    const states: string[] = [],
      bridge = new ArduinoInput((s) => states.push(s)),
      mock = mockPort();
    await bridge.connect({ requestPort: async () => mock.port });
    mock.send(packet(0));
    await vi.waitFor(() => expect(bridge.state).toBe("live"));
    mock.send(packet(1, 0) + packet(2));
    await vi.waitFor(() =>
      expect(states.slice(-2)).toEqual(["signal-lost", "live"]),
    );
    await bridge.disconnect();
  });
  it("handles cancelled permission and busy ports without creating an input", async () => {
    const bridge = new ArduinoInput();
    await bridge.connect({
      requestPort: async () => {
        throw new DOMException("Cancelled", "NotFoundError");
      },
    });
    expect(bridge.state).toBe("disconnected");
    const mock = mockPort();
    mock.port.open = async () => {
      throw new Error("Port busy");
    };
    await bridge.connect({ requestPort: async () => mock.port });
    expect(bridge.state).toBe("error");
    expect(bridge.error).toBe("Port busy");
    expect(bridge.devices()).toEqual([]);
  });
});
