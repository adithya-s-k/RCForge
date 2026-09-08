# Verifying equations and validating flight behavior

These are separate questions: **does the implementation solve the intended model consistently?** and **does that model reproduce a real vehicle?** RCForge currently has evidence for the first. A separate JSBSim suite now checks independent implementation agreement for matched subsystem cases. Real-flight calibration and complete hardware/controller verification remain pending.

## 1. Repeatable numerical verification

Run:

```sh
npm run check
npm run physics:validate
npm run physics:envelope
```

`physics:validate` discovers all `aircraft/*.json` files or accepts an aircraft ID/JSON path. It writes `results/validation/report.json` and `report.html`, including the simulator version and a SHA-256 digest of aircraft definitions. It checks equilibrium residuals, ten-second equilibrium drift at fixed battery SOC, recorded-input replay, timestep convergence against 480 Hz, an analytical free-fall case, analytical quadratic-drag descent, exact first-order actuator response, torque-free angular momentum/energy conservation, and yaw-coordinate invariance. A separately implemented 1 kHz RK4 integrator also compares airplane trajectories using the shared force model. Tests additionally cover force/control signs, mass/inertia, landing/takeoff, input normalization and multirotor control behavior.

The convergence reference and replay use the same implementation, so they detect integration/serialization problems, not shared errors in aerodynamic assumptions. The free-fall, quadratic drag and actuator cases compare against analytical solutions. RK4 agreement checks the integrator but does not independently validate aerodynamic coefficients. This report does not run the independent backend; that evidence lives in the separate reference report.

## 2. Independent model comparison

Run `npm run physics:reference` after installing its optional Python requirements. It executes native JSBSim against all bundled aircraft in reduced mass, aerodynamic, gravity, rotation and propulsion cases, plus native wind-axis examples. Read [Compare with JSBSim](physics-reference.md) for setup, tolerances, source references and explicit exclusions. The browser continues to use RCForge. Agreement checks implementation consistency under shared model assumptions; it does not establish the accuracy of estimated aircraft coefficients.

For actual flight-controller software, PX4 supports software-in-the-loop and hardware-in-the-loop integration with sensor/actuator messages: https://docs.px4.io/main/en/simulation/ . RCForge does not currently implement that bridge. It would need sensor models, timestamps, actuator interfaces and an explicit controller/backend selection.

### Published NASA rotation reference

This additional check uses externally published trajectories, rather than generating
the reference from RCForge's equations. It needs Node and network access for the
first download; subsequent runs use the verified local cache:

```sh
npm run physics:nasa -- --fetch
npm run physics:nasa
```

The command compares the torque-free **inertial body angular rates** from
[NASA NESC 2015 atmospheric case 02](https://nescacademy.nasa.gov/flightsim/2015/atmospheric/acc02)
over 30 seconds. The [published brick](https://nescacademy.nasa.gov/flightsim/2015/bodies)
supplies mass and principal inertias. Every one of the five published simulator
outputs is included; source URLs and SHA-256 checksums live in
`scripts/reference/nasa-sources.json`. Changed or incomplete data fails the check.
Downloads and the report stay in `results/validation/nasa/`, outside the app bundle.

The benchmark starts with inertial body rates of 10, 20 and 30 degrees/s. Its
slightly different published local roll rate includes Earth's rotation; comparing
that local value to RCForge's inertial angular rate would mix reference frames.
RCForge's flat world cannot reproduce the full rotating-Earth/J2 trajectory.
Translation and local Euler angles are deliberately outside this comparison.
This is a rotational-subsystem check, **not a full NASA check-case pass**.

On September 8, 2026, the maximum angular-rate vector error at RCForge's 120 Hz
step was 0.004668 degrees/s across all five datasets. The engineering limit is
0.01 degrees/s over this interval. Repeating at 240 Hz reduced the median maximum
error to about one quarter. Individual references disagree slightly: errors
against two datasets do not decrease with a smaller step. The report retains
those results instead of selecting only the closest reference. Both timestep
runs must stay within the absolute limit, and the median must decrease by at
least 30%. These are numerical tolerances, not a percentage of flight realism.

The JSON report records the exact definition, core source hashes, script hash,
source manifest and per-dataset errors. The independent-reference CI job runs
this check alongside JSBSim and retains both reports.

## 3. Measured flight comparison

Measure assembled mass, CG/inertia, thrust vs command, torque and response lag. Collect input histories and telemetry from controlled flights. Use separate flights for coefficient fitting and validation. Match initial state, coordinate conventions and wind; time-align measurements before comparing. Ground speed is not airspeed in wind.

```sh
npm run physics:compare -- path/to/recording.json path/to/measured.csv
```

CSV must have numeric `time,altitudeM,airspeedMps,rollDeg,pitchDeg` columns (seconds, meters, m/s, degrees) using the same time origin and coordinate conventions as the recording. Timestamps must increase. The tool re-simulates recorded inputs, interpolates samples and reports RMSE and maximum absolute error. It does not fit coefficients, align time automatically, impose universal acceptance thresholds, or certify fidelity. Set tolerances from sensor uncertainty and the intended use case.

The comparison tool was smoke-tested with simulator-exported CSV. That tests the comparison plumbing and is **not measured-flight validation**. No measured log is bundled or implied.

## 4. Full user/hardware path

Verify transmitter → USB adapter → browser axis mapping → calibration → controls → controller/mixer → motor/surface dynamics → rigid-body state → telemetry/replay. Record the device/OS/browser combination. Then verify the visual/camera response separately. Attractive rendering is not evidence of physical accuracy.

### Browser timing and input

Flight time used to be capped at 50 ms per browser callback. At 15 callbacks/s,
that advanced only 0.75 simulated seconds per real second, making falls and
controls appear slow even when the core gravity calculation was correct.
The fixed-step clock now accounts for elapsed time without stretching the physics
step. A gap over 250 ms pauses flight visibly and requires explicit resume.

`tests/flight-clock.test.ts` checks synthetic 10–144 FPS callback schedules,
jitter, pause/resume and invalid timestamps. All nine presets follow identical
three-second trajectories at synthetic 15 and 60 FPS; the F-22 servo preview also
matches across rates. These are scheduling tests, not a GPU performance benchmark.
No gravity constant or aircraft coefficient was adjusted to hide the timing bug.
Recorded controls still use the same core step, so simulation version 0.8.1 remains
compatible.

`tests/input-flight-pipeline.test.ts` sends keyboard events and CRC-protected
PPM/PWM serial packets through the real input decoder, mapping, response filter,
trim, servos, motors, rigid-body integration and recording/replay. It checks yaw
direction, focus loss, STOP, timeout and recovery without automatic resume.
The serial port and browser event targets are software test doubles. Physical
receiver wiring, USB timing, transmitter failsafe and hardware calibration remain
unverified; receiver PPM/PWM still needs a successful hardware test.

Expanded verification runs in CI through `npm run physics:validate`. Current reports remain reproducible snapshots tied to definition hashes; their passing status is not an aerodynamic calibration label. The assumed surface polars, stall blend, propwash, thrust/speed curves and contact properties remain the largest gaps.

Version 0.5 also checks the resistive battery circuit against V = Voc − IR, one-step coulomb counting, and deterministic electrical-state replay for every electrical definition. A declining battery is deliberately not treated as a constant-throttle hover equilibrium. These checks validate the implemented approximation, not the bench curves.

## Operating-point survey

`npm run physics:envelope` discovers all bundled aircraft. Use
`npm run physics:envelope -- aircraft/my-aircraft.json` for a custom build.
It writes `results/validation/envelope.json` and `envelope.html`, including
component properties, definition hashes, source evidence, trim results and polar
coverage across atmospheres, mass changes, speed and battery charge. Untrimmed
points are visible; the command does not treat them as test failures or claim
that a converged point is dynamically stable. Nonfinite load cases do fail it.
See [the realism plan](realism-plan.md) for the sweep definitions and limits.
