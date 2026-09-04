import { expect, it } from "vitest";
import * as T from "three";
import { sceneries } from "../src/core/scenery";
import { followAircraftShadow } from "../src/view/aircraft-shadow";
import { renderBudget } from "../src/view/render-budget";

function setup() {
  const scene = new T.Scene();
  const light = new T.DirectionalLight();
  light.shadow.mapSize.set(renderBudget.shadowSize, renderBudget.shadowSize);
  scene.add(light, light.target);
  const update = () => {
    scene.updateMatrixWorld(true);
    light.shadow.updateMatrices(light);
  };
  return { light, update };
}

it.each(Object.values(sceneries))(
  "keeps caster and ground shadow inside the frustum across $name",
  (scenery) => {
    const { light, update } = setup();
    const direction = new T.Vector3(...scenery.sun).normalize();
    // Ground clearance, the old runway boundary, long circuits and high starts.
    for (const position of [
      new T.Vector3(0, 0.2, 0),
      new T.Vector3(120, 3, 0),
      new T.Vector3(-600, 18, 800),
      new T.Vector3(1800, 120, -1500),
      new T.Vector3(2000, 1000, -2000),
    ]) {
      followAircraftShadow(light, position, scenery.sun, 2);
      update();
      for (const x of [-1, 1])
        for (const y of [-0.15, 0.15])
          for (const z of [-1, 1]) {
            const caster = position.clone().add(new T.Vector3(x, y, z));
            const ground = caster
              .clone()
              .addScaledVector(direction, -caster.y / direction.y);
            for (const point of [caster, ground]) {
              const clip = point.clone().project(light.shadow.camera);
              expect(Math.abs(clip.x)).toBeLessThan(0.99);
              expect(Math.abs(clip.y)).toBeLessThan(0.99);
              const depth = -point
                .clone()
                .applyMatrix4(light.shadow.camera.matrixWorldInverse).z;
              expect(depth).toBeGreaterThan(light.shadow.camera.near + 0.5);
              expect(depth).toBeLessThan(light.shadow.camera.far - 0.5);
            }
            // Both ends of a sun ray must sample the same shadow-map location.
            const a = caster.project(light.shadow.camera);
            const b = ground.project(light.shadow.camera);
            expect(a.x).toBeCloseTo(b.x, 9);
            expect(a.y).toBeCloseTo(b.y, 9);
          }
      expect(
        light.position
          .clone()
          .sub(light.target.position)
          .normalize()
          .distanceTo(direction),
      ).toBeLessThan(1e-10);
      expect(light.shadow.camera.right - light.shadow.camera.left).toBe(32);
      expect(light.shadow.mapSize.x).toBe(renderBudget.shadowSize);
    }
  },
);

it("does not slide the sampling grid on stationary ground for sub-texel movement", () => {
  const { light, update } = setup();
  const direction = new T.Vector3(...sceneries.club.sun).normalize();
  const right = new T.Vector3().crossVectors(light.up, direction).normalize();
  const position = new T.Vector3();
  followAircraftShadow(light, position, sceneries.club.sun, 1);
  update();
  const landmark = new T.Vector3(3, 0, -2);
  const before = landmark.clone().project(light.shadow.camera);
  const texel =
    (light.shadow.camera.right - light.shadow.camera.left) /
    renderBudget.shadowSize;
  position.addScaledVector(right, texel * 0.2);
  followAircraftShadow(light, position, sceneries.club.sun, 1);
  update();
  const after = landmark.clone().project(light.shadow.camera);
  expect(after.x).toBeCloseTo(before.x, 12);
  expect(after.y).toBeCloseTo(before.y, 12);
});

it("refits for the studio floor after a high-altitude flight", () => {
  const { light, update } = setup();
  followAircraftShadow(
    light,
    new T.Vector3(1000, 500, -1000),
    sceneries.mesa.sun,
    1,
  );
  const flightFar = light.shadow.camera.far;
  followAircraftShadow(light, new T.Vector3(), sceneries.mesa.sun, 1, -0.27);
  update();
  const direction = new T.Vector3(...sceneries.mesa.sun).normalize();
  const ground = direction.multiplyScalar(-0.27 / direction.y);
  for (const point of [new T.Vector3(), ground]) {
    const clip = point.project(light.shadow.camera);
    expect(Math.abs(clip.x)).toBeLessThan(1);
    expect(Math.abs(clip.y)).toBeLessThan(1);
    expect(Math.abs(clip.z)).toBeLessThan(1);
  }
  expect(light.shadow.camera.far).toBeLessThan(flightFar);
  expect(
    light.shadow.bias * (light.shadow.camera.far - light.shadow.camera.near),
  ).toBeCloseTo(-0.002);
});

it("uses the same map with a tighter studio footprint for foamboard detail", () => {
  const { light, update } = setup();
  followAircraftShadow(
    light,
    new T.Vector3(),
    sceneries.club.sun,
    0.5,
    -0.27,
    1,
  );
  update();
  expect(light.shadow.camera.right - light.shadow.camera.left).toBe(2);
  expect(light.shadow.mapSize.x).toBe(renderBudget.shadowSize);
  for (const p of [
    new T.Vector3(0.4, 0, 0.32),
    new T.Vector3(-0.4, -0.27, -0.32),
  ]) {
    const clip = p.project(light.shadow.camera);
    expect(Math.abs(clip.x)).toBeLessThan(1);
    expect(Math.abs(clip.y)).toBeLessThan(1);
    expect(Math.abs(clip.z)).toBeLessThan(1);
  }
});
