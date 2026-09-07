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

## Optional hosted integration

The MIT standalone build remains unrestricted and has no authentication or
analytics service. An embedding application can call `configureHost` from
`src/app/host.ts` before importing `src/main.ts`. It supplies capability checks
for aircraft, workspaces and input devices, plus its own account UI. Call
`notifyHostAccessChange` when authenticated access changes. The workbench pauses,
clears held controls and applies the new policy without automatically resuming.

The host receives `prepareToLeave` to pause and checkpoint a pending aircraft
draft before an account redirect. If validation or storage fails, it returns
false and the host must cancel navigation. `open` returns a signed-in visitor to
the requested workspace, aircraft or device setup; hardware permission still
requires an explicit connection action.

Restrictions in browser code are presentation policy, not a security boundary.
Authorize private APIs and cloud data on the server. Keep OAuth secrets out of
bundles. A separate hosted build can include account/analytics integrations;
community builds must not contact those services or require their credentials.

## Search and link previews

The build emits a root `sitemap.xml`, `robots.txt`, canonical URLs, page-specific descriptions, Open Graph/Twitter cards and JSON-LD for the simulator and documentation. The preview artwork lives in `public/brand/rcforge-social.svg` with its 1200 × 630 PNG counterpart. Keep both in sync when changing it.

`site/seo.ts` owns the metadata and describes RCForge as free, open source and customizable. Do not add unmeasured fidelity claims, invented reviews or ratings. Aircraft plans are references for authoring definitions, not automatic imports of complete flight models.

The canonical domain is set in `site/config.ts`. Canonical documentation URLs omit the trailing slash to match the hosted site's redirects. Self-hosters who want their own indexed site should change that domain and the root fallback links/artwork as appropriate. Keep deployment previews out of search using your host's `X-Robots-Tag: noindex` headers; OAuth callbacks must also be noindex. Do not block JavaScript or stylesheets in robots.txt.

After deploying, check the canonical URL, social PNG and sitemap over HTTPS. Submit `/sitemap.xml` in Google Search Console for the verified domain. A valid sitemap helps discovery; it does not guarantee indexing or ranking. Hash-based simulator views share the root canonical; guides have separate crawlable HTML URLs.

### Verify indexing after launch

1. Open [Google Search Console](https://search.google.com/search-console). Use an existing verified domain property that covers your hostname, or add a URL-prefix property for the exact HTTPS origin. For the official site, that is `https://rcforge.adithyask.com/`.
2. Complete Google's ownership verification. A domain property uses a DNS TXT record at the authoritative DNS provider; for the official site, DNS is managed at Hostinger. Use the actual verification value Google supplies. Do not invent a token or change the site's A/CNAME records for this step.
3. In **Sitemaps**, submit `https://rcforge.adithyask.com/sitemap.xml` (replace the hostname for your own deployment). Check that the submission succeeds and that discovered URLs appear. Keep authentication callbacks, previews and nonexistent pages out of the sitemap.
4. Use **URL inspection** on the homepage, `/docs/next`, `/docs/next/aircraft-editor` and `/docs/next/radio-setup`. Inspect the live URL and rendered HTML. If a page is eligible but not indexed, request indexing once. Repeated requests do not speed up the queue.
5. Check **Page indexing** for exclusions and **Performance → Search results** for impressions, queries, clicks and pages. Track terms such as `free RC flight simulator`, `open source RC flight simulator`, `browser RC simulator` and `RC transmitter simulator`. Vercel visitor analytics does not establish whether Google has indexed a page.

Google may take days or weeks to recrawl and process changes; neither submission nor valid markup guarantees a position in search. Public `site:` searches are a useful spot check, but URL inspection is the authoritative place to investigate a specific page's indexing status. Record the date of any search audit instead of treating it as permanent coverage.

### Keep useful content discoverable

The simulator's opening text is replaced when the workbench mounts. Do not rely on that temporary text alone: the docs homepage and guides provide readable, linked static HTML after JavaScript runs as well as before it. Keep their descriptions, headings and visible answers accurate. Link to actual guides for aircraft customization, controller connections and self-hosting; do not create duplicate pages for spelling variants or hide repetitive keywords in the interface.

GitHub's repository description, website field, README heading and relevant topics should describe the same free, open-source RC flight simulator. Explain which hardware has been tested and distinguish the hosted sign-in policy from the unrestricted MIT source. Useful build examples and honest community discussions help people discover the project; promises of measured realism, manufactured reviews and repetitive promotional posts do not belong in the copy.

References: [Google JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics), [URL structure](https://developers.google.com/search/docs/crawling-indexing/url-structure), [search snippets](https://developers.google.com/search/docs/appearance/snippet) and [software application structured data](https://developers.google.com/search/docs/appearance/structured-data/software-app).
