import { beforeEach, afterEach, describe, expect, it } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
  existsSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { workingDocs, freezeDocs, readSnapshot } from "../site/content";
import { buildDocs } from "../site/build";

let root: string;
const current = workingDocs(process.cwd());
const write = (file: string, data: Buffer | string) => {
  const path = join(root, file);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, data);
};
const git = (...args: string[]) =>
  execFileSync("git", args, { cwd: root, stdio: "pipe" }).toString();
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "rcforge-docs-"));
  for (const [file, data] of current.files) write(file, data);
  write("package.json", JSON.stringify({ version: current.version }));
  for (const f of ["site/docs.css", "site/client.js"])
    write(f, readFileSync(f));
  git("init", "--quiet");
  git("add", ".");
  git(
    "-c",
    "user.name=Test",
    "-c",
    "user.email=test@example.invalid",
    "commit",
    "--quiet",
    "-m",
    "Documentation fixture",
  );
});
afterEach(() => rmSync(root, { recursive: true, force: true }));
describe("documentation release snapshots", () => {
  it("requires the actual package version and committed content", () => {
    expect(() => freezeDocs(root, "../../private")).toThrow("release version");
    expect(() => freezeDocs(root, "99.0.0")).toThrow("package.json");
    write("docs/README.md", "# Dirty");
    expect(() => freezeDocs(root, current.version)).toThrow("Commit");
    expect(existsSync(join(root, "docs/versions", current.version))).toBe(
      false,
    );
  });
  it("preserves the original guide and downloads while development advances", () => {
    freezeDocs(root, current.version);
    const snapshot = readSnapshot(root, current.version);
    expect(snapshot.sourceRef).toBe(git("rev-parse", "HEAD").trim());
    expect(snapshot.files.get("aircraft/ft-bronco.json")).toEqual(
      current.files.get("aircraft/ft-bronco.json"),
    );
    write("docs/README.md", "# A later development guide");
    const files = buildDocs(root);
    const release = files
      .get(`/docs/${current.version}/index.html`)!
      .data.toString();
    expect(release).toContain("archived snapshot");
    expect(release).not.toContain("A later development guide");
    expect(files.get("/docs/next/index.html")!.data.toString()).toContain(
      "A later development guide",
    );
    expect(release).toContain(`value="/docs/${current.version}/" selected`);
    const plans = files
      .get(`/docs/${current.version}/plans/index.html`)!
      .data.toString();
    expect(plans).toContain(
      `/docs/${current.version}/files/aircraft/ft-bronco.json`,
    );
    expect(plans).not.toContain("/docs/local-plans/");
    expect(() => freezeDocs(root, current.version)).toThrow("immutable");
  });
  it("rejects altered frozen content and unsafe snapshot paths", () => {
    const folder = freezeDocs(root, current.version);
    write(
      `docs/versions/${current.version}/files/docs/README.md`,
      "# Tampered",
    );
    expect(() => readSnapshot(root, current.version)).toThrow(
      "Frozen documentation was changed",
    );
    const manifest = JSON.parse(
      readFileSync(join(folder, "manifest.json"), "utf8"),
    );
    manifest.files = { "../private.md": "a".repeat(64) };
    writeFileSync(join(folder, "manifest.json"), JSON.stringify(manifest));
    expect(() => readSnapshot(root, current.version)).toThrow();
    expect(() => readSnapshot(root, "../")).toThrow(
      "Invalid documentation version",
    );
  });
});
