import { expect, it } from "vitest";
import bronco from "../aircraft/ft-bronco.json";
import tiny from "../aircraft/ft-tiny-trainer.json";
import { parseAircraft } from "../src/core/schema";
import {
  importedAircraft,
  preferredAircraft,
  rememberAircraft,
  saveAppliedAircraft,
  savedAircraft,
} from "../src/app/aircraft-storage";

const models = [parseAircraft(bronco), parseAircraft(tiny)];
const store = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
  };
};

it("restores the last available catalog selection and its applied definition", () => {
  const storage = store();
  expect(preferredAircraft(models, storage)).toBe(models[0]);
  rememberAircraft(models[1].id, storage);
  const applied = structuredClone(models[1]);
  applied.parts[0].massKg += 0.01;
  storage.setItem("rcforge.aircraft.v3." + applied.id, JSON.stringify(applied));
  const base = preferredAircraft(models, storage);
  expect(base).toBe(models[1]);
  expect(savedAircraft(base, storage)).toEqual(applied);
  expect(base.parts[0].massKg).not.toBe(applied.parts[0].massKg);
});

it("recovers an applied import, its original baseline and selection after a fresh catalog load", () => {
  const storage = store();
  const source = structuredClone(models[1]);
  source.id = "my-sport-build";
  const applied = structuredClone(source);
  applied.parts[0].massKg += 0.012;
  expect(saveAppliedAircraft(applied, source, storage)).toBe(true);
  rememberAircraft(applied.id, storage);

  const recovered = [...models, ...importedAircraft(models, storage)];
  const original = preferredAircraft(recovered, storage);
  expect(original).toEqual(source);
  expect(savedAircraft(original, storage)).toEqual(applied);
  expect(original.parts[0].massKg).not.toBe(applied.parts[0].massKg);

  const revised = structuredClone(source);
  revised.parts[0].massKg += 0.02;
  expect(saveAppliedAircraft(revised, revised, storage)).toBe(true);
  expect(importedAircraft(models, storage)).toEqual([revised]);
  expect(source.parts[0].massKg).toBe(models[1].parts[0].massKg);
});

it("isolates corrupt imports, reserves bundled IDs and reports storage failures", () => {
  const storage = store();
  const source = { ...structuredClone(models[1]), id: "my-trainer" };
  storage.setItem(
    "rcforge.imported-aircraft.v1",
    JSON.stringify([null, models[0], source, source, { id: "incomplete" }]),
  );
  expect(importedAircraft(models, storage)).toEqual([source]);
  for (const data of ["{", " ".repeat(2_000_001), JSON.stringify({ source })]) {
    storage.setItem("rcforge.imported-aircraft.v1", data);
    expect(importedAircraft(models, storage)).toEqual([]);
  }
  expect(saveAppliedAircraft(source, models[0], storage)).toBe(false);
  expect(savedAircraft(source, storage)).toEqual(source);
  const full = {
    getItem: storage.getItem,
    setItem(): never {
      throw new Error("QuotaExceededError");
    },
  };
  expect(saveAppliedAircraft(source, source, full)).toBe(false);
  expect(
    importedAircraft(models, {
      getItem() {
        throw new Error("unavailable");
      },
    }),
  ).toEqual([]);
  expect(saveAppliedAircraft(models[0], undefined, storage)).toBe(true);
  expect(importedAircraft(models, storage)).toEqual([]);
});

it("falls back for removed selections, incompatible overrides and unavailable storage", () => {
  const storage = store();
  rememberAircraft("not-in-this-catalog", storage);
  expect(preferredAircraft(models, storage)).toBe(models[0]);
  for (const invalid of [
    "{",
    " ".repeat(1_000_001),
    JSON.stringify(models[1]),
  ]) {
    storage.setItem("rcforge.aircraft.v3." + models[0].id, invalid);
    const recovered = savedAircraft(models[0], storage);
    expect(recovered).toEqual(models[0]);
    expect(recovered).not.toBe(models[0]);
  }
  const unavailable = {
    getItem(): never {
      throw new Error("Storage unavailable");
    },
    setItem(): never {
      throw new Error("Storage unavailable");
    },
  };
  expect(preferredAircraft(models, unavailable)).toBe(models[0]);
  expect(savedAircraft(models[0], unavailable)).toEqual(models[0]);
  expect(() => rememberAircraft(models[1].id, unavailable)).not.toThrow();
});
