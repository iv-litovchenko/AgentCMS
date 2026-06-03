import { MOCK_TREE, renderModePills, bindModeButtons } from "../shared-modes.js";

document.querySelector(".tree").innerHTML = MOCK_TREE;
document.querySelector(".mode-panel").innerHTML = renderModePills();
bindModeButtons(document.getElementById("app"));
