# Building a credible RC flight engine

Original research and implementation review: September 5, 2026, RCForge 0.6.
The implementation and verification snapshots below are preserved as that baseline.
RCForge 0.7.1 additionally has component replacement, individual servo/linkage
models, battery-consumption comparisons, revised FT reconstructions and corrected
ground-contact impulses. See [current component contracts](component-models.md),
[model limits](validation.md) and the [iteration record](improvement-session.md).
The measurement and independent-validation work below remains outstanding.

The target is a useful, testable model of a specified aircraft and operating range.
There is no single percentage of realism. Good rigid-body integration, correct
geometry, convincing scenery, and agreement with measured flights are separate
claims and need separate evidence.

## What other simulators teach us

| Reference                                                                                                                                                                       | Useful approach                                                                                                            | RCForge decision                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [X-Plane's force model](https://www.x-plane.com/desktop/how-x-plane-works/)                                                                                                     | Resolve airflow and loads at multiple elements; include angular velocity and propwash.                                     | Keep local surface forces and CG-relative moments. Add spanwise resolution and wake coupling only with convergence and measured-response checks. More elements alone do not fix poor coefficients.                          |
| [JSBSim](https://github.com/JSBSim-Team/jsbsim)                                                                                                                                 | Separate data-defined aircraft from the dynamics engine; maintain reproducible verification cases.                         | Keep the pure TypeScript core, explicit aircraft/recording contracts, and headless tests. A later backend comparison must match axes, inputs, force models and integration conditions. We have not run JSBSim comparisons.  |
| [UIUC airfoil measurements](https://m-selig.web.engr.illinois.edu/pd.html) and [model-aircraft propeller measurements](https://m-selig.web.engr.illinois.edu/props/propDB.html) | Small-aircraft performance depends on operating conditions, including Reynolds number and propeller advance speed.         | Accept condition-dependent data; keep its source, geometry, test conditions and uncertainty. A generic airfoil or similarly sized prop is not a calibration of a foamboard build. Respect dataset attribution requirements. |
| [FlightGear vegetation](https://wiki.flightgear.org/Random_Vegetation) and [scenery LOD](https://wiki.flightgear.org/Scenery_LoD)                                               | Use varied vegetation atlases on crossed cards and allocate scene detail by distance. Texture padding matters for mipmaps. | Replace the bright-edged atlas, use multiple silhouettes in groves, and concentrate existing terrain vertices closer to the flying area. Keep instancing and fixed render budgets.                                          |
| [Three.js material filtering](https://threejs.org/docs/pages/Material.html)                                                                                                     | Alpha-to-coverage smooths cutouts in an MSAA context; hashed alpha introduces noise that benefits from temporal filtering. | Keep depth-writing alpha-tested foliage with alpha-to-coverage. Avoid adding temporal noise or a TAA pipeline to this lightweight renderer.                                                                                 |

These references guide engineering choices, not an endorsement of RCForge or a
claim that one simulator's marketing comparison proves its physical accuracy.

## Implemented in this revision

**Aerodynamic data across speed and atmosphere.** Surfaces may supply
`reynoldsPolars`: sourced finite-wing CL/CD/CM tables at multiple Reynolds
numbers. The core computes Re from local in-plane airspeed, chord and kinematic
viscosity, interpolates in angle and log(Re), and reports out-of-data operation.
The atmosphere now supplies viscosity using [Sutherland's dry-air law](https://www.grc.nasa.gov/www/k-12/airplane/viscosity.html).
Single polars and analytical estimates remain supported. No built-in aircraft
has been relabeled as flight calibrated, and no generic airfoil data was silently
substituted for its current model.

**Extension verification.** `physics:validate` discovers all bundled JSON files,
or accepts explicit aircraft IDs/paths. All electrical definitions get circuit,
charge and replay checks. Vacuum test fixtures explicitly remove directional
drag and batteries. Equilibrium and the separate RK4 comparison hold SOC fixed;
transient battery depletion is checked separately.

**Operating-point survey.** `physics:envelope` writes an HTML/JSON report with
source evidence and definition hashes. It surveys three field atmospheres and
80/100/120% mass. Airplanes use 6/9/12/16/22 m/s; quads use hover, including
100/50/15% SOC where a battery exists. This uniformly scales the mass ledger and
inertia; it does not substitute a real battery or move CG. Failed trim and table
coverage are visible. High-angle finite-load checks are separate from trim.
This is not a certified operating envelope, a stability test, or flight evidence.

**Scenery.** Six new alpha silhouettes replace the previous atlas. Three crossed
cards per plant, species variation, irregular groves and small static contact
shadows improve scale and grounding. Ground colour variation is less cloudy;
hills use asymmetric ridges, redistributed mesh samples and filtered strata.
The surface remains physically flat. Trees and mountains are still visual,
not collidable objects. There is no additional shadow-map pass or postprocessing.

## Next work, in order

| Priority | Work                                                                                                                                               | Acceptance evidence                                                                                                                                                                                                                |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1        | Measure one Bronco or Trainer and one quad completely: BOM, assembled mass, CG, principal inertia, control throws, trim and actual radio response. | Publish raw measurements, method, units, repeatability and uncertainty. Reproduce the mass ledger without double-counting.                                                                                                         |
| 2        | Motor/prop/battery maps versus command, voltage, RPM and airspeed.                                                                                 | Bench static thrust/current plus forward-flow data; verify interpolation and power balance. Compare sag and endurance at multiple charge levels. Current fixed-wing speed falloff is still approximate.                            |
| 3        | Finite-wing aerodynamic tables across Reynolds number, angle and control deflection.                                                               | Match the built wing and tail, including roughness and hinge geometry. Distinguish measured 2-D section data from finite-wing data; document any conversion and induced drag. Validate trim and glide before stall/spin claims.    |
| 4        | Spanwise forces, downwash and asymmetric propwash, then carefully bounded ground effect.                                                           | Compare increasing element counts, geometry/control signs, power-off glides and powered maneuvers. Revisit empirical damping to avoid double-counting damping now produced by distributed loads.                                   |
| 5        | Quad dynamic inflow, induced power, translational effects and actuator allocation.                                                                 | Thrust/torque/RPM transients, climb/descent and lateral-flight logs. A simple angle/rate controller is not Betaflight. Firmware SITL and sensor/latency models need their own contracts and evidence.                              |
| 6        | Shared terrain/contact model.                                                                                                                      | One height/normal/material query for wheels, placement, observer height, AGL, minimap and shadows. Validate slopes, touchdown and runway-to-grass friction transitions together. Do not add visual bumps that wheels pass through. |
| 7        | Independent comparison and held-out flight data.                                                                                                   | Run the same physical inputs in a second implementation; then compare flights excluded from parameter fitting. Record bias, RMSE, maximum error, uncertainty and repeatability per maneuver.                                       |

The current sinusoidal gusts are deterministic disturbances, not a validated
turbulence spectrum. Thermals, terrain wind, dynamic stall, spins, rotor vortex
ring state, flexible structures and damage need separate models. Adding a name
or a coefficient without test evidence would not establish those effects.

## A new aircraft's acceptance workflow

1. Reconstruct assembled geometry from plans and build references. Define datum,
   axes and units. Record sourced, measured/calibrated and estimated groups.
2. Enter the component mass ledger, measured CG/inertia where available, actual
   propulsion combinations and control geometry. A material name does not infer
   mass, flex or failure strength.
3. Run the commands below. Investigate wrong control signs, missing trim,
   nonfinite forces and failed convergence. Do not widen thresholds simply to
   produce a passing report.
4. Fly ground, hand-launch where applicable, and airborne starts. Check pilot
   and chase views, power cutoff, reset, input loss, and modified CG/mass.
5. Fit only against a named calibration dataset. Use separate flights to test
   climb, glide, level flight, stall approach and control pulses at several
   speeds and charge levels. Compare with `physics:compare` after aligning time,
   axes, airspeed versus groundspeed, and altitude reference.
6. Publish the supported operating range and errors. Outside it, retain an
   explicit estimate/unsupported label. Simulator proficiency alone is not
   evidence that an unfamiliar real aircraft can be flown safely.

```sh
npm run aircraft:validate -- aircraft/my-aircraft.json
npm run physics:validate -- aircraft/my-aircraft.json
npm run physics:envelope -- aircraft/my-aircraft.json
npm run simulate -- aircraft/my-aircraft.json --scenario pitch-pulse --duration 5
```

The two physics report commands without a file discover the bundled aircraft. Results live under
`results/validation/` and should accompany a model-review discussion. See
[component input conventions](component-models.md), [aircraft authoring](aircraft-authoring.md),
and [measurement comparison](physics-validation.md).

## Keeping the browser practical

Retain the 2.1-million-pixel drawing-buffer cap, maximum 1.25 pixel ratio,
1024² shadow map and independent 120 Hz dynamics. Terrain still has 128×128
segments. The new foliage atlas is a single 1536×1024 RGBA image, about 2.7 MB on
disk and 8 MiB with GPU mipmaps; it replaces the old runtime atlas. This is a
deliberate texture-memory increase for better silhouettes, not zero-cost detail.
Species batches add a few draw calls; static contact shading adds one. No runtime
AI requests, external scenery services or new rendering dependencies are used.

Measure frame time on an actual modest laptop before increasing vegetation,
shadows or terrain detail further. Browser screenshots establish visual behavior,
not a portable frame-rate guarantee.

## Verification snapshot for this revision

- `npm run check`: all five bundled definitions, 133 tests in 22 files, TypeScript
  and production build passed. The existing large Three.js bundle warning remains.
- `physics:validate`: 55 checks passed across all five aircraft. Explicit JSON-path
  invocation was also exercised with the electrical quad.
- `physics:envelope`: 171 operating points, 108 solved trim points, zero nonfinite
  load cases. The 63 unsolved points remain visible in the report. An explicit
  Trainer ID invocation was also checked.
- Browser: Bronco and Tiny Trainer, three scenery presets, Pilot/Chase views,
  Space throttle, pitch input, pause/reset, editor apply, 20-second experiment
  output, and missing-gamepad/keyboard recovery. Controllers were inspected at
  390 × 844 as well as desktop size. No physical transmitter or Arduino was used.
- Documentation links, npm commands and formatting passed automated checks.

This snapshot is numerical and UI evidence only. It is not an independent
flight-model comparison, GPU benchmark or measured-flight validation.
