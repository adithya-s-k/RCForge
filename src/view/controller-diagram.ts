import { keyboardDiagram, type KeyboardLayout } from "./keyboard-diagram";
import { buttonName } from "../input/presentation";

const well = (x: number, y: number, radius: number) =>
  `<circle cx="${x}" cy="${y}" r="${radius}" class="controller-well"/>`;

/** Anchors travel with the SVG, so live input never relies on a second layout. */
function gimbal(
  x: number,
  y: number,
  index: number,
  rc: boolean,
  style = "generic",
  standard = true,
) {
  return `<g>${well(x, y, rc ? 43 : 29)}<circle cx="${x}" cy="${y}" r="${rc ? 36 : 24}" class="controller-detail"/>
    <path d="M${x - 32} ${y}h64M${x} ${y - 32}v64" class="gimbal-guide"/>
    <g data-pad-stick="${index}" data-stick-x="${x}" data-stick-y="${y}" transform="translate(${x} ${y})">
      <g ${rc ? "" : `data-pad-button="${10 + index}"`}>
        <title>${rc ? (index ? "Roll and pitch" : "Yaw and throttle") : buttonName(10 + index, style, standard)}</title>
        <circle r="${rc ? 13 : 19}" class="controller-thumb"/>
        <circle r="${rc ? 8 : 14}" class="thumb-inset"/>
        ${rc ? '<path d="M-3-3 3 3M-3 3 3-3" class="controller-detail"/>' : '<path d="M-6 0h12M0-6v12" class="thumb-center"/>'}
      </g>
    </g></g>`;
}

export function controllerDiagram(
  kind: string,
  style: string,
  standard: boolean,
  keyboard: KeyboardLayout = {},
) {
  if (kind === "keyboard") return keyboardDiagram(keyboard);
  const rc = kind === "transmitter",
    stick = kind === "joystick";
  let body: string;
  if (rc) {
    body = `<g class="transmitter-face">
      <path d="M194 30V9q0-5 6-5t6 5v21" class="controller-shell"/>
      <path d="M152 38V25q48-12 96 0v13" class="controller-outline"/>
      <path d="M102 37q98-12 196 0l25 24 9 38-10 106q-2 11-14 17l-27 12H119l-27-12q-12-6-14-17L68 99l9-38Z" class="controller-shell"/>
      <path d="m78 88 12-9 6 23-4 82 15 24-17-8-12-18-5-72Zm244 0-12-9-6 23 4 82-15 24 17-8 12-18 5-72Z" class="controller-grip"/>
      <path d="M80 113l9 3m-9 10 8 3m-7 10 7 3m-6 10 6 3m-5 10 5 3M320 113l-9 3m9 10-8 3m7 10-7 3m6 10-6 3m5 10-5 3" class="controller-detail"/>
      <path d="M101 48 97 26m35 17-3-23m139 23 3-23m28 28 4-22" class="controller-outline"/>
      <path d="M93 26h9m22-6h10m132 0h10m22 6h9" class="controller-detail"/>
      <text x="103" y="58" class="controller-channel-label">A</text><text x="142" y="53" class="controller-channel-label">B</text>
      <text x="254" y="53" class="controller-channel-label">C</text><text x="295" y="58" class="controller-channel-label">D</text>
      <circle cx="185" cy="56" r="9" class="controller-well"/><circle cx="215" cy="56" r="9" class="controller-well"/>
      <path d="M185 50v6m30-6v6" class="controller-outline"/>
      <text x="177" y="77" class="controller-channel-label">VRA</text><text x="207" y="77" class="controller-channel-label">VRB</text>
      ${gimbal(128, 119, 0, true)}${gimbal(272, 119, 1, true)}
      <path d="M176 103v34m48-34v34M112 169h32m112 0h32" class="controller-outline"/>
      <path d="M173 120h6m42 0h6M128 166v6m144-6v6" class="controller-detail"/>
      <text x="128" y="183" text-anchor="middle" class="controller-channel-label">YAW · POWER</text>
      <text x="272" y="183" text-anchor="middle" class="controller-channel-label">ROLL · PITCH</text>
      <path d="M193 98h14v37h-14Z" class="controller-grip"/>
      <path d="M195 109h10m-10 4h10m-10 4h10" class="controller-detail"/>
      <circle cx="200" cy="145" r="3" class="device-led"/>
      <rect x="151" y="188" width="98" height="36" rx="3" class="controller-well"/>
      <rect x="157" y="193" width="86" height="25" rx="2" class="controller-screen"/>
      <text x="200" y="204" text-anchor="middle" class="controller-channel-label">STICK MONITOR</text>
      <path d="M176 210h48" class="screen-lines"/>
      <rect x="128" y="194" width="14" height="7" rx="2" class="controller-well"/><rect x="128" y="210" width="14" height="7" rx="2" class="controller-well"/>
      <rect x="258" y="194" width="14" height="7" rx="2" class="controller-well"/><rect x="258" y="210" width="14" height="7" rx="2" class="controller-well"/>
      <path d="M117 228h166" class="controller-detail"/>
      </g>`;
  } else if (stick) {
    body = `<path d="M110 175h180l31 43q4 10-10 10H89q-14 0-10-10Z" class="controller-shell"/>
      <ellipse cx="200" cy="187" rx="51" ry="21" class="controller-well"/>
      <ellipse cx="200" cy="183" rx="32" ry="13" class="controller-grip"/>
      <g data-joystick-live><path d="m181 182-9-79-13-38q-3-12 5-24l15-20h34q22 2 17 27l-12 57-2 76Z" class="controller-shell"/>
      <path d="m175 86 31 6-4 74-15 0M177 108l25 5M179 123l22 5M181 138l19 5" class="controller-detail"/>
      <g data-pad-button="0"><title>Button 1</title><rect x="182" y="31" width="28" height="21" rx="7" class="controller-well"/><text x="196" y="45" class="controller-glyph">1</text></g>
      <g data-pad-button="1"><title>Button 2</title><circle cx="216" cy="64" r="9" class="controller-well"/><text x="216" y="67" class="controller-glyph">2</text></g></g>
      <path d="M107 203h32m-23-6v12" class="controller-outline"/>
      <text x="257" y="209" class="controller-channel-label">FLIGHT STICK</text>`;
  } else {
    const xbox = style === "xbox";
    const label = (i: number) =>
      standard && style === "generic" && i < 8
        ? ["S", "E", "W", "N", "LB", "RB", "LT", "RT"][i]
        : standard
          ? i >= 12 && i <= 15
            ? ["↑", "↓", "←", "→"][i - 12]
            : i === 8
              ? "▱"
              : i === 9
                ? "≡"
                : i === 16
                  ? style === "playstation"
                    ? "PS"
                    : xbox
                      ? "X"
                      : "⌂"
                  : buttonName(i, style, true).split(" ")[0]
          : String(i + 1);
    const button = (i: number, x: number, y: number, shape: string) =>
      `<g data-pad-button="${i}"><title>${buttonName(i, style, standard)}</title>${shape}<text x="${x}" y="${y + 3}" class="controller-glyph">${label(i)}</text></g>`;
    body = `<path d="M91 48q-33-10-51 44l-25 101q-7 33 17 34 12 2 26-17l44-43q15-7 36 0h124q21-7 36 0l44 43q14 19 26 17 24-1 17-34L360 92q-18-54-51-44Z" class="controller-shell"/>
      <path d="m84 62-25 47-22 92m279-139 25 47 22 92" class="controller-detail"/>
      <path d="M139 119q61-13 122 0l-8 47H147Z" class="controller-grip"/>
      ${[4, 5, 6, 7]
        .map((i) => {
          const x = i % 2 ? 305 : 95,
            y = i < 6 ? 43 : 20;
          return button(
            i,
            x,
            y,
            `<rect x="${x - 26}" y="${y - 8}" width="52" height="16" rx="6" class="controller-well"/>`,
          );
        })
        .join("")}
      ${style !== "playstation" ? '<path d="M166 62h68" class="controller-detail"/>' : `<g data-pad-button="17"><title>${standard ? "Touchpad" : "Button 18"}</title><rect x="156" y="58" width="88" height="44" rx="7" class="controller-well"/><path d="M163 64h74" class="controller-detail"/></g>`}
      ${gimbal(xbox ? 94 : 146, xbox ? 100 : 148, 0, false, style, standard)}${gimbal(254, 148, 1, false, style, standard)}
      ${[
        [314, 125],
        [338, 101],
        [290, 101],
        [314, 77],
      ]
        .map(([x, y], i) => button(i, x, y, well(x, y, 13)))
        .join("")}
      ${button(8, 137, 78, well(137, 78, 9))}${button(9, 263, 78, well(263, 78, 9))}${button(16, 200, xbox ? 84 : 124, well(200, xbox ? 84 : 124, 10))}
      ${[
        [0, -19],
        [0, 19],
        [-19, 0],
        [19, 0],
      ]
        .map(([dx, dy], i) => {
          const x = (xbox ? 146 : 88) + dx,
            y = (xbox ? 155 : 104) + dy;
          return button(
            i + 12,
            x,
            y,
            `<rect x="${x - 9}" y="${y - 9}" width="18" height="18" rx="4" class="controller-well"/>`,
          );
        })
        .join("")}
      <path d="M185 151h30m-25 6h20" class="controller-detail"/>`;
  }
  const caption = rc
    ? "MAPPED STICKS"
    : stick
      ? "LIVE INPUT"
      : standard
        ? "PHYSICAL STICKS & BUTTONS"
        : "CUSTOM USB MAPPING";
  body += `<text x="200" y="251" class="controller-caption">${caption}</text>`;
  return `<svg viewBox="0 0 400 260" role="img" aria-label="${rc ? "RC transmitter" : stick ? "Flight joystick" : style + " gamepad"} input diagram">${body}</svg>`;
}
