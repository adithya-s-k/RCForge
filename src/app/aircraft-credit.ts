import type { Aircraft } from "../core/schema";
import { escape } from "./dom";

/** Small, explicit attribution; never infer authorship from a physics citation. */
export function aircraftCredit(aircraft: Aircraft): string {
  const credit = aircraft.credit;
  if (!credit) return "";
  return `Design by <a href="${escape(credit.url)}" target="_blank" rel="noopener noreferrer">${escape(credit.name)} ↗</a>`;
}
