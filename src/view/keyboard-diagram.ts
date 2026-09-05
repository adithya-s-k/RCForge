/** Physical key positions with a second line naming each flight command. */
export function keyboardDiagram() {
  const actions: Record<string, [string, string]> = {
    KeyQ: ["Yaw L", "flight"],
    KeyE: ["Yaw R", "flight"],
    KeyW: ["Pitch ↓", "flight"],
    KeyS: ["Pitch ↑", "flight"],
    KeyA: ["Roll L", "flight"],
    KeyD: ["Roll R", "flight"],
    ArrowUp: ["Pitch ↓", "flight"],
    ArrowDown: ["Pitch ↑", "flight"],
    ArrowLeft: ["Roll L", "flight"],
    ArrowRight: ["Roll R", "flight"],
    Space: ["Power +", "power"],
    ShiftLeft: ["Power −", "power"],
    ShiftRight: ["Power −", "power"],
    KeyX: ["Cut power", "power"],
    Enter: ["Start", "session"],
    KeyP: ["Pause", "session"],
    KeyR: ["Restart", "session"],
    KeyV: ["Camera", "view"],
    KeyC: ["Rates", "flight"],
    KeyF: ["Locate", "view"],
    KeyI: ["Walk", "view"],
    KeyJ: ["Walk", "view"],
    KeyK: ["Walk", "view"],
    KeyL: ["Walk", "view"],
  };
  const key = (code: string, label: string, x: number, y: number, w = 40) => {
    const action = actions[code];
    return `<g class="keyboard-key ${action ? "mapped " + action[1] : ""}" data-key-code="${code}"><title>${label}${action ? ": " + action[0] : ""}</title><rect x="${x}" y="${y}" width="${w}" height="40" rx="5"/><text class="key-letter" x="${x + w / 2}" y="${y + 17}">${label}</text>${action ? `<text class="key-function" x="${x + w / 2}" y="${y + 31}">${action[0]}</text>` : ""}</g>`;
  };
  let keys = key("Escape", "Esc", 16, 16);
  "1234567890"
    .split("")
    .forEach((v, i) => (keys += key("Digit" + v, v, 60 + i * 44, 16)));
  keys += key("Backspace", "Backspace", 500, 16, 76);
  keys += key("Tab", "Tab", 16, 60, 52);
  "QWERTYUIOP"
    .split("")
    .forEach((v, i) => (keys += key("Key" + v, v, 72 + i * 44, 60)));
  keys +=
    key("BracketLeft", "[", 512, 60, 30) +
    key("BracketRight", "]", 546, 60, 30);
  keys += key("CapsLock", "Caps", 16, 104, 64);
  "ASDFGHJKL"
    .split("")
    .forEach((v, i) => (keys += key("Key" + v, v, 84 + i * 44, 104)));
  keys += key("Enter", "Enter", 480, 104, 96);
  keys += key("ShiftLeft", "Shift", 16, 148, 86);
  "ZXCVBNM"
    .split("")
    .forEach((v, i) => (keys += key("Key" + v, v, 106 + i * 44, 148)));
  keys += key("ShiftRight", "Shift", 414, 148, 162);
  keys +=
    key("ControlLeft", "Ctrl", 16, 192, 60) +
    key("AltLeft", "Alt", 80, 192, 56) +
    key("Space", "Space", 140, 192, 312) +
    key("AltRight", "Alt", 456, 192, 56) +
    key("ControlRight", "Ctrl", 516, 192, 60);
  keys +=
    key("ArrowUp", "↑", 628, 148) +
    key("ArrowLeft", "←", 584, 192) +
    key("ArrowDown", "↓", 628, 192) +
    key("ArrowRight", "→", 672, 192);
  return `<svg viewBox="0 0 728 250" role="img" aria-label="Keyboard with highlighted flight controls. Press keys to see live input."><rect class="keyboard-body" x="2" y="2" width="724" height="246" rx="12"/>${keys}</svg><div class="keyboard-color-legend"><span class="flight">Flight</span><span class="power">Power</span><span class="session">Session</span><span class="view">Walk</span><span>Press a key to light it up</span></div>`;
}
