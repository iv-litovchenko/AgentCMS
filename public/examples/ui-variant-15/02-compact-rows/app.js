import { SLOTS, mountHub, bindDemoActions, labelStack, typesTrigger } from "../shared-mock.js";

const root = document.getElementById("app");
const host = mountHub(root, "02");

host.innerHTML = `
  <ul class="v02-list">
    ${SLOTS.map((s) => `
      <li class="v02-row${s.count === 0 ? " slot-empty" : ""}">
        <button type="button" class="v02-main slot-btn" data-action="open" data-slot="${s.id}" data-label="${s.label}">
          <span class="v02-icon">${s.icon}</span>
          <span class="v02-text">
            <span class="v02-title">${s.label}${s.hint ? ` <em>${s.hint}</em>` : ""}</span>
            ${typesTrigger(s)}
          </span>
        </button>
        <span class="v02-count">${s.count}</span>
      </li>
    `).join("")}
  </ul>`;

bindDemoActions(document.body);
