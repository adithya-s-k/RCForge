import { expect, it } from "vitest";
import { splitPanel, panelGeometry, buildPanel } from "../src/view/planform";
import { parseAircraft } from "../src/core/schema";
import { modifyAircraft, defaultChanges } from "../src/core/aircraft";
import * as T from "three";
import raptor from "../aircraft/ft-22-raptor.json";

it("splits a swept control hinge without changing the panel area", () => {
  const outline: [number, number][] = [
    [1, -1],
    [1, 1],
    [-1, 1],
    [-1, -1],
  ];
  const hinge: [[number, number], [number, number]] = [
    [-0.3, -1],
    [0.3, 1],
  ];
  const area = (p: [number, number][]) =>
    Math.abs(
      p.reduce((sum, v, i) => {
        const q = p[(i + 1) % p.length];
        return sum + v[0] * q[1] - q[0] * v[1];
      }, 0) / 2,
    );
  expect(area(splitPanel(outline, hinge, true))).toBeCloseTo(2, 10);
  expect(area(splitPanel(outline, hinge, false))).toBeCloseTo(2, 10);
  expect(
    panelGeometry(
      [
        [0, 0],
        [0, 1],
        [0, 2],
      ],
      0.005,
    ),
  ).toBeNull();
});

it("keeps a full-moving elevon on its hinge and scales authored panels with span edits", () => {
  const a = parseAircraft(raptor),
    material = new T.MeshBasicMaterial();
  const elevon = a.surfaces.find((s) => s.control)!;
  const visual = buildPanel(elevon, material);
  expect(visual.pivot).toBeDefined();
  expect(visual.hingeAxis!.y).toBeCloseTo(1, 10);
  const wing = a.surfaces[0];
  const modified = modifyAircraft(a, { ...defaultChanges, spanScale: 1.2 });
  const bounds = (s: typeof wing) =>
    new T.Box3()
      .setFromObject(buildPanel(s, material).group)
      .getSize(new T.Vector3());
  expect(bounds(modified.surfaces[0]).y / bounds(wing).y).toBeCloseTo(1.2, 6);
  expect(bounds(modified.surfaces[0]).x / bounds(wing).x).toBeCloseTo(1, 6);
});

it("rejects degenerate outlines and ambiguous hinge directions", () => {
  const a = parseAircraft(raptor);
  a.surfaces[0].panel!.outline = [
    [0, 0],
    [1, 1],
    [2, 2],
  ];
  expect(() => parseAircraft(a)).toThrow(/enclose an area/);
  const b = parseAircraft(raptor),
    s = b.surfaces.find((s) => s.control)!;
  s.panel!.controlHinge = [
    [0, 0],
    [1, 0],
  ];
  expect(() => parseAircraft(b)).toThrow(/lower to higher span/);
});
