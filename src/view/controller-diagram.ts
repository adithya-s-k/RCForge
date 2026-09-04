import { keyboardDiagram } from "./keyboard-diagram";
import { buttonName } from "../input/presentation";
export function controllerDiagram(
  kind: string,
  style: string,
  standard: boolean,
) {
  const rc = kind === "transmitter",
    stick = kind === "joystick",
    keyboard = kind === "keyboard";
  const circle = (x: number, y: number, r: number) =>
    `<circle cx="${x}" cy="${y}" r="${r}" class="controller-well"/>`;
  if (keyboard) return keyboardDiagram();
  let body = rc
    ? `<path d="M170 30V8h20v22M70 35h220l20 175H50Z" class="controller-shell"/><rect x="140" y="145" width="80" height="40" rx="5" class="controller-well"/><text x="180" y="170">RC</text><path d="M85 40V20m30 20V15m130 25V15m30 25V20" class="controller-outline"/>`
    : stick
      ? `<path d="M90 180h180l30 35H60ZM165 170V70q-25-60 10-55h30q30 5 10 60l-15 95Z" class="controller-shell"/>`
      : `<path d="M85 45Q55 38 42 77L15 174Q8 226 45 213L100 158H260l55 55Q350 226 344 174L318 77Q305 38 275 45Z" class="controller-shell"/><rect x="137" y="54" width="86" height="46" rx="8" class="controller-well"/>`;
  const left = rc ? [105, 100] : style === "xbox" ? [85, 95] : [130, 143];
  const right = rc ? [255, 100] : [230, 143];
  if (!stick)
    body += [left, right]
      .map(
        ([x, y], i) =>
          `${circle(x, y, 31)}<path d="M${x - 24} ${y}h48M${x} ${y - 24}v48" class="gimbal-guide"/><g data-pad-stick="${i}" transform="translate(${x} ${y})"><circle r="15" class="controller-thumb"/></g>`,
      )
      .join("");
  if (rc)
    body += `<text x="105" y="61" class="controller-channel-label">YAW / POWER</text><text x="255" y="61" class="controller-channel-label">ROLL / PITCH</text><path d="M155 157h50m-50 9h50m-50 9h32" class="gimbal-guide"/>`;
  if (stick)
    body += `<g data-joystick-live><circle cx="186" cy="51" r="16" class="controller-thumb"/><circle cx="186" cy="44" r="5" class="controller-well"/></g><text x="180" y="197">ROLL / PITCH</text>`;
  if (!rc && !stick) {
    const locations = [
      [285, 117],
      [308, 94],
      [262, 94],
      [285, 71],
      [85, 38],
      [275, 38],
      [85, 16],
      [275, 16],
      [121, 75],
      [239, 75],
      [130, 143],
      [230, 143],
      [78, 76],
      [78, 114],
      [59, 95],
      [97, 95],
      [180, 122],
    ];
    body += locations
      .map(([x, y], i) => {
        if (i === 10 || i === 11) return "";
        if (style === "xbox" && i >= 12 && i <= 15) {
          x += 52;
          y += 48;
        }
        const label = standard
          ? i >= 12 && i <= 15
            ? ["↑", "↓", "←", "→"][i - 12]
            : buttonName(i, style, true).split(" ")[0]
          : String(i + 1);
        return `<g data-pad-button="${i}"><title>${buttonName(i, style, standard)}</title>${circle(x, y, i < 4 ? 11 : 9)}<text x="${x}" y="${y + 3}" class="controller-glyph">${label}</text></g>`;
      })
      .join("");
  }
  body += `<text x="180" y="238">${rc ? "Mapped sticks · yaw / power · roll / pitch" : stick ? "Flight stick · verify axes in live controls" : standard ? "Live buttons and physical sticks" : "Custom device · button numbering varies"}</text>`;
  return `<svg viewBox="0 0 360 250" role="img" aria-label="${rc ? "RC transmitter" : stick ? "Flight joystick" : style + " gamepad"} input diagram">${body}</svg>`;
}
