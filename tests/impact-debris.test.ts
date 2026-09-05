import * as T from "three";
import { afterEach, expect, it, vi } from "vitest";
import raw from "../aircraft/ft-bronco.json";
import quad from "../aircraft/quad-x-5inch.json";
import vtol from "../aircraft/bronco-tri-vtol.json";
import tiny from "../aircraft/ft-tiny-trainer.json";
import { parseAircraft } from "../src/core/schema";
import { buildAircraft, disposeAircraft } from "../src/view/model";
import { ImpactDebris } from "../src/view/impact-debris";
import { focusedPilotFov } from "../src/view/pilot-focus";
afterEach(() => vi.unstubAllGlobals());

it.each([raw, quad, vtol, tiny])(
  "$name: breakup preserves visible triangles and leaves the original model intact",
  (data) => {
    vi.stubGlobal("document", {
      createElement: () => ({
        getContext: () => ({ fillRect() {}, fillStyle: "" }),
      }),
    });
    const a = parseAircraft(data),
      visual = buildAircraft(a),
      debris = new ImpactDebris();
    visual.cg.visible = false;
    visual.group.position.set(14, 0.6, -6);
    visual.group.quaternion.setFromAxisAngle(
      new T.Vector3(1, 0, 0),
      Math.PI / 2,
    );
    let originalTriangles = 0;
    visual.group.traverseVisible((o) => {
      if (o instanceof T.Mesh)
        originalTriangles +=
          (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3;
    });
    const original = visual.group.children.slice(),
      definition = JSON.stringify(a);
    debris.start(visual.group, a, new T.Vector3(12, -7, 2));
    expect(debris.group.children.length).toBeGreaterThanOrEqual(4);
    expect(debris.group.children.length).toBeLessThanOrEqual(16);
    let triangles = 0,
      draws = 0;
    debris.group.traverse((o) => {
      if (o instanceof T.Mesh) {
        triangles += o.geometry.attributes.position.count / 3;
        draws += o.geometry.groups.length;
      }
    });
    expect(triangles).toBe(originalTriangles);
    expect(draws).toBeLessThan(160);
    for (let i = 0; i < 630; i++) debris.update(1 / 30);
    expect(debris.moving).toBe(false);
    const bounds = new T.Box3().setFromObject(debris.group);
    let minY = Infinity;
    debris.group.updateMatrixWorld(true);
    debris.group.traverse((o) => {
      if (o instanceof T.Mesh) {
        const p = o.geometry.getAttribute("position");
        for (let i = 0; i < p.count; i++)
          minY = Math.min(
            minY,
            new T.Vector3()
              .fromBufferAttribute(p, i)
              .applyMatrix4(o.matrixWorld).y,
          );
      }
    });
    expect(minY).toBeGreaterThan(-0.035);
    expect(bounds.max.x - bounds.min.x).toBeGreaterThan(a.reference.spanM);
    expect(visual.group.children).toEqual(original);
    expect(JSON.stringify(a)).toBe(definition);
    const geometry = (debris.group.children[0] as T.Mesh).geometry,
      disposed = vi.spyOn(geometry, "dispose");
    debris.clear();
    expect(disposed).toHaveBeenCalledOnce();
    expect(debris.active).toBe(false);
    disposeAircraft(visual.group);
  },
);
it("focus changes focal length smoothly and preserves manual or untracked views", () => {
  expect(focusedPilotFov(55, 1, 10, true)).toBe(55);
  expect(focusedPilotFov(55, 1, 1000, false)).toBe(55);
  const far = focusedPilotFov(55, 1, 1000, true);
  expect(far).toBeGreaterThan(30);
  expect(far).toBeLessThan(55);
  expect(
    Math.tan((55 * Math.PI) / 360) / Math.tan((far * Math.PI) / 360),
  ).toBeCloseTo(1.8, 10);
  expect(focusedPilotFov(55, 0.25, 45, true)).toBeCloseTo(
    focusedPilotFov(55, 1, 180, true),
  );
  expect(Math.abs(focusedPilotFov(55, 1, 35.001, true) - 55)).toBeLessThan(
    0.001,
  );
});
