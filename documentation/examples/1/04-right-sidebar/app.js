import { MOCK_TREE, renderModeButtons, bindModeButtons } from "../shared-modes.js";

document.querySelector(".tree").innerHTML = MOCK_TREE;
document.querySelector(".mode-panel").innerHTML = renderModeButtons();
bindModeButtons(document.getElementById("app"));
