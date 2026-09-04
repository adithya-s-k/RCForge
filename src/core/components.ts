import { z } from "zod";
import { AircraftSchema, parseAircraft, type Aircraft } from "./schema";

const part = AircraftSchema.shape.parts.element.omit({
  id: true,
  positionM: true,
});
const battery = AircraftSchema.shape.battery.unwrap().omit({ partId: true });
const common = {
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(160),
  description: z.string().max(2000),
  part,
  sources: z
    .array(
      z.object({ title: z.string().min(1), url: z.string().url() }).strict(),
    )
    .min(1)
    .max(12),
  evidence: z.string().min(1).max(4000),
};
export const ComponentSchema = z.discriminatedUnion("type", [
  z.object({ ...common, type: z.literal("battery"), battery }).strict(),
  z.object({ ...common, type: z.literal("servo") }).strict(),
  z.object({ ...common, type: z.literal("equipment") }).strict(),
  z
    .object({
      ...common,
      type: z.literal("motor"),
      motor: AircraftSchema.shape.motors.element.omit({
        id: true,
        positionM: true,
        partId: true,
        propPartId: true,
        spin: true,
        yawMix: true,
      }),
      prop: part,
    })
    .strict(),
]);
export const ComponentCatalogSchema = z
  .object({
    schemaVersion: z.literal(1),
    reviewedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    entries: z.array(ComponentSchema).max(2000),
  })
  .strict()
  .superRefine((catalog, ctx) => {
    const ids = new Set<string>();
    catalog.entries.forEach((entry, i) => {
      if (ids.has(entry.id))
        ctx.addIssue({
          code: "custom",
          path: ["entries", i, "id"],
          message: "Duplicate catalog ID",
        });
      ids.add(entry.id);
      const expected = entry.type === "servo" ? "equipment" : entry.type;
      if (
        entry.part.kind !== expected ||
        (entry.type === "servo" && !entry.part.servo)
      )
        ctx.addIssue({
          code: "custom",
          path: ["entries", i, "part"],
          message: "Component type and physical part must agree",
        });
      if (
        entry.type === "motor" &&
        (!entry.motor.performance || entry.prop.kind !== "equipment")
      )
        ctx.addIssue({
          code: "custom",
          path: ["entries", i],
          message:
            "Motor packages need a thrust/current curve and propeller mass",
        });
    });
  });
export type Component = z.infer<typeof ComponentSchema>;

export function componentType(p: Aircraft["parts"][number]) {
  return p.servo ? "servo" : p.kind;
}

/** Translate an installed motor/prop unit without losing its authored offsets.
 * Other mass parts move independently; surface geometry has its own definition. */
export function moveComponent(
  out: Aircraft,
  partId: string,
  axis: number,
  meters: number,
) {
  if (
    !Number.isInteger(axis) ||
    axis < 0 ||
    axis > 2 ||
    !Number.isFinite(meters)
  )
    throw new Error("Invalid installation coordinate");
  const part = out.parts.find((p) => p.id === partId);
  if (!part) throw new Error("Component not found");
  const delta = meters - part.positionM[axis];
  part.positionM[axis] = meters;
  const motor = out.motors.find(
    (m) => m.partId === partId || m.propPartId === partId,
  );
  if (motor) {
    motor.positionM[axis] += delta;
    for (const linkedId of [motor.partId, motor.propPartId]) {
      if (linkedId === partId) continue;
      const linked = out.parts.find((p) => p.id === linkedId);
      if (linked) linked.positionM[axis] += delta;
    }
  }
}

/** Replace one ledger entry in place. Installation coordinates and all external
 * references survive; mass, dimensions and intrinsic inertia come from the part. */
export function replaceComponent(
  a: Aircraft,
  partId: string,
  entry: Component,
): Aircraft {
  const out = structuredClone(a);
  const index = out.parts.findIndex((p) => p.id === partId);
  const old = out.parts[index];
  if (!old || componentType(old) !== entry.type)
    throw new Error("Choose a component of the same type.");
  out.parts[index] = {
    ...structuredClone(entry.part),
    id: old.id,
    positionM: old.positionM,
    orientationDeg: old.orientationDeg,
    catalogId: entry.id,
  };
  if (entry.type === "battery") {
    if (out.battery && out.battery.partId !== partId)
      throw new Error(
        "This aircraft's electrical model uses a different battery component.",
      );
    out.battery = {
      ...structuredClone(entry.battery),
      partId,
      initialSoc: out.battery?.initialSoc ?? entry.battery.initialSoc,
      avionicsCurrentA:
        out.battery?.avionicsCurrentA ?? entry.battery.avionicsCurrentA,
    };
  }
  if (entry.type === "motor") {
    const motor = out.motors.find((m) => m.partId === partId);
    const propIndex = out.parts.findIndex((p) => p.id === motor?.propPartId);
    if (!motor || propIndex < 0)
      throw new Error(
        "Link this motor and its propeller to separate mass components before replacing the motor/prop package.",
      );
    const oldProp = out.parts[propIndex];
    out.parts[propIndex] = {
      ...structuredClone(entry.prop),
      id: oldProp.id,
      positionM: oldProp.positionM,
      orientationDeg: oldProp.orientationDeg,
      catalogId: entry.id,
    };
    Object.assign(motor, structuredClone(entry.motor));
  }
  out.provenance[`component:${partId}`] = {
    status: "estimated",
    note: `${entry.name}. ${entry.evidence} Installation position retained; check fit and CG.`,
    url: entry.sources[0].url,
  };
  return parseAircraft(out);
}

/** A constant-command estimate only: no promise of remaining flight time. */
export function batteryUsage(a: Aircraft, soc: number, currentA: number) {
  const b = a.battery;
  if (!b) return null;
  return {
    usedMah: Math.max(0, b.initialSoc - soc) * b.capacityMah,
    remainingMah: Math.max(0, soc) * b.capacityMah,
    minutesToReserve:
      currentA > 0.05
        ? ((Math.max(0, soc - 0.2) * b.capacityMah) / (currentA * 1000)) * 60
        : null,
  };
}
