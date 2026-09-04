import { z } from "zod";
const finite = z.number().finite();
const vec = z.tuple([finite, finite, finite]);
const positive = finite.positive();
const dims = z.tuple([positive, positive, positive]);
const polarTable = z
  .array(
    z
      .object({
        alphaDeg: finite.min(-180).max(180),
        cl: finite.min(-5).max(5),
        cd: finite.min(0).max(5),
        cm: finite.min(-2).max(2),
      })
      .strict(),
  )
  .min(3)
  .max(721)
  .refine(
    (points) =>
      points.every((p, i) => i === 0 || p.alphaDeg > points[i - 1].alphaDeg),
    "Polar angles must be strictly increasing",
  );
const provenance = z
  .object({
    status: z.enum(["sourced", "calculated", "estimated", "calibrated"]),
    note: z.string().min(1),
    url: z.string().url().optional(),
  })
  .strict();
export const AircraftSchema = z
  .object({
    schemaVersion: z.literal(1),
    vehicleType: z.enum(["fixed-wing", "multirotor"]).default("fixed-wing"),
    multirotor: z
      .object({
        mode: z.enum(["angle", "rate"]),
        maxTiltDeg: positive.max(70),
        maxRateDegS: positive.max(1000),
        rateGain: positive.max(1),
        attitudeGain: positive.max(20),
      })
      .strict()
      .optional(),
    id: z.string().regex(/^[a-z0-9-]+$/),
    name: z.string().min(1),
    description: z.string(),
    provenance: z.record(z.string(), provenance),
    battery: z
      .object({
        partId: z.string().min(1),
        chemistry: z.enum(["LiPo", "LiIon", "other"]),
        cells: z.number().int().min(1).max(24),
        capacityMah: positive.max(100000),
        resistanceOhm: finite.min(0).max(10),
        initialSoc: finite.min(0).max(1).default(1),
        avionicsCurrentA: finite.min(0).max(20).default(0.15),
        voltageCurve: z
          .array(
            z
              .object({
                soc: finite.min(0).max(1),
                voltsPerCell: positive.max(5),
              })
              .strict(),
          )
          .min(2)
          .max(100),
      })
      .strict()
      .optional(),
    parts: z
      .array(
        z
          .object({
            id: z.string().min(1),
            kind: z.enum([
              "wing",
              "body",
              "boom",
              "tail",
              "battery",
              "motor",
              "equipment",
            ]),
            massKg: positive.max(100),
            material: z
              .object({
                name: z.string().min(1),
                densityKgM3: positive.optional(),
                finish: z
                  .enum(["foam", "carbon", "metal", "plastic", "wood"])
                  .optional(),
              })
              .strict()
              .optional(),
            manufacturer: z.string().optional(),
            model: z.string().optional(),
            inertiaDiagonalKgM2: z
              .tuple([positive, positive, positive])
              .optional(),
            orientationDeg: vec.optional(),
            positionM: vec,
            sizeM: dims,
            color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
          })
          .strict(),
      )
      .min(1),
    surfaces: z.array(
      z
        .object({
          id: z.string().min(1),
          kind: z.enum(["wing", "horizontal-tail", "vertical-tail", "other"]),
          positionM: vec,
          spanM: positive.max(20),
          chordM: positive.max(5),
          aspectRatio: positive,
          rollDeg: finite.min(-180).max(180),
          incidenceDeg: finite.min(-20).max(20),
          reynoldsPolars: z
            .object({
              // A 2-D section table must first be converted to finite-wing data.
              convention: z.literal("finite-wing"),
              source: z.string().min(1).max(2000),
              tables: z
                .array(
                  z
                    .object({
                      reynolds: positive.min(1000).max(100000000),
                      points: polarTable,
                    })
                    .strict(),
                )
                .min(2)
                .max(20)
                .refine(
                  (tables) =>
                    tables.every(
                      (t, i) => i === 0 || t.reynolds > tables[i - 1].reynolds,
                    ),
                  "Reynolds numbers must be strictly increasing",
                ),
            })
            .strict()
            .optional(),
          polar: z
            .array(
              z
                .object({
                  alphaDeg: finite.min(-180).max(180),
                  cl: finite.min(-5).max(5),
                  cd: finite.min(0).max(5),
                  cm: finite.min(-2).max(2),
                })
                .strict(),
            )
            .min(3)
            .max(721)
            .optional(),
          liftSlope: positive.max(10),
          zeroLiftDeg: finite.min(-15).max(15),
          stallDeg: positive.max(45),
          cd0: finite.min(0).max(1),
          efficiency: positive.max(1),
          cm: finite.min(-1).max(1),
          control: z
            .object({
              axis: z.enum(["roll", "pitch", "yaw"]),
              gain: finite.min(-2).max(2),
              mix: z
                .object({
                  roll: finite.min(-2).max(2).optional(),
                  pitch: finite.min(-2).max(2).optional(),
                  yaw: finite.min(-2).max(2).optional(),
                })
                .strict()
                .optional(),
              maxDeg: finite.min(0).max(45),
              effectiveness: finite.min(0).max(1),
              responseSeconds: positive.max(2).optional(),
              rateLimitDegS: positive.max(2000).optional(),
            })
            .strict()
            .optional(),
        })
        .strict(),
    ),
    motors: z.array(
      z
        .object({
          id: z.string().min(1),
          positionM: vec,
          performance: z
            .object({
              referenceVoltage: positive.max(100),
              referenceDensityKgM3: positive.max(3).default(1.225),
              points: z
                .array(
                  z
                    .object({
                      command: finite.min(0).max(1),
                      thrustN: finite.min(0).max(1000),
                      currentA: finite.min(0).max(500),
                    })
                    .strict(),
                )
                .min(2)
                .max(100),
            })
            .strict()
            .optional(),
          model: z.string().optional(),
          propeller: z.string().optional(),
          maxThrustN: positive.max(1000),
          zeroThrustSpeedMps: positive,
          responseSeconds: positive,
          yawMix: finite.min(-1).max(1),
          spin: z.enum(["cw", "ccw"]).optional(),
          torquePerThrustM: finite.min(0).max(1).default(0.015),
          propDiameterM: positive.max(2).default(0.2032),
        })
        .strict(),
    ),
    fuselageDragAreaM2: finite.min(0).max(2),
    bodyDragAreaM2: z
      .tuple([finite.min(0).max(2), finite.min(0).max(2), finite.min(0).max(2)])
      .optional(),
    angularDamping: z.tuple([positive, positive, positive]),
    contactPoints: z
      .array(
        z
          .object({
            id: z.string().min(1),
            positionM: vec,
            spanLinked: z.boolean(),
            kind: z.enum(["body", "wheel", "skid"]).default("body"),
            steering: z.boolean().default(false),
            wheelRadiusM: positive.max(0.3).default(0.032),
          })
          .strict(),
      )
      .min(1)
      .max(128),
    reference: z
      .object({
        spanM: positive,
        areaM2: positive,
        cgFromLeadingEdgeM: finite,
        leadingEdgeXM: finite,
      })
      .strict(),
  })
  .strict()
  .superRefine((a, ctx) => {
    const issue = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: "custom", path, message });
    if (a.battery) {
      if (
        !a.parts.some((p) => p.id === a.battery!.partId && p.kind === "battery")
      )
        issue(
          ["battery", "partId"],
          "Battery must reference an existing battery mass component",
        );
      const points = a.battery.voltageCurve;
      if (
        points[0].soc !== 0 ||
        points.at(-1)!.soc !== 1 ||
        points.some(
          (p, i) =>
            i > 0 &&
            (p.soc <= points[i - 1].soc ||
              p.voltsPerCell < points[i - 1].voltsPerCell),
        )
      )
        issue(
          ["battery", "voltageCurve"],
          "OCV curve must cover SOC 0 to 1 in increasing order",
        );
      if (a.motors.some((m) => !m.performance))
        issue(
          ["motors"],
          "Battery simulation needs a thrust/current performance curve on every motor",
        );
    }
    a.parts.forEach((p, i) => {
      const d = p.inertiaDiagonalKgM2;
      if (d && d.some((v, j) => v > d[(j + 1) % 3] + d[(j + 2) % 3] + 1e-12))
        issue(
          ["parts", i, "inertiaDiagonalKgM2"],
          "Principal inertias must satisfy triangle inequalities",
        );
    });
    a.motors.forEach((m, i) => {
      const p = m.performance?.points;
      if (
        p &&
        (p[0].command !== 0 ||
          p.at(-1)!.command !== 1 ||
          p[0].thrustN !== 0 ||
          p.some(
            (v, j) =>
              j > 0 &&
              (v.command <= p[j - 1].command ||
                v.thrustN < p[j - 1].thrustN ||
                v.currentA < p[j - 1].currentA),
          ))
      )
        issue(
          ["motors", i, "performance"],
          "Performance must cover commands 0 to 1 with increasing command and nondecreasing thrust/current, starting at zero thrust",
        );
      if (p && Math.abs(p.at(-1)!.thrustN - m.maxThrustN) > 1e-6)
        issue(
          ["motors", i, "maxThrustN"],
          "Max thrust must match the performance curve endpoint",
        );
    });
    a.surfaces.forEach((s, i) => {
      if (s.polar && s.reynoldsPolars)
        issue(["surfaces", i], "Choose polar or reynoldsPolars, not both");
      if (
        s.polar &&
        s.polar.some((p, j) => j > 0 && p.alphaDeg <= s.polar![j - 1].alphaDeg)
      )
        issue(
          ["surfaces", i, "polar"],
          "Polar angles must be strictly increasing",
        );
    });
    if (a.vehicleType === "fixed-wing" && !a.surfaces.length)
      ctx.addIssue({
        code: "custom",
        message: "Fixed-wing aircraft need aerodynamic surfaces",
        path: ["surfaces"],
      });
    if (
      a.vehicleType === "multirotor" &&
      (!a.multirotor ||
        a.motors.length !== 4 ||
        a.motors.filter((m) => m.spin === "cw").length !== 2 ||
        a.motors.filter((m) => m.spin === "ccw").length !== 2 ||
        a.motors.some(
          (m) =>
            Math.abs(m.positionM[0]) < 0.001 ||
            Math.abs(m.positionM[1]) < 0.001,
        ) ||
        a.motors.some((m) =>
          a.motors.some((n) =>
            Math.sign(m.positionM[0] * m.positionM[1]) ===
            Math.sign(n.positionM[0] * n.positionM[1])
              ? m.spin !== n.spin
              : m.spin === n.spin,
          ),
        ) ||
        new Set(
          a.motors.map(
            (m) => `${Math.sign(m.positionM[0])},${Math.sign(m.positionM[1])}`,
          ),
        ).size !== 4)
    )
      ctx.addIssue({
        code: "custom",
        message:
          "Quad X requires controller settings and four quadrant-separated rotors with two CW and two CCW directions",
        path: ["motors"],
      });
    for (const key of [
      "parts",
      "surfaces",
      "motors",
      "contactPoints",
    ] as const) {
      const seen = new Set<string>();
      a[key].forEach((v, i) => {
        if (seen.has(v.id))
          ctx.addIssue({
            code: "custom",
            path: [key, i, "id"],
            message: "Duplicate component id",
          });
        seen.add(v.id);
      });
    }
  });
export type Aircraft = z.infer<typeof AircraftSchema>;
export function parseAircraft(value: unknown): Aircraft {
  return AircraftSchema.parse(value);
}
