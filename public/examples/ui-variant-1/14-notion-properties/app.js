import { MOCK_TREE, MODE_GROUPS, bindModeButtons } from "../shared-modes.js";

const icons = { description: "📄", configs: "⚙", scripts: "⌘", env: "🔐", internal: "🧠", external: "💾", "external-db": "🗄", references: "🔗", media: "🖼", inbox: "📥", schedule: "📅", heartbeat: "💓" };

document.querySelector(".tree").innerHTML = MOCK_TREE;
document.querySelector(".mode-panel").innerHTML = MODE_GROUPS.flatMap((g) =>
  g.modes.map(
    (m) =>
      `<button type="button" class="prop-row" data-mode="${m.id}"${m.disabled ? " disabled" : ""}><span class="prop-icon">${icons[m.id] || "•"}</span><span class="prop-label">${m.label}</span></button>`
  )
).join("");
bindModeButtons(document.getElementById("app"));
