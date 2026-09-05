import { AIRCRAFT_FORMAT_VERSION } from "../core/schema";
import { SIM_VERSION } from "../core/simulation";
import { HISTORY_FORMAT_VERSION } from "../core/aircraft-history";
import { APP_VERSION, GITHUB_URL, WEBSITE_URL } from "./release";
import { $ } from "./dom";
import "../view/release.css";

export function setupReleaseInfo(onOpen: () => void) {
  const dialog = document.createElement("dialog");
  dialog.className = "release-dialog";
  dialog.setAttribute("aria-labelledby", "release-title");
  dialog.innerHTML = `<header><div><h2 id="release-title">RCForge</h2><p>An open foundation for programmable RC aircraft.</p></div><button id="release-close" aria-label="Close project information">Close</button></header><dl><div><dt>Application</dt><dd>v${APP_VERSION}</dd></div><div><dt>Physics & recordings</dt><dd>${SIM_VERSION}</dd></div><div><dt>Aircraft format</dt><dd>${AIRCRAFT_FORMAT_VERSION}</dd></div><div><dt>History format</dt><dd>${HISTORY_FORMAT_VERSION}</dd></div></dl><p class="release-local-note">Aircraft versions are saved in this browser. Export history to take your work to another device or address.</p><nav aria-label="Project resources"><a href="${GITHUB_URL}" target="_blank" rel="noopener noreferrer">Source code ↗</a><a href="${GITHUB_URL}/blob/main/CONTRIBUTING.md" target="_blank" rel="noopener noreferrer">Start contributing ↗</a><a href="${GITHUB_URL}/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer">Changelog ↗</a><a href="${WEBSITE_URL}" target="_blank" rel="noopener noreferrer">rcforge.adithyask.com ↗</a></nav>`;
  document.body.append(dialog);
  $("release-info").onclick = () => {
    onOpen();
    dialog.showModal();
  };
  $("release-close").onclick = () => dialog.close();
}
