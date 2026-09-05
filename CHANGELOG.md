# Changelog

Application releases are separate from physics/replay and aircraft format versions. See [versioning](docs/versioning.md). Unreleased entries describe the current development branch, not a published deployment.

## 0.8.0 — Unreleased

- Add same-site documentation at `/docs/`, with local search, readable source guides, version-aware downloads and explicit immutable release snapshots.
- Add a checksum-verified local plan library with original designer credits; upstream PDFs stay out of public builds.
- Consolidate launch and contribution guides, archive historical review logs, and extract the bundled-aircraft registry from the browser entry point.

- Correct the Bronco’s high-wing seating and add a separate conventional H-tail preset alongside the V-tail, with configuration-specific components and controls.
- Remove the generic trainer from the bundled catalog. **Simple Trainer** now refers only to the Vortex RC design (`vt-simple-trainer`). Older exported generic builds still import normally.
- Add discreet original-creator links to the editor and flight setup. Existing local physical edits are preserved; Restore original aircraft adopts the revised geometry.

- Add local aircraft history: named snapshots, automatic versions on apply, component-level comparison, safe restore into a draft, and portable history backups.
- Enlarge navigation icons and add a GitHub link and application-version dialog. Configure the intended canonical address, `rcforge.adithyask.com`.
- Document the first-contribution workflow, release process, static hosting and transfer of aircraft between browser origins.
- Add FPV camera components with an interactive mount editor, surface picking and live lens preview.
- Add configurable control response rates and surface mixers, with live control tests in the aircraft editor.
- Add the Vortex RC Simple Trainer with documented source dimensions and estimated component/aerodynamic assumptions.

**Compatibility:** aircraft definitions remain format 1. Optional `credit` metadata is accepted by the current reader; older strict readers may reject new files containing it. No replay equations changed in this preset update. Physics/recording compatibility is 0.7.1; recordings from a different simulation version are rejected. Local history begins at format 1 and does not change the shared aircraft JSON format. Presets remain engineering approximations, not flight-test-calibrated aircraft.
