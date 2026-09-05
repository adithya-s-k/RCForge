import { afterEach, describe, expect, it } from "vitest";
import {
  configureHost,
  hostAllows,
  requireHostAccess,
  onHostAccessChange,
  notifyHostAccessChange,
} from "../src/app/host";
afterEach(() => configureHost({ allows: () => true, requestAccess: () => {} }));
describe("optional workbench host", () => {
  it("leaves standalone aircraft, editing and physical inputs unrestricted", () => {
    expect(hostAllows({ kind: "aircraft", id: "custom" })).toBe(true);
    expect(hostAllows({ kind: "workspace", id: "aircraft" })).toBe(true);
    expect(hostAllows({ kind: "input", id: "transmitter" })).toBe(true);
  });
  it("requests access without running the blocked action and observes live policy changes", () => {
    let member = false;
    const requests: string[] = [];
    configureHost({
      allows: (r) => member || r.id === "keyboard",
      requestAccess: (r) => requests.push(r.id),
    });
    expect(requireHostAccess({ kind: "input", id: "keyboard" })).toBe(true);
    expect(requireHostAccess({ kind: "input", id: "transmitter" })).toBe(false);
    expect(requests).toEqual(["transmitter"]);
    let changes = 0;
    const stop = onHostAccessChange(() => changes++);
    member = true;
    notifyHostAccessChange();
    expect(requireHostAccess({ kind: "input", id: "transmitter" })).toBe(true);
    expect(changes).toBe(1);
    stop();
    notifyHostAccessChange();
    expect(changes).toBe(1);
  });
});
