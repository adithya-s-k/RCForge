import { parseAircraft, type Aircraft } from "../core/schema";

const selectionKey = "rcforge.selected-aircraft.v1";
const aircraftPrefix = "rcforge.aircraft.v3.";
type ReadStorage = Pick<Storage, "getItem">;
type WriteStorage = Pick<Storage, "setItem">;

/** Restore a catalog selection only. Every new session still starts parked. */
export function preferredAircraft(
  available: Aircraft[],
  storage?: ReadStorage,
): Aircraft {
  if (!available.length) throw new Error("The aircraft catalog is empty.");
  try {
    const id = (storage ?? globalThis.localStorage).getItem(selectionKey);
    return available.find((a) => a.id === id) ?? available[0];
  } catch {
    return available[0];
  }
}

export function rememberAircraft(id: string, storage?: WriteStorage): void {
  try {
    (storage ?? globalThis.localStorage).setItem(selectionKey, id);
  } catch {
    // Selection is a preference; unavailable storage must not prevent flight.
  }
}

/** A saved override must belong to the requested catalog entry. */
export function savedAircraft(base: Aircraft, storage?: ReadStorage): Aircraft {
  try {
    const text = (storage ?? globalThis.localStorage).getItem(
      aircraftPrefix + base.id,
    );
    if (text && text.length <= 1_000_000) {
      const saved = parseAircraft(JSON.parse(text));
      if (saved.id === base.id) return saved;
    }
  } catch {
    // Invalid/obsolete local data falls back to the source definition.
  }
  return structuredClone(base);
}
