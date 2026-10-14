const fs = require("fs/promises");
const path = require("path");
const { PUBLIC_DIR, getStatus, handleTts } = require("./voice-test-core");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

const PREFIX = "/voice-test";
const API_PREFIX = "/api/voice-test";

function isVoiceTestPagePath(pathname) {
  return pathname === PREFIX || pathname.startsWith(`${PREFIX}/`);
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

async function tryHandleApi(req, res, url, sendJson) {
  if (req.method === "GET" && url.pathname === `${API_PREFIX}/status`) {
    const payload = await getStatus({
      mode: "cms",
      urls: [`${PREFIX}/`]
    });
    sendJson(res, 200, payload);
    return true;
  }
  if (req.method === "POST" && url.pathname === `${API_PREFIX}/tts`) {
    try {
      const body = await readJsonBody(req);
      const result = await handleTts(body);
      sendJson(res, 200, result);
    } catch (err) {
      sendJson(res, 500, { error: String(err.message || err) });
    }
    return true;
  }
  return false;
}

async function serveVoiceTestPage(res, pathname) {
  let rel = pathname.slice(PREFIX.length) || "/";
  if (rel === "/") rel = "/index.html";
  rel = rel.split("?")[0];
  const filePath = path.normalize(path.join(PUBLIC_DIR, rel.replace(/^\//, "")));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }
  try {
    const content = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": "no-cache, no-store, must-revalidate"
    });
    res.end(content);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}

module.exports = {
  PREFIX,
  API_PREFIX,
  isVoiceTestPagePath,
  tryHandleApi,
  serveVoiceTestPage
};
