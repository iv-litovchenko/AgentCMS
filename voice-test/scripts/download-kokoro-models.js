#!/usr/bin/env node
/**
 * Скачивает kokoro-v1.0.int8.onnx + voices-v1.0.bin (~100 MB) в voice-test/models/
 */
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const https = require("https");

const ROOT = path.join(__dirname, "..");
const MODEL_DIR = path.join(ROOT, "models");
const BASE =
  "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.1";

const FILES = [
  { name: "kokoro-v1.0.onnx", url: `${BASE}/kokoro-v1.0.onnx` },
  { name: "voices-v1.0.bin", url: `${BASE}/voices-v1.0.bin` }
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const req = https.get(url, { headers: { "User-Agent": "YamlCMS-voice-test" } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        fs.unlink(dest, () => {});
        download(res.headers.location, dest).then(resolve, reject);
        return;
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlink(dest, () => {});
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      res.pipe(file);
      file.on("finish", () => file.close(resolve));
    });
    req.on("error", reject);
    file.on("error", (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function main() {
  await fsp.mkdir(MODEL_DIR, { recursive: true });
  for (const { name, url } of FILES) {
    const dest = path.join(MODEL_DIR, name);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) {
      // eslint-disable-next-line no-console
      console.log(`skip ${name} (already exists)`);
      continue;
    }
    // eslint-disable-next-line no-console
    console.log(`download ${name}…`);
    await download(url, dest);
    // eslint-disable-next-line no-console
    console.log(`  → ${dest}`);
  }
  // eslint-disable-next-line no-console
  console.log("Kokoro models OK");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err.message || err);
  process.exit(1);
});
