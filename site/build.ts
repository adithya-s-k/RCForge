import { balanceWidget } from "./balance-visual";
import { parseAircraft } from "../src/core/schema";
import { themeControl } from "../src/view/theme-control";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { allDocs, type DocsContent } from "./content.ts";
import { CANONICAL, REPOSITORY, type DocPage } from "./config.ts";
import { renderMarkdown, escapeHtml as e, docUrl } from "./markdown.ts";
import { cachedPlan, referenceSchema } from "../references/library.ts";

export type SiteFile = { data: string | Buffer; type: string };
export const fileType = (path: string) =>
  path.endsWith(".png")
    ? "image/png"
    : path.endsWith(".svg")
      ? "image/svg+xml"
      : path.endsWith(".json")
        ? "application/json; charset=utf-8"
        : path.endsWith(".pdf")
          ? "application/pdf"
          : "text/plain; charset=utf-8";
export function buildDocs(root: string, localPlans = false) {
  const files = new Map<string, SiteFile>();
  const versions = allDocs(root);
  const add = (
    path: string,
    data: string | Buffer,
    type = "text/html; charset=utf-8",
  ) => files.set(path, { data, type });
  add(
    "/docs/assets/docs.css",
    readFileSync(join(root, "site/docs.css")),
    "text/css; charset=utf-8",
  );
  add(
    "/docs/assets/docs.js",
    readFileSync(join(root, "site/client.js")),
    "text/javascript; charset=utf-8",
  );
  for (const content of versions) {
    const search = [];
    const downloads = new Set(
      [...content.files.keys()].filter((path) => !path.endsWith(".md")),
    );
    for (const [path, data] of content.files)
      add(`/docs/${content.id}/files/${path}`, data, fileType(path));
    for (const page of content.pages) {
      const rendered = renderMarkdown(
        content.files.get(page.file)!.toString(),
        page,
        content.id,
        content.pages,
        downloads,
        content.sourceRef,
        content.id === "next"
          ? new Map([
              [
                "docs/images/diagram-mass-cg.svg",
                (url: string) =>
                  balanceWidget(
                    parseAircraft(
                      JSON.parse(
                        content.files
                          .get("aircraft/ft-tiny-trainer.json")!
                          .toString(),
                      ),
                    ),
                    url,
                  ),
              ],
            ])
          : undefined,
      );
      const index = content.pages.indexOf(page);
      const path = docUrl(content.id, page.slug);
      const referenceCards =
        page.slug === "plans" ? references(content, root, localPlans) : "";
      const html = layout(
        content,
        page,
        versions,
        rendered.html + referenceCards,
        rendered.headings,
        index,
      );
      add(path + "index.html", html);
      search.push({
        title: page.title,
        group: page.group,
        url: path,
        text: rendered.text,
      });
      if (content.id === "next" && !page.slug) add("/docs/index.html", html);
    }
    add(
      `/docs/${content.id}/search.json`,
      JSON.stringify(search),
      "application/json; charset=utf-8",
    );
  }
  const head = versions[0];
  add(
    "/docs/404.html",
    layout(
      head,
      {
        slug: "not-found",
        title: "Page not found",
        group: "Documentation",
        file: "",
      },
      versions,
      '<h1>Page not found</h1><p>This documentation page or version does not exist.</p><p><a href="/docs/">Browse the documentation</a></p>',
      [],
      -1,
    ),
  );
  return files;
}
function references(content: DocsContent, root: string, local: boolean) {
  const manifest = referenceSchema.parse(
    JSON.parse(content.files.get("references/manifest.json")!.toString()),
  );
  const aircraft = [...content.files]
    .filter(([name]) => name.startsWith("aircraft/") && name.endsWith(".json"))
    .map(
      ([, data]) =>
        JSON.parse(data.toString()) as {
          id: string;
          name: string;
          credit?: { name: string; url: string };
        },
    );
  return `<section class="reference-library" aria-label="Aircraft reference library">${aircraft
    .map((a) => {
      const plan = manifest.plans.find((p) => p.aircraftIds.includes(a.id));
      let available = false;
      if (plan && local && !content.frozen)
        try {
          available = !!cachedPlan(root, plan);
        } catch {
          /* A corrupt PDF is never served as a valid local reference. */
        }
      return `<section class="reference-card" id="${e(a.id)}"><h3>${e(a.name)}</h3><p>Design: ${a.credit ? `<a href="${e(a.credit.url)}" target="_blank" rel="noopener noreferrer">${e(a.credit.name)} ↗</a>` : "Unspecified"}${plan ? `<br>Designer: ${e(plan.creator)} · Drawing: ${e(plan.drawingCredit)}` : ""}</p><div class="reference-actions"><a href="/docs/${content.id}/files/aircraft/${a.id}.json" download>Aircraft JSON ↓</a>${plan ? `<a href="${e(plan.url)}" target="_blank" rel="noopener noreferrer">Original plan PDF ↗</a>${available ? `<a href="/docs/local-plans/${plan.id}.pdf" target="_blank" rel="noopener">Open local plan ↗</a>` : ""}` : ""}</div>${plan ? `<details><summary>Reference identity & rights</summary><p>${e(plan.title)} · retrieved ${e(plan.retrieved)}<br>${(plan.bytes / 1_000_000).toFixed(2)} MB · Redistribution permission not established.</p><p class="reference-digest">SHA-256 <code>${plan.sha256}</code></p></details>` : `<p class="reference-note">${a.id === "vt-simple-trainer" ? "Reference: original kit specifications and build photos. A public plan PDF has not been established." : "RCForge reference assembly; component sources and estimates are recorded in the aircraft JSON."}</p>`}</section>`;
    })
    .join("")}</section>`;
}
function layout(
  content: DocsContent,
  page: DocPage,
  versions: DocsContent[],
  html: string,
  headings: { id: string; text: string; depth: number }[],
  index: number,
) {
  const nav = [...new Set(content.pages.map((p) => p.group))]
    .map((group) => {
      const links = content.pages
        .filter((p) => p.group === group)
        .map(
          (p) =>
            `<a href="${docUrl(content.id, p.slug)}" ${p.slug === page.slug ? 'aria-current="page"' : ""}>${e(p.title)}</a>`,
        )
        .join("");
      return group === "Reference"
        ? `<details class="nav-group" ${page.group === group ? "open" : ""}><summary>Reference</summary>${links}</details>`
        : `<div class="nav-group"><h2>${e(group)}</h2>${links}</div>`;
    })
    .join("");
  const previous = content.pages[index - 1],
    next = content.pages[index + 1];
  const versionLabel = `${content.version}${content.frozen ? "" : " · Development"}`;
  const canonical = docUrl(content.id, page.slug);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${e(page.title)} · RCForge docs</title><meta name="description" content="RCForge ${e(versionLabel)} documentation: ${e(page.title)}"><link rel="canonical" href="${CANONICAL}${canonical}"><link rel="icon" href="/brand/rcforge-mark.svg"><script src="/theme.js"></script><link rel="stylesheet" href="/docs/assets/docs.css"><script src="/docs/assets/docs.js" defer></script></head>
<body data-docs-version="${content.id}"><a class="skip-link" href="#content">Skip to content</a><header class="docs-header"><a class="docs-brand" href="/docs/"><img src="/brand/rcforge-mark.svg" width="32" height="32" alt=""><strong>RC<span>Forge</span></strong><span class="docs-label">Docs</span></a><div class="header-actions">${themeControl()}<button id="open-search" aria-label="Search documentation">Search docs <kbd>/</kbd></button><a class="github" href="${REPOSITORY}" target="_blank" rel="noopener noreferrer">GitHub ↗</a><a class="open-simulator" href="/#/fly">Open simulator ↗</a><button id="menu-toggle" aria-expanded="false" aria-controls="docs-sidebar">Menu</button></div></header>
<div class="docs-layout"><aside id="docs-sidebar"><div class="version-control"><label for="docs-version">Documentation</label><select id="docs-version" aria-label="Documentation version">${versions.map((v) => `<option value="${docUrl(v.id, v.pages.some((p) => p.slug === page.slug) ? page.slug : "")}" ${v.id === content.id ? "selected" : ""}>${e(v.version)}${v.frozen ? "" : " · Development"}</option>`).join("")}</select></div><nav aria-label="Documentation navigation">${nav}</nav><a class="sidebar-footer" href="${docUrl(content.id, "credits")}">Credits & licenses ↗</a></aside>
<main id="content" tabindex="-1"><div class="breadcrumbs"><a href="${docUrl(content.id)}">Docs</a><span>/</span><span>${e(page.group)}</span></div><div class="version-note">${content.frozen ? `Release ${e(content.version)} · archived snapshot` : `${e(content.version)} · Development documentation`}</div><article>${html}</article><nav class="page-navigation" aria-label="Next and previous pages">${previous ? `<a href="${docUrl(content.id, previous.slug)}"><small>Previous</small>← ${e(previous.title)}</a>` : "<span></span>"}${next && index >= 0 ? `<a href="${docUrl(content.id, next.slug)}"><small>Next</small>${e(next.title)} →</a>` : ""}</nav><footer class="page-footer"><span>App ${e(content.version)} · Physics ${e(content.simulation)} · Aircraft format ${content.aircraftFormat}</span>${page.file ? `<a href="${REPOSITORY}/blob/${content.sourceRef}/${page.file}" target="_blank" rel="noopener noreferrer">${content.frozen ? "Source at release" : "Edit on GitHub"} ↗</a>` : ""}</footer></main>
<aside class="page-contents"><nav aria-label="On this page"><h2>On this page</h2>${headings.map((h) => `<a class="depth-${h.depth}" href="#${e(h.id)}">${e(h.text)}</a>`).join("")}</nav><p>RCForge is experimental.<br><a href="${docUrl(content.id, "validation")}">Understand the model limits ↗</a></p></aside></div>
<dialog id="docs-search" aria-labelledby="search-title"><div class="search-heading"><h2 id="search-title">Search documentation</h2><button id="close-search" aria-label="Close search">Esc</button></div><label class="sr-only" for="search-query">Search documentation</label><input id="search-query" type="search" placeholder="Aircraft, calibration, battery…" autocomplete="off"><p id="search-status" role="status">Search within ${e(versionLabel)}.</p><div id="search-results"></div></dialog><dialog id="diagram-viewer" aria-labelledby="diagram-title"><div class="diagram-toolbar"><h2 id="diagram-title">Diagram</h2><div class="diagram-actions"><button id="diagram-smaller" aria-label="Zoom out">−</button><output id="diagram-scale" aria-label="Diagram zoom">100%</output><button id="diagram-larger" aria-label="Zoom in">+</button><button id="diagram-fit">Fit</button><a id="diagram-original" target="_blank" rel="noopener">Open SVG ↗</a><button id="diagram-close" aria-label="Close diagram">Close</button></div></div><div class="diagram-stage" tabindex="0" role="region" aria-label="Diagram; scroll to explore when zoomed"><img id="diagram-image" alt=""></div></dialog><div id="copy-status" class="sr-only" role="status"></div></body></html>`;
}
