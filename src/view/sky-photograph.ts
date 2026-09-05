import * as T from "three";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";

export const skyTextureSize = { width: 1024, height: 512 };
/** Log RGB preserves cloud highlights in one small RGBA8 texture, without PMREM. */
export function compactSky(data: Float32Array, width: number, height: number) {
  const out = new Uint8Array(skyTextureSize.width * skyTextureSize.height * 4);
  let peak = 0,
    sunX = 0,
    sunY = 0;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4,
        luminance =
          data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722;
      if (luminance > peak) {
        peak = luminance;
        sunX = x;
        sunY = y;
      }
    }
  for (let y = 0; y < skyTextureSize.height; y++)
    for (let x = 0; x < skyTextureSize.width; x++) {
      const i = (y * skyTextureSize.width + x) * 4;
      const x0 = Math.floor((x * width) / skyTextureSize.width),
        x1 = Math.max(
          x0 + 1,
          Math.floor(((x + 1) * width) / skyTextureSize.width),
        );
      const y0 = Math.floor((y * height) / skyTextureSize.height),
        y1 = Math.max(
          y0 + 1,
          Math.floor(((y + 1) * height) / skyTextureSize.height),
        );
      for (let c = 0; c < 3; c++) {
        let sum = 0,
          count = 0;
        for (let yy = y0; yy < Math.min(height, y1); yy++)
          for (let xx = x0; xx < Math.min(width, x1); xx++) {
            sum += data[(yy * width + xx) * 4 + c];
            count++;
          }
        out[i + c] = Math.round(
          (255 * Math.log1p(Math.min(16, Math.max(0, sum / count)))) /
            Math.log(17),
        );
      }
      out[i + 3] = 255;
    }
  // HDR rows start at the zenith; the upload is flipped into UV latitude.
  const longitude = ((sunX + 0.5) / width - 0.5) * Math.PI * 2,
    latitude = (0.5 - (sunY + 0.5) / height) * Math.PI;
  const direction = new T.Vector3(
    Math.cos(latitude) * Math.cos(longitude),
    Math.sin(latitude),
    Math.cos(latitude) * Math.sin(longitude),
  );
  return { data: out, direction };
}
let photograph:
  Promise<{ texture: T.DataTexture; direction: T.Vector3 }> | undefined;
/** One cached asset across all fields. Owned for the lifetime of the renderer module. */
export function skyPhotograph() {
  return (photograph ??= new HDRLoader()
    .setDataType(T.FloatType)
    .loadAsync("/scenery/partly-cloudy-2k.hdr")
    .then((source) => {
      const image = source.image as {
        data: Float32Array;
        width: number;
        height: number;
      };
      const compact = compactSky(image.data, image.width, image.height);
      source.dispose();
      const texture = new T.DataTexture(
        compact.data,
        skyTextureSize.width,
        skyTextureSize.height,
        T.RGBAFormat,
        T.UnsignedByteType,
      );
      texture.wrapS = T.RepeatWrapping;
      texture.flipY = true;
      texture.magFilter = T.LinearFilter;
      texture.minFilter = T.LinearMipmapLinearFilter;
      texture.generateMipmaps = true;
      texture.needsUpdate = true;
      return { texture, direction: compact.direction };
    }));
}
