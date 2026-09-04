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

## Verification boundary

Mass totals, Bronco CG and prop diameter have regression checks. Both designs trim successfully, and the numerical physics report includes both definitions. These checks verify implementation consistency; they do not establish agreement with a real aircraft. Reproduce an actual build's component masses, CG, thrust-versus-command curves and recorded response before making that claim.

Ground mode adds the existing optional 45 g tricycle gear modification. It is not part of either original foamboard build. Select hand launch or airborne mode to use the reference airframe without that modification.
