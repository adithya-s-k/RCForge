import { controllerDiagram } from "../view/controller-diagram";
import {
  buttonName,
  padStyle,
  standardShortcuts,
  type PadStyle,
} from "../input/presentation";
import { mapGamepad } from "../input/controls";
import { $, escape } from "./dom";
import { InputManager, channels } from "../input/controls";
import {
  ActionEdges,
  actionNames,
  validActions,
  type ActionBindings,
  type Action,
} from "../input/actions";
export class ControllerActions {
  private edges = new ActionEdges();
  private id = "";
  private signature = "";
  bindings: ActionBindings = {};
  private pressedKeys = new Set<string>();
  private preference: PadStyle = "auto";
  private style = "generic";
  private standard = false;
  private visualSignature = "";
  constructor(
    private input: InputManager,
    private perform: (a: Action) => void,
  ) {
    window.addEventListener("keydown", (e) => {
      if (
        e.target instanceof HTMLElement &&
        e.target.closest("input,select,textarea,[contenteditable=true]")
      )
        return;
      this.pressedKeys.add(e.code);
    });
    window.addEventListener("keyup", (e) => this.pressedKeys.delete(e.code));
    window.addEventListener("blur", () => this.pressedKeys.clear());
    document.addEventListener("visibilitychange", () =>
      this.pressedKeys.clear(),
    );
    $("controller-style").onchange = () => {
      this.preference = $<HTMLSelectElement>("controller-style")
        .value as PadStyle;
      try {
        localStorage.setItem(
          "rcforge.controller-style." + this.id,
          this.preference,
        );
      } catch {}
      this.signature = "";
    };
    $("standard-shortcuts").onclick = () => {
      if (!this.standard) return;
      this.bindings = { ...standardShortcuts };
      try {
        localStorage.setItem(
          "rcforge.actions." + this.id,
          JSON.stringify(this.bindings),
        );
      } catch {}
      this.signature = "";
      $("action-status").textContent = "Standard shortcuts applied.";
    };
  }
  update(enabled: boolean) {
    const d = this.input.selected(),
      id = d?.id ?? "";
    if (id !== this.id) {
      this.id = id;
      this.bindings = {};
      try {
        const preference = localStorage.getItem(
          "rcforge.controller-style." + id,
        );
        this.preference = ["auto", "playstation", "xbox", "generic"].includes(
          preference ?? "",
        )
          ? (preference as PadStyle)
          : "auto";
        $<HTMLSelectElement>("controller-style").value = this.preference;
        const p = JSON.parse(
          localStorage.getItem("rcforge.actions." + id) ??
            JSON.stringify(d?.mapping === "standard" ? standardShortcuts : {}),
        );
        if (validActions(p)) this.bindings = p;
      } catch {}
      this.signature = "";
    }
    this.standard = d?.mapping === "standard";
    this.style = padStyle(this.preference, id);
    const kind = $<HTMLSelectElement>("flight-input-type").value;
    document.querySelector<HTMLElement>(
      ".controller-visual-panel",
    )!.dataset.controllerKind = kind;
    document
      .querySelector<HTMLElement>(".controller-visual-panel")!
      .classList.toggle("keyboard-selected", kind === "keyboard");
    document.querySelectorAll<SVGGElement>("[data-key-code]").forEach((key) => {
      key.classList.toggle(
        "pressed",
        kind === "keyboard" && this.pressedKeys.has(key.dataset.keyCode!),
      );
    });
    $("controller-style").toggleAttribute("disabled", kind !== "gamepad");
    $("standard-shortcuts").toggleAttribute(
      "disabled",
      !this.standard || kind !== "gamepad",
    );
    $("controller-identity").textContent =
      this.input.source === "keyboard"
        ? "Keyboard"
        : d
          ? `${kind === "transmitter" ? "RC transmitter" : kind === "joystick" ? "Flight stick" : this.style === "playstation" ? "PlayStation" : this.style === "xbox" ? "Xbox" : "Controller"} · ${d.id}`
          : "No controller connected";
    const visualSignature = [kind, this.style, this.standard].join(":");
    if (this.visualSignature !== visualSignature) {
      this.visualSignature = visualSignature;
      for (const id of [
        "setup-controller-diagram",
        "flight-controller-diagram",
      ])
        $(id).innerHTML = controllerDiagram(
          kind,
          this.style,
          this.standard || !d,
        );
    }
    document
      .querySelectorAll<SVGGElement>("[data-pad-button]")
      .forEach((e) =>
        e.classList.toggle(
          "pressed",
          this.input.source === "controller" &&
            (d?.buttons[Number(e.dataset.padButton)]?.value ?? 0) > 0.5,
        ),
      );
    for (const id of ["setup-controller-diagram", "flight-controller-diagram"])
      $(id).classList.toggle("device-offline", kind !== "keyboard" && !d);
    document
      .querySelectorAll<SVGGElement>("[data-joystick-live]")
      .forEach((e) =>
        e.setAttribute(
          "transform",
          `translate(${(d?.axes[0] ?? 0) * 12} ${(d?.axes[1] ?? 0) * 12})`,
        ),
      );
    const mapped = d
      ? mapGamepad(d.axes, this.input.profile)
      : { yaw: 0, throttle: 0.5, roll: 0, pitch: 0 };
    document.querySelectorAll<SVGGElement>("[data-pad-stick]").forEach((e) => {
      const i = Number(e.dataset.padStick),
        rc = kind === "transmitter";
      const x = Number(e.dataset.stickX),
        y = Number(e.dataset.stickY);
      const dx = rc ? (i ? mapped.roll : mapped.yaw) : (d?.axes[i * 2] ?? 0);
      const dy = rc
        ? i
          ? mapped.pitch
          : 1 - mapped.throttle * 2
        : (d?.axes[i * 2 + 1] ?? 0);
      e.setAttribute("transform", `translate(${x + dx * 12} ${y + dy * 12})`);
    });
    const legend =
      this.input.source === "keyboard"
        ? "<span><kbd>Enter</kbd> Start</span><span><kbd>P</kbd> Pause</span><span><kbd>R</kbd> Restart</span>"
        : !d
          ? '<div class="shortcut-empty"><strong>Flight shortcuts</strong><p>Connect hardware to see your button bindings.</p></div>'
          : (["toggle", "reset", "camera", "settings"] as Action[])
              .map(
                (a) =>
                  `<span data-shortcut-action="${a}"><b>${escape(this.hint(a) || "Unassigned")}</b> ${actionNames[a]}</span>`,
              )
              .join("");
    for (const id of ["setup-shortcut-legend", "flight-shortcut-legend"])
      if ($(id).innerHTML !== legend) $(id).innerHTML = legend;
    document
      .querySelectorAll<HTMLElement>("[data-shortcut-action]")
      .forEach((e) => {
        const binding = this.bindings[e.dataset.shortcutAction as Action];
        e.classList.toggle(
          "pressed",
          !!d &&
            this.input.source === "controller" &&
            !!binding?.startsWith("b") &&
            (d.buttons[Number(binding.slice(1))]?.value ?? 0) > 0.5,
        );
      });
    const occupied = channels.map((c) => this.input.profile.bindings[c].axis);
    const signature = JSON.stringify([
      id,
      d?.buttons.length,
      d?.axes.length,
      occupied,
      this.style,
      this.standard,
      this.input.source,
    ]);
    if (signature !== this.signature) {
      this.signature = signature;
      $("controller-actions").innerHTML = Object.entries(actionNames)
        .map(
          ([action, label]) =>
            `<label>${label}<select data-action="${action}" ${!d || this.input.source === "keyboard" ? "disabled" : ""}><option value="none">Unassigned</option>${d?.buttons.map((_, i) => `<option value="b${i}">${escape(buttonName(i, this.style, this.standard))}</option>`).join("") ?? ""}${d?.axes.flatMap((_, i) => (occupied.includes(i) ? [] : [`<option value="a${i}+">Axis ${i + 1} high</option>`, `<option value="a${i}-">Axis ${i + 1} low</option>`])).join("") ?? ""}</select></label>`,
        )
        .join("");
      document
        .querySelectorAll<HTMLSelectElement>("[data-action]")
        .forEach((select) => {
          const a = select.dataset.action as Action;
          select.value = this.bindings[a] ?? "none";
          select.onchange = () => {
            for (const key of Object.keys(this.bindings) as Action[])
              if (this.bindings[key] === select.value)
                this.bindings[key] = "none";
            this.bindings[a] = select.value;
            try {
              localStorage.setItem(
                "rcforge.actions." + id,
                JSON.stringify(this.bindings),
              );
              $("action-status").textContent = "Shortcuts saved.";
            } catch {
              $("action-status").textContent =
                "Storage unavailable; shortcuts last for this session.";
            }
            this.signature = "";
          };
        });
    }
    $("action-signals").textContent = d
      ? `Pressed: ${
          d.buttons
            .map((b, i) =>
              b.value > 0.5 ? buttonName(i, this.style, this.standard) : null,
            )
            .filter(Boolean)
            .join(", ") || "—"
        }`
      : "Connect a controller to assign shortcuts.";
    const safeBindings = Object.fromEntries(
      Object.entries(this.bindings).filter(
        ([, v]) =>
          !v.startsWith("a") || !occupied.includes(Number(v.slice(1, -1))),
      ),
    ) as ActionBindings;
    for (const action of this.edges.read(
      id,
      safeBindings,
      d?.buttons ?? [],
      d?.axes ?? [],
      enabled && !!d && this.input.source === "controller",
    ))
      this.perform(action);
  }
  hint(action: Action) {
    const b = this.bindings[action];
    return !b || b === "none"
      ? ""
      : b.startsWith("b")
        ? buttonName(Number(b.slice(1)), this.style, this.standard)
        : `Axis ${Number(b.slice(1, -1)) + 1} ${b.endsWith("+") ? "↑" : "↓"}`;
  }
}
/** Visible controls can be traversed using explicitly assigned controller shortcuts. */
export function navigateSetting(action: Action) {
  const controls = Array.from(
    document.querySelectorAll<HTMLElement>(
      "button,input,select,summary,a[href]",
    ),
  ).filter(
    (e) =>
      e.getClientRects().length &&
      !e.closest("[hidden]") &&
      !e.matches(":disabled") &&
      e.tabIndex >= 0,
  );
  const current = document.activeElement as HTMLElement,
    index = controls.indexOf(current);
  if (action === "next" || action === "previous") {
    controls[
      (index + (action === "next" ? 1 : -1) + controls.length) % controls.length
    ]?.focus();
    return;
  }
  if (action === "activate") {
    if (current instanceof HTMLSelectElement) {
      current.focus();
    } else current?.click();
    return;
  }
  const direction = action === "increase" ? 1 : -1;
  if (current instanceof HTMLSelectElement) {
    current.selectedIndex = Math.max(
      0,
      Math.min(current.options.length - 1, current.selectedIndex + direction),
    );
    current.dispatchEvent(new Event("change", { bubbles: true }));
  }
  if (
    current instanceof HTMLInputElement &&
    ["range", "number"].includes(current.type)
  ) {
    direction > 0 ? current.stepUp() : current.stepDown();
    current.dispatchEvent(new Event("input", { bubbles: true }));
    current.dispatchEvent(new Event("change", { bubbles: true }));
  }
}
