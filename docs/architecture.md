# Architecture

RCForge uses TypeScript, Vite, Three.js and Zod. It is a local static browser application plus a Node CLI. There is no server-side application state, AI integration or external service. Fonts ship in the bundle.

```text
aircraft JSON → schema → physical model → Simulation.step(controls, dt)
                    ↘ procedural geometry         ↓
keyboard / Gamepad / Arduino → calibration → controls        state → Three.js
                                                  ↓
                                         telemetry / recordings
```

## Coordinate and unit contract

All physical values are SI. World is a flat local north/east/down frame. Body X points forward, Y right, Z down. Positive rotations obey the right-hand rule: roll right, pitch nose-up, yaw right. Orientations are normalized XYZW quaternions mapping body to world. Position and velocity are the center of mass in world coordinates; angular velocity is in body coordinates. Component positions are measured from a fixed aircraft datum. Subtract the calculated CG when computing lever arms.

The renderer maps world `(x,y,z)` to Three.js `(x,-z,y)` by a proper 90-degree X rotation. Body geometry stays in the physical frame and is transformed once at the root.

## Mass model

Each mass part has an explicit mass and component-CG position. Its default local inertia is a uniform cuboid from `sizeM`; optional `inertiaDiagonalKgM2` supplies principal moments. `orientationDeg` rotates that local tensor by Rz Ry Rx before the parallel-axis contribution is added about total CG. The result is a full symmetric 3×3 tensor, including products of inertia. `massKg` is authoritative: material density and visual loft volume do not automatically change it. Parts describing wing/tail mass can differ from aerodynamic surfaces, but their allocation is explicit. Moving the battery changes CG and inertia. Span edits update wing span, lateral position, mass, aspect ratio, reference area and rendered geometry.

## Aerodynamic backend

Each surface defines an aerodynamic-center position, span, chord, orientation, incidence and estimated coefficients. Surface local airflow equals body air-relative velocity plus `omega × leverArm`. Project away spanwise velocity, derive angle of attack, then compute lift and drag from dynamic pressure. Control deflection shifts the effective lift angle. Lift acts perpendicular to local airflow; drag opposes it. Sum forces and `r × F` moments plus a surface pitching moment.

The pre-stall lift slope blends into a flat-plate approximation over 12 degrees past the declared stall angle. This is continuous but not a validated post-stall model. Optional finite-wing `polar` or `reynoldsPolars` tables replace analytical lift, drag and moment coefficients in their covered range; angle interpolation and log-Reynolds interpolation live in `core/aerodynamics.ts`. Outside each angle range, values blend into the analytical fallback over 12 degrees. Reynolds boundaries clamp and telemetry reports missing coverage. Imported tables must include finite-wing induced drag; it is not added a second time. Fuselage drag and explicit rate damping are approximations. Each motor supplies a forward force, first-order throttle response and a speed-dependent thrust falloff. Differential thrust scales with throttle and yaw input. Axial propwash estimates induced speed from thrust and disk area, with a widening downstream footprint and distance attenuation. This is a coarse model, not a validated wake solver. Fixed-wing motors with `spin` declared add reaction roll torque from `torquePerThrustM`. Propeller gyroscopic effects, P-factor, unsteady separated flow and structural flexibility are omitted.

The equations integrate body angular momentum with the gyroscopic `omega × I omega` term and world translation using midpoint integration. Attitude uses an exponential quaternion update. Motor response uses its exact first-order exponential over the step. Fixed dt is 1/120 s; tests compare smaller steps for numerical convergence.

Wheel contacts use sequential normal impulses, lateral friction, rolling resistance and nose-wheel steering on a flat plane. They allow ground rolls, takeoff and gentle rolling touchdowns. Severe impacts and body contacts terminate flight. This is a rigid contact approximation without suspension or deformable tires. Ground launch optionally adds removable gear through `core/launch.ts`.

## Components, power and actuation

`core/powertrain.ts` interpolates authored motor/prop thrust-current curves. A
battery references an existing mass part and supplies capacity, resting-voltage
versus charge, pack resistance and avionics load. The quasi-static circuit solves
terminal voltage and current; thrust scales with voltage squared and air density.
`Simulation.step` integrates charge use in ampere-seconds and removes powered
thrust when empty. Battery mass does not decrease. Curves, resistance and losses
need measured data; capacity alone is not an endurance prediction. Temperature,
voltage protection, motor heating and advance-ratio performance are not solved.

`core/actuation.ts` combines a surface's travel limit with servo commanded travel,
horn ratio and rated speed. Mixed controls saturate before first-order response
and angular-rate limiting. The resulting surface commands feed both forces and
animation. Servo torque ratings and material names remain descriptive; hinge-load
stalling and deformable linkages are not implemented. See
[component models](component-models.md) for authoring contracts and limits.

`core/components.ts` validates catalog replacements and preserves installation
positions. Motor entries describe paired motor/prop performance, not universal
motor-only thrust. Mass components, optional motor/prop references and battery
references must account for each item once. `app/component-workshop.ts` exposes
these edits and their mass/CG consequences without changing repository JSON.

## Trim and pilot input

The trim solver finds pitch angle, elevator command and throttle that balance longitudinal force and pitch moment at the launch operating point: level flight at 12 m/s for airborne/ground preparation, or an 8° climb at 8.5 m/s for hand throws. `core/launch.ts` applies that release state and initializes the control actuators consistently. It reports convergence explicitly. A valid aircraft may not trim at that speed. The browser exposes the calculated elevator trim; full stick endpoints remain available around the trim offset. This is an initial equilibrium calculation, not active stabilization or an autopilot.

Keyboard commands ease toward their targets to make digital keys usable. Controllers retain analog input with endpoint normalization, reversal, deadzone and expo. Controller types suggest initial axis orders; saved device profiles take precedence. Verify each mapping with the live monitor.

## Experiments and replay

Scenarios operate on the same `Simulation` implementation. The comparison UI plots altitude, airspeed, roll or pitch from the recorded samples, defaulting to the axis under test for pulse scenarios. It reports initial control commands as well as final outcomes; independently trimmed cruise cases can follow the same altitude despite different mass or required power. Seeded gusts are analytic time functions, independent of rendering and input polling. Recordings contain the full initial state, environment and aircraft plus every normalized control frame. They are versioned and validated on import. Inputs are recorded after trim/calibration so a replay does not depend on local controller settings.

Browser recording is bounded to 36,000 frames (five minutes). The rendering loop discards large wall-time backlogs and pauses on focus loss. Under load simulation time can advance slower than wall time; physics dt does not stretch. CLI execution has no graphics dependency.

## Extension sequence

Start additions with a concrete use case and tests. New aircraft generally need only JSON. A new input backend should produce `Controls`. A new environment should provide density and wind while retaining deterministic scenario inputs. A second physics backend should preserve state/control/recording semantics with an explicit backend identifier and capability checks; do not pretend all backends accept identical aerodynamic parameters. A JSBSim adapter is a future backend, not implemented.

## Browser workspaces

The interface uses a monochrome palette defined by `--ui-*` tokens in `src/workbench.css`; base layouts and field panels share those tokens. Reserve colour for warnings, physical axes and distinct map markers. Navigation icons live in `view/icons.ts`. Controller SVGs carry their own stick anchors and hardware button indices; `ControllerActions` uses those attributes for live feedback. Cosmetic PlayStation/Xbox selection must never change channel mapping or invent standard button names for custom USB devices.

`view/workbench.ts` defines four hash-routed pages. `app/editor.ts`, `controllers.ts`, and `experiments.ts` own page behavior; `main.ts` coordinates state and recordings. A single Three.js renderer moves between the flight stage and studio. `view/model.ts` builds shaped airframes and animated controls; optional JSON panel outlines, hinges and body lofts support new plan-shaped airframes without another model-specific renderer; `view/field.ts` builds scenery. The pilot stands at eye height and can walk or move through Position & view; view direction can track the aircraft. `app/editor.ts` retains one in-memory draft per aircraft, including raw invalid fields. Apply validates pending values before updating the active model and browser storage; switching models does not discard a draft. Reloading discards unapplied drafts. `app/aircraft-storage.ts` recovers the last available selection, applied definitions and the bounded local catalog of applied imports. Source definitions stay separate for restoration; startup still uses Ground/Pilot beside the aircraft. Storage failures retain a usable session and prompt JSON export. `core/editor.ts` provides pure mass and CG edits. Total mass scales component weights; requested longitudinal CG moves the battery and recomputes inertia.

## Multirotor branch

`vehicleType` defaults to fixed-wing. The Quad X branch applies body-up rotor thrust and signed reaction torque, using `core/multirotor.ts` for angle/rate control and geometry-based mixing. Fixed-wing motor force and control paths retain their prior formulas. Rotor commands use the same actuator state and fixed-step rigid-body integrator. Quad prop diameter controls the visible rotor envelope; changing diameter alone does not derive thrust or current. Author the paired performance curve, response and torque independently. Skid contacts share the impulse solver with increased tangential friction. `findTrim` returns hover equilibrium for quads and longitudinal equilibrium for airplanes.

## Rendering budgets

`view/render-budget.ts` limits the 3D buffer to 2.1 megapixels / 1.25× pixel density, a 1024² shadow map, 128 × 128 terrain cells and sparse vegetation. Ground diffuse maps come from `public/scenery/lite/`; foliage uses the 1536 × 1024 `public/scenery/vegetation-v2.png` RGBA atlas. Distant terrain combines vertex slope/altitude colors with the shared world-space material and procedural strata; Alpine and Mesa shapes use bundled elevation samples. The sky is a small gradient shader. Flight instruments and controller SVGs retain native display resolution. The flight canvas and Locate overlay exclude the measured bottom instrument bar; the editor retains its full inspection viewport.

`view/surface-detail.ts` blends three world-anchored samples of the existing diffuse maps, with explicit gradients for stable mip selection. Grass, dirt and asphalt share that sampler; broad colour variation and bounded surface-gradient relief reduce repetition without new geometry or image downloads. Relief changes shading only, not the flat contact surface. See [scenery rendering](scenery-rendering.md) for the cost model and research references.

`view/aircraft-shadow.ts` fits that single shadow map to the aircraft and its projection onto the flat landing surface. The light retains the scenery's sun direction, follows travel, and extends its depth range with altitude. A fixed footprint (expanded only for large aircraft) preserves silhouette resolution; snapping to light-space texels reduces shimmer. The studio uses its own floor height. Shadows are visual cues, not altitude measurements; screen size, terrain contrast and viewing direction still affect visibility.

The browser updates physics independently at 120 Hz and polls input every animation callback. 3D rendering is capped at 60 fps during flight or camera movement, 30 fps when idle, and is skipped on Controllers and Experiments. Changing a rendering budget must not change forces, recordings or integration steps. See `public/scenery/README.md` for the asset rebuild commands and retained source credits.

## Arduino input and flight reference

`src/input/rc-serial.ts` validates a bounded, CRC-protected USB serial stream before exposing channel axes through the same `InputDevice` interface as Gamepad input. The AVR sketch supports trainer/receiver PPM and six PWM inputs. `src/app/arduino.ts` handles the user-initiated port chooser and connection state. Invalid or stale input removes the device, pauses its active flight and requires deliberate resume. Receiver-held pulses require a configured guard-channel failsafe; see `docs/flysky-fs-i6.md`.

`src/view/flight-navigation.ts` draws the attitude instrument and north-up minimap with SVG at 10 Hz. It reads the existing simulation quaternion and position, keeps a bounded trail, and opens the shared positioning panel. It adds no render loop, WebGL context, terrain assets or physics behavior.
