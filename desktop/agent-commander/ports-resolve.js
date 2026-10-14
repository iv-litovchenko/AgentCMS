const fs = require("fs");
const path = require("path");

function loadAgentCmsPortsModule() {
  const candidates = [
    path.join(__dirname, "lib", "config", "agent-cms-ports.js"),
    path.join(__dirname, "..", "..", "lib", "config", "agent-cms-ports.js")
  ];
  for (const modPath of candidates) {
    if (fs.existsSync(modPath)) {
      return require(modPath);
    }
  }
  throw new Error("agent-cms-ports module not found");
}

module.exports = { loadAgentCmsPortsModule };
