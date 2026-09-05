# Changelog

Application releases are separate from physics/replay and aircraft format versions. See [versioning](docs/versioning.md). Unreleased entries describe the current development branch, not a published deployment.

## 0.8.0 — Unreleased

- Add local aircraft history: named snapshots, automatic versions on apply, component-level comparison, safe restore into a draft, and portable history backups.
- Enlarge navigation icons and add a GitHub link and application-version dialog. Configure the intended canonical address, `rcforge.adithyask.com`.
- Document the first-contribution workflow, release process, static hosting and transfer of aircraft between browser origins.
- Add FPV camera components with an interactive mount editor, surface picking and live lens preview.
- Add configurable control response rates and surface mixers, with live control tests in the aircraft editor.
- Add the Vortex RC Simple Trainer with documented source dimensions and estimated component/aerodynamic assumptions.

**Compatibility:** aircraft definitions remain format 1. Physics/recording compatibility is 0.7.1; recordings from a different simulation version are rejected. Local history begins at format 1 and does not change the shared aircraft JSON format. Presets remain engineering approximations, not flight-test-calibrated aircraft.
