import { MOCK_TREE, renderModeButtons, bindModeButtons } from "../shared-modes.js";

document.querySelector(".tree").innerHTML = MOCK_TREE;
document.querySelector(".mode-panel").innerHTML = renderModeButtons();
bindModeButtons(document.getElementById("app"));

const pop = document.querySelector("[data-popover]");
const toggle = document.querySelector("[data-pop-toggle]");
toggle.addEventListener("click", () => pop.classList.toggle("hidden"));
document.addEventListener("click", (e) => {
  if (!pop.contains(e.target) && !toggle.contains(e.target)) pop.classList.add("hidden");
});
