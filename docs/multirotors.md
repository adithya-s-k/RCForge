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
