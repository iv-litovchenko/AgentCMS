import { MOCK_TREE, MODE_GROUPS, bindModeButtons } from "../shared-modes.js";

document.querySelector(".tree").innerHTML = MOCK_TREE;
const groupRow = document.querySelector("[data-group-row]");
const modePanel = document.querySelector(".mode-panel");

function showGroup(groupId) {
  const group = MODE_GROUPS.find((g) => g.id === groupId);
  if (!group) return;
  modePanel.innerHTML = group.modes.map(
    (m) => `<button type="button" class="pill" data-mode="${m.id}"${m.disabled ? " disabled" : ""}>${m.label}</button>`
  ).join("");
  bindModeButtons(document.getElementById("app"));
}

MODE_GROUPS.forEach((g, i) => {
  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = "group-chip";
  chip.textContent = g.title;
  chip.addEventListener("click", () => {
    groupRow.querySelectorAll(".group-chip").forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    showGroup(g.id);
  });
  groupRow.appendChild(chip);
  if (i === 0) chip.click();
});
