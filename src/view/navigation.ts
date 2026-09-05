import { uiIcon } from "./icons";

/** Keep workspace names, icons and ordering identical in the app and docs. */
export function workspaceNavigation(fromDocs = false) {
  const prefix = fromDocs ? "/" : "";
  return `<nav class="workspace-navigation" aria-label="Main navigation">${[
    ["fly", "Fly", "Fly"],
    ["aircraft", "Aircraft", "Aircraft editor"],
    ["controllers", "Controllers", "Controllers"],
    ["experiments", "Experiments", "Experiments"],
  ]
    .map(
      ([id, label, accessible]) =>
        `<a href="${prefix}#/${id}" data-route="${id}" aria-label="${accessible}">${uiIcon(id as "fly" | "aircraft" | "controllers" | "experiments")}<span>${label}</span></a>`,
    )
    .join("")}</nav>`;
}

export function documentationLink(active = false) {
  return `<a class="header-docs${active ? " active" : ""}" href="/docs/" aria-label="Documentation" title="Documentation"${active ? ' aria-current="page"' : ""}>${uiIcon("docs")}<span>Docs</span></a>`;
}
