import { describe, expect, it } from "vitest";
import { buildDocs } from "../site/build";
import { pages } from "../site/config";
import { docsMetadata, jsonLd, indexMetadata } from "../site/seo";

describe("search and sharing metadata", () => {
  it("emits a sitemap of real pages, excluding aliases and missing pages", () => {
    const files = buildDocs(process.cwd());
    const xml = String(files.get("/sitemap.xml")!.data);
    const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls).toContain("https://rcforge.adithyask.com/");
    for (const url of urls) {
      const path = new URL(url).pathname;
      if (path !== "/") expect(files.has(`${path}/index.html`)).toBe(true);
      expect(url).not.toMatch(/\/docs$|not-found|404|\/auth\/|#|\?/);
    }
    expect(String(files.get("/robots.txt")!.data)).toContain(
      "Sitemap: https://rcforge.adithyask.com/sitemap.xml",
    );
    expect(String(files.get("/docs/404.html")!.data)).toContain(
      'content="noindex, follow"',
    );
  });
  it("gives every guide its own description and matching canonical/social URL", () => {
    const descriptions = new Set<string>();
    for (const page of pages) {
      const html = docsMetadata(page, "next", "0.8.0", false);
      const description = html.match(
        /name="description" content="([^"]+)"/,
      )![1];
      expect(description.length).toBeGreaterThan(70);
      expect(descriptions.has(description)).toBe(false);
      descriptions.add(description);
      const canonical = html.match(/rel="canonical" href="([^"]+)"/)![1];
      expect(html).toContain(`property="og:url" content="${canonical}"`);
      const schema = JSON.parse(
        html.match(/application\/ld\+json">(.*?)<\/script>/)![1],
      );
      expect(schema.url).toBe(canonical);
    }
    expect(indexMetadata()).toContain("Free, Open-Source RC Flight Simulator");
    expect(indexMetadata()).toContain('content="summary_large_image"');
  });
  it("cannot terminate structured-data scripts with an imported title", () => {
    const encoded = jsonLd({ name: '</script><img src=x onerror="alert(1)">' });
    expect(encoded.match(/<\/script>/g)).toHaveLength(1);
    expect(encoded).not.toContain("<img");
  });
});
