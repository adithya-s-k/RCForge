import { readReferences, cachedPlan, fetchPlan } from "../references/library";
import { readFileSync, readdirSync } from "node:fs";
import { parseAircraft } from "../src/core/schema";

const root = process.cwd();
const [mode, ...ids] = process.argv.slice(2);
if (!["check", "fetch"].includes(mode))
  throw Error("Use references:check or references:fetch [plan-id…]");
const manifest = readReferences(root);
for (const id of ids)
  if (!manifest.plans.some((p) => p.id === id))
    throw Error(`Unknown plan: ${id}`);
const plans = ids.length
  ? manifest.plans.filter((p) => ids.includes(p.id))
  : manifest.plans;
for (const plan of plans) {
  for (const id of plan.aircraftIds) {
    const a = parseAircraft(
      JSON.parse(readFileSync(`aircraft/${id}.json`, "utf8")),
    );
    if (!Object.values(a.provenance).some((source) => source.url === plan.url))
      throw Error(`${id}: missing citation to ${plan.id}`);
  }
  if (mode === "fetch")
    console.log(
      `${plan.id}: ${await fetchPlan(root, plan)} → references/local/${plan.file}`,
    );
  else
    console.log(
      `${plan.id}: manifest valid · ${cachedPlan(root, plan) ? "local PDF verified" : "not downloaded (optional)"}`,
    );
}
for (const file of readdirSync("aircraft").filter((f) => f.endsWith(".json"))) {
  const aircraft = parseAircraft(
    JSON.parse(readFileSync(`aircraft/${file}`, "utf8")),
  );
  if (!aircraft.credit) throw Error(`${file}: missing creator credit`);
}
console.log(
  "Original plans retain their creators' rights. Local copies are excluded from Git and the published site.",
);
