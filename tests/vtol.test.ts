import { describe, expect, it } from "vitest";
import raw from "../aircraft/bronco-tri-vtol.json";
import { parseAircraft } from "../src/core/schema";
import {
  Simulation,
  initialState,
  calmEnvironment,
  neutralControls,
  GRAVITY,
  type Controls,
} from "../src/core/simulation";
import { findTrim } from "../src/core/trim";
import { vtolMotorIndices, vtolThrustAxis } from "../src/core/vtol";
import { massProperties } from "../src/core/aircraft";
import { powertrain } from "../src/core/powertrain";
import {
  add,
  sub,
  scale,
  cross,
  euler,
  degrees,
  length,
} from "../src/core/math";
import { launchState, fitLandingGear } from "../src/core/launch";
import { placedLaunch } from "../src/core/placement";
import { ControlPreview } from "../src/core/control-preview";
import {
  responseSettings,
  PilotResponseFilter,
} from "../src/core/pilot-response";
import {
  createRecording,
  parseRecording,
  replayRecording,
  runExperiment,
  samplesToCsv,
} from "../src/core/experiment";
import { ActionEdges } from "../src/input/actions";
import { standardShortcuts } from "../src/input/presentation";
import { buildAircraft, disposeAircraft } from "../src/view/model";
import * as T from "three";

const aircraft = () => parseAircraft(raw);
const hoverControl = (): Controls => ({
  ...neutralControls(),
  throttle: 0.5,
  vtol: { mode: "hover", assistance: "beginner" },
});
const hover = (altitude = 15) => {
  const a = aircraft(),
    trim = findTrim(a);
  trim.state.position[2] = -altitude;
  trim.state.vtol!.positionTarget = [...trim.state.position];
  trim.state.vtol!.altitudeTargetM = altitude;
  return new Simulation(a, calmEnvironment(), trim.state);
};

it("counts both real tilt servos, the third motor and the separate mounting mass exactly once", () => {
  const a = aircraft();
  expect(massProperties(a).mass).toBeCloseTo(1.323, 6);
  expect(a.parts.filter((p) => p.catalogId === "rds3115mg-180")).toHaveLength(
    2,
  );
  const original = massProperties(a);
  a.parts.find((p) => p.id === a.vtol!.leftServoPartId)!.massKg += 0.04;
  const changed = massProperties(a);
  expect(changed.mass - original.mass).toBeCloseTo(0.04);
  expect(changed.cg[1]).toBeLessThan(original.cg[1]);
  expect(changed.inertia[0][0]).toBeGreaterThan(original.inertia[0][0]);
  expect(fitLandingGear(a)).toEqual(a);
});

it.each(["frontLeftMotorId", "rearMotorId", "leftServoPartId"] as const)(
  "rejects missing installed reference %s",
  (key) => {
    const a = aircraft();
    a.vtol![key] = "missing";
    expect(() => parseAircraft(a)).toThrow();
  },
);
it("rejects duplicate tilt servos, inadequate range, and a surface sharing a tilt servo", () => {
  const a = aircraft();
  a.vtol!.rightServoPartId = a.vtol!.leftServoPartId;
  expect(() => parseAircraft(a)).toThrow();
  const b = aircraft();
  b.parts.find((p) => p.id === b.vtol!.leftServoPartId)!.servo!.travelDeg = 80;
  expect(() => parseAircraft(b)).toThrow();
  const c = aircraft();
  c.surfaces[0].control!.linkage!.servoPartId = c.vtol!.leftServoPartId;
  expect(() => parseAircraft(c)).toThrow();
});
it("computes continuous rotor force, CG lever arms and reaction torque through the whole tilt range", () => {
  const a = aircraft(),
    sim = new Simulation(a),
    c = neutralControls();
  for (const angle of [0, 25, 45, 90]) {
    const s = initialState(a, 0, 100, 0);
    s.vtol!.tiltDeg = [angle, angle];
    s.motors = [0.7, 0.6, 0.5];
    const power = powertrain(a, s.motors, s.batterySoc);
    let force: [number, number, number] = [0, 0, 0],
      torque: [number, number, number] = [0, 0, 0];
    a.motors.forEach((m, i) => {
      const f = scale(vtolThrustAxis(a, s, i), power.thrust[i]);
      force = add(force, f);
      torque = add(
        torque,
        add(
          cross(sub(m.positionM, sim.properties.cg), f),
          scale(f, m.torquePerThrustM * (m.spin === "cw" ? 1 : -1)),
        ),
      );
    });
    const actual = sim.forces(s, c);
    expect(length(sub(actual.force, force))).toBeLessThan(1e-10);
    expect(length(sub(actual.torque, torque))).toBeLessThan(1e-10);
    expect(vtolThrustAxis(a, s, 2)).toEqual([0, 0, -1]);
  }
});
it("retains motor identity after JSON motor order changes", () => {
  const a = aircraft();
  a.motors.reverse();
  expect(vtolMotorIndices(a)).toEqual([2, 1, 0]);
  const s = initialState(a, 0, 10, 0);
  s.vtol!.tiltDeg = [90, 45];
  expect(vtolThrustAxis(a, s, 2)[0]).toBeCloseTo(1);
  expect(vtolThrustAxis(a, s, 0)[2]).toBe(-1);
});
it("solves six-axis hover and longitudinal cruise equilibria; moved CG changes motor balance", () => {
  const a = aircraft(),
    trim = findTrim(a),
    cruise = findTrim(a, 14, calmEnvironment(), 0, "cruise");
  expect(trim.converged).toBe(true);
  expect(Math.hypot(...trim.residual)).toBeLessThan(1e-6);
  expect(cruise.converged).toBe(true);
  expect(cruise.state.motors[2]).toBe(0);
  expect(trim.state.vtol!.rearTiltDeg).toBeLessThan(0); // rear reaction torque requires sideways tilt
  a.parts.find((p) => p.id === a.battery!.partId)!.positionM[0] += 0.05;
  const shifted = findTrim(a);
  expect(shifted.converged).toBe(true);
  expect(shifted.state.motors[2]).toBeLessThan(trim.state.motors[2]);
});
it("holds the placed launch point and heading instead of returning to the origin", () => {
  const a = aircraft(),
    s = placedLaunch(a, "airborne", {
      northM: 100,
      eastM: -80,
      altitudeM: 10,
      headingDeg: 90,
    });
  const sim = new Simulation(a, calmEnvironment(), s);
  for (let i = 0; i < 1200; i++) sim.step(hoverControl());
  expect(length(sub(sim.state.position, s.position))).toBeLessThan(0.1);
  expect(degrees(euler(sim.state.orientation)[2])).toBeCloseTo(90, 0);
});
it("keeps ground throttle centered at rest, then physically takes off on a climb command", () => {
  const a = aircraft(),
    s = launchState(a, "ground"),
    sim = new Simulation(a, calmEnvironment(), s);
  for (let i = 0; i < 240; i++) sim.step(hoverControl());
  expect(sim.state.status).toBe("grounded");
  expect(Math.max(...sim.state.motors)).toBe(0);
  for (let i = 0; i < 720; i++) sim.step({ ...hoverControl(), throttle: 0.8 });
  expect(sim.state.status).toBe("flying");
  expect(-sim.state.position[2]).toBeGreaterThan(4);
});
it.each(["roll", "pitch", "yaw"] as const)(
  "positive %s command produces the intended rotation in intermediate hover",
  (axis) => {
    const sim = hover();
    const c = hoverControl();
    c.vtol!.assistance = "intermediate";
    c[axis] = 0.3;
    for (let i = 0; i < 100; i++) sim.step(c);
    expect(
      euler(sim.state.orientation)[{ roll: 0, pitch: 1, yaw: 2 }[axis]],
    ).toBeGreaterThan(0.015);
  },
);
it("beginner position hold arrests drift in a crosswind", () => {
  const sim = hover();
  sim.environment.windMps = [0, 3, 0];
  for (let i = 0; i < 2400; i++) sim.step(hoverControl());
  expect(sim.state.status).toBe("flying");
  expect(Math.hypot(sim.state.velocity[0], sim.state.velocity[1])).toBeLessThan(
    0.2,
  );
  expect(Math.hypot(sim.state.position[0], sim.state.position[1])).toBeLessThan(
    2,
  );
  expect(Math.abs(sim.state.position[2] + 15)).toBeLessThan(0.2);
});
it("rejects an early conversion request and requires a fresh mode-switch edge after climbing", () => {
  const sim = hover(3),
    c = hoverControl();
  c.vtol!.mode = "cruise";
  sim.step(c);
  expect(sim.state.vtol!.phase).toBe("hover");
  expect(sim.state.vtol!.notice).toBe("climb-first");
  sim.state.position[2] = -15;
  sim.step(c);
  expect(sim.state.vtol!.phase).toBe("hover");
  c.vtol!.mode = "hover";
  sim.step(c);
  c.vtol!.mode = "cruise";
  sim.step(c);
  expect(sim.state.vtol!.phase).toBe("accelerating");
});
it("does not cut vertical support before measured tilt actuators move", () => {
  const sim = hover(),
    v = sim.state.vtol!;
  sim.aircraft.parts.find(
    (p) => p.id === sim.aircraft.vtol!.leftServoPartId,
  )!.servo!.speedSecondsPer60Deg = 2;
  v.phase = "converting";
  v.requestedMode = "cruise";
  v.commonTiltDeg = 90;
  v.tiltDeg = [0, 0];
  sim.state.velocity = [14, 0, 0];
  const c = hoverControl();
  c.vtol!.mode = "cruise";
  sim.step(c);
  expect(sim.state.vtol!.phase).toBe("converting");
  expect(sim.state.vtol!.tiltDeg[0]).toBeLessThanOrEqual(0.25 + 1e-9);
  expect(sim.state.motors[2]).toBeGreaterThan(0);
});
it("aborts a stalled conversion at its configured timeout", () => {
  const sim = hover(),
    v = sim.state.vtol!;
  v.phase = "accelerating";
  v.requestedMode = "cruise";
  v.phaseTime = sim.aircraft.vtol!.transitionTimeoutS;
  const c = hoverControl();
  c.vtol!.mode = "cruise";
  sim.step(c);
  expect(sim.state.vtol!.notice).toBe("transition-aborted");
  expect(["returning", "hover"]).toContain(sim.state.vtol!.phase);
});
it("cuts motors at zero throttle and battery exhaustion without freezing the aircraft", () => {
  for (const empty of [false, true]) {
    const sim = hover();
    if (empty) sim.state.batterySoc = 0;
    for (let i = 0; i < 120; i++)
      sim.step({ ...hoverControl(), throttle: empty ? 0.8 : 0 });
    expect(sim.state.velocity[2]).toBeGreaterThan(3);
    if (!empty) expect(Math.max(...sim.state.motors)).toBeLessThan(0.0001);
    expect(
      powertrain(
        sim.aircraft,
        sim.state.motors,
        sim.state.batterySoc,
      ).thrust.reduce((a, b) => a + b, 0),
    ).toBeLessThan(0.001);
  }
});
it.each(["beginner", "intermediate"] as const)(
  "completes conversion and return with %s assistance and deterministic replay",
  (assistance) => {
    const a = aircraft();
    a.vtol!.defaultAssistance = assistance;
    const result = runExperiment(a, calmEnvironment(), "vtol-transition", 50);
    expect(result.recording.frames).toHaveLength(6000);
    expect(result.finalState.status).toBe("flying");
    expect(result.finalState.vtol!.phase).toBe("hover");
    expect(
      Math.min(...result.recording.samples.map((s) => s.altitudeM)),
    ).toBeGreaterThan(12);
    expect(
      result.recording.samples.some(
        (s) => s.vtolTiltDeg === 90 && s.vtolRearMotor! < 0.001,
      ),
    ).toBe(true);
    expect(length(result.finalState.velocity)).toBeLessThan(0.3);
    expect(result.finalState.batterySoc).toBeLessThan(a.battery!.initialSoc);
    const imported = parseRecording(
      JSON.parse(JSON.stringify(result.recording)),
    );
    expect(replayRecording(imported)).toEqual(result.finalState);
    expect(samplesToCsv(imported.samples)).toContain(
      "vtolTiltDeg,vtolRearMotor",
    );
  },
  30000,
);
it("rejects recordings that omit the VTOL controller state and retains mode commands through rate shaping", () => {
  const r = createRecording(hover());
  delete r.initialState.vtol;
  expect(() => parseRecording(r)).toThrow(/VTOL state/);
  const c = hoverControl();
  c.vtol!.mode = "cruise";
  expect(
    new PilotResponseFilter().step(c, responseSettings(), 1 / 120).vtol,
  ).toEqual(c.vtol);
});
it("uses CH5 edges without firing a held mode on reconnect; standard gamepads use the right bumper", () => {
  const edges = new ActionEdges(),
    bindings = { vtolHover: "a4-", vtolCruise: "a4+" };
  expect(edges.read("radio", bindings, [], [0, 0, 0, 0, 1])).toEqual([]);
  expect(edges.read("radio", bindings, [], [0, 0, 0, 0, -1])).toEqual([
    "vtolHover",
  ]);
  expect(edges.read("radio", bindings, [], [0, 0, 0, 0, 1])).toEqual([
    "vtolCruise",
  ]);
  expect(edges.read("radio-new", bindings, [], [0, 0, 0, 0, 1])).toEqual([]);
  expect(standardShortcuts.vtolMode).toBe("b5");
});
it("animates front conversion and separate sideways rear yaw at installed servo rates", () => {
  const a = aircraft(),
    model = buildAircraft(a),
    preview = new ControlPreview(a);
  expect(model.tiltMounts).toHaveLength(3);
  const rear = model.group.getObjectByName("tilt-pivot:motor-rear")!;
  expect(new T.Vector3(1, 0, 0).applyQuaternion(rear.quaternion).z).toBeCloseTo(
    -1,
  );
  expect(model.group.getObjectByName("rear-motor-support")).toBeDefined();
  for (let i = 0; i < 120; i++)
    preview.step({ ...hoverControl(), yaw: 1 }, responseSettings());
  expect(preview.tiltDeg).toEqual([0, 0]);
  expect(preview.rearTiltDeg).toBe(-20);
  expect(preview.controls.throttle).toBe(0);
  preview.reset();
  preview.tiltMode = "cruise";
  for (let i = 0; i < 120; i++)
    preview.step(hoverControl(), responseSettings());
  expect(preview.tiltDeg[0]).toBeCloseTo(a.vtol!.tiltRateDegS);
  disposeAircraft(model.group);
});

it("aligns installed shaft axes and rendered hover hardware with the component ledger", () => {
  const a = aircraft(),
    visual = buildAircraft(a),
    cg = new T.Vector3(...massProperties(a).cg);
  visual.group.updateMatrixWorld(true);
  expect(visual.tiltServoHorns).toHaveLength(3);
  a.motors.forEach((motor, index) => {
    const part = a.parts.find((p) => p.id === motor.partId)!;
    const housing = visual.group
      .getObjectByName(`tilt-pivot:${motor.id}`)!
      .getObjectByName("vtol-motor-can")!;
    expect(
      housing
        .getWorldPosition(new T.Vector3())
        .add(cg)
        .distanceTo(new T.Vector3(...part.positionM)),
    ).toBeLessThan(1e-9);
    const prop = a.parts.find((p) => p.id === motor.propPartId)!;
    expect(
      visual.propellers[index]
        .getWorldPosition(new T.Vector3())
        .add(cg)
        .distanceTo(new T.Vector3(...prop.positionM)),
    ).toBeLessThan(1e-9);
  });
  const pairs = [
    [a.vtol!.leftServoPartId, a.vtol!.frontLeftMotorId, 1],
    [a.vtol!.rightServoPartId, a.vtol!.frontRightMotorId, -1],
    [a.vtol!.rearServoPartId, a.vtol!.rearMotorId, 0],
  ] as const;
  for (const [id, motorId, direction] of pairs) {
    const shaft = visual.group.getObjectByName(`servo-shaft:${id}`)!;
    const pos = shaft.getWorldPosition(new T.Vector3()).add(cg);
    const motor = a.motors.find((m) => m.id === motorId)!;
    const axis = new T.Vector3(0, 1, 0).applyQuaternion(
      shaft.getWorldQuaternion(new T.Quaternion()),
    );
    expect(pos.z).toBeCloseTo(motor.positionM[2], 8);
    if (direction) {
      expect(pos.x).toBeCloseTo(motor.positionM[0], 8);
      expect(axis.y).toBeCloseTo(direction, 8);
    } else {
      expect(pos.y).toBeCloseTo(motor.positionM[1], 8);
      expect(axis.x).toBeCloseTo(-1, 8);
    }
  }
  disposeAircraft(visual.group);
});
it("supports both front mounts and the rear yaw base without hidden mass", () => {
  const a = aircraft(),
    part = (id: string) => a.parts.find((p) => p.id === id)!;
  const front = [part("front-support-left"), part("front-support-right")];
  expect(front.reduce((s, p) => s + p.massKg, 0)).toBeCloseTo(0.036, 8);
  for (const [i, platform] of front.entries()) {
    const bracket = part(i === 0 ? "tilt-bracket-left" : "tilt-bracket-right");
    expect(bracket.positionM[2] + bracket.sizeM[2] / 2).toBeCloseTo(
      platform.positionM[2] - platform.sizeM[2] / 2,
      8,
    );
    const boom = part(i === 0 ? "left-boom" : "right-boom");
    expect(platform.positionM[0] - platform.sizeM[0] / 2).toBeLessThan(
      boom.positionM[0] + boom.sizeM[0] / 2,
    );
  }
  const rear = part("rear-yaw-bracket"),
    beam = part("rear-motor-support");
  expect(rear.positionM[2] + rear.sizeM[2] / 2).toBeCloseTo(
    beam.positionM[2] - beam.sizeM[2] / 2,
    8,
  );
});
it("preserves the legacy front-forward mass convention when old definitions omit the field", () => {
  const old = structuredClone(raw) as typeof raw & {
    vtol: { massConfiguration?: string };
  };
  Reflect.deleteProperty(old.vtol, "massConfiguration");
  expect(parseAircraft(old).vtol!.massConfiguration).toBe("front-forward");
});
