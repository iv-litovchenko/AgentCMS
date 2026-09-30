import { SLOTS, mountHub, bindDemoActions, labelStack, typesTrigger } from "../shared-mock.js";

const root = document.getElementById("app");
const host = mountHub(root, "05");

host.innerHTML = `
  <div class="v05-split">
    <div class="v05-rail" role="tablist">
      ${SLOTS.map((s, i) => `
        <button type="button" class="v05-rail-btn${i === 0 ? " is-active" : ""}" data-rail="${s.id}" aria-label="${s.label}">
          <span>${s.icon}</span>
          <span class="v05-rail-count">${s.count}</span>
        </button>
      `).join("")}
    </div>
    <div class="v05-detail" data-rail-detail></div>
  </div>`;
const detail = host.querySelector("[data-rail-detail]");
const renderDetail = (id) => {
  const s = SLOTS.find((x) => x.id === id) || SLOTS[0];
  detail.innerHTML = `
    <button type="button" class="v05-open slot-btn" data-action="open" data-slot="${s.id}">
      <h3>${s.icon} ${s.label}</h3>
      <p class="v05-stat"><strong>${s.count}</strong> элементов в слоте</p>
      ${s.hint ? `<p class="v05-meta">${s.hint}</p>` : ""}
      ${typesTrigger(s)}
    </button>`;
};
host.querySelectorAll("[data-rail]").forEach((btn) => {
  btn.addEventListener("click", () => {
    host.querySelectorAll(".v05-rail-btn").forEach((b) => b.classList.toggle("is-active", b === btn));
    renderDetail(btn.dataset.rail);
  });
});
renderDetail("memory");

bindDemoActions(document.body);
