import { SLOTS, mountHub, bindDemoActions, labelStack, typesTrigger } from "../shared-mock.js";

const root = document.getElementById("app");
const host = mountHub(root, "10");

host.innerHTML = `
  <nav class="v10-nav" aria-label="Слоты">
    ${SLOTS.map((s) => `
      <button type="button" class="v10-link slot-btn${s.count === 0 ? " slot-empty" : ""}" data-action="open" data-slot="${s.id}">
        <span class="v10-left">${s.icon} ${s.label}</span>
        <span class="v10-dots" aria-hidden="true"></span>
        <span class="v10-right">${s.count}</span>
      </button>
    `).join("")}
  </nav>
  <p class="v10-foot">Типы — по клику на слот в проде открывается schema; здесь — ${typesTrigger(SLOTS[1])}</p>`;

bindDemoActions(document.body);
