/** Publish a small, auditable summary of completed local verification runs.
 * Raw trajectories and third-party downloads remain in ignored results/.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { SIM_VERSION } from "../src/core/versions";

const sha = (text: string) => createHash("sha256").update(text).digest("hex");
const read = (name: string) =>
  JSON.parse(readFileSync(`results/validation/${name}.json`, "utf8"));
const numeric = read("report"),
  reference = read("reference/report"),
  nasa = read("nasa/report"),
  envelope: {
    simulationVersion: string;
    generatedAt: string;
    reports: {
      aircraft: string;
      definitionSHA256: string;
      nonfiniteLoads: number;
      points: {
        trimmed: boolean;
        site: string;
        speedMps: number;
        massScale: number;
        soc: number | null;
      }[];
    }[];
  } = read("envelope"),
  tests = read("tests");
for (const report of [numeric, reference, nasa]) {
  assert.equal(
    report.passed,
    true,
    "Run all numerical/reference checks successfully first",
  );
  assert.equal(report.simulationVersion, SIM_VERSION);
}
assert.equal(envelope.simulationVersion, SIM_VERSION);
assert.equal(tests.success, true);
assert.equal(tests.numPendingTests, 0);
assert.equal(tests.numTotalTests, tests.numPassedTests);
const aircraftFiles = readdirSync("aircraft")
  .filter((p) => p.endsWith(".json"))
  .sort();
assert.deepEqual(
  Object.keys(reference.aircraftSHA256).sort(),
  aircraftFiles,
  "Run the reference comparison for all current aircraft",
);
const definitions = aircraftFiles.map((path) =>
  readFileSync(`aircraft/${path}`, "utf8"),
);
assert.equal(
  numeric.definitionSHA256,
  sha(definitions.join("\n")),
  "Stale numerical aircraft definitions",
);
assert.equal(envelope.reports.length, aircraftFiles.length);
assert.equal(
  new Set(envelope.reports.map((r) => r.aircraft)).size,
  aircraftFiles.length,
);
for (const source of definitions) {
  const id = JSON.parse(source).id;
  assert.equal(
    envelope.reports.find((r) => r.aircraft === id)?.definitionSHA256,
    sha(source),
    `Stale envelope: ${id}`,
  );
}
// A historical report cannot be presented as a run of changed physics.
for (const report of [reference, nasa])
  for (const [path, digest] of Object.entries(report.coreSHA256))
    assert.equal(
      sha(readFileSync(`src/core/${path}`, "utf8")),
      digest,
      `Stale core: ${path}`,
    );
for (const [path, digest] of Object.entries(reference.aircraftSHA256))
  assert.equal(
    sha(readFileSync(`aircraft/${path}`, "utf8")),
    digest,
    `Stale aircraft: ${path}`,
  );
for (const [path, digest] of Object.entries(reference.adapterSHA256))
  assert.equal(
    sha(readFileSync(path, "utf8")),
    digest,
    `Stale adapter: ${path}`,
  );
assert.equal(
  sha(readFileSync("scripts/physics-nasa.ts", "utf8")),
  nasa.scriptSHA256,
);
execFileSync(
  "git",
  ["diff", "--exit-code", "HEAD", "--", "src", "aircraft", "tests"],
  { stdio: "pipe" },
);
const date = nasa.generatedAt.slice(0, 10);
assert.match(date, /^\d{4}-\d{2}-\d{2}$/);
const metrics: Record<string, { value: number; limit: number; case: string }> =
  {};
for (const c of reference.cases)
  for (const m of c.metrics) {
    assert.equal(m.pass, true);
    assert(Number.isFinite(m.value) && Number.isFinite(m.limit));
    if (!metrics[m.name] || metrics[m.name].value < m.value)
      metrics[m.name] = { value: m.value, limit: m.limit, case: c.id };
  }
const snapshot = {
  formatVersion: 1,
  date,
  sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  simulationVersion: SIM_VERSION,
  interpretation:
    "Dated software-verification summary, not an aircraft fidelity rating or a full NASA check-case pass. No new physical measurements were used.",
  reportSHA256: Object.fromEntries(
    ["report", "reference/report", "nasa/report", "envelope", "tests"].map(
      (name) => [
        name,
        sha(readFileSync(`results/validation/${name}.json`, "utf8")),
      ],
    ),
  ),
  runTimes: {
    numerical: numeric.generatedAt,
    jsbsim: reference.generatedAt,
    nasa: nasa.generatedAt,
    envelope: envelope.generatedAt,
    tests: new Date(tests.startTime).toISOString(),
  },
  coreSHA256: reference.coreSHA256,
  aircraftSHA256: reference.aircraftSHA256,
  tests: {
    passed: tests.numPassedTests,
    total: tests.numTotalTests,
    files: tests.testResults.length,
  },
  numerical: {
    passed: numeric.checks.filter((c: { pass: boolean }) => c.pass).length,
    total: numeric.checks.length,
    checks: numeric.checks,
  },
  jsbsim: {
    reference: reference.reference,
    cases: reference.cases.length,
    checks: reference.cases.reduce(
      (n: number, c: { metrics: unknown[] }) => n + c.metrics.length,
      0,
    ),
    maximumErrors: metrics,
    exclusions: reference.excluded,
  },
  nasa: {
    sources: nasa.sources,
    at120: nasa.at120,
    at240: nasa.at240,
    limitDegS: nasa.limitDegS,
    medianConvergenceRatio: nasa.medianConvergenceRatio,
    scope: nasa.scope,
  },
  envelope: envelope.reports.map(
    (r: {
      aircraft: string;
      nonfiniteLoads: number;
      points: {
        trimmed: boolean;
        site: string;
        speedMps: number;
        massScale: number;
        soc: number | null;
      }[];
    }) => ({
      aircraft: r.aircraft,
      conditions: r.points.length,
      trimmed: r.points.filter((p) => p.trimmed).length,
      nonfiniteLoads: r.nonfiniteLoads,
      sites: [...new Set(r.points.map((p) => p.site))],
      speedsMps: [...new Set(r.points.map((p) => p.speedMps))],
      massScales: [...new Set(r.points.map((p) => p.massScale))],
      batterySoc: [...new Set(r.points.map((p) => p.soc))],
    }),
  ),
};
assert(snapshot.numerical.passed === snapshot.numerical.total);
assert(snapshot.envelope.every((r) => r.nonfiniteLoads === 0));
mkdirSync("docs/benchmarks", { recursive: true });
const path = `docs/benchmarks/${date}.json`;
writeFileSync(path, JSON.stringify(snapshot, null, 2) + "\n");
console.log(
  `Wrote ${path}. Summary only; full generated reports remain local or in CI artifacts.`,
);
