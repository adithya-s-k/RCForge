import { expect, it } from "vitest";
import raw from "../aircraft/bronco-tri-vtol.json";
import { parseAircraft } from "../src/core/schema";
import { massProperties } from "../src/core/aircraft";
import {
  balanceData,
  balanceWidget,
  staticBalanceDiagram,
} from "../site/balance-visual";
import { buildDocs } from "../site/build";

it("uses the actual mass ledger for forward and aft moves, with unchanged total mass", () => {
  const a = parseAircraft(raw),
    before = balanceData(a);
  for (const mm of [-50, 0, 50]) {
    const moved = structuredClone(a);
    moved.parts.find((p) => p.id === before.battery.id)!.positionM[0] +=
      mm / 1000;
    const after = balanceData(moved);
    expect(after.mass).toBe(before.mass);
    expect(before.aftMm - after.aftMm).toBeCloseTo(mm * before.ratio, 10);
    expect(massProperties(moved).cg[0]).toBeCloseTo(
      before.cg[0] + (mm * before.ratio) / 1000,
      12,
    );
  }
});
it("ships a static fallback and a bounded keyboard-accessible control using versioned data", () => {
  const a = parseAircraft(raw);
  a.parts.find((p) => p.id === "battery")!.massKg = 0.3;
  const html = balanceWidget(
    a,
    "/docs/next/files/docs/images/diagram-mass-cg.svg",
  );
  expect(html).toContain(`data-ratio="${balanceData(a).ratio}"`);
  expect(html).toContain('min="-50" max="50"');
  expect(html).toContain('class="balance-controls" hidden');
  expect(html).not.toMatch(/<script|oninput=/);
  expect(staticBalanceDiagram()).toContain("CG  +7.2 mm forward");
  // A standalone SVG is XML: data attributes must have values, unlike HTML booleans.
  expect(staticBalanceDiagram()).not.toMatch(/\sdata-[\w-]+(?=\s|>)/);
  const files = buildDocs(process.cwd());
  expect(
    files.get("/docs/next/bronco-vtol/index.html")!.data.toString(),
  ).toContain("data-balance-lab");
  expect(
    files.get("/docs/next/aircraft-editor/index.html")!.data.toString(),
  ).toContain("data-balance-lab");
});
