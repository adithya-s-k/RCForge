import { it, expect } from "vitest";
import { ActionEdges, validActions } from "../src/input/actions";
it("fires once per press, never on connection or while disabled", () => {
  const e = new ActionEdges(),
    b = { reset: "b0" };
  expect(e.read("a", b, [{ value: 1 }], [])).toEqual([]);
  e.read("a", b, [{ value: 0 }], []);
  expect(e.read("a", b, [{ value: 1 }], [])).toEqual(["reset"]);
  expect(e.read("a", b, [{ value: 1 }], [])).toEqual([]);
  e.read("a", b, [{ value: 0 }], [], false);
  expect(e.read("a", b, [{ value: 1 }], [], false)).toEqual([]);
  expect(e.read("a", b, [{ value: 1 }], [], true)).toEqual([]);
  expect(e.read("b", b, [{ value: 1 }], [])).toEqual([]);
});
it("switch axes use hysteresis and re-arm after release", () => {
  const e = new ActionEdges(),
    b = { camera: "a4+" };
  e.read("a", b, [], [0, 0, 0, 0, 0]);
  expect(e.read("a", b, [], [0, 0, 0, 0, 1])).toEqual(["camera"]);
  expect(e.read("a", b, [], [0, 0, 0, 0, 0.6])).toEqual([]);
  expect(e.read("a", b, [], [0, 0, 0, 0, 0.8])).toEqual([]);
  e.read("a", b, [], [0, 0, 0, 0, 0]);
  expect(e.read("a", b, [], [0, 0, 0, 0, 1])).toEqual(["camera"]);
});
it("rejects malformed persisted action mappings", () => {
  expect(validActions({ reset: "b2", camera: "a5-" })).toBe(true);
  expect(validActions({ reset: 10 })).toBe(false);
  expect(validActions({ reset: "a-1+" })).toBe(false);
  expect(validActions({ bogus: "b2" })).toBe(false);
});
