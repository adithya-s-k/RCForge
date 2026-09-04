import type { InputDevice } from "./controls";

export const SERIAL_DEVICE_INDEX = 10000;
export const SERIAL_TIMEOUT_MS = 250;
export interface RcPacket {
  sequence: number;
  valid: boolean;
  mode: "PPM" | "PWM";
  pulses: number[];
}

/** CRC-16/CCITT-FALSE, shared with hardware/rcforge_bridge. */
export function rcChecksum(text: string): number {
  let crc = 0xffff;
  for (let i = 0; i < text.length; i++) {
    crc ^= text.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++)
      crc = ((crc << 1) ^ (crc & 0x8000 ? 0x1021 : 0)) & 0xffff;
  }
  return crc;
}
export function parseRcPacket(line: string): RcPacket | null {
  const match =
    /^(RCF1,\d{1,5},[01],(?:PPM|PWM),[4-8](?:,\d{3,4}){4,8})\*([0-9A-Fa-f]{4})$/.exec(
      line,
    );
  if (!match || rcChecksum(match[1]) !== parseInt(match[2], 16)) return null;
  const [, sequence, valid, mode, count, ...raw] = match[1].split(","),
    pulses = raw.map(Number);
  if (
    +sequence > 65535 ||
    pulses.length !== +count ||
    pulses.some((p) => p < 800 || p > 2200)
  )
    return null;
  return {
    sequence: +sequence,
    valid: valid === "1",
    mode: mode as RcPacket["mode"],
    pulses,
  };
}

/** Bounded stream decoder. Bad checksums, duplicates and backward sequences never refresh input. */
export class RcStream {
  private line = "";
  private dropping = false;
  private sequence: number | null = null;
  packet: RcPacket | null = null;
  receivedAt = -Infinity;
  feed(chunk: string, now: number, accepted?: () => void) {
    for (const char of chunk) {
      if (char === "\n") {
        const packet = this.dropping
          ? null
          : parseRcPacket(this.line.replace(/\r$/, ""));
        this.line = "";
        this.dropping = false;
        if (!packet) continue;
        const delta =
          this.sequence === null
            ? 1
            : (packet.sequence - this.sequence + 65536) % 65536;
        if (delta === 0 || delta > 32767) continue;
        this.sequence = packet.sequence;
        this.packet = packet;
        this.receivedAt = now;
        accepted?.();
      } else if (!this.dropping) {
        if (this.line.length >= 160) {
          this.line = "";
          this.dropping = true;
        } else this.line += char;
      }
    }
  }
  live(now: number) {
    return !!this.packet?.valid && now - this.receivedAt <= SERIAL_TIMEOUT_MS;
  }
}

export interface RcSerialPort {
  readable: ReadableStream<Uint8Array> | null;
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  getInfo(): { usbVendorId?: number; usbProductId?: number };
}
export interface RcSerialApi {
  requestPort(): Promise<RcSerialPort>;
}
export type SerialState =
  "disconnected" | "connecting" | "waiting" | "live" | "signal-lost" | "error";
export class ArduinoInput {
  state: SerialState = "disconnected";
  error = "";
  private port: RcSerialPort | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private task: Promise<void> | null = null;
  private stream = new RcStream();
  private label = "";
  private closing = false;
  constructor(
    private changed: (state: SerialState) => void = () => {},
    private clock = () => performance.now(),
  ) {}
  private setState(next: SerialState) {
    if (this.state !== next) {
      this.state = next;
      this.changed(next);
    }
  }
  async connect(api: RcSerialApi) {
    if (this.port || this.state === "connecting" || this.closing) return;
    this.error = "";
    this.setState("connecting");
    try {
      // This call stays in the button's activation stack so the browser can show its chooser.
      const port = await api.requestPort();
      await port.open({ baudRate: 115200 });
      this.port = port;
      if (!port.readable)
        throw new Error("The selected port has no readable stream.");
      const info = port.getInfo();
      this.label = [info.usbVendorId, info.usbProductId]
        .map((n) => n?.toString(16) ?? "unknown")
        .join(":");
      this.stream = new RcStream();
      this.reader = port.readable.getReader();
      this.setState("waiting");
      this.task = this.read();
    } catch (error) {
      if (this.port) await this.port.close().catch(() => {});
      this.port = null;
      this.error = error instanceof Error ? error.message : String(error);
      this.setState(
        error instanceof DOMException && error.name === "NotFoundError"
          ? "disconnected"
          : "error",
      );
    }
  }
  private async read() {
    const reader = this.reader!,
      decoder = new TextDecoder();
    try {
      while (!this.closing) {
        const { done, value } = await reader.read();
        if (done) break;
        // Process each accepted status, even when STOP and RUN share a USB read.
        this.stream.feed(
          decoder.decode(value, { stream: true }),
          this.clock(),
          () => this.poll(),
        );
      }
      if (!this.closing)
        this.error = "USB connection ended. Reconnect Arduino.";
    } catch (error) {
      if (!this.closing)
        this.error = error instanceof Error ? error.message : String(error);
    } finally {
      reader.releaseLock();
      this.reader = null;
      const port = this.port;
      this.port = null;
      if (!this.closing) this.setState("error");
      await port?.close().catch(() => {});
    }
  }
  async disconnect() {
    if (this.state === "connecting" || this.closing) return;
    this.closing = true;
    this.setState("disconnected");
    await this.reader?.cancel().catch(() => {});
    await this.task;
    this.task = null;
    this.stream = new RcStream();
    this.closing = false;
  }
  poll() {
    if (!this.port || this.closing) return;
    this.setState(
      this.stream.live(this.clock())
        ? "live"
        : this.stream.packet
          ? "signal-lost"
          : "waiting",
    );
  }
  devices(): InputDevice[] {
    if (this.state !== "live" || !this.stream.live(this.clock())) return [];
    const packet = this.stream.packet!;
    return [
      {
        id: `RCForge Arduino ${packet.mode} (${this.label})`,
        index: SERIAL_DEVICE_INDEX,
        connected: true,
        mapping: "Arduino USB",
        axes: packet.pulses.map((us) => (us - 1500) / 500),
        buttons: [],
        timestamp: this.stream.receivedAt,
      },
    ];
  }
}
