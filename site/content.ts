import {
  readFileSync,
  readdirSync,
  existsSync,
  mkdirSync,
  writeFileSync,
  mkdtempSync,
  renameSync,
  rmSync,
} from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { z } from "zod";
import { pages, type DocPage } from "./config.ts";
import { SIM_VERSION, AIRCRAFT_FORMAT_VERSION } from "../src/core/versions.ts";

const safePath = z
  .string()
  .regex(/^[A-Za-z0-9_.\/-]+$/)
  .refine(
    (p) =>
      !p.split("/").includes("..") &&
      !p.startsWith("/") &&
      !p.startsWith("references/local/") &&
      /\.(md|json|png|svg|ino)$/.test(p),
  );
const snapshotSchema = z
  .object({
    formatVersion: z.literal(1),
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    simulation: z.string(),
    aircraftFormat: z.number().int(),
    sourceRef: z.string().regex(/^[a-f0-9]{40}$/),
    createdAt: z.string().datetime(),
    pages: z
      .array(
        z
          .object({
            slug: z.string().regex(/^[a-z0-9-]*$/),
            title: z.string(),
            group: z.string(),
            file: safePath,
          })
          .strict(),
      )
      .max(100),
    files: z.record(safePath, z.string().regex(/^[a-f0-9]{64}$/)),
  })
  .strict();
export type DocsContent = {
  id: string;
  version: string;
  simulation: string;
  aircraftFormat: number;
  sourceRef: string;
  pages: readonly DocPage[];
  files: Map<string, Buffer>;
  frozen: boolean;
};
export const sha256 = (data: Buffer | string) =>
  createHash("sha256").update(data).digest("hex");

export function workingDocs(root: string): DocsContent {
  const version = JSON.parse(
    readFileSync(join(root, "package.json"), "utf8"),
  ).version;
  const names = new Set<string>(pages.map((p) => p.file));
  for (const folder of ["docs/images", "aircraft", "components"])
    for (const name of readdirSync(join(root, folder)))
      if (/\.(png|svg|json)$/.test(name)) names.add(`${folder}/${name}`);
  names.add("hardware/rcforge_bridge/rcforge_bridge.ino");
  names.add("references/manifest.json");
  const files = new Map(
    [...names].map((name) => [name, readFileSync(join(root, name))]),
  );
  return {
    id: "next",
    version,
    simulation: SIM_VERSION,
    aircraftFormat: AIRCRAFT_FORMAT_VERSION,
    sourceRef: "main",
    pages,
    files,
    frozen: false,
  };
}
export function readSnapshot(root: string, id: string): DocsContent {
  if (!/^\d+\.\d+\.\d+$/.test(id)) throw Error("Invalid documentation version");
  const dir = join(root, "docs/versions", id);
  const manifest = snapshotSchema.parse(
    JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8")),
  );
  if (manifest.version !== id)
    throw Error("Documentation version does not match its directory");
  const files = new Map<string, Buffer>();
  for (const [name, hash] of Object.entries(manifest.files)) {
    const data = readFileSync(join(dir, "files", name));
    if (sha256(data) !== hash)
      throw Error(`Frozen documentation was changed: ${id}/${name}`);
    files.set(name, data);
  }
  for (const p of manifest.pages)
    if (!files.has(p.file)) throw Error(`Missing frozen page: ${p.file}`);
  if (new Set(manifest.pages.map((p) => p.slug)).size !== manifest.pages.length)
    throw Error("Duplicate documentation route");
  return {
    id,
    version: id,
    simulation: manifest.simulation,
    aircraftFormat: manifest.aircraftFormat,
    sourceRef: manifest.sourceRef,
    pages: manifest.pages,
    files,
    frozen: true,
  };
}
export function allDocs(root: string) {
  const folder = join(root, "docs/versions");
  const frozen = existsSync(folder)
    ? readdirSync(folder)
        .filter((id) => /^\d+\.\d+\.\d+$/.test(id))
        .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
        .map((id) => readSnapshot(root, id))
    : [];
  return [workingDocs(root), ...frozen];
}
export function freezeDocs(root: string, version: string) {
  if (!/^\d+\.\d+\.\d+$/.test(version))
    throw Error("Use an application release version, for example 0.8.0");
  const content = workingDocs(root);
  if (content.version !== version)
    throw Error("Version must match package.json");
  const destination = join(root, "docs/versions", version);
  if (existsSync(destination))
    throw Error(
      "This documentation version already exists; snapshots are immutable",
    );
  if (
    execFileSync("git", ["status", "--porcelain"], {
      cwd: root,
      encoding: "utf8",
    }).trim()
  )
    throw Error("Commit the release content before freezing documentation");
  const sourceRef = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim();
  const manifest = snapshotSchema.parse({
    formatVersion: 1,
    version,
    simulation: content.simulation,
    aircraftFormat: content.aircraftFormat,
    sourceRef,
    createdAt: new Date().toISOString(),
    pages: content.pages,
    files: Object.fromEntries(
      [...content.files].map(([path, data]) => [path, sha256(data)]),
    ),
  });
  const folder = join(root, "docs/versions");
  mkdirSync(folder, { recursive: true });
  const temporary = mkdtempSync(join(folder, ".freeze-"));
  try {
    for (const [name, data] of content.files) {
      const target = join(temporary, "files", name);
      mkdirSync(join(target, ".."), { recursive: true });
      writeFileSync(target, data);
    }
    writeFileSync(
      join(temporary, "manifest.json"),
      JSON.stringify(manifest, null, 2) + "\n",
    );
    renameSync(temporary, destination);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
  return destination;
}
