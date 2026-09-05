import type { Aircraft } from "./schema";
import {
  PilotResponseFilter,
  withPitchTrim,
  type PilotResponse,
} from "./pilot-response";
import { advanceSurfaceCommand, surfaceActuation } from "./actuation";
import { surfaceCommand } from "./surface-control";
import { FIXED_DT, neutralControls, type Controls } from "./simulation";

/** No rigid-body integration, motor spin or battery drain on the test bench. */
export class ControlPreview {
  moving = false;
  tiltMode: "hover" | "cruise" = "hover";
  tiltDeg = [0, 0];
  rearTiltDeg = 0;
  private commonTiltDeg = 0;
  controls = neutralControls();
  deflections: number[];
  private response = new PilotResponseFilter();
  readonly actuations;
  constructor(readonly aircraft: Aircraft) {
    this.actuations = aircraft.surfaces.map((s) =>
      surfaceActuation(aircraft, s),
    );
    this.deflections = aircraft.surfaces.map(() => 0);
  }
  step(input: Controls, settings: PilotResponse, trim = 0) {
    const previousControls = this.controls;
    const previousDeflections = this.deflections;
    this.controls = withPitchTrim(
      this.response.step({ ...input, throttle: 0 }, settings, FIXED_DT),
      trim,
    );
    this.deflections = this.aircraft.surfaces.map((s, i) =>
      s.control
        ? advanceSurfaceCommand(
            this.deflections[i],
            surfaceCommand(s.control, this.controls),
            this.actuations[i],
            FIXED_DT,
          )
        : 0,
    );
    let tilting = false;
    if (this.aircraft.vtol) {
      const v = this.aircraft.vtol;
      const target = this.tiltMode === "cruise" ? 90 : 0;
      this.commonTiltDeg += Math.max(
        -v.tiltRateDegS * FIXED_DT,
        Math.min(v.tiltRateDegS * FIXED_DT, target - this.commonTiltDeg),
      );
      [v.leftServoPartId, v.rightServoPartId].forEach((id, i) => {
        const servo = this.aircraft.parts.find((p) => p.id === id)!.servo!;
        const wanted = Math.max(0, Math.min(90, this.commonTiltDeg));
        const previous = this.tiltDeg[i];
        this.tiltDeg[i] += Math.max(
          (-60 / servo.speedSecondsPer60Deg) * FIXED_DT,
          Math.min(
            (60 / servo.speedSecondsPer60Deg) * FIXED_DT,
            wanted - this.tiltDeg[i],
          ),
        );
        tilting ||= Math.abs(this.tiltDeg[i] - previous) > 1e-5;
      });
    }
    if (this.aircraft.vtol) {
      const v = this.aircraft.vtol,
        servo = this.aircraft.parts.find(
          (p) => p.id === v.rearServoPartId,
        )!.servo!;
      const target =
        this.tiltMode === "hover" ? -this.controls.yaw * v.yawTiltDeg : 0;
      const before = this.rearTiltDeg;
      this.rearTiltDeg += Math.max(
        (-60 / servo.speedSecondsPer60Deg) * FIXED_DT,
        Math.min(
          (60 / servo.speedSecondsPer60Deg) * FIXED_DT,
          target - this.rearTiltDeg,
        ),
      );
      tilting ||= Math.abs(this.rearTiltDeg - before) > 1e-5;
    }
    this.moving =
      tilting ||
      (["roll", "pitch", "yaw"] as const).some(
        (axis) => Math.abs(this.controls[axis] - previousControls[axis]) > 1e-5,
      ) ||
      this.deflections.some(
        (v, i) => Math.abs(v - previousDeflections[i]) > 1e-5,
      );
  }
  reset() {
    this.moving = false;
    this.response.reset();
    this.controls = neutralControls();
    this.deflections.fill(0);
    this.tiltDeg.fill(0);
    this.rearTiltDeg = 0;
    this.commonTiltDeg = 0;
    this.tiltMode = "hover";
  }
}
