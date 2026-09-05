# Validation and model limits

## Current compatibility

Simulation 0.7.1 corrects accumulated contact impulses. Existing aircraft format-1
files remain compatible. Earlier recordings are rejected because contact
trajectories change; use their original engine version or record a fresh flight.
See [the contact correction](component-models.md#contact-correction-071).

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
9. In Pilot and Chase, aircraft shadows persist beyond the runway and after placement changes. Check low passes at north 120 m, east offsets, climbing above 60 m, all three sun directions, and returning to the studio. The shadow must stay aligned with the sun rather than being pinned directly below the aircraft.

## What is modeled

Rigid-body 6-DOF dynamics, uniform-box mass components, quasi-steady surface lift/drag/moments, approximate stall blend, control effectiveness, simple thrust response and speed falloff, rate damping, local wind/gusts, approximate axial propwash, and wheel contact with rolling/lateral friction.

## What is not modeled

Structural flexibility or failure, foamboard fold mechanics, CFD, automatic conversion of section polars into finite-wing data, dynamic stall, validated wing/wake/downwash interactions, P-factor/gyroscopic effects, detailed electrical/thermal systems, suspension and tire deformation, radio latency or RF behavior, terrain collision beyond a flat plane, and validated real-aircraft flight characteristics.

Reference geometry is intentionally simplified. Visual meshes represent the same dimensions used in flight calculations, but are not manufacturing drawings. Component mass allocations are estimates even when the total reference mass is published.

## Known FT-22 handling limit

The plan-reconstructed FT-22 currently needs high modeled elevon trim for its
hand-launch equilibrium. An uncorrected full-power step can produce repeated
pitch excursions and impact. This remains an uncalibrated aerodynamic limitation,
not evidence that the physical FT-22 behaves that way. See the reproducible
[trim and power-response review](flite-test-reconstruction.md#ft-22-trim-and-power-response-review).
The workbench now identifies high pitch trim and failed trim solves; it does not
add artificial stabilization to conceal them.

## Evidence needed for improved fidelity

Measure assembled mass and CG, estimate or measure inertia, measure thrust against throttle/airspeed, obtain appropriate low-Reynolds-number aerodynamic polars, and compare trim speed, glide descent, stall onset and control response with recorded physical flights. Keep calibration data and uncertainty separate from implementation tests. Add regression cases when a model is calibrated.

The estimated Quad X adds upward rotor thrust, reaction torque, actuator lag and a simple internal angle/rate controller. Numerical reports and measured-CSV comparison are available; see `physics-validation.md`. JSBSim comparison, physical hardware verification and flight-test calibration remain future work. The browser Arduino serial bridge is implemented but has not been tested with a connected board. There is no claim that a browser rendering proves numerical accuracy or that simulated success predicts a safe real-world flight.

## Version 0.2 additions

Regression tests cover mass scaling, requested CG, optional gear mass, stationary wheel support, powered takeoff, gentle rolling touchdown, hard impact, and all three launch states. These are numerical behavior checks, not real flight calibration. The default Bronco uses an inverted-V/A-tail based on the supplied build image. A separate conventional preset uses the sheet-3 H-tail, two fixed fins, one elevator servo and differential motor yaw; it is not a rudder-equipped digital twin. Geometry and coefficients remain estimated. Tests check panel endpoint joins, symmetric pitch/differential yaw mixing, saturation, and yaw torque with motors removed.

Runway appearance uses a single weathered asphalt/paint surface with a three-metre photographic aggregate tile and painted markings. These are cosmetic material details; the runway remains a flat collision plane. Quad construction details are illustrative, and component masses and box-based inertia remain estimates unless supplied from measurements.

## Version 0.5 additions

Selectable field scenery, temperature/elevation density, surface friction, optional component principal inertia, tabulated motor thrust/current, a resistive battery with charge tracking, optional finite-wing polars, servo response/travel limits and directional body drag are now supported. The 6S quad demonstrates the electrical model with estimated data. See [component models](component-models.md) for equations, input conventions, example data and remaining limits. Terrain collision remains flat; visual improvements do not establish flight fidelity.

## Landscape rendering

Alpine and mesa shapes are derived from offline elevation tiles, with a deliberately flattened airfield and estimated surface materials. The photographic asphalt, paint, shoulders and markers are cosmetic. Surface friction still follows the selected scenery everywhere; hills, buildings, plants and markers have no collision. Real elevation sources do not establish physical flight-model accuracy. The data transformations, source coordinates, licenses and regeneration command are documented in [the scenery manifest](../public/scenery/README.md).

## Version 0.6 additions

Reynolds-dependent finite-wing tables and temperature-dependent viscosity are
supported, with explicit data-coverage diagnostics. Nine regression cases cover
interpolation, angular fallback, invalid data, local-flow loads, geometry edits,
viscosity and replay. `physics:validate` discovers every aircraft definition and
accepts an ID/path; its equilibrium checks hold SOC fixed while separate cases
verify depletion. `physics:envelope` surveys speed, density, mass and charge and
reports unsuccessful trim points. Neither command is measured-aircraft validation.
See the [research and implementation plan](realism-plan.md) for prioritized work
and the evidence needed before increasing fidelity claims.

## Version 0.7 actuator changes

Linked servo components constrain surface speed and travel through the configured
horn ratio. The first step no longer jumps an uninitialized servo straight to its
target. Trimmed launch states include servo positions. Tests cover rate limits,
travel geometry, component mass changes, invalid references and deterministic
replay. These are numerical checks of a rigid no-load linkage approximation, not
servo bench validation or calibrated FT-22 handling. Older simulation recordings
are rejected; aircraft JSON remains schema version 1.

The 0.7 component catalog and editor copy actual physical fields into each aircraft,
with catalog replacements tested for mass/CG/inertia, servo rate and motor/prop
accounting. All bundled aircraft include consumption; the plane and basic-quad
current curves remain induced-power estimates. Manufacturer samples in the larger
quad cover a specific prop and voltage only, with command mapping still estimated.
Numerical pass counts therefore do not establish battery endurance or handling
accuracy. Constant-supply trim tests and discharge tests exercise different claims.

## FPV and input response

An FPV view is an ideal perspective projection, without lens distortion or a video-link model. Installing a camera changes component mass properties, but does not automatically supply its drag, electrical load or collision geometry. Gentle rates reduce pilot sensitivity and authority; they do not stabilize a fixed-wing aircraft or resolve an inadequate aerodynamic model. The control bench reproduces the simulated servo/linkage response without actual hardware, hinge loads or airframe motion. See [setup and verification](fpv-and-control-setup.md).

## Vortex RC Simple Trainer

The [Vortex trainer reconstruction](vortex-simple-trainer.md) distinguishes
published dimensions/totals from proportional geometry, component and aerodynamic
estimates. The product CG wording is ambiguous; the 58 mm wing-relative station
is provisional. Its 9 m/s starting trim is an authored operating choice. A
power-off experiment without landing input still ends in impact. Numerical
control, ground-rest, takeoff, glide, servo and replay checks are not real-flight
validation. Existing recordings retain their recorded state and controls; the
new optional reference speed changes initialization only, not dynamics formulas
or simulation version 0.7.1.

## Bronco assembly variants

The [reconstruction guide](flite-test-reconstruction.md) records the raised wing,
conventional tail tracing, separate mass ledgers and survey limits. Regression
checks cover lateral balance after removing one tail servo, wing-to-saddle
clearance in the rendered geometry, tail orientation and positive control signs.
The conventional variant retains the published shared 830 g reference using
estimated allocations; no independently weighed conventional build or measured
flight data is available. Passing these checks does not validate the aerodynamic
coefficients or certify the physical assembly.
