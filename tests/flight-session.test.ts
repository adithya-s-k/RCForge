import { expect, it } from "vitest";
import { flightAction } from "../src/app/flight-session";
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
