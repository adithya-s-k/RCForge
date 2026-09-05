import { afterEach, expect, it, vi } from "vitest";
import * as T from "three";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import { createField } from "../src/view/field";
import { sceneries } from "../src/core/scenery";
import { ObstaclesSchema } from "../src/core/obstacles";
import {
  Simulation,
  calmEnvironment,
  neutralControls,
} from "../src/core/simulation";
import { parseAircraft } from "../src/core/schema";
import { launchState, fitLandingGear } from "../src/core/launch";
import bronco from "../aircraft/ft-bronco.json";
import tiny from "../aircraft/ft-tiny-trainer.json";
import quad from "../aircraft/quad-x-5inch.json";
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it.each(Object.entries(sceneries))(
  "%s exports bounded collision snapshots aligned to render instances and leaves runway starts clear",
  (_, profile) => {
    vi.spyOn(T.TextureLoader.prototype, "load").mockImplementation(
      () => new T.Texture(),
    );
    vi.spyOn(HDRLoader.prototype, "loadAsync").mockRejectedValue(
      new Error("Offline fallback"),
    );
    const context = new Proxy({}, { get: () => () => {}, set: () => true });
    vi.stubGlobal("document", {
      createElement: () => ({ getContext: () => context }),
    });
    const field = createField(new T.Scene(), profile);
    const obstacles = ObstaclesSchema.parse(field.obstacles);
    expect(obstacles.filter((o) => o.id.endsWith(":crown"))).toHaveLength(
      profile.treeCount,
    );
    expect(obstacles.some((o) => o.id.startsWith("rock:"))).toBe(true);
    const canopy = field.field.children.find((o) =>
      o.name.startsWith("foliage:"),
    ) as T.InstancedMesh;
    const transform = new T.Matrix4();
    canopy.getMatrixAt(0, transform);
    const world = new T.Vector3().setFromMatrixPosition(transform);
    const trunk = obstacles.find(
      (o) => o.id.startsWith(canopy.name) && o.id.endsWith(":trunk"),
    )!;
    expect(trunk.center[0]).toBeCloseTo(world.x);
    expect(trunk.center[1]).toBeCloseTo(world.z);
    const shelter = obstacles.find(
      (o) =>
        Math.abs(o.center[0] + 35) < 0.01 &&
        Math.abs(o.halfSize[0] - 5.5) < 0.01,
    )!;
    expect(shelter.center[0]).toBeCloseTo(-35);
    expect(shelter.center[1]).toBeCloseTo(-29);
    expect(shelter.center[2]).toBeCloseTo(-1.8);
    for (const raw of [bronco, tiny, quad]) {
      const a = fitLandingGear(parseAircraft(raw)),
        env = { ...calmEnvironment(), surface: profile.surface, obstacles };
      const sim = new Simulation(a, env, launchState(a, "ground", env));
      for (let i = 0; i < 120; i++) sim.step(neutralControls());
      expect(sim.state.status).not.toBe("crashed");
    }
    field.dispose();
  },
);
