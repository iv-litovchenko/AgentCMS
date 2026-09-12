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

function bindBandToggles(root = document) {
  for (const btn of root.querySelectorAll("[data-band-toggle]")) {
    if (btn.dataset.bound === "1") continue;
    btn.dataset.bound = "1";
    const body = document.getElementById(btn.getAttribute("aria-controls"));
    btn.addEventListener("click", () => {
      const open = btn.getAttribute("aria-expanded") !== "true";
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      body?.classList.toggle("is-open", open);
      updateZoneHeight();
    });
  }
}

function bindViewButtons(root = document) {
  for (const btn of root.querySelectorAll(".view-btn")) {
    if (btn.dataset.bound === "1") continue;
    btn.dataset.bound = "1";
    btn.addEventListener("click", () => {
      const cluster = btn.closest(".view-cluster");
      cluster?.querySelectorAll(".view-btn").forEach((node) => {
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
  bindBandToggles();
  bindViewButtons();
  updateZoneHeight();
  window.addEventListener("resize", updateZoneHeight);
  setTimeout(updateZoneHeight, 80);
});
