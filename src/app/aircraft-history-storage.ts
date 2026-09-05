import { parseAircraft, type Aircraft } from "../core/schema";
import { SIM_VERSION } from "../core/simulation";
import { APP_VERSION } from "./release";
import {
  AircraftHistorySchema,
  HISTORY_FORMAT_VERSION,
  MAX_AIRCRAFT_REVISIONS,
  MAX_HISTORY_BYTES,
  parseAircraftHistory,
  sameAircraft,
  canonicalDefinition,
  type AircraftHistory,
  type AircraftRevision,
} from "../core/aircraft-history";

const prefix = "rcforge.aircraft-history.v1.";
type HistoryStorage = Pick<Storage, "getItem" | "setItem">;
const storageOrDefault = (storage?: HistoryStorage) =>
  storage ?? globalThis.localStorage;
export function readAircraftHistory(
  id: string,
  storage?: HistoryStorage,
): AircraftHistory {
  const text = storageOrDefault(storage).getItem(prefix + id);
  if (text === null)
    return {
      format: "rcforge-aircraft-history",
      formatVersion: HISTORY_FORMAT_VERSION,
      aircraftId: id,
      nextRevision: 1,
      entries: [],
    };
  const history = parseAircraftHistory(text);
  if (history.aircraftId !== id)
    throw new Error("History belongs to another aircraft.");
  return history;
}
function write(history: AircraftHistory, storage?: HistoryStorage) {
  if (history.entries.length > MAX_AIRCRAFT_REVISIONS)
    throw new Error(
      "History is full. Export a backup, then delete an older version to make room.",
    );
  const valid = AircraftHistorySchema.parse(history),
    text = JSON.stringify(valid);
  if (new TextEncoder().encode(text).byteLength > MAX_HISTORY_BYTES)
    throw new Error(
      "History is full. Export a backup, then delete an older version to make room.",
    );
  // One localStorage write: quota failures never discard previous revisions.
  storageOrDefault(storage).setItem(prefix + history.aircraftId, text);
  return valid;
}
export function saveAircraftRevision(
  aircraft: Aircraft,
  options: {
    name?: string;
    kind?: AircraftRevision["kind"];
    previous?: Aircraft;
  } = {},
  storage?: HistoryStorage,
): { entry: AircraftRevision; created: boolean } {
  const a = parseAircraft(aircraft),
    history = readAircraftHistory(a.id, storage);
  const append = (
    snapshot: Aircraft,
    name: string,
    kind: AircraftRevision["kind"],
  ) => {
    const entry: AircraftRevision = {
      id: crypto.randomUUID(),
      revision: history.nextRevision++,
      name,
      kind,
      createdAt: new Date().toISOString(),
      appVersion: APP_VERSION,
      simulationVersion: SIM_VERSION,
      aircraft: snapshot,
    };
    history.entries.push(entry);
    return entry;
  };
  const last = history.entries.at(-1);
  const namedCheckpoint =
    options.kind === "checkpoint" &&
    options.name?.trim() &&
    options.name.trim() !== last?.name;
  if (last && sameAircraft(last.aircraft, a) && !namedCheckpoint)
    return { entry: last, created: false };
  if (
    !last &&
    options.previous &&
    options.previous.id === a.id &&
    !sameAircraft(options.previous, a)
  )
    append(parseAircraft(options.previous), "Starting point", "baseline");
  const entry = append(
    a,
    options.name?.trim() ||
      (options.kind === "applied" ? "Applied setup" : "Saved setup"),
    options.kind ?? "checkpoint",
  );
  write(history, storage);
  return { entry, created: true };
}
export function deleteAircraftRevision(
  aircraftId: string,
  revisionId: string,
  storage?: HistoryStorage,
) {
  const history = readAircraftHistory(aircraftId, storage);
  history.entries = history.entries.filter((entry) => entry.id !== revisionId);
  return write(history, storage);
}
/** Merge an archive without overwriting, renumbering existing local entries or applying an aircraft. */
export function importAircraftHistory(text: string, storage?: HistoryStorage) {
  const incoming = parseAircraftHistory(text),
    history = readAircraftHistory(incoming.aircraftId, storage);
  for (const entry of incoming.entries) {
    const present = history.entries.find((e) => e.id === entry.id);
    if (present) {
      const { revision: _a, ...old } = present,
        { revision: _b, ...next } = entry;
      if (canonicalDefinition(old) !== canonicalDefinition(next))
        throw new Error(
          "A version ID conflicts with local history. Existing versions were kept.",
        );
      continue;
    }
    history.entries.push({ ...entry, revision: history.nextRevision++ });
  }
  return write(history, storage);
}
