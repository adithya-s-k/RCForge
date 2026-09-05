import { VtolCommandSchema, VtolStateSchema } from "./vtol-config";
import { z } from "zod";
import { AircraftSchema, type Aircraft } from "./schema";
import {
  Simulation,
  SIM_VERSION,
  FIXED_DT,
  type Controls,
  type Environment,
  type State,
} from "./simulation";
import { findTrim } from "./trim";
import { euler, degrees, length } from "./math";
import { powertrain } from "./powertrain";
import { batteryUsage } from "./components";
export type Scenario =
  | "cruise"
  | "glide"
  | "pitch-pulse"
  | "roll-pulse"
  | "stall"
  | "vtol-transition";
export const scenarios: Scenario[] = [
  "cruise",
  "glide",
  "pitch-pulse",
  "roll-pulse",
  "stall",
  "vtol-transition",
];
export interface Sample {
  time: number;
  altitudeM: number;
  airspeedMps: number;
  distanceM: number;
  rollDeg: number;
  pitchDeg: number;
  throttle: number;
  vtolTiltDeg?: number;
  vtolRearMotor?: number;
  vtolRearTiltDeg?: number;
  batterySoc?: number;
  batteryVoltageV?: number;
  batteryCurrentA?: number;
  batteryUsedMah?: number;
}
export interface Recording {
  formatVersion: 1;
  simulationVersion: string;
  dt: number;
  aircraft: Aircraft;
  environment: Environment;
  initialState: State;
  frames: Controls[];
  samples: Sample[];
}
export function sample(sim: Simulation, c: Controls): Sample {
  const s = sim.state,
    angles = euler(s.orientation);
  const electrical = sim.aircraft.battery
    ? powertrain(
        sim.aircraft,
        s.motors,
        s.batterySoc,
        sim.environment.densityKgM3,
      )
    : undefined;
  return {
    time: s.time,
    altitudeM: -s.position[2],
    airspeedMps: sim.lastForces.airspeed,
    distanceM: Math.hypot(s.position[0], s.position[1]),
    rollDeg: degrees(angles[0]),
    pitchDeg: degrees(angles[1]),
    throttle: c.throttle,
    ...(s.vtol
      ? {
          vtolTiltDeg: (s.vtol.tiltDeg[0] + s.vtol.tiltDeg[1]) / 2,
          vtolRearTiltDeg: s.vtol.rearTiltDeg,
          vtolRearMotor:
            s.motors[
              sim.aircraft.motors.findIndex(
                (m) => m.id === sim.aircraft.vtol!.rearMotorId,
              )
            ],
        }
      : {}),
    ...(electrical
      ? {
          batterySoc: s.batterySoc!,
          batteryVoltageV: electrical.voltage,
          batteryCurrentA: electrical.current,
          batteryUsedMah: batteryUsage(
            sim.aircraft,
            s.batterySoc!,
            electrical.current,
          )!.usedMah,
        }
      : {}),
  };
}
export function createRecording(sim: Simulation): Recording {
  return {
    formatVersion: 1,
    simulationVersion: SIM_VERSION,
    dt: FIXED_DT,
    aircraft: structuredClone(sim.aircraft),
    environment: structuredClone(sim.environment),
    initialState: structuredClone(sim.state),
    frames: [],
    samples: [],
  };
}
export function runExperiment(
  aircraft: Aircraft,
  environment: Environment,
  scenario: Scenario,
  duration = 20,
) {
  if (
    !scenarios.includes(scenario) ||
    !Number.isFinite(duration) ||
    duration <= 0 ||
    duration > 300
  )
    throw new Error(
      "Choose a known scenario and a duration in (0, 300] seconds",
    );
  if (
    aircraft.vehicleType === "multirotor" &&
    ["stall", "glide"].includes(scenario)
  )
    throw new Error(
      "Use cruise (hover), pitch-pulse or roll-pulse for multirotors",
    );
  if (scenario === "vtol-transition" && !aircraft.vtol)
    throw new Error("Transition requires a VTOL aircraft");
  if (aircraft.vtol && ["stall", "glide"].includes(scenario))
    throw new Error(
      "Use VTOL hover or transition scenarios; fixed-wing open-loop stall/glide does not describe assisted VTOL",
    );
  const trim = findTrim(
    aircraft,
    aircraft.reference.trimSpeedMps ?? 12,
    environment,
  );
  if (scenario === "vtol-transition") {
    trim.state.position[2] = -15;
    trim.state.vtol!.altitudeTargetM = 15;
    trim.state.vtol!.positionTarget = [...trim.state.position];
  }
  const sim = new Simulation(aircraft, environment, trim.state);
  const recording = createRecording(sim);
  for (
    let i = 0;
    i < Math.round(duration / FIXED_DT) && sim.state.status === "flying";
    i++
  ) {
    const t = sim.state.time;
    const c: Controls = { ...trim.controls };
    if (scenario === "vtol-transition")
      c.vtol = {
        mode: t >= 3 && t < 24 ? "cruise" : "hover",
        assistance: aircraft.vtol!.defaultAssistance,
      };
    if (scenario === "glide") c.throttle = 0;
    if (scenario === "pitch-pulse" && t >= 2 && t < 3)
      c.pitch = Math.min(1, c.pitch + 0.25);
    if (scenario === "roll-pulse" && t >= 2 && t < 3) c.roll = 0.25;
    if (scenario === "stall") {
      c.throttle = 0;
      if (t > 2) c.pitch = Math.min(1, c.pitch + (t - 2) * 0.2);
    }
    sim.step(c);
    recording.frames.push(c);
    if (i % 12 === 0) recording.samples.push(sample(sim, c));
  }
  // Include the actual endpoint, including a contact that ends a run between samples.
  if (recording.samples.at(-1)?.time !== sim.state.time)
    recording.samples.push(
      sample(sim, recording.frames.at(-1) ?? trim.controls),
    );
  return {
    recording,
    finalState: sim.state,
    trimConverged: trim.converged,
    summary: {
      durationSeconds: sim.state.time,
      status: sim.state.status,
      distanceM: Math.hypot(...sim.state.position.slice(0, 2)),
      finalAltitudeM: -sim.state.position[2],
      finalSpeedMps: length(sim.state.velocity),
    },
  };
}
const finite = z.number().finite(),
  vec = z.tuple([finite, finite, finite]);
const control = z
  .object({
    vtol: VtolCommandSchema.optional(),
    roll: finite.min(-1).max(1),
    pitch: finite.min(-1).max(1),
    yaw: finite.min(-1).max(1),
    throttle: finite.min(0).max(1),
  })
  .strict();
export function parseRecording(raw: unknown): Recording {
  const r = z
    .object({
      formatVersion: z.literal(1),
      simulationVersion: z.literal(SIM_VERSION),
      dt: z.literal(FIXED_DT),
      aircraft: AircraftSchema,
      environment: z
        .object({
          windMps: vec,
          gustMps: finite.min(0).max(20),
          seed: z.number().int(),
          densityKgM3: finite.positive().max(3),
          kinematicViscosityM2S: finite.min(1e-6).max(0.001).optional(),
          sceneryId: z.string().optional(),
          surface: z.enum(["asphalt", "grass", "dirt"]).optional(),
        })
        .strict(),
      initialState: z
        .object({
          time: finite.min(0),
          position: vec,
          velocity: vec,
          orientation: z
            .tuple([finite, finite, finite, finite])
            .refine(
              (q) => Math.abs(Math.hypot(...q) - 1) < 1e-6,
              "Quaternion must be normalized",
            ),
          omega: vec,
          motors: z.array(finite.min(0).max(1)),
          batterySoc: finite.min(0).max(1).optional(),
          surfaceCommands: z.array(finite.min(-1).max(1)).optional(),
          vtol: VtolStateSchema.optional(),
          status: z.enum(["flying", "grounded", "landed", "crashed"]),
        })
        .strict(),
      frames: z.array(control).max(36000),
      samples: z
        .array(
          z.object({
            time: finite,
            altitudeM: finite,
            airspeedMps: finite,
            distanceM: finite,
            rollDeg: finite,
            pitchDeg: finite,
            throttle: finite,
            vtolTiltDeg: finite.min(0).max(90).optional(),
            vtolRearMotor: finite.min(0).max(1).optional(),
            vtolRearTiltDeg: finite.min(-30).max(30).optional(),
            batterySoc: finite.min(0).max(1).optional(),
            batteryVoltageV: finite.min(0).max(120).optional(),
            batteryCurrentA: finite.min(0).optional(),
            batteryUsedMah: finite.min(0).max(100000).optional(),
          }),
        )
        .max(36000),
    })
    .strict()
    .parse(raw);
  if (r.initialState.motors.length !== r.aircraft.motors.length)
    throw new Error("Recording motor count does not match aircraft");
  if (
    r.initialState.surfaceCommands &&
    r.initialState.surfaceCommands.length !== r.aircraft.surfaces.length
  )
    throw new Error("Recording servo count does not match aircraft");
  if (!!r.aircraft.vtol !== !!r.initialState.vtol)
    throw new Error("Recording VTOL state does not match aircraft");
  return r;
}
export function replayRecording(r: Recording): State {
  const sim = new Simulation(r.aircraft, r.environment, r.initialState);
  for (const c of r.frames) sim.step(c, r.dt);
  return sim.state;
}
export function samplesToCsv(samples: Sample[]): string {
  const keys: (keyof Sample)[] = [
    "time",
    "altitudeM",
    "airspeedMps",
    "distanceM",
    "rollDeg",
    "pitchDeg",
    "throttle",
  ];
  for (const key of [
    "vtolTiltDeg",
    "vtolRearMotor",
    "vtolRearTiltDeg",
    "batterySoc",
    "batteryVoltageV",
    "batteryCurrentA",
    "batteryUsedMah",
  ] as const)
    if (samples.some((s) => s[key] !== undefined)) keys.push(key);
  return (
    keys.join(",") +
    "\n" +
    samples
      .map((s) => keys.map((k) => s[k]?.toFixed(6) ?? "").join(","))
      .join("\n") +
    "\n"
  );
}
