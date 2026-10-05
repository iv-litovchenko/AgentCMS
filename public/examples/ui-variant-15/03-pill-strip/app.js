import { SLOTS, mountHub, bindDemoActions, labelStack, typesTrigger } from "../shared-mock.js";

const root = document.getElementById("app");
const host = mountHub(root, "03");

host.innerHTML = `
  <div class="v03-scroll">
    ${SLOTS.map((s) => `
      <button type="button" class="v03-pill slot-btn${s.count === 0 ? " slot-empty" : ""}" data-action="open" data-slot="${s.id}" data-label="${s.label}">
        <span>${s.icon} ${s.label}</span>
        <span class="v03-badge">${s.count}</span>
      </button>
    `).join("")}
  </div>
  <p class="v03-hint">Наведите на чип — типы в title. ${typesTrigger(SLOTS[0]).replace('types-trigger', 'types-trigger v03-types')}</p>`;

bindDemoActions(document.body);
