import { afterEach, expect, it, vi } from "vitest";
import { navigateSetting } from "../src/app/controller-actions";

afterEach(() => vi.unstubAllGlobals());

it("controller navigation reaches inactive setup tabs but skips hidden and disabled controls", () => {
  const element = (
    tabIndex: number,
    role = "",
    hidden = false,
    disabled = false,
  ) => ({
    tabIndex,
    getAttribute: () => role,
    getClientRects: () => [1],
    closest: () => (hidden ? {} : null),
    matches: () => disabled,
    focus: vi.fn(),
  });
  const active = element(0, "tab");
  const disabled = element(0, "", false, true);
  const hidden = element(0, "", true);
  const inactive = element(-1, "tab");
  const doc = {
    activeElement: active,
    querySelectorAll: () => [active, disabled, hidden, inactive],
  };
  vi.stubGlobal("document", doc);
  navigateSetting("next");
  expect(inactive.focus).toHaveBeenCalledOnce();
  expect(hidden.focus).not.toHaveBeenCalled();
  expect(disabled.focus).not.toHaveBeenCalled();
  doc.activeElement = inactive;
  navigateSetting("previous");
  expect(active.focus).toHaveBeenCalledOnce();
});
