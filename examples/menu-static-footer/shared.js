function bindFooterToggle(root = document) {
  for (const toggle of root.querySelectorAll("[data-footer-toggle]")) {
    if (toggle.dataset.bound === "1") continue;
    toggle.dataset.bound = "1";
    const panel = toggle.closest(".footer-panel");
    const action = toggle.querySelector("[data-footer-action]");
    const setOpen = (open) => {
      panel?.classList.toggle("is-collapsed", !open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      if (action) action.textContent = open ? "Свернуть" : "Показать";
    };
    setOpen(!panel?.classList.contains("is-collapsed"));
    toggle.addEventListener("click", () => {
      setOpen(panel?.classList.contains("is-collapsed"));
    });
  }
}

document.addEventListener("DOMContentLoaded", () => bindFooterToggle());
