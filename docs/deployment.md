# Deploying RCForge

The intended production URL is **https://rcforge.adithyask.com**. The application includes that canonical URL and a project link; DNS and hosting must still be configured by the site owner. No deployment is performed by building locally.

## Build a static site

Use a supported Node version from `package.json` and a reviewed release commit:

```sh
npm ci
npm run release:check
```

The check command builds `dist/`. Upload **the contents of `dist/`** to any static host, at the site's root. Include its `docs/` directory, aircraft/scenery assets and bundled fonts. No API key, backend process, AI service or build-time environment variable is needed. Do not upload the repository or `node_modules`.

For a local production-build check:

```sh
npm run preview
```

Use the URL it prints. Simulator navigation uses hash routes (`/#/fly`, `/#/aircraft`, `/#/controllers`, `/#/experiments`). Documentation uses actual directory pages: `/docs/`, `/docs/next/aircraft-authoring/`, and frozen `/docs/X.Y.Z/` versions. Configure the host to serve each directory's `index.html`. Do not rewrite `/docs/*` to the simulator's root `index.html`. Use `/docs/404.html` as the documentation fallback with an HTTP 404 status. The default build assumes the site root, not a subdirectory.

A clean static deployment contains no `references/local/` and no original plan PDFs. Documentation search and permitted aircraft downloads are generated locally; the host does not need a search service or Node process. See [documentation maintenance](documentation.md) to freeze release docs before deployment.

## Connect the domain

1. Add `rcforge.adithyask.com` as a custom domain in your chosen host.
2. At your DNS provider, add the CNAME or A/AAAA record **provided by that host**. The repository does not prescribe an IP address.
3. Enable HTTPS and redirect HTTP to HTTPS. HTTPS is needed for browser APIs such as the optional Web Serial bridge; support still varies by browser.
4. Deploy atomically if the host supports it. Avoid mixing an old HTML entry point with missing new assets.
5. Serve `index.html` with revalidation/no long-lived cache. Vite's content-hashed `/assets/` files can use a long immutable cache. Public scenery, brand and `/docs/assets/` paths are not hashed: use revalidation or purge them when updated. Revalidate documentation HTML and search indexes as well.

A restrictive Permissions Policy should allow `gamepad` and, where supported, `serial` for this origin. Hardware access remains user-initiated. Running inside another site's iframe may require explicit permission from the embedding page.

## Verify before announcing a release

- Open a fresh browser profile at the HTTPS address. Check the version badge and GitHub link.
- Start, pause and reset the Bronco; switch to Tiny Trainer. Check Pilot, Chase and FPV after mounting a camera.
- Edit and apply an aircraft, save a named version, reload and restore it from History.
- Export and import an aircraft history file. Verify the aircraft and versions before discarding a backup.
- Open Controllers with no device, then test available hardware. Do not claim transmitter/Arduino validation without that hardware.
- Check direct hash links, a narrow layout, loaded scenery and browser errors.
- Open `/docs/` and a nested documentation URL directly, then refresh. Try search, a heading link, a copied command and an aircraft JSON download.
- Select the release docs version and check its source commit and compatibility footer. Current `next` documentation must remain labeled development.
- Check missing documentation paths return 404, and local-plan URLs are unavailable in production.

Localhost storage does not migrate to the domain automatically. Share the [history migration steps](versioning.md#move-from-localhost-to-the-hosted-workbench) when announcing the hosted site. Keep the previous deployment available for rollback; an older build may reject newer file formats, so retain exported backups before rolling back.
