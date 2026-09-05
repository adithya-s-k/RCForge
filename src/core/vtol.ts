import type { Aircraft } from "./schema";
import type { Controls, State, Forces, Environment } from "./simulation";
import type { massProperties } from "./aircraft";
import type { VtolState } from "./vtol-config";
import { powertrain } from "./powertrain";
import {
  add,
  sub,
  scale,
  dot,
  cross,
  rotate,
  inverseQ,
  euler,
  radians,
  clamp,
  matVec,
  invert,
  type Vec3,
  type Mat3,
} from "./math";

const gravity = 9.80665;
export function initialVtolState(
  position: Vec3 = [0, 0, 0],
  heading = 0,
): VtolState {
  return {
    phase: "hover",
    requestedMode: "hover",
    commonTiltDeg: 0,
    tiltDeg: [0, 0],
    rearTiltDeg: 0,
    phaseTime: 0,
    airspeedTime: 0,
    altitudeTargetM: -position[2],
    positionTarget: [...position],
    verticalIntegral: 0,
    headingTarget: heading,
    surfaceIntegral: [0, 0, 0],
    notice: "none",
    saturated: false,
  };
}
export function vtolMotorIndices(a: Aircraft) {
  const v = a.vtol!;
  return [v.frontLeftMotorId, v.frontRightMotorId, v.rearMotorId].map((id) =>
    a.motors.findIndex((m) => m.id === id),
  );
}
/** Body-frame direction; zero is vertical, +90 degrees is forward.
 * VTOL rotor CW/CCW is viewed from the thrust side toward the rotor: reaction
 * torque for CW acts along the positive thrust axis (upward when hovering). */
export function vtolThrustAxis(
  a: Aircraft,
  s: State,
  motorIndex: number,
): Vec3 {
  const front = vtolMotorIndices(a).indexOf(motorIndex);
  if (front === 2) {
    const yaw = radians(s.vtol?.rearTiltDeg ?? 0);
    return [0, Math.sin(yaw), -Math.cos(yaw)];
  }
  const angle = front < 2 ? radians(s.vtol?.tiltDeg[front] ?? 0) : 0;
  return [Math.sin(angle), 0, -Math.cos(angle)];
}
export function vtolRotorLoads(
  a: Aircraft,
  s: State,
  cg: Vec3,
  thrust: number[],
  flow: Vec3,
) {
  let force: Vec3 = [0, 0, 0],
    torque: Vec3 = [0, 0, 0];
  const factors: number[] = [];
  a.motors.forEach((m, i) => {
    const direction = vtolThrustAxis(a, s, i);
    const factor = clamp(
      1 - Math.max(0, dot(flow, direction)) / m.zeroThrustSpeedMps,
      0,
      1,
    );
    factors.push(factor);
    const f = scale(direction, thrust[i] * factor);
    force = add(force, f);
    torque = add(
      torque,
      add(
        cross(sub(m.positionM, cg), f),
        scale(f, m.torquePerThrustM * (m.spin === "cw" ? 1 : -1)),
      ),
    );
  });
  return { force, torque, factors };
}

function slew(value: number, target: number, rate: number, dt: number) {
  return value + clamp(target - value, -rate * dt, rate * dt);
}

/** Independent, ideal-state controller. It commands real actuators only; it never
 * edits the aircraft pose, velocity, or the resultant aerodynamic forces.
 * ArduPilot-inspired modes, not ArduPilot firmware or a hardware tuning export. */
export function vtolCommands(
  a: Aircraft,
  s: State,
  c: Controls,
  properties: ReturnType<typeof massProperties>,
  environment: Environment,
  flow: Vec3,
  total: Forces,
  dt: number,
) {
  const config = a.vtol!,
    v = s.vtol!,
    ids = vtolMotorIndices(a);
  const power = powertrain(a, s.motors, s.batterySoc, environment.densityKgM3);
  const loads = vtolRotorLoads(a, s, properties.cg, power.thrust, flow);
  const profile =
    config.profiles[c.vtol?.assistance ?? config.defaultAssistance];
  const angles = euler(s.orientation);
  const requested = c.vtol?.mode ?? "hover";
  const powered = c.throttle > 0;
  const altitude = -s.position[2];
  if (requested !== v.requestedMode) {
    v.requestedMode = requested;
    if (requested === "hover") {
      v.phase = v.commonTiltDeg > 0 ? "returning" : "hover";
      v.notice = "none";
      v.altitudeTargetM = altitude;
      v.positionTarget = [...s.position];
    } else if (altitude >= config.transitionAltitudeM && powered) {
      v.phase = "accelerating";
      v.notice = "none";
    } else v.notice = "climb-first";
    v.phaseTime = 0;
    v.airspeedTime = 0;
  }
  v.phaseTime += dt;
  if (
    (v.phase === "accelerating" || v.phase === "converting") &&
    (v.phaseTime > config.transitionTimeoutS || altitude < 1)
  ) {
    v.phase = "returning";
    v.notice = "transition-aborted";
    v.positionTarget = [...s.position];
  }
  if (v.phase === "accelerating") {
    v.airspeedTime =
      flow[0] >= config.transitionAirspeedMps ? v.airspeedTime + dt : 0;
    if (v.airspeedTime >= 1) v.phase = "converting";
  }
  // Keep a vertical component until the air-relative speed has supported conversion.
  let targetTilt =
    v.phase === "accelerating"
      ? 45
      : v.phase === "converting" || v.phase === "cruise"
        ? 90
        : 0;
  if (v.phase === "converting" && flow[0] < config.transitionAirspeedMps * 0.85)
    targetTilt = Math.min(v.commonTiltDeg, 60);
  v.commonTiltDeg = slew(v.commonTiltDeg, targetTilt, config.tiltRateDegS, dt);
  if (
    v.phase === "converting" &&
    v.commonTiltDeg >= 90 &&
    v.tiltDeg.every((angle) => angle >= 89.9)
  )
    v.phase = "cruise";
  if (
    v.phase === "returning" &&
    v.commonTiltDeg === 0 &&
    Math.abs(v.tiltDeg[0] + v.tiltDeg[1]) < 2 &&
    Math.hypot(s.velocity[0], s.velocity[1]) < 0.6
  ) {
    v.phase = "hover";
    v.positionTarget = [...s.position];
    v.altitudeTargetM = altitude;
  }
  const wingBlend = clamp(((v.tiltDeg[0] + v.tiltDeg[1]) / 2 - 45) / 40, 0, 1);
  const climbStick =
    Math.abs(c.throttle - 0.5) < 0.05
      ? 0
      : (c.throttle - 0.5 - Math.sign(c.throttle - 0.5) * 0.05) / 0.45;
  // At rest, centred throttle holds the ground. A climb request initiates takeoff.
  if (!powered || (s.status === "grounded" && climbStick <= 0)) {
    v.altitudeTargetM = altitude;
    v.positionTarget = [...s.position];
    v.headingTarget = angles[2];
    v.verticalIntegral = 0;
  } else if (wingBlend < 1)
    v.altitudeTargetM += climbStick * profile.climbMps * dt;
  v.altitudeTargetM = Math.max(0, v.altitudeTargetM);
  const vzTarget = clamp(
    (v.altitudeTargetM - altitude) * 1.4,
    -profile.climbMps,
    profile.climbMps,
  );
  const verticalError = vzTarget + s.velocity[2];
  if (powered && !v.saturated && wingBlend < 1)
    v.verticalIntegral = clamp(
      v.verticalIntegral + verticalError * dt * 0.6,
      -4,
      4,
    );
  const accelerationUp = clamp(verticalError * 2.8 + v.verticalIntegral, -5, 7);

  let hoverRoll = c.roll * radians(profile.bankDeg),
    hoverPitch = c.pitch * radians(profile.pitchDeg);
  if (
    (profile.positionHold && v.phase === "hover") ||
    v.phase === "returning"
  ) {
    // Beginner stick directions remain aircraft-relative: push pitch forward to travel forward.
    const yaw = angles[2],
      cosine = Math.cos(yaw),
      sine = Math.sin(yaw);
    const targetVelocity: Vec3 = [
      (-c.pitch * cosine - c.roll * sine) * profile.horizontalSpeedMps,
      (-c.pitch * sine + c.roll * cosine) * profile.horizontalSpeedMps,
      0,
    ];
    const braking = v.phase === "returning";
    const centered = braking || Math.hypot(c.roll, c.pitch) < 0.03;
    if (!centered || braking) v.positionTarget = [...s.position];
    const accel = [0, 1].map((i) =>
      clamp(
        (centered
          ? clamp(
              (v.positionTarget[i] - s.position[i]) * 0.45,
              -profile.horizontalSpeedMps,
              profile.horizontalSpeedMps,
            )
          : targetVelocity[i]) - s.velocity[i],
        -4,
        4,
      ),
    );
    hoverPitch = clamp(
      -(accel[0] * cosine + accel[1] * sine) / gravity,
      -radians(profile.pitchDeg),
      radians(profile.pitchDeg),
    );
    hoverRoll = clamp(
      (-accel[0] * sine + accel[1] * cosine) / gravity,
      -radians(profile.bankDeg),
      radians(profile.bankDeg),
    );
  }
  // Lean into the rear yaw rotor's lateral force; this is an attitude target, not an added force.
  hoverRoll += Math.atan2(-loads.force[1], properties.mass * gravity);
  const targetRoll =
    hoverRoll * (1 - wingBlend) + c.roll * radians(profile.bankDeg) * wingBlend;
  const targetPitch =
    hoverPitch * (1 - wingBlend) +
    radians(config.cruisePitchDeg + c.pitch * profile.pitchDeg) * wingBlend;
  v.headingTarget += c.yaw * radians(profile.yawRateDegS) * dt;
  v.headingTarget = Math.atan2(
    Math.sin(v.headingTarget),
    Math.cos(v.headingTarget),
  );
  const headingError = Math.atan2(
    Math.sin(v.headingTarget - angles[2]),
    Math.cos(v.headingTarget - angles[2]),
  );
  const targetRates: Vec3 = [
    clamp((targetRoll - angles[0]) * config.attitudeGain, -2.5, 2.5),
    clamp((targetPitch - angles[1]) * config.attitudeGain, -2, 2),
    c.yaw * radians(profile.yawRateDegS) + headingError * 1.5 * (1 - wingBlend),
  ];
  const torqueTarget = add(
    matVec(
      properties.inertia,
      scale(sub(targetRates, s.omega), config.rateGain),
    ),
    cross(s.omega, matVec(properties.inertia, s.omega)),
  );
  if (flow[0] > 6) {
    v.surfaceIntegral[0] = clamp(
      v.surfaceIntegral[0] + (targetRoll - angles[0]) * dt * 0.8,
      -0.5,
      0.5,
    );
    v.surfaceIntegral[1] = clamp(
      v.surfaceIntegral[1] + (targetPitch - angles[1]) * dt * 0.8,
      -0.5,
      0.5,
    );
  } else
    v.surfaceIntegral = v.surfaceIntegral.map(
      (value) => value * Math.exp(-dt * 2),
    ) as Vec3;
  const surfaceControls: Controls = {
    ...c,
    roll: clamp(
      v.surfaceIntegral[0] + (targetRoll - angles[0]) * 2.5 - s.omega[0] * 0.5,
      -1,
      1,
    ),
    pitch: clamp(
      config.cruisePitchTrim +
        v.surfaceIntegral[1] +
        (targetPitch - angles[1]) * 2.5 -
        s.omega[1] * 0.55,
      -1,
      1,
    ),
    yaw: clamp(c.yaw * 0.5 - s.omega[2] * 0.15, -1, 1),
  };
  const aeroTorque = sub(total.torque, loads.torque);
  const aeroForce = sub(total.force, loads.force);
  const bodyUp = rotate(s.orientation, [0, 0, -1])[2] * -1;
  const neededUp =
    (properties.mass * (gravity + accelerationUp)) / Math.max(0.3, bodyUp) +
    aeroForce[2];
  const neededTorque = sub(torqueTarget, aeroTorque);
  const matrix: Mat3 = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  ids.forEach((i, col) => {
    const direction = vtolThrustAxis(a, s, i),
      m = a.motors[i];
    const moment = add(
      cross(sub(m.positionM, properties.cg), direction),
      scale(direction, m.torquePerThrustM * (m.spin === "cw" ? 1 : -1)),
    );
    matrix[0][col] = -direction[2];
    matrix[1][col] = moment[0];
    matrix[2][col] = moment[1];
  });
  let desired: Vec3 = [0, 0, 0];
  try {
    desired = matVec(invert(matrix), [
      Math.max(0, neededUp),
      neededTorque[0],
      neededTorque[1],
    ]);
  } catch {
    /* Forward-flight rotors have no vertical authority. */
  }
  // The rear motor pivots sideways for yaw. Front tilt servos share the conversion command.
  const rear = a.motors[ids[2]],
    rearThrust = Math.max(0.1, desired[2]);
  const rearX = rear.positionM[0] - properties.cg[0];
  const reaction = rear.torquePerThrustM * (rear.spin === "cw" ? 1 : -1);
  const frontYaw = ids.slice(0, 2).reduce((sum, i, j) => {
    const m = a.motors[i],
      direction = vtolThrustAxis(a, s, i),
      f = scale(direction, Math.max(0, desired[j]));
    return (
      sum +
      cross(sub(m.positionM, properties.cg), f)[2] +
      f[2] * m.torquePerThrustM * (m.spin === "cw" ? 1 : -1)
    );
  }, 0);
  let rearAngle = radians(v.rearTiltDeg);
  for (let iteration = 0; iteration < 3; iteration++) {
    const error =
      rearThrust *
        (rearX * Math.sin(rearAngle) - reaction * Math.cos(rearAngle)) +
      frontYaw -
      neededTorque[2];
    const derivative =
      rearThrust *
      (rearX * Math.cos(rearAngle) + reaction * Math.sin(rearAngle));
    if (Math.abs(derivative) > 1e-5) rearAngle -= error / derivative;
    rearAngle = clamp(
      rearAngle,
      -radians(config.yawTiltDeg),
      radians(config.yawTiltDeg),
    );
  }
  const rearServo = a.parts.find(
    (p) => p.id === config.rearServoPartId,
  )!.servo!;
  v.rearTiltDeg = slew(
    v.rearTiltDeg,
    ((rearAngle * 180) / Math.PI) * (1 - wingBlend),
    60 / rearServo.speedSecondsPer60Deg,
    dt,
  );
  [config.leftServoPartId, config.rightServoPartId].forEach((id, i) => {
    const servo = a.parts.find((p) => p.id === id)!.servo!;
    v.tiltDeg[i] = slew(
      v.tiltDeg[i],
      v.commonTiltDeg,
      60 / servo.speedSecondsPer60Deg,
      dt,
    );
  });
  const targets = a.motors.map(() => 0);
  const maxPower = powertrain(
    a,
    a.motors.map(() => 1),
    s.batterySoc,
    environment.densityKgM3,
  );
  v.saturated = false;
  ids.forEach((i, j) => {
    // Blend toward manual cruise power only after wing lift is established.
    const cruise = j < 2 ? c.throttle : 0;
    const thrust = Math.max(0, desired[j]) * (1 - wingBlend);
    if (thrust > maxPower.thrust[i] * loads.factors[i] + 0.1 && wingBlend < 0.9)
      v.saturated = true;
    targets[i] =
      clamp(
        thrust / Math.max(0.01, maxPower.thrust[i] * loads.factors[i]),
        0,
        1,
      ) +
      cruise * wingBlend;
  });
  // Invert the installed current/thrust tables with their coupled voltage sag.
  for (let iteration = 0; iteration < 4; iteration++) {
    const current = powertrain(
      a,
      targets,
      s.batterySoc,
      environment.densityKgM3,
    );
    ids.forEach((i, j) => {
      if (wingBlend >= 1) return;
      const actual = current.thrust[i] * loads.factors[i];
      const requestedThrust = Math.max(0, desired[j]);
      const delta =
        ((requestedThrust - actual) / Math.max(1, maxPower.thrust[i])) *
        (1 - wingBlend);
      targets[i] = clamp(targets[i] + delta * 0.6, 0, 1);
    });
  }
  if (!powered || (s.status === "grounded" && climbStick <= 0)) targets.fill(0);
  if (!powered) v.notice = "power-cut";
  else if (v.notice === "power-cut") v.notice = "none";
  return { motors: targets, surfaces: surfaceControls };
}
