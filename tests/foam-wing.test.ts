import { expect, it } from "vitest";
import * as T from "three";
import bronco from "../aircraft/ft-bronco.json";
import tiny from "../aircraft/ft-tiny-trainer.json";
import { parseAircraft } from "../src/core/schema";
import { buildFoamWing } from "../src/view/foam-wing";
import { buildAircraft, disposeAircraft } from "../src/view/model";
import {
  initialState,
  neutralControls,
  Simulation,
} from "../src/core/simulation";
import { launchTrim } from "../src/core/launch";
import { massProperties } from "../src/core/aircraft";

it("balances the Tiny Trainer at the repeated 1.75-inch CG station in its original plan", () => {
  const a = parseAircraft(tiny),
    properties = massProperties(a);
  const drawingOffsetM = ((649.187 - 523.187) / 72) * 0.0254;
  expect(a.reference.cgFromLeadingEdgeM).toBeCloseTo(drawingOffsetM, 8);
  expect(a.reference.leadingEdgeXM - properties.cg[0]).toBeCloseTo(
    drawingOffsetM,
    8,
  );
  expect(properties.mass).toBeCloseTo(0.253, 9);
  expect(a.parts.find((p) => p.id === "battery")!.positionM[0]).toBeLessThan(
    0.14,
  );
});

it("keeps Tiny Trainer ailerons inside the rounded sport-wing tip, at the plan span stations", () => {
  const a = parseAircraft(tiny);
  for (const s of a.surfaces.filter((s) => s.foamWing)) {
    const w = s.foamWing!;
    const start = w.controlSpan[0] * s.spanM,
      end = w.controlSpan[1] * s.spanM;
    expect(start).toBeCloseTo(0.0307, 3);
    expect(end).toBeCloseTo(0.373, 3);
    expect(end).toBeLessThan(s.spanM - 0.1);
    const visual = buildFoamWing(s, new T.MeshStandardMaterial());
    const moving = new T.Box3().setFromObject(visual.pivot!);
    expect(moving.getSize(new T.Vector3()).y).toBeCloseTo(end - start, 6);
    expect(moving.getSize(new T.Vector3()).x).toBeCloseTo(
      w.rootChordM * (1 - w.hingeFraction) - 0.0006,
      6,
    );
    disposeAircraft(visual.group);
  }
});

it("rejects crossed, incomplete and out-of-outline foam wing controls", () => {
  for (const mutate of [
    (
      w: NonNullable<
        ReturnType<typeof parseAircraft>["surfaces"][number]["foamWing"]
      >,
    ) => {
      w.tipStations[0][0] = 0.1;
    },
    (
      w: NonNullable<
        ReturnType<typeof parseAircraft>["surfaces"][number]["foamWing"]
      >,
    ) => {
      w.tipStations[1][0] = 0;
    },
    (
      w: NonNullable<
        ReturnType<typeof parseAircraft>["surfaces"][number]["foamWing"]
      >,
    ) => {
      w.tipStations[1][1] = 1;
    },
    (
      w: NonNullable<
        ReturnType<typeof parseAircraft>["surfaces"][number]["foamWing"]
      >,
    ) => {
      w.controlSpan = [0, 1];
    },
  ]) {
    const a = parseAircraft(tiny);
    mutate(a.surfaces[0].foamWing!);
    expect(() => parseAircraft(a)).toThrow();
  }
});

it.each([bronco, tiny])(
  "keeps $id assembled geometry finite, outward-facing and within a modest render budget",
  (raw) => {
    const a = parseAircraft(raw),
      model = buildAircraft(a);
    let draws = 0,
      triangles = 0;
    model.group.traverse((o) => {
      if (!(o instanceof T.Mesh)) return;
      const g: T.BufferGeometry = o.geometry;
      draws += Array.isArray(o.material) ? g.groups.length : 1;
      triangles += (g.index?.count ?? g.getAttribute("position").count) / 3;
      expect(
        Array.from(g.getAttribute("position").array).every(Number.isFinite),
      ).toBe(true);
    });
    expect(draws).toBeLessThan(100);
    expect(triangles).toBeLessThan(15000);
    for (const s of a.surfaces.filter((s) => s.foamWing)) {
      const visual = buildFoamWing(s, new T.MeshStandardMaterial());
      const g = (visual.group.children[0] as T.Mesh).geometry;
      const p = g.getAttribute("position");
      // Positive signed volume detects inside-out mirrored wing triangles.
      let volume = 0;
      for (let i = 0; i < p.count; i += 3) {
        const v = [0, 1, 2].map((j) =>
          new T.Vector3().fromBufferAttribute(p, i + j),
        );
        volume += v[0].dot(v[1].cross(v[2])) / 6;
      }
      expect(volume).toBeGreaterThan(0);
      disposeAircraft(visual.group);
    }
    disposeAircraft(model.group);
  },
);

it.each([bronco, tiny])(
  "retains positive pilot control authority and a balanced hand release for $id",
  (raw) => {
    const a = parseAircraft(raw),
      sim = new Simulation(a),
      state = initialState(a, 12, 20, 0);
    const base = sim.forces(state, neutralControls());
    for (const [axis, i] of [
      ["roll", 0],
      ["pitch", 1],
      ["yaw", 2],
    ] as const)
      expect(
        sim.forces(state, { ...neutralControls(), [axis]: 0.2 }).torque[i] -
          base.torque[i],
      ).toBeGreaterThan(0);
    expect(launchTrim(a, "hand").converged).toBe(true);
  },
);
