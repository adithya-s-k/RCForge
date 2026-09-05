export const actionNames = {
  toggle: "Start / pause",
  reset: "Restart flight",
  camera: "Pilot / chase / FPV",
  response: "Cycle control response",
  vtolMode: "VTOL · switch Hover / Cruise",
  vtolAssistance: "VTOL · cycle assistance",
  vtolHover: "VTOL · request Hover",
  vtolCruise: "VTOL · request Cruise",
  settings: "Open / close settings",
  next: "Next setting",
  previous: "Previous setting",
  activate: "Activate setting",
  decrease: "Decrease value",
  increase: "Increase value",
} as const;
export type Action = keyof typeof actionNames;
/** VTOL switch bindings are retained, but neither shown nor dispatched on other aircraft. */
export function actionAvailable(action: string, vtol: boolean) {
  return vtol || !action.startsWith("vtol");
}
export type ActionBindings = Partial<Record<Action, string>>;
export function validActions(value: unknown): value is ActionBindings {
  return (
    !!value &&
    typeof value === "object" &&
    Object.entries(value).every(
      ([key, v]) =>
        Object.hasOwn(actionNames, key) &&
        typeof v === "string" &&
        /^(none|b\d{1,2}|a\d{1,2}[+-])$/.test(v),
    )
  );
}
/** Edge-triggered with reconnect priming: held buttons never repeat or fire on connection. */
export class ActionEdges {
  private previous = new Set<Action>();
  private identity = "";
  read(
    id: string,
    bindings: ActionBindings,
    buttons: readonly { value: number }[],
    axes: readonly number[],
    enabled = true,
  ): Action[] {
    const down = new Set<Action>();
    for (const action of Object.keys(actionNames) as Action[]) {
      const binding = bindings[action] ?? "none",
        index = Number(binding.slice(1).replace(/[+-]/, ""));
      const was = this.previous.has(action);
      if (
        (binding.startsWith("b") && (buttons[index]?.value ?? 0) > 0.5) ||
        (binding.startsWith("a") &&
          (axes[index] ?? 0) * (binding.endsWith("+") ? 1 : -1) >
            (was ? 0.4 : 0.75))
      )
        down.add(action);
    }
    const key = id + JSON.stringify(bindings),
      result =
        enabled && key === this.identity
          ? [...down].filter((a) => !this.previous.has(a))
          : [];
    this.identity = key;
    this.previous = down;
    return result;
  }
}
