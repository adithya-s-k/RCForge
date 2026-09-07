# RCForge: a free, open-source RC flight simulator

RCForge is a **free, open-source RC flight simulator** and aircraft editor that runs in your browser. Fly planes, drones and VTOL aircraft; customize components, balance, controls and flying environments. Your setups stay in your browser until you export them.

The MIT-licensed [source code](https://github.com/adithya-s-k/RCForge) runs locally or on your own host without accounts, API keys or AI services. On [rcforge.adithyask.com](https://rcforge.adithyask.com), guests can fly Simple Trainer with the keyboard; free Google sign-in unlocks the other aircraft, inputs and editing tools.

[Open the RC flight simulator](https://rcforge.adithyask.com/) or follow [your first flight](getting-started.md).

![RCForge browser flight simulator showing an RC aircraft and flying field](images/workbench.png)

## Bring your own setup

- **Plans and aircraft:** use your design references to create an [aircraft definition](aircraft-authoring.md). Plans provide geometry; component choices and flight parameters still need to be specified.
- **Components:** choose batteries, motors, propellers and servos, then [move parts and check balance](aircraft-editor.md).
- **Controllers:** map a gamepad or RC radio, or build a [PPM-to-USB bridge with a compatible Arduino](radio-setup.md#can-i-use-another-arduino).
- **Environments:** choose a field and wind conditions, or [extend the scenery in code](scenery-rendering.md).

RCForge emphasizes customization and transparent models. It does not claim measured real-aircraft equivalence.

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

## Common questions

### Is RCForge free? Do I need an account?

The source code is free under the MIT license. You can run the full workbench locally or self-host it without signing in. The official website has a free keyboard-and-Simple-Trainer guest session; free Google sign-in unlocks the other aircraft, controllers and editing tools. See [installation](getting-started.md) and [self-hosting](deployment.md).

### Can I fly with my RC transmitter?

Yes, with a compatible USB simulator adapter or a supported PPM/PWM-to-USB serial bridge. A transmitter's charging or firmware cable is not necessarily a joystick adapter. Start with the [radio connection guide](radio-setup.md), which identifies the hardware routes and their test status. Keyboard and gamepad input are also available.

### Can I add my own RC plane or drone?

You can import an aircraft JSON file, change components and export your setup. To recreate a physical build, use its photos, dimensions, plans and component specifications with the [aircraft authoring guide](aircraft-authoring.md). An external coding agent can help write the definition; RCForge does not automatically turn a photo into a validated flight model.

### What aircraft and camera views are included?

The presets include the Vortex RC Simple Trainer, FT Tiny Trainer, FT-22 Raptor, both Bronco tail configurations, an experimental Bronco tricopter VTOL and Quad X drones. Use a ground-level pilot view, follow the aircraft in chase view, or place an FPV camera on it. See [aircraft plans and credits](plans.md) and [camera setup](fpv-and-control-setup.md).

### Are my aircraft saved online?

Aircraft versions, controller calibration and preferences stay in your browser. Signing in to the hosted site does not synchronize your designs between devices. Export your aircraft or version history for a portable backup; see [local aircraft versioning](versioning.md).

## Contribute a change

Start with [your first contribution](../CONTRIBUTING.md). For code changes, read the [architecture](architecture.md); if using a coding agent, give it the [agent workflow](agent-workflow.md). You can contribute without using an AI service.

## About these docs

Use the sidebar to browse a topic, or **Search docs** to find a term. Each page identifies its documentation version. **Development** describes the current work; a frozen release keeps its own instructions and downloads.

The same Markdown is readable on GitHub and at `/docs/` beside the simulator. Existing guide URLs stay valid when navigation changes. Maintainers can [edit these docs](documentation.md) or follow the [release workflow](versioning.md#maintainer-release-workflow).
