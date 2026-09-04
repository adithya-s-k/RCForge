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

Each mass part is a uniform, axis-aligned box. Sum masses to derive CG; sum local cuboid inertia and the parallel-axis contribution to obtain a full symmetric 3×3 tensor, including products of inertia. Parts describing wing/tail mass can differ from aerodynamic surfaces, but their allocation is explicit. Moving the battery changes CG and inertia. Span edits update wing span, lateral position, mass, aspect ratio, reference area and rendered geometry.

## Aerodynamic backend

Each surface defines an aerodynamic-center position, span, chord, orientation, incidence and estimated coefficients. Surface local airflow equals body air-relative velocity plus `omega × leverArm`. Project away spanwise velocity, derive angle of attack, then compute lift and drag from dynamic pressure. Control deflection shifts the effective lift angle. Lift acts perpendicular to local airflow; drag opposes it. Sum forces and `r × F` moments plus a surface pitching moment.

The pre-stall lift slope blends into a flat-plate approximation over 12 degrees past the declared stall angle. This is continuous but not a validated post-stall model. Fuselage drag and explicit rate damping are approximations. Each motor supplies a forward force, first-order throttle response and a speed-dependent thrust falloff. Differential thrust scales with throttle and yaw input. Axial propwash estimates induced speed from thrust and disk area, with a widening downstream footprint and distance attenuation. This is a coarse model, not a validated wake solver. Propeller torque effects are omitted.

The equations integrate body angular momentum with the gyroscopic `omega × I omega` term and world translation using midpoint integration. Attitude uses an exponential quaternion update. Motor response uses its exact first-order exponential over the step. Fixed dt is 1/120 s; tests compare smaller steps for numerical convergence.

Wheel contacts use sequential normal impulses, lateral friction, rolling resistance and nose-wheel steering on a flat plane. They allow ground rolls, takeoff and gentle rolling touchdowns. Severe impacts and body contacts terminate flight. This is a rigid contact approximation without suspension or deformable tires. Ground launch optionally adds removable gear through `core/launch.ts`.

## Trim and pilot input

The trim solver finds pitch angle, elevator command and throttle that balance longitudinal force and pitch moment for a calm, level 12 m/s launch. It reports convergence explicitly. A valid aircraft may not trim at that speed. The browser exposes the calculated elevator trim; full stick endpoints remain available around the trim offset. This is an initial equilibrium calculation, not active stabilization or an autopilot.

Keyboard commands ease toward their targets to make digital keys usable. Controllers retain analog input with endpoint normalization, reversal, deadzone and expo. Controller types suggest initial axis orders; saved device profiles take precedence. Verify each mapping with the live monitor.

## Experiments and replay

Scenarios operate on the same `Simulation` implementation. The comparison UI plots altitude, airspeed, roll or pitch from the recorded samples, defaulting to the axis under test for pulse scenarios. It reports initial control commands as well as final outcomes; independently trimmed cruise cases can follow the same altitude despite different mass or required power. Seeded gusts are analytic time functions, independent of rendering and input polling. Recordings contain the full initial state, environment and aircraft plus every normalized control frame. They are versioned and validated on import. Inputs are recorded after trim/calibration so a replay does not depend on local controller settings.

Browser recording is bounded to 36,000 frames (five minutes). The rendering loop discards large wall-time backlogs and pauses on focus loss. Under load simulation time can advance slower than wall time; physics dt does not stretch. CLI execution has no graphics dependency.

## Extension sequence

Start additions with a concrete use case and tests. New aircraft generally need only JSON. A new input backend should produce `Controls`. A new environment should provide density and wind while retaining deterministic scenario inputs. A second physics backend should preserve state/control/recording semantics with an explicit backend identifier and capability checks; do not pretend all backends accept identical aerodynamic parameters. A JSBSim adapter is a future backend, not implemented.

## Browser workspaces

The interface uses a monochrome palette defined by `--ui-*` tokens in `src/workbench.css`; base layouts and field panels share those tokens. Reserve colour for warnings, physical axes and distinct map markers. Navigation icons live in `view/icons.ts`. Controller SVGs carry their own stick anchors and hardware button indices; `ControllerActions` uses those attributes for live feedback. Cosmetic PlayStation/Xbox selection must never change channel mapping or invent standard button names for custom USB devices.

`view/workbench.ts` defines four hash-routed pages. `app/editor.ts`, `controllers.ts`, and `experiments.ts` own page behavior; `main.ts` coordinates state and recordings. A single Three.js renderer moves between the flight stage and studio. `view/model.ts` builds shaped airframes and animated controls; `view/field.ts` builds scenery. The pilot stands at eye height and can walk or move through Position & view; view direction can track the aircraft. `app/editor.ts` retains one in-memory draft per aircraft, including raw invalid fields. Apply validates pending values before updating the active model and browser storage; switching models does not discard a draft. Reloading discards unapplied drafts. `core/editor.ts` provides pure mass and CG edits. Total mass scales component weights; requested longitudinal CG moves the battery and recomputes inertia.

## Multirotor branch

`vehicleType` defaults to fixed-wing. The Quad X branch applies body-up rotor thrust and signed reaction torque, using `core/multirotor.ts` for angle/rate control and geometry-based mixing. Fixed-wing motor force and control paths retain their prior formulas. Rotor commands use the same actuator state and fixed-step rigid-body integrator. Quad prop diameter is visual metadata; thrust, lag and torque must be specified independently. Skid contacts share the impulse solver with increased tangential friction. `findTrim` returns hover equilibrium for quads and longitudinal equilibrium for airplanes.

## Rendering budgets

`view/render-budget.ts` limits the 3D buffer to 2.1 megapixels / 1.25× pixel density, a 1024² shadow map, 128 × 128 terrain cells and sparse vegetation. Only the compact diffuse/foliage assets in `public/scenery/lite/` are loaded. Distant terrain shading is baked into vertices, and the sky is a small gradient shader. Flight instruments and controller SVGs retain native display resolution.

`view/surface-detail.ts` blends three world-anchored samples of the existing diffuse maps, with explicit gradients for stable mip selection. Grass, dirt and asphalt share that sampler; broad colour variation and bounded surface-gradient relief reduce repetition without new geometry or image downloads. Relief changes shading only, not the flat contact surface. See [scenery rendering](scenery-rendering.md) for the cost model and research references.

`view/aircraft-shadow.ts` fits that single shadow map to the aircraft and its projection onto the flat landing surface. The light retains the scenery's sun direction, follows travel, and extends its depth range with altitude. A fixed footprint (expanded only for large aircraft) preserves silhouette resolution; snapping to light-space texels reduces shimmer. The studio uses its own floor height. Shadows are visual cues, not altitude measurements; screen size, terrain contrast and viewing direction still affect visibility.

The browser updates physics independently at 120 Hz and polls input every animation callback. 3D rendering is capped at 60 fps during flight or camera movement, 30 fps when idle, and is skipped on Controllers and Experiments. Changing a rendering budget must not change forces, recordings or integration steps. See `public/scenery/README.md` for the asset rebuild commands and retained source credits.

## Arduino input and flight reference

`src/input/rc-serial.ts` validates a bounded, CRC-protected USB serial stream before exposing channel axes through the same `InputDevice` interface as Gamepad input. The AVR sketch supports trainer/receiver PPM and six PWM inputs. `src/app/arduino.ts` handles the user-initiated port chooser and connection state. Invalid or stale input removes the device, pauses its active flight and requires deliberate resume. Receiver-held pulses require a configured guard-channel failsafe; see `docs/flysky-fs-i6.md`.

`src/view/flight-navigation.ts` draws the attitude instrument and north-up minimap with SVG at 10 Hz. It reads the existing simulation quaternion and position, keeps a bounded trail, and opens the shared positioning panel. It adds no render loop, WebGL context, terrain assets or physics behavior.
