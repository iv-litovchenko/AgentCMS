import { MOCK_TREE, renderModeButtons, bindModeButtons } from "../shared-modes.js";

document.querySelector(".tree").innerHTML = MOCK_TREE;
document.querySelector(".mode-panel").innerHTML = renderModeButtons();
bindModeButtons(document.getElementById("app"));

const drawer = document.querySelector("[data-drawer]");
const overlay = document.querySelector("[data-drawer-overlay]");
const open = () => { drawer.classList.remove("hidden"); overlay.classList.remove("hidden"); };
const close = () => { drawer.classList.add("hidden"); overlay.classList.add("hidden"); };
document.querySelector("[data-drawer-open]").addEventListener("click", open);
document.querySelector("[data-drawer-close]").addEventListener("click", close);
overlay.addEventListener("click", close);
