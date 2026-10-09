const crypto = require("crypto");

const CONTENT_HASH_ALGO = "sha256";

function hashUtf8(text) {
  return crypto.createHash(CONTENT_HASH_ALGO).update(String(text ?? ""), "utf8").digest("hex");
}

function fingerprintJson(value) {
  return hashUtf8(JSON.stringify(value ?? null));
}

module.exports = { CONTENT_HASH_ALGO, hashUtf8, fingerprintJson };
