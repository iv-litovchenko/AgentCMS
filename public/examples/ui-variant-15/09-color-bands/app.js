import { SLOTS, mountHub, bindDemoActions, labelStack, typesTrigger } from "../shared-mock.js";

const root = document.getElementById("app");
const host = mountHub(root, "09");

const groupLabel = { memory: "Память", workspace: "Папки", files: "Файлы", todo: "Задачи" };
const groups = [...new Set(SLOTS.map((s) => s.group))];
host.innerHTML = groups.map((g) => `
  <section class="v09-group v09-${g}">
    <h3 class="v09-head">${groupLabel[g] || g}</h3>
    <ul class="v09-list">
      ${SLOTS.filter((s) => s.group === g).map((s) => `
        <li class="${s.count === 0 ? "slot-empty" : ""}">
          <button type="button" class="v09-row slot-btn" data-action="open" data-slot="${s.id}">
            <span class="v09-icon">${s.icon}</span>
            <span class="v09-label">${s.label}</span>
            <span class="v09-count">${s.count}</span>
          </button>
          ${typesTrigger(s)}
        </li>
      `).join("")}
    </ul>
  </section>
`).join("");

bindDemoActions(document.body);
