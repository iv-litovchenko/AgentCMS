import { MOCK_TREE, MODE_GROUPS, bindModeButtons } from "../shared-modes.js";

document.querySelector(".tree").innerHTML = MOCK_TREE;
document.querySelector(".mode-panel").innerHTML = MODE_GROUPS.flatMap((g) =>
  g.modes.map((m) => `<button type="button" class="v-tab" data-mode="${m.id}" title="${g.title}"${m.disabled ? " disabled" : ""}>${m.label}</button>`)
).join("");
bindModeButtons(document.getElementById("app"));
