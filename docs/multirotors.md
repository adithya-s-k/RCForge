# Configurable Quad X

Select **Quad X · 5 inch** on Fly or Aircraft editor. Ground starts on four landing feet; Hover starts at 3 m with calculated power. Hand throw is disabled. Angle mode self-levels roll and pitch; Rate mode requests angular rates. Both use manual collective power, with **no altitude or position hold**. Space/Shift changes collective thrust command. The default hover command is approximately 20%; it is a fraction of modeled maximum thrust, not a calibrated ESC/PWM percentage.

The example is an estimated 225 mm diagonal, 650 g build with 127 mm props, 8 N per rotor, 40 ms first-order actuator response, and a 0.015 m torque-to-thrust ratio. None of these numbers comes from a measured commercial build. The flight controller is a simple rate-P controller with an optional proportional angle outer loop. It is not Betaflight, PX4, ArduPilot, or an emulation of their firmware.

## Specify your build

In Aircraft editor:

- Total mass scales mass components. Component mass and position edits determine CG and inertia.
- Motor diagonal scales frame, motor and contact positions in the horizontal plane.
- Rotor setup edits each rotor's position (meters), maximum thrust (newtons), prop diameter (meters), response time (seconds), and reaction torque/thrust ratio (meters).
- Spin is viewed from above; diagonal pairs share a direction. Changing spin reverses the full pattern to preserve a controllable Quad X mixer.
- Choose Angle or Rate mode and set maximum tilt. Export JSON for durable repository changes.

JSON `multirotor` settings also expose maximum angular rate, rate feedback gain and attitude feedback gain. The present mixer supports four rotors in separate X-layout quadrants. Plus, coaxial, hex, octo, tilted-rotor and fully general actuator allocation are not implemented. Definition validation rejects unsupported layouts.

The mass model defaults to box components, with optional measured principal inertia and orientation. Battery mass and location affect dynamics. Optional thrust/current tables and a resistive battery model support voltage sag and charge depletion (see the 6S preset). KV/winding dynamics, a complete ESC model, prop RPM, rotor interference, aerodynamic ground effect and sensor latency/noise are not modeled. A prop-diameter edit changes the visualization; it does not infer a new thrust curve. Supply measured thrust and torque values for the selected motor/prop/battery combination.

## Flight behavior and validation

`npm run simulate -- quad-x-5inch --scenario cruise` runs a hover case. Pitch/roll pulse scenarios exercise the controller. Airplane glide/stall scenarios are rejected. Recordings contain normalized aircraft controls and the complete quad/controller configuration and reproduce the same control loop on replay.

Tests cover hover equilibrium, vertical takeoff, axis torque signs, zero-throttle cutoff, valid layouts and deterministic replay. See `docs/physics-validation.md` for the distinction between numerical verification and real-flight validation.

### Visual construction and mass accounting

The Quad X preview uses swept, pitched blades at the configured propeller diameter, motor stations from the rotor setup, and battery size and position from the battery part. Carbon plates, motor bell windows, winding detail, straps, camera and wiring are illustrative construction details, not a scan or CAD model of a commercial frame. The example remains an estimated 650 g build: 250 g battery, four 35 g motor allocations and 260 g frame/equipment allocation. Electronics, wiring and fasteners are included in that last allocation; visual detail adds no hidden mass. Inertia uses the component box approximations, not the rendered meshes. Measure the actual build and edit component masses/positions before comparing flight behavior.

## 450 mm utility example

**Quad X · 450 mm** (`aircraft/quad-x-450.json`) is a 1,007 g X-layout utility
build with 254 mm two-blade props, a 3S 3300 mAh pack and slower rotor response
than the 5-inch examples. It uses the same Angle/Rate controller, with manual
collective power. It has no GPS, camera, altitude hold or position hold.

The [DJI F450 specification](https://www-v1.dji.com/it/flame-wheel-arf/spec.html)
provides the 450 mm diagonal and 282 g frame reference. The preset divides that
frame allocation into center plates and four arms; their dimensions, mass
allocation and inertias are estimates. It is not an exact DJI assembly or
flight-controller emulation.

The [EMAX MT2213 manufacturer page](https://emaxmodel.com/collections/mt-series/products/emax-mt2213-935kv-multicopter-brushless-motor)
provides 53 g motor mass and 27.9 × 39.7 mm overall dimensions. Its
[manufacturer performance table](https://cdn.shopify.com/s/files/1/0469/7358/3518/files/QQ_20220530165947_2048x2048.png?v=1653901291)
provides ten thrust/current/RPM samples for EMAX1045 props at 11.1 V. The final
sample is 640 gram-force at 9.5 A, converted to 6.276256 N. The 720 g headline
on the specification image belongs to another operating condition and is not
used for this 3S/1045 combination.

**The table does not specify throttle/PWM commands.** The preset uses normalized
RPM as an estimated command coordinate, adds a zero endpoint and assumes standard
air density. This is manufacturer component evidence, not a calibrated ESC or
complete aircraft. Rotor lag, torque ratio, battery resistance, OCV curve, drag,
controller gains and all remaining component weights are estimates. Replace them
with measurements of your assembly before comparing physical flight.

At initial charge in calm standard air, hover trim is approximately 57.5%.
Battery discharge means an unchanged collective command slowly loses height;
this is not altitude hold. The numerical envelope solves hover at all 27 surveyed
mass/charge/site combinations, with no nonfinite loads. This does not establish
real-world fidelity.

To reproduce:

```sh
npm run aircraft:validate
npm run simulate -- quad-x-450 --scenario roll-pulse --duration 10
npm run replay -- results/quad-x-450-roll-pulse/recording.json
npm run physics:envelope -- quad-x-450
```

### Authored motor and propeller appearance

Optional motor `partId` references an existing `kind: "motor"` mass component.
It supplies the quad motor's dimensional envelope without adding mass again.
The bell/shaft split remains cosmetic; a measured principal inertia override can
replace the component box inertia independently. Optional `propBlades` (2–6)
sets blade count; omitted values retain two blades on fixed-wing aircraft and
three on quads. Neither blade count nor diameter infers new propulsion data.

The larger quad's arm parts, battery dimensions, ESCs and landing feet guide its
preview. Compact examples retain their existing illustrative frame construction.
Static quad geometry is batched by shared material at construction time; animated
propellers remain separate. This reduces draw submissions without adding a render
loop, increasing texture resolution or changing dynamics.
