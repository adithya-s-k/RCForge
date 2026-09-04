import { readFile } from "node:fs/promises";
import { parseRecording, sample } from "../src/core/experiment";
import { Simulation } from "../src/core/simulation";
const [recordingPath, csvPath] = process.argv.slice(2);
if (!recordingPath || !csvPath)
  throw new Error(
    "Usage: npm run physics:compare -- recording.json measured.csv",
  );
const r = parseRecording(JSON.parse(await readFile(recordingPath, "utf8"))),
  lines = (await readFile(csvPath, "utf8")).trim().split(/\r?\n/),
  headers = lines
    .shift()!
    .split(",")
    .map((v) => v.trim()),
  metrics = ["altitudeM", "airspeedMps", "rollDeg", "pitchDeg"] as const;
if (!["time", ...metrics].every((k) => headers.includes(k)))
  throw new Error(
    "CSV requires time,altitudeM,airspeedMps,rollDeg,pitchDeg columns, seconds/meters/m/s/degrees, same frame and time origin as recording.",
  );
if (!r.frames.length) throw new Error("Recording contains no input frames");
const rows = lines.map((line) => {
  const tokens = line.split(",");
  if (tokens.some((v) => !v.trim()))
    throw new Error("CSV has empty numeric values");
  const values = tokens.map(Number);
  if (
    values.length !== headers.length ||
    values.some((v) => !Number.isFinite(v))
  )
    throw new Error("CSV must contain finite numeric values");
  return Object.fromEntries(headers.map((k, i) => [k, values[i]]));
});
if (
  rows.length < 2 ||
  rows.some(
    (v, i) =>
      v.time < r.initialState.time || (i > 0 && v.time <= rows[i - 1].time),
  )
)
  throw new Error(
    "Need at least two rows with strictly increasing nonnegative timestamps",
  );
if (rows.at(-1)!.time > r.initialState.time + r.frames.length * r.dt + 1e-7)
  throw new Error("Measured data extends beyond recording");
const sim = new Simulation(r.aircraft, r.environment, r.initialState),
  samples = [];
sim.lastForces = sim.forces(
  sim.state,
  r.frames[0] ?? { roll: 0, pitch: 0, yaw: 0, throttle: 0 },
);
samples.push(
  sample(sim, r.frames[0] ?? { roll: 0, pitch: 0, yaw: 0, throttle: 0 }),
);
for (const c of r.frames) {
  sim.step(c, r.dt);
  samples.push(sample(sim, c));
}
const errors = Object.fromEntries(
  metrics.map((k) => [k, [] as number[]]),
) as Record<(typeof metrics)[number], number[]>;
for (const row of rows) {
  const step = (row.time - r.initialState.time) / r.dt,
    i = Math.min(Math.floor(step), samples.length - 2),
    t = Math.min(1, step - i);
  for (const k of metrics) {
    let error = samples[i][k] * (1 - t) + samples[i + 1][k] * t - row[k];
    if (k.endsWith("Deg")) error = ((((error + 180) % 360) + 360) % 360) - 180;
    errors[k].push(error);
  }
}
console.log(
  JSON.stringify(
    {
      scope:
        "Comparison to supplied measurements; no automatic fidelity certification. Time-align logs and match inputs, mass, weather and frames first.",
      rows: rows.length,
      metrics: Object.fromEntries(
        metrics.map((k) => [
          k,
          {
            rmse: Math.sqrt(
              errors[k].reduce((v, e) => v + e * e, 0) / rows.length,
            ),
            maxAbs: Math.max(...errors[k].map(Math.abs)),
          },
        ]),
      ),
    },
    null,
    2,
  ),
);
