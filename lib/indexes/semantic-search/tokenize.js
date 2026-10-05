/** Unicode word tokens (RU/EN), min length 2. Pure JS — no deps. */
function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]+/gu, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

module.exports = { tokenize };
