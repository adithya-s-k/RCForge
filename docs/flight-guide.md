# Set up your flight

Use this guide after [your first flight](getting-started.md). It covers the aircraft's starting position, your viewpoint and the on-screen flight references.

## Choose what to fly and where

Open **Fly → Flight setup**. Its three tabs keep the setup in one place:

| Tab      | Change here                        |
| -------- | ---------------------------------- |
| Aircraft | Aircraft selection and launch mode |
| Field    | Scenery, wind and weather settings |
| Input    | Input device and control response  |

Choose **Ground** to start stationary, **Hand throw** for a launched fixed-wing plane, or **In flight** to begin at altitude. Start with low wind while learning a new aircraft. Check the throttle readout before pressing **Start flight**.

For less sensitive controls, select **Gentle** under Input. It reduces response; it does not make a fixed-wing plane self-level. [Tune rates and mixing](fpv-and-control-setup.md#adjust-sensitivity) explains the adjustments.

## Choose your view

| View  | What you see                                  |
| ----- | --------------------------------------------- |
| Pilot | The aircraft from your position on the ground |
| Chase | A camera following the aircraft               |
| FPV   | The view from an installed onboard camera     |

Press **V** to cycle available views. If FPV is unavailable, [mount a camera](fpv-and-control-setup.md#mount-a-camera) in the aircraft editor. Press **F** to locate the aircraft from the pilot view. Camera selection is retained when you visit another workspace.

## Position the aircraft and pilot

Open **Position & view** on Fly. Use its shared map to place the aircraft or select **You** to move the blue pilot marker. **Beside aircraft** and **Flight line** provide quick pilot positions.

- Drag a marker to place it. Use arrow keys for small adjustments; Shift uses 10 m steps.
- Drag the map background to pan and scroll to zoom.
- In Pilot view, use **I/J/K/L** to walk forward/left/back/right. Eye height is 1.7 m.
- **Use WASD to walk** gives those keys to pilot movement; arrow keys remain available for flight.

Drag the field to look around. **Keep aircraft in view** returns your attention to the aircraft after looking. **Focus at distance** gradually zooms the pilot view as the aircraft moves away, up to 1.8× magnification. Turn it off for a fixed viewing angle. In Chase, scroll changes follow distance.

## Read the flight reference panel

The lower-left panel combines an attitude indicator with a north-up minimap:

| Display                     | Meaning                                              |
| --------------------------- | ---------------------------------------------------- |
| Bank and pitch              | Aircraft orientation                                 |
| Amber marker                | Aircraft position                                    |
| Blue marker                 | Your ground position                                 |
| Runway, trail and sightline | Where you are flying relative to the field and pilot |

The map adjusts its scale to include the aircraft, pilot and runway. Click it to open **Position & view**, or collapse the panel for more flight space. These readings come from the simulation; they are not GPS or radio telemetry.

## Pause, reset and return to flying

Use **Enter** to start/resume, **P** to pause and **R** to reset. The bottom bar also provides these actions. Reset returns to the chosen launch state and keeps your aircraft edits. After a crash, use **Restart flight**.

Flight pauses when the window loses focus. Click the field and resume deliberately. When a form or menu owns the keyboard, flight shortcuts wait; press **Esc** to close flight setup or click the field again. See [troubleshooting](troubleshooting.md) if keys or controller input seem unresponsive.

Next: [configure your controls](controllers.md) or [edit the aircraft](aircraft-editor.md).
