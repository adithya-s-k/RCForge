import { requireHostAccess, hostAllows } from "./host";
import { uiIcon } from "../view/icons";
import { $, download, escape } from "./dom";
import { runExperiment, samplesToCsv, type Scenario } from "../core/experiment";
import type { Aircraft } from "../core/schema";
import type { Environment } from "../core/simulation";
import {
  responseMetrics as metrics,
  responseChart as chart,
  type ResponseMetric as Metric,
} from "../view/response-chart";
const endState = (status: string) =>
  ({
    flying: "Still flying",
    grounded: "Ground contact",
    landed: "Belly landing",
    crashed: "Airframe impact",
  })[status] ?? status;
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
    const select = $<HTMLSelectElement>("response-metric");
    const host = $("response-chart");
    if (!host || !select) return;
    const metric = select.value as Metric;
    host.innerHTML = chart(
      comparison.base.recording.samples,
      comparison.edited.recording.samples,
      metric,
      host.clientWidth,
    );
  };
  let chartWidth = 0;
  const resize = new ResizeObserver(() => {
    const width = $("experiment-results").clientWidth;
    if (width === chartWidth) return;
    chartWidth = width;
    renderChart();
  });
  resize.observe($("experiment-results"));
  const scenarioHelp = () => {
    const scenario = $<HTMLSelectElement>("scenario").value;
    $("experiment-duration").textContent =
      scenario === "vtol-transition" ? "50 seconds" : "20 seconds";
    $("scenario-help").textContent =
      (
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
      )[scenario] ??
      "50 seconds: hover, convert to cruise at 3 s, return to hover at 24 s. Starts at 15 m. Inspect altitude loss, tilt and rear motor power.";
  };
  $("run-experiment").onclick = () => {
    if (!requireHostAccess({ kind: "workspace", id: "experiments" })) return;
    pause();
    latest = null;
    comparison = null;
    $("export-experiment").setAttribute("disabled", "");
    $("export-csv").setAttribute("disabled", "");
    $("run-experiment").setAttribute("disabled", "");
    $("run-experiment").textContent = "Running…";
    $("experiment-results").setAttribute("aria-busy", "true");
    $("experiment-results").textContent =
      "Running baseline and edited configurations…";
    setTimeout(() => {
      if (!hostAllows({ kind: "workspace", id: "experiments" })) {
        $("run-experiment").removeAttribute("disabled");
        $("run-experiment").textContent = "Run comparison";
        $("experiment-results").removeAttribute("aria-busy");
        return;
      }
      try {
        const { baseline, aircraft, environment } = get(),
          scenario = $<HTMLSelectElement>("scenario").value as Scenario,
          duration = scenario === "vtol-transition" ? 50 : 20,
          base = runExperiment(baseline, environment, scenario, duration),
          edited = runExperiment(aircraft, environment, scenario, duration);
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
            .filter(([key]) =>
              [...base.recording.samples, ...edited.recording.samples].some(
                (s) => s[key as Metric] !== undefined,
              ),
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
            ...(aircraft.battery || baseline.battery
              ? [
                  [
                    "Charge used",
                    ...[base, edited].map((run) => {
                      const mah = run.recording.samples.at(-1)?.batteryUsedMah;
                      return mah === undefined
                        ? "Not modeled"
                        : mah.toFixed(1) + " mAh";
                    }),
                  ],
                  [
                    "Remaining charge",
                    ...[base, edited].map((run) => {
                      const soc = run.finalState.batterySoc;
                      return soc === undefined
                        ? "Not modeled"
                        : (soc * 100).toFixed(1) + "%";
                    }),
                  ],
                ]
              : []),
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
            [
              "End state",
              endState(base.summary.status),
              endState(edited.summary.status),
            ],
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
            )}</tbody></table>${scenario === "cruise" ? '<p class="small muted">Each aircraft uses its own calculated trim. Matching altitude can be expected even when weight or required power differs.</p>' : ""}<p class="small muted">Runs stop at ground contact, landing or impact, up to ${duration} seconds. These estimates use the same model; they are not independent validation.</p>`;
        $("response-metric").onchange = renderChart;
        renderChart();
        $("export-experiment").removeAttribute("disabled");
        $("export-csv").removeAttribute("disabled");
      } catch (e) {
        $("experiment-results").textContent = "Experiment failed: " + String(e);
      } finally {
        $("run-experiment").removeAttribute("disabled");
        $("run-experiment").textContent = "Run comparison";
        const results = $("experiment-results");
        results.removeAttribute("aria-busy");
        if (!$("page-experiments").hidden) {
          results.focus({ preventScroll: true });
          if (
            results.getBoundingClientRect().top >
            document.documentElement.clientHeight - 180
          )
            results.scrollIntoView({ block: "start" });
        }
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
