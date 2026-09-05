# FPV cameras and control setup

## Mount a camera

1. Open **Aircraft → Components → Add FPV camera**. The Fly page's **FPV** button takes you here when no camera is installed.
2. In **Place FPV camera**, choose **Pick surface**, then click the airframe. The camera housing is offset from the picked tangent plane by 2 mm. This is a visual starting point, not a collision or mechanical-fit guarantee; neighboring geometry, wiring and mounts still need inspection.
3. Drag the **Move** arrows or **Rotate** rings. Move axes follow the airframe (X forward, Y right, Z down); rotation rings follow the camera. Drag empty space to orbit. While picking, right-drag or switch back to Move to orbit. **Top** and **Side** give exact orthographic views. Optional snapping uses 5 mm translation and 5° rotation increments.
4. Watch the **live lens preview** for airframe obstructions. Adjust tilt, pan, roll and vertical FOV with sliders, or enter exact millimeter positions. **Undo**, **Reset placement**, **Face forward & level** and centerline placement are available. **Cancel** or Escape discards this placement session, preserving the aircraft draft you started with. Canceling does not remove a camera just added to that draft.
5. **Use placement** commits the mount to your draft. Camera mass, housing dimensions and exact installation angles remain in Components. Choose **Apply & fly**, then **FPV**. **V**, or the assigned camera shortcut, cycles Pilot → Chase → FPV. Aircraft without a camera cycle only Pilot/Chase. **F** returns to the pilot and locates the aircraft. To return to interactive placement, choose **Adjust camera** or **Place camera in 3D**.

The generic kit adds **25 g including its mount**, once, to the component ledger. It is an installation estimate, not a particular camera product. Existing equipment named `camera` or `fpv-camera` is reused when possible, retaining its weight. The bundled **Quad X · 6S powertrain** already has a camera and exposes its view without changing its 650 g total mass. Older saved copies need their camera enabled in Components or their original restored.

Moving the camera preserves its mass and changes three-axis CG and inertia; replacing it can also change total mass. Removing it removes that mass component. The camera housing follows the same mount orientation as its optical center. FPV is a rigid view: banking tilts the horizon, a steep camera angle points upward when parked, and badly placed airframe parts can obstruct the lens. Flight uses one render pass. The placement dialog adds a small scissored studio lens view (at most 300 × 169 logical pixels) through the existing renderer, with no additional WebGL context, animation loop or shadow-map update. It disappears on close. Dragging previews the existing housing without rebuilding the airframe or running trim on each movement; Use placement validates and recomputes the draft once. The preview shows a stationary aircraft in the studio, not a flying vehicle or simulated video link.

This is an ideal perspective camera. There is no fisheye distortion, radio interference, video latency or head tracking. FOV is **vertical**, not the diagonal FOV often quoted on hardware. Camera and video-transmitter power must be included in the battery's authored `avionicsCurrentA`; installing the generic mass kit does not infer electrical consumption, drag, a radio system or collision geometry.

## Adjust sensitivity

Use the response selector beside the input device on Fly, **Flight setup → Input**, or **Aircraft → Control test**. **C** cycles rates in the flight view or editor. A controller's **Cycle control response** action can use a spare button or switch; new standard gamepad shortcuts use **L1/LB**. Previously saved bindings remain unchanged until edited or reset with **Use standard shortcuts**.

| Profile  | Roll / pitch / yaw limit | Soft center | Additional smoothing |
| -------- | ------------------------ | ----------- | -------------------- |
| Gentle   | 55 / 45 / 65%            | 40%         | 90 ms                |
| Standard | 80 / 75 / 85%            | 20%         | 35 ms                |
| Direct   | 100 / 100 / 100%         | 0%          | 0 ms                 |
| Custom   | Individually adjustable  | 0–80%       | 0–200 ms             |

These are RCForge input presets, not measured tuning for your build or Betaflight rate profiles. The FT-22 source definition selects Gentle; older saved aircraft may retain their previous setup. Other definitions without a response setting use Direct to preserve their earlier behavior.

Expand **Fine-tune response** to adjust each axis from 10–100%. Valid edits take effect immediately and persist per aircraft in this browser. Custom settings remain available after trying another preset. **Save response in aircraft draft** also puts the configuration into the editor draft; Apply saves it with the aircraft, and Export includes it in JSON. **Use aircraft default** restores the current applied definition's default.

The pipeline is:

`device calibration / device expo → pilot rates / expo / smoothing → pitch trim → surface mixing → servo/linkage travel and speed → aerodynamic forces`

Throttle is untouched. Keyboard easing remains in the keyboard acquisition layer. The extra smoothing runs at the 120 Hz physics step, never the display rate. The cubic response is `rate × ((1 − expo) × stick + expo × stick³)`. Increasing expo softens the center without changing the selected endpoint; decreasing the rate also reduces maximum pilot authority. Device expo and transmitter expo compound with this setting, so use Direct when your radio already supplies the desired rates.

Trim stays outside the rate reduction. Pitch maps each half of the stick into the available interval above/below trim; zero stick preserves the complete trim command. Gentle does **not** stabilize or self-level a fixed-wing aircraft. It does not fix the FT-22's estimated high-trim/power-change behavior. On quads it reduces the requested tilt in the existing Angle mode, or requested angular rate in Rate mode. It adds no altitude hold or new flight controller.

## Test movement and mixing

**Aircraft → Control test** enables **Test sticks**. Move the selected controller, or click the model and use arrows for pitch/roll and Q/E for yaw. The model remains stationary and its motors stay off. The displayed degrees and animated hinges/horns use the same surface commands, servo response, horn ratio and speed limits as flight. **Include calculated launch trim** adds the selected launch configuration's estimated trim; leave it off to inspect neutral travel.

The test remains available while editing Components. Turn **Test sticks** off to park every surface at neutral. Missing input returns the test toward neutral; it never arms or resumes a flight. Quads show commanded tilt or angular rate instead of nonexistent control surfaces.

Expand **Surface mixing** on any fixed-wing aircraft:

- Set roll, pitch and yaw contributions separately for every existing movable surface. Negative values reverse that contribution. **Reverse output** flips all three together.
- Adjust a surface's physical travel cap. A servo's horn ratio and travel can impose a smaller effective limit; the readout reports the effective value. Edit the linked servo in Components for speed, horn geometry and servo travel.
- **Apply a paired mix** offers elevons, upward V-tail, inverted A-tail and ailerons. Explicitly choose the left and right surfaces. This rewires existing surfaces; it does not change their geometry or add a servo.
- The live **Mix limit** indicator means the combined command exceeds an endpoint and is saturated. For example, full roll plus full pitch cannot each receive full independent elevon travel.

Mix edits are aircraft drafts and affect the live test immediately after committing a field. Apply them before flying; export them to share. A new mix can reverse torques or invalidate trim. Verify pitch-up, roll-right and yaw-right independently, then combined commands. Surface angles are signed hinge deflections, not aircraft attitude angles. Imported aircraft need correctly authored hinges and surface axes for animation to match their physical build.

## Authoring contract

Aircraft format 1 gains optional fields:

```json
{
  "fpv": { "partId": "fpv-camera", "fovDeg": 90 },
  "pilotResponse": {
    "preset": "custom",
    "rates": [0.55, 0.35, 0.65],
    "expo": 0.4,
    "smoothingSeconds": 0.09
  }
}
```

This is a fragment, not a complete aircraft. `fpv.partId` must reference non-servo equipment in `parts`. Its `positionM` is the camera's mass center at the aircraft datum, and `orientationDeg` is Rz Ry Rx as for all components. At zero mount angles the lens faces body +X with up along −Z. Its optical center is 6 mm forward of the housing's front face (`sizeM[0]/2 + 0.006` in component X). Renderer conversion subtracts aircraft CG, applies body attitude, and then converts NED to scene coordinates. A wider or differently positioned camera must still be modeled in the component ledger once.

For mixing, the existing `surface.control.axis × gain` and optional `mix.roll/pitch/yaw` contributions are added and clamped to `[-1,1]`. The UI canonicalizes the primary axis into `gain` without also counting it in `mix`. Mechanical travel, servo linkage, response time and control effectiveness remain separate fields. See [aircraft authoring](aircraft-authoring.md) and [component models](component-models.md).

The dynamics formulas and recording version remain **0.7.1**. The servo step was extracted into a shared function without changing its calculation. Recordings already store effective controls after shaping/trim, so replay bypasses local rates. Existing 0.7.1 recordings still work in this engine; older application builds do not recognize the new optional aircraft fields. Numerical experiments supply their own effective commands and do not simulate a local user's input response preferences.

## Verification and references

`npm run check` covers camera references/pose, once-only mass changes, input curves, preserved trim/throttle, deterministic replay, and matching bench/flight servo deflections for the FT-22, Bronco and Tiny Trainer. Mixing tests check individual and combined commands, reversed outputs and schema round trips. `npm run physics:validate` and `npm run physics:envelope` remain numerical checks, not measured-aircraft calibration. Physical transmitter, servo and video hardware still need real-device verification.

The distinction between response rates and self-leveling follows the concepts described in [Betaflight's rate calculator](https://betaflight.com/docs/wiki/guides/current/Rate-Calculator) and [flight modes](https://betaflight.com/docs/wiki/guides/current/Modes); this implementation does not emulate their algorithms. The camera projection follows [Three.js PerspectiveCamera](https://threejs.org/docs/pages/PerspectiveCamera.html), including its vertical-FOV convention.
