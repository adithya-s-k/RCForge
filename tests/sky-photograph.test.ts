import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import * as T from "three";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import { compactSky, skyTextureSize } from "../src/view/sky-photograph";
it("compacts the shipped HDR into the shared sky budget with its sun above the horizon", () => {
  const file = readFileSync(
    new URL("../public/scenery/partly-cloudy-2k.hdr", import.meta.url),
  );
  const parsed = new HDRLoader()
    .setDataType(T.FloatType)
    .parse(
      file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength),
    );
  if (!parsed.width || !parsed.height)
    throw new Error("Missing HDR dimensions");
  const sky = compactSky(
    parsed.data as Float32Array,
    parsed.width,
    parsed.height,
  );
  expect(sky.data.byteLength).toBe(1024 * 512 * 4);
  expect(skyTextureSize).toEqual({ width: 1024, height: 512 });
  expect(sky.direction.length()).toBeCloseTo(1);
  expect(sky.direction.y).toBeGreaterThan(0);
  expect(sky.data.every(Number.isFinite)).toBe(true);
});
