import { SLOTS, mountHub, bindDemoActions, labelStack, typesTrigger } from "../shared-mock.js";

const root = document.getElementById("app");
const host = mountHub(root, "01");

host.innerHTML = `
  <div class="v01-grid">
    ${SLOTS.map((s) => `
      <article class="v01-card${s.count === 0 ? " slot-empty" : ""}">
        <button type="button" class="v01-counter slot-btn" data-action="open" data-slot="${s.id}" data-label="${s.label}">
          <span class="v01-icon">${s.icon}</span>
          <span class="v01-value">${s.count}</span>
          ${labelStack(s)}
        </button>
      </article>
    `).join("")}
  </div>`;

bindDemoActions(document.body);
