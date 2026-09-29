import { MOCK_TREE, MODE_GROUPS, renderModeButtons, bindModeButtons } from "../shared-modes.js";

const icons = { main: "📝", memory: "🧠", files: "📎", auto: "⚡" };

document.querySelector(".tree").innerHTML = MOCK_TREE;

const rail = document.querySelector(".icon-rail");
const flyout = document.querySelector("[data-rail-flyout]");
const flyoutTitle = document.querySelector("[data-flyout-title]");
const modePanel = document.querySelector(".mode-panel");

MODE_GROUPS.forEach((group, index) => {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "rail-btn";
  btn.title = group.title;
  btn.textContent = icons[group.id] || "•";
  btn.addEventListener("click", () => {
    rail.querySelectorAll(".rail-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    flyout.classList.remove("hidden");
    flyoutTitle.textContent = group.title;
    modePanel.innerHTML = group.modes
      .map(
        (mode) =>
          `<button type="button" class="mode-btn" data-mode="${mode.id}"${mode.disabled ? " disabled" : ""}>${mode.label}</button>`
      )
      .join("");
    bindModeButtons(document.getElementById("app"));
  });
  rail.appendChild(btn);
  if (index === 0) btn.click();
});
