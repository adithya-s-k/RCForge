import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { resolve, join } from "node:path";
import { parseAircraft } from "../src/core/schema";
import { SIM_VERSION } from "../src/core/versions";
import { referenceCases } from "./reference/cases";
import {
  compareCase,
  compareReferenceResolution,
  validateCoverage,
  type ReferenceOutput,
} from "./reference/compare";

const hash = (s: string) => createHash("sha256").update(s).digest("hex");
const args = process.argv.slice(2);
let python =
  process.env.RCFORGE_REFERENCE_PYTHON ?? "results/reference/.venv/bin/python";
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--python" && args[i + 1]) python = args[++i];
  else
    throw new Error(
      "Usage: npm run physics:reference -- [--python /path/to/python]",
    );
}
const out = resolve("results/validation/reference");
await mkdir(out, { recursive: true });
// A failed rerun must never leave a previous green report at the canonical path.
await writeFile(
  join(out, "report.json"),
  JSON.stringify({ passed: false, status: "running" }),
);
await writeFile(
  join(out, "report.html"),
  "<!doctype html><title>Reference verification</title><p>Verification is running or did not complete. No passing result is available.</p>",
);
const files = (await readdir("aircraft"))
  .filter((p) => p.endsWith(".json"))
  .sort();
const definitions = await Promise.all(
  files.map((p) => readFile(join("aircraft", p), "utf8")),
);
const cases = referenceCases(
  definitions.map((s) => parseAircraft(JSON.parse(s))),
);
const sourceFiles = [
  "scripts/physics-reference.ts",
  "scripts/reference/jsbsim_reference.py",
  "scripts/reference/cases.ts",
  "scripts/reference/compare.ts",
  "scripts/reference/requirements.txt",
];
const adapterSHA256 = Object.fromEntries(
  await Promise.all(
    sourceFiles.map(async (p) => [p, hash(await readFile(p, "utf8"))]),
  ),
);
const coreFiles = (await readdir("src/core", { recursive: true }))
  .filter((p) => p.endsWith(".ts"))
  .sort();
const coreSHA256 = Object.fromEntries(
  await Promise.all(
    coreFiles.map(async (p) => [
      p,
      hash(await readFile(join("src/core", p), "utf8")),
    ]),
  ),
);
const references: ReferenceOutput[] = [];
for (const [suffix, requestCases] of [
  ["3840", cases],
  ["7680", cases.map((c) => ({ ...c, referenceDt: 1 / 7680 }))],
] as const) {
  const request = JSON.stringify({ formatVersion: 1, cases: requestCases });
  const requestPath = join(out, `request-${suffix}.json`),
    resultPath = join(out, `jsbsim-${suffix}.json`);
  await writeFile(requestPath, request);
  const process = spawnSync(
    python,
    ["scripts/reference/jsbsim_reference.py", requestPath, resultPath],
    { encoding: "utf8", timeout: 180_000, maxBuffer: 16 * 1024 * 1024 },
  );
  await writeFile(
    join(out, `jsbsim-${suffix}.log`),
    `${process.stdout ?? ""}\n${process.stderr ?? ""}`,
  );
  if (process.error || process.status !== 0)
    throw new Error(
      `JSBSim reference failed (${process.error?.message ?? process.status}). See ${out}/jsbsim-${suffix}.log.\nSet up: python3 -m venv results/reference/.venv && results/reference/.venv/bin/python -m pip install -r scripts/reference/requirements.txt`,
    );
  references.push(
    validateCoverage(
      requestCases,
      JSON.parse(await readFile(resultPath, "utf8")),
      hash(request),
    ),
  );
}
const comparisons = cases.map((c) => {
  const coarse = references[0].cases.find((r) => r.id === c.id)!;
  const fine = references[1].cases.find((r) => r.id === c.id)!;
  const result = compareCase(c, coarse);
  result.metrics.push(...compareReferenceResolution(c, coarse, fine));
  result.pass = result.metrics.every((m) => m.pass);
  return result;
});
const report = {
  formatVersion: 1,
  simulationVersion: SIM_VERSION,
  generatedAt: new Date().toISOString(),
  reference: {
    engine: references[0].engine,
    version: references[0].version,
    upstreamCommit: references[0].upstreamCommit,
  },
  requestSHA256: references.map((r) => r.requestSHA256),
  adapterSHA256,
  coreSHA256,
  aircraftSHA256: Object.fromEntries(
    files.map((f, i) => [f, hash(definitions[i])]),
  ),
  scope:
    "Independent implementation agreement for matched reduced models; not measured-aircraft calibration or full flight-controller validation.",
  excluded: [
    "Measured flight accuracy",
    "Propwash and rotor-wing interference",
    "Servo/motor transients",
    "Battery charge integration",
    "Closed-loop quad/VTOL controllers",
    "Ground and obstacle contacts",
    "Tabulated aerodynamic polars",
    "Browser wall-clock scheduling",
  ],
  passed: comparisons.every((c) => c.pass),
  cases: comparisons,
};
await writeFile(
  join(out, "report.json"),
  JSON.stringify(report, null, 2) + "\n",
);
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
await writeFile(
  join(out, "report.html"),
  `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>RCForge / JSBSim verification</title>
<style>:root{color-scheme:light dark}body{font:15px/1.6 system-ui;max-width:1100px;margin:40px auto;padding:0 20px}table{border-collapse:collapse;width:100%}td,th{padding:8px;text-align:left;border-bottom:1px solid #8886}.fail{color:#d55}summary{cursor:pointer}code{overflow-wrap:anywhere}</style>
<h1>RCForge / JSBSim verification</h1><p>${report.passed ? "Passed" : "Failed"} · ${comparisons.length} cases · JSBSim ${report.reference.version} · RCForge physics ${SIM_VERSION}</p>
<p>${escape(report.scope)}</p><p>Native JSBSim mass assembly and rigid-body integration; independently configured force expressions, tables and native wind-axis cases. Shared aircraft estimates are not experimental evidence.</p>
<details><summary>Coverage limits and provenance</summary><p>${report.excluded.map(escape).join(" · ")}</p><pre><code>${escape(JSON.stringify({ ...report, cases: undefined }, null, 2))}</code></pre></details>
${comparisons.map((c) => `<details ${c.pass ? "" : "open"}><summary class="${c.pass ? "" : "fail"}">${escape(c.id)} · ${c.pass ? "passed" : "failed"}</summary><table><tr><th>Metric</th><th>Error</th><th>Limit</th></tr>${c.metrics.map((m) => `<tr class="${m.pass ? "" : "fail"}"><td>${escape(m.name)}</td><td>${m.value.toExponential(5)}</td><td>${m.limit.toExponential(5)}</td></tr>`).join("")}</table></details>`).join("")}</html>`,
);
console.table(
  comparisons
    .filter((c) => !c.pass)
    .flatMap((c) =>
      c.metrics.filter((m) => !m.pass).map((m) => ({ case: c.id, ...m })),
    ),
);
console.log(
  `${report.passed ? "PASS" : "FAIL"}: ${comparisons.length} cases, ${comparisons.reduce((s, c) => s + c.metrics.length, 0)} checks. Report: ${out}/report.html`,
);
if (!report.passed) process.exitCode = 1;
