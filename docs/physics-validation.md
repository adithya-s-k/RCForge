# Verifying equations and validating flight behavior

These are separate questions: **does the implementation solve the intended model consistently?** and **does that model reproduce a real vehicle?** RCForge currently has evidence for the first. Real flight, independent-backend agreement and physical hardware checks remain pending.

## 1. Repeatable numerical verification

Run:

```sh
npm run check
npm run physics:validate
```

The second command writes `results/validation/report.json` and `report.html`, including the simulator version and a SHA-256 digest of aircraft definitions. It checks equilibrium residuals, ten-second equilibrium drift, recorded-input replay, timestep convergence against 480 Hz, an analytical free-fall case, analytical quadratic-drag descent, exact first-order actuator response, torque-free angular momentum/energy conservation, and yaw-coordinate invariance. A separately implemented 1 kHz RK4 integrator also compares airplane trajectories using the shared force model. Tests additionally cover force/control signs, mass/inertia, landing/takeoff, input normalization and multirotor control behavior.

The convergence reference and replay use the same implementation, so they detect integration/serialization problems, not shared errors in aerodynamic assumptions. The free-fall, quadratic drag and actuator cases compare against analytical solutions. RK4 agreement checks the integrator but does not independently validate aerodynamic coefficients. The report explicitly records external validation as pending.

## 2. Independent model comparison

Build the same mass/inertia, geometry, propulsion and force-model case in a second implementation, then run matched input histories. JSBSim documents a six-degree-of-freedom flight dynamics formulation: https://jsbsim-team.github.io/jsbsim-reference-manual/formulation/equations-of-motion/ . Agreement requires equivalent model assumptions; installing an engine does not provide a trustworthy aircraft model.

For actual flight-controller software, PX4 supports software-in-the-loop and hardware-in-the-loop integration with sensor/actuator messages: https://docs.px4.io/main/en/simulation/ . RCForge does not currently implement that bridge. It would need sensor models, timestamps, actuator interfaces and an explicit controller/backend selection.

## 3. Measured flight comparison

Measure assembled mass, CG/inertia, thrust vs command, torque and response lag. Collect input histories and telemetry from controlled flights. Use separate flights for coefficient fitting and validation. Match initial state, coordinate conventions and wind; time-align measurements before comparing. Ground speed is not airspeed in wind.

```sh
npm run physics:compare -- path/to/recording.json path/to/measured.csv
```

CSV must have numeric `time,altitudeM,airspeedMps,rollDeg,pitchDeg` columns (seconds, meters, m/s, degrees) using the same time origin and coordinate conventions as the recording. Timestamps must increase. The tool re-simulates recorded inputs, interpolates samples and reports RMSE and maximum absolute error. It does not fit coefficients, align time automatically, impose universal acceptance thresholds, or certify fidelity. Set tolerances from sensor uncertainty and the intended use case.

The comparison tool was smoke-tested with simulator-exported CSV. That tests the comparison plumbing and is **not measured-flight validation**. No measured log is bundled or implied.

## 4. Full user/hardware path

Verify transmitter → USB adapter → browser axis mapping → calibration → controls → controller/mixer → motor/surface dynamics → rigid-body state → telemetry/replay. Record the device/OS/browser combination. Then verify the visual/camera response separately. Attractive rendering is not evidence of physical accuracy.

Expanded verification runs in CI through `npm run physics:validate`. Current reports remain reproducible snapshots tied to definition hashes; their passing status is not an aerodynamic calibration label. The assumed surface polars, stall blend, propwash, thrust/speed curves and contact properties remain the largest gaps.

Version 0.5 also checks the resistive battery circuit against V = Voc − IR, one-step coulomb counting, and deterministic electrical-state replay using the 6S example. A declining battery is deliberately not treated as a constant-throttle hover equilibrium. These checks validate the implemented approximation, not the bench curves.
