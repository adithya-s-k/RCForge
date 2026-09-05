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
