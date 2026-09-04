import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { parseAircraft } from "../src/core/schema";
import { surveyEnvelope } from "../src/core/envelope";
import { SIM_VERSION } from "../src/core/simulation";

const input = process.argv.slice(2);
const paths = input.length
  ? input.map((p) =>
      p.endsWith(".json") ? resolve(p) : resolve("aircraft", p + ".json"),
    )
  : (await readdir("aircraft"))
      .filter((p) => p.endsWith(".json"))
      .sort()
      .map((p) => resolve("aircraft", p));
const reports = [];
for (const path of paths) {
  const source = await readFile(path, "utf8");
  reports.push({
    definitionSHA256: createHash("sha256").update(source).digest("hex"),
    ...surveyEnvelope(parseAircraft(JSON.parse(source))),
  });
}
const report = {
  simulationVersion: SIM_VERSION,
  generatedAt: new Date().toISOString(),
  reports,
};
await mkdir("results/validation", { recursive: true });
await writeFile(
  "results/validation/envelope.json",
  JSON.stringify(report, null, 2),
);
const escape = (s: unknown) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
await writeFile(
  "results/validation/envelope.html",
  `<!doctype html><meta charset="utf-8"><title>RCForge operating points</title>
<style>body{background:#111;color:#ddd;font:14px system-ui;max-width:1200px;margin:40px auto;padding:20px}table{border-collapse:collapse;width:100%}td,th{padding:8px;text-align:left;border-bottom:1px solid #333}.warn{color:#e8b76b}summary{cursor:pointer}p{color:#aaa;line-height:1.6}</style>
<h1>Aircraft operating points</h1><p>Engine ${SIM_VERSION}. Mass changes uniformly scale the whole build and inertia; this is a sensitivity test, not a component substitution. Calm air at each site's density. Fixed-wing speed sweep; quad hover at three charge levels. Green checks are deliberately absent: trim is not proof of stability or physical accuracy.</p>
${reports
  .map(
    (
      r,
    ) => `<h2>${escape(r.aircraft)}</h2><p>${r.points.filter((p) => p.trimmed).length}/${r.points.length} trim solutions · ${r.nonfiniteLoads} nonfinite load cases</p><details><summary>Source and coefficient evidence</summary><pre>${escape(JSON.stringify(r.coefficientEvidence, null, 2))}</pre></details>
<table><tr><th>Field</th><th>Mass</th><th>SOC</th><th>Speed</th><th>Power</th><th>Trim</th><th>Aerodynamic data</th></tr>${r.points.map((p) => `<tr><td>${escape(p.site)}</td><td>${(p.massKg * 1000).toFixed(0)} g</td><td>${p.soc === null ? "—" : Math.round(p.soc * 100) + "%"}</td><td>${p.speedMps} m/s</td><td>${Math.round(p.throttle * 100)}%</td><td class="${p.trimmed ? "" : "warn"}">${p.trimmed ? "Solved" : "Not solved"}</td><td>${p.surfaces.length ? (p.surfaces.some((s) => s.outsideData) ? "Outside supplied data" : p.surfaces.some((s) => s.source === "analytical") ? "Includes analytical estimates" : "Within supplied tables") : "Rotor model"}</td></tr>`).join("")}</table>`,
  )
  .join("")}`,
);
console.table(
  reports.map((r) => ({
    aircraft: r.aircraft,
    operatingPoints: r.points.length,
    trimSolutions: r.points.filter((p) => p.trimmed).length,
    nonfiniteLoads: r.nonfiniteLoads,
  })),
);
console.log(
  "Written results/validation/envelope.{json,html}. Numerical survey, not real-flight calibration.",
);
if (reports.some((r) => r.nonfiniteLoads)) process.exitCode = 1;
