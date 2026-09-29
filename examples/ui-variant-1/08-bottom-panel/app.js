import { MOCK_TREE, renderModePills, bindModeButtons } from "../shared-modes.js";

document.querySelector(".tree").innerHTML = MOCK_TREE;
document.querySelector(".mode-panel").innerHTML = renderModePills();
bindModeButtons(document.getElementById("app"));

const panel = document.querySelector("[data-bottom-panel]");
const toggle = document.querySelector("[data-bottom-toggle]");

toggle.addEventListener("click", () => {
  const collapsed = panel.classList.toggle("collapsed");
  toggle.textContent = collapsed ? "Режимы ▾" : "Режимы ▴";
});
