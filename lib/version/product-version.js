const path = require("path");

const packageJsonPath = path.join(__dirname, "../../package.json");

function getPackageJson() {
  return require(packageJsonPath);
}

function getProductVersion() {
  return String(getPackageJson().version || "").trim() || "0.0.0";
}

module.exports = {
  getPackageJson,
  getProductVersion
};
