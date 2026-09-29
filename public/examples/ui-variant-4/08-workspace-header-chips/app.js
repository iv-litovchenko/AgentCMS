import { mountBaseShell, bindNavInteractions, bindDemoActions } from "../shared-mock.js";

const root = document.getElementById("app");
const state = { domain: "auto", mode: "Heartbeat" };
mountBaseShell(root, {
  activeDomain: state.domain,
  activeMode: state.mode,
  variantClass: "variant-08-workspace-header-chips"
});
const nav = bindNavInteractions(root, state);
const hdr = root.querySelector(".ws-header");
      hdr.style.display = "flex";
      hdr.style.flexWrap = "wrap";
      hdr.style.gap = "10px";
      const chips = document.createElement("div");
      chips.style.display = "flex";
      chips.style.gap = "4px";
      chips.innerHTML = '<button type="button" class="domain-chip active" data-domain-chip="auto">⚡</button><button type="button" class="domain-chip" data-domain-chip="memory">🧠</button><button type="button" class="domain-chip" data-domain-chip="attachments">📎</button>';
      hdr.appendChild(chips);
bindDemoActions();
