import { MOCK_TREE, MODE_GROUPS, bindModeButtons } from "../shared-modes.js";

document.querySelector(".tree").innerHTML = MOCK_TREE;

const panel = document.querySelector(".mode-panel");
panel.innerHTML = MODE_GROUPS.flatMap((g) =>
  g.modes.map(
    (m) =>
      `<button type="button" class="palette-item" data-mode="${m.id}" data-search="${g.title} ${m.label}"${m.disabled ? " disabled" : ""}><span>${m.label}</span><small>${g.title}</small></button>`
  )
).join("");

const app = document.getElementById("app");
const overlay = document.querySelector("[data-palette]");
const search = document.querySelector("[data-palette-search]");
const controller = bindModeButtons(app);

function openPalette() {
  overlay.classList.remove("hidden");
  search.value = "";
  filterPalette("");
  search.focus();
}
function closePalette() {
  overlay.classList.add("hidden");
}
function filterPalette(q) {
  const lower = q.toLowerCase();
  panel.querySelectorAll(".palette-item").forEach((btn) => {
    btn.classList.toggle("hidden-by-search", lower && !btn.dataset.search.toLowerCase().includes(lower));
  });
}

document.querySelector("[data-open-palette]").addEventListener("click", openPalette);
overlay.addEventListener("click", (e) => { if (e.target === overlay) closePalette(); });
search.addEventListener("input", () => filterPalette(search.value));
document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); openPalette(); }
  if (e.key === "Escape") closePalette();
});
panel.querySelectorAll(".palette-item:not([disabled])").forEach((btn) => {
  btn.addEventListener("click", () => { controller.setActive(btn.dataset.mode); closePalette(); });
});
