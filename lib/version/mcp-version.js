const path = require("path");

const packageJsonPath = path.join(__dirname, "../../mcp-server/package.json");

function getMcpPackageJson() {
  return require(packageJsonPath);
}

function getMcpVersion() {
  return String(getMcpPackageJson().version || "").trim() || "0.0.0";
}

module.exports = {
  getMcpPackageJson,
  getMcpVersion
};
