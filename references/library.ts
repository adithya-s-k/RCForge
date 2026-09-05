import { readFile, mkdir, writeFile, rename, rm } from "node:fs/promises";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { z } from "zod";

const https = z
  .string()
  .url()
  .refine((url) => url.startsWith("https://"));
export const referenceSchema = z
  .object({
    schemaVersion: z.literal(1),
    plans: z
      .array(
        z
          .object({
            id: z.string().regex(/^[a-z0-9-]+$/),
            title: z.string().min(1),
            aircraftIds: z.array(z.string().regex(/^[a-z0-9-]+$/)).min(1),
            creator: z.string().min(1),
            drawingCredit: z.string().min(1),
            url: https,
            file: z.string().regex(/^[a-z0-9-]+\.pdf$/),
            sha256: z.string().regex(/^[a-f0-9]{64}$/),
            bytes: z.number().int().positive().max(25_000_000),
            retrieved: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
            redistribution: z.literal("not-established"),
            rightsUrl: https,
          })
          .strict(),
      )
      .max(100),
  })
  .strict()
  .refine(
    (m) =>
      new Set(m.plans.map((p) => p.id)).size === m.plans.length &&
      new Set(m.plans.map((p) => p.file)).size === m.plans.length,
    "Reference IDs and filenames must be unique",
  );
export type PlanReference = z.infer<typeof referenceSchema>["plans"][number];
export function readReferences(root: string) {
  return referenceSchema.parse(
    JSON.parse(readFileSync(join(root, "references/manifest.json"), "utf8")),
  );
}
export function verifyPlan(plan: PlanReference, data: Uint8Array) {
  if (
    Buffer.from(data.slice(0, 5)).toString() !== "%PDF-" ||
    data.length !== plan.bytes ||
    createHash("sha256").update(data).digest("hex") !== plan.sha256
  )
    throw Error(
      `${plan.id}: source bytes differ from the reviewed PDF; inspect upstream changes before updating the manifest`,
    );
}
export function cachedPlan(
  root: string,
  plan: PlanReference,
): Buffer | undefined {
  const path = join(root, "references/local", plan.file);
  if (!existsSync(path)) return;
  const data = readFileSync(path);
  verifyPlan(plan, data);
  return data;
}
export async function fetchPlan(
  root: string,
  plan: PlanReference,
  fetcher: typeof fetch = fetch,
) {
  const path = join(root, "references/local", plan.file);
  try {
    const data = await readFile(path);
    verifyPlan(plan, data);
    return "cached";
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const response = await fetcher(plan.url, {
    signal: AbortSignal.timeout(45_000),
    redirect: "error",
  });
  if (!response.ok || !response.body)
    throw Error(`${plan.id}: download failed (${response.status})`);
  const reader = response.body.getReader(),
    chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > plan.bytes) {
      await reader.cancel();
      throw Error(`${plan.id}: source exceeds expected size`);
    }
    chunks.push(value);
  }
  const data = Buffer.concat(chunks);
  verifyPlan(plan, data);
  await mkdir(join(root, "references/local"), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, data, { flag: "wx" });
  try {
    await rename(temporary, path);
  } finally {
    await rm(temporary, { force: true });
  }
  return "downloaded";
}
