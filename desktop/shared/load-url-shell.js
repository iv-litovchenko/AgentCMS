/** Dev: desktop/agent-*/main.js → ../shared. Pack: app.asar/shared/. */
const path = require("path");

function loadUrlShell() {
  const ids = [
    path.join(__dirname, "url-shell"),
    path.join(__dirname, "..", "shared", "url-shell")
  ];
  for (const id of ids) {
    try {
      return require(id);
    } catch (err) {
      if (err.code !== "MODULE_NOT_FOUND") throw err;
    }
  }
  throw new Error("Cannot find module url-shell");
}

module.exports = { loadUrlShell };
