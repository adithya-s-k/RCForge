/** Native controls own Enter, Space and arrows; flight shortcuts must not steal them. */
export function ownsKeyboard(target: EventTarget | null) {
  return (
    target instanceof Element &&
    target.closest(
      "input,select,textarea,button,a[href],summary,dialog[open],[data-input-scope=ui],[contenteditable=true]",
    ) !== null
  );
}
