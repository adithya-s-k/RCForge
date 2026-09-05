/** Validate local Markdown/HTML links and documented npm scripts without fetching external sites. */
import { readFileSync, existsSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, resolve, relative } from "node:path";

const root = process.cwd();
const files = [
  ...new Set(
    execFileSync(
      "git",
      ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
      { encoding: "utf8" },
    ).split("\0"),
  ),
].filter(
  (path) =>
    path.endsWith(".md") &&
    !path.startsWith("docs/versions/") &&
    existsSync(path),
);
const scripts = JSON.parse(readFileSync("package.json", "utf8")).scripts;
const errors: string[] = [];
let checked = 0;
const cache = new Map<string, Set<string>>();
function anchors(path: string) {
  if (cache.has(path)) return cache.get(path)!;
  const result = new Set<string>(),
    occurrences = new Map<string, number>();
  const text = readFileSync(path, "utf8").replace(
    /^\s*```[^\n]*\n[\s\S]*?^\s*```\s*$/gm,
    "",
  );
  for (const match of text.matchAll(/^#{1,6}\s+(.+?)\s*#*$/gm)) {
    const slug = match[1]
      .toLowerCase()
      .replace(/<[^>]*>/g, "")
      .replace(/[^\p{L}\p{N}\s_-]/gu, "")
      .replace(/\s/g, "-");
    const count = occurrences.get(slug) ?? 0;
    result.add(slug + (count ? `-${count}` : ""));
    occurrences.set(slug, count + 1);
  }
  for (const match of text.matchAll(/\b(?:id|name)=["']([^"']+)["']/g))
    result.add(match[1]);
  cache.set(path, result);
  return result;
}
for (const file of files) {
  const original = readFileSync(file, "utf8");
  for (const match of original.matchAll(/\bnpm run ([\w:-]+)/g)) {
    if (!Object.hasOwn(scripts, match[1]))
      errors.push(`${file}: unknown npm script ${match[1]}`);
  }
  const text = original.replace(/^\s*```[^\n]*\n[\s\S]*?^\s*```\s*$/gm, "");
  const links = [
    ...text.matchAll(/\[[^\]\n]*\]\(<?([^\s)>]+)>?(?:\s+"[^"]*")?\)/g),
    ...text.matchAll(/\b(?:href|src)=["']([^"']+)["']/g),
  ];
  for (const match of links) {
    const link = match[1];
    if (/^(?:[a-z][\w+.-]*:|\/\/)/i.test(link)) continue;
    const [url, hash] = link.split("#");
    let path: string;
    try {
      path = url
        ? resolve(dirname(file), decodeURIComponent(url.split("?")[0]))
        : resolve(file);
    } catch {
      errors.push(`${file}: invalid URL ${link}`);
      continue;
    }
    checked++;
    if (!existsSync(path)) {
      errors.push(`${file}: missing target ${link}`);
      continue;
    }
    if (relative(root, path).startsWith("..")) {
      errors.push(`${file}: link leaves repository ${link}`);
      continue;
    }
    if (
      hash &&
      statSync(path).isFile() &&
      path.endsWith(".md") &&
      !anchors(path).has(decodeURIComponent(hash))
    ) {
      errors.push(`${file}: missing heading ${link}`);
    }
  }
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else
  console.log(
    `${files.length} Markdown files checked; ${checked} local links and documented npm scripts resolve.`,
  );
