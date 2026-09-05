import { expect, it } from "vitest";
import * as T from "three";
import raptor from "../aircraft/ft-22-raptor.json";
import { parseAircraft } from "../src/core/schema";
import { buildAircraft, disposeAircraft } from "../src/view/model";
import { launchState, launchTrim } from "../src/core/launch";
import { Simulation, GRAVITY } from "../src/core/simulation";
import { rotate } from "../src/core/math";
import { massProperties } from "../src/core/aircraft";
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
  // Original sheet-1 inch ruler spans X=231.474 to 303.474 points.
  const k = 0.0254 / (303.474 - 231.474);
  expect(a.reference.spanM).toBeCloseTo((1877.3987 - 36.906) * k, 8);
  expect(Math.max(...wing.map((p) => p[1]))).toBeCloseTo(
    (1877.4 - 957.152) * k,
    7,
  );
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
it("clears the ruler-scaled FT-22 plate through a full propeller turn", () => {
  const visual = buildAircraft(a);
  const prop = visual.propellers[0];
  const position = prop.position
    .clone()
    .add(new T.Vector3(...massProperties(a).cg));
  const blade = prop.getObjectByName("propeller-blade") as T.Mesh;
  const vertices = blade.geometry.getAttribute("position");
  const plates = [outline("left-wing"), outline("right-wing")];
  const inside = (x: number, y: number, points: number[][]) => {
    let hit = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const p = points[i],
        q = points[j];
      if (
        p[1] > y !== q[1] > y &&
        x < ((q[0] - p[0]) * (y - p[1])) / (q[1] - p[1]) + p[0]
      )
        hit = !hit;
    }
    return hit;
  };
  let planeSamples = 0,
    collisions = 0,
    undersizedCollisions = 0;
  const undersized = plates.map((p) =>
    p.map(([x, y]) => [x, (y * 0.635) / a.reference.spanM]),
  );
  for (let angle = 0; angle < 360; angle++) {
    const c = Math.cos((angle * Math.PI) / 180),
      s = Math.sin((angle * Math.PI) / 180);
    for (let i = 0; i < vertices.count; i++) {
      const x = position.x + vertices.getX(i);
      const y = position.y + vertices.getY(i) * c - vertices.getZ(i) * s;
      const z = position.z + vertices.getY(i) * s + vertices.getZ(i) * c;
      if (Math.abs(z) > 0.0025) continue;
      planeSamples++;
      if (plates.some((p) => inside(x, y, p))) collisions++;
      if (undersized.some((p) => inside(x, y, p))) undersizedCollisions++;
    }
  }
  expect(planeSamples).toBeGreaterThan(100);
  expect(collisions).toBe(0);
  // The old 635 mm scaling puts the same 9-inch prop into the plate edges.
  expect(undersizedCollisions).toBeGreaterThan(0);
  disposeAircraft(visual.group);
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
