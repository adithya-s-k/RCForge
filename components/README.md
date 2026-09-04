# Component catalog

The catalog is local data, not a shop connection. It makes physical assemblies
portable between the browser, JSON aircraft files and headless experiments.
No prices, inventory promises, vendor endorsement or purchases are included.

## Use it

1. Open **Aircraft editor → Components** and choose an installed part.
2. Edit its measured mass, position and physical parameters, or choose
   **Replace component** to browse matching catalog entries.
3. Select a replacement to review the aircraft mass and CG movement.
4. **Use this component** changes the draft. **Apply to flight** rebuilds the
   simulation; **Export** saves a standalone aircraft JSON.

Airframe and Components share one draft. On desktop the model stays beside the
component panel; a muted outline identifies the selected installation envelope,
including components enclosed by the fuselage. It shows the authored mass
position and dimensions, not exact collision geometry. Top and Side views make
installation changes easier to compare. Narrow screens use an installed-part
selector instead of a long side list. Replacement browsing shows its mass/CG
preview before changing the draft.

A battery's grams and mAh are independent inputs. More capacity slows charge
consumption at the same current. More mass changes CG/inertia and increases the
thrust needed to sustain flight; supplying that thrust can increase current.
The model includes voltage sag and falling voltage as charge is consumed. The
flight HUD shows charge, voltage and current; its tooltip and flight setup show
used mAh. Time to 20% is conditional on the instantaneous current, not an endurance
prediction.

Servo details expose speed, rated positional range, commanded travel, horn lengths
and surface limit. The displayed effective angle and rate drive flight forces and
animation. A motor package replaces its tested motor/prop curve and both mass
components. Motor packages require explicit `motors[].partId` and `propPartId`
links. The 450 mm quad provides this complete example. Older definitions that
combine prop mass elsewhere must first separate that allocation; the catalog
refuses to invent or double-count it.

Saved browser designs retain their previous definitions. To use revised bundled
battery/servo setups, select **Restore original aircraft** in the editor, review,
and apply. Export your customized draft first if you want to retain it.

## Evidence in the initial catalog

| Reference                        | What is sourced                                                             | What remains estimated or unmodeled                                                        |
| -------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Orange 3S 1000 / 1500 / 3300 mAh | Robu indexed product capacity, cell count, product mass and case dimensions | DC resistance, OCV curve, actual discharge capability; stock and revisions unverified      |
| TowerPro SG90 Digital / MG90S    | Manufacturer mass, dimensions, speed and torque at 4.8 V                    | Exact unit/clone differences, positional travel verification, load-dependent speed/current |
| EMAX BLHeli 12A / 20A ESC        | Manufacturer manual hosted by Robu, mass including wires and dimensions     | Thermal/current limits, BEC and firmware behavior                                          |
| EMAX MT2213 935KV + 1045         | Manufacturer motor dimensions/mass and 11.1 V thrust/current/RPM samples    | PWM-to-command mapping, prop mass, response, torque ratio, installation                    |

Each entry carries its exact source URLs and evidence note. Some Robu pages expose
only a JavaScript shell; indexed staging listings were used for the 1500 and 3300
mAh specifications. Use **product** weight, not the inconsistent shipping-weight
field. A listed 1 kHz impedance is not a pack DC-resistance measurement. The older
Robu MT2213 sheet describes a different KV variant; its maximum-thrust headline
was not merged into the current EMAX 1045 curve.

All fixed-wing presets and the basic 5-inch quad now have an electrical model.
Where no current bench curve exists, current is explicitly **estimated** from
ideal induced power divided by an assumed 0.45 overall factor and nominal voltage,
plus a small no-load term. This does not measure the actual motor or account for
forward-flight efficiency. Read [component models](../docs/component-models.md).

## Add a reference with a coding agent

Edit [catalog.json](catalog.json), then run:

```sh
npm run aircraft:validate
npm run check
npm run physics:validate
```

`ComponentCatalogSchema` in [components.ts](../src/core/components.ts) is the strict
schema. The file has `schemaVersion: 1`, `reviewedAt` and an `entries` array. Each
entry needs a unique slug `id`, `name`, `type`, `description`, physical `part`,
`sources: [{title,url}]`, and an `evidence` note separating facts from assumptions.
Types are `battery`, `servo`, `motor` and passive `equipment`.

- `part` uses aircraft mass-part fields without `id` or `positionM`. Installation
  coordinates are preserved on replacement. Supply meters and kilograms.
- Batteries add the aircraft `battery` fields without `partId`.
- Servos use an equipment part with `servo` metadata. Do not use continuous-rotation
  servos for positional surface linkages.
- Motor entries include `motor` settings without identity/installation/spin/yaw
  fields, a matching performance curve, and a separate `prop` mass part. Record
  the tested voltage, propeller, command convention and density uncertainty.
- Passive equipment changes mass/inertia only. A printed ESC current rating does
  not magically implement firmware, thermal limits or battery cutoff behavior.

The chosen values are copied into exported aircraft definitions; `catalogId`
records their origin but is not a runtime dependency or live update. User edits
may differ from the catalog reference. Keep detailed sources in provenance and
replace estimated curves with measured data before claiming flight accuracy.
