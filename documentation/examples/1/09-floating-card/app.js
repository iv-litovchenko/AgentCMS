import { MOCK_TREE, renderModeButtons, bindModeButtons } from "../shared-modes.js";

document.querySelector(".tree").innerHTML = MOCK_TREE;
document.querySelector(".mode-panel").innerHTML = renderModeButtons();

const card = document.querySelector("[data-float-card]");
const toggle = document.querySelector("[data-float-toggle]");

toggle.addEventListener("click", () => {
  const collapsed = card.classList.toggle("collapsed");
  toggle.textContent = collapsed ? "⚙ Режим" : "✕ Закрыть";
});

bindModeButtons(document.getElementById("app"));
