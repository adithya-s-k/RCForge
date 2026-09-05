import { describe, expect, it } from "vitest";
import { renderMarkdown } from "../site/markdown";
import { buildDocs } from "../site/build";
import { validateDocs } from "../site/validate";
import { pages } from "../site/config";
import { bundledAircraft } from "../src/app/bundled-aircraft";

const root = process.cwd();
const render = (source: string) =>
  renderMarkdown(
    source,
    {
      slug: "authoring",
      title: "Authoring",
      group: "Build",
      file: "docs/example.md",
    },
    "0.8.0",
    pages,
    new Set([
      "aircraft/ft-bronco.json",
      "docs/images/workbench.png",
      "docs/images/diagram-receiver-ppm.svg",
    ]),
    "a".repeat(40),
  );

describe("documentation renderer", () => {
  it("renders accessible headings, duplicate anchors, GFM tables and escaped commands", () => {
    const { html, headings } = render(
      '# Guide\n\n## CG & mass\n\n## CG & mass\n\n| Component | Mass |\n| --- | --- |\n| Battery | 100 g |\n\n```sh\nprintf "<script>"\n```',
    );
    expect(headings.map((h) => h.id)).toEqual(["cg--mass", "cg--mass-1"]);
    expect(html).toContain("<th>Component</th>");
    expect(html).toContain("<td>100 g</td>");
    expect(html).toContain('aria-label="Scrollable table"');
    expect(html).toContain("printf &quot;&lt;script&gt;&quot;");
  });
  it("keeps article and download links within the selected release, and pins code links", () => {
    const { html } = render(
      "[components](component-models.md#mass) [aircraft](../aircraft/ft-bronco.json) [code](../src/main.ts) [start](../README.md#get-started)",
    );
    expect(html).toContain('href="/docs/0.8.0/component-models/#mass"');
    expect(html).toContain('href="/docs/0.8.0/files/aircraft/ft-bronco.json"');
    expect(html).toContain(`/blob/${"a".repeat(40)}/src/main.ts`);
    expect(html).toContain('href="/docs/0.8.0/"');
  });
  it("blocks raw HTML, executable URLs, outside paths and remote images", () => {
    const { html } = render(
      '<script>alert(1)</script>\n\n<img src="x" onerror="alert(1)">\n\n[bad](javascript:alert%281%29) [data](data:text/html,hi) [escape](../../secret) [protocol](//example.com) ![remote](https://example.com/tracker.png)\n\n[official](https://example.com)',
    );
    expect(html).not.toMatch(
      /<script|onerror|href="(?:javascript|data|\/\/)|<img/,
    );
    expect(html).not.toContain("/secret");
    expect(html).toContain('rel="noopener noreferrer"');
  });
  it("escapes imported labels and only embeds approved local images", () => {
    const { html } = render(
      "![Workbench](images/workbench.png) ![secret](../private.svg)\n\n```html\n</code><img src=x onerror=alert(1)>\n```",
    );
    expect(html).toContain('src="/docs/0.8.0/files/docs/images/workbench.png"');
    expect(html.match(/<img/g)).toHaveLength(1);
    expect(html).toContain("&lt;/code&gt;");
  });
  it("keeps enlarged diagrams on the selected documentation version", () => {
    const { html } = render("![PPM & ground](images/diagram-receiver-ppm.svg)");
    expect(html).toContain(
      'href="/docs/0.8.0/files/docs/images/diagram-receiver-ppm.svg"',
    );
    expect(html).toContain('aria-label="Enlarge: PPM &amp; ground"');
    expect(html).toContain('class="expand-diagram"');
    expect(html).not.toContain("<svg");
  });
  it("renders prompt fields as inert data, preserving copyable text without JavaScript", () => {
    const { html } = render(
      "```agent-prompt\nBoard: {{Board|Uno|Nano}}\nReceiver: {{Receiver}}\nAgain: {{Receiver}}\nNever run <script>alert(1)</script>\n```",
    );
    expect(html).toContain('aria-label="Copy setup prompt"');
    expect(html.match(/<select /g)).toHaveLength(1);
    expect(html.match(/<input /g)).toHaveLength(1);
    expect(html).toContain("<option>Uno</option>");
    expect(html).toContain("Board: {{Board|Uno|Nano}}");
    expect(html).toContain('class="prompt-fields" hidden');
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
  });
});

describe("same-site documentation artifact", () => {
  const files = buildDocs(root);
  it("renders every selected guide and public reference with no simulator bundle", () => {
    for (const page of pages) {
      const html = files
        .get(`/docs/next/${page.slug ? `${page.slug}/` : ""}index.html`)!
        .data.toString();
      expect(html).toContain('<main id="content"');
      expect(html).toContain("Development documentation");
      expect(html.match(/<script[^>]*src="([^"]+)"/g)).toEqual([
        '<script src="/theme.js"',
        '<script src="/docs/assets/docs.js"',
      ]);
    }
    const planPage = files.get("/docs/next/plans/index.html")!.data.toString();
    for (const a of bundledAircraft) {
      expect(planPage).toContain(a.credit!.url.replaceAll("&", "&amp;"));
      expect(planPage).toContain(`/files/aircraft/${a.id}.json`);
    }
    expect(files.has("/docs/index.html")).toBe(true);
    expect(files.has("/docs/404.html")).toBe(true);
    expect(
      [...files.keys()].some(
        (p) => p.includes("/local/") || p.endsWith(".pdf"),
      ),
    ).toBe(false);
    expect(planPage).not.toContain("/docs/local-plans/");
  });
  it("checks every generated destination and rejects broken anchors or private output", () => {
    expect(validateDocs(files).links).toBeGreaterThan(1000);
    const broken = new Map(files);
    broken.set("/docs/next/test/index.html", {
      type: "text/html",
      data: '<a href="/docs/next/#missing-section">broken</a>',
    });
    expect(() => validateDocs(broken)).toThrow("missing generated heading");
    broken.delete("/docs/next/test/index.html");
    broken.set("/docs/leak.pdf", { type: "application/pdf", data: "%PDF-" });
    expect(() => validateDocs(broken)).toThrow("Private source plans");
  });
  it("indexes the selected version and publishes parseable aircraft downloads", () => {
    const index = JSON.parse(
      files.get("/docs/next/search.json")!.data.toString(),
    ) as { url: string; text: string }[];
    expect(index).toHaveLength(pages.length);
    expect(index.every((p) => p.url.startsWith("/docs/next/"))).toBe(true);
    expect(index.some((p) => p.text.includes("battery"))).toBe(true);
    for (const a of bundledAircraft) {
      const download = JSON.parse(
        files.get(`/docs/next/files/aircraft/${a.id}.json`)!.data.toString(),
      );
      expect(download.id).toBe(a.id);
    }
  });
});
