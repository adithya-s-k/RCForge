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

## Pass 7 · folded Bronco and Tiny Trainer assemblies

- Added generic JSON-authored folded wing skins with bounded ailerons and tapered
  tips. Tiny sport-wing ailerons now end at the plan's approximately 373 mm
  station; the outer 105 mm remains fixed. Bronco retains its outer-span controls.
- Reconstructed Tiny tail and rudder outlines/hinges from rotated sheet-2 vectors,
  separated its powered nose from the fuselage and retained the folded root's
  crossed bands/dowels. Bronco has tapered booms, separate nacelles and the
  A-tail's center relief and measured hinge fraction. Subtle hinge creases keep
  white tail panels legible; visible servos correspond to installed components.
- Split existing structural mass allocations rather than adding free geometry
  mass. Reference totals remain 830 g Bronco and 253 g Tiny. Component centers,
  battery placement and aerodynamic centers were updated with explicit estimates;
  longitudinal CG targets are retained. The Tiny battery sits under its nose,
  clear of the motor envelope. Fixed-wing batteries render at their authored
  position and are naturally hidden only when enclosed by the airframe.
- Browser: reviewed perspective, top and side for both models. Trainer release
  reached 12.7 s, 8.5 m/s, 16.6 m AGL at 37% power; Bronco reached 19.2 s,
  8.5 m/s, 24.3 m AGL at 32% power. Both paused correctly. These are controlled
  simulator checks, not physical flight evidence. Updated the two local original
  profiles through Restore/Apply without clearing other saved profiles.
- Verification: 177 tests in 31 files, seven aircraft/eight catalog definitions
  and production build pass. Numerical checks 93/93. Bronco and Tiny envelope
  each solve 81/135 surveyed points, zero nonfinite loads. Geometry regressions
  check mirrored face winding, finite bounds, actual aileron endpoints, control
  authority and render budget below 100 meshes / 15,000 triangles per model.
- Next: continue existing editor/controller UX playtests. In particular, review
  original-versus-saved definition clarity, inspection framing and component
  changes before launch. No measured physical calibration has been added.

## Pass 8 · component editing beside the model

- Added Airframe / Components workspace tabs over the same draft. Desktop
  installation editing now sits beside a sticky aircraft view; Apply stays
  accessible in the heading. Catalog browsing temporarily hides installed fields,
  keeping the replacement decision and mass/CG preview together.
- Selected components have one reusable installation-envelope outline using the
  authored mass position, dimensions and orientation. Enclosed components remain
  locatable. This is not a collision/CAD mesh. Highlighting is limited to the
  component workspace and has no effect on physics or normal flight rendering.
- Perspective inspection now fits assembled bounds for its actual aspect ratio
  and orbit angle. Bronco battery height was adjusted to an estimated 63 mm down
  from datum to fit beneath the sloping nose skin; mass/longitudinal CG unchanged.
- Browser checked battery replacement 830 to 760 g, expected 23.7 mm aft CG shift,
  capacity edit and Apply. Restored the reference build after the swap test.
  Actual keyboard-clear of capacity blocks Apply, retains the empty field and
  allows recovery after changing tabs. Browser fill('') was a no-op; keyboard
  interaction, not that tool result, provided the empty-field evidence.
- Verified actual 745 px and 375 px document widths with equal scroll widths.
  Phone layout uses an Installed part selector; confirmed ruddervator servo
  selection and its details. Viewport override reset afterward. Closed the owned
  reference-image tab after review (viewport overrides target the focused tab).
- Verification: 179 tests in 32 files, definitions/catalog and build pass; docs
  resolve. Numerical 93/93 and Bronco envelope 81/135 with zero nonfinite loads.
  No physical radio, servo, battery or flight calibration claim.
- Next: continue controller/transmitter and catalog/playtesting passes within the
  authorized window. Main remains untouched.

## Pass 9 · transmitter connection paths

- Put the USB simulator adapter and Arduino bridge routes side by side, with an
  action for each. The Arduino sketch and wiring guide remain directly available.
  The copy distinguishes a PPM joystick adapter from the radio update cable and
  names the supported classic Uno/Nano boards and receiver signal types.
- Finding devices now gives visible feedback even when calibration is hidden.
  An empty device selector says Awaiting input, avoiding a false disconnected
  claim while a serial bridge waits for channel data.
- Browser: Find USB adapter displayed the no-input notification; the two paths
  stacked correctly at a verified 375 px document width with no overflow.
  Keyboard fallback worked; viewport override reset after checking.
- Verification: 180 tests in 32 files, seven aircraft/eight catalog definitions
  and production build pass. No radio was connected; this verifies the UI and
  existing automated transport behavior, not physical wiring or signal reception.

## Pass 10 · catalog specifications versus custom setups

- Installed catalog components now identify matching or modified model
  specifications, naming changed fields. Source links and assumptions are
  available on the installed part, not only while browsing replacements.
- Comparison is derived from saved aircraft data. Position, orientation, starting
  charge, avionics load, spin and linkage settings are excluded from product
  differences. Motor packages compare both physical parts and propulsion data.
  External catalog IDs remain readable without claiming a local match.
- Browser: replaced the Bronco pack, changed 1500 to 1800 mAh, applied and opened
  a fresh document. Modified capacity and 20.0 Wh persisted. Restored the original
  830 g / 2200 mAh reference through the UI afterward.
- Verification: 183 tests in 32 files, definitions/catalog, production build and
  documentation links pass. Added saved-data, servo and complete motor-package
  comparison cases. A catalog match is not physical validation.

## Pass 11 · component inspection lifecycle and CG alignment

- Corrected installation envelopes to use the same CG-centered origin as the
  assembled aircraft. Rebuilding after mass/position edits refreshes the selected
  component against the new definition and CG.
- Scenery replacement no longer disposes the editor's envelope or removes its
  label; those resources belong to the scene and are released on scene disposal.
- Browser: FT-22 ground run at 50% power reached 13.4 s, 12.0 m/s and 4.3 m AGL;
  paused successfully and inspected pilot tracking/placement. Changed to Alpine
  meadow, returned to Components and confirmed visible battery label/envelope
  with no browser errors. Placement map already fits its two markers correctly;
  its scale label measures the scale bar, not the full map width.
- Regression compares the highlight center to the actual rendered battery after
  an off-axis mass/CG change. This is rendering consistency, not flight calibration.

## Pass 12 · battery comparisons and readable experiment plots

- Extended existing experiment/flight telemetry with optional charge fraction,
  terminal voltage, current and consumed mAh. CSV/recording export preserves these
  observations. Older 0.7 samples remain readable and absent data is not zero.
  Experiment samples include the actual endpoint, including early ground contact.
- Added four electrical response choices and two charge rows to the comparison.
  Figures redraw at their actual width, with fixed readable tick lettering and
  finite scales at full/empty charge. Removed the old mobile font compensation;
  compacted table spacing and kept value/unit pairs together.
- A new run clears old results/exports before execution so failure cannot export
  an earlier run. Rendering updates when the results column changes size.
- Browser: reviewed current, voltage and charge graphs; Bronco cruise used
  10.6 mAh and ended at 94.5% in the current field conditions. Verified 745 px and
  375 px layouts with equal document/scroll widths; phone plot has 12 px labels.
  Restored desktop viewport and checked no browser errors.
- Verification: 188 tests in 33 files, definitions/catalog and build pass;
  numerical report passes. Capacity-only constant-voltage regression shows equal
  mAh consumption and the expected different percentage loss. Replay remains
  identical; no dynamics or simulation-version change was made.

## Pass 13 · Tiny Trainer balance from the original drawing

- Measured both original sport-wing CG markers against the leading-edge folds:
  126 PDF points / 1.75 inches / 44.45 mm on each half. The later v1.1 cover
  independently gives the same balance point; MKR2 lists a 38–44 mm range.
- Replaced the previous 35 mm estimate and moved the assumed 60 g battery aft
  to solve that station. Total mass stays 253 g. Documented the original 5×3
  versus later 6×3 prop recommendation without silently mixing build versions.
- Browser: restored/applied the definition, inspected the side view and CG,
  hand launched and paused after 23.8 s at 8.5 m/s and 29.6 m AGL. Numerical
  checks pass; trim survey remains 81/135 with zero nonfinite loads.
- Verification: 189 tests in 33 files, definitions/catalog and build pass.
  The new regression checks the mass-weighted CG against the measured drawing
  offset. This establishes a plan-based starting balance, not flight calibration.

## Pass 14 · terrain continuity and grounded vegetation

- Browser review found a sharp color seam where flat ground met distant hills.
  Both now use the same field surface and standard lighting at the intersection;
  slope/altitude layers emerge gradually. Ground/strip share one material and
  hills reuse their texture. No added image assets, triangles or shadow passes.
  Hill fragments perform more shading; pixel/mesh budgets are unchanged.
- Alpine inspection exposed source-DEM tree positions disagreeing with the
  actual coarse triangles. Vegetation now samples that exact distributed mesh.
  Regression raycasts all three sites and covers source/render disagreement
  above five metres, keeping tree roots within 2 mm of the rendered surface.
- Inspected airborne club, desert and Alpine views and ground launch/pause/reset.
  Fixed a Three.js vec4 vertex-color GLSL mismatch caught by actual browser
  compilation; no new browser errors after correction. Flight contact stays flat.
- Verification: 190 tests in 34 files, definitions/catalog and production build
  pass. Terrain changes are visual; no aircraft dynamics or replay change.

## Pass 15 · installation pose consistency

- Component orientation previously rotated inertia and the selection envelope,
  while several visible assemblies ignored it. Fixed-wing body/boom construction,
  batteries and servo housings/horns now use the same component-local rotation.
  Quad battery details, authored arms and ESCs preserve it through static batching.
- Exposed battery/servo installation angles alongside their existing dimensions.
  Position, dimensions and rotation occupy separate field groups. Aerodynamic
  surface orientation and motor thrust direction remain separately specified;
  component mass-frame angles do not silently change those models.
- Browser: rotated the 450 mm quad pack to 90 degrees, applied it, and checked its
  visible model against the inspection outline. Value persisted through reload;
  mass stayed 1007 g. Verified 375 px width with no document overflow, restored
  the original quad and reset the viewport afterward.
- Verification: 192 tests in 34 files, definitions/catalog and build pass. Tests
  compare rotated fixed-wing bounds, quad battery transforms after batching, and
  editor mass/CG/inertia behavior. No new geometry or simulation-version change.

## Pass 16 · Bronco nose and cockpit reconstruction

- The central fuselage still used a generic narrow pointed nose. Revisited the
  original sheet-1 Nose part 05 and assembly photo. Sampled the upper/lower cut
  curves: 202.33 mm projected nose length, 131.66 mm rear height and about 68 mm
  parallel core width. The broader curved bow and cockpit rise now follow those
  readings. Rear-core join, vertical registration and paint remain estimates.
- Roof/side paint and white mullions conform to the folded profile. Fuselage mass
  center/allocation and total 830 g / 51 mm CG remain; its larger outer envelope
  changes the calculated box inertia. No source artwork is bundled.
- Browser compared original photograph with perspective/top/side editor views.
  Numerical validation passes; Bronco survey remains 81/135 and zero nonfinite
  loads. Added source-station, bow-width and mass/CG regression coverage.
- Continue within the authorized window: existing flight/controller/editor UX,
  model assembly consistency and efficient rendering. Do not duplicate the active
  continuation automation or claim physical calibration.

### Checkpoint · 23:50 UTC

- Pass 16 final checks: 193 tests / 34 files, build, format and local docs links
  pass. Branch CI run 33930803966 passed on Node 22/24 plus Arduino build checks.
- Browser hand release: paused at 18.6 s, 8.5 m/s, 23.7 m AGL, 32% power and
  94% charge. Restored ground/Pilot defaults and left Bronco in the editor.
- Reference tabs are closed; viewport override is reset. Branch changes are
  committed and pushed through de530ad; main remains untouched.
- Continuation permits one cleanup wake after the deadline so the automation can
  explicitly pause itself and report. The work deadline remains 02:28:46 UTC;
  no new work may start after it. Continue reviewing existing workflows before it.

## Pass 17 · catalog readability and controller navigation

- Actual catalog inspection exposed all aircraft names/specifications being clipped:
  auto-sized grid rows shrank inside the height-limited dialog. Rows now retain
  their content height and scroll, preserving preview, name, dimensions and action.
  Phone filters use two columns; changing a filter starts at the first result.
- Controller navigation starts at the correct end when nothing has focus, skips
  hidden/inert/disabled controls and unavailable options, and avoids redundant
  numeric change events at limits. Navigation now works inside native dialogs,
  stays scoped to their controls, and cannot activate a background launch button.
  Direct flight/settings shortcuts remain blocked while a dialog is open.
- Missing-device flight hints no longer display axis assignments as if connected.
  Browser verified the disconnected Gamepad → setup → Keyboard → flight recovery,
  guide, catalog keyboard End navigation, filtering and full cards on desktop and
  narrow layouts. Hardware shortcut behavior is covered by DOM/edge regressions;
  no physical controller was available for this pass.
- Verification: 198 tests / 34 files, definitions/catalog, production build and
  local docs checks pass. No dynamics or model-definition change.

## Pass 18 · motor housing and mass-envelope agreement

- Fixed-wing motor housings used independent hard-coded offsets and sizes. They
  now follow the linked motor component center and dimensions, with proportional
  vent details and a shaft to the existing prop assembly. Edited motor dimensions
  therefore affect the visible housing as well as the mass envelope/inertia.
- Reconciled Bronco and Tiny component stations with their existing reconstructed
  visible installations, replacing the Bronco's oversized placeholder envelope.
  All motor/aircraft masses stay unchanged; the battery moves aft to retain the
  reference CG. Dimensions/stations remain explicitly estimated. FT-22 uses its
  existing authored motor envelope. No thrust curve or aerodynamic changes.
- Browser checked the Tiny side view against its component outline, increased
  housing height from 24 to 40 mm and applied the visibly changed assembly, then
  restored the original. Regression compares edited housing bounds and center
  against the mass ledger after CG translation.
- Verification: 199 tests / 34 files and production build pass. Numerical report
  passes; Bronco and Tiny each retain 81/135 trim solutions and zero nonfinite
  load cases. Their calculated inertia changes; these checks are not measured
  motor/CAD or real-flight calibration.

## Pass 19 · propeller shape and reference finish

- Rechecked the Bronco assembly photograph: its slender light-colored blades were
  represented by thick black ellipsoids. Fixed-wing props now use a tapered,
  twisted closed blade mesh; Bronco finish and vertical parked pose follow the
  photograph. Existing prop diameter and blade count remain authoritative.
- Each blade has 300 triangles and one geometry is shared by the blades on a
  propeller. Radius/positive-volume/finite-geometry tests cover 5-, 8- and 9-inch
  blades with both handednesses. Declared CW/CCW now drives fixed-wing animation
  as well as quad animation. These shapes do not change propulsion calculations.
- Browser inspected Bronco perspective and FT-22 top views; no new browser errors.
  202 tests / 35 files and production build pass. Section/chord/twist remain visual
  estimates rather than manufacturer blade CAD.
- Next reference question: original FT-22 PDF includes an inch ruler whose labels
  are 72.009 pt apart. That indicates approximately 649 mm span for the traced
  outline, versus the earlier selected 635 mm store metric. Investigate the scale
  conflict and prop-slot clearance before making any further definition changes.

## Pass 20 · FT-22 printed-ruler scale and prop-slot clearance

- Revisited the PDF calibration bars themselves: six inch rectangles are 72.000
  pt each; centimetre bars are about 28.347 pt. The earlier 72.009 figure described
  text label spacing, not the bar geometry. These establish ordinary 72 pt/in
  print scale, yielding 649.285 mm for the traced main plate. The retail page
  still lists inconsistent 25.5 inches / 635 mm; this preset follows its original
  full-size drawing instead of that metric figure.
- Corrected the structural outline dimensions, area and component stations.
  Five-millimetre board thickness and motor/battery/servo sizes remain physical
  dimensions. Nose registration stays 400 mm ahead of CG, within the listed
  394–406 mm balance range. Dry mass 235 g plus assumed 85 g pack remains 320 g;
  battery is rebalanced, and inertia follows the revised geometry/positions.
- Added a sampled full-turn check of actual rendered blade vertices against the
  main plate. The corrected slot clears the nine-inch prop; the same check finds
  interference with the earlier 635 mm width. This checks modeled geometry, not
  real-build tolerance, flex or dynamic propeller deformation.
- Verification: 203 tests / 35 files, definitions/catalog, production build and
  numerical validation pass. FT-22 survey is now 57/135 trim solutions (previously
  54/135) with zero nonfinite loads. More trim solutions are not flight-validation
  evidence. Browser restored/applied 649.3 mm and inspected top/perspective views.

### Checkpoint · 00:36 UTC

- Passes 17–20 committed/pushed through 6f15c5f. Latest branch CI 33933394049
  passed on Node 22/24 with the Arduino compile jobs. Main remains untouched.
- FT-22 hand/chase flight paused at 40.6 s, 8.5 m/s, 48.8 m AGL, 38% power and
  93% charge. Ground/Pilot restored, editor left on the corrected FT-22. One
  browser tab, no viewport override, and no new browser errors.
- Foliage follow-up inspected the actual RGBA atlas and material. Pale birch
  bark/leaf highlights exist in the source; there is no confirmed new white-halo
  defect from this inspection. No speculative asset/lighting change was made.
- Continue existing flight/editor/input/experiment UX and model consistency
  review until 02:28:46 UTC. Do not recreate the active continuation automation.

## Pass 21 · FT motor/prop packages and installation consistency

- Browser replacement of an FT motor previously ended in a missing-prop-mass
  error. Bronco, Tiny and FT-22 now have explicit paired prop components, with
  estimated allocations removed from their former structural buckets. Reference
  total mass and longitudinal CG stay unchanged; inertia follows the ledger.
- Catalog shaft-axis metadata maps motor/prop dimensions and principal inertia
  correctly between quad and fixed-wing installations. The visible prop center
  follows its linked part, and source comparisons use the installed axis frame.
- The Propellers filter and paired-part buttons connect motor and prop editing.
  Propeller parts cannot be replaced by unrelated electronics. Replacement
  previews show diameter/reference voltage and flag larger-prop fit checks.
- Browser applied the EMAX package to FT-22 (349 g), checked its correctly oriented
  39.7 × 27.9 × 27.9 mm motor and paired navigation on desktop/390 px layout,
  then restored/applied the original 320 g setup. This package is not claimed to
  fit the FT-22 slot. No new browser errors or horizontal phone overflow.
- Verification: 207 tests / 35 files, production build and numerical validation
  pass. Bronco/Tiny remain 81/135 trim solutions and FT-22 57/135; zero nonfinite
  loads. No new measured mass, thrust or flight evidence is claimed.

## Pass 22 · FT-22 underside assembly from matching plan tabs

- Original build and project photographs showed the servos mounted sideways in
  the underside side plates. The previous model placed upright blocks above the
  wing. Matching a rear tab on sheet 2 to its slot on sheet 1 established the
  reversed sheet registration; the 23 × 12 mm opening agrees with a micro servo.
- Replaced the separate estimated top rails with underside walls and servo
  cutouts, plus folded forward cheeks. Servo installation rotation and position
  now match that arrangement; case materials respect authored plastic colors.
  Existing 20 g folded structure and 320 g total stay unchanged, with battery
  rebalanced to the reference CG. Remaining registration/fold assumptions are
  documented in the reconstruction guide and aircraft provenance.
- Browser inspected top/perspective and orbited to the underside: cases now sit
  within the wall notches. Regression covers world-space case bounds, mass/CG,
  source registration and wall-to-prop radial separation. Pushrod guides and
  loaded mechanical-linkage geometry remain unresolved rather than invented.
- Numerical report passes; FT-22 retains 57/135 trim solutions, zero nonfinite
  loads. Pass-21 CI 33934525622 passed on Node 22/24 with Arduino compile jobs.
- Verification: 208 tests / 35 files, production build and local docs checks pass.

## Pass 23 · Tiny Trainer lower-skin servo orientation

- Rechecked the original sport-wing installation photo. The wing servos' output
  shafts formerly pointed upward into the wing; their component frames now face
  the lower skin and follow panel dihedral/incidence. Stations, case dimensions,
  masses and CG remain unchanged estimates. No skin-cutout or linkage-load model
  is claimed. Browser restored/applied the revised Tiny and inspected its underside.
- Regression compares each rendered output-axis direction to its panel lower
  normal. Updated the reconstruction guide's older mass-split descriptions to
  include the prop allocations introduced in pass 21.
- Verification: 209 tests / 35 files, production build and numerical report pass.
  Tiny retains 81/135 trim solutions with zero nonfinite loads. Pass-22 CI
  33935250417 passed on Node 22/24 and Arduino compilation.

## Pass 24 · recover the chosen aircraft on reload

- Browser reload always returned to Bronco, interrupting repeat testing of another
  model. The last available catalog selection now restores together with its
  validated applied definition. New sessions still start on the ground in Pilot
  view with the observer beside the plane. Flight state is not resumed.
- Centralized saved-model reads for selection and catalog cards. Oversized,
  malformed and mismatched-ID overrides fall back to their source aircraft;
  unavailable storage and removed selections remain usable.
- Browser selected Tiny, changed to hand/chase, then reloaded: Tiny remained
  selected, Ground/Pilot returned and the observer was 4 m away. Subsequent hand
  flight paused at 15.4 s, 8.5 m/s and 19.8 m AGL with 94% charge. No hardware
  input or measured-flight claims. Custom imports remain session catalog entries.
- Verification: 211 tests / 36 files and production build pass. No dynamics change.

## Pass 25 · visible flight framing

- Reproduced a phone Chase view where the expanded attitude/map panel completely
  covered the Tiny Trainer. The canvas included 211 px hidden by wrapped bottom
  instruments. It now excludes the measured HUD height, with Locate sharing the
  same viewport bounds. No extra draw calls, assets or simulation changes.
- Fixed a tablet breakpoint that put camera buttons across the status card.
- Inspected rendered 390 × 844, 760 × 920 and desktop layouts; exercised
  Pilot/Chase, Locate alignment, runway placement, Ground launch setup and the
  observer's Beside aircraft preset. The editor viewport remains independent.
- Previous pass 23 and 24 CI runs passed on Node 22/24 and all six Arduino compile
  targets. Those are compilation/numerical checks, not physical hardware evidence.
- Verification for this pass: production typecheck/build and docs checks pass;
  browser console has no errors. Changes are limited to CSS and overlay markup.

## Pass 26 · recover applied custom aircraft

- Found that an unbundled JSON import could say "saved locally" but disappear from
  the catalog on reload. Applied imports now retain a validated local source
  registry, separate from applied edits, and rejoin the catalog before selection
  recovery. Restore original uses the imported source; bundled IDs retain their
  repository definitions. Reimporting a custom ID updates its baseline.
- Import feedback explains the Apply step and portable JSON export. Storage quota
  and size failures do not claim success. Catalog data is bounded and revalidated;
  malformed entries cannot hide other valid models or replace bundled IDs.
- Added fresh-catalog recovery and corrupt/quota/ID-isolation regressions. No
  physics, render-loop or file format change.
- Verification: 213 tests / 36 files, bundled validation, production build and
  docs checks pass. Browser verified Apply → reload retained a 263 g Tiny Trainer,
  then Restore original → Apply returned 253 g. Import registry recovery was
  tested through the storage boundary; the browser tool has no file-upload
  capability, so no synthetic browser import is claimed.

## Pass 27 · restrain foliage highlights

- Compared the same Northfield Chase position before/after removing the 1.5×
  brightness boost on prelit foliage. Crowns now blend more naturally with the
  ground. Checked Alpine conifers and Desert scrub afterward. The source retains
  pale leaves and birch bark; this is not a claim that every edge artifact is gone.
- Retained the RGBA atlas, alpha-to-coverage, lower-branch shading and all existing
  instance/render budgets. No new texture tap, geometry or shadow pass.
- Passes 25 and 26 CI passed on both Node versions and Arduino compile targets.
- Verification: production typecheck/build and docs checks pass. Shader compiled
  during the browser comparisons without console errors. No dynamics change.

## Pass 28 · bring the agent architecture guide up to date

- Audited the architecture guide against massProperties, Simulation, powertrain,
  actuation, trim/launch, storage and scenery code. Corrected stale statements
  about axis-aligned-only inertia, omitted prop reaction torque, level-only hand
  launch trim, and the legacy runtime foliage path.
- Added concise component/power/actuation and local-import contracts, including
  what is measured input versus approximation. Clarified that quad prop diameter
  alone does not derive thrust/current and battery charge does not remove mass.
- This is documentation of existing behavior, not a fidelity or hardware claim.
- Verification: docs link/script checks and repository formatting pass. Runtime
  statements were checked against the current source instead of historical notes.

## Pass 29 · expose trim limits and avoid idle endurance claims

- A full-power FT-22 hand-launch playtest looped and impacted at about 9 s. Pure
  simulation reproduced it (about 8.7 s) while trimmed power retained the initial
  climb. Investigation found +77.7% pitch / 31.1° elevon trim at 8.5 m/s. Rechecked
  original PDF CG symbols and current manufacturer CG specification; neither
  validates the independent-surface aerodynamic assumptions. Documented the
  handling gap rather than changing CG/coefficients to hide it.
- Existing flight-setup feedback now identifies high pitch trim and failed trim;
  a failed solve no longer describes the release as trimmed. Corrected the trim
  slider's ±80% clamp to represent the solver's full normalized range.
- Battery reserve-time hints no longer extrapolate flight endurance from the
  avionics-only current after impact or with stopped motors. Charge-used and
  remaining-capacity values are preserved.
- Browser verified the stock high-trim note, then a deliberately 1,000 g draft
  showed Trim failed at 8.5 m/s and removed the balanced-release claim. The draft
  is restored to the original before delivery. Force equations are unchanged.
- Verification: 214 tests / 36 files, bundled validation, typecheck/build and docs
  checks pass. Numerical report remains passed. Browser confirmed high/failed trim,
  original mass restoration and no console errors. Narrow review found the setup
  heading/Close could scroll away; that is the next layout correction.

## Pass 30 · retain setup navigation while scrolling

- Narrow review reproduced a hidden Flight setup heading/Close after scrolling.
  Made the panel a bounded column and moved scrolling into its active tab. Close,
  tabs and the flight action keep their own space rather than overlaying content.
- Browser checked 390 × 844 Aircraft/Input, keyboard visual, long-content scroll
  and navigation through Edit this aircraft. No added interface or runtime work.
- Verification: desktop retains the same compact setup and full inspection view;
  typecheck/build/docs checks pass. Switching FT-22 Hand throw to Quad 450 selects
  Ground and disables hand throw; start/pause/reset remain reachable.

## Pass 31 · eliminate artificial parked-quad yaw

- Browser Quad 450, Ground, zero throttle drifted roughly 12° in 20 s. Pure
  simulation reproduced 11.648° with motors [0,0,0,0]. The contact loop clamped
  each increment instead of the accumulated support/friction impulses.
- Corrected per-step accumulated projection with the same eight iterations,
  coefficients and 120 Hz step. Compared the method with Catto's primary solver
  explanation. The same 20 s case now drifts about 0.00082° and 2 micrometres
  horizontally. This fixes implementation behavior, not measured tire fidelity.
- Added stationary regressions for all three quads with 0°/90° headings and
  reversed contact order. Existing takeoff, landing and friction tests pass.
- Simulation/package version is 0.7.1; 0.7.0 recordings are explicitly incompatible.
  Aircraft format 1 and preferences remain compatible. The grounded quad badge
  now says Grounded rather than Ground roll.
- Verification: all 217 tests / 37 files, seven bundled definitions, typecheck,
  production build, numerical physics report, docs and formatting checks pass.
  The envelope survey has zero nonfinite loads; unsolved trim points remain
  reported, including the FT-22's existing limits. Browser idle reaches 26 s with
  heading still 000°, zero displayed airspeed and stopped motors.

## Pass 32 · pilot distance and final ground-flight checks

- Browser ground launches after the solver correction: Quad 450 lifts vertically;
  Tiny Trainer reaches 15.5 m AGL after 9 s and Bronco reaches 52 m after 12 s at
  full power. Pause, reset and Chase work. These are model regression observations,
  not evidence of measured climb performance.
- The quad's vertical climb exposed a misleading Distance instrument: it ignored
  altitude and still showed 4 m almost 180 m overhead. It now includes vertical
  separation from the pilot's eye, with `m to pilot` and a straight-line tooltip.
  The minimap intentionally remains a ground projection. No forces change.
