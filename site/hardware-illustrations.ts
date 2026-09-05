/** Original vector illustrations; connectors are symbolic, never pinout drawings. */
export function hardwareIllustration(
  kind: "radio" | "receiver" | "arduino" | "adapter" | "computer",
  x: number,
  y: number,
  scale = 1,
) {
  const stroke =
    'stroke="#9aa6af" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"';
  const drawings = {
    radio: `<path d="M54 24V4h12v20M32 26V16M88 26V16" fill="none" ${stroke}/><path d="M25 25h70l13 18-5 58-18 9H35l-18-9-5-58Z" fill="#272c31" ${stroke}/><path d="M20 48 28 90M100 48l-8 42" stroke="#11161a" stroke-width="8" stroke-linecap="round"/><rect x="43" y="80" width="34" height="18" rx="2" fill="#172725" stroke="#789489"/><path d="M48 86h24m-24 6h17" stroke="#7da497"/>${[37, 83].map((cx) => `<circle cx="${cx}" cy="57" r="17" fill="#10171c" ${stroke}/><path d="M${cx - 13} 57h26m-13-13v26" stroke="#3d4c56"/><circle cx="${cx}" cy="57" r="5" fill="#b7c2c8"/>`).join("")}<path d="M49 34h22" stroke="#bcc3c8" stroke-width="3"/><circle cx="60" cy="72" r="2" fill="#bad49a"/>`,
    receiver: `<path d="M40 24 25 8 7 8m74 16L91 8h21" fill="none" ${stroke}/><rect x="22" y="24" width="76" height="72" rx="7" fill="#252c31" ${stroke}/><rect x="31" y="33" width="40" height="32" rx="2" fill="#182421"/><path d="M36 40h25m-25 7h19m-19 7h25" stroke="#829e8e"/><circle cx="39" cy="78" r="3" fill="#a9c991"/>${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="79" y="${35 + i * 8}" width="12" height="4" fill="#b6a164"/>`).join("")}`,
    arduino: `<path d="M17 19h77l9 9v76H17Z" fill="#243c3c" ${stroke}/><rect x="12" y="33" width="25" height="25" rx="2" fill="#8c969b"/><rect x="10" y="39" width="15" height="13" fill="#222a30"/><rect x="20" y="74" width="22" height="16" rx="3" fill="#161d21"/><rect x="52" y="50" width="24" height="30" rx="2" fill="#151c20"/>${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<rect x="${29 + i * 8}" y="26" width="4" height="6" fill="#b8a15c"/><rect x="${29 + i * 8}" y="93" width="4" height="6" fill="#b8a15c"/>`).join("")}<circle cx="90" cy="79" r="3" fill="#bdcf8a"/><path d="M45 45h39M45 84h40" stroke="#477063"/><circle cx="94" cy="39" r="3" fill="#121b20"/><text x="62" y="42" fill="#baccc8" text-anchor="middle" font-size="8">UNO / NANO</text>`,
    adapter: `<path d="M17 66C-3 66 0 30 18 30h21M84 66h24" fill="none" ${stroke}/><rect x="29" y="43" width="61" height="37" rx="7" fill="#30353a" ${stroke}/><rect x="39" y="17" width="16" height="25" rx="2" fill="#252e36" ${stroke}/><circle cx="47" cy="26" r="5" fill="#131a1f"/><path d="M45 23v2m4 0v2m-4 2v2" stroke="#afaf9d"/><rect x="90" y="51" width="24" height="20" rx="2" fill="#9fa7aa"/><path d="M98 56h9m-9 9h9" stroke="#30393d" stroke-width="3"/><path d="M40 55h30m-30 11h19" stroke="#9bb8b7" stroke-width="2"/>`,
    computer: `<rect x="13" y="17" width="95" height="65" rx="4" fill="#222a31" ${stroke}/><rect x="19" y="23" width="83" height="51" rx="1" fill="#263a40"/><path d="M19 49h83v25H19Z" fill="#3f5042"/><path d="m45 74 14-25h5l14 25" fill="#656763"/><path d="m60 69 1-7m0-4 1-4" stroke="#d2cdb3"/><path d="m64 35 2 6 9 4-10-1-1 4-1-4-10 1 9-4Z" fill="#e0e4df"/><path d="M14 82 4 95h113l-9-13Z" fill="#3e464b" ${stroke}/><path d="M45 95h31" stroke="#b4bec2"/>`,
  };
  return `<g transform="translate(${x} ${y}) scale(${scale})">${drawings[kind]}</g>`;
}
