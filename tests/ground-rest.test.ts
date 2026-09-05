import { expect, it } from "vitest";
import large from "../aircraft/quad-x-450.json";
import small from "../aircraft/quad-x-5inch.json";
import detailed from "../aircraft/quad-x-6s.json";
import { parseAircraft } from "../src/core/schema";
import { launchState } from "../src/core/launch";
import {
  Simulation,
  calmEnvironment,
  neutralControls,
} from "../src/core/simulation";
import { axisQ, degrees, euler, radians } from "../src/core/math";

it.each([large, small, detailed])(
  "$id rests without artificial yaw or horizontal drift with motors stopped",
  (definition) => {
    for (const heading of [0, 90]) {
      const a = parseAircraft(definition);
      if (heading) a.contactPoints.reverse();
      const state = launchState(a, "ground");
      state.orientation = axisQ([0, 0, 1], radians(heading));
      const sim = new Simulation(a, calmEnvironment(), state);
      for (let i = 0; i < 20 * 120; i++) sim.step(neutralControls());
      expect(sim.state.status).toBe("grounded");
      expect(sim.state.motors).toEqual([0, 0, 0, 0]);
      expect(
        Math.hypot(sim.state.position[0], sim.state.position[1]),
      ).toBeLessThan(0.001);
      const angles = euler(sim.state.orientation).map(degrees);
      expect(Math.abs(angles[2] - heading)).toBeLessThan(0.05);
      expect(Math.hypot(angles[0], angles[1])).toBeLessThan(0.05);
    }
  },
);
