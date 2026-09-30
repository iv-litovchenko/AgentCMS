import { SLOTS, mountHub, bindDemoActions, labelStack, typesTrigger } from "../shared-mock.js";

const root = document.getElementById("app");
const host = mountHub(root, "04");

const weight = (s) => (s.id === "memory" ? "wide" : s.id === "inbox" ? "tall" : s.count === 0 ? "mini" : "normal");
host.innerHTML = `
  <div class="v04-bento">
    ${SLOTS.map((s) => `
      <button type="button" class="v04-tile v04-${weight(s)} slot-btn${s.count === 0 ? " slot-empty" : ""}" data-action="open" data-slot="${s.id}">
        <span class="v04-icon">${s.icon}</span>
        <span class="v04-count">${s.count}</span>
        <span class="v04-label">${s.label}</span>
        ${s.hint ? `<span class="v04-hint">${s.hint}</span>` : ""}
        ${typesTrigger(s)}
      </button>
    `).join("")}
  </div>`;

bindDemoActions(document.body);
