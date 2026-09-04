import { $, download, escape } from "./dom";
import {
  runExperiment,
  samplesToCsv,
  type Scenario,
  type Sample,
} from "../core/experiment";
import type { Aircraft } from "../core/schema";
import type { Environment } from "../core/simulation";
function chart(base: Sample[], edited: Sample[]) {
  const samples = [...base, ...edited],
    min = Math.min(0, ...samples.map((s) => s.altitudeM)),
    max = Math.max(25, ...samples.map((s) => s.altitudeM)),
    width = 760,
    height = 300;
  const path = (ss: Sample[]) =>
    ss
      .map(
        (s, i) =>
          `${i ? "L" : "M"}${(50 + (s.time / 20) * 680).toFixed(1)},${(height - 32 - ((s.altitudeM - min) / (max - min)) * (height - 64)).toFixed(1)}`,
      )
      .join(" ");
  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Altitude traces for baseline and edited aircraft">${[
    0, 0.25, 0.5, 0.75, 1,
  ]
    .map((t) => {
      const y = height - 32 - t * (height - 64);
      return `<line x1="50" x2="730" y1="${y}" y2="${y}" stroke="#343e48"/><text x="40" y="${y + 4}" fill="#8795a1" text-anchor="end" font-size="12">${(min + t * (max - min)).toFixed(0)}</text>`;
    })
    .join(
      "",
    )}${[0, 5, 10, 15, 20].map((t) => `<text x="${50 + (t / 20) * 680}" y="292" fill="#8795a1" text-anchor="middle" font-size="12">${t}s</text>`).join("")}<path d="${path(base)}" fill="none" stroke="#7799af" stroke-width="2"/><path d="${path(edited)}" fill="none" stroke="#e2ad68" stroke-width="2.5"/></svg>`;
}
export function setupExperiments(
  get: () => {
    baseline: Aircraft;
    aircraft: Aircraft;
    environment: Environment;
  },
  pause: () => void,
) {
  let latest: ReturnType<typeof runExperiment> | null = null;
  $("run-experiment").onclick = () => {
    pause();
    $("run-experiment").setAttribute("disabled", "");
    $("experiment-results").textContent =
      "Running baseline and edited configurations…";
    setTimeout(() => {
      try {
        const { baseline, aircraft, environment } = get(),
          scenario = $<HTMLSelectElement>("scenario").value as Scenario,
          base = runExperiment(baseline, environment, scenario),
          edited = runExperiment(aircraft, environment, scenario);
        latest = edited;
        $("experiment-results").innerHTML =
          `<div class="chart-heading"><h2>Altitude · m AGL</h2><span>● Baseline <b>● Edited</b></span></div>${chart(base.recording.samples, edited.recording.samples)}<table class="result-table"><thead><tr><th>At end of run</th><th>Baseline</th><th>Edited aircraft</th></tr></thead><tbody>${[
            [
              "Duration",
              base.summary.durationSeconds.toFixed(2) + " s",
              edited.summary.durationSeconds.toFixed(2) + " s",
            ],
            [
              "Distance",
              base.summary.distanceM.toFixed(1) + " m",
              edited.summary.distanceM.toFixed(1) + " m",
            ],
            [
              "Altitude",
              base.summary.finalAltitudeM.toFixed(1) + " m",
              edited.summary.finalAltitudeM.toFixed(1) + " m",
            ],
            ["End state", base.summary.status, edited.summary.status],
            [
              "Trim converged",
              String(base.trimConverged),
              String(edited.trimConverged),
            ],
          ]
            .map(
              (row) =>
                "<tr>" +
                row
                  .map(
                    (v, i) =>
                      `<${i ? "td" : "th"}>${escape(v)}</${i ? "td" : "th"}>`,
                  )
                  .join("") +
                "</tr>",
            )
            .join(
              "",
            )}</tbody></table><p class="small muted">A run ends early on an impact or belly landing. These are estimates from the same model, not independent validation.</p>`;
        $("export-experiment").removeAttribute("disabled");
        $("export-csv").removeAttribute("disabled");
      } catch (e) {
        $("experiment-results").textContent = "Experiment failed: " + String(e);
      } finally {
        $("run-experiment").removeAttribute("disabled");
      }
    }, 20);
  };
  $("export-experiment").onclick = () => {
    if (latest)
      download(
        latest.recording.aircraft.id + "-experiment.json",
        JSON.stringify(latest.recording),
      );
  };
  $("export-csv").onclick = () => {
    if (latest)
      download(
        latest.recording.aircraft.id + "-telemetry.csv",
        samplesToCsv(latest.recording.samples),
        "text/csv",
      );
  };
  const invalidate = () => {
    latest = null;
    $("export-experiment").setAttribute("disabled", "");
    $("export-csv").setAttribute("disabled", "");
    $("experiment-results").innerHTML =
      '<h2>Ready for a new comparison.</h2><p class="muted">Aircraft or conditions changed. Run the scenario to refresh these results.</p>';
  };
  $("scenario").addEventListener("change", invalidate);
  return invalidate;
}
