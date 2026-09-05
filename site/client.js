// Progressive enhancement only: reading and navigation work without JavaScript.
const dialog = document.querySelector("#docs-search");
const query = document.querySelector("#search-query");
const status = document.querySelector("#search-status");
const results = document.querySelector("#search-results");
let index;
let loading;
let searchRevision = 0;
const searchable = (text) =>
  text.toLowerCase().replace(/\b(\w{3,})ies\b/g, "$1y");
const openSearch = () => {
  dialog.showModal();
  query.focus();
};
document.querySelector("#open-search").addEventListener("click", openSearch);
document
  .querySelector("#close-search")
  .addEventListener("click", () => dialog.close());
document.addEventListener("keydown", (event) => {
  const editing =
    event.target instanceof Element &&
    event.target.closest("input,textarea,select,[contenteditable]");
  if (event.key === "/" && !editing && !event.metaKey && !event.ctrlKey) {
    event.preventDefault();
    openSearch();
  }
});
query.addEventListener("input", async () => {
  const revision = ++searchRevision;
  const terms = searchable(query.value.trim()).split(/\s+/).filter(Boolean);
  results.replaceChildren();
  if (!terms.length) {
    status.textContent = "Type to search this documentation version.";
    return;
  }
  status.textContent = "Searching…";
  try {
    loading ??= fetch(
      `/docs/${document.body.dataset.docsVersion}/search.json`,
    ).then((response) => {
      if (!response.ok) throw Error();
      return response.json();
    });
    index ??= await loading;
    if (revision !== searchRevision) return;
    const matches = index
      .map((page) => ({
        ...page,
        score: terms.reduce(
          (sum, term) =>
            sum +
            (searchable(page.title).includes(term) ? 10 : 0) +
            (searchable(page.text).includes(term) ? 1 : 0),
          0,
        ),
      }))
      .filter((page) =>
        terms.every((term) =>
          searchable(page.title + " " + page.text).includes(term),
        ),
      )
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
    status.textContent = matches.length
      ? `${matches.length} results`
      : "No results. Try a different aircraft, component or control name.";
    for (const page of matches) {
      const a = document.createElement("a");
      a.href = page.url;
      const label = document.createElement("strong");
      label.textContent = page.title;
      const group = document.createElement("small");
      group.textContent = page.group;
      const preview = document.createElement("p");
      const at = Math.max(0, searchable(page.text).indexOf(terms[0]) - 45);
      preview.textContent =
        (at ? "…" : "") + page.text.slice(at, at + 175) + "…";
      a.append(group, label, preview);
      results.append(a);
    }
  } catch {
    loading = undefined;
    if (revision === searchRevision)
      status.textContent =
        "Search could not load. Use the navigation, or try again.";
  }
});
query.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    results.querySelector("a")?.click();
  }
  if (event.key === "ArrowDown") {
    event.preventDefault();
    results.querySelector("a")?.focus();
  }
});
results.addEventListener("keydown", (event) => {
  const links = [...results.querySelectorAll("a")],
    i = links.indexOf(document.activeElement);
  if (event.key === "ArrowDown") {
    event.preventDefault();
    links[Math.min(i + 1, links.length - 1)]?.focus();
  }
  if (event.key === "ArrowUp") {
    event.preventDefault();
    if (i <= 0) query.focus();
    else links[i - 1].focus();
  }
});
document.querySelector("#docs-version").addEventListener("change", (event) => {
  location.href = event.target.value;
});
const menu = document.querySelector("#menu-toggle");
const closeMenu = () => {
  menu.setAttribute("aria-expanded", "false");
  document.body.classList.remove("nav-open");
};
menu.addEventListener("click", () => {
  const open = menu.getAttribute("aria-expanded") !== "true";
  menu.setAttribute("aria-expanded", String(open));
  document.body.classList.toggle("nav-open", open);
});
document.querySelector("#docs-sidebar").addEventListener("click", (event) => {
  if (event.target.closest("a")) closeMenu();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menu.getAttribute("aria-expanded") === "true") {
    closeMenu();
    menu.focus();
  }
});
document.addEventListener("click", (event) => {
  if (
    menu.getAttribute("aria-expanded") === "true" &&
    !event.target.closest("#docs-sidebar, #menu-toggle")
  )
    closeMenu();
});
// Configure copyable prompts without uploading or storing hardware details.
document.querySelectorAll(".agent-prompt").forEach((panel) => {
  const template = panel.querySelector("template").content.textContent;
  const fields = [...panel.querySelectorAll("[data-prompt-token]")];
  const update = () => {
    let prompt = template;
    for (const field of fields) {
      prompt = prompt.replaceAll(
        field.dataset.promptToken,
        () => field.value.trim() || "Not specified — ask me before assuming",
      );
    }
    panel.querySelector("code").textContent = prompt;
  };
  fields.forEach((field) => field.addEventListener("input", update));
  panel.querySelector(".prompt-fields").hidden = false;
  panel.querySelector("details").open = false;
  update();
});
document.querySelectorAll(".copy-code").forEach((button) =>
  button.addEventListener("click", async () => {
    const label = button.closest(".agent-prompt") ? "Copy prompt" : "Copy";
    try {
      await navigator.clipboard.writeText(
        button.closest(".code-block").querySelector("code").textContent,
      );
      button.textContent = "Copied";
      document.querySelector("#copy-status").textContent =
        label === "Copy prompt" ? "Setup prompt copied" : "Code copied";
      setTimeout(() => (button.textContent = label), 1500);
    } catch {
      button.textContent = "Select code to copy";
      const block = button.closest(".code-block");
      block.querySelector("details")?.setAttribute("open", "");
      const pre = block.querySelector("pre");
      pre.tabIndex = 0;
      pre.focus();
      document.querySelector("#copy-status").textContent =
        "Clipboard unavailable. Select the visible text to copy it.";
    }
  }),
);
if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries)
        if (entry.isIntersecting) {
          document
            .querySelectorAll(".page-contents a")
            .forEach((a) =>
              a.classList.toggle("active", a.hash === `#${entry.target.id}`),
            );
        }
    },
    { rootMargin: "-80px 0px -65% 0px" },
  );
  document
    .querySelectorAll("article h2, article h3")
    .forEach((h) => observer.observe(h));
}

// Images remain ordinary versioned links without JavaScript.
const viewer = document.querySelector("#diagram-viewer");
const diagramImage = document.querySelector("#diagram-image");
const stage = viewer.querySelector(".diagram-stage");
let diagramZoom = 1;
let diagramOpener;
const sizeDiagram = () => {
  const ratio = diagramImage.naturalWidth / diagramImage.naturalHeight || 1;
  const fit = Math.min(stage.clientWidth, stage.clientHeight * ratio);
  diagramImage.style.width = `${Math.floor(fit * diagramZoom)}px`;
  document.querySelector("#diagram-scale").textContent =
    `${Math.round(diagramZoom * 100)}%`;
  document.querySelector("#diagram-smaller").disabled = diagramZoom <= 1;
  document.querySelector("#diagram-larger").disabled = diagramZoom >= 4;
};
diagramImage.addEventListener("load", sizeDiagram);
document.querySelectorAll(".expand-diagram").forEach((link) =>
  link.addEventListener("click", (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    event.preventDefault();
    diagramOpener = link;
    const source = link.querySelector("img");
    document.querySelector("#diagram-title").textContent = source.alt;
    diagramImage.src = source.src;
    diagramImage.alt = source.alt;
    document.querySelector("#diagram-original").href = source.src;
    document.querySelector("#diagram-original").textContent =
      /\.svg(?:$|[?#])/.test(source.src) ? "Open SVG ↗" : "Open image ↗";
    diagramZoom = 1;
    viewer.showModal();
    sizeDiagram();
    stage.scrollTo(0, 0);
    document.querySelector("#diagram-close").focus();
  }),
);
document
  .querySelector("#diagram-close")
  .addEventListener("click", () => viewer.close());
viewer.addEventListener("close", () => diagramOpener?.focus());
document.querySelector("#diagram-fit").addEventListener("click", () => {
  diagramZoom = 1;
  sizeDiagram();
  stage.scrollTo(0, 0);
});
for (const [id, factor] of [
  ["diagram-smaller", 0.5],
  ["diagram-larger", 2],
]) {
  document.querySelector(`#${id}`).addEventListener("click", () => {
    diagramZoom = Math.max(1, Math.min(4, diagramZoom * factor));
    sizeDiagram();
  });
}
window.addEventListener("resize", () => {
  if (viewer.open) sizeDiagram();
});

// Lightweight balance lab: geometry is authored at build time; only the battery and CG move.
// Values come from this documentation version's mass ledger, never the user's aircraft draft.
document.querySelectorAll("[data-balance-lab]").forEach((lab) => {
  const slider = lab.querySelector('input[type="range"]');
  const ratio = Number(lab.dataset.ratio),
    aft = Number(lab.dataset.aft);
  const cgx = Number(lab.dataset.cgx),
    cgy = Number(lab.dataset.cgy);
  if (!slider || ![ratio, aft, cgx, cgy].every(Number.isFinite)) return;
  const update = () => {
    const mm = Number(slider.value),
      shift = mm * ratio;
    const phrase =
      mm === 0
        ? "Original position"
        : `${Math.abs(mm)} mm ${mm > 0 ? "forward" : "aft"}`;
    lab.querySelector("[data-balance-position]").textContent = phrase;
    slider.setAttribute("aria-valuetext", phrase);
    lab
      .querySelector("[data-balance-battery]")
      .setAttribute("transform", `translate(${-mm * 0.48} ${mm * 0.22})`);
    lab
      .querySelector("[data-balance-cg]")
      .setAttribute(
        "transform",
        `translate(${cgx - shift * 0.48} ${cgy + shift * 0.22})`,
      );
    lab.querySelector("[data-balance-aft]").textContent = (aft - shift).toFixed(
      1,
    );
    lab.querySelector("[data-balance-shift]").textContent =
      mm === 0
        ? "Move the battery to compare"
        : `${Math.abs(shift).toFixed(1)} mm ${mm > 0 ? "toward the nose" : "toward the tail"}`;
    lab.querySelector("[data-balance-gauge]").style.left =
      `${Math.max(0, Math.min(100, aft - shift))}%`;
    lab.querySelector("[data-balance-reset]").disabled = mm === 0;
  };
  slider.addEventListener("input", update);
  lab.querySelector("[data-balance-reset]").addEventListener("click", () => {
    slider.value = "0";
    update();
    slider.focus();
  });
  lab.querySelector(".balance-controls").hidden = false;
  update();
});

// Explicit app preference controls SVG sources, including downloads and an open viewer.
const syncDiagramTheme = () => {
  const light = document.documentElement.dataset.theme === "light";
  document
    .querySelectorAll("[data-diagram-dark][data-diagram-light]")
    .forEach((element) => {
      const url = light
        ? element.dataset.diagramLight
        : element.dataset.diagramDark;
      if (element instanceof HTMLImageElement) {
        element.src = url;
        element.closest(".expand-diagram")?.setAttribute("href", url);
      } else if (element instanceof HTMLAnchorElement) element.href = url;
    });
  if (viewer.open && diagramOpener) {
    const source = diagramOpener.querySelector("img");
    diagramImage.src = source.src;
    document.querySelector("#diagram-original").href = source.src;
  }
};
window.addEventListener("rcforge-themechange", syncDiagramTheme);
syncDiagramTheme();
