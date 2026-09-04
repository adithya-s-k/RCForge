import { expect, it } from "vitest";
import { controllerDiagram } from "../src/view/controller-diagram";

it.each(["playstation", "xbox", "generic"])(
  "exposes each standard %s button exactly once, including stick clicks",
  (style) => {
    const svg = controllerDiagram("gamepad", style, true);
    const buttons = [...svg.matchAll(/data-pad-button="(\d+)"/g)]
      .map((m) => Number(m[1]))
      .sort((a, b) => a - b);
    expect(buttons).toEqual(
      Array.from({ length: style === "playstation" ? 18 : 17 }, (_, i) => i),
    );
    const anchors = [
      ...svg.matchAll(
        /data-pad-stick="(\d+)" data-stick-x="([\d.]+)" data-stick-y="([\d.]+)" transform="translate\(([\d.]+) ([\d.]+)\)"/g,
      ),
    ];
    expect(anchors).toHaveLength(2);
    for (const anchor of anchors) {
      expect(anchor[2]).toBe(anchor[4]);
      expect(anchor[3]).toBe(anchor[5]);
    }
    // The two layouts must keep their physical left-stick position distinct.
    expect(Number(anchors[0][3]) < Number(anchors[1][3])).toBe(
      style === "xbox",
    );
  },
);

it("keeps custom USB button labels independent of cosmetic controller style", () => {
  const svg = controllerDiagram("gamepad", "playstation", false);
  expect(svg).toContain("<title>Button 1</title>");
  expect(svg).toContain("<title>Button 11</title>");
  expect(svg).toContain("<title>Button 18</title>");
  expect(svg).not.toContain("<title>Touchpad</title>");
  expect(svg).not.toContain("<title>✕ Cross</title>");
});

it("does not pretend transmitter switches are standard gamepad buttons", () => {
  const svg = controllerDiagram("transmitter", "playstation", true);
  expect([...svg.matchAll(/data-pad-stick=/g)]).toHaveLength(2);
  expect(svg).not.toContain("data-pad-button");
  expect(svg).toContain("Yaw and throttle");
  expect(svg).toContain("Roll and pitch");
});
