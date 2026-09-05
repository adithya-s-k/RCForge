# Deploying RCForge

The intended production URL is **https://rcforge.adithyask.com**. The application includes that canonical URL and a project link; DNS and hosting must still be configured by the site owner. No deployment is performed by building locally.

## Build a static site

Use a supported Node version from `package.json` and a reviewed release commit:

```sh
npm ci
npm run check
npm run docs:check
npm run format:check
```

The check command builds `dist/`. Upload **the contents of `dist/`** to any static host, at the site's root. Include its aircraft/scenery assets and bundled fonts. No API key, backend process, AI service or build-time environment variable is needed. Do not upload the repository or `node_modules`.

For a local production-build check:

```sh
npm run preview
```

Use the URL it prints. Client navigation uses hash routes (`/#/fly`, `/#/aircraft`, `/#/controllers`, `/#/experiments`); no server-side route rewrites are needed. The default build assumes the site root, not a subdirectory.

## Connect the domain

1. Add `rcforge.adithyask.com` as a custom domain in your chosen host.
2. At your DNS provider, add the CNAME or A/AAAA record **provided by that host**. The repository does not prescribe an IP address.
3. Enable HTTPS and redirect HTTP to HTTPS. HTTPS is needed for browser APIs such as the optional Web Serial bridge; support still varies by browser.
4. Deploy atomically if the host supports it. Avoid mixing an old HTML entry point with missing new assets.
5. Serve `index.html` with revalidation/no long-lived cache. Vite's content-hashed `/assets/` files can use a long immutable cache. Public scenery and brand paths are not all hashed: use short caching or purge them when updated.

A restrictive Permissions Policy should allow `gamepad` and, where supported, `serial` for this origin. Hardware access remains user-initiated. Running inside another site's iframe may require explicit permission from the embedding page.

## Verify before announcing a release

- Open a fresh browser profile at the HTTPS address. Check the version badge and GitHub link.
- Start, pause and reset the Bronco; switch to Tiny Trainer. Check Pilot, Chase and FPV after mounting a camera.
- Edit and apply an aircraft, save a named version, reload and restore it from History.
- Export and import an aircraft history file. Verify the aircraft and versions before discarding a backup.
- Open Controllers with no device, then test available hardware. Do not claim transmitter/Arduino validation without that hardware.
- Check direct hash links, a narrow layout, loaded scenery and browser errors.

Localhost storage does not migrate to the domain automatically. Share the [history migration steps](versioning.md#move-from-localhost-to-the-hosted-workbench) when announcing the hosted site. Keep the previous deployment available for rollback; an older build may reject newer file formats, so retain exported backups before rolling back.
