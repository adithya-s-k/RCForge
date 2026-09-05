import { describe, expect, it } from "vitest";
import * as T from "three";
import {
  ObstacleCollisions,
  obstacleHit,
  ObstaclesSchema,
  type Obstacle,
} from "../src/core/obstacles";
import { collectFieldObstacles } from "../src/view/field-collisions";
import {
  Simulation,
  initialState,
  calmEnvironment,
  neutralControls,
} from "../src/core/simulation";
import { createRecording, parseRecording } from "../src/core/experiment";
import { parseAircraft } from "../src/core/schema";
import { massProperties } from "../src/core/aircraft";
import bronco from "../aircraft/ft-bronco.json";
import quad from "../aircraft/quad-x-5inch.json";
const box: Obstacle = {
  id: "test wall",
  shape: "box",
  center: [2, 0, -3],
  halfSize: [0.02, 2, 3],
};

describe("scenery collision", () => {
  it("sweeps through thin obstacles, including initial overlap and tangent misses", () => {
    expect(obstacleHit([0, 0, -3], [4, 0, -3], 0.1, box)).toBeCloseTo(0.47);
    expect(obstacleHit([2, 0, -3], [2, 0, -3], 0.1, box)).toBe(0);
    expect(obstacleHit([0, 3, -3], [4, 3, -3], 0.1, box)).toBeNull();
    const tree: Obstacle = {
      id: "crown",
      shape: "ellipsoid",
      center: [0, 0, -10],
      halfSize: [2, 2, 4],
    };
    expect(obstacleHit([-5, 0, -10], [5, 0, -10], 0, tree)).toBeCloseTo(0.3);
    expect(obstacleHit([-5, 1.9, -6.1], [5, 1.9, -6.1], 0, tree)).toBeNull();
    expect(obstacleHit([-5, 0, -16], [5, 0, -16], 0, tree)).toBeNull();
  });
  it.each([bronco, quad])(
    "$name crashes against field props and stops propulsion",
    (raw) => {
      const a = parseAircraft(raw),
        initial = initialState(a, 30, 3, 0);
      const env = { ...calmEnvironment(), obstacles: [box] };
      const sim = new Simulation(a, env, initial);
      for (let i = 0; i < 30 && sim.state.status !== "crashed"; i++)
        sim.step({ ...neutralControls(), throttle: 0.7 });
      expect(sim.state.status).toBe("crashed");
      expect(sim.state.position[0]).toBeLessThan(2);
      expect(sim.state.velocity).toEqual([0, 0, 0]);
      expect(sim.state.motors.every((v) => v === 0)).toBe(true);
      const terminal = structuredClone(sim.state);
      sim.step(neutralControls());
      expect(sim.state).toEqual(terminal);
      const clear = new Simulation(a, calmEnvironment(), initial);
      clear.step(neutralControls());
      expect(clear.state.status).toBe("flying");
    },
  );
  it("catches a wingtip strike with the fuselage clear", () => {
    const a = parseAircraft(bronco),
      before = initialState(a, 20, 3, 0),
      after = structuredClone(before);
    after.position[0] = 2;
    const post: Obstacle = {
      id: "wingtip post",
      shape: "box",
      center: [1, a.reference.spanM * 0.44, -3],
      halfSize: [0.03, 0.03, 1],
    };
    expect(obstacleHit(before.position, after.position, 0.05, post)).toBeNull();
    expect(
      new ObstacleCollisions(a, massProperties(a).cg).resolve(before, after, [
        post,
      ]),
    ).toBe(true);
  });
  it("exports world geometry in NED, including instanced and raised scenery", () => {
    const field = new T.Group(),
      mesh = new T.InstancedMesh(
        new T.BoxGeometry(2, 4, 6),
        new T.MeshBasicMaterial(),
        1,
      );
    mesh.userData.collision = "solid";
    mesh.setMatrixAt(0, new T.Matrix4().makeTranslation(12, 8, -7));
    field.add(mesh);
    const [o] = collectFieldObstacles(field);
    expect(o.center).toEqual([12, -7, -8]);
    expect(o.halfSize).toEqual([1, 3, 2]);
    mesh.geometry.dispose();
    (mesh.material as T.Material).dispose();
    mesh.dispose();
  });
  it("records collision geometry and reproduces impact headlessly", () => {
    const a = parseAircraft(bronco),
      sim = new Simulation(
        a,
        { ...calmEnvironment(), obstacles: [box] },
        initialState(a, 30, 3, 0),
      );
    const recording = createRecording(sim);
    for (let i = 0; i < 30 && sim.state.status !== "crashed"; i++) {
      const c = neutralControls();
      recording.frames.push(c);
      sim.step(c);
    }
    const loaded = parseRecording(JSON.parse(JSON.stringify(recording)));
    const replay = new Simulation(
      loaded.aircraft,
      loaded.environment,
      loaded.initialState,
    );
    loaded.frames.forEach((c) => replay.step(c));
    expect(replay.state).toEqual(sim.state);
    expect(() =>
      parseRecording({ ...recording, simulationVersion: "0.8.0" }),
    ).toThrow();
    expect(() =>
      ObstaclesSchema.parse([{ ...box, halfSize: [0, 2, 3] }]),
    ).toThrow();
    expect(() => ObstaclesSchema.parse(Array(2049).fill(box))).toThrow();
  });
});
