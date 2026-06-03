import { MOCK_TREE, renderModeButtons, bindModeButtons } from "../shared-modes.js";

document.querySelector(".tree").innerHTML = MOCK_TREE;
document.querySelector(".mode-panel").innerHTML = renderModeButtons();
bindModeButtons(document.getElementById("app"));

document.querySelectorAll("[data-left-tab]").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".left-tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    document.querySelectorAll("[data-pane]").forEach((p) => p.classList.add("hidden"));
    document.querySelector(`[data-pane="${tab.dataset.leftTab}"]`).classList.remove("hidden");
  });
});
