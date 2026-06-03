import { MOCK_TREE, MODE_GROUPS, bindModeButtons } from "../shared-modes.js";

document.querySelector(".tree").innerHTML = MOCK_TREE;

const groupRow = document.querySelector("[data-group-row]");
const modePanel = document.querySelector(".mode-panel");
let controller;

function renderGroupModes(groupId) {
  const group = MODE_GROUPS.find((g) => g.id === groupId);
  if (!group) return;
  modePanel.innerHTML = group.modes
    .map(
      (mode) =>
        `<button type="button" class="pill" data-mode="${mode.id}"${mode.disabled ? " disabled" : ""}>${mode.label}</button>`
    )
    .join("");
  controller = bindModeButtons(document.getElementById("app"));
}

MODE_GROUPS.forEach((group, index) => {
  const tab = document.createElement("button");
  tab.type = "button";
  tab.className = "group-tab";
  tab.textContent = group.title;
  tab.addEventListener("click", () => {
    groupRow.querySelectorAll(".group-tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    renderGroupModes(group.id);
  });
  groupRow.appendChild(tab);
  if (index === 0) tab.click();
});
