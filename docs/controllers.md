# Controller setup and verification

RCForge reads keyboard input, browser Gamepad API axes, and the RCForge Arduino USB serial bridge. That API can expose gamepads, joysticks, and RC simulator adapters recognized by the operating system. Device names and mappings vary; a name is not proof of compatibility.

## Keyboard

W/S or arrows pitch down/up; A/D or arrows roll; Q/E yaw. Space increases throttle, Shift decreases it, and X cuts power; +/− and keypad +/− also work. Tap for 5% steps or hold for a continuous change. Releasing holds the selected throttle. P pauses, R resets. Enter starts or resumes. Flight shortcuts are suppressed while editing a form field. Launch focuses the flight canvas. Losing focus pauses and clears held keys.

## Gamepad or joystick

1. Connect through USB or Bluetooth and confirm the operating system sees the device.
2. Focus RCForge and move a centered stick or press a button; some browsers do not expose devices before interaction.
3. Open Controllers, refresh if necessary and select the device.
4. Assign the four channels with an axis selector or Detect: click Detect, then move only the desired axis within ten seconds. Noise and ambiguous simultaneous movement are ignored. Selecting an occupied axis swaps its entire binding, retaining physical calibration. Quick swap buttons exchange roll/yaw or pitch/throttle.
5. Capture neutral with roll/pitch/yaw centered, start range capture, then sweep all channels both ways. Each channel reports captured endpoints. Save requires travel around each centered axis and sufficient throttle range. Cancel & restore reverts the entire pre-calibration profile; flight stays blocked while setup is active.
6. Flip any channel that moves the wrong direction. Open Response on each channel to adjust dead zone and expo independently. Dead zone suppresses center noise; expo softens response. Throttle uses endpoints only. Leave software expo at zero if the transmitter already applies it.
7. Select the controller input source. Check the throttle readout before launching. Reset applies calculated elevator trim; set the visible trim to zero for entirely transmitter-controlled trim.

Profiles are stored in browser storage keyed by device ID. Recalibrate when device IDs, adapter mode, transmitter mixes or endpoint settings change. Browser storage failures leave the active profile usable but unsaved.

## FlySky FS-i6

See the [FS-i6 wiring and Arduino guide](flysky-fs-i6.md) for the original transmitter's trainer output, receiver PPM, or six receiver PWM channels. It includes the Uno/Nano sketch, upload steps, receiver failsafe setup and troubleshooting.

A compatible PPM-to-USB **joystick** adapter uses **Find devices**. A classic Nano/Uno running the RCForge bridge uses **Connect Arduino** in the RC transmitter tab, with a Web Serial-capable browser. A programming cable alone does not provide simulator input. Serial disconnects do not silently switch to another controller or resume flight.

## Physical acceptance checklist

No physical controller was connected during implementation. Fill in the exact device, adapter, firmware, OS and browser during hardware verification:

- [ ] Device appears and remains connected.
- [ ] Four independent channels are exposed with smooth motion.
- [ ] Axis assignments and reversal match stick intent.
- [ ] Pitch/roll/yaw centers return to zero; throttle reaches 0–100%.
- [ ] Saved calibration reloads correctly.
- [ ] No unwanted double expo or transmitter/software trim interaction.
- [ ] Disconnect pauses flight; reconnect requires deliberate resume.
- [ ] Device swap does not silently reuse incompatible calibration.
- [ ] A complete launch, turn, glide and reset is usable at normal frame rate.

The Arduino bridge shares the same mapping and calibration path as HID controllers. It accepts the documented RCForge serial protocol only; arbitrary USB serial or iBUS devices cannot be plugged in as if they were joystick adapters.

Open **Position & view** on Fly for aircraft placement and pilot movement on one map. Select **You** and drag the blue marker to move your viewpoint at 1.7 m eye height. **Beside aircraft** and **Flight line** are quick positions. I/J/K/L walk forward/left/back/right; enable **Use WASD to walk** for WASD movement while arrows fly. Drag the field to look around; **Keep aircraft in view** recenters after looking. Chase keeps the horizon level, and scroll adjusts follow distance. The map supports dragging its background to pan, scrolling to zoom, and arrow keys to nudge the selected marker (Shift for 10 m steps).

Export/import setup under Aircraft trim & profile files transfers a validated profile JSON. Imports are rebound to the selected device and require its available axes; verify directions before saving. Unsaved changes are marked beside the device selector.

## Controller shortcuts

Expand **Controller shortcuts** to assign Start/pause, Restart, Pilot/chase, or Settings to a button or an unused axis endpoint. Button numbers are one-based in the UI; the pressed-button indicator helps identify them. Analog flight axes are reserved and cannot trigger shortcuts. Move a switch back before triggering its next action. Holding a button does not repeatedly restart, and connecting with a switch already on does not trigger an action.

For settings navigation assign Next setting, Previous setting, Activate, Decrease and Increase. Focus is outlined; decrease/increase adjusts selected numeric fields or dropdowns. Shortcuts are stored separately per device in this browser. They do not change transmitter firmware or hardware menus. Leave controls unassigned if the USB adapter does not expose enough inputs. A four-axis simulator adapter may expose no spare switches or buttons.

## Flight reference display

The lower-left **Flight reference** panel shows bank/pitch and heading alongside a north-up minimap. Amber is the aircraft, blue is the pilot; the runway, recent aircraft trail and pilot sightline provide orientation. The map scales automatically to retain both positions and the runway. Click it to open **Position & view**, or collapse the panel for more flight space. These are simulation-state references, not GPS or transmitter telemetry. The SVG instruments update at the normal 10 Hz UI cadence and add no extra 3D view.
