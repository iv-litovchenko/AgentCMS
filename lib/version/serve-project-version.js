const fs = require("fs/promises");
const path = require("path");
const { getProductVersion } = require("./product-version");

const CLIENT_SCRIPT_PATH = path.join(__dirname, "../../public/js/core/project-version.js");

async function buildProjectVersionClientScript() {
  const template = await fs.readFile(CLIENT_SCRIPT_PATH, "utf8");
  const version = getProductVersion();
  return template.replace(
    /^const PROJECT_VERSION = .*;/m,
    `const PROJECT_VERSION = ${JSON.stringify(version)};`
  );
}

async function writeProjectVersionJsResponse(res) {
  const body = await buildProjectVersionClientScript();
  res.writeHead(200, {
    "Content-Type": "application/javascript; charset=utf-8",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    Pragma: "no-cache",
    Expires: "0"
  });
  res.end(body);
}

module.exports = {
  buildProjectVersionClientScript,
  writeProjectVersionJsResponse
};
