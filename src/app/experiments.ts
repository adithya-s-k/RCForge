import { uiIcon } from "../view/icons";
import { $, download, escape } from "./dom";
import {
  runExperiment,
  samplesToCsv,
  type Scenario,
  type Sample,
} from "../core/experiment";
import type { Aircraft } from "../core/schema";
import type { Environment } from "../core/simulation";
const metrics = {
  altitudeM: "Altitude · m AGL",
  airspeedMps: "Airspeed · m/s",
  rollDeg: "Roll · degrees",
  pitchDeg: "Pitch · degrees",
} as const;
type Metric = keyof typeof metrics;
function chart(base: Sample[], edited: Sample[], metric: Metric) {
  const samples = [...base, ...edited],
    min = Math.min(0, ...samples.map((s) => s[metric])),
    max = Math.max(
      metric === "altitudeM" ? 25 : 5,
      ...samples.map((s) => s[metric]),
    ),
    width = 760,
    height = 300;
  const path = (ss: Sample[]) =>
    ss
      .map(
        (s, i) =>
          `${i ? "L" : "M"}${(50 + (s.time / 20) * 680).toFixed(1)},${(height - 32 - ((s[metric] - min) / (max - min)) * (height - 64)).toFixed(1)}`,
      )
      .join(" ");
  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${metrics[metric]} traces for baseline and edited aircraft">${[
    0, 0.25, 0.5, 0.75, 1,
  ]
    .map((t) => {
      const y = height - 32 - t * (height - 64);
      return `<line x1="50" x2="730" y1="${y}" y2="${y}" stroke="var(--ui-border)"/><text x="40" y="${y + 4}" fill="var(--ui-muted)" text-anchor="end" font-size="12">${(min + t * (max - min)).toFixed(0)}</text>`;
    })
    .join(
      "",
    )}${[0, 5, 10, 15, 20].map((t) => `<text x="${50 + (t / 20) * 680}" y="292" fill="var(--ui-muted)" text-anchor="middle" font-size="12">${t}s</text>`).join("")}<path d="${path(base)}" fill="none" stroke="var(--ui-muted)" stroke-width="2" stroke-dasharray="6 5"/><path d="${path(edited)}" fill="none" stroke="var(--ui-text)" stroke-width="2.5"/></svg>`;
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
  let comparison: {
    base: ReturnType<typeof runExperiment>;
    edited: ReturnType<typeof runExperiment>;
  } | null = null;
  const renderChart = () => {
    if (!comparison) return;
    const metric = $<HTMLSelectElement>("response-metric").value as Metric;
    $("response-chart").innerHTML = chart(
      comparison.base.recording.samples,
      comparison.edited.recording.samples,
      metric,
    );
  };
  const scenarioHelp = () => {
    const scenario = $<HTMLSelectElement>("scenario").value;
    $("scenario-help").textContent = (
      {
        cruise: "Hold the calculated trim for 20 seconds.",
        glide: "Cut power and retain the trimmed elevator position.",
        "pitch-pulse":
          "At 2 seconds, add 25% pitch input for one second, then release.",
        "roll-pulse":
          "At 2 seconds, apply 25% right roll for one second, then release.",
        stall:
          "Cut power, then progressively increase pitch input after 2 seconds.",
      } as Record<string, string>
    )[scenario];
  };
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
        comparison = { base, edited };
        const metric: Metric =
          scenario === "roll-pulse"
            ? "rollDeg"
            : scenario === "pitch-pulse"
              ? "pitchDeg"
              : "altitudeM";
        $("experiment-results").classList.remove("experiment-empty");
        $("experiment-results").innerHTML =
          `<div class="chart-heading"><select id="response-metric" aria-label="Response plot">${Object.entries(
            metrics,
          )
            .map(
              ([key, label]) =>
                `<option value="${key}" ${key === metric ? "selected" : ""}>${label}</option>`,
            )
            .join(
              "",
            )}</select><div class="chart-legend"><span><i></i>Baseline</span><span class="edited"><i></i>Edited</span></div></div><div id="response-chart">${chart(base.recording.samples, edited.recording.samples, metric)}</div><table class="result-table"><thead><tr><th>Measurement</th><th>Baseline</th><th>Edited aircraft</th></tr></thead><tbody>${[
            [
              "Initial power",
              ((base.recording.frames[0]?.throttle ?? 0) * 100).toFixed(1) +
                "%",
              ((edited.recording.frames[0]?.throttle ?? 0) * 100).toFixed(1) +
                "%",
            ],
            [
              "Initial pitch command",
              ((base.recording.frames[0]?.pitch ?? 0) * 100).toFixed(1) + "%",
              ((edited.recording.frames[0]?.pitch ?? 0) * 100).toFixed(1) + "%",
            ],
            [
              "Duration",
              base.summary.durationSeconds.toFixed(2) + " s",
              edited.summary.durationSeconds.toFixed(2) + " s",
            ],
            [
              "Final distance",
              base.summary.distanceM.toFixed(1) + " m",
              edited.summary.distanceM.toFixed(1) + " m",
            ],
            [
              "Final altitude",
              base.summary.finalAltitudeM.toFixed(1) + " m",
              edited.summary.finalAltitudeM.toFixed(1) + " m",
            ],
            ["End state", base.summary.status, edited.summary.status],
            [
              "Trim converged",
              base.trimConverged ? "Yes" : "No — check model",
              edited.trimConverged ? "Yes" : "No — check model",
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
            )}</tbody></table>${scenario === "cruise" ? '<p class="small muted">Each aircraft uses its own calculated trim. Matching altitude can be expected even when weight or required power differs.</p>' : ""}<p class="small muted">A run ends early on an impact or belly landing. These are estimates from the same model, not independent validation.</p>`;
        $("response-metric").onchange = renderChart;
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
    scenarioHelp();
    latest = null;
    comparison = null;
    $("export-experiment").setAttribute("disabled", "");
    $("export-csv").setAttribute("disabled", "");
    $("experiment-results").classList.add("experiment-empty");
    $("experiment-results").innerHTML =
      `<span class="experiment-empty-icon">${uiIcon("experiments")}</span><h2>No comparison yet</h2><p class="muted">Run a scenario to compare the original and your current setup.</p>`;
  };
  $("scenario").addEventListener("change", invalidate);
  return invalidate;
}
