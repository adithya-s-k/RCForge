import { expect, it } from "vitest";
import catalogData from "../components/catalog.json";
import raptor from "../aircraft/ft-22-raptor.json";
import quad from "../aircraft/quad-x-450.json";
import bronco from "../aircraft/ft-bronco.json";
import tiny from "../aircraft/ft-tiny-trainer.json";
import {
  ComponentCatalogSchema,
  batteryUsage,
  replaceComponent,
  moveComponent,
} from "../src/core/components";
import { parseAircraft } from "../src/core/schema";
import { massProperties } from "../src/core/aircraft";
import { surfaceActuation } from "../src/core/actuation";
import { componentDifferences } from "../src/core/component-reference";
import { powertrain } from "../src/core/powertrain";
import { findTrim } from "../src/core/trim";
import {
  Simulation,
  initialState,
  neutralControls,
} from "../src/core/simulation";
const catalog = ComponentCatalogSchema.parse(catalogData);
const get = (id: string) => catalog.entries.find((e) => e.id === id)!;

it("separates edited product specifications from installation and charge settings", () => {
  const entry = get("orange-3s-1500-40c");
  const a = replaceComponent(parseAircraft(raptor), "battery", entry);
  moveComponent(a, "battery", 0, 0.2);
  a.parts.find((p) => p.id === "battery")!.orientationDeg = [0, 0, 90];
  a.battery!.initialSoc = 0.5;
  a.battery!.avionicsCurrentA = 0.3;
  expect(componentDifferences(a, "battery", entry)).toEqual([]);
  a.battery!.capacityMah = 1800;
  a.parts.find((p) => p.id === "battery")!.massKg += 0.02;
  expect(
    componentDifferences(
      parseAircraft(JSON.parse(JSON.stringify(a))),
      "battery",
      entry,
    ),
  ).toEqual(["Mass", "Capacity"]);
  expect(
    componentDifferences(
      replaceComponent(a, "battery", entry),
      "battery",
      entry,
    ),
  ).toEqual([]);
});

it("tracks the complete motor and prop package while allowing installation changes", () => {
  const entry = get("emax-mt2213-1045-3s");
  const a = replaceComponent(parseAircraft(quad), "motor-1", entry);
  moveComponent(a, "motor-1", 1, 0.2);
  a.motors[0].spin = a.motors[0].spin === "cw" ? "ccw" : "cw";
  a.motors[0].yawMix *= -1;
  expect(componentDifferences(a, "motor-1", entry)).toEqual([]);
  a.parts.find((p) => p.id === "prop-1")!.massKg += 0.001;
  a.motors[0].performance!.points[1].currentA += 0.1;
  expect(componentDifferences(a, "motor-1", entry)).toEqual([
    "Propeller: Mass",
    "Propulsion model",
  ]);
  expect(componentDifferences(a, "prop-1", entry)).toEqual([
    "Propeller: Mass",
    "Propulsion model",
  ]);
});

it("recognizes servo specification changes but not the airframe's linkage geometry", () => {
  const entry = get("towerpro-mg90s");
  const a = replaceComponent(parseAircraft(raptor), "servo-left-elevon", entry);
  a.surfaces.find(
    (s) => s.control?.linkage?.servoPartId === "servo-left-elevon",
  )!.control!.linkage!.servoArmM *= 0.8;
  expect(componentDifferences(a, "servo-left-elevon", entry)).toEqual([]);
  a.parts.find(
    (p) => p.id === "servo-left-elevon",
  )!.servo!.speedSecondsPer60Deg *= 1.2;
  expect(componentDifferences(a, "servo-left-elevon", entry)).toEqual([
    "Servo specification",
  ]);
});

it("swaps a Robu battery as one physical and electrical component", () => {
  const a = parseAircraft(raptor),
    before = structuredClone(a),
    p = massProperties(a);
  const next = replaceComponent(a, "battery", get("orange-3s-1500-40c"));
  const n = massProperties(next);
  expect(a).toEqual(before);
  expect(next.parts.length).toBe(a.parts.length);
  expect(n.mass - p.mass).toBeCloseTo(0.035, 12);
  const installed = a.parts.find((p) => p.id === "battery")!;
  expect(next.parts.find((p) => p.id === "battery")!.positionM).toEqual(
    installed.positionM,
  );
  expect(n.cg[0]).toBeCloseTo(
    (p.cg[0] * p.mass + installed.positionM[0] * 0.035) / n.mass,
    12,
  );
  expect(n.inertia).not.toEqual(p.inertia);
  expect(next.battery!.capacityMah).toBe(1500);
  expect(next.battery!.initialSoc).toBe(a.battery!.initialSoc);
  expect(next.provenance["component:battery"].note).toContain("estimates");
});

it("capacity changes discharge time independently of mass", () => {
  const a = parseAircraft(raptor),
    b = structuredClone(a);
  b.battery!.capacityMah *= 2;
  const state = initialState(a, 12, 100);
  state.motors.fill(0.5);
  const one = new Simulation(a, undefined, state),
    two = new Simulation(b, undefined, state);
  const c = { ...neutralControls(), throttle: 0.5 };
  one.step(c);
  two.step(c);
  expect(massProperties(a)).toEqual(massProperties(b));
  expect(
    (a.battery!.initialSoc - one.state.batterySoc!) /
      (b.battery!.initialSoc - two.state.batterySoc!),
  ).toBeCloseTo(2, 7);
  expect(one.state.velocity).toEqual(two.state.velocity);
});

it("heavier batteries increase the required hover thrust and current", () => {
  const a = parseAircraft(quad),
    b = structuredClone(a);
  b.parts.find((p) => p.id === "battery")!.massKg += 0.1;
  const light = findTrim(a),
    heavy = findTrim(b);
  expect(light.converged && heavy.converged).toBe(true);
  expect(heavy.controls.throttle).toBeGreaterThan(light.controls.throttle);
  expect(powertrain(b, heavy.state.motors).current).toBeGreaterThan(
    powertrain(a, light.state.motors).current,
  );
  expect(a.battery!.capacityMah).toBe(b.battery!.capacityMah);
});

it("servo replacement preserves linkage while its rated speed drives actuation", () => {
  const a = parseAircraft(raptor),
    id = a.surfaces.find((s) => s.control)!.control!.linkage!.servoPartId;
  const entry = structuredClone(get("towerpro-mg90s"));
  entry.part.servo!.speedSecondsPer60Deg = 0.2;
  const next = replaceComponent(a, id, entry),
    surface = next.surfaces.find(
      (s) => s.control?.linkage?.servoPartId === id,
    )!;
  expect(surfaceActuation(next, surface).rateLimitDegS).toBeCloseTo(240);
  expect(massProperties(next).mass - massProperties(a).mass).toBeCloseTo(
    0.0044,
  );
  expect(surface.control!.linkage).toEqual(
    a.surfaces.find((s) => s.id === surface.id)!.control!.linkage,
  );
  entry.part.servo!.travelDeg = 30;
  expect(() => replaceComponent(a, id, entry)).toThrow(/travel/i);
});

it("motor packages replace motor and propeller mass without losing rotor installation", () => {
  const a = parseAircraft(quad),
    entry = structuredClone(get("emax-mt2213-1045-3s"));
  if (entry.type !== "motor") throw new Error("Expected motor entry");
  entry.part.massKg += 0.01;
  entry.prop.massKg += 0.002;
  entry.motor.performance!.points.forEach((p) => (p.thrustN *= 0.8));
  entry.motor.maxThrustN *= 0.8;
  const next = replaceComponent(a, "motor-1", entry);
  expect(massProperties(next).mass - massProperties(a).mass).toBeCloseTo(0.012);
  expect(next.parts.length).toBe(a.parts.length);
  expect(next.motors[0].positionM).toEqual(a.motors[0].positionM);
  expect(next.motors[0].spin).toBe(a.motors[0].spin);
  expect(next.motors[0].propPartId).toBe("prop-1");
  expect(powertrain(next, [1, 0, 0, 0]).thrust[0]).toBeCloseTo(
    powertrain(a, [1, 0, 0, 0]).thrust[0] * 0.8,
  );
  const legacy = parseAircraft(raptor);
  delete legacy.motors[0].propPartId;
  expect(() => replaceComponent(legacy, "motor", entry)).toThrow(
    /separate mass components/,
  );
});

it.each([bronco, tiny, raptor])(
  "replaces paired FT motor and prop masses exactly once for $id",
  (raw) => {
    const a = parseAircraft(raw),
      motor = a.motors[0];
    const oldMotor = a.parts.find((p) => p.id === motor.partId)!;
    const oldProp = a.parts.find((p) => p.id === motor.propPartId)!;
    const entry = get("emax-mt2213-1045-3s");
    if (entry.type !== "motor") throw new Error("Expected motor entry");
    expect(oldProp.massKg).toBeGreaterThan(0);
    const next = replaceComponent(a, oldMotor.id, entry);
    expect(massProperties(next).mass - massProperties(a).mass).toBeCloseTo(
      entry.part.massKg + entry.prop.massKg - oldMotor.massKg - oldProp.massKg,
      10,
    );
    expect(next.parts.length).toBe(a.parts.length);
    expect(next.parts.find((p) => p.id === oldProp.id)!.positionM).toEqual(
      oldProp.positionM,
    );
    expect(next.motors[0].positionM).toEqual(motor.positionM);
    expect(next.motors[0].maxThrustN).toBe(entry.motor.maxThrustN);
    expect(componentDifferences(next, oldMotor.id, entry)).toEqual([]);
    expect(componentDifferences(next, oldProp.id, entry)).toEqual([]);
    expect(() =>
      replaceComponent(next, oldProp.id, get("emax-blheli-12a")),
    ).toThrow(/motor\/prop package/);
  },
);

it("maps catalog motor/prop dimensions and principal inertia into the aircraft shaft frame", () => {
  const entry = structuredClone(get("emax-mt2213-1045-3s"));
  if (entry.type !== "motor") throw new Error("Expected motor entry");
  entry.part.inertiaDiagonalKgM2 = [0.000012, 0.000024, 0.00003];
  const plane = replaceComponent(parseAircraft(raptor), "motor", entry);
  const motor = plane.parts.find((p) => p.id === "motor")!;
  expect(motor.sizeM).toEqual([
    entry.part.sizeM[2],
    entry.part.sizeM[1],
    entry.part.sizeM[0],
  ]);
  expect(motor.inertiaDiagonalKgM2).toEqual([0.00003, 0.000024, 0.000012]);
  expect(
    plane.parts.find((p) => p.id === plane.motors[0].propPartId)!.sizeM,
  ).toEqual([entry.prop.sizeM[2], entry.prop.sizeM[1], entry.prop.sizeM[0]]);
  expect(componentDifferences(plane, "motor", entry)).toEqual([]);
  const multirotor = replaceComponent(parseAircraft(quad), "motor-1", entry);
  expect(multirotor.parts.find((p) => p.id === "motor-1")!.sizeM).toEqual(
    entry.part.sizeM,
  );
  expect(componentDifferences(multirotor, "motor-1", entry)).toEqual([]);
});

it("reports used charge and conditional time to reserve without infinity", () => {
  const a = parseAircraft(raptor);
  expect(batteryUsage(a, 0.75, 10)).toEqual({
    usedMah: expect.closeTo(200, 8),
    remainingMah: 750,
    minutesToReserve: expect.closeTo(3.3, 8),
  });
  expect(batteryUsage(a, 0.15, 10)!.minutesToReserve).toBe(0);
  expect(batteryUsage(a, 0.75, 0)!.minutesToReserve).toBeNull();
  expect(batteryUsage(a, 0.75, a.battery!.avionicsCurrentA)).toEqual({
    usedMah: expect.closeTo(200, 8),
    remainingMah: 750,
    minutesToReserve: null,
  });
});

it("all catalog entries apply to compatible assemblies and reject malformed identities", () => {
  for (const e of catalog.entries) {
    const a = parseAircraft(quad);
    if (e.type === "servo")
      expect(() =>
        replaceComponent(parseAircraft(raptor), "servo-left-elevon", e),
      ).not.toThrow();
    else
      expect(() =>
        replaceComponent(
          a,
          e.type === "battery"
            ? "battery"
            : e.type === "motor"
              ? "motor-1"
              : "esc-1",
          e,
        ),
      ).not.toThrow();
  }
  expect(() =>
    ComponentCatalogSchema.parse({
      ...catalog,
      entries: [catalog.entries[0], catalog.entries[0]],
    }),
  ).toThrow(/Duplicate/);
  const wrong = structuredClone(catalog);
  wrong.entries[0].part.kind = "motor";
  expect(() => ComponentCatalogSchema.parse(wrong)).toThrow(/agree/);
  expect(() =>
    replaceComponent(parseAircraft(raptor), "motor", get("orange-3s-1500-40c")),
  ).toThrow(/same type/);
});

it("moving a motor or prop retains the assembly offsets and force station", () => {
  for (const id of ["motor-1", "prop-1"]) {
    const a = parseAircraft(quad),
      old = structuredClone(a);
    const part = a.parts.find((p) => p.id === id)!;
    moveComponent(a, id, 2, part.positionM[2] + 0.02);
    expect(a.motors[0].positionM[2] - old.motors[0].positionM[2]).toBeCloseTo(
      0.02,
    );
    for (const linked of ["motor-1", "prop-1"])
      expect(
        a.parts.find((p) => p.id === linked)!.positionM[2] -
          old.parts.find((p) => p.id === linked)!.positionM[2],
      ).toBeCloseTo(0.02);
    expect(massProperties(a).mass).toBe(massProperties(old).mass);
    expect(() => parseAircraft(a)).not.toThrow();
  }
});
