import { SLOTS, mountHub, bindDemoActions, labelStack, typesTrigger } from "../shared-mock.js";

const root = document.getElementById("app");
const host = mountHub(root, "08");

host.innerHTML = `
  <table class="v08-table">
    <thead><tr><th>Слот</th><th>Кол-во</th><th>Типы</th></tr></thead>
    <tbody>
      ${SLOTS.map((s) => `
        <tr class="${s.count === 0 ? "slot-empty" : ""}">
          <td>
            <button type="button" class="v08-slot slot-btn" data-action="open" data-slot="${s.id}">
              ${s.icon} ${s.label}${s.hint ? ` · ${s.hint}` : ""}
            </button>
          </td>
          <td class="v08-num">${s.count}</td>
          <td class="v08-types">${s.types}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>`;

bindDemoActions(document.body);
