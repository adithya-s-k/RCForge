import { describe, expect, it } from "vitest";
import { version } from "../package.json";
import bronco from "../aircraft/ft-bronco.json";
import { parseAircraft } from "../src/core/schema";
import {
  aircraftDifferences,
  canonicalDefinition,
  MAX_HISTORY_BYTES,
  parseAircraftHistory,
  sameAircraft,
} from "../src/core/aircraft-history";
import {
  deleteAircraftRevision,
  importAircraftHistory,
  readAircraftHistory,
  saveAircraftRevision,
} from "../src/app/aircraft-history-storage";

const base = () => parseAircraft(bronco);
const memory = () => {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
  };
};
const key = `rcforge.aircraft-history.v1.${bronco.id}`;
describe("aircraft revision persistence", () => {
  it("saves the starting setup before the first change and keeps independent immutable snapshots", () => {
    const storage = memory(),
      original = base(),
      draft = base();
    draft.parts[0].massKg += 0.02;
    const saved = saveAircraftRevision(
      draft,
      { previous: original, kind: "applied", name: "Heavier wing" },
      storage,
    );
    expect(saved.entry.revision).toBe(2);
    draft.parts[0].massKg += 0.04;
    const history = readAircraftHistory(original.id, storage);
    expect(history.entries[0].aircraft).toEqual(original);
    expect(history.entries[1].aircraft.parts[0].massKg).toBeCloseTo(
      original.parts[0].massKg + 0.02,
    );
    expect(history.entries[1].name).toBe("Heavier wing");
    expect(history.entries[1].appVersion).toBe(version);
  });
  it("deduplicates unchanged applies including JSON object key order", () => {
    const storage = memory(),
      a = base();
    saveAircraftRevision(a, {}, storage);
    const reordered = Object.fromEntries(Object.entries(a).reverse());
    expect(canonicalDefinition({ z: 1, a: 2 })).toBe(
      canonicalDefinition({ a: 2, z: 1 }),
    );
    expect(
      saveAircraftRevision(parseAircraft(reordered), {}, storage).created,
    ).toBe(false);
    expect(readAircraftHistory(a.id, storage).entries).toHaveLength(1);
  });
  it("allows a named checkpoint of an already applied setup without duplicating repeated names", () => {
    const storage = memory(),
      a = base();
    saveAircraftRevision(a, { kind: "applied" }, storage);
    expect(
      saveAircraftRevision(
        a,
        { name: "Ready for flying", kind: "checkpoint" },
        storage,
      ).entry.revision,
    ).toBe(2);
    expect(
      saveAircraftRevision(
        a,
        { name: "Ready for flying", kind: "checkpoint" },
        storage,
      ).created,
    ).toBe(false);
  });
  it("keeps aircraft histories separate and never reuses deleted revision numbers", () => {
    const storage = memory(),
      a = base();
    const first = saveAircraftRevision(a, {}, storage).entry;
    deleteAircraftRevision(a.id, first.id, storage);
    expect(saveAircraftRevision(a, {}, storage).entry.revision).toBe(2);
    const other = { ...a, id: "another-bronco" };
    expect(saveAircraftRevision(other, {}, storage).entry.revision).toBe(1);
    expect(readAircraftHistory(a.id, storage).entries).toHaveLength(1);
  });
  it("leaves all stored versions intact on quota errors, invalid edits and full history", () => {
    const storage = memory(),
      a = base();
    for (let i = 0; i < 40; i++) {
      a.parts[0].massKg += 0.0001;
      saveAircraftRevision(a, {}, storage);
    }
    const before = storage.getItem(key);
    a.parts[0].massKg += 0.01;
    expect(() => saveAircraftRevision(a, {}, storage)).toThrow(
      "History is full",
    );
    expect(storage.getItem(key)).toBe(before);
    const quota = {
      getItem: storage.getItem,
      setItem: () => {
        throw new Error("quota");
      },
    };
    expect(() =>
      deleteAircraftRevision(
        a.id,
        readAircraftHistory(a.id, storage).entries[0].id,
        quota,
      ),
    ).toThrow("quota");
    expect(storage.getItem(key)).toBe(before);
    a.parts[0].massKg = -1;
    expect(() => saveAircraftRevision(a, {}, storage)).toThrow();
    expect(storage.getItem(key)).toBe(before);
  });
  it("does not overwrite unreadable or mismatched existing history", () => {
    const storage = memory();
    for (const invalid of [
      "",
      "{",
      " ".repeat(MAX_HISTORY_BYTES + 1),
      JSON.stringify({ formatVersion: 2 }),
    ]) {
      storage.setItem(key, invalid);
      expect(() => saveAircraftRevision(base(), {}, storage)).toThrow();
      expect(storage.getItem(key)).toBe(invalid);
    }
    storage.values.clear();
    saveAircraftRevision({ ...base(), id: "other-plane" }, {}, storage);
    const other = storage.getItem("rcforge.aircraft-history.v1.other-plane")!;
    storage.setItem(key, other);
    expect(() => saveAircraftRevision(base(), {}, storage)).toThrow(
      "another aircraft",
    );
    expect(storage.getItem(key)).toBe(other);
  });
});

describe("portable aircraft archives", () => {
  it("merges backups without replacing local versions; repeat import is idempotent", () => {
    const source = memory(),
      destination = memory(),
      a = base();
    saveAircraftRevision(a, { name: "Home setup" }, source);
    a.parts[0].positionM[0] += 0.01;
    saveAircraftRevision(a, { name: "Forward wing" }, source);
    const archive = source.getItem(key)!;
    const local = base();
    local.parts[1].massKg += 0.01;
    const existing = saveAircraftRevision(
      local,
      { name: "Laptop setup" },
      destination,
    ).entry;
    const merged = importAircraftHistory(archive, destination);
    expect(merged.entries).toHaveLength(3);
    expect(merged.entries[0]).toEqual(existing);
    expect(merged.entries[2].aircraft).toEqual(a);
    expect(importAircraftHistory(archive, destination)).toEqual(merged);
    expect(merged.entries.map((e) => e.revision)).toEqual([1, 2, 3]);
  });
  it("rejects conflicts, future formats, duplicate IDs and invalid aircraft before writing", () => {
    const storage = memory();
    saveAircraftRevision(base(), {}, storage);
    const text = storage.getItem(key)!,
      history = parseAircraftHistory(text);
    history.entries[0].aircraft.name = "Different snapshot with same ID";
    expect(() =>
      importAircraftHistory(JSON.stringify(history), storage),
    ).toThrow("conflicts");
    expect(storage.getItem(key)).toBe(text);
    const malformed = [
      { ...history, formatVersion: 2 },
      { ...history, aircraftId: "wrong-aircraft" },
      {
        ...history,
        nextRevision: 3,
        entries: [...history.entries, { ...history.entries[0], revision: 2 }],
      },
      { ...history, nextRevision: 1 },
      {
        ...history,
        entries: [
          { ...history.entries[0], aircraft: { id: "missing-everything" } },
        ],
      },
    ];
    for (const value of malformed)
      expect(() =>
        importAircraftHistory(JSON.stringify(value), storage),
      ).toThrow();
    expect(storage.getItem(key)).toBe(text);
  });
});

it("compares component mass and placement by ID, including additions, removal and order", () => {
  const before = base(),
    after = base();
  after.parts[0].massKg += 0.02;
  after.parts[0].positionM[0] += 0.01;
  after.parts.reverse();
  const changes = aircraftDifferences(before, after);
  expect(
    changes.some(
      (row) =>
        row.path
          .toLowerCase()
          .includes(before.parts[0].id.replaceAll("-", " ")) &&
        row.after.endsWith(" g"),
    ),
  ).toBe(true);
  expect(
    changes.some(
      (row) =>
        row.path.toLowerCase().includes("position") && row.after.includes("mm"),
    ),
  ).toBe(true);
  expect(changes.some((row) => row.path.endsWith("order"))).toBe(true);
  expect(sameAircraft(before, after)).toBe(false);
  after.parts.pop();
  expect(
    aircraftDifferences(before, after).some((row) => row.after === "Removed"),
  ).toBe(true);
  expect(aircraftDifferences(before, before)).toEqual([]);
});

it("counts UTF-8 bytes in archive size limits and ignores undefined optional fields", () => {
  expect(() => parseAircraftHistory("é".repeat(900_001))).toThrow("exceeds");
  expect(canonicalDefinition({ present: 1, absent: undefined })).toBe(
    canonicalDefinition({ present: 1 }),
  );
});
