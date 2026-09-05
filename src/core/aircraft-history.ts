import { z } from "zod";
import { AircraftSchema, type Aircraft } from "./schema";

export const HISTORY_FORMAT_VERSION = 1;
export const MAX_AIRCRAFT_REVISIONS = 40;
export const MAX_HISTORY_BYTES = 1_800_000;
const RevisionSchema = z
  .object({
    id: z.string().uuid(),
    revision: z.number().int().positive().max(1_000_000),
    name: z.string().trim().min(1).max(80),
    createdAt: z.string().datetime(),
    appVersion: z.string().max(64),
    simulationVersion: z.string().max(64),
    kind: z.enum(["baseline", "applied", "checkpoint"]),
    aircraft: AircraftSchema,
  })
  .strict();
export const AircraftHistorySchema = z
  .object({
    format: z.literal("rcforge-aircraft-history"),
    formatVersion: z.literal(HISTORY_FORMAT_VERSION),
    aircraftId: z.string().min(1).max(100),
    nextRevision: z.number().int().positive().max(1_000_001),
    entries: z.array(RevisionSchema).max(MAX_AIRCRAFT_REVISIONS),
  })
  .strict()
  .superRefine((history, ctx) => {
    const ids = new Set<string>();
    let last = 0;
    for (const entry of history.entries) {
      if (
        entry.aircraft.id !== history.aircraftId ||
        ids.has(entry.id) ||
        entry.revision <= last ||
        entry.revision >= history.nextRevision
      )
        ctx.addIssue({
          code: "custom",
          message: "History contains mismatched or duplicate revisions.",
        });
      ids.add(entry.id);
      last = entry.revision;
    }
  });
export type AircraftHistory = z.infer<typeof AircraftHistorySchema>;
export type AircraftRevision = AircraftHistory["entries"][number];

/** Object key order is not an edit; array order remains meaningful. */
export function canonicalDefinition(value: unknown): string {
  if (Array.isArray(value))
    return `[${value.map(canonicalDefinition).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => `${JSON.stringify(key)}:${canonicalDefinition(v)}`)
      .join(",")}}`;
  return JSON.stringify(value) ?? "undefined";
}
export function sameAircraft(a: Aircraft, b: Aircraft) {
  return canonicalDefinition(a) === canonicalDefinition(b);
}
export function parseAircraftHistory(text: string): AircraftHistory {
  if (new TextEncoder().encode(text).byteLength > MAX_HISTORY_BYTES)
    throw new Error("Aircraft history exceeds the 1.8 MB limit.");
  return AircraftHistorySchema.parse(JSON.parse(text));
}

export interface AircraftDifference {
  path: string;
  before: string;
  after: string;
}
const label = (key: string) =>
  (key === "parts" ? "Components" : key)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("-", " ")
    .replace(/\b(M|Kg|M2|Deg|Mps)$/, "")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
function display(value: unknown, key: string): string {
  if (value === undefined) return "—";
  if (typeof value === "number") {
    const unit = /Kg$/.test(key)
      ? "g"
      : /M$/.test(key)
        ? "mm"
        : /Deg$/.test(key)
          ? "°"
          : "";
    const n = unit === "g" || unit === "mm" ? value * 1000 : value;
    return `${Number(n.toFixed(unit === "g" || unit === "mm" ? 2 : 4))}${unit ? ` ${unit}` : ""}`;
  }
  if (Array.isArray(value) && value.every((v) => typeof v === "number"))
    return value.map((v) => display(v, key)).join(" / ");
  if (typeof value === "object") return "Configured";
  const text = String(value);
  return text.length > 180 ? text.slice(0, 177) + "…" : text;
}
/** Human-readable definition differences, including components matched by stable ID. */
export function aircraftDifferences(
  before: Aircraft,
  after: Aircraft,
): AircraftDifference[] {
  const rows: AircraftDifference[] = [];
  const visit = (a: unknown, b: unknown, path: string[], key: string) => {
    if (canonicalDefinition(a) === canonicalDefinition(b)) return;
    if (path[0] === "provenance") {
      if (path.length === 1)
        rows.push({
          path: "Sources & model assumptions",
          before: "Previous notes",
          after: "Updated notes",
        });
      return;
    }
    if (
      Array.isArray(a) &&
      Array.isArray(b) &&
      [...a, ...b].every(
        (v) => v && typeof v === "object" && typeof v.id === "string",
      )
    ) {
      const old = new Map(a.map((v) => [v.id, v])),
        next = new Map(b.map((v) => [v.id, v]));
      for (const id of new Set([...old.keys(), ...next.keys()])) {
        if (!old.has(id) || !next.has(id))
          rows.push({
            path: [...path, id].map(label).join(" / "),
            before: old.has(id) ? "Installed" : "—",
            after: next.has(id) ? "Installed" : "Removed",
          });
        else visit(old.get(id), next.get(id), [...path, id], id);
      }
      if (
        a.length === b.length &&
        a.every((v) => next.has(v.id)) &&
        a.some((v, i) => v.id !== b[i].id)
      )
        rows.push({
          path: `${path.map(label).join(" / ")} / order`,
          before: a.map((v) => v.id).join(", "),
          after: b.map((v) => v.id).join(", "),
        });
      return;
    }
    if (
      a &&
      b &&
      typeof a === "object" &&
      typeof b === "object" &&
      !Array.isArray(a) &&
      !Array.isArray(b)
    ) {
      const left = a as Record<string, unknown>,
        right = b as Record<string, unknown>;
      for (const child of new Set([
        ...Object.keys(left),
        ...Object.keys(right),
      ]))
        visit(left[child], right[child], [...path, child], child);
      return;
    }
    if (
      Array.isArray(a) &&
      Array.isArray(b) &&
      ![...a, ...b].every((v) => typeof v === "number")
    ) {
      for (let i = 0; i < Math.max(a.length, b.length); i++)
        visit(a[i], b[i], [...path, String(i + 1)], key);
      return;
    }
    rows.push({
      path: path.map(label).join(" / "),
      before: display(a, key),
      after: display(b, key),
    });
  };
  visit(before, after, [], "");
  return rows.sort(
    (a, b) =>
      Number(a.path === "Sources & model assumptions") -
      Number(b.path === "Sources & model assumptions"),
  );
}
