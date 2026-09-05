import type { SiteFile } from "./build.ts";

/** Check the actual emitted pages, including cross-page fragments and downloads. */
export function validateDocs(files: Map<string, SiteFile>) {
  const html = [...files].filter(([path]) => path.endsWith(".html"));
  const anchors = new Map(
    html.map(([path, { data }]) => [
      path,
      new Set(
        [...data.toString().matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]),
      ),
    ]),
  );
  let links = 0;
  for (const [path, { data }] of html) {
    const text = data.toString();
    if (
      [...text.matchAll(/<script[^>]*src="([^"]+)"/g)].some(
        (m) => !["/docs/assets/docs.js", "/theme.js"].includes(m[1]),
      )
    )
      throw Error(`${path}: unexpected documentation runtime`);
    for (const match of text.matchAll(/(?:href|src)="([^"\s]+)"/g)) {
      const href = match[1].replaceAll("&amp;", "&");
      if (!href.startsWith("/docs/") && !href.startsWith("#")) continue;
      const [url, hash] = href.split("#");
      const target = url ? decodeURIComponent(url) : path;
      const key = target.endsWith("/") ? target + "index.html" : target;
      if (!files.has(key))
        throw Error(`${path}: broken generated link ${href}`);
      if (
        hash &&
        anchors.has(key) &&
        !anchors.get(key)!.has(decodeURIComponent(hash))
      )
        throw Error(`${path}: missing generated heading ${href}`);
      links++;
    }
  }
  if (
    [...files.keys()].some((p) => p.includes("/local/") || p.endsWith(".pdf"))
  )
    throw Error("Private source plans must not ship in the public site");
  return { pages: html.length, links };
}
