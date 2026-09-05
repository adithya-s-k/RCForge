import { Marked } from "marked";
import { posix } from "node:path";
import type { DocPage } from "./config.ts";
import { REPOSITORY } from "./config.ts";

export const escapeHtml = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export const headingSlug = (text: string) =>
  text
    .toLowerCase()
    .replace(/<[^>]*>/g, "")
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/\s/g, "-");
export const docUrl = (version: string, slug = "") =>
  `/docs/${version}/${slug ? `${slug}/` : ""}`;
export function renderMarkdown(
  source: string,
  page: DocPage,
  version: string,
  pages: readonly DocPage[],
  downloads: Set<string>,
  sourceRef: string,
) {
  const headings: { id: string; text: string; depth: number }[] = [];
  const slugs = new Map<string, number>();
  const link = (href: string, image = false) => {
    if (/^(https?:|mailto:)/i.test(href)) return image ? "" : href;
    if (/^(?:[a-z][\w+.-]*:|\/\/)/i.test(href) || /[\x00-\x1f]/.test(href))
      return "";
    if (href.startsWith("#")) return href;
    const [path, hash] = href.split("#");
    const suffix = hash ? `#${hash}` : "";
    let target: string;
    try {
      target = posix.normalize(
        posix.join(posix.dirname(page.file), decodeURIComponent(path)),
      );
    } catch {
      return "";
    }
    if (target.startsWith("../") || target.startsWith("/")) return "";
    const article = pages.find((p) => p.file === target);
    if (article) return docUrl(version, article.slug) + suffix;
    if (target === "README.md") return docUrl(version);
    if (downloads.has(target))
      return `/docs/${version}/files/${target.split("/").map(encodeURIComponent).join("/")}${suffix}`;
    if (image) return "";
    return `${REPOSITORY}/blob/${sourceRef}/${target.split("/").map(encodeURIComponent).join("/")}${suffix}`;
  };
  const marked = new Marked({
    gfm: true,
    renderer: {
      // Repository Markdown is data here. Never let raw HTML introduce script, iframe or event handlers.
      html({ text }) {
        return /^<\/?(?:details|summary)>\s*$/.test(text.trim()) ? text : "";
      },
      heading({ tokens, depth, text }) {
        const raw = headingSlug(text),
          count = slugs.get(raw) ?? 0;
        slugs.set(raw, count + 1);
        const id = raw + (count ? `-${count}` : "");
        const label = text.replace(/[`*_]/g, "");
        if (depth === 2 || depth === 3)
          headings.push({ id, text: label, depth });
        return `<h${depth} id="${escapeHtml(id)}">${this.parser.parseInline(tokens)}<a class="heading-anchor" href="#${escapeHtml(id)}" aria-label="Link to ${escapeHtml(label)}">#</a></h${depth}>`;
      },
      link({ href, title, tokens }) {
        const url = link(href);
        const label = this.parser.parseInline(tokens);
        return url
          ? `<a href="${escapeHtml(url)}"${title ? ` title="${escapeHtml(title)}"` : ""}${/^https?:/.test(url) ? ' target="_blank" rel="noopener noreferrer"' : ""}>${label}</a>`
          : label;
      },
      image({ href, text }) {
        const url = link(href, true);
        return url
          ? `<span class="doc-figure"><a class="expand-diagram" href="${escapeHtml(url)}" aria-label="Enlarge: ${escapeHtml(text)}"><img src="${escapeHtml(url)}" alt="${escapeHtml(text)}" loading="lazy"/><span class="figure-action">Enlarge diagram ↗</span></a></span>`
          : `<span>${escapeHtml(text)}</span>`;
      },
      code({ text, lang }) {
        if (lang === "agent-prompt") {
          // Placeholder data stays in the versioned Markdown, never in executable HTML.
          const fields = [...text.matchAll(/\{\{([^{}\n]+)\}\}/g)];
          const seen = new Set<string>();
          const controls = fields
            .filter(([token]) => {
              if (seen.has(token)) return false;
              seen.add(token);
              return true;
            })
            .map(([token, spec]) => {
              const [label, ...options] = spec.split("|");
              return `<label><span>${escapeHtml(label)}</span>${options.length ? `<select data-prompt-token="${escapeHtml(token)}"><option value="">Choose…</option>${options.map((o) => `<option>${escapeHtml(o)}</option>`).join("")}</select>` : `<input data-prompt-token="${escapeHtml(token)}" maxlength="160" placeholder="Unknown is OK">`}</label>`;
            })
            .join("");
          return `<div class="code-block agent-prompt"><div class="code-label"><span>AI agent · connection setup</span><button type="button" class="copy-code" aria-label="Copy setup prompt">Copy prompt</button></div><div class="prompt-fields" hidden>${controls}</div><p class="prompt-note">Fill in what you know. This stays in your browser; copy it into your preferred coding agent.</p><details open class="prompt-preview"><summary>Preview prompt</summary><pre><code>${escapeHtml(text)}</code></pre></details><template class="prompt-template">${escapeHtml(text)}</template></div>`;
        }
        return `<div class="code-block"><div class="code-label"><span>${escapeHtml(lang ?? "text")}</span><button type="button" class="copy-code" aria-label="Copy code">Copy</button></div><pre><code>${escapeHtml(text)}</code></pre></div>`;
      },
    },
  });
  // Preserve Marked's GFM table renderer while wrapping it for small screens.
  const renderer = marked.defaults.renderer!;
  // Assigned below through an ordinary bound function to avoid recursive overrides.
  renderer.table = function (token) {
    let head = "",
      body = "";
    for (const cell of token.header) head += this.tablecell(cell);
    for (const row of token.rows)
      body += this.tablerow({
        text: row.map((cell) => this.tablecell(cell)).join(""),
      });
    return `<div class="table-scroll" tabindex="0" role="region" aria-label="Scrollable table"><table><thead>${this.tablerow({ text: head })}</thead><tbody>${body}</tbody></table></div>`;
  };
  const html = marked.parse(source, { async: false });
  return {
    html,
    headings,
    text: source
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/!?\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/[#*`|>]/g, " ")
      .replace(/\s+/g, " "),
  };
}
