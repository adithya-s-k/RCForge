import { massProperties } from "../src/core/aircraft";
import { add, axisQ, mulQ, radians, rotate, type Vec3 } from "../src/core/math";
import { parseAircraft, type Aircraft } from "../src/core/schema";
import preset from "../aircraft/bronco-tri-vtol.json";
import { escapeHtml as e } from "./markdown";

type MassPart = Aircraft["parts"][number];

/** An original orthographic illustration of the checked-in assembly, not a build drawing.
 * Projection and part dimensions are shared by the static illustration and live document.
 * Only X changes in the demo; the resulting shift is the exact mass-weighted CG delta.
 */
export const projectBalance = ([x, y, z]: Vec3) => [
  420 - x * 480 + y * 455,
  260 + x * 220 + y * 120 + z * 430,
];
const pt = (p: Vec3) =>
  projectBalance(p)
    .map((v) => v.toFixed(2))
    .join(",");
const poly = (points: Vec3[], fill: string, extra = "") =>
  `<polygon points="${points.map(pt).join(" ")}" fill="${fill}" stroke="var(--balance-edge,#687883)" stroke-width=".85" stroke-linejoin="round" ${extra}/>`;
const path = (points: Vec3[], extra = "") =>
  `<polyline points="${points.map(pt).join(" ")}" fill="none" stroke="var(--balance-edge,#687883)" stroke-width=".8" ${extra}/>`;
const top = "var(--balance-skin,#cbd5d9)",
  side = "var(--balance-side,#748792)",
  dark = "var(--balance-hardware,#27343c)";
function box(p: MassPart, color = top) {
  const [x, y, z] = p.sizeM.map((v) => v / 2),
    angles = p.orientationDeg ?? [0, 0, 0];
  const q = mulQ(
    axisQ([0, 0, 1], radians(angles[2])),
    mulQ(
      axisQ([0, 1, 0], radians(angles[1])),
      axisQ([1, 0, 0], radians(angles[0])),
    ),
  );
  const v = (a: number, b: number, c: number): Vec3 =>
    add(p.positionM, rotate(q, [a * x, b * y, c * z]));
  return (
    poly([v(-1, -1, 1), v(1, -1, 1), v(1, -1, -1), v(-1, -1, -1)], side) +
    poly([v(1, -1, 1), v(1, 1, 1), v(1, 1, -1), v(1, -1, -1)], side) +
    poly([v(-1, -1, -1), v(1, -1, -1), v(1, 1, -1), v(-1, 1, -1)], color)
  );
}
function loft(p: MassPart) {
  const v = (
    s: NonNullable<MassPart["bodyLoft"]>[number],
    y: number,
    z: number,
  ): Vec3 =>
    add(p.positionM, [
      s.x * p.sizeM[0],
      (y * s.width * p.sizeM[1]) / 2,
      z * p.sizeM[2],
    ]);
  const stations = p.bodyLoft!;
  return (
    poly(
      [
        ...stations.map((s) => v(s, -1, s.bottom)),
        ...[...stations].reverse().map((s) => v(s, -1, s.top)),
      ],
      side,
    ) +
    poly(
      [
        ...stations.map((s) => v(s, -1, s.top)),
        ...[...stations].reverse().map((s) => v(s, 1, s.top)),
      ],
      top,
    ) +
    poly(
      [
        ...stations.map((s) => v(s, 1, s.top)),
        ...[...stations].reverse().map((s) => v(s, 1, s.bottom)),
      ],
      side,
    )
  );
}
export function balanceData(a: Aircraft) {
  const m = massProperties(a),
    battery =
      a.parts.find((p) => p.id === a.battery?.partId) ??
      a.parts.find((p) => p.kind === "battery");
  if (!battery) throw Error("Balance illustration needs a battery mass entry");
  return {
    mass: m.mass,
    battery,
    cg: m.cg,
    ratio: battery.massKg / m.mass,
    aftMm: (a.reference.leadingEdgeXM - m.cg[0]) * 1000,
  };
}
export function balanceDrawing(a: Aircraft, offsetMm = 0) {
  const d = balanceData(a),
    part = (id: string) => a.parts.find((p) => p.id === id)!;
  let drawing = "";
  // Order surfaces from the far side toward the camera. The foam shell remains translucent.
  for (const id of ["left-boom", "tail-mass", "fuselage", "right-boom"]) {
    const p = part(id);
    if (id === "tail-mass") {
      const [x, , z] = p.positionM,
        [chord, span, height] = p.sizeM;
      for (const sign of [-1, 1])
        drawing += poly(
          [
            [x - chord / 2, (sign * span) / 2, z + height / 2],
            [x + chord / 2, (sign * span) / 2, z + height / 2],
            [x + chord / 2, 0, z - height / 2],
            [x - chord / 2, 0, z - height / 2],
          ],
          top,
        );
    } else if (p)
      drawing += `<g opacity="${id === "fuselage" ? 0.45 : 0.92}">${p.bodyLoft ? loft(p) : box(p)}</g>`;
  }
  for (const p of a.parts.filter((p) => p.kind === "wing")) {
    drawing += box(p);
    const [x, y, z] = p.positionM,
      [l, w, h] = p.sizeM;
    drawing += path(
      [
        [x - l * 0.26, y - w / 2, z - h / 2 - 0.001],
        [x - l * 0.26, y + w / 2, z - h / 2 - 0.001],
      ],
      'stroke-dasharray="3 2"',
    );
    drawing += path(
      [
        [x + l * 0.16, y - w / 2, z - h / 2 - 0.001],
        [x + l * 0.16, y + w / 2, z - h / 2 - 0.001],
      ],
      'opacity=".4"',
    );
  }
  for (const p of a.parts.filter((p) =>
    /support|tilt-bracket|rear-yaw-bracket/.test(p.id),
  ))
    drawing += box(
      p,
      /support/.test(p.id) ? "var(--balance-wood,#ae9772)" : dark,
    );
  for (const p of a.parts.filter(
    (p) => p.servo || p.id === "flight-controller",
  ))
    drawing += box(p, dark);
  for (const m of a.motors) {
    const p = m.partId ? part(m.partId) : undefined,
      prop = a.parts.find((p) => p.id === m.propPartId);
    if (!p || !prop) continue;
    const radius = p.sizeM[0] / 2,
      height = p.sizeM[2];
    const ring = (z: number) =>
      Array.from({ length: 25 }, (_, i) =>
        add(p.positionM, [
          radius * Math.cos((i * Math.PI) / 12),
          radius * Math.sin((i * Math.PI) / 12),
          z,
        ]),
      );
    const upper = ring(-height / 2),
      lower = ring(height / 2);
    for (let i = 0; i < 24; i++)
      drawing += poly(
        [upper[i], upper[i + 1], lower[i + 1], lower[i]],
        dark,
        'stroke-opacity=".25"',
      );
    drawing += poly(upper, "var(--balance-wood,#ae9772)");
    const pos = prop.positionM,
      r = prop.sizeM[0] / 2;
    const circle = Array.from({ length: 49 }, (_, i) =>
      add(pos, [
        r * Math.cos((i * Math.PI) / 24),
        r * Math.sin((i * Math.PI) / 24),
        0,
      ]),
    );
    drawing += path(circle, 'stroke-dasharray="3 5" opacity=".55"');
    // Blade planform, rather than thick rectangular placeholders.
    for (const sign of [-1, 1])
      drawing += poly(
        [
          [0, -0.006, 0],
          [r * 0.8, -0.014, 0],
          [r, 0, 0],
          [r * 0.7, 0.009, 0],
          [0, 0.007, 0],
        ].map((v) => add(pos, [v[0] * sign, v[1] * sign, v[2]])),
        dark,
      );
    const [cx, cy] = projectBalance(pos);
    drawing += `<circle cx="${cx}" cy="${cy}" r="3" fill="var(--balance-amber,#edc37d)"/>`;
  }
  const delta = projectBalance([offsetMm / 1000, 0, 0]).map(
    (v, i) => v - [420, 260][i],
  );
  const bat = box(d.battery, "var(--balance-battery,#a8d9d1)");
  const [bx, by] = projectBalance(d.battery.positionM),
    [cx, cy] = projectBalance(d.cg);
  const cg = `<circle r="10" fill="var(--balance-bg,#13191e)" stroke="var(--balance-amber,#edc37d)" stroke-width="2"/><path d="M-17 0H17M0-17V17" stroke="var(--balance-amber,#edc37d)" stroke-width="1.5"/><circle r="3" fill="var(--balance-amber,#edc37d)"/>`;
  return `<svg class="balance-aircraft" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 840 470" role="img" aria-label="Bronco tricopter in hover configuration. The highlighted battery and gold center of gravity move together."><g font-family="system-ui,sans-serif"><path d="M90 427H750" stroke="var(--balance-rule,#29353e)"/><text x="30" y="35" font-size="10" letter-spacing="2" fill="var(--balance-muted,#98a8b4)">BRONCO / TRICOPTER VTOL</text><text x="810" y="35" text-anchor="end" font-size="11" fill="var(--balance-muted,#98a8b4)">Isometric · hover installation</text>${drawing}<g opacity=".35" stroke-dasharray="3 3">${bat}</g><g data-balance-battery="" transform="translate(${delta.join(" ")})">${bat}<path d="M${bx - 10} ${by - 8}l14 6" stroke="var(--balance-bg,#13191e)" stroke-width="3"/></g><g transform="translate(${cx} ${cy})" opacity=".3">${cg}</g><g data-balance-cg="" transform="translate(${cx + delta[0] * d.ratio} ${cy + delta[1] * d.ratio})">${cg}</g><path d="M${bx - 5} ${by + 15}l-30 28H115" fill="none" stroke="var(--balance-battery,#a8d9d1)"/><text x="115" y="${by + 65}" font-size="12" fill="var(--balance-battery,#a8d9d1)">BATTERY · ${(d.battery.massKg * 1000).toFixed(0)} g</text><path d="M${cx + 12} ${cy + 12}l65 80h135" fill="none" stroke="var(--balance-amber,#edc37d)"/><text x="${cx + 88}" y="${cy + 113}" font-size="12" fill="var(--balance-amber,#edc37d)">CENTER OF GRAVITY</text><g transform="translate(705 410)"><path d="M0 0l-31 14m0 0l6-10m-6 10h13" fill="none" stroke="var(--balance-muted,#98a8b4)"/><text x="0" y="4" font-size="10" fill="var(--balance-muted,#98a8b4)">NOSE</text></g><text x="30" y="459" font-size="11" fill="var(--balance-muted,#98a8b4)">Geometry from the aircraft definition · translucent fuselage</text></g></svg>`;
}
export function balanceWidget(a: Aircraft, download: string) {
  const d = balanceData(a),
    p = projectBalance(d.cg);
  return `<span class="balance-lab" data-balance-lab data-ratio="${d.ratio}" data-aft="${d.aftMm}" data-cgx="${p[0]}" data-cgy="${p[1]}"><span class="balance-heading"><span><span class="balance-eyebrow">AIRCRAFT BALANCE</span><strong>Small move. Whole-aircraft effect.</strong></span><span class="balance-mass">${(d.mass * 1000).toLocaleString("en-US", { maximumFractionDigits: 0 })} <small>g assembled</small></span></span>${balanceDrawing(a)}<span class="balance-controls" hidden><label class="balance-slider-label"><span>Battery position <output data-balance-position>Original position</output></span><input type="range" min="-50" max="50" step="1" value="0" aria-label="Battery movement in millimeters" aria-valuetext="Original position"></label><span class="balance-range-labels"><span>50 mm aft</span><span>50 mm forward</span></span><button type="button" data-balance-reset>Reset position</button></span><span class="balance-result"><span><span class="balance-eyebrow">CG FROM WING LEADING EDGE</span><strong><output data-balance-aft>${d.aftMm.toFixed(1)}</output> <small>mm aft</small></strong></span><span class="balance-shift"><output data-balance-shift>Move the battery to compare</output><span class="balance-gauge" aria-hidden="true"><span data-balance-gauge style="left:${d.aftMm}%"></span><i style="left:${d.aftMm}%"></i></span><span class="balance-range-labels"><span>Nose / 0 mm</span><span>100 mm aft</span></span></span></span><span class="balance-footnote">Same parts. Same weight. Only the balance changes.<br><span>Illustrative placement; not a clearance or safe-CG check. This demo does not edit your aircraft.</span></span><a class="balance-download" href="${e(download)}" target="_blank" rel="noopener">Open static diagram ↗</a></span>`;
}
export function staticBalanceDiagram() {
  const a = parseAircraft(preset),
    d = balanceData(a);
  const drawing = balanceDrawing(a, 50).replace(
    '<svg class="balance-aircraft"',
    '<svg x="0" y="78" width="960" height="503" class="balance-aircraft"',
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="692" viewBox="0 0 960 692" role="img" aria-labelledby="title desc"><title id="title">Moving the battery changes aircraft balance</title><desc id="desc">Actual Bronco tricopter layout, an illustrative 50 millimeter battery move forward shifts CG ${(d.ratio * 50).toFixed(1)} millimeters forward. Total mass is ${(d.mass * 1000).toFixed(0)} grams.</desc><rect width="960" height="692" fill="#13191e" rx="12"/><g font-family="system-ui,sans-serif" fill="#e7edf1"><text x="34" y="35" font-size="11" letter-spacing="2" fill="#a8d9d1">RCFORGE / AIRCRAFT BALANCE</text><text x="34" y="70" font-size="26">Small move. Whole-aircraft effect.</text>${drawing}<path d="M34 581H926" stroke="#34414c"/><text x="34" y="604" font-size="14" fill="#a8d9d1">BATTERY  +50 mm forward</text><text x="450" y="604" font-size="21" fill="#edc37d">CG  +${(d.ratio * 50).toFixed(1)} mm forward</text><text x="34" y="640" font-size="13" fill="#a4b1bb">${(d.battery.massKg * 1000).toFixed(0)} g battery ÷ ${(d.mass * 1000).toFixed(0)} g aircraft × 50 mm movement. Total mass is unchanged.</text><text x="34" y="672" font-size="11" fill="#a4b1bb">Illustrative installation, not a safe-CG or clearance assessment. Try the interactive version in the RCForge docs.</text></g></svg>\n`;
}
