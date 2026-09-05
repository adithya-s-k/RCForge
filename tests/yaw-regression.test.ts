import { readdirSync, readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { parseAircraft } from "../src/core/schema";
import {
  aircraftChannels,
  keyboardTurnAxis,
} from "../src/app/aircraft-channels";
import {
  PilotResponseFilter,
  responseSettings,
  withPitchTrim,
} from "../src/core/pilot-response";
import { findTrim } from "../src/core/trim";
import { Simulation, calmEnvironment } from "../src/core/simulation";
import { euler } from "../src/core/math";
import { mapGamepad, defaultProfile } from "../src/input/controls";
import { keyboardDiagram } from "../src/view/keyboard-diagram";

const folder = new URL("../aircraft/", import.meta.url);
const aircraft = readdirSync(folder)
  .filter((f) => f.endsWith(".json"))
  .map((f) =>
    parseAircraft(JSON.parse(readFileSync(new URL(f, folder), "utf8"))),
  );

it.each(aircraft.filter((a) => aircraftChannels(a).includes("yaw")))(
  "$name: both yaw directions survive mapping, response, servos and integration",
  (a) => {
    const trim = findTrim(a);
    expect(trim.converged).toBe(true);
    const headings: number[] = [];
    for (const direction of [-1, 0, 1]) {
      const sim = new Simulation(a, calmEnvironment(), trim.state);
      const filter = new PilotResponseFilter();
      // Nonstandard hardware axis order, then the same shaping used in flight.
      const profile = defaultProfile("yaw-regression");
      profile.bindings.yaw.axis = 0;
      profile.bindings.roll.axis = 2;
      const mapped = mapGamepad([direction * 0.35, 0, 0, 0], profile);
      for (let i = 0; i < 90; i++) {
        let command = withPitchTrim(
          filter.step(
            { ...mapped, throttle: trim.controls.throttle },
            responseSettings({ ...responseSettings(), preset: "standard" }),
            1 / 120,
          ),
          a.vtol ? 0 : trim.controls.pitch,
        );
        if (a.vtol)
          command = {
            ...command,
            throttle: 0.5,
            vtol: { mode: "hover", assistance: "intermediate" },
          };
        sim.step(command);
      }
      expect(sim.state.status).toBe("flying");
      expect(sim.state.orientation.every(Number.isFinite)).toBe(true);
      headings.push(euler(sim.state.orientation)[2]);
    }
    expect(headings[0]).toBeLessThan(headings[1] - 0.001);
    expect(headings[2]).toBeGreaterThan(headings[1] + 0.001);
  },
);

it.each(aircraft)(
  "$name: keyboard diagrams match installed control authority",
  (a) => {
    const channels = aircraftChannels(a);
    const axis = keyboardTurnAxis(a);
    const diagram = keyboardDiagram({
      turnAxis: axis,
      yaw: channels.includes("yaw"),
      vtol: !!a.vtol,
    });
    expect(diagram.includes("<title>→: Yaw R</title>")).toBe(
      !channels.includes("roll") && channels.includes("yaw"),
    );
    expect(diagram.includes("<title>E: Yaw R</title>")).toBe(
      channels.includes("yaw"),
    );
    expect(diagram.includes("VTOL mode")).toBe(!!a.vtol);
    expect(diagram.includes("Hover 50%")).toBe(!!a.vtol);
  },
);
