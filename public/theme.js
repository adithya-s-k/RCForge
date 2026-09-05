// Shared, early theme setup for the workbench and static documentation.
(() => {
  const key = "rcforge.theme";
  let current = "dark";
  try {
    if (localStorage.getItem(key) === "light") current = "light";
  } catch {}
  function apply(theme) {
    current = theme === "light" ? "light" : "dark";
    document.documentElement.dataset.theme = current;
    document.documentElement.style.colorScheme = current;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", current === "light" ? "#f6f7f9" : "#0c0c0e");
    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      const label = `Switch to ${current === "dark" ? "light" : "dark"} theme`;
      button.setAttribute("aria-label", label);
      button.setAttribute("title", label);
      button.setAttribute("aria-pressed", String(current === "light"));
    });
    window.dispatchEvent(
      new CustomEvent("rcforge-themechange", { detail: current }),
    );
  }
  apply(current);
  document.addEventListener("DOMContentLoaded", () => apply(current));
  document.addEventListener("click", (event) => {
    if (
      !(event.target instanceof Element) ||
      !event.target.closest("[data-theme-toggle]")
    )
      return;
    apply(current === "dark" ? "light" : "dark");
    try {
      localStorage.setItem(key, current);
    } catch {}
  });
  window.addEventListener("storage", (event) => {
    if (event.key === key) apply(event.newValue);
  });
})();
