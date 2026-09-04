import { afterEach, expect, it, vi } from "vitest";
import { AircraftEditor } from "../src/app/editor";
import { parseAircraft } from "../src/core/schema";
import { massProperties } from "../src/core/aircraft";
import bronco from "../aircraft/ft-bronco.json";
import trainer from "../aircraft/ft-tiny-trainer.json";
afterEach(() => vi.unstubAllGlobals());
function setup() {
  const elements = new Map<string, any>();
  const el = (id: string): any => {
    if (!elements.has(id)) {
      const attributes = new Map();
      elements.set(id, {
        id,
        value: "",
        min: id === "edit-mass" ? "100" : "",
        max: "",
        labels: [],
        style: {},
        parentElement: {},
        classList: { add: () => {}, remove: () => {} },
        querySelectorAll: () => [],
        toggleAttribute: () => {},
        setAttribute: (k: string, v: string) => attributes.set(k, v),
        removeAttribute: (k: string) => attributes.delete(k),
        getAttribute: (k: string) => attributes.get(k),
        setCustomValidity: vi.fn(),
        dispatchEvent: (event: Event) => el(id)[`on${event.type}`]?.(),
      });
    }
    return elements.get(id);
  };
  vi.stubGlobal("document", {
    getElementById: el,
    querySelector: el,
    querySelectorAll: () =>
      [...elements.values()].filter((e) => e.getAttribute("aria-invalid")),
  });
  const editor = new AircraftEditor(
    parseAircraft(bronco),
    () => {},
    () => {},
  );
  editor.switchTo(parseAircraft(bronco));
  return { editor, el };
}
it("retains valid unapplied drafts independently while browsing aircraft", () => {
  const { editor, el } = setup();
  el("edit-mass").value = "900";
  el("edit-mass").oninput();
  el("edit-mass").onchange();
  editor.switchTo(parseAircraft(trainer));
  expect(massProperties(editor.draft).mass).toBeCloseTo(0.253);
  editor.switchTo(parseAircraft(bronco));
  expect(massProperties(editor.draft).mass).toBeCloseTo(0.9);
  expect(el("edit-mass").value).toBe("900.0");
});
it("keeps invalid input visible, blocks apply, and allows correction", () => {
  const { editor, el } = setup();
  el("edit-mass").value = "-5";
  el("edit-mass").oninput();
  el("edit-mass").onchange();
  expect(editor.hasPending).toBe(true);
  expect(el("edit-mass").value).toBe("-5");
  expect(el("edit-mass").getAttribute("aria-invalid")).toBe("true");
  expect(() => editor.commitPending()).toThrow("Minimum 100");
  expect(massProperties(editor.draft).mass).toBeCloseTo(0.83);
  editor.switchTo(parseAircraft(trainer));
  editor.switchTo(parseAircraft(bronco));
  expect(el("edit-mass").value).toBe("-5");
  el("edit-mass").value = "920";
  el("edit-mass").oninput();
  editor.commitPending();
  expect(editor.hasPending).toBe(false);
  expect(el("editor-error").hidden).toBe(true);
  expect(massProperties(editor.draft).mass).toBeCloseTo(0.92);
});
it("does not interpret an empty numeric field as zero", () => {
  const { editor, el } = setup();
  el("edit-cg").value = "";
  el("edit-cg").oninput();
  expect(() => editor.commitPending()).toThrow("Enter a number");
  expect(el("edit-cg").value).toBe("");
});
it("uses the applied saved model on initial selection, not the constructor baseline", () => {
  const { el } = setup();
  const editor = new AircraftEditor(
    parseAircraft(bronco),
    () => {},
    () => {},
  );
  const saved = parseAircraft(bronco);
  saved.parts[0].massKg += 0.1;
  editor.switchTo(saved);
  expect(massProperties(editor.draft).mass).toBeCloseTo(0.93);
  expect(el("edit-mass").value).toBe("930.0");
});
