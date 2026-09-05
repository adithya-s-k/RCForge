import {
  aircraftDifferences,
  sameAircraft,
  type AircraftHistory,
  type AircraftRevision,
} from "../core/aircraft-history";
import { massProperties } from "../core/aircraft";
import type { Aircraft } from "../core/schema";
import {
  deleteAircraftRevision,
  readAircraftHistory,
  saveAircraftRevision,
} from "./aircraft-history-storage";
import { $, download, escape } from "./dom";
import "../view/aircraft-history.css";

interface HistoryEditor {
  getDraft: () => Aircraft;
  getApplied: () => Aircraft;
  restore: (aircraft: Aircraft) => void;
  notify: (text: string, error?: boolean) => void;
}

/** Version operations always read fresh storage; restore only changes the editor draft. */
export function setupAircraftHistory(editor: HistoryEditor) {
  const dialog = document.createElement("dialog");
  dialog.className = "aircraft-history-dialog";
  dialog.setAttribute("aria-labelledby", "history-title");
  document.body.append(dialog);
  let draft: Aircraft,
    history: AircraftHistory,
    selected: AircraftRevision | undefined;
  let deletePending = false;
  const report = (text: string, error = false) => {
    $("history-status").textContent = text;
    $("history-status").classList.toggle("history-error", error);
  };
  const attempt = (action: () => void) => {
    try {
      action();
    } catch (e) {
      report(
        e instanceof Error
          ? e.message
          : "Could not save history. Export your aircraft to keep a backup.",
        true,
      );
    }
  };
  const select = (id?: string) => {
    selected =
      history.entries.find((entry) => entry.id === id) ??
      history.entries.at(-1);
    deletePending = false;
    renderList();
    renderDetail();
  };
  const refresh = (id?: string) => {
    history = readAircraftHistory(draft.id);
    $("history-count").textContent =
      `${history.entries.length} / 40 versions · saved in this browser`;
    $<HTMLButtonElement>("history-backup").disabled = !history.entries.length;
    select(id);
  };
  const renderList = () => {
    $("history-list").innerHTML = history.entries.length
      ? [...history.entries]
          .reverse()
          .map(
            (entry) =>
              `<button data-revision="${entry.id}" aria-pressed="${entry.id === selected?.id}"><span class="history-version">v${entry.revision}</span><span><strong>${escape(entry.name)}</strong><small>${escape(new Date(entry.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }))} · ${entry.kind === "applied" ? "Applied" : entry.kind === "baseline" ? "Original" : "Checkpoint"}</small></span></button>`,
          )
          .join("")
      : `<div class="history-empty"><h3>Your first version</h3><p>Save a checkpoint, or apply an edited aircraft. Each version keeps the complete setup.</p></div>`;
    dialog.querySelectorAll<HTMLButtonElement>("[data-revision]").forEach(
      (button) =>
        (button.onclick = () => {
          select(button.dataset.revision);
          dialog
            .querySelector<HTMLButtonElement>(
              `[data-revision="${button.dataset.revision}"]`,
            )
            ?.focus({ preventScroll: true });
        }),
    );
  };
  const renderDetail = () => {
    const detail = $("history-detail");
    if (!selected) {
      detail.innerHTML = `<div class="history-empty"><h3>Room to experiment</h3><p>Compare weight, components, control settings and camera placement. Restore any saved version into the editor.</p></div>`;
      return;
    }
    const entry = selected,
      properties = massProperties(entry.aircraft),
      differences = aircraftDifferences(draft, entry.aircraft);
    detail.innerHTML = `<div class="history-detail-heading"><div><h3>v${entry.revision} · ${escape(entry.name)}</h3><p>${escape(new Date(entry.createdAt).toLocaleString())}</p></div><button id="history-aircraft-export">Export JSON</button></div><div class="history-metrics"><div><span>All-up mass</span><strong>${Number((properties.mass * 1000).toFixed(1))} g</strong></div><div><span>Components</span><strong>${entry.aircraft.parts.length}</strong></div><div><span>Saved with</span><strong>RCForge ${escape(entry.appVersion)}</strong></div></div><div class="history-restore" ${differences.length ? "" : "hidden"}><p>Restore opens this setup in the editor. Your current draft is saved first.</p><button id="history-restore" class="primary">Restore to draft</button></div><h4>Changes from your current draft</h4>${
      differences.length
        ? `<div class="history-differences"><table><thead><tr><th>Setting</th><th>Current draft</th><th>This version</th></tr></thead><tbody>${differences
            .slice(0, 100)
            .map(
              (row) =>
                `<tr><th scope="row">${escape(row.path)}</th><td>${escape(row.before)}</td><td>${escape(row.after)}</td></tr>`,
            )
            .join(
              "",
            )}</tbody></table></div>${differences.length > 100 ? `<p>Showing 100 of ${differences.length} changes. Export JSON for the full definition.</p>` : ""}`
        : `<div class="history-matches">Matches your current draft.</div>`
    }<details class="history-manage"><summary>Version details & removal</summary><p>Physics ${escape(entry.simulationVersion)} · Aircraft format ${entry.aircraft.schemaVersion}</p><p>Deleting removes this local checkpoint. Export a backup first to keep it.</p><button id="history-delete">Delete this version</button></details>`;
    $("history-aircraft-export").onclick = () =>
      download(
        `${entry.aircraft.id}-v${entry.revision}.json`,
        JSON.stringify(entry.aircraft, null, 2),
      );
    $("history-restore").onclick = () =>
      attempt(() => {
        // Keep edits before restoration, even when the selected revision is older.
        const current = editor.getDraft();
        if (!sameAircraft(current, entry.aircraft))
          saveAircraftRevision(current, {
            name: `Before restoring v${entry.revision}`,
            previous: editor.getApplied(),
          });
        editor.restore(structuredClone(entry.aircraft));
        dialog.close();
        editor.notify(
          `v${entry.revision} restored to draft. Apply to flight when ready.`,
        );
      });
    $("history-delete").onclick = () => {
      if (!deletePending) {
        deletePending = true;
        $("history-delete").textContent = `Confirm delete v${entry.revision}`;
        return;
      }
      attempt(() => {
        deleteAircraftRevision(draft.id, entry.id);
        refresh();
        report(`v${entry.revision} deleted. Other versions were kept.`);
      });
    };
  };
  $("aircraft-history").onclick = () => {
    try {
      draft = structuredClone(editor.getDraft());
    } catch (e) {
      editor.notify(
        e instanceof Error
          ? e.message
          : "Finish editing before opening history.",
        true,
      );
      return;
    }
    dialog.innerHTML = `<header class="history-header"><div><h2 id="history-title">Aircraft history</h2><p>${escape(draft.name)} <span id="history-count"></span></p></div><button id="history-close" autofocus aria-label="Close aircraft history">Close</button></header><div class="history-checkpoint"><label for="history-name">Save your current draft</label><div><input id="history-name" maxlength="80" placeholder="Name this version (optional)"/><button id="history-save" class="primary">Save version</button></div></div><div class="history-layout"><div id="history-list" class="history-list" role="group" aria-label="Saved aircraft versions"></div><section id="history-detail" class="history-detail" aria-label="Selected version"></section></div><footer class="history-footer"><p id="history-status" role="status">Versions stay on this device. Export history to back up or move to another browser.</p><div><button id="history-backup" disabled>Export history</button><button id="history-import">Import history</button></div></footer>`;
    $("history-close").onclick = () => dialog.close();
    $("history-save").onclick = () =>
      attempt(() => {
        const result = saveAircraftRevision(draft, {
          name: $<HTMLInputElement>("history-name").value,
          kind: "checkpoint",
          previous: editor.getApplied(),
        });
        refresh(result.entry.id);
        report(
          result.created
            ? `v${result.entry.revision} saved. Your flight setup is unchanged.`
            : `Already saved as v${result.entry.revision}. Edit the aircraft to create a new version.`,
        );
        $<HTMLInputElement>("history-name").value = "";
      });
    $("history-name").onkeydown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        $("history-save").click();
      }
    };
    $("history-backup").onclick = () =>
      attempt(() => {
        // Keep the compact archive within the same size limit accepted by import.
        download(
          `${draft.id}.history.json`,
          JSON.stringify(readAircraftHistory(draft.id)),
        );
        report(
          "History exported. Unsaved draft changes are included only after Save version.",
        );
      });
    $("history-import").onclick = () => {
      dialog.close();
      $("import-aircraft").click();
    };
    dialog.showModal();
    attempt(() => refresh());
  };
}
