import { expect, it, vi } from "vitest";
import * as T from "three";
import { disposeModel } from "../src/view/dispose-model";

it("releases shared instances within one model only once, including its textures", () => {
  const texture = new T.Texture();
  const material = new T.MeshStandardMaterial({
    map: texture,
    bumpMap: texture,
  });
  const geometry = new T.BoxGeometry();
  const root = new T.Group();
  root.add(
    new T.Mesh(geometry, material),
    new T.Mesh(geometry, [material, material]),
  );
  const disposals = [texture, material, geometry].map((resource) =>
    vi.spyOn(resource, "dispose"),
  );
  disposeModel(root);
  disposals.forEach((dispose) => expect(dispose).toHaveBeenCalledTimes(1));
});

it("retains shared palette materials while releasing the discarded aircraft's geometry", () => {
  const palette = new T.MeshStandardMaterial();
  const owned = new T.MeshBasicMaterial();
  const root = new T.Group();
  const retained = vi.spyOn(palette, "dispose");
  const released = vi.spyOn(owned, "dispose");
  const geometry = new T.BoxGeometry();
  const geometryDispose = vi.spyOn(geometry, "dispose");
  root.add(
    new T.Mesh(geometry, palette),
    new T.Line(new T.BufferGeometry(), owned),
  );
  disposeModel(root, new Set([palette]));
  expect(retained).not.toHaveBeenCalled();
  expect(released).toHaveBeenCalledOnce();
  expect(geometryDispose).toHaveBeenCalledOnce();
});
