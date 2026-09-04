/** Small accessible tab group with roving focus and native arrow navigation. */
export function setupTabs(root: HTMLElement, select: (id: string) => void) {
  const tabs = Array.from(
    root.querySelectorAll<HTMLButtonElement>("[data-setup-tab]"),
  );
  const show = (id: string) => {
    for (const tab of tabs) {
      const active = tab.dataset.setupTab === id;
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
      tab.classList.toggle("active", active);
    }
    select(id);
  };
  for (const [index, tab] of tabs.entries()) {
    tab.onclick = () => show(tab.dataset.setupTab!);
    tab.onkeydown = (event) => {
      const next =
        event.key === "ArrowRight"
          ? (index + 1) % tabs.length
          : event.key === "ArrowLeft"
            ? (index + tabs.length - 1) % tabs.length
            : event.key === "Home"
              ? 0
              : event.key === "End"
                ? tabs.length - 1
                : -1;
      if (next < 0) return;
      event.preventDefault();
      show(tabs[next].dataset.setupTab!);
      tabs[next].focus();
    };
  }
  show(tabs[0].dataset.setupTab!);
  return show;
}
