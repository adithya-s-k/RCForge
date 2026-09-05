<p align="center"><img src="public/brand/rcforge-mark.svg" width="76" height="76" alt="RCForge logo" /></p>

# RCForge

**A free, open-source RC flight simulator you can make your own.**

Fly RC planes, drones and VTOL aircraft in your browser. Customize your aircraft, components, controllers and environments—or bring your own plans and build an editable flight model.

[Simulator](https://rcforge.adithyask.com) · [Documentation](https://rcforge.adithyask.com/docs/) · [Contribute](CONTRIBUTING.md) · [Changelog](CHANGELOG.md)

![RCForge flight workbench](docs/images/workbench.png)

RCForge is **MIT licensed** and runs locally without accounts, API keys or a backend. The [hosted simulator](https://rcforge.adithyask.com) offers a free Simple Trainer + keyboard session; free Google sign-in unlocks the other aircraft, inputs and editing tools. Self-hosting this repository keeps the full workbench available without sign-in.

## Make it yours

- **Aircraft and plans:** start with a preset or create a JSON aircraft definition from your own design references. Plan images need interpretation; they are not automatically converted.
- **Components and balance:** change batteries, motors, propellers and servos; move parts to change mass distribution and center of gravity.
- **Your controller:** keyboard, gamepad, flight stick, RC USB adapter or a compatible Arduino PPM-to-serial bridge.
- **Your flying field:** choose the bundled environments, adjust wind, or extend scenery in code.
- **Your workflow:** edit and save locally, export definitions, run repeatable experiments and contribute changes under MIT.

## Why it exists

Trying an RC design usually means finding plans, choosing electronics, building it and discovering problems in the air. RCForge makes that design available as an editable digital experiment: geometry, components, weight, balance, controls and physics in ordinary files.

The goal is an open foundation the community can extend. It is not a closed catalog or an automatic plan-to-aircraft converter. A plan supplies geometry; building a useful flight model still takes interpretation, engineering judgment and evidence.

**AI is not built into RCForge.** Clone the repository and work with your preferred editor or coding agent. The simulator runs without accounts, API keys, a backend or an AI service.

- **Editable aircraft:** component-based definitions, explicit units and source attribution.
- **Repeatable experiments:** one physics core shared by the browser and command-line tools.
- **Open extension points:** contribute aircraft, measurements, controllers, environments or model improvements.
- **Visible uncertainty:** distinguish sourced dimensions, estimates and measured agreement.

> **Experimental software.** Aircraft presets are not calibrated against real flight data. Numerical checks establish implementation behavior, not safe or equivalent real-world flight. Read the [model limits](docs/validation.md).

## Get started

Use Node.js 24 and npm. Supported versions are declared in [package.json](package.json).

```sh
git clone https://github.com/adithya-s-k/RCForge.git
cd RCForge
npm ci
npm run dev
```

Open the URL Vite prints. The simulator runs at the root and the documentation at **`/docs/` on the same address**. Everything builds together with `npm run build`; `npm run preview` serves the production output.

New sessions start on the ground with the pilot beside the aircraft. Press **Start flight**, then hold **Space** to increase throttle. Arrow keys control pitch and roll; **Q/E** controls yaw. **P** pauses and **R** resets. Follow [Install & first flight](docs/getting-started.md) for the complete workflow.

The [Bronco tricopter VTOL](docs/bronco-vtol.md) adds front conversion rotors and a rear yaw mount, with configurable assistance and component placement.

## Explore the workbench

| Workspace   | What it does                                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------------------------ |
| Fly         | Ground, hand-launch and airborne starts; Pilot, Chase and mounted FPV views; placement, scenery and wind     |
| Aircraft    | Components, mass/CG, batteries, servo travel, rates/mixing, camera placement and local version history       |
| Controllers | Keyboard, gamepad, flight stick, RC USB adapter and optional Uno/Nano serial bridge; mapping and calibration |
| Experiments | Repeatable scenarios, CSV telemetry, recordings, replay and numerical verification                           |

The catalog includes both FT Bronco tail configurations, FT Tiny Trainer Sport, FT-22 Raptor, **Simple Trainer by Vortex RC**, and three Quad X assemblies. See [plans and design credits](docs/plans.md) for their references and assumptions.

Browser edits stay local until exported. **Aircraft → History** saves and compares checkpoints; **Export history** creates a portable backup. [Edit an aircraft](docs/aircraft-editor.md) · [Connect a radio visually](docs/radio-setup.md) · [Versioning](docs/versioning.md).

## Build and contribute

Start with [CONTRIBUTING.md](CONTRIBUTING.md) for the complete fork, test and pull-request workflow. Coding agents should read [AGENTS.md](AGENTS.md) and the [agent workflow](docs/agent-workflow.md). Small fixes, measured data, hardware reports and documentation improvements are welcome.

```sh
npm run check             # Definitions, tests, typecheck and production build
npm run docs:check        # Source links, commands and generated documentation
npm run references:check  # Credits and optional local plan checksums; no network
npm run format:check
```

For physics changes, also run `npm run physics:validate` and `npm run physics:envelope`. See [verification](docs/physics-validation.md) for experiments and measured-data comparisons.

| Path                                  | Responsibility                                          |
| ------------------------------------- | ------------------------------------------------------- |
| `aircraft/`, `components/`            | Definitions, component catalog and provenance           |
| `src/core/`                           | Pure dynamics, schema, mass properties and recordings   |
| `src/input/`, `src/view/`, `src/app/` | Input, rendering and workbench workflows                |
| `site/`, `docs/`                      | Static documentation renderer and canonical guides      |
| `references/`                         | Source manifest and optional, verified local plan cache |
| `scripts/`, `hardware/`               | Shared-core CLI tools and Arduino bridge                |

Read [architecture](docs/architecture.md) before changing runtime behavior. Release preparation is documented in [versioning](docs/versioning.md) and [hosting](docs/deployment.md). Application **0.8.0 is development/unreleased**; this README does not imply a deployment or tagged release.

## License and credits

RCForge code and original parameterizations are [MIT licensed](LICENSE). Upstream designs, artwork, trademarks and bundled assets retain their own rights; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Flite Test and Vortex RC receive creator links in the simulator and reference library. `npm run references:fetch` retrieves verified FT source plans into a **gitignored local cache** for inspection. Original PDFs and photos are not included in Git or the published site. The public docs link to their creators. No affiliation or endorsement is implied.
