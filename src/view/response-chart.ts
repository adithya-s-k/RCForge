import type { Sample } from "../core/experiment";

export const responseMetrics = {
  altitudeM: "Altitude · m AGL",
  airspeedMps: "Airspeed · m/s",
  rollDeg: "Roll · degrees",
  pitchDeg: "Pitch · degrees",
  batterySoc: "Battery charge · %",
  batteryVoltageV: "Pack voltage · V",
  batteryCurrentA: "Current draw · A",
  batteryUsedMah: "Charge used · mAh",
  vtolTiltDeg: "Front motor tilt · degrees",
  vtolRearTiltDeg: "Rear yaw tilt · degrees",
  vtolRearMotor: "Rear motor command · %",
} as const;
export type ResponseMetric = keyof typeof responseMetrics;
export function metricValue(sample: Sample, metric: ResponseMetric) {
  const value = sample[metric];
  return value === undefined
    ? undefined
    : metric === "batterySoc" || metric === "vtolRearMotor"
      ? value * 100
      : value;
}
export function responseDomain(samples: Sample[], metric: ResponseMetric) {
  const values = samples
    .map((s) => metricValue(s, metric))
    .filter((v): v is number => v !== undefined);
  if (!values.length) return { min: 0, max: 1 };
  const low = Math.min(...values),
    high = Math.max(...values);
  if (metric === "batterySoc") {
    // Label the actual scale; a minimum five-point window keeps tiny changes honest.
    const min = Math.max(0, Math.floor(low - 2));
    const max = Math.min(100, Math.max(min + 5, Math.ceil(high + 2)));
    return { min: Math.min(min, max - 5), max };
  }
  return {
    min: Math.min(0, low),
    max: Math.max(
      metric === "altitudeM" ? 25 : metric.startsWith("battery") ? 1 : 5,
      high * 1.05,
    ),
  };
}
export function responseChart(
  base: Sample[],
  edited: Sample[],
  metric: ResponseMetric,
  availableWidth = 760,
) {
  const { min, max } = responseDomain([...base, ...edited], metric),
    width = Math.max(260, Math.min(940, availableWidth)),
    height = width < 500 ? 220 : 270,
    left = width < 500 ? 45 : 60,
    right = width - 18,
    plotWidth = right - left,
    duration = Math.max(1, base.at(-1)?.time ?? 0, edited.at(-1)?.time ?? 0);
  const path = (samples: Sample[]) => {
    let connected = false;
    return samples
      .map((s) => {
        const value = metricValue(s, metric);
        if (value === undefined) {
          connected = false;
          return "";
        }
        const command = connected ? "L" : "M";
        connected = true;
        return `${command}${(left + (s.time / duration) * plotWidth).toFixed(1)},${(height - 32 - ((value - min) / (max - min)) * (height - 64)).toFixed(1)}`;
      })
      .join(" ");
  };
  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${responseMetrics[metric]} traces for baseline and edited aircraft">${[
    0, 0.25, 0.5, 0.75, 1,
  ]
    .map((t) => {
      const y = height - 32 - t * (height - 64);
      return `<line x1="${left}" x2="${right}" y1="${y}" y2="${y}" stroke="var(--ui-border)"/><text x="${left - 10}" y="${y + 4}" fill="var(--ui-muted)" text-anchor="end" font-size="12">${(min + t * (max - min)).toFixed(max - min < 10 ? 1 : 0)}</text>`;
    })
    .join(
      "",
    )}${[0, 0.25, 0.5, 0.75, 1].map((fraction) => `<text x="${left + fraction * plotWidth}" y="${height - 8}" fill="var(--ui-muted)" text-anchor="middle" font-size="12">${Number((fraction * duration).toFixed(1))}s</text>`).join("")}<path d="${path(base)}" fill="none" stroke="var(--ui-muted)" stroke-width="2" stroke-dasharray="6 5"/><path d="${path(edited)}" fill="none" stroke="var(--ui-text)" stroke-width="2.5"/></svg>`;
}
