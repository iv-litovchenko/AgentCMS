import { mountBaseShell, bindNavInteractions, bindDemoActions } from "../shared-mock.js";

const root = document.getElementById("app");
const state = { domain: "attachments", mode: "Медиа и документы" };
mountBaseShell(root, {
  activeDomain: state.domain,
  activeMode: state.mode,
  variantClass: "variant-11-tree-storage-folders"
});
const nav = bindNavInteractions(root, state);
const sidebar = root.querySelector(".sidebar");
      sidebar.innerHTML += `
        <div class="sidebar-item active" style="margin-left:8px">📁 awn-storage</div>
        <div class="sidebar-item" style="margin-left:16px" data-domain="nav">🧭 _Graph</div>
        <div class="sidebar-item" style="margin-left:16px" data-domain="memory">🧠 _Content</div>
        <div class="sidebar-item" style="margin-left:16px" data-domain="attachments">📎 _Assets</div>
        <div class="sidebar-item" style="margin-left:16px" data-domain="settings">⚙️ Configuration</div>
        <div class="sidebar-item" style="margin-left:16px" data-domain="auto">⚡ _Scripts</div>`;
bindDemoActions();
