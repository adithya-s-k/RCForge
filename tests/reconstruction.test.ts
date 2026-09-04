import { expect, it } from "vitest";
import * as T from "three";
import raptor from "../aircraft/ft-22-raptor.json";
import { parseAircraft } from "../src/core/schema";
import { buildAircraft, disposeAircraft } from "../src/view/model";
import { launchState, launchTrim } from "../src/core/launch";
import { Simulation, GRAVITY } from "../src/core/simulation";
import { rotate } from "../src/core/math";
const a = parseAircraft(raptor);
const outline = (id: string) => {
  const s = a.surfaces.find((s) => s.id === id)!;
  return s.panel!.outline.map(([x, y]) => [
    s.positionM[0] + x * s.chordM,
    s.positionM[1] + y * s.spanM,
  ]);
};
it("reconstructs the FT-22 plate, prop slot and matching separate tail from plan stations", () => {
  const wing = outline("right-wing"),
    tail = outline("right-elevon");
  const k = 0.635 / (1877.3987 - 36.906);
  expect(Math.max(...wing.map((p) => p[1]))).toBeCloseTo(0.3175, 5);
  const trailingEdge = Math.min(...wing.map((p) => p[0]));
  expect(trailingEdge).toBeCloseTo((1296.53 - 2179.925) * k, 5);
  expect(trailingEdge - Math.max(...tail.map((p) => p[0]))).toBeCloseTo(
    0.0008,
    5,
  );
  expect(Math.max(...tail.map((p) => p[1]))).toBeCloseTo(
    (923.75 - 355.37) * k,
    5,
  );
  // The prop occupies the cutout; it is behind the cockpit and ahead of the fins.
  expect(a.motors[0].positionM[0]).toBeLessThan(0);
  expect(a.motors[0].positionM[0]).toBeGreaterThan(
    a.surfaces.find((s) => s.id === "right-fin")!.positionM[0],
  );
  for (const s of a.surfaces.filter((s) => s.kind === "vertical-tail")) {
    const tip = s
      .panel!.outline.map((p) => p[1] * s.spanM)
      .sort((x, y) => Math.abs(y) - Math.abs(x))[0];
    const roll = (s.rollDeg * Math.PI) / 180;
    // Tallest part is above the wing and leans away from centerline.
    expect(s.positionM[2] + tip * Math.sin(roll)).toBeLessThan(-0.1);
    expect(Math.abs(s.positionM[1] + tip * Math.cos(roll))).toBeGreaterThan(
      0.09,
    );
  }
});
it("keeps corrected folded geometry inexpensive with finite bounds and complete materials", () => {
  const model = buildAircraft(a);
  let triangles = 0,
    draws = 0;
  const box = new T.Box3().setFromObject(model.group);
  expect(box.getSize(new T.Vector3()).length()).toBeLessThan(1.2);
  model.group.traverse((o) => {
    if (!(o instanceof T.Mesh)) return;
    const g: T.BufferGeometry = o.geometry;
    triangles += (g.index?.count ?? g.getAttribute("position").count) / 3;
    draws += Array.isArray(o.material) ? g.groups.length : 1;
    expect(
      Array.from(g.getAttribute("position").array).every(Number.isFinite),
    ).toBe(true);
    if (Array.isArray(o.material))
      expect(
        g.groups.every((group) => group.materialIndex! < o.material.length),
      ).toBe(true);
  });
  expect(draws).toBeLessThan(100);
  expect(triangles).toBeLessThan(12000);
  disposeAircraft(model.group);
});
it("releases into an eight-degree climb with balanced forces, not a universal throttle", () => {
  const trim = launchTrim(a, "hand"),
    state = launchState(a, "hand");
  expect(trim.converged).toBe(true);
  expect(
    (Math.atan2(-state.velocity[2], state.velocity[0]) * 180) / Math.PI,
  ).toBeCloseTo(8, 9);
  const sim = new Simulation(a, undefined, state),
    loads = sim.forces(state, trim.controls);
  const force = rotate(state.orientation, loads.force);
  expect(
    Math.hypot(force[0], force[1], force[2] + sim.properties.mass * GRAVITY),
  ).toBeLessThan(0.01);
  expect(Math.hypot(...loads.torque)).toBeLessThan(0.01);
});
