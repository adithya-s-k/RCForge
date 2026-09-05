# Add an aircraft

1. Copy `aircraft/ft-tiny-trainer.json` to a new lowercase, hyphenated ID, and update `id`, `name`, `description`, `credit` and `provenance`.
2. Establish a fixed datum and use meters, kilograms, seconds and Newtons. Angular definition fields ending in `Deg` use degrees. Physical state uses radians.
3. Add `parts` with mass, position, cuboid dimensions and a visual color. Account for the battery, motors, servos, structure and payload exactly once. Wing/tail parts contribute mass; their visible lifting surfaces come from `surfaces`.
4. Add wing halves and tail surfaces, assigning `kind` (`wing`, `horizontal-tail`, `vertical-tail` or `other`) independently of control assignments. `positionM` is the aerodynamic center (normally near quarter chord), not the leading edge. The renderer constructs the chord around that point. `rollDeg: 0` is horizontal and `rollDeg: 90` is a vertical surface. `aspectRatio` on a half-wing should describe the full wing, not that half alone.
5. Assign controls. Positive commands are roll-right, pitch-up and yaw-right. With the provided surface convention, the example right wing uses roll gain -1, left wing +1, elevator pitch -1, vertical fins yaw -1. Verify signs with tests after changing surface orientations.
6. Add motors at their thrust application positions. Static thrust, speed falloff and response time need measurements or clearly marked estimates. Opposite `yawMix` signs on a twin provide differential thrust.
7. Add `contactPoints` at physical extremities with an ID, `positionM`, and `spanLinked` flag. Set `spanLinked` on wingtip contacts so span edits update collision geometry. Set reference wing area/span and the X coordinate of the leading edge used for the CG readout.
8. Validate and fly:

```sh
npm run aircraft:validate -- aircraft/my-aircraft.json
npm run physics:validate -- aircraft/my-aircraft.json
npm run physics:envelope -- aircraft/my-aircraft.json
npm run simulate -- aircraft/my-aircraft.json --scenario cruise
npm run simulate -- aircraft/my-aircraft.json --scenario pitch-pulse
```

Load the JSON through the browser's **Aircraft editor → Import JSON** control.
**Apply to flight** or **Apply & fly** saves the imported aircraft in this browser's
catalog. Reload restores its applied setup; **Restore original aircraft** uses the
imported source definition. Importing the same custom ID again updates that
baseline when applied. A bundled ID keeps the repository preset as its original.
Unapplied imports and drafts last only for the current session. Export JSON for a
portable copy: clearing browser data also removes local aircraft. The local import
registry is bounded to 32 aircraft and 2 million JSON characters; storage quota or
validation failures are reported without preventing flight.

For a bundled example, add an explicit import and registry entry in `src/app/bundled-aircraft.ts`. This keeps the default aircraft list deliberate; the CLI discovers local JSON automatically.

## Sources and assumptions

`provenance` maps parameter groups to `{ status, note, url? }`. Allowed statuses are `sourced`, `calculated`, `estimated`, `calibrated`. Describe which quantities within a group remain estimated. A source URL alone does not make an entire model sourced. Label assumptions rather than filling gaps with unqualified numbers.

For plan-based work, extract the published scale and assembled dimensions; flat foamboard patterns are not automatically the assembled 3D geometry. Reconstruct folds/assembly separately. Keep original copyrighted artwork outside the repository unless reuse rights have been established. Record original designer and drawing credits.

## Validation expectations

- Mass and CG match the intended build or are documented estimates.
- Positive control commands produce the intended torque signs.
- Trim is reported, and any failure is investigated rather than hidden by artificial stabilization.
- Doubling dynamic pressure at the same angle increases aerodynamic loads accordingly.
- Increasing span changes aerodynamic area and mass/inertia, not just the mesh.
- A run is stable numerically under timestep refinement.
- A real-world fidelity claim includes actual flight or bench data and uncertainty.

The source-of-truth schema is `src/core/schema.ts`. Unknown fields and invalid values are rejected with paths. The core supports rigid fixed-wing aircraft and multirotors. Surfaces and rotor geometry remain approximations; unusual configurations may require additional physical terms. See [multirotors](multirotors.md) for quad-specific authoring and controls.

## Mixed control surfaces

A surface control can supply an optional `mix` object with additional `roll`, `pitch`, and `yaw` gains. The base `axis * gain` and additional channels are summed and clamped to [-1,1] before applying `maxDeg`. Physics and animation use the same command. The Bronco inverted-V panels use pitch gain -1 on both, yaw +1 on the left panel (roll -45 degrees), and yaw -1 on the right (roll +45 degrees). Avoid double-mixing in a transmitter: RCForge expects aircraft-axis inputs.

## Detailed component and powertrain inputs

See [component-models.md](component-models.md) for material/BOM metadata, principal inertia, battery voltage and charge, motor/prop current-thrust tables, surface polars and servo dynamics. `aircraft/quad-x-6s.json` is the full electrical example; all its hardware/curve values are labeled estimates.

## Plan-shaped foamboard without a custom renderer

`aircraft/ft-22-raptor.json` demonstrates optional `surface.panel` geometry.
`outline` contains 3–64 `[x,y]` pairs, measured in chord and span fractions from
the surface aerodynamic center. Positive X is forward; positive Y follows the
surface span. `thicknessM` is the actual board thickness. Concave simple polygons
work; avoid crossing edges and repeated vertices. Divide openings at a surface
boundary, as the FT-22 does around its propeller slot.

For a controlled panel, `controlHinge: [[x0,y0],[x1,y1]]` splits the outline into
fixed and moving regions. Endpoints use the same normalized coordinates and must
run from smaller to larger Y. Geometry aft of the line moves around that hinge;
a hinge at the leading edge produces a fully moving elevon. Omit the hinge to
use X = -0.5. The physical control mix and servo state drive its animation.

`parts[].bodyLoft` supplies cross-sections for a body or boom component. Each section has
`x`, `width`, `top` and `bottom`, in fractions of that part's corresponding
`sizeM` dimension, relative to its `positionM`. Sections must increase in X;
`top < bottom` because Z points down. Optional `topColor` colors the top face
between this section and the next, without adding mass. Sections render as flat
foam facets, grouped by finish to limit draw calls. The FT-22's folded nose is an example.

For a folded wing, use `surface.foamWing` instead of `panel`. The Bronco and Tiny
Trainer are examples. `rootChordM`, `boardThicknessM` and `foldHeightM` describe
the folded section. `tipStations` contains increasing `[outboardFraction,
leadingEdgeFraction, trailingEdgeFraction]` triples, from span fraction 0 to 1;
chord fractions run from the root leading edge toward the trailing edge. The
surface's Y position chooses the left or right half. Use separate half-wings.
`hingeFraction` specifies a straight hinge at that fraction of root chord;
`controlSpan: [start,end]` bounds its outboard span. The hinge must remain inside
the wing throughout the moving region. Ailerons follow a tapered trailing edge
without extending beyond the tip. The folded skin is one mesh per half-wing;
only the control panel moves. Fold height is a visual cross-section, not an
airfoil coefficient or automatic aerodynamic calculation.

These fields describe appearance only. Set surface area (`spanM * chordM`),
aerodynamic center, coefficients, component mass and inertia separately, with
their own evidence. A detailed outline does not add vortex lift, flexibility or
CAD-derived inertia. Span edits scale wing outlines with their physical span;
mass/CG edits retain the authored shape. Existing definitions remain compatible.

Optional motor `partId` references an existing motor component. Fixed-wing motor
housings use its position and body X/Y/Z dimensions; quad housings use its envelope
around the authored rotor assembly. It never adds mass. `propBlades` sets 2–6 rendered blades, with existing
defaults preserved when omitted. These appearance fields do not generate new
thrust/current or torque curves. See the [450 mm quad example](multirotors.md).

## Camera mounts and pilot controls

See [FPV and control setup](fpv-and-control-setup.md) for optional `fpv` and `pilotResponse` fields, the camera mass/pose contract, configurable surface mixers, and live servo/linkage testing in the editor.

## Polyhedral trainers and installed gear

The [Vortex RC Simple Trainer](vortex-simple-trainer.md) uses four wing panels
and only elevator/rudder control. `reference.trimSpeedMps` optionally selects the
airborne/default experiment operating point; omission retains 12 m/s. Hand
release remains 8.5 m/s. Record an estimate or measurement for that choice.
Explicit speed arguments to `findTrim` and the envelope survey take precedence.

Span edits preserve panel heights about each side's innermost root. Give each
structural wing component the same ID as its aerodynamic panel to preserve its
vertical offset during a resize. Wingtip contacts with `spanLinked` follow the
same root-height scaling. This is a span change at fixed panel angles, not a new
polyhedral design. Review unconventional wings rather than assuming this rule
fits every multi-wing arrangement.

`contactPoints[].strutAnchorM` optionally locates a visible wheel strut or skid
anchor at the aircraft datum; `wheelColor` sets tire appearance. These visual
fields add no mass or forces. Account for gear in `parts` and use the contact's
`positionM` for its ground-touch point. Two aligned main wheels ahead of CG and
a rear skid initialize at their common ground-support pitch. Existing tricycle
and multirotor launch defaults remain unchanged. Optional fields retain aircraft
format 1 and need an updated app; older strict parsers reject them.

## Creator links and catalog identity

Set optional `credit: { "name": "Original designer", "url": "https://example.org/design" }`
to credit the original design in the editor and flight setup. Use the original
build or product page, not a reference for an unrelated physics equation. HTTP
and HTTPS links are accepted; other protocols are rejected. Files without credit
remain valid. Keep each configuration under its own ID, for example `ft-bronco`
(V-tail) and `ft-bronco-conventional` (fixed fins and elevator), so their local
histories stay separate.

The only bundled **Simple Trainer** is `vt-simple-trainer`, the Vortex RC design.
The earlier generic `simple-trainer` now lives under `tests/fixtures/` to preserve
numerical regression inputs. It is not a catalog preset; use the Tiny Trainer
or Vortex definition as an authoring starting point. Older exported definitions
can still be imported as custom aircraft.

## Preserve design references

Set the original designer's `credit` link and record parameter evidence in
`provenance`. Use [Plans & design credits](plans.md) and the reference manifest
for reviewed PDFs. `npm run references:fetch` keeps original plans locally;
`npm run references:check` verifies identity and preset attribution without a
network call. Do not commit upstream plans or reference photos without reviewed
redistribution rights. Document assembly choices and missing data beside the model.

## Tricopter VTOL definitions

Use `vehicleType: "vtol"` and the validated `vtol` block in [bronco-tri-vtol.json](../aircraft/bronco-tri-vtol.json). Three motors and three dedicated tilt servos are linked by ID; no array ordering or transmitter channel is implied. Keep component mass centers distinct from motor tilt-axis force stations. The [VTOL guide](bronco-vtol.md) describes schema settings, provenance, controls, validation commands and the fixed-inertia approximation.
