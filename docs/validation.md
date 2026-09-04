# Validation and model limits

## Automated checks

`npm run check` validates all bundled aircraft, runs unit/behavior tests, checks TypeScript and creates a production build. Tests cover:

- Invalid definitions, duplicate IDs and nonfinite parameters.
- Mass, CG, full inertia tensor and battery/span modifications.
- Gravity, lift and control-torque signs; angular damping.
- Level-flight trim for two materially different airframes.
- High-angle finite forces, quaternion normalization and ground contact.
- Timestep convergence during a pitch maneuver.
- Air-relative velocity in wind.
- Seeded repeatability and exact replay within the same environment.
- Recording versions, malformed frames and motor count mismatches.
- Custom controller axis order, asymmetric calibration, throttle, deadzone, expo and profile persistence.

These establish implementation consistency. They do not establish fidelity to the physical FT Bronco.

## Browser acceptance

Check the following when changing browser integration:

1. Initial model renders; launch advances telemetry; pause freezes simulation time; reset restores initial flight state.
2. Keyboard controls work immediately after launch. Form fields retain their editing behavior.
3. Aircraft changes update geometry, mass and CG. Switching examples and importing valid data work.
4. A scenario comparison produces two traces and exports become available.
5. Controller diagnostics handle no hardware cleanly and prevent launch with an absent selected controller.
6. Recordings load, play, terminate and reset back to the current design.
7. Focus loss pauses; model import errors leave the previous working aircraft available.
8. Desktop and narrow viewports keep the field and controls accessible.

## What is modeled

Rigid-body 6-DOF dynamics, uniform-box mass components, quasi-steady surface lift/drag/moments, approximate stall blend, control effectiveness, simple thrust response and speed falloff, rate damping, local wind/gusts, approximate axial propwash, and wheel contact with rolling/lateral friction.

## What is not modeled

Structural flexibility or failure, foamboard fold mechanics, CFD, Reynolds-number interpolation of airfoil tables, dynamic stall, validated wing/wake/downwash interactions, P-factor/gyroscopic effects, detailed electrical/thermal systems, suspension and tire deformation, radio latency or RF behavior, terrain collision beyond a flat plane, and validated real-aircraft flight characteristics.

Reference geometry is intentionally simplified. Visual meshes represent the same dimensions used in flight calculations, but are not manufacturing drawings. Component mass allocations are estimates even when the total reference mass is published.

## Evidence needed for improved fidelity

Measure assembled mass and CG, estimate or measure inertia, measure thrust against throttle/airspeed, obtain appropriate low-Reynolds-number aerodynamic polars, and compare trim speed, glide descent, stall onset and control response with recorded physical flights. Keep calibration data and uncertainty separate from implementation tests. Add regression cases when a model is calibrated.

The estimated Quad X adds upward rotor thrust, reaction torque, actuator lag and a simple internal angle/rate controller. Numerical reports and measured-CSV comparison are available; see `physics-validation.md`. JSBSim comparison, physical hardware verification and flight-test calibration remain future work. The browser Arduino serial bridge is implemented but has not been tested with a connected board. There is no claim that a browser rendering proves numerical accuracy or that simulated success predicts a safe real-world flight.

## Version 0.2 additions

Regression tests cover mass scaling, requested CG, optional gear mass, stationary wheel support, powered takeoff, gentle rolling touchdown, hard impact, and all three launch states. These are numerical behavior checks, not real flight calibration. The default Bronco uses an inverted-V/A-tail based on the supplied build image. Geometry and coefficients remain estimated. Tests check panel endpoint joins, symmetric pitch/differential yaw mixing, saturation, and yaw torque with motors removed.

Runway appearance uses a single weathered asphalt/paint surface with a three-metre photographic aggregate tile and painted markings. These are cosmetic material details; the runway remains a flat collision plane. Quad construction details are illustrative, and component masses and box-based inertia remain estimates unless supplied from measurements.

## Version 0.5 additions

Selectable field scenery, temperature/elevation density, surface friction, optional component principal inertia, tabulated motor thrust/current, a resistive battery with charge tracking, optional finite-wing polars, servo response/travel limits and directional body drag are now supported. The 6S quad demonstrates the electrical model with estimated data. See [component models](component-models.md) for equations, input conventions, example data and remaining limits. Terrain collision remains flat; visual improvements do not establish flight fidelity.

## Landscape rendering

Alpine and mesa shapes are derived from offline elevation tiles, with a deliberately flattened airfield and estimated surface materials. The photographic asphalt, paint, shoulders and markers are cosmetic. Surface friction still follows the selected scenery everywhere; hills, buildings, plants and markers have no collision. Real elevation sources do not establish physical flight-model accuracy. The data transformations, source coordinates, licenses and regeneration command are documented in [the scenery manifest](../public/scenery/README.md).
