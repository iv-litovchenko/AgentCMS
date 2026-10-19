// Injected from root package.json when served by server.js / voice-server.js.
const PROJECT_VERSION = "0.0.0";

function applyProjectVersion(doc = document) {
  if (!doc || typeof doc.querySelectorAll !== "function") return;
  doc.querySelectorAll(".app-project-version").forEach((el) => {
    el.textContent = PROJECT_VERSION;
  });
}

function bootProjectVersion() {
  applyProjectVersion(document);
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { PROJECT_VERSION, applyProjectVersion };
} else if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootProjectVersion);
} else {
  bootProjectVersion();
}
