import { mountBaseShell, bindNavInteractions, bindDemoActions } from "../shared-mock.js";

const root = document.getElementById("app");
const state = { domain: "settings", mode: "Конфигурации" };
mountBaseShell(root, {
  activeDomain: state.domain,
  activeMode: state.mode,
  variantClass: "variant-12-go-to-select"
});
const nav = bindNavInteractions(root, state);
const hdr = root.querySelector(".ws-header");
      const sel = document.createElement("select");
      sel.className = "go-select";
      sel.innerHTML = '<option>⚙️ Настройки › Конфигурации</option><option>🧠 Память › Внешняя</option><option>📎 Вложения › Медиа</option><option>🧭 Навигация › Граф</option><option>⚡ Авто › Heartbeat</option>';
      hdr.appendChild(sel);
      sel.addEventListener("change", () => {
        const toast = document.getElementById("toast");
        if (toast) { toast.textContent = sel.value; toast.classList.add("show"); setTimeout(() => toast.classList.remove("show"), 1600); }
      });
bindDemoActions();
