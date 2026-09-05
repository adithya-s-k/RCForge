import { expect, it } from "vitest";
import {
  PilotResponseFilter,
  PilotResponseSchema,
  responseSettings,
  withPitchTrim,
} from "../src/core/pilot-response";
import { parseAircraft } from "../src/core/schema";
import { Simulation, FIXED_DT, neutralControls } from "../src/core/simulation";
import { findTrim } from "../src/core/trim";
import {
  createRecording,
  parseRecording,
  replayRecording,
} from "../src/core/experiment";
import raptor from "../aircraft/ft-22-raptor.json";

it("keeps Direct identical and softens the center and endpoints independently", () => {
  const raw = { roll: 0.5, pitch: -1, yaw: 1, throttle: 0.73 };
  expect(
    new PilotResponseFilter().step(raw, responseSettings(), FIXED_DT),
  ).toEqual(raw);
  const settings = responseSettings(
    PilotResponseSchema.parse({ preset: "gentle" }),
  );
  const f = new PilotResponseFilter();
  let c = raw;
  for (let i = 0; i < 240; i++) c = f.step(raw, settings, FIXED_DT);
  expect(c.roll).toBeCloseTo(0.55 * (0.6 * 0.5 + 0.4 * 0.5 ** 3), 8);
  expect(c.pitch).toBeCloseTo(-0.45, 8);
  expect(c.yaw).toBeCloseTo(0.65, 8);
  expect(c.throttle).toBe(raw.throttle);
});
it("preserves neutral trim, full-authority endpoints and command signs", () => {
  for (const trim of [-0.95, 0, 0.7774]) {
    expect(withPitchTrim(neutralControls(), trim).pitch).toBe(trim);
    expect(
      withPitchTrim({ ...neutralControls(), pitch: 1 }, trim).pitch,
    ).toBeCloseTo(1);
    expect(
      withPitchTrim({ ...neutralControls(), pitch: -1 }, trim).pitch,
    ).toBeCloseTo(-1);
    expect(
      withPitchTrim({ ...neutralControls(), pitch: 0.2 }, trim).pitch,
    ).toBeGreaterThan(trim);
    expect(
      withPitchTrim({ ...neutralControls(), pitch: -0.2 }, trim).pitch,
    ).toBeLessThan(trim);
  }
});
it("has time-based smoothing and reset cannot carry a previous held command", () => {
  const settings = responseSettings(
    PilotResponseSchema.parse({ preset: "gentle" }),
  );
  const runs = [60, 120, 240].map((hz) => {
    const f = new PilotResponseFilter();
    let c = neutralControls();
    for (let i = 0; i < hz / 2; i++)
      c = f.step({ ...c, roll: 1 }, settings, 1 / hz);
    f.reset();
    expect(f.step(neutralControls(), settings, FIXED_DT)).toEqual(
      neutralControls(),
    );
    return c.roll;
  });
  expect(runs[0]).toBeCloseTo(runs[1], 12);
  expect(runs[1]).toBeCloseTo(runs[2], 12);
});
it("rejects invalid tuning and replays shaped controls without local preferences", () => {
  for (const patch of [
    { expo: 2 },
    { rates: [-1, 1, 1] },
    { smoothingSeconds: -1 },
    { rates: [NaN, 1, 1] },
  ])
    expect(
      PilotResponseSchema.safeParse({ preset: "custom", ...patch }).success,
    ).toBe(false);
  const a = parseAircraft(raptor),
    trim = findTrim(a);
  const sim = new Simulation(a, undefined, trim.state),
    recording = createRecording(sim),
    f = new PilotResponseFilter();
  for (let i = 0; i < 120; i++) {
    const c = withPitchTrim(
      f.step(
        {
          ...neutralControls(),
          roll: i < 30 ? 0.5 : 0,
          throttle: trim.controls.throttle,
        },
        responseSettings(a.pilotResponse),
        FIXED_DT,
      ),
      trim.controls.pitch,
    );
    sim.step(c);
    recording.frames.push(c);
  }
  expect(
    replayRecording(parseRecording(JSON.parse(JSON.stringify(recording)))),
  ).toEqual(sim.state);
});
