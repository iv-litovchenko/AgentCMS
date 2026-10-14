#!/usr/bin/env node
/**
 * Локальный стенд: Edge TTS + (опционально) Kokoro / Chatterbox через Python.
 * Также доступен через CMS: http://localhost:3000/voice-test/
 */
const http = require("http");
const fs = require("fs/promises");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");
const { PUBLIC_DIR, getStatus, handleTts } = require("../lib/voice/voice-test-core");

const execFileAsync = promisify(execFile);
const PORT = Number(process.env.VOICE_TEST_PORT || 3099);
const HOST = process.env.VOICE_TEST_HOST || "0.0.0.0";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

async function serveStatic(res, urlPath) {
  let rel = urlPath === "/" ? "/index.html" : urlPath;
  rel = rel.split("?")[0];
  const filePath = path.normalize(path.join(PUBLIC_DIR, rel.replace(/^\//, "")));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }
  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath);
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": "no-cache, no-store, must-revalidate"
    });
    res.end(data);
  } catch {
    sendJson(res, 404, { error: "Not found" });
  }
}

function printUrls(port) {
  const urls = [`http://127.0.0.1:${port}/`, `http://localhost:${port}/`];
  // eslint-disable-next-line no-console
  console.log("voice-test запущен:");
  for (const u of urls) console.log(`  → ${u}`);
  // eslint-disable-next-line no-console
  console.log("Или через CMS (npm start): http://127.0.0.1:3000/voice-test/");
  // eslint-disable-next-line no-console
  console.log("Не открывайте index.html двойным щелчком — нужен сервер.");
}

async function maybeOpenBrowser(port) {
  if (process.env.VOICE_TEST_OPEN === "0") return;
  const url = `http://127.0.0.1:${port}/`;
  if (process.platform === "darwin") {
    await execFileAsync("open", [url]).catch(() => {});
  }
}

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || "/", `http://127.0.0.1:${PORT}`);

  try {
    if (req.method === "GET" && url.pathname === "/api/status") {
      sendJson(
        res,
        200,
        await getStatus({
          port: PORT,
          mode: "standalone",
          urls: [`http://127.0.0.1:${PORT}/`, `http://localhost:${PORT}/`]
        })
      );
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/tts") {
      const body = await readBody(req);
      const result = await handleTts(body);
      sendJson(res, 200, result);
      return;
    }
    if (req.method === "GET") {
      await serveStatic(res, url.pathname);
      return;
    }
    sendJson(res, 405, { error: "Method not allowed" });
  } catch (err) {
    sendJson(res, 500, { error: String(err.message || err) });
  }
});

if (require.main === module) {
  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      // eslint-disable-next-line no-console
      console.error(`Порт ${PORT} занят. Закройте другой voice-test или: VOICE_TEST_PORT=3098 npm run voice:test`);
      process.exit(1);
    }
    throw err;
  });
  server.listen(PORT, HOST, () => {
    printUrls(PORT);
    maybeOpenBrowser(PORT);
  });
}

module.exports = { server, getStatus, handleTts };
