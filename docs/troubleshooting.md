# Fix a problem

Start with the symptom you can see. Change one thing at a time so you can tell which step helped.

## Flight controls do not respond

1. Check that flight is running, not paused after losing window focus.
2. Click the field. A text field, menu or dialog can keep the keyboard focus. **Esc** closes flight setup.
3. Open **Controllers** and inspect **Live controls**. Confirm the selected input source and move one axis at a time.
4. If the device is missing, use the matching connection section below. If it responds in the monitor, check mapping and reversal before changing the aircraft.

On the **Simple Trainer**, left/right keyboard inputs steer the rudder because it has no ailerons. It will not respond like an aileron-equipped Tiny Trainer. [Control guide](controllers.md).

## A gamepad or joystick is missing

Connect the device, focus RCForge, then move a stick or press a button. Refresh devices in Controllers and select the intended device. A USB radio adapter must expose joystick input; a firmware-update cable does not do that.

If the operating system cannot see the device either, resolve that connection first. An Arduino running the RCForge bridge uses **Connect Arduino**, not the gamepad chooser.

## Arduino: failed to open serial port

This happens before RCForge can read channel data. It does not indicate CH6 STOP.

1. Close Arduino Serial Monitor, Serial Plotter and any other tab or program using the port.
2. Reconnect the USB data cable and select the current port; its name may change.
3. Use desktop Chrome on localhost or HTTPS, then **RC transmitter → Connect Arduino**.

If the USB device disappears when you connect or power hardware, disconnect that external wiring and check the power path. Do not keep moving wires between unknown contacts. The [receiver bench guide](fs-i6-ia6b-nano-setup.md) records an unresolved disconnect; **receiver connections are still to be tested successfully**.

## Arduino: waiting for bridge data

USB opened, but RCForge has not accepted bridge packets. Upload [`rcforge_bridge.ino`](../hardware/rcforge_bridge/rcforge_bridge.ino), then close Serial Monitor and reconnect.

The [`ppm_monitor.ino`](../hardware/ppm_monitor/ppm_monitor.ino) sketch prints readable diagnostics. It is useful for checking wiring, but its `PPM | channels=...` lines are not flight input. The bridge uses **115200 baud** and lines beginning `RCF1`.

## Arduino: input stopped

Keep throttle low and put the CH6 control in the position that showed **RUN** in the diagnostic sketch. If the input remains stopped, disconnect RCForge and inspect Serial Monitor at 115200 baud:

| Output                            | What it tells you                                                                                                         |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `RCF1,number,1,PPM,6,...`         | The bridge accepts the current input. Close the monitor and reconnect RCForge.                                            |
| `RCF1,number,0,PPM,6,...`         | Input is invalid or the RUN guard is off. The following channel values are inactive replacements, not raw stick readings. |
| Diagnostic PPM with CH6 over 1700 | The diagnostic sees the RUN position. Upload the bridge again to use it in RCForge.                                       |
| `NO SIGNAL` in the diagnostic     | Check documented signal output, ground and transmitter output mode.                                                       |

Do not infer actual CH6 from a status-0 bridge packet: the sketch replaces it with 1000. If the cause is unclear, use the [trainer diagnostic walkthrough](trainer-nano.md#3-upload-the-diagnostic-sketch) to see the raw channels. Keep the guard enabled while diagnosing an unknown failure.

## Controls are reversed or too sensitive

In Controllers, use **Detect** to identify each axis and **Reverse** to correct its direction. Capture neutral, then full travel, and save calibration. Confirm throttle goes from 0 to 100%.

For gentler handling, select **Gentle** on Fly. For a noisy center, adjust the device dead zone. Avoid applying expo or surface mixing in both the transmitter and RCForge. [Rates and mixing](fpv-and-control-setup.md#adjust-sensitivity).

## Aircraft edits disappeared

Browser storage belongs to a particular browser and address. Different localhost ports and the hosted site have separate saved setups. Import an exported backup when changing where you run RCForge.

An unapplied draft is not a saved aircraft. Use **Apply to flight**, named versions in **History**, and **Export history** for a portable backup. [Saving and recovery](aircraft-editor.md#save-restore-and-contribute).

## The aircraft will not trim or flies unexpectedly

Check total mass, component positions, CG, control direction and available thrust. A valid aircraft file can still describe an unflyable setup. Restore a known version and compare one change at a time with [physics experiments](physics-validation.md).

The models contain estimates. Do not treat a successful simulated flight as validation of a real build; see [known limits](validation.md).

## Ask for help

Include the aircraft, input device, browser, app version, exact error and steps that reproduce it. For Arduino, include the board, transmitter/receiver, sketch name and a few Serial Monitor lines. State whether the USB port itself disappears or only flight input stops. For an aircraft issue, export the setup and any relevant recording.

You can use the [radio setup prompt](radio-setup.md#set-up-with-an-ai-agent) with a coding agent, or follow [contributing](../CONTRIBUTING.md) to report a reproducible problem.
