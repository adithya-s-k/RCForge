import { describe, expect, it } from "vitest";
import { FlightClock } from "../src/app/flight-clock";
import { bundledAircraft } from "../src/app/bundled-aircraft";
import {
  FIXED_DT,
  Simulation,
  calmEnvironment,
  neutralControls,
} from "../src/core/simulation";
import { launchState, launchTrim } from "../src/core/launch";
import { ControlPreview } from "../src/core/control-preview";
import { responsePresets } from "../src/core/pilot-response";

describe("real-time flight scheduling", () => {
  it.each([10, 15, 20, 30, 60, 75, 120, 144])(
    "advances 10 seconds at %s display FPS",
    (fps) => {
      const clock = new FlightClock();
      clock.reset(0);
      let steps = 0;
      for (let i = 1; i <= fps * 10; i++) {
        const frame = clock.advance((i * 1000) / fps);
        expect(frame.interrupted).toBe(false);
        steps += frame.steps;
      }
      expect(steps).toBe(1200);
    },
  );
  it("preserves fractional time through jitter and zero-time callbacks", () => {
    const clock = new FlightClock();
    clock.reset(0);
    let time = 0,
      steps = 0;
    const intervals = [7, 11, 68, 23, 110, 0, 19, 47];
    for (let i = 0; time < 10_000; i++) {
      time = Math.min(10_000, time + intervals[i % intervals.length]);
      steps += clock.advance(time).steps;
    }
    expect(steps).toBe(1200);
  });
  it("interrupts a long stall before any catch-up and discards pause time", () => {
    const clock = new FlightClock();
    clock.reset(0);
    expect(clock.advance(100).steps).toBe(12);
    expect(clock.advance(700)).toEqual({ steps: 0, interrupted: true });
    clock.reset(); // Same call as the browser's pause handler.
    clock.reset(20_000); // Explicit resume, not a catch-up from before pause.
    expect(clock.advance(20_050)).toEqual({ steps: 6, interrupted: false });
  });
  it("bounds work and interrupts invalid or backwards timestamps", () => {
    const clock = new FlightClock();
    clock.reset(0);
    expect(clock.advance(250).steps).toBe(30);
    expect(clock.advance(200).interrupted).toBe(true);
    expect(clock.advance(NaN).interrupted).toBe(true);
    expect(clock.advance(1000)).toEqual({ steps: 0, interrupted: false });
  });
  it.each(bundledAircraft.map((a) => [a.id, a] as const))(
    "%s follows the identical physical/control trajectory at 15 and 60 FPS",
    (_id, aircraft) => {
      const run = (fps: number) => {
        const clock = new FlightClock();
        clock.reset(0);
        const environment = calmEnvironment();
        const sim = new Simulation(
          aircraft,
          environment,
          launchState(aircraft, "airborne", environment),
        );
        const trim = launchTrim(aircraft, "airborne", environment).controls;
        let tick = 0;
        for (let frame = 1; frame <= 3 * fps; frame++) {
          const timing = clock.advance((frame * 1000) / fps);
          for (let step = 0; step < timing.steps; step++, tick++) {
            const pulse = tick >= 120 && tick < 144 ? 0.12 : 0;
            sim.step({ ...trim, yaw: pulse, roll: -pulse / 2 }, FIXED_DT);
          }
        }
        return sim.state;
      };
      const low = run(15),
        normal = run(60);
      expect(low.time).toBeCloseTo(3, 10);
      expect(low).toEqual(normal);
      expect(
        [
          ...low.position,
          ...low.velocity,
          ...low.orientation,
          ...low.omega,
        ].every(Number.isFinite),
      ).toBe(true);
    },
  );
  it("keeps visible servo travel independent of display rate", () => {
    const a = bundledAircraft.find((a) => a.id === "ft-22-raptor")!;
    const run = (fps: number) => {
      const clock = new FlightClock();
      clock.reset(0);
      const preview = new ControlPreview(a);
      for (let frame = 1; frame <= fps; frame++)
        for (
          let step = 0, count = clock.advance((frame * 1000) / fps).steps;
          step < count;
          step++
        )
          preview.step(
            { ...neutralControls(), pitch: 0.7, roll: 0.4 },
            { preset: "gentle", ...responsePresets.gentle },
          );
      return preview.deflections;
    };
    expect(run(10)).toEqual(run(120));
    expect(run(10).some((v) => Math.abs(v) > 0)).toBe(true);
  });
});
