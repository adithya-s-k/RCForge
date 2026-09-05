import { surfacePolar, STANDARD_AIR_VISCOSITY } from "./aerodynamics";
import { powertrain } from "./powertrain";
import { rotorCommands } from "./multirotor";
import { surfaceCommand } from "./surface-control";
import { surfaceActuation, advanceSurfaceCommand } from "./actuation";
import { resolveGroundContacts } from "./ground";
import type { Aircraft } from "./schema";
import { massProperties } from "./aircraft";
import {
  add,
  sub,
  scale,
  dot,
  cross,
  length,
  unit,
  rotate,
  inverseQ,
  axisQ,
  radians,
  clamp,
  advanceQ,
  matVec,
  type Vec3,
  type Quat,
} from "./math";
export { SIM_VERSION } from "./versions";
export const FIXED_DT = 1 / 120;
export const GRAVITY = 9.80665;
export interface Controls {
  roll: number;
  pitch: number;
  yaw: number;
  throttle: number;
}
export const neutralControls = (): Controls => ({
  roll: 0,
  pitch: 0,
  yaw: 0,
  throttle: 0,
});
export interface Environment {
  windMps: Vec3;
  gustMps: number;
  seed: number;
  densityKgM3: number;
  kinematicViscosityM2S?: number;
  sceneryId?: string;
  surface?: "asphalt" | "grass" | "dirt";
}
export const calmEnvironment = (): Environment => ({
  windMps: [0, 0, 0],
  gustMps: 0,
  seed: 42,
  densityKgM3: 1.225,
});
export interface State {
  time: number;
  position: Vec3;
  velocity: Vec3;
  orientation: Quat;
  omega: Vec3;
  motors: number[];
  batterySoc?: number;
  surfaceCommands?: number[];
  status: "flying" | "grounded" | "landed" | "crashed";
}
export interface SurfaceForce {
  kind: Aircraft["surfaces"][number]["kind"];
  id: string;
  position: Vec3;
  force: Vec3;
  alphaDeg: number;
  reynolds: number;
  coefficientSource: "analytical" | "polar-table" | "reynolds-table";
  outsidePolarEnvelope: boolean;
  stalled: boolean;
}
export interface Forces {
  force: Vec3;
  torque: Vec3;
  surfaces: SurfaceForce[];
  airspeed: number;
}
export const initialState = (
  a: Aircraft,
  speed = 12,
  altitude = 18,
  pitchDeg = 3,
): State => ({
  time: 0,
  position: [0, 0, -altitude],
  velocity: [speed, 0, 0],
  orientation: axisQ([0, 1, 0], radians(pitchDeg)),
  omega: [0, 0, 0],
  motors: a.motors.map(() => 0),
  ...(a.battery ? { batterySoc: a.battery.initialSoc } : {}),
  status: "flying",
});
export function windAt(t: number, e: Environment): Vec3 {
  const p = e.seed * 0.371;
  return add(
    e.windMps,
    scale(
      [
        Math.sin(t * 0.73 + p),
        Math.sin(t * 1.17 + p * 2),
        0.25 * Math.sin(t * 0.91 + p * 3),
      ],
      e.gustMps,
    ),
  );
}
export function cleanControls(c: Controls): Controls {
  return {
    roll: clamp(Number.isFinite(c.roll) ? c.roll : 0, -1, 1),
    pitch: clamp(Number.isFinite(c.pitch) ? c.pitch : 0, -1, 1),
    yaw: clamp(Number.isFinite(c.yaw) ? c.yaw : 0, -1, 1),
    throttle: clamp(Number.isFinite(c.throttle) ? c.throttle : 0, 0, 1),
  };
}
export class Simulation {
  readonly properties: ReturnType<typeof massProperties>;
  readonly actuations: ReturnType<typeof surfaceActuation>[];
  state: State;
  lastForces: Forces = {
    force: [0, 0, 0],
    torque: [0, 0, 0],
    surfaces: [],
    airspeed: 0,
  };
  constructor(
    public readonly aircraft: Aircraft,
    public environment: Environment = calmEnvironment(),
    state?: State,
  ) {
    this.properties = massProperties(aircraft);
    this.actuations = aircraft.surfaces.map((s) =>
      surfaceActuation(aircraft, s),
    );
    this.state = structuredClone(state ?? initialState(aircraft));
    if (aircraft.battery && this.state.batterySoc === undefined)
      this.state.batterySoc = aircraft.battery.initialSoc;
  }
  forces(s: State, c: Controls): Forces {
    const flow = rotate(
      inverseQ(s.orientation),
      sub(s.velocity, windAt(s.time, this.environment)),
    );
    const power = powertrain(
      this.aircraft,
      s.motors,
      s.batterySoc,
      this.environment.densityKgM3,
    );
    let force: Vec3 = [0, 0, 0],
      torque: Vec3 = [0, 0, 0];
    const surfaces: SurfaceForce[] = [];
    const apply = (f: Vec3, position: Vec3) => {
      force = add(force, f);
      torque = add(torque, cross(sub(position, this.properties.cg), f));
    };
    for (const [surfaceIndex, wing] of this.aircraft.surfaces.entries()) {
      const r = sub(wing.positionM, this.properties.cg),
        v = add(flow, cross(s.omega, r));
      for (let i = 0; i < this.aircraft.motors.length; i++) {
        const motor = this.aircraft.motors[i],
          dx = motor.positionM[0] - wing.positionM[0];
        const radius = motor.propDiameterM / 2;
        if (dx > 0 && dx < 1.5) {
          const radial = Math.hypot(
            wing.positionM[1] - motor.positionM[1],
            wing.positionM[2] - motor.positionM[2],
          );
          const overlap = clamp(
            (radius + wing.spanM / 2 - radial) / Math.max(wing.spanM, 0.01),
            0,
            1,
          );
          const thrust =
            power.thrust[i] *
            clamp(1 - Math.max(0, flow[0]) / motor.zeroThrustSpeedMps, 0, 1);
          const induced =
            Math.sqrt(
              Math.max(
                0,
                flow[0] * flow[0] +
                  (2 * thrust) /
                    (this.environment.densityKgM3 * Math.PI * radius * radius),
              ),
            ) - Math.max(0, flow[0]);
          v[0] += induced * overlap * Math.exp(-dx * 0.7);
        }
      }
      const orient = axisQ([1, 0, 0], radians(wing.rollDeg));
      const normal = rotate(orient, [0, 0, -1]),
        span = rotate(orient, [0, 1, 0]);
      const planar = sub(v, scale(span, dot(v, span))),
        speed = length(planar),
        direction = unit(planar);
      const geometric = Math.atan2(-dot(planar, normal), planar[0]);
      const deflect = wing.control
        ? (s.surfaceCommands?.[surfaceIndex] ??
            surfaceCommand(wing.control, c)) *
          radians(this.actuations[surfaceIndex].maxDeg) *
          wing.control.effectiveness
        : 0;
      const alpha =
        geometric + radians(wing.incidenceDeg - wing.zeroLiftDeg) + deflect;
      const stall = radians(wing.stallDeg),
        blend = clamp((Math.abs(alpha) - stall) / radians(12), 0, 1);
      let cl =
        (1 - blend) * wing.liftSlope * alpha +
        blend * 1.1 * Math.sin(2 * alpha);
      let cd =
        wing.cd0 +
        (cl * cl) / (Math.PI * wing.aspectRatio * wing.efficiency) +
        blend * 1.3 * Math.sin(alpha) ** 2;
      let cm = wing.cm;
      const reynolds =
        (speed * wing.chordM) /
        (this.environment.kinematicViscosityM2S ?? STANDARD_AIR_VISCOSITY);
      const coefficients = surfacePolar(
        wing,
        ((geometric + radians(wing.incidenceDeg) + deflect) * 180) / Math.PI,
        reynolds,
        { cl, cd, cm },
      );
      ({ cl, cd, cm } = coefficients);
      const pressure =
        0.5 *
        this.environment.densityKgM3 *
        speed *
        speed *
        wing.spanM *
        wing.chordM;
      const liftDirection = unit(cross(span, direction)); // upward for forward flow; perpendicular to local airflow
      const f = add(
        scale(liftDirection, cl * pressure),
        scale(direction, -cd * pressure),
      );
      apply(f, wing.positionM);
      torque = add(torque, scale(span, cm * pressure * wing.chordM));
      surfaces.push({
        id: wing.id,
        kind: wing.kind,
        position: wing.positionM,
        force: f,
        alphaDeg: (alpha * 180) / Math.PI,
        reynolds,
        coefficientSource: coefficients.source,
        outsidePolarEnvelope: coefficients.outsideEnvelope,
        stalled: Math.abs(alpha) > stall,
      });
    }
    for (let i = 0; i < this.aircraft.motors.length; i++) {
      const m = this.aircraft.motors[i],
        speedFactor = clamp(
          1 - Math.max(0, flow[0]) / m.zeroThrustSpeedMps,
          0,
          1,
        );
      if (this.aircraft.vehicleType === "multirotor") {
        const thrust = power.thrust[i];
        apply([0, 0, -thrust], m.positionM);
        torque[2] += thrust * m.torquePerThrustM * (m.spin === "cw" ? -1 : 1);
      } else {
        const thrust = power.thrust[i] * speedFactor;
        apply([thrust, 0, 0], m.positionM);
        if (m.spin)
          torque[0] += thrust * m.torquePerThrustM * (m.spin === "cw" ? -1 : 1);
      }
    }
    if (this.aircraft.bodyDragAreaM2) {
      force = add(
        force,
        flow.map(
          (v, i) =>
            -0.5 *
            this.environment.densityKgM3 *
            this.aircraft.bodyDragAreaM2![i] *
            Math.abs(v) *
            v,
        ) as Vec3,
      );
    } else {
      force = add(
        force,
        scale(
          flow,
          -0.5 *
            this.environment.densityKgM3 *
            length(flow) *
            this.aircraft.fuselageDragAreaM2,
        ),
      );
    }
    torque = add(
      torque,
      s.omega.map(
        (w, i) =>
          -w * this.aircraft.angularDamping[i] * (1 + length(flow) * 0.1),
      ) as Vec3,
    );
    return { force, torque, surfaces, airspeed: length(flow) };
  }
  private acceleration(s: State, c: Controls) {
    const f = this.forces(s, c);
    return {
      velocity: add(
        scale(rotate(s.orientation, f.force), 1 / this.properties.mass),
        [0, 0, GRAVITY],
      ),
      omega: matVec(
        this.properties.inverseInertia,
        sub(f.torque, cross(s.omega, matVec(this.properties.inertia, s.omega))),
      ),
    };
  }
  private resolveGround(c: Controls, dt: number) {
    resolveGroundContacts(
      this.state,
      this.aircraft,
      this.properties,
      c,
      dt,
      this.environment.surface,
    );
  }
  step(raw: Controls, dt = FIXED_DT): State {
    if (!Number.isFinite(dt) || dt <= 0 || dt > 1 / 30)
      throw new Error("Simulation timestep must be in (0, 1/30] seconds");
    if (this.state.status === "crashed" || this.state.status === "landed")
      return this.state;
    const c = cleanControls(raw),
      s = this.state;
    const rotors =
      this.aircraft.vehicleType === "multirotor"
        ? rotorCommands(this.aircraft, s, c)
        : null;
    s.motors = s.motors.map((v, i) => {
      const m = this.aircraft.motors[i];
      const target =
        rotors?.[i] ?? clamp(c.throttle * (1 + c.yaw * m.yawMix * 0.45), 0, 1);
      return v + (target - v) * (1 - Math.exp(-dt / m.responseSeconds));
    });
    if (
      this.aircraft.surfaces.some(
        (w) =>
          w.control?.responseSeconds ||
          w.control?.rateLimitDegS ||
          w.control?.linkage,
      )
    ) {
      s.surfaceCommands = this.aircraft.surfaces.map((w, i) => {
        if (!w.control) return 0;
        const target = surfaceCommand(w.control, c),
          previous = s.surfaceCommands?.[i] ?? 0;
        return advanceSurfaceCommand(previous, target, this.actuations[i], dt);
      });
    }
    const k1 = this.acceleration(s, c);
    const mid: State = {
      ...s,
      time: s.time + dt / 2,
      position: add(s.position, scale(s.velocity, dt / 2)),
      velocity: add(s.velocity, scale(k1.velocity, dt / 2)),
      omega: add(s.omega, scale(k1.omega, dt / 2)),
      orientation: advanceQ(s.orientation, s.omega, dt / 2),
    };
    const k2 = this.acceleration(mid, c);
    const power = powertrain(
      this.aircraft,
      mid.motors,
      mid.batterySoc,
      this.environment.densityKgM3,
    );
    this.state = {
      ...s,
      time: s.time + dt,
      ...(this.aircraft.battery
        ? {
            batterySoc: clamp(
              (s.batterySoc ?? this.aircraft.battery.initialSoc) -
                (power.current * dt) /
                  (this.aircraft.battery.capacityMah * 3.6),
              0,
              1,
            ),
          }
        : {}),
      position: add(s.position, scale(mid.velocity, dt)),
      velocity: add(s.velocity, scale(k2.velocity, dt)),
      omega: add(s.omega, scale(k2.omega, dt)),
      orientation: advanceQ(s.orientation, mid.omega, dt),
    };
    if (
      ![
        ...this.state.position,
        ...this.state.velocity,
        ...this.state.omega,
        ...this.state.orientation,
      ].every(Number.isFinite)
    )
      throw new Error(
        "Non-finite flight state: inspect aircraft coefficients or reduce timestep",
      );
    this.resolveGround(c, dt);
    this.lastForces = this.forces(this.state, c);
    return this.state;
  }
}
