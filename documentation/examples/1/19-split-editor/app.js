import { MOCK_TREE, renderModePills, bindModeButtons } from "../shared-modes.js";

document.querySelector(".tree").innerHTML = MOCK_TREE;
document.querySelector(".mode-panel").innerHTML = renderModePills();
bindModeButtons(document.getElementById("app"));

const workspace = document.querySelector(".split-workspace");
const handle = document.querySelector("[data-split-handle]");
let dragging = false;
handle.addEventListener("mousedown", () => { dragging = true; });
window.addEventListener("mouseup", () => { dragging = false; });
window.addEventListener("mousemove", (e) => {
  if (!dragging) return;
  const rect = workspace.getBoundingClientRect();
  const bottom = Math.min(Math.max(rect.bottom - e.clientY, 120), rect.height - 120);
  workspace.style.gridTemplateRows = `1fr 6px ${bottom}px`;
});
