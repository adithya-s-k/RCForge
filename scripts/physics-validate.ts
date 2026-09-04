import { powertrain, interpolate } from "../src/core/powertrain";
import { createRecording, parseRecording } from "../src/core/experiment";
import { extraChecks } from "./verification-cases";
import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { parseAircraft } from "../src/core/schema";
import {
  Simulation,
  initialState,
  neutralControls,
  calmEnvironment,
  GRAVITY,
  SIM_VERSION,
  FIXED_DT,
} from "../src/core/simulation";
import { findTrim } from "../src/core/trim";
import { runExperiment, replayRecording } from "../src/core/experiment";
const checks: {
  aircraft: string;
  check: string;
  pass: boolean;
  metric: number;
  limit: number;
}[] = [];
const args = process.argv.slice(2);
const paths = args.length
  ? args.map((p) => (p.endsWith(".json") ? p : `aircraft/${p}.json`))
  : (await readdir("aircraft"))
      .filter((p) => p.endsWith(".json"))
      .sort()
      .map((p) => `aircraft/${p}`);
const definitions = await Promise.all(
  paths.map((path) => readFile(path, "utf8")),
);
const aircraft = definitions.map((raw) => parseAircraft(JSON.parse(raw)));
for (const a of aircraft) {
  const id = a.id,
    trim = findTrim(a);
  checks.push(...extraChecks(a));
  checks.push({
    aircraft: id,
    check: "Equilibrium force/moment residual (N and Nm)",
    pass: trim.converged,
    metric: Math.hypot(...trim.residual),
    limit: 0.01,
  });
  // Hold SOC during the equilibrium-only test; depletion is tested separately.
  const steady = new Simulation(a, calmEnvironment(), trim.state);
  for (let i = 0; i < 1200; i++) {
    steady.step(trim.controls);
    steady.state.batterySoc = trim.state.batterySoc;
  }
  const drift = Math.abs(steady.state.position[2] - trim.state.position[2]);
  checks.push({
    aircraft: id,
    check: "10 s equilibrium altitude drift, fixed SOC (m)",
    pass: drift < 0.02,
    metric: drift,
    limit: 0.02,
  });
  const maneuver = runExperiment(a, calmEnvironment(), "roll-pulse", 5),
    replayed = replayRecording(maneuver.recording),
    error = Math.hypot(
      ...replayed.position.map((v, i) => v - maneuver.finalState.position[i]),
    );
  checks.push({
    aircraft: id,
    check: "Recorded-input replay position error (m)",
    pass: error === 0,
    metric: error,
    limit: 0,
  });
  const run = (dt: number) => {
    const sim = new Simulation(a, calmEnvironment(), trim.state);
    for (let i = 0; i < Math.round(2 / dt); i++)
      sim.step({ ...trim.controls, roll: 0.1 }, dt);
    return sim.state.position;
  };
  const ref = run(1 / 480),
    coarse = run(1 / 60),
    fine = run(1 / 120),
    distance = (p: number[]) => Math.hypot(...p.map((v, i) => v - ref[i]));
  checks.push({
    aircraft: id,
    check: "120 Hz error vs 480 Hz reference (m)",
    pass:
      distance(fine) <= distance(coarse) * 1.1 + 1e-9 && distance(fine) < 0.03,
    metric: distance(fine),
    limit: Math.min(0.03, distance(coarse) * 1.1 + 1e-9),
  });
  if (id === "ft-bronco") {
    const vacuum = structuredClone(a);
    vacuum.surfaces = [];
    vacuum.motors = [];
    vacuum.fuselageDragAreaM2 = 0;
    vacuum.angularDamping = [0, 0, 0];
    const s = initialState(vacuum, 0, 100, 0),
      sim = new Simulation(vacuum, calmEnvironment(), s);
    for (let i = 0; i < 240; i++) sim.step(neutralControls());
    const e = Math.abs(sim.state.position[2] - (-100 + 0.5 * GRAVITY * 4));
    checks.push({
      aircraft: id,
      check: "Analytical 2 s free-fall position error (m)",
      pass: e < 1e-8,
      metric: e,
      limit: 1e-8,
    });
  }
}
// Every electrical definition gets circuit, charge and replay checks.
for (const electric of aircraft.filter((a) => a.battery)) {
  const ep = powertrain(
    electric,
    electric.motors.map(() => 0.5),
    0.5,
  );
  const ohmError = Math.abs(
    ep.voltage -
      (electric.battery!.cells *
        interpolate(
          electric.battery!.voltageCurve,
          0.5,
          (p) => p.soc,
          (p) => p.voltsPerCell,
        ) -
        ep.current * electric.battery!.resistanceOhm),
  );
  checks.push({
    aircraft: electric.id,
    check: "Battery resistive circuit residual (V)",
    pass: ohmError < 1e-10,
    metric: ohmError,
    limit: 1e-10,
  });
  const es = initialState(electric, 0, 100, 0);
  es.motors.fill(0.5);
  const esim = new Simulation(electric, calmEnvironment(), es),
    er = createRecording(esim);
  const ec = { ...neutralControls(), throttle: 0.5 },
    before = esim.state.batterySoc!,
    current = powertrain(electric, es.motors, before).current;
  esim.step(ec);
  er.frames.push(ec);
  const chargeError = Math.abs(
    esim.state.batterySoc! -
      (before - (current * FIXED_DT) / (electric.battery!.capacityMah * 3.6)),
  );
  checks.push({
    aircraft: electric.id,
    check: "Battery coulomb-counting residual (SOC)",
    pass: chargeError < 1e-10,
    metric: chargeError,
    limit: 1e-10,
  });
  for (let i = 0; i < 240; i++) {
    esim.step(ec);
    er.frames.push(ec);
  }
  const replayError = Math.abs(
    replayRecording(parseRecording(JSON.parse(JSON.stringify(er))))
      .batterySoc! - esim.state.batterySoc!,
  );
  checks.push({
    aircraft: electric.id,
    check: "Electrical state replay error (SOC)",
    pass: replayError === 0,
    metric: replayError,
    limit: 0,
  });
}
const report = {
  simulationVersion: SIM_VERSION,
  aircraftIds: aircraft.map((a) => a.id),
  generatedAt: new Date().toISOString(),
  definitionSHA256: createHash("sha256")
    .update(definitions.join("\n"))
    .digest("hex"),
  scope:
    "Numerical verification only. No measured aircraft comparison or independent-engine comparison has been performed.",
  passed: checks.every((c) => c.pass),
  checks,
  externalValidation: {
    measuredFlights: "pending",
    independentBackend: "pending",
    physicalController: "pending",
  },
};
await mkdir("results/validation", { recursive: true });
await writeFile(
  "results/validation/report.json",
  JSON.stringify(report, null, 2),
);
const escape = (s: string) =>
  s.replace(
    /[&<>"\']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
await writeFile(
  "results/validation/report.html",
  `<!doctype html><meta charset="utf-8"><title>RCForge physics verification</title><style>body{font:15px system-ui;background:#111b22;color:#dce7ec;max-width:1100px;margin:50px auto;padding:20px}h1{font-weight:500}p{line-height:1.7;color:#9eb3bf}table{width:100%;border-collapse:collapse;font-size:13px}td,th{text-align:left;padding:12px;border-bottom:1px solid #344550}.pass{color:#bbd89e}.fail{color:#ed8f77}</style><h1>RCForge · Physics verification</h1><p>Simulator ${SIM_VERSION} · ${report.generatedAt}<br>${report.scope}</p><h2 class="${report.passed ? "pass" : "fail"}">${checks.filter((c) => c.pass).length} / ${checks.length} checks passed</h2><table><tr><th>Aircraft</th><th>Check</th><th>Measured error</th><th>Limit</th><th>Result</th></tr>${checks.map((c) => `<tr><td>${escape(c.aircraft)}</td><td>${escape(c.check)}</td><td>${c.metric.toExponential(3)}</td><td>${c.limit.toExponential(3)}</td><td class="${c.pass ? "pass" : "fail"}">${c.pass ? "PASS" : "FAIL"}</td></tr>`).join("")}</table><h2>Not yet validated</h2><p>Real flight fidelity, independent engine agreement, exact transmitter integration, rotor thrust curves, flight-controller firmware and battery/electrical response require additional evidence. Passing these numerical checks does not establish those claims.</p>`,
);
console.log(JSON.stringify(report, null, 2));
if (!report.passed) process.exitCode = 1;
