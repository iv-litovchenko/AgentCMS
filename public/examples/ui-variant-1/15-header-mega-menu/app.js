import { MOCK_TREE, MODE_GROUPS, bindModeButtons } from "../shared-modes.js";

document.querySelector(".tree").innerHTML = MOCK_TREE;
document.querySelector(".mode-panel").innerHTML = MODE_GROUPS.map(
  (g) => `<div class="mega-col"><div class="mega-col-title">${g.title}</div>${g.modes.map((m) => `<button type="button" class="mode-btn" data-mode="${m.id}"${m.disabled ? " disabled" : ""}>${m.label}</button>`).join("")}</div>`
).join("");

const menu = document.querySelector("[data-mega-menu]");
const trigger = document.querySelector("[data-mega-trigger]");
const controller = bindModeButtons(document.getElementById("app"));

trigger.addEventListener("click", () => menu.classList.toggle("hidden"));
document.addEventListener("click", (e) => {
  if (!menu.contains(e.target) && !trigger.contains(e.target)) menu.classList.add("hidden");
});
menu.querySelectorAll(".mode-btn:not([disabled])").forEach((btn) => {
  btn.addEventListener("click", () => { controller.setActive(btn.dataset.mode); menu.classList.add("hidden"); });
});
