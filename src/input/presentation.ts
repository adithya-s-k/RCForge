import type { ActionBindings } from "./actions";
export type PadStyle = "auto" | "playstation" | "xbox" | "generic";
export function padStyle(
  preference: PadStyle,
  id: string,
): Exclude<PadStyle, "auto"> {
  if (preference !== "auto") return preference;
  if (/dualsense|dualshock|playstation|054c|sony/i.test(id))
    return "playstation";
  return /xbox|xinput|045e/i.test(id) ? "xbox" : "generic";
}
export function buttonName(index: number, style: string, standard: boolean) {
  if (!standard) return `Button ${index + 1}`;
  const names =
    style === "playstation"
      ? [
          "✕ Cross",
          "○ Circle",
          "□ Square",
          "△ Triangle",
          "L1",
          "R1",
          "L2",
          "R2",
          "Create",
          "Options",
          "L3",
          "R3",
          "D-pad ↑",
          "D-pad ↓",
          "D-pad ←",
          "D-pad →",
          "PS",
          "Touchpad",
        ]
      : style === "xbox"
        ? [
            "A",
            "B",
            "X",
            "Y",
            "LB",
            "RB",
            "LT",
            "RT",
            "View",
            "Menu",
            "LS click",
            "RS click",
            "D-pad ↑",
            "D-pad ↓",
            "D-pad ←",
            "D-pad →",
            "Xbox",
          ]
        : [
            "South",
            "East",
            "West",
            "North",
            "Left bumper",
            "Right bumper",
            "Left trigger",
            "Right trigger",
            "Back",
            "Start",
            "LS click",
            "RS click",
            "D-pad ↑",
            "D-pad ↓",
            "D-pad ←",
            "D-pad →",
            "Home",
          ];
  return names[index] ?? `Button ${index + 1}`;
}
export const standardShortcuts: ActionBindings = {
  toggle: "b0",
  reset: "b2",
  camera: "b3",
  settings: "b9",
  next: "b13",
  previous: "b12",
  activate: "b1",
  decrease: "b14",
  increase: "b15",
};
