import { SLOTS, mountHub, bindDemoActions, labelStack, typesTrigger } from "../shared-mock.js";

const root = document.getElementById("app");
const host = mountHub(root, "06");

host.innerHTML = `
  <div class="v06-kpi">
    ${SLOTS.map((s) => `
      <button type="button" class="v06-cell slot-btn${s.count === 0 ? " slot-empty" : ""}" data-action="open" data-slot="${s.id}" title="${s.types}">
        <span class="v06-num">${s.count}</span>
        <span class="v06-icon">${s.icon}</span>
        <span class="v06-label">${s.label}</span>
      </button>
    `).join("")}
  </div>`;

bindDemoActions(document.body);
