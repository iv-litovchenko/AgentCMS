const path = require("path");

function requireRepo(relativePath) {
  const candidates = [
    path.join(__dirname, relativePath),
    path.join(__dirname, "..", "..", relativePath)
  ];
  let lastError;
  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch (error) {
      if (error?.code !== "MODULE_NOT_FOUND") throw error;
      lastError = error;
    }
  }
  throw lastError;
}

module.exports = { requireRepo };
