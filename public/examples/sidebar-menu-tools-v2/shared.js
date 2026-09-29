function bindPanelTrees(root = document) {
  for (const toggle of root.querySelectorAll("[data-panel-tree-toggle]")) {
    if (toggle.dataset.bound === "1") continue;
    toggle.dataset.bound = "1";
    const branch = toggle.closest(".panel-tree-branch");
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

function bindViewButtons(root = document) {
  for (const btn of root.querySelectorAll(".view-btn, .v12-tab, .v16-seg-btn")) {
    if (btn.dataset.bound === "1") continue;
    btn.dataset.bound = "1";
    btn.addEventListener("click", () => {
      const group = btn.closest(".view-cluster, .v12-tabs, .v16-segment");
      group?.querySelectorAll(".view-btn, .v12-tab, .v16-seg-btn").forEach((node) => {
        node.classList.toggle("is-active", node === btn);
      });
    });
  }
}

function updateZoneHeight() {
  const zone = document.querySelector("[data-panel-zone]");
  const badge = document.querySelector("[data-size-badge]");
  if (!zone || !badge) return;
  const h = Math.round(zone.getBoundingClientRect().height);
  badge.textContent = `Высота панели: ${h}px`;
}

document.addEventListener("DOMContentLoaded", () => {
  bindPanelTrees();
  bindViewButtons();
  updateZoneHeight();
  window.addEventListener("resize", updateZoneHeight);
  setTimeout(updateZoneHeight, 80);
});
