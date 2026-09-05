/** Theme the original documentation drawing palette, retaining physical device colors.
 * Generate actual SVG assets: downloads and zoom views use the same readable artwork.
 * No raster inversion, runtime SVG injection or changes to frozen release assets.
 */
export function lightDiagram(svg: string): string {
  const palette: Record<string, string> = {
    "#111419": "#f7f9fb",
    "#191c22": "#edf1f5",
    "#171b21": "#edf1f5",
    "#171b20": "#edf1f5",
    "#171c21": "#edf1f5",
    "#1c2027": "#edf1f5",
    "#242a32": "#e1e7ee",
    "#332c21": "#f6ecd8",
    "#3b404b": "#c2cbd5",
    "#2c343c": "#c8d1db",
    "#303941": "#c8d1db",
    "#363d48": "#a4afbb",
    "#f1f2f5": "#263442",
    "#a1a5b0": "#526273",
    "#737c89": "#647283",
    "#b2bccb": "#536574",
    "#eac275": "#8b5915",
    "#ed938b": "#b24338",
    "#87c8d5": "#236c7d",
    "#a5c6a7": "#346a48",
    "#bba1d8": "#72529b",
    // Balance illustration semantic fallbacks (the inline demo uses CSS variables).
    "#13191e": "#f0f4f6",
    "#687883": "#8396a3",
    "#cbd5d9": "#ffffff",
    "#748792": "#cad6de",
    "#27343c": "#526573",
    "#ae9772": "#c7b48d",
    "#edc37d": "#995a09",
    "#a8d9d1": "#287b71",
    "#98a8b4": "#586e7b",
    "#29353e": "#d4dfe5",
    "#e7edf1": "#233641",
    "#34414c": "#c2cdd5",
    "#a4b1bb": "#526273",
  };
  const colors = svg.replace(
    /#[\da-f]{6}\b/gi,
    (color) => palette[color.toLowerCase()] ?? color,
  );
  const keyboard = `.keyboard-body{fill:#e5ebf0;stroke:#8c9bab}.keyboard-key rect{fill:#f8fafb;stroke:#c2cbd5}.key-letter{fill:#607182}.key-function,.mapped .key-letter{fill:#263442}.mapped.flight rect{fill:#dbeaf0;stroke:#547f91}.mapped.power rect{fill:#f6ecd8;stroke:#987032}.mapped.session rect{fill:#e2ecdf;stroke:#64865e}.mapped.view rect{fill:#ebe4f3;stroke:#8b74a4}`;
  return colors.replace("</svg>", `<style>${keyboard}</style></svg>`);
}
