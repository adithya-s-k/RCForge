import type { Aircraft } from "../../src/core/schema";
import { surfaceCommand } from "../../src/core/surface-control";
import {
  Simulation,
  initialState,
  calmEnvironment,
  neutralControls,
  type Controls,
} from "../../src/core/simulation";
import { axisQ, mulQ, rotate, euler, type Vec3 } from "../../src/core/math";

export interface Condition {
  bodyVelocity: Vec3;
  attitude: Vec3;
  omega: Vec3;
  controls: Controls;
  motorCommands?: number[];
  soc?: number;
  tiltDeg?: [number, number];
  rearTiltDeg?: number;
  wind?: Vec3;
}
export interface ReferenceCase {
  id: string;
  aircraft: Aircraft;
  mode: "airframe" | "vacuum" | "propulsion" | "native-wing";
  density: number;
  conditions: Condition[];
  duration: number;
  referenceDt: number;
  samplePeriod: number;
}
const condition = (changes: Partial<Condition> = {}): Condition => ({
  bodyVelocity: [12, 0, 0],
  attitude: [0, 0, 0],
  omega: [0, 0, 0],
  controls: neutralControls(),
  ...changes,
});

export function referenceCases(aircraft: Aircraft[]): ReferenceCase[] {
  const cases: ReferenceCase[] = [];
  for (const source of aircraft) {
    // Explicit reduced subsystem: no propulsion, battery, controller or contacts.
    // The original part ledger and all aerodynamic surfaces are retained.
    const a = structuredClone(source);
    a.vehicleType = "fixed-wing";
    delete a.vtol;
    delete a.multirotor;
    delete a.battery;
    a.motors = [];
    const base: ReferenceCase = {
      id: source.id + "/airframe",
      aircraft: a,
      mode: "airframe",
      density: 1.225,
      conditions: [],
      duration: 0,
      referenceDt: 1 / 3840,
      samplePeriod: 0.1,
    };
    // Full velocity/rate vectors, nonzero incidence, mixed controls, and stall
    // boundaries exercise coordinate transforms and each preset's actual surfaces.
    for (const alpha of [-35, -14, -3, 0, 7, 14, 25, 50, 110]) {
      const rad = (alpha * Math.PI) / 180;
      for (const speed of [6, 12, 22])
        base.conditions.push(
          condition({
            bodyVelocity: [speed * Math.cos(rad), 1.3, speed * Math.sin(rad)],
            omega: [0.2, -0.15, 0.1],
            controls: { roll: 0.35, pitch: -0.2, yaw: 0.4, throttle: 0 },
          }),
        );
    }
    base.conditions.push(condition({ bodyVelocity: [0, 0, 0] }));
    // Separate signed axes catch reversed control moments; combined endpoints
    // exercise saturation in elevon and V-tail mixing.
    for (const axis of ["roll", "pitch", "yaw"] as const)
      for (const sign of [-1, 1])
        base.conditions.push(
          condition({ controls: { ...neutralControls(), [axis]: sign } }),
        );
    for (const sign of [-1, 1])
      base.conditions.push(
        condition({
          controls: { roll: sign, pitch: sign, yaw: sign, throttle: 0 },
        }),
      );
    base.conditions.push(
      condition({
        attitude: [0.4, -0.2, 1.3],
        bodyVelocity: [15, -2, 1],
        wind: [3, -4, 0.5],
        omega: [-0.3, 0.2, 0.1],
      }),
    );
    cases.push(base);
    const vacuum = structuredClone(a);
    vacuum.surfaces = [];
    vacuum.angularDamping = [0, 0, 0];
    vacuum.fuselageDragAreaM2 = 0;
    delete vacuum.bodyDragAreaM2;
    cases.push({
      ...base,
      id: source.id + "/ballistic",
      mode: "vacuum",
      aircraft: vacuum,
      conditions: [
        condition({ bodyVelocity: [9, -3, 2], attitude: [0.25, -0.3, 1.1] }),
      ],
      duration: 4,
    });
    cases.push({
      ...base,
      id: source.id + "/tumble",
      mode: "vacuum",
      aircraft: vacuum,
      conditions: [
        condition({
          bodyVelocity: [0, 0, 0],
          attitude: [0.2, -0.15, 0.7],
          omega: [0.8, 1.1, -0.6],
        }),
      ],
      duration: 4,
    });
    cases.push({
      ...base,
      id: source.id + "/power-off",
      conditions: [
        condition({
          bodyVelocity: [12, 0, 0.6],
          attitude: [0.1, 0.05, 0.7],
          controls: { roll: 0.025, pitch: -0.03, yaw: 0.02, throttle: 0 },
        }),
      ],
      duration: 2,
    });
    const moved = structuredClone(vacuum);
    const battery = moved.parts.find((p) => p.kind === "battery")!;
    battery.positionM = [battery.positionM[0] + 0.08, 0.015, -0.025];
    battery.orientationDeg = [23, -17, 31];
    // Explicit non-box principal inertia as well as rotated cuboids.
    battery.inertiaDiagonalKgM2 = [0.0001, 0.0002, 0.00025];
    cases.push({
      ...base,
      id: source.id + "/moved-component",
      mode: "vacuum",
      aircraft: moved,
      conditions: [condition()],
    });

    const powered = structuredClone(source);
    powered.surfaces = [];
    powered.fuselageDragAreaM2 = 0;
    delete powered.bodyDragAreaM2;
    powered.angularDamping = [0, 0, 0];
    const motorCase: ReferenceCase = {
      ...base,
      id: source.id + "/propulsion",
      mode: "propulsion",
      aircraft: powered,
      conditions: [],
    };
    for (const soc of [0, 0.15, 0.5, 1])
      for (const command of [0, 0.25, 0.65, 1])
        for (const speed of [0, 9, 22]) {
          motorCase.conditions.push(
            condition({
              bodyVelocity: [speed, 2, -1],
              soc,
              motorCommands: powered.motors.map((_, i) =>
                Math.max(0, command - i * 0.04),
              ),
              tiltDeg: [command * 90, Math.max(0, command * 90 - 7)],
              rearTiltDeg: command * 40 - 20,
            }),
          );
        }
    cases.push(motorCase);
  }
  // Native JSBSim wind axes are a second aerodynamic formulation, independent
  // of the per-surface force-expression adapter. The matched case has beta=0.
  const wing = structuredClone(cases[0].aircraft);
  wing.id = "reference-wing";
  wing.parts = [
    {
      id: "block",
      kind: "body",
      color: "#eeeeee",
      massKg: 1,
      positionM: [0, 0, 0],
      sizeM: [0.3, 0.4, 0.2],
    },
  ];
  wing.surfaces = [
    {
      id: "wing",
      kind: "wing",
      positionM: [0, 0, 0],
      spanM: 1,
      chordM: 0.2,
      aspectRatio: 5,
      rollDeg: 0,
      incidenceDeg: 0,
      liftSlope: 4.5,
      zeroLiftDeg: 0,
      stallDeg: 15,
      cd0: 0.025,
      efficiency: 0.8,
      cm: 0,
    },
  ];
  wing.fuselageDragAreaM2 = 0;
  delete wing.bodyDragAreaM2;
  wing.angularDamping = [0, 0, 0];
  const native: ReferenceCase = {
    id: "reference-wing/native-wind-axes",
    aircraft: wing,
    mode: "native-wing",
    density: 1.225,
    referenceDt: 1 / 3840,
    samplePeriod: 0.1,
    duration: 0,
    conditions: [-30, -15, -5, 0, 5, 15, 30, 80].map((deg) =>
      condition({
        bodyVelocity: [
          12 * Math.cos((deg * Math.PI) / 180),
          0,
          12 * Math.sin((deg * Math.PI) / 180),
        ],
      }),
    ),
  };
  cases.push(native);
  cases.push({
    ...native,
    id: "reference-wing/native-glide",
    conditions: [condition({ bodyVelocity: [12, 0, 0] })],
    duration: 4,
  });
  return cases;
}

export function simulationFor(c: ReferenceCase, initial: Condition) {
  const s = initialState(c.aircraft, 0, 1000, 0);
  s.orientation = mulQ(
    axisQ([0, 0, 1], initial.attitude[2]),
    mulQ(
      axisQ([0, 1, 0], initial.attitude[1]),
      axisQ([1, 0, 0], initial.attitude[0]),
    ),
  );
  s.velocity = rotate(s.orientation, initial.bodyVelocity);
  s.omega = [...initial.omega];
  if (initial.motorCommands) s.motors = [...initial.motorCommands];
  if (initial.soc !== undefined) s.batterySoc = initial.soc;
  if (s.vtol) {
    s.vtol.tiltDeg = initial.tiltDeg ?? [0, 0];
    s.vtol.rearTiltDeg = initial.rearTiltDeg ?? 0;
  }
  // Steady actuators isolate aerodynamics from different servo integrators.
  s.surfaceCommands = c.aircraft.surfaces.map((s) =>
    s.control ? surfaceCommand(s.control, initial.controls) : 0,
  );
  return new Simulation(
    c.aircraft,
    {
      ...calmEnvironment(),
      densityKgM3: c.density,
      windMps: initial.wind ?? [0, 0, 0],
    },
    s,
  );
}

export function runLocal(c: ReferenceCase, dt = 1 / 120) {
  const first = simulationFor(c, c.conditions[0]);
  const loads = c.conditions.map((initial) => {
    const s = simulationFor(c, initial);
    const f = s.forces(s.state, initial.controls);
    return { force: f.force, torque: f.torque };
  });
  const trajectory = [];
  const sample = () => ({
    time: first.state.time,
    position: [
      first.state.position[0],
      first.state.position[1],
      first.state.position[2] + 1000,
    ],
    velocity: first.state.velocity,
    omega: first.state.omega,
    attitude: euler(first.state.orientation),
  });
  if (c.duration) {
    trajectory.push(sample());
    for (let i = 1; i <= Math.round(c.duration / dt); i++) {
      first.step(c.conditions[0].controls, dt);
      if (i % Math.round(c.samplePeriod / dt) === 0) trajectory.push(sample());
    }
  }
  return { id: c.id, mass: first.properties, loads, trajectory };
}
