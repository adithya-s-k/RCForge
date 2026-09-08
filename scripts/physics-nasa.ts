import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { setDefaultAutoSelectFamilyAttemptTimeout } from "node:net";
import type { Aircraft } from "../src/core/schema";
import {
  Simulation,
  initialState,
  calmEnvironment,
  neutralControls,
} from "../src/core/simulation";
import { SIM_VERSION } from "../src/core/versions";
import sources from "./reference/nasa-sources.json";

const directory = "results/validation/nasa";
await mkdir(`${directory}/source`, { recursive: true });
await writeFile(
  `${directory}/report.json`,
  JSON.stringify({ passed: false, status: "running" }),
);
const fetchData = process.argv.includes("--fetch");
// The public NASA host can need longer than Node's 250 ms address-family
// attempt. Keep each download bounded at 30 s while allowing a 2 s connection.
if (fetchData) setDefaultAutoSelectFamilyAttemptTimeout(2000);
if (process.argv.slice(2).some((a) => a !== "--fetch"))
  throw new Error("Usage: npm run physics:nasa -- [--fetch]");
const sha256 = (data: string) =>
  createHash("sha256").update(data).digest("hex");
const columns = [
  "time",
  ...["Roll", "Pitch", "Yaw"].map(
    (axis) => `bodyAngularRateWrtEi_deg_s_${axis}`,
  ),
];
const references = await Promise.all(
  Object.entries(sources.files).map(async ([file, digest]) => {
    const path = `${directory}/source/${file}`;
    let text: string;
    if (fetchData) {
      const response = await fetch(sources.baseUrl + file, {
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok)
        throw new Error(
          `NASA download failed: ${file} HTTP ${response.status}`,
        );
      text = await response.text();
      if (sha256(text) !== digest)
        throw new Error(
          `NASA source changed: ${file}; inspect upstream before updating the manifest`,
        );
      await writeFile(path, text);
    } else {
      try {
        text = await readFile(path, "utf8");
      } catch {
        throw new Error(
          `Missing ${path}. Fetch pinned public data with npm run physics:nasa -- --fetch`,
        );
      }
    }
    if (sha256(text) !== digest)
      throw new Error(`NASA checksum mismatch: ${file}`);
    const lines = text.trim().split(/\r?\n/),
      header = lines.shift()!.split(",");
    const indices = columns.map((name) => header.indexOf(name));
    if (indices.some((i) => i < 0))
      throw new Error(`Missing inertial-rate columns: ${file}`);
    const samples = lines.map((line) => {
      const cells = line.split(",");
      return indices.map((i) => (cells[i]?.trim() ? Number(cells[i]) : NaN));
    });
    if (
      samples.length < 301 ||
      samples.length > 4000 ||
      samples.some(
        (s, i) =>
          s.some((v) => !Number.isFinite(v)) ||
          (i > 0 && s[0] <= samples[i - 1][0]),
      ) ||
      Math.abs(samples[0][0]) > 1e-8 ||
      Math.abs(samples.at(-1)![0] - 30) > 1e-6
    )
      throw new Error(`Incomplete or malformed NASA trajectory: ${file}`);
    return { file, samples };
  }),
);

// Only the torque-free angular subsystem is matched. Translation and local
// Euler angles depend on NASA's rotating WGS-84/J2 world, which RCForge lacks.
// Body angular rates relative to inertial space are independent of that world
// when torque is zero. At the equator the published local roll rate plus Earth
// rotation is 10 deg/s inertially; using 9.995821927 here would be a frame error.
const slug = 4.4482216152605 / 0.3048;
// An internal idealized test body, not an importable aircraft preset: no
// contacts or damping. It must not inherit equipment or provenance from a plane.
const aircraft: Aircraft = {
  schemaVersion: 1,
  vehicleType: "fixed-wing",
  id: "nesc-brick-rotation",
  name: "NESC tumbling brick",
  description:
    "Torque-free rotational check body; no aerodynamic surfaces or propulsion.",
  provenance: {
    massAndInertia: {
      status: "sourced",
      url: sources.body,
      note: "Published NESC brick mass and principal inertia, converted from slug and slug ft² to SI. This internal idealization has zero damping and no contact points.",
    },
  },
  motors: [],
  surfaces: [],
  contactPoints: [],
  fuselageDragAreaM2: 0,
  angularDamping: [0, 0, 0],
  reference: {
    spanM: 0.1016,
    areaM2: 0.2032 * 0.1016,
    leadingEdgeXM: 0.1016,
    cgFromLeadingEdgeM: 0.1016,
  },
  parts: [
    {
      id: "brick",
      kind: "body",
      color: "#aaaaaa",
      massKg: 0.155404754 * slug,
      positionM: [0, 0, 0],
      sizeM: [0.2032, 0.1016, 0.05715],
      inertiaDiagonalKgM2: [0.00189422, 0.006211019, 0.007194665].map(
        (x) => x * slug * 0.3048 ** 2,
      ) as [number, number, number],
    },
  ],
};
const run = (dt: number) => {
  const state = initialState(aircraft, 0, 9144, 0);
  state.omega = [10, 20, 30].map((x) => (x * Math.PI) / 180) as [
    number,
    number,
    number,
  ];
  const sim = new Simulation(aircraft, calmEnvironment(), state),
    history = [[...state.omega]];
  for (let i = 0; i < Math.round(30 / dt); i++) {
    sim.step(neutralControls(), dt);
    history.push([...sim.state.omega]);
  }
  return history;
};
const compare = (dt: number) => {
  const history = run(dt);
  return references.map(({ file, samples }) => {
    const errors = samples.map((row) => {
      const at = Math.min(30, Math.max(0, row[0])) / dt;
      const i = Math.min(Math.floor(at), history.length - 2),
        mix = at - i;
      return Math.hypot(
        ...[0, 1, 2].map(
          (j) =>
            ((history[i][j] * (1 - mix) + history[i + 1][j] * mix) * 180) /
              Math.PI -
            row[j + 1],
        ),
      );
    });
    return {
      file,
      samples: samples.length,
      maxRateErrorDegS: Math.max(...errors),
      rmsRateErrorDegS: Math.sqrt(
        errors.reduce((s, e) => s + e * e, 0) / errors.length,
      ),
    };
  });
};
const at120 = compare(1 / 120),
  at240 = compare(1 / 240);
const median = (a: typeof at120) =>
  a.map((r) => r.maxRateErrorDegS).sort((a, b) => a - b)[
    Math.floor(a.length / 2)
  ];
const report = {
  generatedAt: new Date().toISOString(),
  simulationVersion: SIM_VERSION,
  sources,
  scriptSHA256: sha256(await readFile("scripts/physics-nasa.ts", "utf8")),
  coreSHA256: Object.fromEntries(
    await Promise.all(
      (await readdir("src/core", { recursive: true }))
        .filter((p) => p.endsWith(".ts"))
        .sort()
        .map(async (p) => [p, sha256(await readFile(`src/core/${p}`, "utf8"))]),
    ),
  ),
  definition: aircraft,
  scope:
    "Published NESC case 02 torque-free inertial body-rate subset only. Not a complete NASA case pass, rotating-Earth verification or measured flight validation.",
  comparison:
    "All five published simulator trajectories are retained. Reference differences remain visible; no output is fitted or shifted.",
  limitDegS: 0.01,
  passed:
    [...at120, ...at240].every(
      (r) => Number.isFinite(r.maxRateErrorDegS) && r.maxRateErrorDegS <= 0.01,
    ) && median(at240) <= median(at120) * 0.7,
  medianConvergenceRatio: median(at240) / median(at120),
  at120,
  at240,
};
await writeFile(
  `${directory}/report.json`,
  JSON.stringify(report, null, 2) + "\n",
);
console.table(at120);
console.log(
  `${report.passed ? "PASS" : "FAIL"}: NESC rotational subset; 5 published trajectories, 30 seconds, median convergence ratio ${report.medianConvergenceRatio.toFixed(3)}. Report: ${directory}/report.json`,
);
if (!report.passed) process.exitCode = 1;
