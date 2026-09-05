import { z } from "zod";

const number = z.number().finite();
const profile = z
  .object({
    bankDeg: number.min(5).max(60),
    pitchDeg: number.min(5).max(35),
    yawRateDegS: number.min(10).max(180),
    climbMps: number.min(0.3).max(8),
    horizontalSpeedMps: number.min(1).max(15),
    positionHold: z.boolean(),
  })
  .strict();

export const VtolModeSchema = z.enum(["hover", "cruise"]);
export const VtolAssistanceSchema = z.enum(["beginner", "intermediate"]);
export const VtolCommandSchema = z
  .object({
    mode: VtolModeSchema,
    assistance: VtolAssistanceSchema,
  })
  .strict();
export type VtolCommand = z.infer<typeof VtolCommandSchema>;

/** Tricopter geometry is addressed by IDs, never by transmitter/output channel. */
export const VtolConfigSchema = z
  .object({
    frontLeftMotorId: z.string().min(1),
    frontRightMotorId: z.string().min(1),
    rearMotorId: z.string().min(1),
    leftServoPartId: z.string().min(1),
    rightServoPartId: z.string().min(1),
    rearServoPartId: z.string().min(1),
    tiltRateDegS: number.min(3).max(60),
    yawTiltDeg: number.min(5).max(30),
    transitionAirspeedMps: number.min(5).max(35),
    transitionAltitudeM: number.min(2).max(30),
    transitionTimeoutS: number.min(10).max(60),
    cruisePitchDeg: number.min(-5).max(12),
    cruisePitchTrim: number.min(-1).max(1),
    attitudeGain: number.min(0.5).max(8),
    rateGain: number.min(1).max(20),
    profiles: z.object({ beginner: profile, intermediate: profile }).strict(),
    defaultAssistance: VtolAssistanceSchema,
  })
  .strict();

const vec = z.tuple([number, number, number]);
export const VtolStateSchema = z
  .object({
    phase: z.enum([
      "hover",
      "accelerating",
      "converting",
      "cruise",
      "returning",
    ]),
    requestedMode: VtolModeSchema,
    commonTiltDeg: number.min(0).max(90),
    rearTiltDeg: number.min(-30).max(30),
    tiltDeg: z.tuple([number.min(0).max(90), number.min(0).max(90)]),
    phaseTime: number.min(0),
    airspeedTime: number.min(0),
    altitudeTargetM: number,
    positionTarget: vec,
    verticalIntegral: number.min(-4).max(4),
    headingTarget: number,
    surfaceIntegral: z.tuple([
      number.min(-0.5).max(0.5),
      number.min(-0.5).max(0.5),
      number.min(-0.5).max(0.5),
    ]),
    notice: z.enum(["none", "climb-first", "transition-aborted", "power-cut"]),
    saturated: z.boolean(),
  })
  .strict();
export type VtolState = z.infer<typeof VtolStateSchema>;
