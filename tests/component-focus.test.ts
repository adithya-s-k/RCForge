import { expect, it, vi } from "vitest";
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
  battery.orientationDeg = [23, -37, 71];
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
  const rendered = new T.Box3().setFromObject(
    visual.group.getObjectByName("battery")!,
  );
  expect(bounds.min.distanceTo(rendered.min)).toBeLessThan(1e-8);
  expect(bounds.max.distanceTo(rendered.max)).toBeLessThan(1e-8);
  focus.dispose();
  disposeAircraft(visual.group);
});

it("preserves the battery installation through quad construction batching", async () => {
  const data = (await import("../aircraft/quad-x-450.json")).default;
  const a = parseAircraft(data);
  const part = a.parts.find((p) => p.id === "battery")!;
  part.positionM = [0.026, -0.013, -0.06];
  part.orientationDeg = [19, 11, 73];
  part.color = "#e917c1";
  vi.stubGlobal("document", {
    createElement: () => ({
      getContext: () => ({ fillRect() {}, fillStyle: "" }),
    }),
  });
  try {
    const visual = buildAircraft(a);
    visual.group.updateMatrixWorld(true);
    const pack = visual.group.getObjectByName("battery")!;
    expect(pack).toBeDefined();
    const origin = pack.getWorldPosition(new T.Vector3());
    const cg = massProperties(a).cg;
    expect(
      origin.distanceTo(
        new T.Vector3(...part.positionM).sub(new T.Vector3(...cg)),
      ),
    ).toBeLessThan(1e-9);
    const reference = new T.Mesh(new T.BoxGeometry(...part.sizeM));
    reference.position.copy(origin);
    reference.rotation.set(
      ...(part.orientationDeg.map(T.MathUtils.degToRad) as [
        number,
        number,
        number,
      ]),
      "ZYX",
    );
    const expected = new T.Box3().setFromObject(reference);
    const bounds = new T.Box3().setFromObject(pack);
    // Rounded pack corners sit inside the same rotated mass envelope.
    expect(bounds.min.distanceTo(expected.min)).toBeLessThan(0.006);
    expect(bounds.max.distanceTo(expected.max)).toBeLessThan(0.006);
    const axis = new T.Vector3(1, 0, 0).applyQuaternion(
      pack.getWorldQuaternion(new T.Quaternion()),
    );
    expect(
      axis.distanceTo(
        new T.Vector3(1, 0, 0).applyQuaternion(reference.quaternion),
      ),
    ).toBeLessThan(1e-10);
    reference.geometry.dispose();
    (reference.material as T.Material).dispose();
    disposeAircraft(visual.group);
  } finally {
    vi.unstubAllGlobals();
  }
});
