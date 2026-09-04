# Flight polish session · 5 September 2026

User-authorized work window: 4 September 2026 21:28:46 UTC to
5 September 2026 02:28:46 UTC (07:58:46 IST). All changes belong on
`improve/flight-polish-20260905`; do not merge into or push `main`.

Continuation automation: `rcforge-five-hour-improvement-session`.
After the deadline, finish verification of pending changes, commit a safe result,
pause the automation, and report the outcome. Do not start more work.

## Scope

- Play, critique, improve and verify existing flight, editor, controller and
  experiment workflows. Keep graphics inexpensive and the UI minimal and dark.
- Add the explicitly requested Flite Test FT-22 Raptor and a larger Quad X.
- Improve aircraft authoring and transmitter connection clarity.
- Keep provenance honest. Numerical tests are not real-world validation.
- Avoid unrelated features and preserve existing user changes.

## Progress

- Created the improvement branch from `f736b58`; working tree was clean.
- Set up continuation through the end of the work window.
- Added FT-22 Raptor from official full-size plans and inspected build photos.
  Source/estimate ledger is in the JSON and reconstruction guide. 320 g including
  the assumed battery, 635 mm span, two elevons, fixed canted fins, pusher slot.
- Added JSON-authored panel outlines/hinges and fuselage lofts; documented the
  visual-versus-physical contract. No added assets, dependencies or render loops.
- Tightened editor shadow coverage with the existing 1024 map, eliminating bands
  across flat foamboard panels. Flight shadow coverage is unchanged.
- Corrected hand-launch initialization to use trim at 8.5 m/s release speed,
  instead of 12 m/s. Four fixed-wing launch regressions stay airborne for 5 s.
- Flight hints now derive available channels from each aircraft definition.
  FT-22 no longer advertises a rudder it does not have.
- Verification: `npm run check` passes (148 tests); 66/66 numerical checks pass;
  envelope reports no nonfinite loads. FT-22 trims at 22/45 surveyed points;
  unsolved high-speed/other points are retained, not concealed. Docs and format
  checks pass. All component/aero estimates remain uncalibrated.
- Browser: reviewed perspective/top/side reconstruction, caught and fixed shadow
  striping, restored the earlier test draft through the editor, then hand-launched
  the corrected preset. At 13.8 s it remained flying, 47.5 m AGL, 8.4 m/s, 65%
  power; pause and chase worked. Brief synthetic arrow taps did not establish
  analog maneuver fidelity; axis torque signs and elevon mix have numerical tests.
- Current browser has the corrected Raptor saved as a local test build, paused
  in Chase. Existing user aircraft profiles were retained. HMR can reset the
  selected preset; saved local builds override updated repository definitions.

## Pass 2 · larger quad and render cost

- Added `quad-x-450`: 450 mm motor diagonal, 1,007 g component total, 10-inch
  two-blade props, 3S 3300 mAh electrical model. Manufacturer frame/motor references
  and EMAX 11.1 V / 1045 thrust-current-RPM samples are cited in the JSON and guide.
  PWM/command mapping, battery parameters, remaining assembly masses and dynamics
  are explicitly estimated. No physical hardware validation claimed.
- Added optional motor-to-component references and blade counts. Larger quad
  geometry follows authored arms, battery, ESC and motor dimensions. No fake FPV
  camera appears on a build without one. Existing compact models retain defaults.
- Batched static quad details by material and simplified submillimetre fastener
  geometry. Small quad: 157 to 30 meshes, 40,888 to 21,592 triangles. New larger
  model: 27 meshes / 19,708 triangles. CPU geometry counts, not an FPS benchmark.
  Propellers remain animated independently; physics is unchanged.
- Corrected the editor's misleading statement that every quad stores electronics
  mass inside its frame. Detailed component ledgers now read correctly.
- Verification: 154 tests pass; all bundled aircraft build/validate. Larger-quad
  envelope: 27/27 hover points, zero nonfinite loads. Numerical verification passes.
  Component accounting, torque signs, takeoff, angle recovery and electrical replay
  have targeted tests. Docs resolve and formatting passes.
- Browser: inspected the authored quad, then used Space taps and Enter for a ground
  takeoff. It climbed vertically and paused successfully; view showed 67.8 m at
  11.4 s. Browser timing/input snapshots are not a calibrated handling measurement.
  The standalone 65% takeoff regression exceeds 3 m after 3 s.
- Remaining critique: editor lighting is too muddy on dark components; Top is
  currently an angled perspective rather than a proper top inspection. The browser
  range-fill operation was unreliable; use keyboard/click interactions and verify
  settled state rather than treating range-fill output as evidence.

## Pass 3 · inspection

- Added real orthographic Top and Side views with aspect-aware fitting. Top keeps
  the nose up; Side shows body X horizontally. Dragging returns to Perspective
  and updates the selected view button. Added projection/bounds regressions.
- Studio lighting is neutral and independent of scenery; stronger ambient fill
  and lighter shadows make black components legible. Reuses existing lights and
  shadow map. The floor now follows the airframe's underside instead of leaving
  every model floating 27 cm above it.
- Side inspection exposed the larger quad's unsupported battery. Added a visible
  tray/standoffs within its illustrative frame allocation. Browser checked Top and
  Side on the large quad. 156 tests and the build pass.

## Pass 4 · component actuation

- Added optional positional-servo metadata to mass parts and physical horn/travel
  links on surfaces. Effective travel and speed feed physics and animation.
- Split fixed-wing servo allocations into individual parts without changing total
  mass or longitudinal CG. FT-22 initial setup uses 20° effective elevon travel,
  retaining the published 40° maximum. Larger throws remain configurable.
- Corrected first-step servo teleportation; trimmed launches initialize actuator
  state explicitly. Simulation version is now 0.7.0; old recordings are rejected.
- Verification: 159 tests, aircraft validation and production build pass. Numerical
  verification remains 78/78; FT-22 envelope is 22/45 with zero nonfinite loads.
  Servo horns now animate from the same actuator state as the control surfaces.
- Next: component catalog and editor, battery fields/discharge on plane presets,
  motor/prop selection and source-aware component swaps. These remain unfinished.

## Pass 5 · component catalog and battery workflow

- Added a strict, offline catalog: three Orange 3S battery references from Robu,
  TowerPro SG90/MG90S, EMAX 12A/20A ESCs and a matched MT2213/1045 motor package.
  Source notes distinguish retailer/manufacturer specifications from electrical
  assumptions and contradictory shipping/variant figures.
- Added a focused installed-component editor with replacement preview (mass/CG),
  battery mass/capacity/cells/charge/resistance, servo speed/travel and horn ratios.
  Advanced installation fields retain motor/prop offsets. Invalid draft values
  survive and block Apply. Catalog values are copied into portable aircraft JSON.
- Enabled battery consumption on every bundled aircraft. Original plane/basic-quad
  current tables are explicitly induced-power estimates, not bench measurements.
  Tiny Trainer uses the source-recommended 3S class with an assumed 650 mAh pack.
  The HUD shows charge/voltage/current, used mAh and conditional time to reserve.
- Browser verified FT-22 1000-to-1500 mAh swap: 320 to 355 g, CG 6.3 mm forward;
  subsequent capacity edit applied correctly. Reviewed servo panel and desktop/
  760 px layout; no horizontal overflow. Fixed component-selection page jumping
  and preserved open installation sections across edits.
- Verification: 168 tests, all aircraft/catalog validation, production build,
  docs and formatting pass. Numerical report 93/93; FT-22 electrical envelope
  75/135 trim points, zero nonfinite loads. Supply-dependent trim failures remain
  visible. Constant-voltage equilibrium and discharge are tested separately.
- Limits: motor-package swaps require distinct motor/prop mass references (complete
  in the 450 mm quad). Other presets still combine some prop/electronics allocation;
  no hidden mass is invented. Physical battery endurance and servo loads are not
  measured. Saved browser drafts keep their old definitions until restored/applied.

## Latest steering · model reconstruction

User explicitly requested substantially more accurate 3D models of the actual
Flite Test builds, compared with photographs, wireframes and plans. Next inspect
and measure the Bronco, Tiny Trainer Sport and FT-22 plan outlines and folded
assembly geometry. Correct proportions and construction details efficiently;
keep aerodynamic and component definitions consistent and provenance honest.

## User's added priority

The user explicitly added interchangeable physical components, a compact component
catalog (including Robu.in parts), battery weight/capacity/discharge and FT-22
servo travel/speed/linkage sensitivity to this same five-hour session. Implement
these next. Keep parts as the single mass ledger; no double counting. Existing
battery sag/current/discharge and servo lag/rate models should be extended, not
replaced with labels. Component catalog entries must distinguish source facts
from guessed command maps, electrical resistance, linkage and aero parameters.
The continuation prompt was updated with this scope. Deadline remains unchanged.

## Next passes

1. Reconstruct the three Flite Test models more accurately against plans/photos.
2. Improve new preset geometry and catalog previews where playtests show faults.
3. Playtest both presets, aircraft selection and editor behavior.
4. Review input selection, mapping, calibration and Arduino bridge workflows.
5. Inspect desktop and narrow layouts, rendering cost and flight feedback.
6. Run checks, numerical validation and branch CI; commit coherent changes.

Update this log after each completed pass with evidence, limitations and the next
concrete task. Keep task output and temporary reference downloads in `results/`.

## Pass 6 · FT-22 plan reconstruction and release behavior

- Inspected the original two-sheet vector plans, enlarged assembly inset and
  current FT-22 project photos (the article also includes an older F-22, which
  was excluded). Reconstructed matching main-plate/elevon edges, original prop
  opening, fin outline/outward cant and sampled foam nose profile.
- Registered the assembly to the interpreted plan circle-cross CG station and
  400 mm nose-to-CG target; wing-root CG reference is now 8.7 mm. Structural mass
  positions and aerodynamic centers follow polygon geometry. Positions, folded
  intake/rail assembly, inertias and coefficients remain explicit estimates.
  Added intake floor/walls/rails by splitting the existing fuselage allocation;
  all-up mass remains 320 g. Detailed assumptions are in the reconstruction guide.
- Full published 40-degree elevon travel is now available through the modeled
  linkage. The earlier reduced 20-degree setup left little low-speed trim margin
  with the corrected geometry. Pusher prop/hub rendering uses the authored
  motor mass position to place the prop on the correct side.
- Hand launch now solves an 8-degree climb at 8.5 m/s, including velocity,
  attitude, control deflection and throttle. Universal 65% power had caused the
  reconstructed FT-22 to pitch up excessively. No in-flight stabilization added.
- Fixed a captured-pointer edge case that reverted Top/Side to Perspective.
  Verified Side stays selected and renders an exact side elevation. Loft faces
  are grouped by finish, not per section, keeping the extra construction cheap.
- Browser: corrected FT-22 hand launch held 8.5 m/s, 1.2 m/s climb, 20.6 m AGL
  after 16.2 s at 38% power; keyboard pause worked. Updated stale launch copy and
  kept setup collapsed after starting/pausing. No physical-controller claim.
- Verification: 171 tests, all aircraft/catalog validation and production build
  pass; numerical checks 93/93. Updated FT-22 envelope solves 54/135 points with
  zero nonfinite loads. This is a narrower numerical operating envelope, not
  flight-test calibration. Rendering budget test stays below 100 draw groups
  and 12,000 triangles for the corrected model.
- Next: apply the same plan/assembly review to Bronco and Tiny Trainer, then
  continue the controller/editor/playtest passes within the remaining window.
