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

Ruler-based readings from the plan give approximately 192 mm wing chord, 254 mm flat span per A-tail panel, 102 mm tail chord, 658 mm boom length and approximately 68 mm fuselage core width (refined from the earlier 63 mm estimate). Reading precision is approximately a few millimetres, not manufacturing tolerance. At the assumed 45° assembly angle the A-tail yields approximately 359 mm boom spacing and 180 mm apex height. Those two assembled dimensions depend on the angle assumption. Outer-span ailerons occupy approximately 61% of each half-wing in the visualization; the aerodynamic surface still uses lumped control effectiveness.

Battery mass is assumed to be 190 g; its position is solved to meet the published CG. Four 9 g servo masses are accounted for. Remaining component allocations, folded nose cross-sections, thrust curves, aerodynamic polars and inertia distribution are estimated. The PDF length uses inconsistent imperial/metric values (36 in versus 927 mm); do not treat either as a precise assembled measurement.

The updated wing skin uses 5 mm board and an estimated 21 mm folded height, with
a straight aileron hinge at 76.5% root chord. The sheet-3 tail hinge is approximately
192.42 / 288.06 = 66.8% chord; its inner trailing-edge relief is retained so the
moving panels do not form an unbroken corner at the apex. Each nacelle/prop
assembly has a 20 g allocation (14 g nacelle plus 6 g prop), split from the
former 124 g fuselage allocation.
The 60 g booms taper toward the tail; their estimated mass centers move 40 mm
forward to represent this taper. Tail servos sit on the rear booms. These are
assembly estimates, not weighed or scanned parts. Battery position is solved
again so total mass remains 830 g and the longitudinal CG remains 51 mm aft of LE.

The central nose now also uses the original sheet-1 **Nose / part 05** outline.
The right-side cut path runs from Y = 139.420 to 712.960 pt; its inner fold is
at X = 1344.86 pt. This gives a 202.33 mm projected nose length and a
131.66 mm rear height (371.64 pt). Sampled upper/lower curves replace the
previous generic pointed profile. The approximately 68 mm parallel section
follows the core fold separation, including foam overlap; the front retains
its broad width rather than tapering to a narrow point.

The nose apex stays near body X = 327 mm. Joining it to the rear fuselage,
vertical registration and the cockpit paint are photo-guided estimates. The
84 g fuselage allocation and its mass center are unchanged; its updated outer
68 × 132 mm cross-section changes the cuboid inertia estimate. Curved roof
paint and side panes follow the skin, with thin white mullions. This is a
procedural reconstruction of the build's silhouette, not a scan or a CAD fit.

## Tiny Trainer Sport

The plan specifies 193 g without battery, 16° throws, 30% expo and a minimum 5×3 propeller. The preset assumes a 60 g battery for 253 g total. The source recommends a 250-size 2200 kv motor, minimum 12 A ESC, 500–1000 mAh 3S battery and 5 g servos. The preset uses an estimated 3S 650 mAh pack and simplified battery discharge. Motor-current data remains estimated; ESC electronics are not simulated.

Vector/ruler readings put the flat sport half-wing around 478.5 mm with 139.5 mm root chord and approximately 32 mm aileron chord. The assembled approximation uses 5° dihedral and 953 mm projected span. Integrating the sampled tapered outline gives 0.12566 m² wing area and 131.3 mm equivalent chord. The 2.8 N motor thrust and aerodynamic coefficients remain estimates requiring bench and flight data.

The original sheet-2 lower wing skin has its CG marker at X = 523.187 pt and
leading-edge fold at X = 649.187 pt. Their 126 pt separation is 1.75 in =
**44.45 mm**. The opposite half repeats the same offset at X = 1603.187 and
1477.187 pt. This replaces the earlier 35 mm estimate; the 60 g battery moves
aft to approximately X = 124.3 mm while the airframe stays at 253 g.
The later [v1.1 plan cover](https://ftforumx2.s3.amazonaws.com/2020/03/290620_b3da14e2e4fd2e6cfb3982664ceafcd4.pdf)
independently lists 1.75 in / 44 mm. The current
[MKR2 product specification](https://store.flitetest.com/ft-mighty-mini-tiny-trainer-mkr2/)
gives a 38–44 mm range. These references establish a starting balance point,
not measured aerodynamic stability. Later references recommend a 6×3 prop;
this reconstruction retains the original plan's 5×3 minimum configuration.

The aileron runs approximately 31–373 mm outboard on each half, leaving the swept,
rounded tip fixed. Its hinge follows the plan's 90 pt trailing strip. The folded
section assumes 5 mm board and 14 mm height. The horizontal tail and rudder
outlines are sampled from the diagonal drawings on sheet 2, rotated into their
assembled hinge axes; the resulting horizontal span is about 286 mm. Mounting
tabs are omitted. Tail area and quarter-chord locations follow these outlines,
but aerodynamic effectiveness remains estimated.

Main fuselage, removable powered nose and prop divide the existing 49 g allocation
into 37 g, 10 g and 2 g. Horizontal tail and fin divide the 20 g tail allocation into
14 g and 6 g. Crossed retaining bands and dowels follow the assembled wing root;
their mass is included in the structure. The assumed battery is placed beneath
the nose to clear the motor envelope and balanced longitudinally to the nominal
CG. Nose overlap, band placement, battery installation, folded heights and all
individual mass centers remain estimates. The total is still 253 g. These
presets do not simulate folding, fastener loads or structural flexibility.

The sport-wing servos face the lower skin, as shown in the original
[wing installation photograph](https://s3.amazonaws.com/assets.flitetest.com/article_images/full/mvi-0068-01-01-39-14-still006-jpg_1426702182.jpg).
Their component frames follow panel dihedral/incidence, so their shafts and arms
face out of the underside instead of up into the wing. Existing mass, station
and case dimensions remain estimates; full skin cutouts, guide rods and insertion
depth have not been reconstructed. Fuselage servo placement remains estimated.

## FT-22 Raptor

Added 2026-09-05 from the original [FT-22 build and assembly photos](https://www.flitetest.com/articles/ft-22-raptor-build)
and [two-sheet full-size plan](https://s3.amazonaws.com/plans.flitetest.com/stonekap/FT-22-plans.pdf).
This is the foamboard pusher park jet, not an EDF model or the Mighty Mini.
The plan's 235 g dry reference plus an assumed 85 g 3S pack gives 320 g.
Its two servos operate mixed elevons; the canted fins are fixed. There is no
rudder command. Roll to turn and use elevator to manage the turn.

The [manufacturer's listing](https://store.flitetest.com/ft-22-mkr2/) gives both
25.5 inches and 635 mm for span; these disagree. The reconstruction uses the original PDF
ruler: its one-inch rectangles span exactly 72 points (X = 231.474 to 303.474);
centimetre bars independently span about 28.347 points. The traced wing is
therefore approximately 649.3 mm wide at the printed scale, replacing the earlier
635 mm interpretation. This preserves the source drawing rather than forcing
its outline to a conflicting retail specification. The [project article](https://www.flitetest.com/articles/ft-22-raptor-pr)
contains an older F-22 photograph as well as the FT-22: the newer foam nose,
intakes and side rails are the relevant assembly. The PDF's assembly inset was
also inspected. No source artwork is bundled.

The current reconstruction uses these PDF vector stations (points, before scaling):

| Feature                       | Measured station                                    | Interpretation                                                            |
| ----------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------- |
| Main plate span               | Y = 36.906 to 1877.399                              | 649.3 mm ruler-derived span; centerline Y = 957.152                       |
| Circle-cross datum            | X = 1296.53                                         | Interpreted as the plan CG station; verify on a real build                |
| Main-plate trailing edge      | X = 2179.925                                        | Aft of the prop opening                                                   |
| Main-plate half-width at tail | 379.538 pt                                          | Matches separate tail's 378.706 pt hinge edge                             |
| Separate elevon               | Sheet 2, X = 355.37 to 923.75; Y = 464.67 to 876.11 | About 200.5 mm outboard reach and 145.1 mm depth; rounded corners sampled |
| Fuselage side outline         | Sheet 2, X = 307.046 to 1687.497                    | 487 mm side profile at the printed ruler scale                            |
| Fin root and height           | About 308 and 389 pt                                | 109 mm root, 137 mm height before cant                                    |

Body X points forward, so increasing sheet-1 X points aft. The main plate's
front bevel lines are intake folds, **not elevon hinges**. A symmetric propeller
opening is retained. The separate elevons join the main trailing edge with a
0.8 mm visualization gap; the two fixed fins lean outward by an assumed 18°.
The nose side curve is sampled into a light faceted loft; widths, foam overlap,
forward intake registration and canopy marking remain assembly estimates.
The underside side plates and servo openings use the registration described below.
No detailed glue beads, decals or photogrammetry are claimed.

The 400 mm nose-to-CG target is retained within the manufacturer’s 394–406 mm
range. The independent body-sheet registration remains an assembly estimate. This places the CG approximately
8.9 mm behind the reconstructed main-wing root leading edge; the nose and wing
leading edge are different references. The earlier 90 mm root reference was an
assembly approximation and has been replaced. Wing/elevon mass positions follow
polygon centroids; inertia remains a cuboid approximation. The intake and rail
masses are split from the existing 60 g fuselage allocation; total mass stays
320 g. Structural dimensions, area, mass centers and inertia follow the ruler
correction; 5 mm board thickness and physical hardware dimensions stay fixed.
The 9-inch propeller now clears the reconstructed main-plate opening in a sampled
360° blade sweep; this does not establish physical build tolerances or flex.
The battery is positioned to balance the mass ledger, not assumed to be
at a measured installation station.

Aerodynamic centers use area-weighted quarter-chord estimates from spanwise
polygon strips. The 9×4.7-inch prop follows the plan; 4.8 N thrust, speed falloff,
current draw, servo response and all aerodynamic coefficients remain estimates.
The two servos now provide the published ±40° surface limit through an assumed
50° servo command and 10/12.5 mm horn ratio. Smaller throws may leave insufficient
trim authority at low speed. Delta vortex lift, separated flow and actual
control response have not been measured.

Hand launches now solve a steady 8° climb at 8.5 m/s: body pitch, motor command
and elevon trim follow that operating point, instead of imposing 65% power on
every aircraft. This only prepares the release; controls remain fixed unless
the pilot moves them. Battery discharge, weather and later throttle changes can
move the aircraft away from trim. Ground mode adds the separate removable gear
modification; it is not in the original FT-22 build.

## Verification boundary

Mass totals, CG references, prop diameter and elevon control signs have regression checks. All three designs trim at the default operating point, and the numerical physics report includes their definitions. These checks verify implementation consistency; they do not establish agreement with a real aircraft. Reproduce an actual build's component masses, CG, thrust-versus-command curves and recorded response before making that claim.

Ground mode adds the existing optional 45 g tricycle gear modification. It is not part of the original foamboard builds. Select hand launch or airborne mode to use the reference airframe without that modification.

## Motor installation consistency

Fixed-wing motor housings now use their linked component positions and dimensions
instead of an unrelated renderer size/offset. Bronco housings use estimated
27 × 34 × 34 mm envelopes at X = 88 mm; Tiny Trainer uses 24 mm envelopes at
X = 193 mm. These stations retain the existing reconstructed visual mount
positions and are not measurements of a particular motor. The FT-22 uses its
authored 28 × 28 × 26 mm envelope. Vents and adapters are cosmetic detail whose
mass is included in the existing motor allocation. Motor thrust direction is
still along the vehicle axis; component inertia-frame rotation is not motor cant.

The Bronco and Tiny motor mass allocations and total masses are unchanged. Moving
their motor centers to the visible housings shifts the battery aft by 10.9 mm and
3.3 mm respectively to retain the same mass-weighted CG. This changes calculated
inertia. Housing geometry is a simplified envelope, not an exact manufacturer
CAD model; enter measured dimensions/positions for a known physical build.

Fixed-wing propellers use slender tapered, twisted blade meshes rather than
scaled ellipsoids. The Bronco's light blade finish and vertical parked pose follow
the inspected assembly photograph. Each blade uses 300 triangles and stays inside
the specified rotor radius; geometry is shared between that propeller's blades.
Chord, twist and section thickness remain visual estimates. They do not supply
propeller polars, pitch-derived thrust or extra component mass. Specified CW/CCW
spin now also controls fixed-wing propeller animation.

## Separate propeller mass allocations

All three FT presets now link a distinct prop mass component to each motor.
Bronco allocates 6 g per prop from the former nacelle allocation; Tiny allocates
2 g from the powered nose; FT-22 allocates 8 g from its fuselage allocation.
These are explicit estimates, not weighed propellers. Reference all-up masses
remain 830, 253 and 320 g, respectively; the battery stations are rebalanced to
retain the longitudinal CG references. The changed distribution updates inertia.

The prop's authored installation position drives its visible center, and motor
package replacement updates both masses and the matching propulsion curve once.
The component envelope represents the parked blade assembly approximately; it
is not blade CAD or a spin-averaged inertia model. Catalog props can exceed the
reconstructed opening. The baseline FT-22 clearance regression does not establish
clearance for arbitrary replacements, flex or mounting tolerances.

## FT-22 side plates and servo installation

The original [build sequence](https://www.flitetest.com/articles/ft-22-raptor-build),
[side-plate installation photograph](https://s3.amazonaws.com/assets.flitetest.com/article_images/medium/ft-22-build-3-jpg_1389801207.jpg)
and [servo close-up](https://s3.amazonaws.com/assets.flitetest.com/article_images/medium/ft-22-raptor-7-jpg_1389633259.jpg)
show sideways servos in the underside walls. Earlier separate rails above the
wing and upright servo blocks have been replaced by that assembly.

| Plan feature          | Registration / reconstructed dimension                                            |
| --------------------- | --------------------------------------------------------------------------------- |
| Sheet-2 rear wall tab | X = 1078.348–1158.065 pt, reversed onto sheet-1 slot X = 2043.153–2122.871 pt     |
| Sheet transform       | Sheet-1 X + sheet-2 X = 3201.219 pt                                               |
| Wall lateral station  | Slot Y = 1283.128–1295.368 pt gives center 117.16 mm from the aircraft centerline |
| Wall depth            | Y = 1661.053–1748.928 pt gives 31.00 mm beneath the wing                          |
| Servo opening         | 65.196 × 34.015 pt gives 23.00 × 12.00 mm; reconstructed X = −47.18 mm            |

The forward cheek folds follow the narrowing intake with an estimated fold angle.
Servos face outboard at ±90° roll in their component frames. Their cases sit in
the modeled openings, with estimated insertion depth and mass centers. Plastic
color follows component data. The original 20 g folded assembly allocation is
now floor 6 g plus two 7 g side plates; the battery is rebalanced to retain 320 g
and the nose-to-CG reference. Inertia follows the revised installation.

Regression checks cover transformed servo bounds, registration, mass/CG and the
side-wall distance from the full prop radius. Clearance is sub-millimetre in this
reconstruction, so these checks do not prove physical tolerances. Pushrod routing,
guide channels, glue and loaded linkage kinematics remain unresolved details.
