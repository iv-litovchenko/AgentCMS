import { MOCK_TREE, MODE_GROUPS, bindModeButtons } from "../shared-modes.js";

document.querySelector(".tree").innerHTML = MOCK_TREE;

const accordion = document.querySelector(".accordion");
accordion.innerHTML = MODE_GROUPS.map(
  (group, index) => `
  <details${index === 0 ? " open" : ""}>
    <summary>${group.title}</summary>
    <div class="acc-body">
      ${group.modes
        .map(
          (mode) =>
            `<button type="button" class="mode-btn" data-mode="${mode.id}"${mode.disabled ? " disabled" : ""}>${mode.label}</button>`
        )
        .join("")}
    </div>
  </details>`
).join("");

bindModeButtons(document.getElementById("app"));
