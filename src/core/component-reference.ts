import type { Aircraft } from "./schema";
import type { Component } from "./components";

// Compare authored specifications, allowing only floating-point roundoff.
// Installation, starting charge and aircraft electrical load are not product specs.
function equivalent(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a === "number" && typeof b === "number")
    return Math.abs(a - b) <= 1e-10 * Math.max(1, Math.abs(a), Math.abs(b));
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const left = a as Record<string, unknown>,
    right = b as Record<string, unknown>;
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  return [...keys].every((key) => equivalent(left[key], right[key]));
}

/** Differences from a catalog's modeled setup, not a physical certification.
 * Calculated from the saved definition too, so imports cannot retain a stale badge. */
export function componentDifferences(
  a: Aircraft,
  partId: string,
  reference: Component,
): string[] {
  const changes: string[] = [];
  const compare = (label: string, value: unknown, baseline: unknown) => {
    if (!equivalent(value, baseline)) changes.push(label);
  };
  const comparePart = (
    installed: Aircraft["parts"][number] | undefined,
    baseline: Component["part"],
    prefix = "",
  ) => {
    if (!installed) {
      changes.push(`${prefix}Component missing`);
      return;
    }
    for (const [label, key] of [
      ["Mass", "massKg"],
      ["Dimensions", "sizeM"],
      ["Inertia", "inertiaDiagonalKgM2"],
      ["Material", "material"],
      ["Servo specification", "servo"],
      ["Shape", "bodyLoft"],
      ["Model", "model"],
      ["Manufacturer", "manufacturer"],
    ] as const)
      compare(`${prefix}${label}`, installed[key], baseline[key]);
  };
  const installed = a.parts.find((p) => p.id === partId);
  if (reference.type === "motor") {
    const motor = a.motors.find(
      (m) => m.partId === partId || m.propPartId === partId,
    );
    comparePart(
      a.parts.find((p) => p.id === motor?.partId),
      reference.part,
      "Motor: ",
    );
    comparePart(
      a.parts.find((p) => p.id === motor?.propPartId),
      reference.prop,
      "Propeller: ",
    );
    if (!motor) changes.push("Propulsion model missing");
    else {
      const {
        id: _id,
        positionM: _position,
        partId: _part,
        propPartId: _prop,
        spin: _spin,
        yawMix: _yaw,
        ...performance
      } = motor;
      compare("Propulsion model", performance, reference.motor);
    }
  } else comparePart(installed, reference.part);
  if (reference.type === "battery") {
    const battery = a.battery?.partId === partId ? a.battery : undefined;
    if (!battery) changes.push("Battery model missing");
    else
      for (const [label, key] of [
        ["Capacity", "capacityMah"],
        ["Cell count", "cells"],
        ["Chemistry", "chemistry"],
        ["Resistance", "resistanceOhm"],
        ["Voltage curve", "voltageCurve"],
      ] as const)
        compare(label, battery[key], reference.battery[key]);
  }
  return changes;
}
