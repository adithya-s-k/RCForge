import { expect, it } from "vitest";
import {
  padStyle,
  buttonName,
  standardShortcuts,
} from "../src/input/presentation";
import { ActionEdges } from "../src/input/actions";
it("uses the same physical south button for Cross and A", () => {
  expect(buttonName(0, "playstation", true)).toBe("✕ Cross");
  expect(buttonName(0, "xbox", true)).toBe("A");
  expect(buttonName(2, "xbox", true)).toBe("X");
  expect(buttonName(0, "playstation", false)).toBe("Button 1");
});
it("detects known devices while preserving explicit appearance choice", () => {
  expect(padStyle("auto", "Sony DualSense 054c")).toBe("playstation");
  expect(padStyle("auto", "Xbox Wireless")).toBe("xbox");
  expect(padStyle("auto", "Wireless Controller")).toBe("generic");
  expect(padStyle("playstation", "Wireless Controller")).toBe("playstation");
});
it("standard shortcut south press starts once and west restarts", () => {
  const edges = new ActionEdges();
  const buttons = Array.from({ length: 17 }, () => ({ value: 0 }));
  edges.read("pad", standardShortcuts, buttons, []);
  buttons[0].value = 1;
  expect(edges.read("pad", standardShortcuts, buttons, [])).toEqual(["toggle"]);
  expect(edges.read("pad", standardShortcuts, buttons, [])).toEqual([]);
  buttons[0].value = 0;
  buttons[2].value = 1;
  expect(edges.read("pad", standardShortcuts, buttons, [])).toEqual(["reset"]);
});
