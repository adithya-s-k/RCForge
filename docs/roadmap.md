# Roadmap

RCForge aims to make it practical to bring an RC design into an open, programmable environment, modify it and run repeatable experiments. This is a direction for contributions, not a release schedule or a promise of automatic reconstruction.

## The current foundation

The repository includes a browser workbench, shared headless physics, fixed-wing and multirotor definitions, an aircraft editor, multiple launch/view modes, lightweight scenery, controller mapping/calibration, an Arduino serial bridge, flight instruments, recordings and numerical verification tools. [README.md](../README.md) describes current capabilities; [validation.md](validation.md) distinguishes implemented behavior from evidence of physical fidelity.

## First priority: establish measured confidence

| Work                           | Evidence needed before calling it validated                                                                              |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Real aircraft presets          | Assembled component mass/CG, inertia estimates with uncertainty, motor/prop measurements and repeatable flight logs      |
| Aerodynamics and stall         | Suitable low-Reynolds-number data, sign/invariant tests, convergence checks and independent flight comparisons           |
| Controller support             | Named transmitter, receiver/adapter, board/firmware, OS/browser and verified mapping, latency and loss/recovery behavior |
| Quad propulsion and controls   | Thrust/current curves, battery sag/depletion measurements, control-response logs and explicit controller assumptions     |
| Independent physics comparison | A second implementation with documented, trustworthy aircraft coefficients and comparable initial conditions             |

Measured datasets and reproducible discrepancies are particularly useful contributions. Keep fitting/calibration data separate from independent validation data.

## Improve the build–fly–compare workflow

- Better guides and examples for reconstructing assembled aircraft from particular plans and build photos.
- Clearer provenance and uncertainty at the component and model level.
- More accessible input setup, richer hardware reports and user-tested flight/positioning workflows.
- Parameter sweeps and better comparisons using the shared core.
- A component library with attributable measured data and explicit units.
- Performance improvements measured on modest laptops, preserving physics behavior.

## Expand the simulation when there is evidence and a concrete use case

Candidate areas include downwash/wake coupling, improved low-speed aerodynamics, suspension and tire models, actual terrain collision, and more detailed electrical/thermal effects. The existing simplified battery and motor-table model provides a starting point, not a complete electrical simulation.

A second physics backend, flight-controller software-in-the-loop, and hardware beyond the existing HID/Arduino paths should have well-defined state/control contracts and verification cases. Their presence cannot be inferred from the Three.js renderer or the existing quad controller.

## Longer-term possibilities

More automatic plan interpretation, richer construction/material models, shared component/aircraft catalogs, custom environments, VR and multiplayer may become useful extensions. None of these is a dependency for cloning the project and building an aircraft today.

Propose a bounded first step in a [GitHub issue](https://github.com/adithya-s-k/RCForge/issues/new/choose). Explain the user workflow, expected physical or UX behavior, extension points, data rights and a way to verify the result. Community needs and evidence should guide what gets built next.
