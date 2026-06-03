import { MOCK_TREE, MODE_GROUPS, bindModeButtons } from "../shared-modes.js";

document.querySelector(".tree").innerHTML = MOCK_TREE;

const modePanel = document.querySelector(".mode-panel");
modePanel.innerHTML = MODE_GROUPS.flatMap((group) =>
  group.modes.map(
    (mode) =>
      `<button type="button" class="tab-btn" data-mode="${mode.id}" title="${group.title}"${mode.disabled ? " disabled" : ""}>${mode.label}</button>`
  )
).join("");

bindModeButtons(document.getElementById("app"));
