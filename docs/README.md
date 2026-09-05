# RCForge documentation

Start with the [project overview and philosophy](../README.md). For code contributions, read [AGENTS.md](../AGENTS.md) and [CONTRIBUTING.md](../CONTRIBUTING.md).

| I want to…                                          | Guide                                                          |
| --------------------------------------------------- | -------------------------------------------------------------- |
| Build an aircraft with a coding agent               | [Agent workflow](agent-workflow.md)                            |
| Understand the core and coordinate systems          | [Architecture](architecture.md)                                |
| Define or modify an aircraft                        | [Aircraft authoring](aircraft-authoring.md)                    |
| Specify batteries, materials, inertia and motors    | [Component models](component-models.md)                        |
| Create a quadcopter setup                           | [Multirotors](multirotors.md)                                  |
| Understand the Bronco and Tiny Trainer presets      | [Reference reconstruction](flite-test-reconstruction.md)       |
| Understand the Vortex RC Simple Trainer             | [Reconstruction and setup](vortex-simple-trainer.md)           |
| Map a keyboard, gamepad, joystick or transmitter    | [Controller setup](controllers.md)                             |
| Connect an FS-i6 through an adapter or Uno/Nano     | [FS-i6 wiring and firmware](flysky-fs-i6.md)                   |
| Run numerical checks or compare measurements        | [Physics verification workflow](physics-validation.md)         |
| Understand what has and has not been verified       | [Validation and model limits](validation.md)                   |
| Rebuild lightweight scenery assets                  | [Scenery sources and preparation](../public/scenery/README.md) |
| Review simulator UX changes and test coverage       | [UX review](ux-review.md)                                      |
| Research realism and review the implementation plan | [Realism plan](realism-plan.md)                                |
| See the project's intended direction                | [Roadmap](roadmap.md)                                          |

Save, compare or move aircraft setups with [local history](versioning.md). Maintainers can follow the [release workflow](versioning.md#maintainer-release-workflow) and [deployment guide](deployment.md).

Definitions and runtime contracts are enforced by [`src/core/schema.ts`](../src/core/schema.ts). Simulation and recording compatibility are enforced by [`src/core/simulation.ts`](../src/core/simulation.ts) and [`src/core/experiment.ts`](../src/core/experiment.ts). Read the implementation when extending a field; documentation may describe a subset of the supported schema.
