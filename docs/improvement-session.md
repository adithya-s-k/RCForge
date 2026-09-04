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

## Next passes

1. Improve studio lighting and inspection views; check both new catalog previews.
2. Improve new preset geometry and catalog previews where playtests show faults.
3. Playtest both presets, aircraft selection and editor behavior.
4. Review input selection, mapping, calibration and Arduino bridge workflows.
5. Inspect desktop and narrow layouts, rendering cost and flight feedback.
6. Run checks, numerical validation and branch CI; commit coherent changes.

Update this log after each completed pass with evidence, limitations and the next
concrete task. Keep task output and temporary reference downloads in `results/`.
