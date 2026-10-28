const fs = require("fs");
const path = require("path");

const CONTENT_EASTER_EGGS_REL = path.join("_content_", "easter-eggs");

function readJsonFile(absPath) {
  try {
    const raw = fs.readFileSync(absPath, "utf8");
    const data = JSON.parse(raw);
    return data && typeof data === "object" ? data : null;
  } catch {
    return null;
  }
}

function normalizeItems(doc, key = "items") {
  const list = Array.isArray(doc?.[key]) ? doc[key] : Array.isArray(doc) ? doc : [];
  return list;
}

function loadPlatformUiEggs(projectRoot = process.cwd()) {
  const root = path.resolve(projectRoot);
  const eggsDir = path.join(root, CONTENT_EASTER_EGGS_REL);
  const slogansDoc = readJsonFile(path.join(eggsDir, "slogans.json"));
  const quotesDoc = readJsonFile(path.join(eggsDir, "quotes.json"));

  return {
    source: CONTENT_EASTER_EGGS_REL.replace(/\\/g, "/"),
    slogans: normalizeItems(slogansDoc),
    homeTitles: normalizeItems(quotesDoc),
    files: {
      slogans: `${CONTENT_EASTER_EGGS_REL}/slogans.json`.replace(/\\/g, "/"),
      quotes: `${CONTENT_EASTER_EGGS_REL}/quotes.json`.replace(/\\/g, "/")
    }
  };
}

module.exports = {
  CONTENT_EASTER_EGGS_REL,
  loadPlatformUiEggs
};
