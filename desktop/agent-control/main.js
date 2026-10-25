const electron = require("electron");

if (!electron.app) {
  console.error("Agent CMS Control must be started with Electron.");
  process.exit(1);
}

const path = require("path");
const { requireUrlShellModule } = (() => {
  for (const rel of ["./shared/require-url-shell", "../shared/require-url-shell"]) {
    try {
      return require(path.join(__dirname, rel));
    } catch (err) {
      if (err.code !== "MODULE_NOT_FOUND") throw err;
    }
  }
  throw new Error("Cannot find require-url-shell");
})();
if (requireUrlShellModule().tryBootstrapUrlOnly(__dirname, "control")) {
  module.exports = {};
} else {
  module.exports = require("./main-embedded");
}
