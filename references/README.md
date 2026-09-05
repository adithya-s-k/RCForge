# Design reference library

`manifest.json` records the original plan URL, designer, drawing credit, retrieval
date, exact byte count and SHA-256 digest for each reviewed PDF. Each entry names
the aircraft definitions that use it. Individual aircraft keep their source and
uncertainty in `provenance`; the manifest identifies the reference artifact.

```sh
npm run references:fetch
npm run references:check
```

Downloads go to `references/local/`. This folder is ignored by Git, excluded from
the production build, and denied by Vite's general file server. A verified local
copy can be opened from the development docs under **Plans & design credits**.
Public docs link to the creator's original PDF instead. Downloads are optional;
normal development, tests and builds never require a network call for plans.

A changed upstream file or corrupt local copy fails verification. Inspect the
new source before updating its digest; never accept a different plan silently.
To re-download a damaged file, remove that particular local copy first. Do not
overwrite or strip the creator's attribution or copyright marks.

The existing FT sources are publicly downloadable, but no redistribution grant
has been established. They are not MIT-licensed RCForge assets. This local cache
does not grant rights to republish, sell or derive manufacturing kits from them.
Vortex RC's product and build photographs are linked in the docs; no public
downloadable plan was established for that kit, and no substitute PDF is invented.

See [plans and design credits](../docs/plans.md) for the human-readable index,
and [third-party notices](../THIRD_PARTY_NOTICES.md) for the distribution boundary.
