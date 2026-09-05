# Maintain the documentation

The website and repository use the same Markdown. `site/config.ts` defines the
navigation and URL for each selected document. Vite renders it into static HTML
at `/docs/`; no documentation framework, browser Markdown parser or Three.js
runtime is loaded there. Marked is a build-only dependency.

## Edit a guide

1. Edit its existing Markdown file. Keep one source of truth rather than copying a guide into a website directory.
2. Run `npm run dev` and open `/docs/` on the printed address. Refresh the page after a Markdown change.
3. Add a new public guide to `site/config.ts`, with a unique slug, title and group.
4. Check desktop and narrow layouts, code examples, local links and search.
5. Run the documentation and formatting checks before committing.

```sh
npm run docs:check
npm run format
npm run format:check
```

Use relative Markdown links so GitHub and local editors can navigate them. The
site rewrites registered pages to the selected docs version, publishes approved
downloads under that version, and sends other code references to GitHub. Tables
scroll on narrow screens. Code blocks have a copy button. Raw HTML is not a way to
add scripts or embeds. Remote image embeds are not published by the docs renderer.

## Diagrams and setup prompts

Original SVG drawings live in `docs/images/diagram-*.svg`. Edit their source in
`site/diagrams.ts`, then regenerate them:

```sh
npm run docs:diagrams
npm run docs:check
```

Controller drawings and button names reuse the simulator's existing SVG helpers.
The wiring diagrams describe logical connections, not physical connector faces;
check the firmware and manufacturer references when changing pin assignments.
`docs:check` rejects stale generated diagrams. View each affected drawing at normal
and enlarged sizes, including narrow screens. Local images get an enlarged viewer
with zoom and an ordinary source link as a fallback. Most diagrams are external images and ship inside each documentation snapshot.
The registered balance illustration has a trusted, generated inline SVG enhancement
in development docs; arbitrary Markdown still cannot introduce inline SVG or scripts.

An `agent-prompt` code fence adds a copyable setup form. Fields use
`{{Field label}}` for text or `{{Field label|Option one|Option two}}` for a choice.
Keep all technical instructions in the Markdown template so frozen releases retain
their own setup guidance. Unknown fields remain explicitly unspecified; prompts
must ask the user to verify hardware instead of guessing pinouts. Form values stay
in the page and are neither stored nor sent to an AI service. Without JavaScript,
the source prompt remains readable with its placeholders.

## Documentation versions

`/docs/` is the entry point; `/docs/next/` contains current **development** docs.
The label uses `package.json`, while physics and aircraft format numbers come from
their own source constants. A development version is not presented as a release.

Maintainers freeze a documentation snapshot only when preparing a release:

```sh
npm run docs:freeze -- 0.8.0
```

The requested version must match `package.json` and the working tree must be clean.
The command writes `docs/versions/0.8.0/` with the selected Markdown, permitted
images/downloads, original source commit, compatibility numbers and file hashes.
It does not tag or publish a release. Commit the snapshot, run `npm run release:check`,
then follow the [release workflow](versioning.md#maintainer-release-workflow).

The build verifies snapshot hashes and refuses altered files. A frozen version
cannot be overwritten. Its URL is `/docs/0.8.0/`, and it appears in the version
selector. Links, search and aircraft downloads remain within that version.
Corrections go into the next release; don't rewrite a published snapshot.

No older release snapshots have been invented for this initial documentation site.
The dropdown gains release entries as maintainers create them.

## Project structure

| Path                          | Responsibility                                                                             |
| ----------------------------- | ------------------------------------------------------------------------------------------ |
| `docs/`                       | Current user, contributor and engineering guides                                           |
| `docs/archive/`               | Historical review/session evidence, outside the public navigation                          |
| `docs/versions/`              | Immutable release snapshots, created explicitly by maintainers                             |
| `site/`                       | Build-time Markdown rendering, templates, static styles and small progressive enhancements |
| `references/`                 | Reviewed source manifest, local download/verification helpers and rights notes             |
| `references/local/`           | Optional personal source PDFs; never committed or deployed                                 |
| `src/app/bundled-aircraft.ts` | One explicit browser aircraft registry                                                     |

Run `npm run build` to produce the simulator and docs in a single `dist/`.
`npm run preview` checks the production output. See [hosting](deployment.md) for
directory URLs, caching and the release acceptance checks.

## Theme and interactive illustrations

The header sun/moon button switches between dark and light views. The choice stays in this browser and is shared with the simulator. It changes editor studio lighting and UI colors, without changing scenery or physics.

The balance guide uses `site/balance-visual.ts` to project the FT Tiny Trainer definition into SVG. The development docs add a keyboard-accessible battery slider using `site/client.js`; calculations use the part mass / assembled mass ratio. The static SVG remains available in Markdown, downloads and without JavaScript. Frozen documentation keeps its own saved illustration and aircraft data. Run `npm run docs:diagrams` after changes to the source drawing or preset, then `npm run docs:check`.

Every generated diagram has a matching `-light.svg` asset. `site/diagram-theme.ts` adjusts the documentation palette while preserving hardware colors and all labels. The selected theme controls inline previews, enlarged views and SVG download links. The build only offers a variant when it exists in that documentation version; frozen assets are never recolored or replaced. Run `npm run docs:diagrams` to regenerate both palettes.
