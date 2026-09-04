import { expect, it } from "vitest";
import { flightAction, flightFeedback } from "../src/app/flight-session";
const ready = {
  running: false,
  started: false,
  status: "flying",
  replay: false,
  replayComplete: false,
};
it("keeps a start action before launch and distinguishes pause from resume", () => {
  expect(flightAction(ready)).toBe("Start flight");
  expect(flightAction({ ...ready, running: true, started: true })).toBe(
    "Pause flight",
  );
  expect(flightAction({ ...ready, started: true })).toBe("Resume flight");
});

const flight = {
  ...ready,
  mode: "ground" as const,
  quad: false,
  keyboard: true,
};
it("offers setup for missing input without blocking recorded playback", () => {
  expect(flightAction({ ...ready, inputReady: false })).toBe(
    "Set up controller",
  );
  expect(flightFeedback({ ...flight, inputReady: false }).tone).toBe("input");
  expect(flightAction({ ...ready, inputReady: false, replay: true })).toBe(
    "Play replay",
  );
});
it("prioritizes a terminal airframe state over a generic pause", () => {
  expect(
    flightFeedback({ ...flight, started: true, status: "crashed" }).tone,
  ).toBe("impact");
  expect(
    flightFeedback({ ...flight, started: true, status: "landed" }).tone,
  ).toBe("landed");
  expect(flightFeedback({ ...flight, started: true }).tone).toBe("paused");
});
it("keeps recorded impacts in replay context and never offers live piloting instructions", () => {
  const feedback = flightFeedback({
    ...flight,
    replay: true,
    status: "crashed",
    replayComplete: true,
  });
  expect(feedback.tone).toBe("replay");
  expect(feedback.detail).not.toContain("Space");
});
it("uses the selected input and keeps loss-of-focus feedback until explicit resume", () => {
  expect(flightFeedback({ ...flight, keyboard: false }).detail).toContain(
    "throttle",
  );
  expect(flightFeedback({ ...flight, keyboard: false }).detail).not.toContain(
    "Space",
  );
  expect(
    flightFeedback({
      ...flight,
      started: true,
      pauseReason: "Controller disconnected",
    }).detail,
  ).toBe("Controller disconnected");
  expect(
    flightFeedback({
      ...flight,
      started: true,
      running: true,
      pauseReason: "Controller disconnected",
    }).detail,
  ).toBe("");
});
it.each(["crashed", "landed"])(
  "offers restart rather than resume after %s",
  (status) => {
    expect(flightAction({ ...ready, started: true, status })).toBe(
      "Restart flight",
    );
  },
);
it("distinguishes loaded, paused and completed recordings", () => {
  expect(flightAction({ ...ready, replay: true })).toBe("Play replay");
  expect(flightAction({ ...ready, replay: true, started: true })).toBe(
    "Resume replay",
  );
  expect(
    flightAction({
      ...ready,
      replay: true,
      started: true,
      replayComplete: true,
    }),
  ).toBe("Replay again");
});
