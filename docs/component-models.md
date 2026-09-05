# Component fidelity in RCForge 0.7

The schema remains aircraft format 1 with optional extensions. Simulation version 0.7.1 rejects recordings from earlier physics versions. These features support measured inputs; their existence does not make an aircraft flight-test calibrated.

## Mass, materials and inertia

`parts` is the single mass ledger. Battery/electronics definitions must reference existing components, never add their mass a second time. `massKg` remains authoritative. `material: { name, densityKgM3?, finish? }`, `manufacturer` and `model` describe the build. A coding agent can calculate mass from measured material density and actual material volume, but density is not multiplied by the bounding-box volume automatically: foamboard shells, composite laminates and electronics are not solid boxes. `finish` is descriptive metadata; it does not create stiffness or strength.

By default, local component inertia is a uniform cuboid derived from `sizeM`. Supply `inertiaDiagonalKgM2: [Ixx,Iyy,Izz]` for measured/CAD principal moments and `orientationDeg: [roll,pitch,yaw]` for the principal frame relative to the body (Rz Ry Rx). RCForge rotates the tensor then applies the parallel-axis theorem about the total CG. Position is the component CG, not a CAD mesh origin. Principal moments must be positive and satisfy the triangle inequalities. Total-mass edits scale supplied inertia; span edits discard affected structural-component inertia overrides and recalculate a box estimate. Material names alone never alter flight physics.

Component positions affect CG and torque arms in all three axes. The editor's Components workspace exposes component masses, material descriptions and the calculated CG beside the assembled model. Its selected installation envelope uses `positionM`, `sizeM` and component orientation; it is a mass envelope, not collision geometry. The editor's longitudinal CG control moves the battery. The model is rigid; it does not simulate foam flex, carbon laminate failure, fastener failure or crush damage.

The installation panel exposes battery and servo roll/pitch/yaw. These rotate the
component envelope and its visible assembly about its own mass center using the
same Rz Ry Rx convention as inertia. Battery labels/straps follow the pack;
servo horns remain children of the rotated housing. Fixed-wing body/boom lofts
also honor their authored component orientation. Quad battery, arm and ESC
construction retains these transforms through static batching.

Aerodynamic surfaces have separately authored angles, and the current motor
thrust directions remain fixed to the vehicle convention. A component mass-frame
rotation is not a wing-incidence or motor-cant control. Cosmetic trays, wiring
and housing detail are approximations, not a mechanical installation solver.

## Battery + motor/prop combination

See `aircraft/quad-x-6s.json` for a complete, deliberately **estimated** 650 g example. Its frame, ESC, flight controller, camera, video transmitter, receiver, wiring, hardware, battery and motors are distinct mass components.

A `battery` provides:

- `partId`: an existing battery mass component.
- `chemistry`, series `cells`, pack `capacityMah`, pack `resistanceOhm`, `initialSoc` (0–1), and `avionicsCurrentA`.
- `voltageCurve`: increasing `{soc, voltsPerCell}` samples spanning 0–1. Measure resting voltage versus remaining charge for the pack/cells.

Every motor then needs `performance` with `referenceVoltage`, `referenceDensityKgM3`, and `points: [{command, thrustN, currentA}]`. Include command endpoints 0 and 1, use strictly increasing commands and nondecreasing thrust/current, and start at zero thrust. `maxThrustN` must equal the final thrust sample. `model` and `propeller` describe the tested hardware; `responseSeconds` is actuator lag. The built-in controller outputs normalized motor commands; this is not Betaflight, PX4 or an ESC firmware emulator.

Interpolation supplies static thrust and current. At fixed command, the equivalent motor conductance is sum(Ibench/Vbench). Terminal voltage solves V = Voc − R I with avionics load included. Current scales linearly and thrust quadratically with terminal voltage relative to the bench voltage. Thrust also scales with air density. Charge integrates I dt / (capacityAh × 3600), is bounded to 0–1, and empty charge removes thrust. Battery state is included in recordings and reset restores initial charge. Aircraft mass does not decrease when a battery discharges.

This is a quasi-static resistive approximation, **not** electrochemical or thermal simulation. It has no RC polarization, battery ageing, ESC cutoff curve, discharge C-rating enforcement, winding temperature, regenerative current or transient bus model. Fixed-wing thrust still uses the existing simple forward-speed falloff; the model does not implement measured advance-ratio prop maps. Thrust edits rescale table thrust only and should be followed by new bench data for actual hardware changes. Validate the complete motor/prop/ESC/pack combination at relevant operating voltages.

Sources for the physical approach: [MathWorks equivalent-circuit model](https://www.mathworks.com/help/simscape-battery/ref/batteryequivalentcircuit.html); [UIUC propeller test database](https://m-selig.ae.illinois.edu/props/propDB.html). No curves from these sources have been copied into the example or claimed as measurements of it.

## Aerodynamics and servos

Optional surface `polar` samples are `{alphaDeg,cl,cd,cm}` in increasing angle order. Alpha is the geometric angle including incidence and equivalent control deflection, **not** shifted by `zeroLiftDeg`. Samples must describe total finite-wing coefficients at the intended Reynolds number (including induced drag). RCForge does not add its analytical induced drag on top of table drag. Outside the table, coefficients blend over 12 degrees into the existing approximate high-angle model. Reynolds-dependent tables are described below; Mach interpolation and unsteady stall are not implemented. Unprovided polars retain the estimated analytic model. Lift and drag follow [NASA's aerodynamic force formulation](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/lift-equation/).

Optional control `responseSeconds` and `rateLimitDegS` model first-order servo response capped at physical travel speed. Actual deflections feed forces and animated surfaces; transient deflections survive replay. The Bronco and Tiny Trainer use explicitly estimated micro-servo parameters.

Optional `bodyDragAreaM2: [CdAx,CdAy,CdAz]` replaces scalar body drag with directional quadratic drag. Each component is a drag coefficient times projected area, not just geometric area. The 6S example uses estimates. Fixed-wing motors with `spin` specified also generate reaction roll torque from `torquePerThrustM` (CW/CCW viewed along the positive thrust axis); no propeller gyroscopic or P-factor model is provided.

## Scenery and environment

Northfield club, Alpine meadow and Desert mesa have distinct terrain, vegetation, sky/sun and runway surface. Their temperature/elevation presets calculate dry-air density from a standard pressure-versus-elevation atmosphere. Altitude in flight remains local AGL, not elevation above sea level. Density is uniform within each session; humidity, thermals, terrain wind and altitude-varying air density are not modeled. Wind/gust settings remain user controlled.

The selected surface changes rolling/lateral friction (estimated asphalt/grass/dirt coefficients). Collision is still a **flat field plane**, including outside the runway. Distant mountains, trees and buildings are visual scenery, not collidable terrain. Do not use these sites for slope-soaring or obstacle-clearance validation.

## Verification versus calibration

`npm run check` checks schema, component invariants, lookup interpolation, charge conservation, depleted thrust, density scaling, servo limits, directional drag, replay and existing aircraft behavior. `npm run physics:validate` produces an analytical/numerical report including circuit, charge and electrical-replay checks. Neither substitutes for measured trim, glide, stall, maneuvers and thrust/current comparison. Keep held-out flight data separate from coefficient fitting; use `npm run physics:compare` for aligned flight telemetry.

## Reynolds-dependent aerodynamic tables (0.6)

A surface may provide `reynoldsPolars` instead of `polar`:

```json
{
  "convention": "finite-wing",
  "source": "Synthetic example only; replace with an identified finite-wing dataset",
  "tables": [
    {
      "reynolds": 100000,
      "points": [
        { "alphaDeg": -10, "cl": -0.4, "cd": 0.08, "cm": -0.04 },
        { "alphaDeg": 0, "cl": 0, "cd": 0.08, "cm": -0.04 },
        { "alphaDeg": 10, "cl": 0.4, "cd": 0.08, "cm": -0.04 }
      ]
    },
    {
      "reynolds": 400000,
      "points": [
        { "alphaDeg": -10, "cl": -0.8, "cd": 0.04, "cm": -0.02 },
        { "alphaDeg": 0, "cl": 0, "cd": 0.04, "cm": -0.02 },
        { "alphaDeg": 10, "cl": 0.8, "cd": 0.04, "cm": -0.02 }
      ]
    }
  ]
}
```

This is a surface-field fragment, not an aircraft file or measured training-plane
polar. CL/CD/CM describe the finite wing; CD includes induced drag. Do not paste
2-D section polars in without a documented finite-wing conversion. Angles include
incidence and effective control deflection, but do not subtract `zeroLiftDeg`
again: camber is already represented in the table. Explicit deflection-indexed
polars and dynamic stall are not implemented.

Tables must have increasing Reynolds numbers, increasing angles and nonnegative
drag. The core linearly interpolates angles, then interpolates in log(Re).
Reynolds number is local in-plane speed × chord / kinematic viscosity. Environment
`kinematicViscosityM2S` defaults to standard dry air when absent; site presets
calculate it using temperature and density. Each table blends to the analytical
model over 12 degrees beyond its own angle boundary. Reynolds boundaries clamp;
`outsidePolarEnvelope` reports either form of out-of-data operation. No guessed
extrapolated coefficients are presented as measured data.

`lastForces.surfaces` exposes `reynolds`, `coefficientSource` and
`outsidePolarEnvelope`; the operating-point report includes them. Analytical
surfaces are explicitly identified and have no claimed measured envelope.
Changing wing span in the editor removes that wing's finite-wing tables and adds
an estimated-data provenance note. Mass/CG-only changes preserve aerodynamic
tables. Supply new tables for modified geometry before claiming calibrated loads.

Recordings include viscosity and these aircraft fields. Only recordings with
the current simulation version are accepted; do not relabel a version to bypass the check.
Aircraft schema version 1 remains compatible because the fields are optional.

## Individual servos and pushrods (0.7)

A positional servo is an equipment part in the mass ledger with a `servo` object:
`speedSecondsPer60Deg`, full `travelDeg`, `ratedVoltage` and optional
`stallTorqueNm`. The latter two describe the speed reference and torque rating;
voltage-dependent speed and hinge-load torque saturation are not implemented.

A surface control can provide `linkage` with `servoPartId`, the commanded
one-sided `servoTravelDeg`, `servoArmM` and `surfaceArmM`. A rigid, small-angle
pushrod approximation gives surface angle = servo angle × servo arm / surface
arm. Effective surface travel is the smaller of this mechanical result and
`control.maxDeg`. Surface speed is 60 / servo speed × the same horn ratio,
optionally further capped by the existing `rateLimitDegS`. The same effective
travel drives aerodynamic deflection and surface animation. Existing response
lag still applies. Longer servo horns increase both speed and travel; longer
surface horns reduce both. Linkage geometry is not a nonlinear four-bar solver.

The reconstructed FT-22 uses the published 40° limit with ±50° servo command and
10/12.5 mm horns, yielding ±40° effective elevon travel. These horn dimensions are
estimates. Reducing travel also reduces available trim and recovery authority;
check the new operating point after changing it. The two 9 g servos
are now separate components. The other fixed-wing presets also split their servo
allocations into individual parts while preserving total mass and longitudinal
CG; transverse inertia reflects their newly specified positions.

In 0.7, a servo starts from neutral when no initial deflection is supplied, so the
first control step obeys its speed limit. Trimmed and hand launches explicitly
initialize the trimmed deflections. Recordings preserve these states. Simulation
version **0.7.0** introduced the actuator change and rejected earlier recordings.
The current compatibility requirement is given at the top of this guide.
Aircraft format remains version 1 with optional fields.

## Catalog and discharge presets (0.7)

The [component catalog](../components/README.md) includes Indian-retailer battery
references and manufacturer servo/ESC/motor data. Replacement preserves installation
coordinates and references, replacing component mass, size and intrinsic inertia.
A motor/prop package uses separate `partId` and `propPartId` ledger entries. Moving
either linked component translates the complete motor/prop unit while retaining
its authored offsets. Structural mass positions and aerodynamic surface positions
remain independently specified.

Catalog motor envelopes may declare `shaftAxis` as X or Z. Their dimensions and
principal inertia axes are converted to the vehicle's shaft axis on replacement;
the installation positions and rotation are retained. A linked propeller cannot
be replaced with passive electronics: use its motor/prop package. The component
panel previews diameter and reference voltage, but does not solve physical mount
compatibility or blade clearance for arbitrary replacements.

The browser component panel edits battery mass, capacity, cells, initial charge,
DC resistance, servo speed/travel and linkage dimensions. Source notes stay with
the exported definition. No mass is added merely by rendering a detail.

Installed catalog components show **Catalog setup** when their modeled product
specifications match, or **Modified setup** with the changed fields. The comparison
is recalculated from the aircraft definition, including imported/saved files; it
does not depend on which UI edited them. Installation position/orientation,
starting charge, avionics load, propeller rotation and linkage geometry remain
airframe settings. A catalog match is not measurement validation: expand **Catalog
source & assumptions** for the referenced facts and estimated parameters. Custom
external catalog IDs remain readable even without their catalog installed.

All bundled aircraft now include battery discharge. The FT-22 uses the Robu-listed
85 g Orange 3S 1000 mAh pack dimensions; this is a selectable reference setup, not
proof of the battery used in the original Flite Test build. Other original pack
capacities and resistances remain assumptions. Plane/basic-quad current tables
are deliberately estimated using ideal static induced power:

`Pideal = T × sqrt(T / (2 × rho × diskArea))`

`Iestimate = Pideal / (0.45 × nominalVoltage) + 0.2 × command`

The momentum-theory basis is described by [NASA](https://www.grc.nasa.gov/WWW/K-12/BGP/propth.html).
The 0.45 overall factor and no-load term are RCForge assumptions, not NASA data or
measured motor efficiencies. Thrust tables retain the previous linear estimated
command mapping. Replace both thrust and current with matching bench samples.
Forward-flight current, dynamic prop loading and servo electrical loads remain
unresolved. More series cells uses approximate voltage scaling, not evidence that
an actual motor/ESC can use that pack.

Fixed throttle does not maintain exact hover/level trim as pack voltage falls.
Constant-voltage tests isolate force equilibrium; discharge tests separately check
charge conservation, mass independence, falling available thrust and replay.
Changing mAh does not change weight automatically, and charge depletion does not
remove physical battery mass.

Experiment plots include battery charge (%), pack voltage, current draw and charge
used (mAh). The comparison table reports charge consumed and remaining charge at
the actual endpoint, including an early landing or impact. New telemetry CSVs and
recordings include optional `batterySoc` (0–1), `batteryVoltageV`,
`batteryCurrentA` and `batteryUsedMah` when an electrical model is present.
Telemetry fields are optional within the matching simulation version; missing
electrical samples are not reported as zero. Adding these observations did not
change physics, but the later contact correction requires a matching 0.7.1 engine.

## Contact correction (0.7.1)

The flat-ground solver now accumulates each contact's normal and friction impulses
within the existing eight iterations. It projects the accumulated totals onto
the unilateral/friction limits and applies the difference, allowing a later
iteration to undo excess impulse. Previously only positive increments were
allowed for support, and each friction budget used that increment. A motors-off
Quad 450 could rotate approximately 11.65° in 20 seconds. The corrected same-case
run drifts about 0.00082° with micrometre-scale horizontal travel.

This follows the accumulated-impulse principle described in
[Erin Catto's Solver2D](https://box2d.org/posts/2024/02/solver2d/). It retains the
same step, contact geometry, eight iterations, friction coefficients and position
correction. There is no between-step warm starting or new collision backend.
Stationary tests include three quads, rotated headings and reversed contact order;
wheel takeoff, gentle touchdown and surface friction regressions remain required.

Ground-contact trajectories change, so simulation/recording version is **0.7.1**.
Older recordings, including 0.7.0, are rejected; replay them with the matching
older engine and record a new flight for this version. Changing a recording's
version string does not migrate its physical trajectory. Aircraft JSON remains
format 1 and local aircraft/controller preferences remain compatible.

## Camera mounts and pilot controls

See [FPV and control setup](fpv-and-control-setup.md) for optional `fpv` and `pilotResponse` fields, the camera mass/pose contract, configurable surface mixers, and live servo/linkage testing in the editor.
