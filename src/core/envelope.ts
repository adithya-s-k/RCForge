import type { Aircraft } from "./schema";
import { massProperties } from "./aircraft";
import { findTrim } from "./trim";
import {
  Simulation,
  calmEnvironment,
  initialState,
  neutralControls,
} from "./simulation";
import { sceneries, airDensity, airKinematicViscosity } from "./scenery";
import { powertrain } from "./powertrain";

/** An operating-point survey, not a calibrated flight envelope or a stability proof. */
export function surveyEnvelope(aircraft: Aircraft) {
  const points = [];
  for (const [site, profile] of Object.entries(sceneries)) {
    const density = airDensity(profile.temperatureC, profile.elevationM);
    const environment = {
      ...calmEnvironment(),
      densityKgM3: density,
      kinematicViscosityM2S: airKinematicViscosity(
        profile.temperatureC,
        density,
      ),
    };
    for (const massScale of [0.8, 1, 1.2]) {
      const a = structuredClone(aircraft);
      a.parts.forEach((p) => {
        p.massKg *= massScale;
        if (p.inertiaDiagonalKgM2)
          p.inertiaDiagonalKgM2 = p.inertiaDiagonalKgM2.map(
            (v) => v * massScale,
          ) as [number, number, number];
      });
      const socs = a.battery ? [1, 0.5, 0.15] : [undefined];
      for (const soc of socs) {
        if (a.battery && soc !== undefined) a.battery.initialSoc = soc;
        for (const speed of a.vehicleType === "multirotor"
          ? [0]
          : a.vtol
            ? [0, 9, 12, 14, 16, 22]
            : [6, 9, 12, 16, 22]) {
          const trim = findTrim(
            a,
            speed,
            environment,
            0,
            a.vtol && speed > 0 ? "cruise" : "hover",
          );
          const sim = new Simulation(a, environment, trim.state);
          const force = sim.forces(sim.state, trim.controls);
          const power = powertrain(a, sim.state.motors, soc, density);
          points.push({
            site,
            massScale,
            massKg: sim.properties.mass,
            soc: soc ?? null,
            speedMps: speed,
            mode: a.vtol ? (speed === 0 ? "hover" : "cruise") : a.vehicleType,
            densityKgM3: density,
            trimmed: trim.converged,
            residual: Math.hypot(...trim.residual),
            throttle: trim.controls.throttle,
            pitchDeg: trim.pitchDeg,
            voltage: power.voltage,
            currentA: power.current,
            surfaces: force.surfaces.map((s) => ({
              id: s.id,
              reynolds: s.reynolds,
              source: s.coefficientSource,
              outsideData: s.outsidePolarEnvelope,
              stalled: s.stalled,
            })),
          });
        }
      }
    }
  }
  // Cover backward flight and large angles separately from the trim solver.
  // These are finite-value checks only: a finite result is not an accurate stall model.
  let nonfiniteLoads = 0;
  const sim = new Simulation(aircraft);
  for (const speed of [0, 5, 15, 30])
    for (const angle of [-180, -90, -30, 0, 30, 90, 180]) {
      const state = initialState(aircraft, speed, 100, angle);
      const f = sim.forces(state, neutralControls());
      if (![...f.force, ...f.torque].every(Number.isFinite)) nonfiniteLoads++;
    }
  return {
    aircraft: aircraft.id,
    properties: massProperties(aircraft),
    coefficientEvidence: aircraft.provenance,
    scope:
      "Sensitivity survey. Untrimmed points are reported, not suppressed. No measured flight-data validation.",
    nonfiniteLoads,
    points,
  };
}
