import { lightDiagram } from "./diagram-theme";
import { staticBalanceDiagram } from "./balance-visual";
import { hardwareIllustration as hardware } from "./hardware-illustrations";
import { componentIcon } from "../src/view/component-icon";
import { uiIcon } from "../src/view/icons";
/** Original, reproducible SVG illustrations. Wiring is logical, not a physical connector pinout.
 * Sources: docs/flysky-fs-i6.md, Arduino board docs and the checked-in bridge sketch.
 * Controller outlines and button names reuse the simulator's own drawing code.
 */
import { controllerDiagram } from "../src/view/controller-diagram";
import { keyboardDiagram } from "../src/view/keyboard-diagram";
import { buttonName, standardShortcuts } from "../src/input/presentation";

const color = {
  ink: "#f1f2f5",
  muted: "#a1a5b0",
  signal: "#eac275",
  ground: "#b2bccb",
  power: "#ed938b",
  usb: "#87c8d5",
  green: "#a5c6a7",
};
const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
const text = (
  x: number,
  y: number,
  s: string,
  size = 18,
  fill = color.ink,
  anchor = "start",
) =>
  `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" text-anchor="${anchor}">${esc(s)}</text>`;
const rect = (
  x: number,
  y: number,
  w: number,
  h: number,
  fill = "#191c22",
  stroke = "#3b404b",
  rx = 12,
) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}"/>`;
const line = (d: string, c = color.ground, arrow = false, dash = false) =>
  `<path d="${d}" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"${arrow ? ' marker-end="url(#arrow)"' : ""}${dash ? ' stroke-dasharray="8 7"' : ""}/>`;
const dot = (x: number, y: number, c = color.signal) =>
  `<circle cx="${x}" cy="${y}" r="5" fill="${c}"/>`;
const tag = (x: number, y: number, s: string, c = color.signal) =>
  rect(x, y, s.length * 9 + 24, 30, "#171b21", c, 7) +
  text(x + 12, y + 21, s, 14, c);
const block = (x: number, y: number, w: number, title: string, sub: string) =>
  rect(x, y, w, 86) +
  text(x + w / 2, y + 34, title, 21, color.ink, "middle") +
  text(x + w / 2, y + 61, sub, 14, color.muted, "middle");
const inner = (svg: string) =>
  // The runtime snippets are parsed as HTML. Standalone SVG is XML and needs
  // literal ampersands escaped, even in a caption hidden by the drawing style.
  svg
    .slice(svg.indexOf(">") + 1, svg.indexOf("</svg>"))
    .replace(/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[\da-f]+);)/gi, "&amp;");
const controller = (
  kind: string,
  style: string,
  x: number,
  y: number,
  scale: number,
) =>
  `<g class="controller" transform="translate(${x} ${y}) scale(${scale})">${inner(controllerDiagram(kind, style, true))}</g>`;
const styles = `text{font-family:Arial,Helvetica,sans-serif}.controller-shell{fill:#30343b;stroke:#9ba0ab;stroke-width:1.2}.controller-well{fill:#11141a;stroke:#555d69;stroke-width:1.2}.controller-thumb{fill:#404754;stroke:#949caa}.thumb-inset{fill:#252b34;stroke:#697181}.controller-grip{fill:#222832;stroke:#48505e}.controller-outline{fill:none;stroke:#adb4bf;stroke-width:3;stroke-linecap:round}.controller-detail,.thumb-center{fill:none;stroke:#929aa8;stroke-width:1}.gimbal-guide{stroke:#69717d;stroke-width:.6}.controller-screen{fill:#141921;stroke:#858c99}.screen-lines{stroke:#82928c;stroke-width:1.5}.device-led{fill:#b5d1a3}.controller-glyph{font-size:9px;fill:#f4f4f6;text-anchor:middle}.controller-channel-label{font-size:7px;fill:#b5bac4;text-anchor:middle}.controller-caption{display:none}.keyboard-body{fill:#101319;stroke:#414956}.keyboard-key rect{fill:#1b2028;stroke:#3b4350}.keyboard-key text{text-anchor:middle}.key-letter{font-size:12px;fill:#7e8795}.key-function{font-size:7.5px;fill:#e4e9f0}.mapped .key-letter{fill:#fff}.mapped.flight rect{fill:#273e49;stroke:#7fa7b9}.mapped.power rect{fill:#4b3e29;stroke:#d1b479}.mapped.session rect{fill:#354336;stroke:#8ab193}.mapped.view rect{fill:#3f364c;stroke:#ac97c6}`;
function svg(title: string, desc: string, height: number, body: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="${height}" viewBox="0 0 960 ${height}" role="img" aria-labelledby="title desc"><title id="title">${esc(title)}</title><desc id="desc">${esc(desc)}</desc><defs><marker id="arrow" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto-start-reverse"><path d="M0 0 8 4 0 8" fill="none" stroke="#b2bccb" stroke-width="1.5"/></marker></defs><style>${styles}</style><rect width="960" height="${height}" rx="16" fill="#111419"/>${text(32, 42, title, 26)}${text(32, 69, desc, 14, color.muted)}${body}${text(32, height - 18, "RCFORGE  /  VISUAL FIELD GUIDE", 11, "#737c89")}</svg>\n`;
}

function routes() {
  const stages = [
    {
      title: "USB simulator adapter",
      note: "The shortest route · no Arduino",
      items: [
        ["radio", "FS-i6", "Trainer OUT"],
        ["adapter", "Simulator adapter", "USB joystick / HID"],
        ["computer", "RCForge", "Find USB adapter"],
      ],
    },
    {
      title: "Receiver + Arduino",
      note: "Wireless radio · PPM or six PWM channels",
      items: [
        ["radio", "FS-i6", "Bound radio link"],
        ["receiver", "Receiver", "PPM / PWM"],
        ["arduino", "Uno / Nano", "RCF1 serial bridge"],
        ["computer", "RCForge", "Connect Arduino"],
      ],
    },
    {
      title: "Trainer output + Arduino",
      note: "Wired radio · verified PPM OUT breakout",
      items: [
        ["radio", "FS-i6", "Verified trainer OUT"],
        ["arduino", "Uno / Nano", "RCF1 serial bridge"],
        ["computer", "RCForge", "Connect Arduino"],
      ],
    },
  ] as const;
  let body = "";
  stages.forEach((row, i) => {
    const top = 102 + i * 214;
    body +=
      rect(24, top, 912, 201, "#171b20", "#2c343c", 8) +
      tag(42, top + 15, `0${i + 1}`, color.usb) +
      text(101, top + 36, row.title, 21) +
      text(918, top + 35, row.note, 13, color.muted, "end");
    const step = row.items.length === 4 ? 238 : 350,
      offset = row.items.length === 4 ? 124 : 130;
    row.items.forEach(([kind, label, sub], j) => {
      const cx = offset + j * step;
      body +=
        hardware(kind, cx - 48, top + 48, 0.8) +
        text(cx, top + 164, label, 17, color.ink, "middle") +
        text(cx, top + 185, sub, 12, color.muted, "middle");
      if (j < row.items.length - 1)
        body += line(
          `M${cx + 66} ${top + 104}h${step - 140}`,
          j === row.items.length - 2 ? color.usb : color.signal,
          true,
          i === 1 && j === 0,
        );
    });
  });
  return svg(
    "Your radio, connected to RCForge",
    "Choose a route, then follow its wiring diagram. Hardware silhouettes are not connector pinouts.",
    830,
    body +
      text(
        36,
        773,
        "Use a simulator adapter, not a firmware-update cable.",
        16,
        color.signal,
      ),
  );
}
function conditioning() {
  return svg(
    "One signal input, drawn completely",
    "Repeat this circuit for each PWM channel. PPM needs one circuit on D2.",
    385,
    block(32, 134, 190, "Source signal", "PPM OUT or PWM S") +
      line("M222 177h98", color.signal) +
      rect(320, 163, 94, 28, "#332c21", color.signal, 2) +
      text(367, 153, "1 kΩ", 18, color.signal, "middle") +
      line("M414 177H746", color.signal, true) +
      dot(520, 177) +
      text(760, 168, "Arduino input", 21) +
      text(760, 195, "D2, or D3…D7", 15, color.muted) +
      line("M520 177v52", color.signal) +
      rect(506, 229, 28, 52, "#332c21", color.signal, 2) +
      text(550, 260, "47 kΩ", 18, color.signal) +
      line("M520 281v35", color.ground) +
      line("M64 316H896", color.ground) +
      dot(520, 316, color.ground) +
      text(64, 303, "Source GND", 16, color.ground) +
      text(896, 303, "Arduino GND", 16, color.ground, "end") +
      text(
        32,
        111,
        "Logic HIGH: 3.3–5 V • LOW: near 0 V • 1 kΩ does not convert voltage.",
        15,
        color.signal,
      ),
  );
}
function ppm(trainer = false) {
  const source = trainer ? "Verified trainer breakout" : "Receiver · PPM mode";
  let body =
    tag(32, 96, "RCF_INPUT_MODE = 1") +
    text(928, 118, "CLASSIC ATmega328P UNO / NANO", 14, color.usb, "end");
  body +=
    rect(32, 155, 260, 248) +
    hardware(trainer ? "radio" : "receiver", 215, 277, 0.43) +
    text(52, 187, source, 19) +
    text(
      52,
      214,
      trainer ? "FS-i6 on its own batteries" : "FS-iA6B example · check labels",
      14,
      color.muted,
    );
  body +=
    rect(662, 155, 266, 248) +
    hardware("arduino", 860, 163, 0.43) +
    text(682, 187, "Arduino", 22) +
    text(682, 214, "USB-powered board", 14, color.muted);
  body +=
    text(52, 263, trainer ? "PPM OUT" : "PPM / CH1 S", 20, color.signal) +
    line("M292 258H355", color.signal) +
    rect(355, 244, 82, 28, "#332c21", color.signal, 2) +
    text(396, 234, "1 kΩ", 16, color.signal, "middle") +
    line("M437 258H660", color.signal, true) +
    text(682, 263, "D2", 22, color.signal);
  body +=
    dot(510, 258) +
    line("M510 258v29", color.signal) +
    rect(497, 287, 26, 32, "#332c21", color.signal, 2) +
    text(537, 308, "47 kΩ", 16, color.signal) +
    line("M510 319v21", color.ground);
  body +=
    text(52, 345, trainer ? "GND" : "−  GND", 20, color.ground) +
    line("M292 340H660", color.ground) +
    dot(510, 340, color.ground) +
    text(682, 345, "GND", 22, color.ground);
  if (!trainer)
    body +=
      text(52, 382, "+  Supply", 20, color.power) +
      line("M662 377H294", color.power, true) +
      text(682, 382, "5V *", 22, color.power);
  else body += text(52, 382, "VCC / PPM IN: unused", 16, color.power);
  body +=
    line("M795 403v49", color.usb, true) +
    block(662, 468, 266, "Computer → RCForge", "Connect Arduino · USB serial");
  body +=
    rect(32, 440, 592, 114, "#1c2027") +
    text(
      52,
      471,
      trainer
        ? "Identify PPM OUT before connecting."
        : "All six channels travel inside the PPM signal.",
      18,
      color.ink,
    ) +
    text(
      52,
      500,
      trainer
        ? "No guessed DIN pin numbers or wire colors."
        : "CH6 RUN still works; it does not need a sixth wire.",
      15,
      color.muted,
    ) +
    text(
      52,
      527,
      "PPM / iBUS / S.BUS are different protocols.",
      15,
      color.signal,
    );
  body += text(
    32,
    589,
    trainer
      ? "Join signal grounds. Leave transmitter VCC disconnected."
      : "* Only for a bare receiver rated for 5 V within the board / USB current budget.",
    15,
    color.power,
  );
  body += text(
    32,
    616,
    trainer
      ? "Verify six channels, pulse levels and CH6 behavior for your radio."
      : "No ESC, BEC, separate receiver supply, motors or servos on this bench circuit.",
    14,
    color.muted,
  );
  return svg(
    trainer ? "Trainer output → Arduino" : "Receiver PPM → Arduino",
    "Logical wiring, not a connector-face pinout. Read labels on your exact board and receiver.",
    658,
    body,
  );
}
export const pwmPins = [
  { channel: 1, pin: 2, action: "Roll" },
  { channel: 2, pin: 3, action: "Pitch" },
  { channel: 3, pin: 4, action: "Throttle" },
  { channel: 4, pin: 5, action: "Yaw" },
  { channel: 5, pin: 6, action: "Shortcut" },
  { channel: 6, pin: 7, action: "RUN guard" },
] as const;
function pwm() {
  let body =
    tag(32, 96, "RCF_INPUT_MODE = 2") +
    text(930, 118, "ALL SIX SIGNAL WIRES REQUIRED", 14, color.signal, "end");
  body +=
    rect(32, 149, 240, 482) +
    text(52, 184, "Receiver · PWM", 21) +
    text(52, 210, "CH1 PPM disabled", 14, color.muted) +
    rect(706, 149, 222, 482) +
    text(726, 184, "Uno / Nano", 21) +
    text(726, 210, "Classic ATmega328P", 14, color.muted);
  pwmPins.forEach(({ channel, pin, action }, i) => {
    const y = 258 + i * 52;
    body +=
      text(52, y + 5, `CH${channel} S`, 19, color.signal) +
      text(150, y + 5, action, 14, color.muted) +
      line(`M272 ${y}H379`, color.signal) +
      rect(379, y - 13, 76, 26, "#332c21", color.signal, 2) +
      text(417, y + 5, "1 kΩ", 15, color.signal, "middle") +
      line(`M455 ${y}H705`, color.signal, true) +
      dot(524, y) +
      line(`M524 ${y}v12`, color.ground) +
      rect(514, y + 12, 20, 16, "#242a32", color.ground, 1) +
      line(`M524 ${y + 28}v7h30m-8 0h16m-13 4h10m-8 4h6`, color.ground) +
      text(586, y + 39, "47 kΩ · GND", 12, color.ground) +
      text(726, y + 5, `D${pin}`, 22, color.signal);
  });
  body +=
    text(52, 580, "One − pin", 19, color.ground) +
    line("M272 575H706", color.ground) +
    text(726, 580, "GND", 20, color.ground) +
    text(52, 617, "One + pin", 19, color.power) +
    line("M706 612H274", color.power, true) +
    text(726, 617, "5V *", 20, color.power);
  body +=
    text(
      32,
      665,
      "* Bare receiver rated for 5 V only. No other supply, ESC, motor or servo attached.",
      15,
      color.power,
    ) +
    text(
      32,
      691,
      "Every pulldown returns to common GND. Leave D0 / RX and D1 / TX free for USB serial.",
      14,
      color.muted,
    ) +
    text(
      32,
      717,
      "USB data cable → computer → RCForge → Controllers → RC transmitter → Connect Arduino",
      15,
      color.usb,
    );
  return svg(
    "Receiver PWM → Arduino",
    "One wire per channel. Each input gets its own series resistor and pulldown.",
    763,
    body,
  );
}
function keyboard() {
  const body = `<g transform="translate(30 116) scale(1.235)">${inner(keyboardDiagram())}</g>`;
  return svg(
    "Keyboard flight controls",
    "Highlighted keys fly the aircraft. Click the flight view before using shortcuts.",
    553,
    body +
      tag(32, 453, "FLIGHT", color.usb) +
      tag(182, 453, "POWER", color.signal) +
      tag(325, 453, "SESSION", color.green) +
      tag(489, 453, "VIEW / WALK", "#bba1d8") +
      text(
        32,
        516,
        "Space raises power · Shift lowers power · Releasing holds power · X cuts power",
        18,
      ),
  );
}
function pads() {
  let body =
    controller("gamepad", "playstation", 36, 121, 1) +
    controller("gamepad", "xbox", 523, 121, 1) +
    text(236, 110, "PlayStation layout", 20, color.ink, "middle") +
    text(723, 110, "Xbox layout", 20, color.ink, "middle");
  const actions = [
    ["toggle", "Start / pause"],
    ["reset", "Reset"],
    ["camera", "Cycle camera"],
    ["response", "Cycle rates"],
    ["settings", "Open settings"],
  ] as const;
  actions.forEach(([action, label], i) => {
    const index = Number(String(standardShortcuts[action]).slice(1)),
      y = 439 + i * 36;
    body +=
      text(48, y, buttonName(index, "playstation", true), 17, color.signal) +
      text(310, y, label, 17, color.ink, "end") +
      text(533, y, buttonName(index, "xbox", true), 17, color.signal) +
      text(893, y, label, 17, color.ink, "end");
  });
  body +=
    line("M480 113v490", "#363d48") +
    text(
      32,
      633,
      "Default flight mapping: left stick = yaw / throttle · right stick = roll / pitch.",
      18,
      color.usb,
    ) +
    text(
      32,
      662,
      "Custom mappings override this. A spring-centered throttle stick may mean 50% power.",
      15,
      color.signal,
    );
  return svg(
    "Gamepad buttons, by name",
    "Standard browser gamepad layout. Use standard shortcuts in Controllers; saved bindings are retained.",
    707,
    body,
  );
}
function radio() {
  return svg(
    "RC transmitter · Mode 2",
    "Stick functions after mapping. Receiver channels are separate from the radio’s menu buttons.",
    587,
    controller("transmitter", "generic", 240, 135, 1.2) +
      text(122, 146, "LEFT STICK", 16, color.usb) +
      text(122, 180, "↑ More power", 20) +
      text(122, 214, "↓ Less power", 20) +
      text(122, 248, "← / → Yaw", 20) +
      line("M214 268h148", color.usb) +
      text(680, 146, "RIGHT STICK", 16, color.usb) +
      text(680, 180, "↑ Nose down", 20) +
      text(680, 214, "↓ Nose up", 20) +
      text(680, 248, "← / → Roll", 20) +
      line("M675 268H592", color.usb) +
      tag(32, 453, "CH5 · optional shortcut", color.usb) +
      tag(504, 453, "CH6 · RUN / failsafe", color.signal) +
      text(
        32,
        519,
        "Reserve CH6 for RUN. On wireless setups, set receiver failsafe CH6 LOW.",
        18,
        color.signal,
      ) +
      text(
        32,
        548,
        "An FS-i6 menu key is not a transmitted button. Other stick modes must be mapped explicitly.",
        14,
        color.muted,
      ),
  );
}
function workflow(calibration = false) {
  let body = "";
  const steps = calibration
    ? [
        ["01", "Assign", "Move one axis", "Detect → Reverse"],
        ["02", "Center", "Release roll / pitch / yaw", "Capture neutral"],
        ["03", "Sweep", "Reach both endpoints", "Include low / high throttle"],
        ["04", "Verify", "Centers + power range", "Save → test signal loss"],
      ]
    : [
        ["01", "Build", "Airframe + components", "Weights, CG, controls"],
        [
          "02",
          "Check",
          "Map input + test surfaces",
          "Inspect direction & travel",
        ],
        ["03", "Fly", "Choose launch + viewpoint", "Pilot · Chase · FPV"],
        ["04", "Keep", "Save a named version", "Compare → export JSON"],
      ];
  steps.forEach((s, i) => {
    const x = 24 + i * 235;
    body +=
      rect(x, 111, 208, 209) +
      tag(x + 17, 130, s[0], i === 3 ? color.green : color.usb) +
      text(x + 17, 203, s[1], 27) +
      text(x + 17, 244, s[2], 14, color.muted) +
      text(x + 17, 281, s[3], 12, color.ink);
    if (i < 3) body += line(`M${x + 211} 216h20`, color.usb, true);
  });
  body += text(
    32,
    360,
    calibration
      ? "Reconnect makes input available. Start / resume is always a deliberate action."
      : "Editing the aircraft changes a local draft. Apply validates it; Export makes it portable.",
    17,
    color.signal,
  );
  return svg(
    calibration
      ? "Calibrate in four passes"
      : "From a build to a repeatable flight",
    calibration
      ? "Keyboard needs no calibration. For analog hardware, follow these steps in Controllers."
      : "Use the same aircraft definition in the editor, simulator and command-line experiments.",
    404,
    body,
  );
}
function balance() {
  return staticBalanceDiagram();
}
function vtolLayout() {
  let body =
    rect(24, 104, 546, 422, "#171c21", "#303941", 8) +
    rect(586, 104, 350, 422, "#171c21", "#303941", 8);
  body +=
    text(44, 133, "HOVER / TOP VIEW", 12, color.muted) +
    text(606, 133, "REAR YAW / LOOKING FORWARD", 12, color.muted);
  body += `<g stroke="#9eabb3" stroke-width="1.5"><path d="M280 168q15-28 30 0l15 160-30 20-30-20Z" fill="#47575f"/><path d="M93 256h404v47H93Z" fill="#8e999d"/><path d="M176 245h16v206h-16Zm222 0h16v206h-16Z" fill="#6f7c83"/><path d="m184 451 111-74 111 74-8 12-103-65-103 65Z" fill="#808d93"/><path d="M290 310h10v67h-10Z" fill="#b49d73"/></g>`;
  [
    [184, 220, "L"],
    [406, 220, "R"],
    [295, 369, "REAR"],
  ].forEach(([x, y, label]) => {
    body +=
      `<circle cx="${x}" cy="${y}" r="48" fill="#87c8d50a" stroke="#6f9ca5" stroke-dasharray="5 5"/><path d="M${Number(x) - 42} ${y}h84" stroke="#b3c2c9" stroke-width="7" stroke-linecap="round"/>` +
      dot(Number(x), Number(y), color.signal);
  });
  body += text(
    295,
    484,
    "Front pair: together, vertical → forward",
    16,
    color.ink,
    "middle",
  );
  body +=
    line("M716 226q42-37 87 0", color.signal, true) +
    text(760, 194, "±20° yaw lean", 17, color.signal, "middle");
  body +=
    `<path d="M668 388h185v15H668Z" fill="#ad956e" stroke="#d2bd98"/><path d="M712 383v-40h80v40" fill="none" stroke="#bd643f" stroke-width="9"/><g transform="rotate(-20 752 350)"><path d="M725 347h54v-24h-54Z" fill="#d36b3e"/><rect x="735" y="274" width="34" height="49" rx="5" fill="#30383e" stroke="#adbac0"/><path d="M738 279h28M736 316h32" stroke="#d77b40" stroke-width="7"/><path d="M752 252v22M680 257h144" stroke="#b7c4cb" stroke-width="5" stroke-linecap="round"/></g>` +
    dot(752, 350, color.signal) +
    line("M759 353h79v56", color.signal) +
    text(
      757,
      433,
      "Longitudinal hinge + separate servo",
      13,
      color.muted,
      "middle",
    );
  body +=
    text(44, 558, "RDS3115MG × 2", 19) +
    text(44, 583, "Front conversion · 0–90°", 14, color.muted) +
    text(350, 558, "MG996R · provisional", 19) +
    text(350, 583, "Rear yaw · motor leans sideways", 14, color.muted) +
    text(666, 558, "Wing-borne cruise", 19) +
    text(666, 583, "Front rotors forward · rear off", 14, color.muted);
  return svg(
    "Three rotors. Three tilt servos.",
    "Bronco-sized experimental layout. Geometry is reconstructed from references, not a manufacturing drawing.",
    637,
    body,
  );
}
export function documentationDiagrams() {
  const diagrams = new Map(
    Object.entries({
      "diagram-radio-paths.svg": routes(),
      "diagram-input-conditioning.svg": conditioning(),
      "diagram-receiver-ppm.svg": ppm(),
      "diagram-trainer-ppm.svg": ppm(true),
      "diagram-receiver-pwm.svg": pwm(),
      "diagram-keyboard.svg": keyboard(),
      "diagram-gamepads.svg": pads(),
      "diagram-rc-mode2.svg": radio(),
      "diagram-calibration.svg": workflow(true),
      "diagram-workflow.svg": workflow(),
      "diagram-mass-cg.svg": balance(),
      "diagram-vtol-layout.svg": vtolLayout(),
    }),
  );
  for (const [name, svg] of [...diagrams])
    diagrams.set(name.replace(/\.svg$/, "-light.svg"), lightDiagram(svg));
  return diagrams;
}
