# Welcome to RCForge

RCForge is a browser-based RC flight simulator and aircraft editor. Choose a plane or quad, set up your controls, and try changes to its components and balance. Your setups stay in your browser until you export them. No account or AI service is required.

## New here? Start with a flight

Follow [Your first flight](getting-started.md) to run RCForge, choose an aircraft and learn the basic keys. You can start with a keyboard; a transmitter is optional.

After that, learn [views and flight setup](flight-guide.md) or [connect your own controls](controllers.md).

## What would you like to do?

| Your task                                                | Open this guide                                          |
| -------------------------------------------------------- | -------------------------------------------------------- |
| Fly with a keyboard, gamepad or joystick                 | [Controls and calibration](controllers.md)               |
| Connect a FlySky transmitter                             | [Choose a radio connection](radio-setup.md)              |
| Move the pilot, position the aircraft or change the view | [Views and flight setup](flight-guide.md)                |
| Change a battery, move the CG or save a setup            | [Edit, balance and save an aircraft](aircraft-editor.md) |
| Make controls gentler or add an FPV camera               | [Cameras, rates and mixing](fpv-and-control-setup.md)    |
| Solve a connection or flight problem                     | [Troubleshooting](troubleshooting.md)                    |

## Build on an existing aircraft

![Choose a setup, make a change, check it and try a flight](images/diagram-workflow.svg)

Change one thing at a time and save a version before experimenting. Start in the [aircraft editor](aircraft-editor.md); use the [aircraft file format](aircraft-authoring.md) when you want to add a definition in code.

The [aircraft plans and credits](plans.md) page links to the original designers. Model-specific notes cover the [Bronco VTOL](bronco-vtol.md), [quadcopters](multirotors.md), [Flite Test designs](flite-test-reconstruction.md) and [Vortex Simple Trainer](vortex-simple-trainer.md).

## How realistic is it?

The bundled aircraft use estimated physics. Passing a software test does not establish that a real aircraft will fly the same way. Read [realism and known limits](validation.md) for the evidence, or [run physics experiments](physics-validation.md) to inspect behavior yourself.

For radio hardware, [connection test status](radio-setup.md#connection-test-status) distinguishes demonstrated trainer reception from receiver connections that still need testing.

## Contribute a change

Start with [your first contribution](../CONTRIBUTING.md). For code changes, read the [architecture](architecture.md); if using a coding agent, give it the [agent workflow](agent-workflow.md). You can contribute without using an AI service.

## About these docs

Use the sidebar to browse a topic, or **Search docs** to find a term. Each page identifies its documentation version. **Development** describes the current work; a frozen release keeps its own instructions and downloads.

The same Markdown is readable on GitHub and at `/docs/` beside the simulator. Existing guide URLs stay valid when navigation changes. Maintainers can [edit these docs](documentation.md) or follow the [release workflow](versioning.md#maintainer-release-workflow).
