function bindStackTrees(root = document) {
  for (const toggle of root.querySelectorAll("[data-stack-tree-toggle]")) {
    if (toggle.dataset.bound === "1") continue;
    toggle.dataset.bound = "1";
    const branch = toggle.closest(".stack-tree-branch");
    if (!branch) continue;
    const setOpen = (open) => {
      branch.classList.toggle("is-collapsed", !open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.textContent = open ? "▾" : "▶";
    };
    setOpen(!branch.classList.contains("is-collapsed"));
    toggle.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setOpen(branch.classList.contains("is-collapsed"));
    });
  }
}

function bindStackViewChips(root = document) {
  for (const chip of root.querySelectorAll(".stack-view-chip")) {
    if (chip.dataset.bound === "1") continue;
    chip.dataset.bound = "1";
    chip.addEventListener("click", () => {
      const row = chip.closest(".stack-view-chips");
      row?.querySelectorAll(".stack-view-chip").forEach((node) => {
        node.classList.toggle("is-active", node === chip);
      });
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  bindStackTrees();
  bindStackViewChips();
});
