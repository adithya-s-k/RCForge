# Component fidelity in RCForge 0.5

The schema remains aircraft format 1 with optional extensions. Simulation version 0.5.0 rejects recordings from earlier physics versions. These features support measured inputs; their existence does not make an aircraft flight-test calibrated.

## Mass, materials and inertia

`parts` is the single mass ledger. Battery/electronics definitions must reference existing components, never add their mass a second time. `massKg` remains authoritative. `material: { name, densityKgM3?, finish? }`, `manufacturer` and `model` describe the build. A coding agent can calculate mass from measured material density and actual material volume, but density is not multiplied by the bounding-box volume automatically: foamboard shells, composite laminates and electronics are not solid boxes. `finish` is descriptive metadata; it does not create stiffness or strength.

By default, local component inertia is a uniform cuboid derived from `sizeM`. Supply `inertiaDiagonalKgM2: [Ixx,Iyy,Izz]` for measured/CAD principal moments and `orientationDeg: [roll,pitch,yaw]` for the principal frame relative to the body (Rz Ry Rx). RCForge rotates the tensor then applies the parallel-axis theorem about the total CG. Position is the component CG, not a CAD mesh origin. Principal moments must be positive and satisfy the triangle inequalities. Total-mass edits scale supplied inertia; span edits discard affected structural-component inertia overrides and recalculate a box estimate. Material names alone never alter flight physics.

Component positions affect CG and torque arms in all three axes. The editor's Build & powertrain section exposes component masses, material descriptions and the calculated CG. The editor's longitudinal CG control moves the battery. The model is rigid; it does not simulate foam flex, carbon laminate failure, fastener failure or crush damage.

## Battery + motor/prop combination

See `aircraft/quad-x-6s.json` for a complete, deliberately **estimated** 650 g example. Its frame, ESC, flight controller, camera, video transmitter, receiver, wiring, hardware, battery and motors are distinct mass components.

A `battery` provides:

- `partId`: an existing battery mass component.
- `chemistry`, series `cells`, pack `capacityMah`, pack `resistanceOhm`, `initialSoc` (0–1), and `avionicsCurrentA`.
- `voltageCurve`: increasing `{soc, voltsPerCell}` samples spanning 0–1. Measure resting voltage versus remaining charge for the pack/cells.

Every motor then needs `performance` with `referenceVoltage`, `referenceDensityKgM3`, and `points: [{command, thrustN, currentA}]`. Include command endpoints 0 and 1, use strictly increasing commands and nondecreasing thrust/current, and start at zero thrust. `maxThrustN` must equal the final thrust sample. `model` and `propeller` describe the tested hardware; `responseSeconds` is actuator lag. The built-in controller outputs normalized motor commands; this is not Betaflight, PX4 or an ESC firmware emulator.

Interpolation supplies static thrust and current. At fixed command, the equivalent motor conductance is sum(Ibench/Vbench). Terminal voltage solves V = Voc − R I with avionics load included. Current scales linearly and thrust quadratically with terminal voltage relative to the bench voltage. Thrust also scales with air density. Charge integrates I dt / (capacityAh × 3600), is bounded to 0–1, and empty charge removes thrust. Battery state is included in recordings and reset restores initial charge. Aircraft mass does not decrease when a battery discharges.

This is a quasi-static resistive approximation, **not** electrochemical or thermal simulation. It has no RC polarization, battery ageing, ESC cutoff curve, discharge C-rating enforcement, winding temperature, regenerative current or transient bus model. Fixed-wing thrust still uses the existing simple forward-speed falloff; the model does not implement measured advance-ratio prop maps. Thrust edits rescale table thrust only and should be followed by new bench data for actual hardware changes. Validate the complete motor/prop/ESC/pack combination at relevant operating voltages.

Sources for the physical approach: [MathWorks equivalent-circuit model](https://www.mathworks.com/help/simscape-battery/ref/batteryequivalentcircuit.html); [UIUC propeller test database](https://m-selig.ae.illinois.edu/props/propDB.html). No curves from these sources have been copied into the example or claimed as measurements of it.

## Aerodynamics and servos

Optional surface `polar` samples are `{alphaDeg,cl,cd,cm}` in increasing angle order. Alpha is the geometric angle including incidence and equivalent control deflection, **not** shifted by `zeroLiftDeg`. Samples must describe total finite-wing coefficients at the intended Reynolds number (including induced drag). RCForge does not add its analytical induced drag on top of table drag. Outside the table, coefficients blend over 12 degrees into the existing approximate high-angle model. No Reynolds/Mach interpolation or unsteady stall is implemented. Unprovided polars retain the estimated analytic model. Lift and drag follow [NASA's aerodynamic force formulation](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/lift-equation/).

Optional control `responseSeconds` and `rateLimitDegS` model first-order servo response capped at physical travel speed. Actual deflections feed forces and animated surfaces; transient deflections survive replay. The Bronco and Tiny Trainer use explicitly estimated micro-servo parameters.

Optional `bodyDragAreaM2: [CdAx,CdAy,CdAz]` replaces scalar body drag with directional quadratic drag. Each component is a drag coefficient times projected area, not just geometric area. The 6S example uses estimates. Fixed-wing motors with `spin` specified also generate reaction roll torque from `torquePerThrustM` (CW/CCW viewed along the positive thrust axis); no propeller gyroscopic or P-factor model is provided.

## Scenery and environment

Northfield club, Alpine meadow and Desert mesa have distinct terrain, vegetation, sky/sun and runway surface. Their temperature/elevation presets calculate dry-air density from a standard pressure-versus-elevation atmosphere. Altitude in flight remains local AGL, not elevation above sea level. Density is uniform within each session; humidity, thermals, terrain wind and altitude-varying air density are not modeled. Wind/gust settings remain user controlled.

The selected surface changes rolling/lateral friction (estimated asphalt/grass/dirt coefficients). Collision is still a **flat field plane**, including outside the runway. Distant mountains, trees and buildings are visual scenery, not collidable terrain. Do not use these sites for slope-soaring or obstacle-clearance validation.

## Verification versus calibration

`npm run check` checks schema, component invariants, lookup interpolation, charge conservation, depleted thrust, density scaling, servo limits, directional drag, replay and existing aircraft behavior. `npm run physics:validate` produces an analytical/numerical report including circuit, charge and electrical-replay checks. Neither substitutes for measured trim, glide, stall, maneuvers and thrust/current comparison. Keep held-out flight data separate from coefficient fitting; use `npm run physics:compare` for aligned flight telemetry.
