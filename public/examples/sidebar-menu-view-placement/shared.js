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
  const selectors = ".view-btn, .v-ghost-btn, .v-text-tab, .v-mode-dropdown-item";
  for (const btn of root.querySelectorAll(selectors)) {
    if (btn.dataset.bound === "1") continue;
    btn.dataset.bound = "1";
    btn.addEventListener("click", () => {
      const group = btn.closest(
        ".view-cluster, .v-ghost-tools, .v-text-tabs, .v-mode-dropdown-menu, .tree-band-head-actions"
      );
      if (!group) return;
      group.querySelectorAll(selectors).forEach((node) => {
        node.classList.toggle("is-active", node === btn);
      });
      const dropdown = btn.closest(".v-mode-dropdown");
      const label = dropdown?.querySelector("[data-mode-label]");
      if (label && btn.dataset.modeLabel) {
        label.textContent = btn.dataset.modeLabel;
      }
      dropdown?.classList.remove("is-open");
    });
  }
}

function bindDropdowns(root = document) {
  for (const wrap of root.querySelectorAll(".v-mode-dropdown")) {
    if (wrap.dataset.bound === "1") continue;
    wrap.dataset.bound = "1";
    const btn = wrap.querySelector(".v-mode-dropdown-btn");
    btn?.addEventListener("click", (event) => {
      event.stopPropagation();
      wrap.classList.toggle("is-open");
    });
  }
  document.addEventListener("click", (event) => {
    if (event.target.closest(".v-mode-dropdown")) return;
    document.querySelectorAll(".v-mode-dropdown.is-open").forEach((node) => {
      node.classList.remove("is-open");
    });
  });
}

function bindSettingsReveal(root = document) {
  const chip = root.querySelector("[data-settings-reveal]");
  const popover = root.querySelector("[data-settings-popover]");
  if (!chip || !popover) return;
  chip.addEventListener("click", () => {
    popover.hidden = !popover.hidden;
    updateZoneHeight();
  });
}

function updateZoneHeight() {
  const zone = document.querySelector("[data-panel-zone]");
  const badge = document.querySelector("[data-size-badge]");
  if (!zone || !badge) return;
  const h = Math.round(zone.getBoundingClientRect().height);
  badge.textContent = `Высота зоны: ${h}px`;
}

document.addEventListener("DOMContentLoaded", () => {
  bindPanelTrees();
  bindViewButtons();
  bindDropdowns();
  bindSettingsReveal();
  updateZoneHeight();
  window.addEventListener("resize", updateZoneHeight);
  setTimeout(updateZoneHeight, 80);
});
