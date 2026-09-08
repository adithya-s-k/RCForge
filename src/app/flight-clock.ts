/** Converts monotonic browser time to fixed physics steps, without slow motion.
 * A long interruption must pause flight rather than applying stale input in a
 * large catch-up burst. Presentation timing remains separate from this clock.
 */
export class FlightClock {
  private previous: number | undefined;
  private remainder = 0;
  constructor(
    readonly stepSeconds = 1 / 120,
    readonly maxFrameSeconds = 0.25,
  ) {
    if (
      !(stepSeconds > 0 && maxFrameSeconds >= stepSeconds) ||
      !Number.isFinite(maxFrameSeconds)
    )
      throw new Error("Invalid flight clock interval");
  }
  reset(nowMs?: number) {
    this.previous = nowMs;
    this.remainder = 0;
  }
  advance(nowMs: number): { steps: number; interrupted: boolean } {
    if (!Number.isFinite(nowMs)) {
      this.reset();
      return { steps: 0, interrupted: true };
    }
    const elapsed =
      this.previous === undefined ? 0 : (nowMs - this.previous) / 1000;
    this.previous = nowMs;
    if (elapsed < 0 || elapsed > this.maxFrameSeconds) {
      this.remainder = 0;
      return { steps: 0, interrupted: true };
    }
    this.remainder += elapsed;
    // Floating-point timestamp subtraction must not drop a step at an exact boundary.
    const steps = Math.floor((this.remainder + 1e-10) / this.stepSeconds);
    this.remainder = Math.max(0, this.remainder - steps * this.stepSeconds);
    return { steps, interrupted: false };
  }
}
