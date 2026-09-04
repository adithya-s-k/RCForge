# Flite Test reference reconstruction

Reference review: 2026-09-04. These presets are independent procedural reconstructions, not manufacturing CAD or flight-test calibrated digital twins. Images establish assembly topology; full-size drawings establish dimensions where measurable. Cut outlines are not automatically assembled dimensions: foam folds, overlap, dihedral and bevels must be interpreted.

## Sources inspected

- [FT Bronco build article and assembly images](https://www.flitetest.com/articles/ft-bronco-build)
- [FT Bronco v1.0 full-size plan, five PDF pages](https://s3.amazonaws.com/plans.flitetest.com/stonekap/FT%20Bronco%20v1.0%20Full-Size.pdf): specifications and nose on sheet 1, booms on sheet 2, A-tail on sheet 3, wing on sheet 4.
- [FT Tiny Trainer build article and assembly images](https://www.flitetest.com/articles/flite-test-tiny-trainer)
- [Tiny Trainer two-sheet plan](https://s3.amazonaws.com/plans.flitetest.com/stonekap/FT-Mini%20TinyTrainer-plans.pdf): fuselage and polyhedral option on sheet 1; powered nose, tail and sport wing on sheet 2.

The trainer preset selects the four-channel **sport wing**, not the three-channel polyhedral wing. The original Simple Trainer remains a separate generic RCForge design. Source images and PDF artwork are not bundled.

## Bronco A-tail

Published references: 1,086 mm wingspan, 20.8 dm² wing area, 51 mm CG behind the leading edge, 640 g without battery, 830 g reference flying weight, 12° throws, and 30% recommended transmitter expo. Preset uses 203.2 mm (8 inch) props. Expo is a controller setting, not an aerodynamic coefficient; the aircraft preset does not overwrite your controller profile.

Ruler-based readings from the plan give approximately 192 mm wing chord, 254 mm flat span per A-tail panel, 102 mm tail chord, 658 mm boom length and 63 mm fuselage core width. Reading precision is approximately a few millimetres, not manufacturing tolerance. At the assumed 45° assembly angle the A-tail yields approximately 359 mm boom spacing and 180 mm apex height. Those two assembled dimensions depend on the angle assumption. Outer-span ailerons occupy approximately 61% of each half-wing in the visualization; the aerodynamic surface still uses lumped control effectiveness.

Battery mass is assumed to be 190 g; its position is solved to meet the published CG. Four 9 g servo masses are accounted for. Remaining component allocations, folded nose cross-sections, thrust curves, aerodynamic polars and inertia distribution are estimated. The PDF length uses inconsistent imperial/metric values (36 in versus 927 mm); do not treat either as a precise assembled measurement.

## Tiny Trainer Sport

The plan specifies 193 g without battery, 16° throws, 30% expo and a minimum 5×3 propeller. The preset assumes a 60 g battery for 253 g total. The source recommends a 250-size 2200 kv motor, minimum 12 A ESC, 500–1000 mAh 3S battery and 5 g servos. These electrical specifications are reference setup information; battery discharge and ESC electronics are not simulated.

Vector/ruler readings put the flat sport half-wing around 478.5 mm with 139.5 mm root chord and approximately 32 mm aileron chord. The assembled approximation uses 5° dihedral and 953 mm projected span, an equivalent aerodynamic chord/area, tapered tips and a conventional foamboard tail. Wing shape and fuselage/nose overlap are approximations rather than a complete fold simulation. The nominal 35 mm CG target is estimated, not a verified published text specification. The 2.8 N motor thrust and aerodynamic coefficients remain estimates requiring bench and flight data.

## FT-22 Raptor

Added 2026-09-05 from the original [FT-22 build and assembly photos](https://www.flitetest.com/articles/ft-22-raptor-build)
and [two-sheet full-size plan](https://s3.amazonaws.com/plans.flitetest.com/stonekap/FT-22-plans.pdf).
This is the foamboard pusher park jet, not an EDF model or the Mighty Mini.
The plan's 235 g dry reference plus an assumed 85 g 3S pack gives 320 g.
Its two servos operate mixed elevons; the canted fins are fixed. There is no
rudder command. Roll to turn and use elevator to manage the turn.

The [manufacturer's listing](https://store.flitetest.com/ft-22-mkr2/) gives both
25.5 inches and 635 mm for span; these disagree. This preset chooses 635 mm,
scales a simplified wing outline to that width, and places CG 400 mm aft of the
nose, within its published 394–406 mm range. The editor uses a wing-root leading
edge 90 mm ahead of CG; that datum is not the nose. Fold heights, fin/elevon
stations and the nose loft remain approximate. Source artwork is not bundled.

The 9×4.7-inch prop follows the original plan; 4.8 N thrust, speed falloff,
servo dynamics and all aerodynamic coefficients are estimates. The wing's
low-aspect-ratio/vortex behavior is not independently validated. At the initial
definition, 12 m/s trim converged, numerical/replay checks passed, and 22 of 45
surveyed mass/speed/site combinations trimmed. Unsolved points are retained.
Ground mode adds the same explicitly estimated removable gear modification;
hand launch preserves the reference gearless build.

## Verification boundary

Mass totals, CG references, prop diameter and elevon control signs have regression checks. All three designs trim at the default operating point, and the numerical physics report includes their definitions. These checks verify implementation consistency; they do not establish agreement with a real aircraft. Reproduce an actual build's component masses, CG, thrust-versus-command curves and recorded response before making that claim.

Ground mode adds the existing optional 45 g tricycle gear modification. It is not part of the original foamboard builds. Select hand launch or airborne mode to use the reference airframe without that modification.
