# Install & first flight

RCForge runs in your browser. You can fly, edit aircraft and save local versions
without signing in or connecting an AI service.

## Run locally

Use Node.js 24 and the included npm lockfile. Supported versions are declared in
`package.json`.

```sh
git clone https://github.com/adithya-s-k/RCForge.git
cd RCForge
npm ci
npm run dev
```

Open the URL Vite prints. The simulator is at the root; documentation is at
`/docs/` on the same address. To use a particular port:

```sh
npm run dev -- --port 5180
```

## Choose an aircraft

Open **Fly → Flight setup → Aircraft → Browse aircraft**. The hangar shows the
actual simulator models. **FT Tiny Trainer · Sport** has roll, pitch and yaw
controls. **Simple Trainer** is Vortex RC's polyhedral rudder/elevator trainer:
use yaw to turn it. Both **FT Bronco** tail configurations are available.

The published examples have estimated physics. See [model limits](validation.md)
before treating simulator performance as a prediction of a physical build.

## Start flying

New sessions begin on the ground with zero throttle, in Pilot view beside the
aircraft. Select the launch that suits the exercise:

| Start      | What happens                                                                                                                                     |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Ground     | Start stationary, increase power, then gently pull back as speed builds. Optional removable gear adds 45 g to aircraft without installed wheels. |
| Hand throw | Release at 8.5 m/s with calculated pitch trim and power for an 8° climb.                                                                         |
| In flight  | Begin at altitude at the aircraft's authored trim speed; quads begin in hover.                                                                   |

Press **Start flight**. Click the field before using keyboard controls.

| Key            | Action                                                   |
| -------------- | -------------------------------------------------------- |
| ↑ / ↓ or W / S | Nose down / nose up                                      |
| ← / → or A / D | Roll left / right                                        |
| Q / E          | Yaw left / right                                         |
| Space / Shift  | Increase / decrease power; releasing the key holds power |
| X              | Cut power                                                |
| Enter / P / R  | Start or resume / pause / reset                          |
| V / F          | Change view / locate the aircraft                        |
| I J K L        | Walk the ground observer                                 |

**Pilot** keeps you on the ground. **Chase** follows the aircraft. **FPV** uses an
installed onboard camera. **Position & view** places the aircraft and observer on
one map. The lower-left instruments show orientation and a minimap.

Focus loss pauses flight. Return to the field and deliberately resume. Reset
returns to the selected launch state; it does not remove aircraft edits.

## Use a controller

Choose **Controllers**, select your input type, then move a stick or press a
button to reveal the connected device. Map, reverse and calibrate axes against
the live monitor. Select **Gentle** in the flight control-response selector if the
aircraft feels too sensitive; customize rates and expo in the editor.

Follow [controller setup](controllers.md) for gamepads and flight sticks, or
[FlySky FS-i6](flysky-fs-i6.md) for USB adapters and the Uno/Nano bridge.

## Keep your changes

Use **Aircraft → History → Save version** before experimenting. **Apply to flight**
validates and saves the edited setup. **Export history** makes a portable backup;
browser storage belongs to this browser and address.

Continue with [Edit & save an aircraft](aircraft-editor.md) or
[build with an agent](agent-workflow.md).

## If something is wrong

- **No controller listed:** focus Controllers and move a stick. Check that your adapter presents joystick input; a firmware-update cable is different.
- **Keys scroll the page:** click the flight view first. Form fields keep normal keyboard behavior.
- **The aircraft moved after an update:** custom definitions stay local. Use Restore original aircraft to adopt the current preset, or restore a saved version.
- **The aircraft will not trim:** check mass, CG, throws and power. A valid JSON definition can still describe an unflyable setup.
- **Changes disappeared after switching address:** localhost ports and the hosted domain have separate browser storage. Import an exported backup.
