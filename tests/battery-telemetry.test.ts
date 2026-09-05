import { expect, it } from "vitest";
import aircraftData from "../aircraft/ft-22-raptor.json";
import { parseAircraft } from "../src/core/schema";
import {
  type Sample,
  runExperiment,
  parseRecording,
  replayRecording,
  samplesToCsv,
} from "../src/core/experiment";
import { calmEnvironment } from "../src/core/simulation";
import {
  metricValue,
  responseDomain,
  responseChart,
} from "../src/view/response-chart";

it("keeps a complete 50-second VTOL trace inside the plot and labels its actual duration", () => {
  const sample: Sample = {
    time: 0,
    altitudeM: 15,
    airspeedMps: 0,
    distanceM: 0,
    rollDeg: 0,
    pitchDeg: 0,
    throttle: 0.5,
    vtolRearMotor: 0.8,
  };
  const samples = [
    sample,
    { ...sample, time: 25, vtolRearMotor: 0 },
    { ...sample, time: 50 },
  ];
  const svg = responseChart(samples.slice(0, 2), samples, "vtolRearMotor", 760);
  const xValues = [...svg.matchAll(/[ML]([\d.]+),/g)].map((match) =>
    Number(match[1]),
  );
  expect(Math.min(...xValues)).toBe(60);
  expect(Math.max(...xValues)).toBe(742);
  expect(svg).toContain(">50s</text>");
  expect(svg).toContain(">25s</text>");
  expect(metricValue(sample, "vtolRearMotor")).toBe(80);
});

it("exports battery charge and electrical load at the experiment's actual endpoint", () => {
  const a = parseAircraft(aircraftData);
  const run = runExperiment(a, calmEnvironment(), "cruise", 1.03);
  const samples = run.recording.samples;
  const end = samples.at(-1)!;
  expect(end.time).toBe(run.finalState.time);
  expect(end.batterySoc).toBe(run.finalState.batterySoc);
  expect(end.batteryUsedMah).toBeCloseTo(
    (a.battery!.initialSoc - run.finalState.batterySoc!) *
      a.battery!.capacityMah,
    8,
  );
  expect(end.batteryCurrentA).toBeGreaterThan(0);
  expect(end.batteryVoltageV).toBeGreaterThan(10);
  const copy = parseRecording(JSON.parse(JSON.stringify(run.recording)));
  expect(copy.samples).toEqual(samples);
  expect(replayRecording(copy)).toEqual(run.finalState);
  const csv = samplesToCsv(copy.samples)
    .trim()
    .split("\n")
    .map((line) => line.split(","));
  expect(csv[0]).toContain("batteryUsedMah");
  expect(Number(csv.at(-1)![csv[0].indexOf("batteryUsedMah")])).toBeCloseTo(
    end.batteryUsedMah!,
    5,
  );
});

it("shows equal charge used but different percentage for capacity-only changes at constant voltage", () => {
  const a = parseAircraft(aircraftData);
  a.battery!.voltageCurve = [
    { soc: 0, voltsPerCell: 3.8 },
    { soc: 1, voltsPerCell: 3.8 },
  ];
  const b = structuredClone(a);
  b.battery!.capacityMah *= 2;
  const one = runExperiment(
    a,
    calmEnvironment(),
    "cruise",
    3,
  ).recording.samples.at(-1)!;
  const two = runExperiment(
    b,
    calmEnvironment(),
    "cruise",
    3,
  ).recording.samples.at(-1)!;
  expect(one.batteryUsedMah).toBeCloseTo(two.batteryUsedMah!, 7);
  expect(
    (a.battery!.initialSoc - one.batterySoc!) /
      (b.battery!.initialSoc - two.batterySoc!),
  ).toBeCloseTo(2, 7);
  expect(one.altitudeM).toBe(two.altitudeM);
});

it("keeps older telemetry readable without inventing missing battery measurements", () => {
  const recording = runExperiment(
    parseAircraft(aircraftData),
    calmEnvironment(),
    "cruise",
    0.1,
  ).recording;
  for (const s of recording.samples) {
    delete s.batterySoc;
    delete s.batteryVoltageV;
    delete s.batteryCurrentA;
    delete s.batteryUsedMah;
  }
  const copy = parseRecording(recording);
  expect(samplesToCsv(copy.samples).split("\n")[0]).toBe(
    "time,altitudeM,airspeedMps,distanceM,rollDeg,pitchDeg,throttle",
  );
  expect(metricValue(copy.samples[0], "batterySoc")).toBeUndefined();
  expect(responseChart(copy.samples, [], "batterySoc")).not.toMatch(
    /NaN|Infinity/,
  );
  recording.samples[0].batterySoc = 1.1;
  expect(() => parseRecording(recording)).toThrow();
});

it("labels charge in percent and keeps finite graph scales at full and empty", () => {
  const sample = runExperiment(
    parseAircraft(aircraftData),
    calmEnvironment(),
    "cruise",
    0.1,
  ).recording.samples[0];
  for (const soc of [0, 0.95, 1]) {
    const s = { ...sample, batterySoc: soc };
    const domain = responseDomain([s], "batterySoc");
    expect(domain.min).toBeGreaterThanOrEqual(0);
    expect(domain.max).toBeLessThanOrEqual(100);
    expect(domain.max - domain.min).toBeGreaterThanOrEqual(5);
    expect(metricValue(s, "batterySoc")).toBe(soc * 100);
  }
});
