import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import {
  verifyPlan,
  cachedPlan,
  fetchPlan,
  readReferences,
  referenceSchema,
} from "../references/library";

const data = Buffer.from("%PDF-1.7\nTest plan fixture\n");
const reviewed = readReferences(process.cwd()).plans[0];
const plan = {
  ...reviewed,
  file: "test.pdf",
  bytes: data.length,
  sha256: createHash("sha256").update(data).digest("hex"),
};
let root: string;
beforeEach(() => (root = mkdtempSync(join(tmpdir(), "rcforge-plans-"))));
afterEach(() => rmSync(root, { recursive: true, force: true }));
describe("verified local plan cache", () => {
  it("rejects malformed references and duplicate identities", () => {
    expect(
      referenceSchema.safeParse({ schemaVersion: 1, plans: [plan, plan] })
        .success,
    ).toBe(false);
    for (const edit of [
      { file: "../test.pdf" },
      { url: "http://example.com/plan.pdf" },
      { sha256: "x" },
      { bytes: 26_000_000 },
    ])
      expect(
        referenceSchema.safeParse({
          schemaVersion: 1,
          plans: [{ ...plan, ...edit }],
        }).success,
      ).toBe(false);
  });
  it("requires matching PDF magic, byte count and digest", () => {
    expect(() => verifyPlan(plan, data)).not.toThrow();
    expect(() => verifyPlan(plan, Buffer.from("not a PDF"))).toThrow(
      "source bytes",
    );
    const tampered = Buffer.from(data);
    tampered[tampered.length - 1] = 33;
    expect(() => verifyPlan(plan, tampered)).toThrow("source bytes");
  });
  it("downloads a reviewed source once and reuses verified bytes without network", async () => {
    const network = vi.fn<typeof fetch>().mockResolvedValue(new Response(data));
    expect(await fetchPlan(root, plan, network)).toBe("downloaded");
    expect(cachedPlan(root, plan)).toEqual(data);
    expect(await fetchPlan(root, plan, network)).toBe("cached");
    expect(network).toHaveBeenCalledTimes(1);
    expect(network.mock.calls[0][1]?.redirect).toBe("error");
    expect(network.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
  });
  it("leaves corrupted local copies untouched and does not silently replace them", async () => {
    mkdirSync(join(root, "references/local"), { recursive: true });
    writeFileSync(join(root, "references/local/test.pdf"), "Corrupt");
    const network = vi.fn<typeof fetch>();
    await expect(fetchPlan(root, plan, network)).rejects.toThrow(
      "source bytes",
    );
    expect(() => cachedPlan(root, plan)).toThrow("source bytes");
    expect(network).not.toHaveBeenCalled();
  });
  it("rejects oversized, changed and failed responses without creating a PDF", async () => {
    for (const response of [
      new Response(Buffer.concat([data, data])),
      new Response(Buffer.alloc(data.length)),
      new Response(null, { status: 404 }),
    ]) {
      await expect(
        fetchPlan(
          root,
          plan,
          vi.fn<typeof fetch>().mockResolvedValue(response),
        ),
      ).rejects.toThrow();
      expect(existsSync(join(root, "references/local/test.pdf"))).toBe(false);
    }
    expect(cachedPlan(root, plan)).toBeUndefined();
  });
});
