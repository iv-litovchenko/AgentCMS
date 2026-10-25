const electron = require("electron");

if (!electron.app) {
  console.error("Agent CMS Control must be started with Electron.");
  process.exit(1);
}

const path = require("path");
const { loadUrlShell } = (() => {
  try {
    return require(path.join(__dirname, "shared", "load-url-shell"));
  } catch {
    return require("../shared/load-url-shell");
  }
})();
if (loadUrlShell().tryBootstrapUrlOnly(__dirname, "control")) {
  module.exports = {};
} else {
  module.exports = require("./main-embedded");
}
