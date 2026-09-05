/** Small, shared outline icons. Labels belong to the surrounding control. */
const paths = {
  github:
    '<path d="M9 19c-4 1-4-2-6-2m12 5v-4a3.5 3.5 0 0 0-1-2.8c3.3-.4 6.8-1.6 6.8-7.2a5.6 5.6 0 0 0-1.5-3.9A5.2 5.2 0 0 0 19.2.2S18 .0 15.2 1.7a13.4 13.4 0 0 0-7.2 0C5.2 0 4 .2 4 .2a5.2 5.2 0 0 0-.1 4A5.6 5.6 0 0 0 2.4 8c0 5.6 3.5 6.8 6.8 7.2A3.5 3.5 0 0 0 8.2 18v4" transform="translate(1 1) scale(.9)"/>',
  history: '<path d="M3 11a9 9 0 1 1 2.6 7M3 4v7h7M12 7v5l3 2"/>',
  fly: '<path d="m12 3 2 7 7 5v2l-8-2v5l-1 1-1-1v-5l-8 2v-2l7-5Z"/>',
  aircraft:
    '<path d="M4 20 20 4M4 4h6M4 4v6M20 20h-6M20 20v-6M8 12l4 4M12 8l4 4"/>',
  controllers: '<path d="M5 4v16M12 4v16M19 4v16M2 8h6M9 16h6M16 10h6"/>',
  experiments:
    '<path d="M4 4v16h16M7 14l4-5 4 3 5-7"/><circle cx="11" cy="9" r="1"/>',
  keyboard:
    '<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10"/>',
  gamepad:
    '<path d="M7 7h10q3 0 4 4l1 6q0 4-3 2l-4-3H9l-4 3q-3 2-3-2l1-6q1-4 4-4Z"/><path d="M6 10v4M4 12h4M16 11h.01M19 13h.01"/>',
  joystick: '<path d="M9 15 8 7q0-4 4-4t4 4l-1 8M5 16h14l3 5H2ZM10 7h4"/>',
  transmitter:
    '<rect x="4" y="6" width="16" height="15" rx="3"/><path d="M12 6V2M7 6V4M17 6V4M10 18h4"/><circle cx="8" cy="12" r="2"/><circle cx="16" cy="12" r="2"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2l-1.5 1v1M12 16h.01"/>',
} as const;

export function uiIcon(name: keyof typeof paths) {
  return `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
}
