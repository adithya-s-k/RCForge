import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseAircraft } from "../src/core/schema";
export function argumentsFor(allowed: string[]) {
  const args = process.argv.slice(2),
    options: Record<string, string> = {};
  let aircraft = "ft-bronco";
  if (args[0] && !args[0].startsWith("--")) aircraft = args.shift()!;
  while (args.length) {
    const k = args.shift()!;
    if (!k.startsWith("--") || !allowed.includes(k.slice(2)))
      throw new Error("Unknown option: " + k);
    const v = args.shift();
    if (!v || v.startsWith("--")) throw new Error("Missing value for " + k);
    options[k.slice(2)] = v;
  }
  return { aircraft, options };
}
export async function loadAircraft(id: string) {
  const path = id.endsWith(".json")
    ? resolve(id)
    : resolve("aircraft", id + ".json");
  return parseAircraft(JSON.parse(await readFile(path, "utf8")));
}
export function fail(e: unknown) {
  console.error(e instanceof Error ? e.message : String(e));
  process.exitCode = 1;
}
