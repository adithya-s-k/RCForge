import { expect, it } from "vitest";
import bronco from "../aircraft/ft-bronco.json";
import tiny from "../aircraft/ft-tiny-trainer.json";
import { parseAircraft } from "../src/core/schema";
import {
  preferredAircraft,
  rememberAircraft,
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
