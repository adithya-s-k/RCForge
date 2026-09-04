import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { argumentsFor, loadAircraft, fail } from "./args";
import {
  runExperiment,
  samplesToCsv,
  scenarios,
  type Scenario,
} from "../src/core/experiment";
import { calmEnvironment } from "../src/core/simulation";
import { modifyAircraft } from "../src/core/aircraft";
import { parseAircraft } from "../src/core/schema";
try {
  const { aircraft: id, options: o } = argumentsFor([
    "scenario",
    "duration",
    "out",
    "wind",
    "seed",
    "span-scale",
    "battery-shift",
    "thrust-scale",
  ]);
  const number = (key: string, fallback: number) => {
    const n = o[key] === undefined ? fallback : Number(o[key]);
    if (!Number.isFinite(n)) throw new Error("Invalid number: --" + key);
    return n;
  };
  const scenario = (o.scenario ?? "cruise") as Scenario;
  if (!scenarios.includes(scenario))
    throw new Error("Scenario must be one of: " + scenarios.join(", "));
  const aircraft = parseAircraft(
    modifyAircraft(await loadAircraft(id), {
      spanScale: number("span-scale", 1),
      batteryShiftM: number("battery-shift", 0),
      thrustScale: number("thrust-scale", 1),
      throwsScale: 1,
    }),
  );
  const environment = calmEnvironment();
  environment.windMps[1] = number("wind", 0);
  environment.seed = number("seed", 42);
  if (!Number.isInteger(environment.seed))
    throw new Error("Seed must be an integer");
  const result = runExperiment(
    aircraft,
    environment,
    scenario,
    number("duration", 20),
  );
  const out = resolve(o.out ?? `results/${aircraft.id}-${scenario}`);
  await mkdir(out, { recursive: true });
  await writeFile(out + "/recording.json", JSON.stringify(result.recording));
  await writeFile(
    out + "/telemetry.csv",
    samplesToCsv(result.recording.samples),
  );
  await writeFile(
    out + "/summary.json",
    JSON.stringify(
      {
        simulationVersion: result.recording.simulationVersion,
        trimConverged: result.trimConverged,
        ...result.summary,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(JSON.stringify(result.summary, null, 2));
  console.log(`Saved recording.json, telemetry.csv and summary.json to ${out}`);
} catch (e) {
  fail(e);
}
