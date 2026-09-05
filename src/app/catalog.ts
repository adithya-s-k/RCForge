import { hostAllows, requireHostAccess } from "./host";
import * as T from "three";
import { buildAircraft, disposeAircraft } from "../view/model";
import { massProperties } from "../core/aircraft";
import type { Aircraft } from "../core/schema";
import { $, escape } from "./dom";

/** One temporary renderer produces previews of the actual simulator geometry. */
function previews(models: Aircraft[]) {
  const images = new Map<string, string>();
  const renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(640, 360);
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  const scene = new T.Scene();
  scene.add(new T.HemisphereLight(0xe5f3ff, 0x566071, 3));
  const light = new T.DirectionalLight(0xffffff, 4);
  light.position.set(2, 5, 3);
  scene.add(light);
  const camera = new T.PerspectiveCamera(35, 640 / 360, 0.01, 100);
  try {
    for (const a of models) {
      const visual = buildAircraft(a);
      visual.cg.visible = false;
      const model = visual.group;
      model.rotation.x = Math.PI / 2;
      scene.add(model);
      const bounds = new T.Box3().setFromObject(model);
      const center = bounds.getCenter(new T.Vector3());
      const size = bounds.getSize(new T.Vector3());
      const distance = Math.max(size.x, size.y, size.z) * 2.1;
      camera.position
        .copy(center)
        .add(new T.Vector3(1, 0.7, 1).normalize().multiplyScalar(distance));
      camera.lookAt(center);
      renderer.render(scene, camera);
      images.set(a.id, renderer.domElement.toDataURL("image/png"));
      scene.remove(model);
      disposeAircraft(model);
    }
  } finally {
    renderer.dispose();
    renderer.forceContextLoss();
  }
  return images;
}

export function setupCatalog(
  getModels: () => Aircraft[],
  current: () => string,
  beforeOpen: () => void,
  select: (a: Aircraft) => void,
) {
  const dialog = $<HTMLDialogElement>("aircraft-catalog");
  let cache = new Map<string, string>();
  let signature = "";
  let target = "flight";
  const render = () => {
    const models = getModels();
    const query = $<HTMLInputElement>("catalog-search")
      .value.toLowerCase()
      .trim();
    const kind = $<HTMLSelectElement>("catalog-kind").value;
    const matches = models.filter(
      (a) =>
        a.name.toLowerCase().includes(query) &&
        (kind === "all" ||
          (a.vtol
            ? "vtol"
            : a.vehicleType === "multirotor"
              ? "quad"
              : "wing") === kind),
    );
    $("catalog-clear").hidden = !query && kind === "all";
    $("catalog-count").textContent = `${matches.length} aircraft`;
    $("catalog-grid").innerHTML =
      matches
        .map((a) => {
          const quad = a.vehicleType === "multirotor";
          return `<button class="catalog-card" data-catalog-id="${escape(a.id)}" aria-label="Select ${escape(a.name)}" aria-pressed="${a.id === current()}"><div class="catalog-preview">${cache.has(a.id) ? `<img src="${cache.get(a.id)}" alt="${escape(a.name)} 3D model"/>` : "<span>Preview unavailable</span>"}<span class="catalog-type">${a.vtol ? "TILTROTOR VTOL" : quad ? "MULTIROTOR" : "FIXED WING"}</span>${a.id === current() ? '<span class="catalog-current">Selected</span>' : ""}</div><div class="catalog-info"><h3>${escape(a.name)}</h3><div class="catalog-specs"><span><b>${(a.reference.spanM * 1000).toFixed(0)} mm</b>${quad ? "Motor diagonal" : "Wingspan"}</span><span><b>${(massProperties(a).mass * 1000).toFixed(0)} g</b>Model mass</span><span><b>${a.motors.length}</b>Motors</span></div><div class="catalog-choose">${!hostAllows({ kind: "aircraft", id: a.id }) ? "Sign in to fly" : target === "editor" ? "Open in editor" : "Use for flight"}<span>→</span></div></div></button>`;
        })
        .join("") ||
      '<div class="catalog-empty"><h3>No matching aircraft</h3><p>Try a different search or clear the filters above.</p></div>';
    $("catalog-grid").scrollTop = 0;
    $("catalog-grid")
      .querySelectorAll<HTMLButtonElement>("[data-catalog-id]")
      .forEach(
        (button) =>
          (button.onclick = () => {
            const a = models.find((m) => m.id === button.dataset.catalogId)!;
            dialog.close();
            if (!requireHostAccess({ kind: "aircraft", id: a.id })) return;
            if (a.id !== current()) select(a);
          }),
      );
  };
  document.querySelectorAll<HTMLButtonElement>("[data-open-catalog]").forEach(
    (button) =>
      (button.onclick = () => {
        beforeOpen();
        target = button.dataset.openCatalog!;
        $("catalog-destination").textContent =
          target === "editor"
            ? "Choose an aircraft to edit"
            : "Choose an aircraft to fly";
        $<HTMLInputElement>("catalog-search").value = "";
        $<HTMLSelectElement>("catalog-kind").value = "all";
        const models = getModels();
        const next = JSON.stringify(models);
        if (next !== signature) {
          try {
            cache = previews(models);
            signature = next;
          } catch {
            cache.clear();
          }
        }
        render();
        dialog.showModal();
        $("catalog-search").focus();
        $("catalog-grid").scrollTop = 0;
      }),
  );
  $("catalog-search").oninput = render;
  $("catalog-kind").onchange = render;
  $("catalog-clear").onclick = () => {
    $<HTMLInputElement>("catalog-search").value = "";
    $<HTMLSelectElement>("catalog-kind").value = "all";
    render();
    $("catalog-search").focus();
  };
  // Follow the visible grid, including its one/two/three-column responsive layouts.
  $("catalog-grid").onkeydown = (event) => {
    const cards = [
      ...$("catalog-grid").querySelectorAll<HTMLButtonElement>(".catalog-card"),
    ];
    const index = cards.indexOf(event.target as HTMLButtonElement);
    if (
      index < 0 ||
      ![
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "Home",
        "End",
      ].includes(event.key)
    )
      return;
    event.preventDefault();
    const columns = cards.filter(
      (card) => card.offsetTop === cards[0].offsetTop,
    ).length;
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? cards.length - 1
          : index +
            ({
              ArrowLeft: -1,
              ArrowRight: 1,
              ArrowUp: -columns,
              ArrowDown: columns,
            }[event.key] ?? 0);
    cards[Math.max(0, Math.min(cards.length - 1, next))]?.focus();
  };
  $("catalog-search").onkeydown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      $("catalog-grid")
        .querySelector<HTMLButtonElement>(".catalog-card")
        ?.focus();
    }
  };
  $("close-catalog").onclick = () => dialog.close();
}
