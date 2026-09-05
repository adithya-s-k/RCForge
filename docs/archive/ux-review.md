# Simulator UX review

This review used the running local workbench, actual keyboard flight, and rendered desktop (1440–1639 px wide) and narrow (390 px wide) layouts. It covers the main workflows and the faults reproduced during that walkthrough; it is not an exhaustive usability study or physical-controller certification.

## Follow-up playtest — 5 September 2026

The follow-up used keyboard ground launches with the Bronco and Tiny Trainer, Pilot/Chase switching, pause and reset, the aircraft catalog, input selection, observer presets, editor mass changes and the experiment workflow. The pass preserves the monochrome workbench and existing rendering budget.

| Fault found                                                                                     | Improvement                                                                                                                                                                                                                                           |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The tiny, unstructured input sentence was difficult to read during flight.                      | A compact strip groups actual keys with pitch, roll, yaw and power. Its input button opens the relevant setup tab directly; missing hardware is identified explicitly.                                                                                |
| Ready, paused and impact states were easy to overlook.                                          | A compact flight card gives state-specific guidance and preserves the reason for an interrupted flight. It contracts once airborne. Replay feedback is kept separate from live-flight recovery.                                                       |
| A disconnected controller still produced a Start flight button.                                 | The action becomes Set up controller and leads to device setup. Recorded playback remains available without hardware.                                                                                                                                 |
| Two large catalog cards occupied most of the desktop modal. Search disappeared while scrolling. | Three columns on large screens, two on medium screens and one on phones. Only the results scroll; search, filters and Close remain accessible. Search receives focus; arrows browse cards, Enter selects, and Clear filters recovers an empty search. |
| Mass appeared to change between editing and flying.                                             | The editor labels aircraft mass explicitly and explains the separate launch gear. For example, an 880 g edited aircraft becomes 925 g with the estimated 45 g removable gear.                                                                         |
| Informational notifications remained indefinitely.                                              | Routine confirmations expire after ten seconds. Runtime/import errors remain dismissible and persistent; interrupted-flight reasons stay in the flight card.                                                                                          |
| Mobile throttle was only 80 px wide; placement and setup could overlap lower controls.          | Throttle spans its row. Overlay limits follow the measured height of the instrument and input bars, including wrapping.                                                                                                                               |
| Controller details and keyboard power keys had weak contrast.                                   | Clearer controller outlines and differentiated monochrome key groups preserve the dark theme.                                                                                                                                                         |
| Deep runway cracks dominated the small aircraft.                                                | Compress the source scan's contrast and reduce surface relief, keeping the same texture samples, geometry and draw calls.                                                                                                                             |
| Changing aircraft disposed geometry but retained owned materials and quad textures.             | Catalog and scene changes release unique model-owned GPU resources while retaining the shared fixed-wing palette. Force arrows are released on replacement, and hidden editor axes skip their per-frame DOM updates.                                  |

Regression coverage checks feedback priority, disconnected-input recovery, replay behavior and GPU-resource ownership. Browser checks cover the visible workflows and responsive layouts; they do not establish a measured frame-rate improvement or human preference-study result.

The narrow experiment walkthrough also exposed results arriving below the fold without clear feedback. Completed comparisons now move focus to the result region and bring it into view when needed. End states use readable labels; the duration is labeled as a maximum, and ground contact is included among the reasons a run can end early.

Reloading now restores the last aircraft still available in the catalog and its
validated applied definition. It starts parked in Pilot view with the observer
beside it; launch/camera state is not resumed. Removed selections and malformed,
oversized or mismatched-ID stored overrides fall back to the source definition.
Unavailable browser storage does not prevent flying. This does not retain
unapplied drafts. Applied custom imports also return in the local catalog, with
the imported baseline available for restoration; they do not become bundled presets.

## Findings and changes

| Reproduced problem                                                                            | Change                                                                                                                                                                                       |
| --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Closing Flight setup removed the only Start button.                                           | The bottom bar always provides Start/Resume/Pause and Reset. After an impact, the primary action becomes Restart flight.                                                                     |
| Aircraft, weather and input choices shared one long setup panel.                              | Three short Aircraft / Field / Input tabs, with a reachable launch action and a dedicated close button. Keyboard arrow navigation and controller menu traversal reach the tabs.              |
| Enter or Space on a focused UI button could trigger flight instead of the intended UI action. | Native controls own their keys. Closing setup and using primary flight actions returns focus to the flight view; clicking a camera button also lets pointer users continue flying.           |
| Leaving the flight page forced Chase back to Pilot on return.                                 | Camera choice survives page changes.                                                                                                                                                         |
| The aircraft was hard to reacquire at distance in Pilot view.                                 | Locate / F recenters tracking and shows a five-second marker. V switches Pilot/Chase. The marker is a lightweight overlay, with no additional 3D scene.                                      |
| Throttle hold changed continuously in flight but only stepped while ready.                    | Keyboard throttle ramps before launch and while paused as well. Release holds the selected power.                                                                                            |
| Selecting the active controller type again could reset unfinished setup.                      | Reselecting it preserves assignments and calibration in progress.                                                                                                                            |
| Missing hardware left a page of disabled mapping and calibration controls.                    | Connection guidance, a clearly labeled visual preview, and a keyboard fallback replace unavailable configuration.                                                                            |
| Switching aircraft could lose an unfinished editor draft.                                     | Each aircraft keeps its draft, pending values and errors for the current session. Apply saves locally; reload still discards unapplied drafts.                                               |
| Invalid numeric values disappeared instead of showing the error in context.                   | Keep the typed value, identify the field inline and block Apply until corrected. Empty input is not interpreted as zero.                                                                     |
| Editing required a separate page-navigation step to fly the result.                           | Apply & fly validates, applies, saves and returns to Fly.                                                                                                                                    |
| The full component ledger competed with everyday editing.                                     | Component masses & positions is an expandable advanced section.                                                                                                                              |
| Experiments could silently omit a pending editor draft.                                       | An explicit Apply draft & run action appears when necessary.                                                                                                                                 |
| All experiment scenarios only plotted altitude.                                               | Select altitude, airspeed, roll or pitch without rerunning. Pulse scenarios default to the axis under test. Initial power and pitch commands help explain independently trimmed comparisons. |
| Matching traces looked like a failed comparison.                                              | Identify unchanged configurations and explain that separately trimmed aircraft can hold the same altitude despite different weight or power.                                                 |
| Quad propeller tips could clip at narrow editor widths.                                       | Studio framing uses the rendered model bounds, including the propellers.                                                                                                                     |
| The guide was a wall of text; narrow toolbars wrapped unevenly.                               | A compact shortcut reference with expandable details, orderly editor actions and smaller flight controls retain the minimal dark style.                                                      |

## Visible flight area

At 390 × 844, the wrapped instrument bar occupied 211 px but the camera still
framed the full 788 px stage. The expanded attitude/map panel then covered the
Tiny Trainer in Chase. The scene now ends at the measured top of the instrument
bar, so framing uses the visible 577 px region. Locate uses an overlay with the
same bounds; pointer picking already uses the canvas rectangle. The editor keeps
its full inspection viewport. This also avoids rendering the pixels behind the
opaque bar, without changing the graphics budget or physics loop.

A 760 × 920 check exposed a separate toolbar/status-card overlap from an older
breakpoint. Tablet camera controls now sit above the card. Browser checks covered
390 px Chase, tablet Pilot and Locate, desktop Pilot/Chase, runway placement,
Ground mode, and moving the observer beside the aircraft.

## Setup panel scrolling

The narrow Flight setup panel previously scrolled its heading and Close button
out of reach. Its active tab content now owns scrolling; heading, section tabs
and flight action remain fixed. The 390 × 844 check covered long Aircraft
content, the high-trim note, the compact keyboard visual and navigation into the
editor. Desktop retains the same compact panel size.

## Verification

Notifications no longer intercept clicks on the page underneath. A 390 px
transmitter-recovery check found the notice over `Use keyboard for now`; the
button's center hit the notice instead. The notice now uses its content width
within the viewport limit and ignores pointer events, while its Close button
remains interactive. The same recovery sequence switches to Keyboard with the
notice still visible, and manual dismissal still works.

The flight distance instrument now measures the straight-line distance from the
pilot's eye position to the aircraft CG, consistent with Pilot-view Locate. Its
unit reads `m to pilot`. Previously the horizontal-only reading stayed at 4 m
with a quad almost 180 m overhead. The minimap remains a north-up ground projection.

Browser walkthroughs exercised keyboard launch, throttle increase/cut, pitch/roll input, pause/resume, impact/restart, Pilot/Chase, Locate, aircraft/observer placement, page navigation, Bronco/Tiny Trainer editing, inline errors, Apply & fly, draft-to-experiment handoff, roll-response plotting and metric switching, missing gamepad recovery, and catalog search. Desktop and narrow layouts were visually inspected.

Automated coverage includes draft retention and correction, initial saved-model selection, flight/replay action labels, UI keyboard ownership, active-controller reselection, and controller navigation through inactive setup tabs. The existing dynamics, replay, calibration and signal-loss tests also run through `npm run check`.

No physical gamepad, joystick, FlySky transmitter or Arduino was available for this review. Real-device feel, hardware button assignments, calibration and disconnect behavior still need the [hardware acceptance checks](../controllers.md#physical-acceptance-checklist). The narrow layout is usable for setup and external inputs; this change does not add touchscreen flight sticks. Physics coefficients and scenery rendering budgets are unchanged.
