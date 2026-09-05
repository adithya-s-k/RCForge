import { parseAircraft, type Aircraft } from "../core/schema";

const selectionKey = "rcforge.selected-aircraft.v1";
const aircraftPrefix = "rcforge.aircraft.v3.";
const importedKey = "rcforge.imported-aircraft.v1";
const maxImported = 32;
const maxCatalogCharacters = 2_000_000;
type ReadStorage = Pick<Storage, "getItem">;
type WriteStorage = Pick<Storage, "setItem">;

/** Local source definitions make applied imports discoverable after a reload. */
export function importedAircraft(
  bundled: Aircraft[],
  storage?: ReadStorage,
): Aircraft[] {
  try {
    const text = (storage ?? globalThis.localStorage).getItem(importedKey);
    if (!text || text.length > maxCatalogCharacters) return [];
    const data: unknown = JSON.parse(text);
    if (!Array.isArray(data) || data.length > maxImported) return [];
    const seen = new Set(bundled.map((a) => a.id));
    const result: Aircraft[] = [];
    for (const entry of data) {
      try {
        const aircraft = parseAircraft(entry);
        if (seen.has(aircraft.id)) continue;
        seen.add(aircraft.id);
        result.push(aircraft);
      } catch {
        // One obsolete import must not hide the remaining valid aircraft.
      }
    }
    return result;
  } catch {
    return [];
  }
}

/** Supply a source only for an unbundled import. Failure keeps flight usable. */
export function saveAppliedAircraft(
  aircraft: Aircraft,
  source?: Aircraft,
  storage?: ReadStorage & WriteStorage,
): boolean {
  try {
    const target = storage ?? globalThis.localStorage;
    const definition = parseAircraft(aircraft);
    const applied = JSON.stringify(definition);
    if (applied.length > 1_000_000) return false;
    let catalog: string | undefined;
    if (source) {
      const original = parseAircraft(source);
      if (original.id !== definition.id) return false;
      const entries = importedAircraft([], target);
      const index = entries.findIndex((a) => a.id === original.id);
      if (index < 0) entries.push(original);
      else entries[index] = original;
      catalog = JSON.stringify(entries);
      if (entries.length > maxImported || catalog.length > maxCatalogCharacters)
        return false;
    }
    target.setItem(aircraftPrefix + definition.id, applied);
    if (catalog !== undefined) target.setItem(importedKey, catalog);
    return true;
  } catch {
    return false;
  }
}

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
