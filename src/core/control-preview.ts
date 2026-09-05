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
    this.moving =
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
  }
}
