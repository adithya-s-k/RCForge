# Versions and aircraft history

RCForge separates application releases, simulation compatibility, file formats and your own aircraft versions. Open the version badge in the header to see the running application's versions.

## What each version means

| Version                  | Current value                   | When it changes                                                             |
| ------------------------ | ------------------------------- | --------------------------------------------------------------------------- |
| Application              | 0.8.0 (development, unreleased) | A release of the whole workbench; source of truth is `package.json`         |
| Physics and recordings   | 0.7.1                           | Dynamics or replay behavior changes; source of truth is `SIM_VERSION`       |
| Aircraft definition      | `schemaVersion: 1`              | An incompatible aircraft file format change                                 |
| Aircraft history archive | `formatVersion: 1`              | An incompatible backup format change                                        |
| Documentation            | `next` (development)            | Current guides update with source; releases get immutable `X.Y.Z` snapshots |
| Local aircraft           | v1, v2, v3…                     | You save or apply a changed setup for that aircraft ID                      |

Application versions follow [Semantic Versioning](https://semver.org/): patch releases fix behavior, minor releases add capabilities, and major releases mark incompatible public changes after 1.0. During 0.x development, incompatible changes can arrive in a minor release; they must still be explained in the changelog with migration or rejection behavior. Released versions are not edited or reused.

A UI release does not invalidate physics recordings. Recording import checks the exact simulation version and rejects incompatible recordings instead of silently replaying different physics. History files contain validated aircraft definitions, not simulation states. Restoring an old setup uses the **current** physics; its saved physics version is shown for context, not emulated.

## Use local aircraft history

1. Open **Aircraft → History**. Name your starting setup and choose **Save version**.
2. Edit the aircraft's components, mass, geometry, control response or FPV mount.
3. **Apply to flight** saves the changed definition and an automatic version. Repeated applies of an identical setup do not create duplicates. The first changed apply also keeps the starting setup.
4. Open **History** and select a version. The comparison shows what would change from your current draft to that version, including component masses and positions.
5. Choose **Restore to draft**. RCForge saves your current draft first, then opens the selected version for inspection. **Apply to flight** adopts that setup; restoring alone leaves the current flight configuration unchanged.

A named checkpoint can mark an already applied setup without changing it. Repeating the same checkpoint name and setup does not create another entry.

Checkpoints are complete snapshots, not a chain of patches. Removing one does not break later versions. They are grouped by aircraft ID: use a new ID in JSON when creating a separate design. Revision numbers are local to that aircraft on that browser and keep increasing after deletion. Imported snapshots keep their unique IDs, but can receive new local revision numbers when merged with existing history.

The original bundled definition remains available through **Restore original aircraft**. Your edited setup is checkpointed before restoring it. Older browser installations start history from their currently applied definition; RCForge cannot reconstruct edits made before history existed.

### Save, apply and export

| Action                                 | Result                                                                                                              |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Save version                           | Saves a checkpoint of the current editor draft, without applying it to flight                                       |
| Apply to flight                        | Saves and applies the current draft, with an automatic history entry if changed                                     |
| Export (editor toolbar)                | Downloads the current draft as ordinary aircraft JSON                                                               |
| Export JSON (selected history version) | Downloads that snapshot as ordinary aircraft JSON                                                                   |
| Export history                         | Downloads every saved version for this aircraft in one `.history.json` backup                                       |
| Import JSON / Import history           | Accepts an aircraft definition or history backup; a backup merges versions and opens its latest snapshot for review |

When importing a backup, choose **Apply to flight** to keep that aircraft available after reloading. Save a checkpoint **before** exporting history if you want unapplied draft changes included. Aircraft JSON is the format to contribute to the repository; history archives are personal backups and should not go in `aircraft/`.

### Storage and recovery

History stays on this browser profile and origin. It is not an account, cloud sync or Git repository. [Browser local storage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) is scoped to protocol, hostname and port: localhost, a different local port, and `https://rcforge.adithyask.com` have separate storage. Clearing site data or private browsing storage can remove it.

Each aircraft supports up to **40 snapshots**, with a compact archive limited to **1.8 MB of UTF-8 JSON**. Browser-wide quotas may be reached sooner. RCForge reports failures and never silently prunes old versions. Export a backup, then remove selected older versions under **Version details & removal** to make space. Applying can still work if history storage is full; a visible message explains that the version was not saved. Restore stops if the current draft cannot be preserved.

Malformed or incompatible history is left untouched and reported. Imports validate the format, every aircraft and revision identity before merging. Re-importing the same archive adds no duplicates; a conflicting snapshot with an existing unique ID is rejected. Local history is intended for one editing tab at a time, not concurrent collaborative editing.

## Move from localhost to the hosted workbench

The intended public address is **[rcforge.adithyask.com](https://rcforge.adithyask.com)**. These instructions do not imply the site has been deployed yet.

1. On localhost, open each aircraft you want to keep. Save any draft as a version, then **Export history**. For only the current setup, ordinary **Export** is sufficient.
2. Back up controller mappings separately through **Controllers → Mapping → Aircraft trim & profile files → Export setup**. Aircraft history does not contain input profiles, scenery preferences or flight recordings.
3. Open the hosted address. Use **Aircraft → Import JSON**, choose the history backup, inspect the latest setup and **Apply to flight**. Repeat for your other aircraft.
4. Import the controller setup in Controllers. Reconnect and check/calibrate your device in that browser.

Keep the downloaded files until you have checked the imported aircraft and history. There is no automatic transfer between addresses.

## Maintainer release workflow

Contributors normally leave version numbers alone. Maintainers prepare a release on a branch:

1. Choose the application version and document user-visible changes in [CHANGELOG.md](../CHANGELOG.md). Decide separately whether simulation or file compatibility changes.
2. Run `npm version 0.8.0 --no-git-tag-version`, substituting the **next** intended version. This updates both package files; the UI reads that value directly. Do not run the example for a version already set.
3. For physics changes, update `SIM_VERSION`, regression evidence and recording compatibility notes. For a format change, implement validation plus explicit migration or rejection and add tests. Never bump format numbers without the supporting implementation.
4. Update the current guides and compatibility table, set the release date and run `npm run format` followed by `npm run release:check`. This includes definitions, tests, build, documentation links, reference identity, formatting, numerical verification and the envelope survey. Complete the browser and relevant hardware checks in [CONTRIBUTING.md](../CONTRIBUTING.md).
5. Commit the reviewed release content. With a clean working tree, run `npm run docs:freeze -- X.Y.Z`, replacing `X.Y.Z` with that application version. The command records the source commit, Markdown, approved downloads and hashes under `docs/versions/X.Y.Z/`. It refuses an existing version. See [documentation maintenance](documentation.md).
6. Commit the new snapshot and rerun `npm run release:check`. Inspect the version selector and links at `/docs/X.Y.Z/`. The snapshot is release documentation; it does not emulate an older simulator or publish anything.
7. Review and merge the release PR. Tag the tested release commit as `vX.Y.Z`, publish release notes and deploy its tested build. Tagging, publishing and deployment are explicit maintainer actions; changing package metadata or freezing docs does not perform them.
8. Verify the header version, docs version, assets and first-run workflows at the deployed address. Follow [deployment](deployment.md). Never overwrite a published documentation snapshot; corrections belong to the next release.
