import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { pwmPins, documentationDiagrams } from "../site/diagrams";

// Deliberately checks across firmware, docs and drawings. A firmware pin change
// must update the published wiring rather than silently leaving old instructions.
describe("published Arduino wiring contract", () => {
  const firmware = readFileSync(
    "hardware/rcforge_bridge/rcforge_bridge.ino",
    "utf8",
  );
  const guide = readFileSync("docs/radio-setup.md", "utf8");
  it("agrees with the ATmega328P capture pins and required channel count", () => {
    const channels = Number(
      firmware.match(/const uint8_t CHANNELS = (\d+)/)![1],
    );
    const firstPin = Number(
      firmware.match(/const uint8_t mask = _BV\(i \+ (\d+)\)/)![1],
    );
    const guard = Number(firmware.match(/#define RCF_GUARD_CHANNEL (\d+)/)![1]);
    expect(pwmPins).toHaveLength(channels);
    for (const [index, { channel, pin }] of pwmPins.entries()) {
      expect(pin).toBe(firstPin + index);
      expect(channel).toBe(index + 1);
      expect(guide).toMatch(
        new RegExp(`\\| CH${channel} S\\s*\\| D${pin}\\s*\\|`),
      );
    }
    expect(pwmPins.find((p) => p.channel === guard)?.action).toBe("RUN guard");
    expect(firmware).toMatch(
      /attachInterrupt\(digitalPinToInterrupt\(2\), ppmEdge, RISING\)/,
    );
    expect(guide).toContain("RCF_GUARD_CHANNEL 6");
  });
  it("ships only self-contained vector assets and matches the checked-in drawings", () => {
    for (const [name, svg] of documentationDiagrams()) {
      expect(readFileSync(`docs/images/${name}`, "utf8")).toBe(svg);
      expect(svg).toContain('aria-labelledby="title desc"');
      expect(svg).not.toMatch(/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[\da-f]+);)/i);
      expect(svg).not.toMatch(
        /<script|<foreignObject|<image|href="https?:|onload=/i,
      );
    }
  });
});
