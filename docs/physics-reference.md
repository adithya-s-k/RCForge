# Verify RCForge against JSBSim

Run a separate flight-dynamics implementation against the same physical test
definitions. This checks RCForge's equations, axes, units and integration without
replacing its TypeScript engine or adding a browser dependency.

**What a pass means:** the implementations agree within the stated tolerances for
the matched cases. They share aircraft parameter estimates and modeling assumptions.
Agreement does not show that those estimates reproduce a real aircraft. Ground
contact, the browser clock and complete flight controllers are outside this suite.

## Run the comparison

Use Node/npm as described in the README and Python 3.12 or later. Python and
JSBSim are only needed for this development check. The simulator itself still
runs without them.

```sh
npm ci
python3 -m venv results/reference/.venv
results/reference/.venv/bin/python -m pip install -r scripts/reference/requirements.txt
npm run physics:reference
```

On Windows, create the same environment and use its Python executable:

```sh
python -m venv results/reference/.venv
results/reference/.venv/Scripts/python.exe -m pip install -r scripts/reference/requirements.txt
npm run physics:reference -- --python results/reference/.venv/Scripts/python.exe
```

`--python` or `RCFORGE_REFERENCE_PYTHON` can select an existing environment with
the pinned requirements. Missing JSBSim, the wrong version, timeouts, malformed
output and incomplete coverage fail the command. It never silently skips the
reference check or falls back to RCForge's own answers.

Open `results/validation/reference/report.html` to inspect each comparison. The
folder also contains JSON reports, exact requests, both JSBSim result sets,
generated XML and diagnostic logs. All are local generated artifacts, ignored by
Git. A separate CI job runs the same comparison and retains the reports.

## How the implementations stay independent

```text
Aircraft JSON + explicit initial conditions
                   |
         +---------+----------+
         |                    |
   RCForge TypeScript    Independent Python adapter
   mass + force model    component quadrature + JSBSim XML
         |                    |
   midpoint / 120 Hz     native JSBSim / 3840 Hz
         |                    |
         +-------- compare ---+
                   |
       errors + limits + provenance
```

The adapter does not import RCForge, receive its calculated CG/inertia, consume
its forces or use its trajectories as reference inputs. It receives normalized
definitions and explicit test conditions. Its generated force equations and
tables are evaluated by native JSBSim, which also assembles moments about CG and
integrates the rigid-body motion.

Both implementations deliberately use the same simplified aerodynamic model for
the bundled-airframe comparisons. Independently implementing the same equations
detects coding and coordinate errors; it cannot discover that a shared lift slope
or stall approximation is physically inaccurate. Two additional synthetic-wing
cases use JSBSim's **native wind-axis aerodynamics** and angle-of-attack calculation,
separately from the adapter's body-force expressions.

The numerical tests of the report parser use synthetic results and make no
independent-engine claim. The `physics:reference` command and its CI job execute
the real JSBSim library on every run.

## What is compared

The command discovers every `aircraft/*.json` file. Each definition produces six
explicit subsystem cases; two synthetic native-wing cases supplement them.

| Case                  | Compared behavior                                                                                                                                                                                                                                    | Deliberate exclusions                                                                       |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Airframe load sweep   | All installed aerodynamic surfaces, local rotational flow, rotated NED wind, signed control endpoints and combined mixing/linkage travel, stall blend, body drag, damping and CG-relative moments; 6/12/22 m/s at nine angles including reverse flow | Motors off; steady surface positions; analytical coefficients only                          |
| Ballistic motion      | Four seconds of gravity and translation with a rotated initial attitude                                                                                                                                                                              | Aerodynamics, propulsion, contacts                                                          |
| Free tumble           | Four seconds of asymmetric rotation using the full inertia tensor, including cross terms                                                                                                                                                             | Aerodynamics, propulsion, contacts                                                          |
| Power-off motion      | Two seconds of aerodynamic motion under gravity with a nonzero attitude and steady controls                                                                                                                                                          | Powered wake, actuator transients, flight controllers                                       |
| Moved component       | Battery translation/rotation and explicit principal inertia; total mass, CG and full inertia tensor                                                                                                                                                  | No claim about a measured battery's inertia                                                 |
| Propulsion load sweep | Native table interpolation, voltage sag, empty battery, unequal rotor commands, forward-speed thrust falloff, spin reaction moments and VTOL front/rear tilt; 48 conditions per preset                                                               | Charge depletion over time, motor lag, servo dynamics, rotor inflow and closed-loop control |
| Native wind-axis wing | Lift/drag transformation and four-second unpowered trajectory in JSBSim's native aerodynamic axes                                                                                                                                                    | Synthetic wing; zero sideslip, centered mass and surface; no measured-flight claim          |

Quad power-off cases test the unpowered body rather than a stabilized hover.
VTOL propulsion cases set physical actuator angles directly; they do not exercise
ArduPilot, PX4, or RCForge's assistance controller. Tabulated aerodynamic polars
are rejected by the current adapter instead of silently using different coefficients.
Adding a preset with such data requires extending and verifying that adapter.

## Coordinate and numerical matching

- RCForge uses meters, kilograms and seconds; body forward/right/down and world
  north/east/down. JSBSim inputs are explicitly converted to its native imperial
  units to avoid mixing rounded SI conversion constants from different paths.
- Definition positions map to JSBSim structural aft/right/up coordinates. Body
  force directions retain forward/right/down. Body drag is applied at the computed
  CG; aerodynamic surface and motor forces retain their installation stations.
- Each component is represented by six symmetric quadrature point masses.
  Their offsets reproduce its three principal second moments, including authored
  principal inertia, before rotating/translating them. JSBSim independently
  assembles CG and the tensor; this differs from RCForge's tensor summation.
- Reference trajectories use a nonrotating sphere of radius one billion meters
  with gravity matched to 9.80665 m/s² at the 1,000 m initial altitude. This
  approximates RCForge's flat local frame without Earth's rotation. Over these
  short trajectories the residual curvature/gravity variation is micrometric;
  subtracting large ECEF coordinates also introduces floating-point cancellation.
  This is an artificial matching environment, not a simulated Earth fidelity test.
- JSBSim uses Adams–Bashforth 4 for rates/translation and Buss 2 for attitude.
  It runs at **3840 and 7680 Hz** to check that the reference itself has converged.
  RCForge runs at its normal **120 Hz**, then **240 Hz** to check error reduction.
  These high reference rates run offline, never in the browser.
- Initial conditions and sample timestamps match. Comparison is in the initial
  NED frame, using a quaternion angular distance rather than subtracting wrapped
  Euler angles. Initial altitude is removed from position comparisons.

## Acceptance limits

These are engineering limits for these short matched-model cases, not percentages
of realism. Maximum vector errors are checked over all sampled conditions/times.

| Quantity                       | Limit                                            |
| ------------------------------ | ------------------------------------------------ |
| Mass, CG, inertia tensor       | 1e-10 in kg, m, kg·m² respectively               |
| Static force / moment          | 1e-8 N / Nm                                      |
| Trajectory position            | 0.005 m                                          |
| Trajectory velocity            | 0.005 m/s                                        |
| Angular velocity               | 0.01 rad/s                                       |
| Attitude                       | 0.002 rad                                        |
| Reference timestep convergence | 2e-5 m position; 1e-5 in the other SI quantities |

Halving RCForge's timestep must reduce each trajectory error to at most 70% of
the original plus a 2e-5 floor for reference/coordinate/near-zero angle error.
At 960/1920 Hz, early trials showed several reference trajectories exceeding the
reference convergence limit. Increasing the reference resolution to 3840/7680 Hz
resolved those disagreements without weakening tolerances or changing RCForge.

Every report records aircraft-file hashes, request hashes, adapter and core source hashes, engine
versions and the upstream JSBSim source revision. Missing, extra or duplicated
cases, changed inputs, nonfinite numbers and wrong sample times invalidate the
report. Starting a rerun replaces the old summary with a non-passing status, so
a missing dependency cannot leave a stale green summary at the canonical path.

## Current evidence and next investigations

The initial September 8, 2026 run covered nine bundled definitions in **56 cases
and 616 checks**. Static mass/load comparisons agreed near floating-point precision.
Short aerodynamic trajectories agreed to submillimeter position differences; the
FT-22 had the largest angular-rate discretization error, which decreased with a
smaller RCForge timestep. Regenerate the report for current values and hashes.

No gravity constant, aircraft coefficient or runtime dynamics was changed to
obtain agreement. These results support the numerical implementation within this
coverage. They do not resolve estimated stall/drag/thrust behavior or the separate
browser wall-clock slowdown when frame intervals exceed 50 ms.

Next additions should bring independent evidence for the uncovered subsystem:
native JSBSim actuator/transient cases, appropriately matched contact cases, and
autopilot-in-the-loop tests for actual controller behavior. Actual aircraft
calibration still requires measured mass, propulsion, glide and flight-response
data, with separate flights withheld from fitting. See [measurement comparison](physics-validation.md).

## Implementation references and rights

- [JSBSim 1.3.1 source](https://github.com/JSBSim-Team/jsbsim/tree/v1.3.1), commit
  `3b25f25e49b42d0489c04ac805674fc1450ca579`.
- [Mass assembly and coordinate conventions](https://github.com/JSBSim-Team/jsbsim/blob/v1.3.1/src/models/FGMassBalance.cpp).
- [Native rigid-body integration](https://github.com/JSBSim-Team/jsbsim/blob/v1.3.1/src/models/FGPropagate.cpp).
- [Arbitrary forces, directions and application points](https://jsbsim-team.github.io/jsbsim/classJSBSim_1_1FGExternalForce.html).
- [Aerodynamic forces and moments](https://jsbsim-team.github.io/jsbsim-reference-manual/user/concepts/forces-and-moments/).
- [JSBSim external-force regression examples](https://github.com/JSBSim-Team/jsbsim/blob/v1.3.1/tests/TestExternalReactions.py).

The adapter and test definitions are original RCForge MIT code. JSBSim is an
optional, separately installed LGPL-2.1 development tool. Its implementation and
aircraft assets are not copied into the browser bundle. No upstream endorsement,
certification, NASA check-case pass or real-aircraft equivalence is implied.
