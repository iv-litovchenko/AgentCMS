const electron = require("electron");

if (!electron.app) {
  console.error("Agent CMS Control must be started with Electron.");
  process.exit(1);
}

if (require("../shared/url-shell").tryBootstrapUrlOnly(__dirname, "control")) {
  module.exports = {};
} else {
  module.exports = require("./main-embedded");
}
