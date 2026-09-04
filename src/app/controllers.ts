import { $, escape, download } from "./dom";
import {
  InputManager,
  defaultProfile,
  loadProfile,
  saveProfile,
  validProfile,
  channels,
  mapGamepad,
  type Channel,
  type ControllerProfile,
} from "../input/controls";
import { assignAxis, movedAxis } from "../input/mapping";
import type { Controls } from "../core/simulation";
export type InputType = "keyboard" | "gamepad" | "joystick" | "transmitter";
const descriptions: Record<Channel, string> = {
  roll: "Bank left / right",
  pitch: "Nose down / up",
  yaw: "Turn left / right",
  throttle: "Motor power",
};
export class ControllerPage {
  type: InputType = "keyboard";
  calibrating = false;
  private signature = "!";
  private backup: ControllerProfile | null = null;
  private centers = false;
  private detecting: {
    channel: Channel;
    axes: number[];
    until: number;
  } | null = null;
  private dirty = false;
  constructor(
    readonly input: InputManager,
    private interrupt: () => void,
    private notify: (s: string) => void,
  ) {
    document
      .querySelectorAll<HTMLButtonElement>("[data-input]")
      .forEach(
        (b) =>
          (b.onclick = () => this.selectType(b.dataset.input as InputType)),
      );
    $("refresh-devices").onclick = () => {
      this.signature = "!";
      this.refresh();
      this.status(
        this.input.selected()
          ? "Device found. Check mapping and direction."
          : "No device detected. Connect USB or Bluetooth, then press a controller button.",
      );
    };
    $("device-select").onchange = () => {
      this.cancel();
      input.deviceIndex = Number($<HTMLSelectElement>("device-select").value);
      input.profile = this.profileFor(input.selected()?.id ?? "");
      this.dirty = false;
      this.renderBindings();
    };
    $("swap-horizontal").onclick = () => this.swap("roll", "yaw");
    $("swap-vertical").onclick = () => this.swap("pitch", "throttle");
    $("capture-centers").onclick = () => {
      const device = input.selected();
      if (!device) return;
      this.interrupt();
      this.detecting = null;
      if (!this.backup) this.backup = structuredClone(input.profile);
      this.calibrating = false;
      this.centers = true;
      for (const ch of channels)
        if (ch !== "throttle")
          input.profile.bindings[ch].center =
            device.axes[input.profile.bindings[ch].axis] ?? 0;
      this.status(
        "Neutral captured. Start range capture, then sweep every assigned axis.",
      );
      this.renderBindings();
      this.updateAvailability();
    };
    $("capture-range").onclick = () => {
      if (!input.selected() || !this.centers) return;
      this.interrupt();
      this.calibrating = true;
      for (const ch of channels) {
        const b = input.profile.bindings[ch];
        const v = input.selected()!.axes[b.axis] ?? 0;
        b.min = v;
        b.max = v;
      }
      this.status(
        "Recording travel… sweep all four channels to both endpoints. Save when each range is ready.",
      );
      this.updateAvailability();
    };
    $("cancel-calibration").onclick = () => this.cancel();
    $("save-controller").onclick = () => this.save();
    $("finish-calibration").onclick = () => this.save();
    $("export-profile").onclick = () => {
      if (!validProfile(input.profile) || this.backup) {
        this.notify("Finish calibration before exporting.");
        return;
      }
      download(
        "rcforge-controller.json",
        JSON.stringify(input.profile, null, 2),
      );
    };
    $("import-profile-button").onclick = () => $("import-profile").click();
    $<HTMLInputElement>("import-profile").onchange = async (e) => {
      const field = e.target as HTMLInputElement,
        file = field.files?.[0];
      if (!file) return;
      try {
        if (file.size > 64000) throw new Error("Setup file is too large");
        const p = JSON.parse(await file.text());
        if (!validProfile(p)) throw new Error("Invalid controller setup");
        if (new Set(channels.map((ch) => p.bindings[ch].axis)).size !== 4)
          throw new Error("Setup must assign four different axes");
        const device = input.selected();
        if (!device) throw new Error("Select the target controller first");
        if (channels.some((ch) => p.bindings[ch].axis >= device.axes.length))
          throw new Error(
            "This setup needs more axes than the selected controller provides",
          );
        this.cancel();
        input.profile = { ...p, deviceId: device.id };
        this.dirty = true;
        this.renderBindings();
        this.status(
          "Imported for this device. Check direction, then save setup.",
        );
      } catch (err) {
        this.notify(String(err));
      }
      field.value = "";
    };
    this.renderBindings();
  }
  private status(s: string) {
    $("calibration-status").textContent = s;
  }
  private changed() {
    this.dirty = true;
    this.interrupt();
  }
  private swap(a: Channel, b: Channel) {
    if (this.backup) return;
    assignAxis(this.input.profile, a, this.input.profile.bindings[b].axis);
    this.changed();
    this.renderBindings();
    this.status(`${a} and ${b} assignments swapped. Check the live monitor.`);
  }
  private cancel() {
    if (this.backup) this.input.profile = this.backup;
    this.backup = null;
    this.calibrating = false;
    this.centers = false;
    this.detecting = null;
    this.interrupt();
    this.status("Calibration stopped. Previous settings retained.");
    this.renderBindings();
    this.updateAvailability();
  }
  private save() {
    const device = this.input.selected();
    if (!device) return;
    const p = this.input.profile,
      indices = channels.map((ch) => p.bindings[ch].axis);
    if (
      new Set(indices).size !== 4 ||
      indices.some((i) => i >= device.axes.length)
    ) {
      this.status("Assign four different, available axes first.");
      return;
    }
    if (this.backup && !this.calibrating) {
      this.status("Capture full travel before saving calibration.");
      return;
    }
    const candidate = structuredClone(p);
    for (const ch of channels) {
      const b = candidate.bindings[ch];
      if (
        b.max - b.min < 0.15 ||
        (ch !== "throttle" &&
          (b.center - b.min < 0.05 || b.max - b.center < 0.05))
      ) {
        this.status(
          `Move ${ch} through both endpoints around neutral before saving.`,
        );
        return;
      }
      if (ch === "throttle") b.center = (b.min + b.max) / 2;
    }
    if (!validProfile(candidate)) {
      this.status("Invalid calibration. Cancel and capture neutral again.");
      return;
    }
    this.input.profile = candidate;
    this.backup = null;
    this.centers = false;
    this.calibrating = false;
    this.detecting = null;
    this.dirty = !saveProfile(candidate);
    this.status(
      this.dirty
        ? "Setup active; browser storage is unavailable. Export to keep a copy."
        : "Setup saved for " + device.id + ". Ready for the flight line.",
    );
    this.renderBindings();
    this.updateAvailability();
  }
  selectType(type: InputType) {
    this.cancel();
    this.type = type;
    $<HTMLSelectElement>("flight-input-type").value = type;
    const keyboard = type === "keyboard";
    $("device-select").hidden = keyboard;
    $("device-label").hidden = keyboard;
    $("keyboard-device").hidden = !keyboard;
    $("refresh-devices").hidden = keyboard;
    $("save-controller").hidden = keyboard;
    $("profile-actions").hidden = keyboard;
    document.querySelector<HTMLElement>(".raw-details")!.hidden = keyboard;
    $("mapping-title").textContent = keyboard
      ? "Keyboard commands"
      : "Channel mapping";
    $("connection-help-title").textContent = keyboard
      ? "More keyboard commands"
      : "Connection help";
    $("calibration-status").hidden = keyboard;
    this.input.source = type === "keyboard" ? "keyboard" : "controller";
    document
      .querySelectorAll<HTMLButtonElement>("[data-controller-tab]")
      .forEach((b) => {
        b.disabled =
          type === "keyboard" && b.dataset.controllerTab !== "mapping";
        if (type === "keyboard" && b.dataset.controllerTab === "mapping")
          b.click();
      });
    this.input.profile = this.profileFor(this.input.selected()?.id ?? "");
    this.dirty = false;
    document
      .querySelectorAll<HTMLButtonElement>("[data-input]")
      .forEach((b) => {
        b.classList.toggle("active", b.dataset.input === type);
        b.setAttribute("aria-pressed", String(b.dataset.input === type));
      });
    for (const id of ["bindings", "mapping-tools", "mapping-help"])
      $(id).hidden = type === "keyboard";
    $("keyboard-guide").hidden = type !== "keyboard";
    document.querySelector<HTMLElement>(".calibration-card")!.hidden =
      type === "keyboard";
    document.querySelector<HTMLElement>(".action-card")!.hidden =
      type === "keyboard";
    $("source-summary").textContent =
      {
        keyboard: "Keyboard",
        gamepad: "Gamepad",
        joystick: "Flight stick",
        transmitter: "RC transmitter",
      }[type] + " ↗";
    $("hardware-note").textContent =
      type === "transmitter"
        ? "Connect a compatible PPM-to-USB joystick adapter, or use Arduino USB above. Send unmixed channels; RCForge handles aircraft surface mixing."
        : type === "keyboard"
          ? "Space / Shift adjust power. X cuts it. P pauses, Enter starts, R resets. WASD also fly unless walking mode is enabled."
          : "Axis numbers vary by controller. Detect finds the axis you move; Reverse changes its direction.";
    $("throttle").toggleAttribute("disabled", type !== "keyboard");
    this.status(
      type === "keyboard"
        ? "Keyboard needs no calibration. Select hardware to configure analog controls."
        : "Capture neutral, sweep travel, then save. Existing device calibration is loaded automatically.",
    );
    this.refresh();
    this.renderBindings();
    this.updateAvailability();
    $("arduino-connection").hidden = type !== "transmitter";
  }
  private profileFor(id: string) {
    const p = defaultProfile(id);
    if (this.type === "gamepad") {
      p.bindings.roll.axis = 2;
      p.bindings.pitch.axis = 3;
      p.bindings.yaw.axis = 0;
      p.bindings.throttle.axis = 1;
    }
    if (this.type === "transmitter") {
      p.bindings.throttle.axis = 2;
      p.bindings.throttle.reversed = false;
      p.bindings.yaw.axis = 3;
    }
    return loadProfile(id, p);
  }
  private renderBindings() {
    const p = this.input.profile,
      count = Math.max(4, this.input.selected()?.axes.length ?? 0);
    $("bindings").innerHTML = channels
      .map((ch) => {
        const b = p.bindings[ch];
        return `<div class="channel-card"><div class="channel-heading"><div><h3>${ch[0].toUpperCase() + ch.slice(1)}</h3><span>${descriptions[ch]}</span></div><output id="value-${ch}">0%</output></div><div class="channel-assignment"><label>INPUT AXIS<select id="axis-${ch}" aria-label="${ch} axis">${Array.from({ length: count }, (_, i) => `<option value="${i}" ${i === b.axis ? "selected" : ""}>Axis ${i + 1}</option>`).join("")}</select></label><button id="detect-${ch}" class="detect-button">◎ Detect ${ch}</button><label class="reverse-toggle"><input id="reverse-${ch}" type="checkbox" aria-label="Reverse ${ch}" ${b.reversed ? "checked" : ""}/>Reverse</label></div><div class="channel-bar"><i id="bar-${ch}"></i></div><details class="response-details"><summary>Response <span>${Math.round(b.deadzone * 100)}% dead zone · ${Math.round(b.expo * 100)}% expo</span></summary><div class="two-col"><label>Dead zone · %<input id="deadzone-${ch}" type="number" min="0" max="20" value="${Math.round(b.deadzone * 100)}" aria-label="${ch} dead zone"/></label><label>Expo · %<input id="expo-${ch}" type="number" min="0" max="80" value="${Math.round(b.expo * 100)}" aria-label="${ch} expo"/></label></div><p class="small muted">${ch === "throttle" ? "Throttle uses endpoint normalization; dead zone and expo apply only to centered flight channels." : "Higher expo softens response near center. Full stick retains full authority."}</p></details></div>`;
      })
      .join("");
    for (const ch of channels) {
      $("axis-" + ch).onchange = () => {
        assignAxis(p, ch, Number($<HTMLSelectElement>("axis-" + ch).value));
        this.changed();
        this.renderBindings();
      };
      $("reverse-" + ch).onchange = () => {
        p.bindings[ch].reversed = $<HTMLInputElement>("reverse-" + ch).checked;
        this.changed();
      };
      $("detect-" + ch).onclick = () => {
        const d = this.input.selected();
        if (!d) return;
        this.interrupt();
        if (this.detecting?.channel === ch) {
          this.detecting = null;
          return;
        }
        this.detecting = {
          channel: ch,
          axes: [...d.axes],
          until: performance.now() + 10000,
        };
      };
      for (const setting of ["deadzone", "expo"] as const) {
        $(setting + "-" + ch).oninput = () => {
          const value = Number($<HTMLInputElement>(setting + "-" + ch).value);
          if (
            Number.isFinite(value) &&
            value >= 0 &&
            value <= (setting === "deadzone" ? 20 : 80)
          ) {
            p.bindings[ch][setting] = value / 100;
            this.changed();
          }
        };
        if (ch === "throttle")
          $(setting + "-" + ch).setAttribute("disabled", "");
      }
    }
    this.updateAvailability();
  }
  private updateAvailability() {
    const available = this.type !== "keyboard" && !!this.input.selected();
    for (const id of [
      "save-controller",
      "capture-centers",
      "finish-calibration",
      "export-profile",
      "import-profile-button",
    ])
      $(id).toggleAttribute("disabled", !available);
    $("capture-range").toggleAttribute(
      "disabled",
      !available || !this.centers || this.calibrating,
    );
    $("cancel-calibration").hidden = !this.backup;
    for (const id of ["swap-horizontal", "swap-vertical"])
      $(id).toggleAttribute("disabled", !available || !!this.backup);
    for (const ch of channels)
      for (const prefix of ["axis-", "reverse-", "detect-"])
        $(prefix + ch).toggleAttribute("disabled", !available || !!this.backup);
    $("cal-step-center").classList.toggle("active", !this.centers);
    $("cal-step-range").classList.toggle("active", this.centers);
    $("cal-step-save").classList.toggle("active", this.calibrating);
  }
  refresh() {
    const devices = this.input.devices(),
      signature = devices
        .map((d) => `${d.index}:${d.id}:${d.axes.length}`)
        .join("|");
    if (signature === this.signature) return;
    this.signature = signature;
    const old = this.input.selected();
    const awaitingSelected = !old && this.input.deviceIndex !== -1;
    $("device-select").innerHTML =
      devices.length || awaitingSelected
        ? devices
            .map((d) => `<option value="${d.index}">${escape(d.id)}</option>`)
            .join("") +
          (awaitingSelected
            ? `<option value="${this.input.deviceIndex}">Selected input disconnected — reconnect or choose a device</option>`
            : "")
        : '<option value="-1">No controller connected</option>';
    if (
      (!old && !awaitingSelected) ||
      (old && old.id !== this.input.profile.deviceId)
    ) {
      this.cancel();
      this.input.deviceIndex = old?.index ?? devices[0]?.index ?? -1;
      this.input.profile = this.profileFor(old?.id ?? devices[0]?.id ?? "");
      this.dirty = false;
      this.renderBindings();
    }
    if (awaitingSelected) this.cancel();
    $<HTMLSelectElement>("device-select").value = String(
      this.input.deviceIndex,
    );
    this.updateAvailability();
  }
  update() {
    this.refresh();
    const d = this.input.selected();
    let c: Controls = { roll: 0, pitch: 0, yaw: 0, throttle: 0 };
    if (this.type === "keyboard") {
      c = this.input.read(0.1);
      $("device-status").textContent =
        "Ready. Click outside a text field to try the controls below.";
    } else if (d) {
      if (this.detecting) {
        const moved = movedAxis(this.detecting.axes, d.axes);
        if (moved !== null) {
          const ch = this.detecting.channel;
          assignAxis(this.input.profile, ch, moved);
          this.detecting = null;
          this.changed();
          this.renderBindings();
          this.status(`${ch} assigned to Axis ${moved + 1}. Verify direction.`);
        } else if (performance.now() > this.detecting.until) {
          this.detecting = null;
          this.status(
            "Detection timed out. Select Detect and move only one axis.",
          );
        }
      }
      if (this.calibrating)
        for (const ch of channels) {
          const b = this.input.profile.bindings[ch],
            v = d.axes[b.axis];
          if (Number.isFinite(v)) {
            b.min = Math.min(b.min, v);
            b.max = Math.max(b.max, v);
          }
        }
      c = mapGamepad(d.axes, this.input.profile);
      $("device-status").textContent =
        `${d.axes.length} axes · ${d.buttons.length} buttons · ${d.mapping || "Custom HID"} · Connected`;
    } else
      $("device-status").textContent =
        "Connect a controller, focus this page, and move a stick to make it visible.";
    const live = this.type === "keyboard" || !!d;
    const pill = document.querySelector<HTMLElement>(".live-pill")!;
    pill.textContent = live ? "● LIVE" : "NO INPUT";
    pill.classList.toggle("inactive", !live);
    $("setup-state").textContent =
      this.type === "keyboard"
        ? "Keyboard ready"
        : !d
          ? "Awaiting device"
          : this.backup
            ? "Calibrating"
            : this.dirty
              ? "Unsaved changes"
              : "Device ready";
    $("detect-status").hidden = !this.detecting;
    if (this.detecting)
      $("detect-status").textContent =
        `Listening for ${this.detecting.channel}… Move one stick now. Click Detect again to cancel.`;
    $("raw-axes").innerHTML = d
      ? d.axes
          .map(
            (v, i) =>
              `<div class="axis-meter"><span>AX ${i + 1}</span><meter min="-1" max="1" value="${v}" aria-label="Raw axis ${i + 1}"></meter><output>${v.toFixed(3)}</output></div>`,
          )
          .join("")
      : "Connect a device to inspect its raw signals.";
    $("left-stick").style.transform =
      `translate(calc(-50% + ${c.yaw * 49}px),calc(-50% + ${(1 - c.throttle * 2) * 49}px))`;
    $("right-stick").style.transform =
      `translate(calc(-50% + ${c.roll * 49}px),calc(-50% + ${c.pitch * 49}px))`;
    $("channel-values").innerHTML = channels
      .map(
        (ch) =>
          `<div><span>${ch}</span><strong>${Math.round(c[ch] * 100)}<small>%</small></strong></div>`,
      )
      .join("");
    for (const ch of channels) {
      $("value-" + ch).textContent = Math.round(c[ch] * 100) + "%";
      $("bar-" + ch).style.width =
        (ch === "throttle" ? c[ch] : (c[ch] + 1) / 2) * 100 + "%";
    }
    $("calibration-progress").innerHTML = channels
      .map((ch) => {
        const b = this.input.profile.bindings[ch],
          ready =
            b.max - b.min >= 0.15 &&
            (ch === "throttle" ||
              (b.center - b.min >= 0.05 && b.max - b.center >= 0.05));
        return `<div><span>${ch}</span><strong>${this.calibrating ? (ready ? "✓ Range captured" : "Move both ways") : "—"}</strong><small>${this.calibrating ? `${b.min.toFixed(2)} → ${b.max.toFixed(2)}` : "Awaiting capture"}</small></div>`;
      })
      .join("");
  }
  ready() {
    if (this.type === "keyboard") return true;
    if (this.backup || this.detecting) {
      this.notify("Finish or cancel controller setup before launching.");
      return false;
    }
    const d = this.input.selected(),
      p = this.input.profile;
    if (
      !d ||
      d.id !== p.deviceId ||
      !validProfile(p) ||
      channels.some((ch) => p.bindings[ch].axis >= d.axes.length) ||
      new Set(channels.map((ch) => p.bindings[ch].axis)).size !== 4
    ) {
      this.notify(
        "Select a controller and assign four available axes on Controllers.",
      );
      return false;
    }
    return true;
  }
}
