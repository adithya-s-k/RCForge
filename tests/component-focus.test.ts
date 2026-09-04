import { expect, it } from "vitest";
import * as T from "three";
import { ComponentFocus } from "../src/view/component-focus";
import bronco from "../aircraft/ft-bronco.json";
import { parseAircraft } from "../src/core/schema";
import { massProperties } from "../src/core/aircraft";
import { buildAircraft, disposeAircraft } from "../src/view/model";
it("uses the same body axes and installation position as the mass component", () => {
  const p = parseAircraft(bronco).parts.find((p) => p.id === "battery")!;
  p.positionM = [0.2, -0.1, 0.05];
  p.orientationDeg = [0, 0, 90];
  const focus = new ComponentFocus();
  focus.set(p);
  focus.group.updateMatrixWorld();
  expect(focus.group.position.toArray()).toEqual([0.2, -0.05, -0.1]);
  const size = new T.Box3().setFromObject(focus.group).getSize(new T.Vector3());
  expect(size.x).toBeCloseTo(p.sizeM[1], 8);
  expect(size.y).toBeCloseTo(p.sizeM[2], 8);
  expect(size.z).toBeCloseTo(p.sizeM[0], 8);
  const geometry = (focus.group.children[0] as T.LineSegments).geometry;
  focus.set({ ...p, positionM: [1, 0, 0] });
  expect((focus.group.children[0] as T.LineSegments).geometry).toBe(geometry);
  focus.set();
  expect(focus.group.visible).toBe(false);
  focus.dispose();
});

it("keeps the highlight centered on the rendered component after moving the CG", () => {
  const a = parseAircraft(bronco);
  const battery = a.parts.find((p) => p.id === "battery")!;
  battery.massKg *= 1.5;
  battery.positionM = [0.19, 0.03, 0.065];
  const cg = massProperties(a).cg;
  const visual = buildAircraft(a);
  visual.group.quaternion.setFromAxisAngle(new T.Vector3(1, 0, 0), Math.PI / 2);
  visual.group.updateMatrixWorld(true);
  const focus = new ComponentFocus();
  focus.set(battery, cg);
  focus.group.updateMatrixWorld(true);
  const expected = visual.group
    .getObjectByName("battery")!
    .getWorldPosition(new T.Vector3());
  expect(
    focus.group.getWorldPosition(new T.Vector3()).distanceTo(expected),
  ).toBeLessThan(1e-12);
  const bounds = new T.Box3().setFromObject(focus.group);
  expect(bounds.getCenter(new T.Vector3()).distanceTo(expected)).toBeLessThan(
    1e-12,
  );
  focus.dispose();
  disposeAircraft(visual.group);
});
