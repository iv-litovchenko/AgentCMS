import { SLOTS, mountHub, bindDemoActions, labelStack, typesTrigger } from "../shared-mock.js";

const root = document.getElementById("app");
const host = mountHub(root, "07");

let active = "memory";
const render = () => {
  host.innerHTML = `
    <div class="v07-tabs" role="tablist">
      ${SLOTS.map((s) => `
        <button type="button" role="tab" class="v07-tab${s.id === active ? " is-active" : ""}" data-tab="${s.id}">
          ${s.icon} ${s.label}
          <span class="v07-tab-count">${s.count}</span>
        </button>
      `).join("")}
    </div>
    <div class="v07-panel" role="tabpanel"></div>`;
  const panel = host.querySelector(".v07-panel");
  const s = SLOTS.find((x) => x.id === active);
  panel.innerHTML = `
    <button type="button" class="v07-panel-btn slot-btn" data-action="open" data-slot="${s.id}">
      <span class="v07-panel-count">${s.count}</span>
      <div>
        <strong>${s.label}</strong>
        ${s.hint ? `<div class="v07-sub">${s.hint}</div>` : ""}
        ${typesTrigger(s)}
      </div>
    </button>`;
  host.querySelectorAll("[data-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      active = btn.dataset.tab;
      render();
      bindDemoActions(document.body);
    });
  });
};
render();

bindDemoActions(document.body);
