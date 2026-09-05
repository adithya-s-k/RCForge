# Simple Trainer · Vortex RC

`aircraft/vt-simple-trainer.json` is an independent reconstruction of the
**Vortex RC VT-Simple Trainer**. Select **Simple Trainer** in the
hangar or aircraft selector. The old generic RCForge example is no longer a
bundled preset; its definition is retained only as a numerical test fixture.
Previously exported copies still import as custom aircraft. The FT Tiny Trainer
remains a separate design.

## Evidence and reconstruction

References inspected on September 5, 2026:

- [Vortex RC product specifications, build photographs and electronics pack](https://www.vortex-rc.com/product/vt-simple-trainer/)
- [Assembled aircraft](https://www.vortex-rc.com/wp-content/uploads/2019/03/trainer-600x600.jpg), [overhead view](https://www.vortex-rc.com/wp-content/uploads/2019/07/VT-Simple-Trainer-2.jpg), [front flight view](https://www.vortex-rc.com/wp-content/uploads/2019/07/VT-Simple-Trainer-3.jpg) and [side flight view](https://www.vortex-rc.com/wp-content/uploads/2019/07/VT-Simple-Trainer-1.jpg)
- [Laser-cut wing sheet photograph](https://www.vortex-rc.com/wp-content/uploads/2019/03/trainer-left-wing.jpg) and [fuselage/tail sheet photograph](https://www.vortex-rc.com/wp-content/uploads/2019/03/trainer-fuse.jpg)
- [DYS CF2822-14 motor listing](https://www.vortex-rc.com/product/dys-cf2822-14-1200kv-brushless-outrunner-motor/)

These are photographs of parts and assemblies, **not scale-calibrated drawings**.
No dimensioned downloadable plan was located in the linked material. Their
perspective, limited resolution and unmarked dimensions prevent an exact CAD
reconstruction. The linked build video was not used as measurement evidence.
Original photos, artwork and video are not bundled or relicensed.

| Parameter             | Preset                                                                         | Evidence                                                                           |
| --------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| Span                  | 1,400 mm projected tip-to-tip                                                  | Published metric specification                                                     |
| Length                | Approximately 800 mm including nose/prop hub                                   | Published length; detailed stations estimated                                      |
| Dry / all-up mass     | 350 / 500 g                                                                    | Published totals; internal allocation estimated                                    |
| Wing layout           | Flat inner panels, raised outer panels; no ailerons                            | Photos and polyhedral description                                                  |
| Wing dimensions       | 200 mm root chord; 395 mm inner half-panel; outer projected span 305 mm at 12° | Proportions estimated from photos                                                  |
| Wing area             | 0.28161 m² developed; 17.75 g/dm² loading                                      | Calculated from estimated geometry                                                 |
| Tail                  | Rounded 360 mm stabilizer, 130 mm fin                                          | Independent outlines from sheet photos; dimensions estimated                       |
| Motor / ESC / prop    | DYS CF2822 1200 KV / 30 A / 9 × 4.7                                            | Selected product-page power pack                                                   |
| Servos                | Two 9 g positional servos                                                      | Published count/mass; travel and speed provisional                                 |
| Battery               | 3S 1,300 mAh; 150 g installed allocation                                       | Capacity within recommended range; mass is the difference between published totals |
| CG                    | **Provisional: 58 mm aft of the wing leading edge**                            | Interpretation, not a verified manufacturer station                                |
| Default airborne trim | 9 m/s                                                                          | Estimated operating point, not measured cruise speed                               |

The product's CG text says **58 mm from the nose**. That station would be far
forward of the reconstructed wing and is inconsistent with a plausible wing
balance. The model uses 58 mm from the wing leading edge as an explicit
assumption. **Confirm the physical kit's CG marks or obtain a manufacturer
clarification before using this value for a real build.** The simulator's trim
solution cannot resolve this source ambiguity.

The product's separate shipping weight is not flying mass. Its motor page also
suggests a different prop from the kit's 9 × 4.7 option. We select the kit option;
there is no measured performance claim for that combination.

## Components and construction

The ledger contains 19 editable parts. Wing panels total 112 g, the fuselage
65 g and tail surfaces 19 g. Other dry allocations are motor 50 g, ESC 25 g,
servos 18 g, prop/saver 9 g, receiver 8 g, pushrods 8 g, gear 20 g, wing retention
3 g, firewall 7 g and wiring/hardware 6 g. The 150 g battery closes the 500 g
total. This is one reference build budget, not a measured bill of materials.
Replace these values with the actual pack and component masses in **Components**.

The white folded wing has four aerodynamic panels and two polyhedral joints.
Rounded tips and tail outlines, the narrowing box fuselage, orange two-blade
prop, rubber-band wing retention and white foam wheels follow the references.
The wingtip cavity, hidden structure, linkages and material finish remain
simplifications. There are no downloaded textures or new external assets.

Body X points forward, Y right and Z down. The wing leading edge is at X = 0.100 m;
the provisional CG is at X = 0.042 m. Surface centers, component mass centers,
and the rendered skins are specified separately. The inertia tensor is calculated
from estimated component envelopes, not measured from the physical model.

Installed wire gear and its tail-skid allowance are included in the dry mass.
Ground start does not add the generic 45 g tricycle gear. The launch pose aligns
both wheels and the skid with the runway before Start; the tail does not drop
from a floating level pose. There is no steering servo: taxi steering comes from
rudder airflow, with the simulator's approximate contact friction.

## Flying and editing

- **Pitch:** ↑/↓. **Rudder/turn:** Q/E. **Power:** Space/Shift. There is no aileron,
  so the roll channel intentionally has no effect. On a radio/gamepad, map **yaw**
  to the horizontal stick you want to steer with. RCForge keeps physical channels
  explicit instead of silently rewiring an existing controller profile.
- Use **Control test** to inspect elevator and rudder travel. The preset starts
  with Standard response; Gentle and Custom remain available. Servo speed, horn
  ratio, response and surface limits are editable. Nominal physical limits are
  ±20° elevator and ±25° rudder, before pilot-rate reduction.
- **In flight** starts at the authored 9 m/s trim. **Hand throw** retains the
  existing 8.5 m/s, eight-degree climbing release. These are simulation defaults.
  Ground flight needs gradual power and pitch input as speed builds.
- **Surface mixing** remains available. Adding a roll contribution to the rudder
  is an explicit modification; it does not create ailerons. The default browser
  experiment selector disables the unwired roll-response test. Core roll commands
  still predictably leave the two surfaces unchanged.
- Span edits scale the height of the inclined panels about the inner roots, along
  with spanwise mass positions and wingtip contacts. This preserves joined panels
  and their fixed polyhedral angles. Component offsets from their matching panels
  are retained. A changed span is a modified aircraft, not a stock kit.
- FPV can be added through the existing camera workflow. It changes the component
  mass/CG/inertia; the stock preset has no camera.

## Physical limits and verification

The lift slopes are independent finite-span estimates using
`2π / (1 + 2 / (e × aspect ratio))`. Camber, drag, pitching moment, stall,
incidence, damping, servo speed, thrust/current and battery resistance are
estimated. Polyhedral roll response comes from each inclined panel's local
sideslip forces; no self-leveling controller is added. The single-axis rudder
also produces a transient roll moment before sideslip banks the aircraft.

The electrical curve is an estimated static motor/prop combination, with the
existing approximate voltage sag, speed falloff and consumption model. The
preset does not identify propeller reaction torque. Downwash, dynamic stall,
P-factor, gyro effects, foam flex and measured hinge loads remain unresolved.
Displayed endurance is particularly sensitive to the unmeasured current curve.

Numerical review found valid calm-air trim at 6, 8.5, 9 and 12 m/s. The 9 m/s
preset avoids forcing this low-wing-loading trainer to start at the historical
12 m/s default. The reference 20-second cruise remains airborne; rudder pulses
turn and bank in the requested direction. The unflared power-off test from
18 m reaches the ground after about 10.5 seconds and is classified as an impact.
It retains cruise elevator trim throughout; it is not a best-glide optimization,
landing maneuver or evidence of the physical kit's glide ratio.

The 135-point speed/density/mass/charge survey solves 81 trim points. Its
16 and 22 m/s points fail because the estimated propulsion cannot sustain them;
all high-angle load samples remain finite. Failures stay visible. A reference
speed is not a certified operating envelope.

Regression coverage checks mass accounting, CG evidence status, physical control
signs, mirrored rudder turns, sideslip response, panel joins after span changes,
three-point ground support under different headings, powered takeoff, hand
release, servo preview agreement, battery drain, replay, and geometry bounds.
The model remains below 100 draws and 15,000 triangles in the shared geometry
budget. Browser review covers the model, catalog, launch modes, control test and
experiments. No real aircraft, radio or servo was used for validation.

## Reproduce or import

```sh
npm run aircraft:validate -- aircraft/vt-simple-trainer.json
npm run physics:validate -- vt-simple-trainer
npm run physics:envelope -- vt-simple-trainer
npm run simulate -- vt-simple-trainer --scenario cruise --duration 20
npm run simulate -- vt-simple-trainer --scenario pitch-pulse --duration 5
npm run replay -- results/vt-simple-trainer-pitch-pulse/recording.json
npm run simulate -- vt-simple-trainer --scenario glide --duration 20
```

The aircraft is already bundled. For a modified copy, export from the editor or
edit the JSON, then use **Aircraft editor → Import JSON → Apply to flight**.
Browser edits do not rewrite the repository definition. Use a distinct ID for a
separate build. See [aircraft authoring](aircraft-authoring.md),
[component models](component-models.md) and [validation limits](validation.md).
