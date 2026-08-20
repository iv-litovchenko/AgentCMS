#!/usr/bin/env node
/**
 * Agent CMS Voice — отдельное приложение на своём порту.
 * UI:  http://localhost:3088/<agent-id>/
 * API: прокси → CMS (PORT, по умолчанию 3000) /api/*
 */

const http = require("http");
const https = require("https");
const fs = require("fs/promises");
const fsSync = require("fs");
const path = require("path");
const os = require("os");
const agentRegistry = require("./agent-registry");
const {
  isHttpsRedirectEnabled,
  createHttpToHttpsRedirectHandler
} = require("./lib/https-redirect");

const ROOT = __dirname;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".mp4": "video/mp4",
  ".webmanifest": "application/manifest+json",
  ".wasm": "application/wasm",
  ".md": "text/markdown; charset=utf-8"
};

const SHELL_ASSET_SEGMENTS = new Set([
  "index.html",
  "shell.js",
  "shell.css",
  "shell-build.js",
  "shell-contract.js",
  "shell-runtimes.js",
  "manifest.webmanifest",
  "favicon.svg",
  "favicon.png",
  "apple-touch-icon.png",
  "vendor",
  "icons"
]);

const VOICE_RESERVED_ROOT = new Set([
  "shell",
  "shared",
  "vendor",
  "cms",
  "a",
  "api",
  "favicon.svg",
  "project-version.js",
  "app-lock.js",
  "app-lock-scanner.js",
  "markdown-github-alerts.js",
  "markdown-it-task-lists.js",
  "index.html",
  "404.html",
  "preview.html"
]);

let httpServer = null;
let httpsServer = null;

function getPublicDir() {
  return path.join(ROOT, "public");
}

function getShellDir() {
  return path.join(getPublicDir(), "shell");
}

function cmsApiBase() {
  return String(process.env.CMS_API_URL || process.env.AGENT_CMS_BASE_URL || "http://127.0.0.1:3000").replace(
    /\/+$/,
    ""
  );
}

function isKnownAgentId(agentId) {
  try {
    return agentRegistry.getAgentsPublicList().some((agent) => agent.id === agentId);
  } catch {
    return false;
  }
}

function resolveVoiceAppPath(reqPath) {
  const normalized = String(reqPath || "/").replace(/\/+$/, "") || "/";
  if (normalized === "/") return "/shell/index.html";

  if (normalized.startsWith("/shell/")) return normalized;

  const rootMatch = normalized.match(/^\/([^/]+)$/);
  if (rootMatch) {
    const segment = decodeURIComponent(rootMatch[1]);
    if (!VOICE_RESERVED_ROOT.has(segment) && !segment.includes(".") && isKnownAgentId(segment)) {
      return "/shell/index.html";
    }
  }

  return normalized;
}

function isSpaFallbackPath(reqPath) {
  const normalized = String(reqPath || "/").replace(/\/+$/, "") || "/";
  if (normalized === "/") return true;
  const rootMatch = normalized.match(/^\/([^/]+)$/);
  if (!rootMatch) return false;
  const segment = decodeURIComponent(rootMatch[1]);
  return !VOICE_RESERVED_ROOT.has(segment) && !segment.includes(".") && isKnownAgentId(segment);
}

async function readRequestBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

function filterProxyRequestHeaders(headers, targetHost) {
  const next = { ...headers };
  delete next.host;
  delete next.connection;
  if (targetHost) next.host = targetHost;
  return next;
}

function isLocalCmsHost(hostname) {
  const host = String(hostname || "").trim().toLowerCase();
  return host === "127.0.0.1" || host === "localhost" || host === "::1" || host.endsWith(".local");
}

function cmsProxyAgent(target) {
  if (target.protocol !== "https:") return undefined;
  if (process.env.CMS_PROXY_INSECURE_TLS === "1" || isLocalCmsHost(target.hostname)) {
    return new https.Agent({ rejectUnauthorized: false });
  }
  return undefined;
}

function proxyToCms(req, res, url) {
  const cmsBase = cmsApiBase();
  const target = new URL(`${url.pathname}${url.search}`, `${cmsBase}/`);
  const client = target.protocol === "https:" ? https : http;
  const agent = cmsProxyAgent(target);

  const proxyReq = client.request(
    target,
    {
      method: req.method,
      headers: filterProxyRequestHeaders(req.headers, target.host),
      agent
    },
    (proxyRes) => {
      const headers = { ...proxyRes.headers };
      delete headers["transfer-encoding"];
      res.writeHead(proxyRes.statusCode || 502, headers);
      proxyRes.pipe(res);
    }
  );

  proxyReq.on("error", (error) => {
    if (!res.headersSent) {
      res.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
      res.end(
        JSON.stringify({
          error: "CMS backend unavailable",
          details: String(error?.message || error),
          cmsApiUrl: cmsBase
        })
      );
      return;
    }
    res.end();
  });

  if (req.method === "GET" || req.method === "HEAD") {
    proxyReq.end();
    return;
  }

  req.pipe(proxyReq);
}

async function serveStaticFile(relativePath, res) {
  const publicDir = getPublicDir();
  let safePath = path.normalize(relativePath).replace(/^(\.\.[\\/])+/, "").replace(/^[/\\]+/, "");
  let filePath = path.join(publicDir, safePath);

  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    let content = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();

    if (ext === ".html" && safePath === "shell/index.html") {
      const html = content.toString("utf-8");
      if (!html.includes('name="agent-cms-voice-app"')) {
        content = Buffer.from(
          html.replace(
            "<head>",
            '<head>\n    <meta name="agent-cms-voice-app" content="1" />'
          )
        );
      }
    }

    res.writeHead(200, {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0"
    });
    res.end(content);
  } catch {
    if (isSpaFallbackPath(relativePath === "/shell/index.html" ? "/" : relativePath)) {
      await serveStaticFile("/shell/index.html", res);
      return;
    }
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}

async function serveStatic(reqPath, res) {
  const resolved = resolveVoiceAppPath(reqPath);
  if (resolved.startsWith("/shell/")) {
    await serveStaticFile(resolved.replace(/^\//, ""), res);
    return;
  }

  if (resolved.startsWith("/shared/") || resolved.startsWith("/vendor/") || resolved.startsWith("/cms/")) {
    await serveStaticFile(resolved.replace(/^\//, ""), res);
    return;
  }

  const rootFile = resolved.replace(/^\//, "");
  if (rootFile && !rootFile.includes("/")) {
    await serveStaticFile(rootFile, res);
    return;
  }

  await serveStaticFile(resolved.replace(/^\//, ""), res);
}

function createVoiceRequestHandler() {
  return async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname.startsWith("/api/")) {
      proxyToCms(req, res, url);
      return;
    }
    await serveStatic(url.pathname, res);
  };
}

function readTlsCredentials() {
  const keyPath = process.env.VOICE_TLS_KEY || process.env.TLS_KEY || process.env.HTTPS_KEY;
  const certPath = process.env.VOICE_TLS_CERT || process.env.TLS_CERT || process.env.HTTPS_CERT;
  if (!keyPath || !certPath || !fsSync.existsSync(keyPath) || !fsSync.existsSync(certPath)) {
    return null;
  }
  return {
    key: fsSync.readFileSync(keyPath),
    cert: fsSync.readFileSync(certPath)
  };
}

function listenServer(server, { host, port, tryNextPort = false }) {
  return new Promise((resolve, reject) => {
    let currentPort = port;
    const maxAttempts = tryNextPort ? 20 : 1;

    const attempt = (attemptIndex = 0) => {
      const onError = (error) => {
        if (error.code === "EADDRINUSE" && tryNextPort && attemptIndex + 1 < maxAttempts) {
          currentPort += 1;
          attempt(attemptIndex + 1);
          return;
        }
        reject(error);
      };

      server.once("error", onError);
      const onListening = () => {
        server.removeListener("error", onError);
        resolve(currentPort);
      };

      if (host) server.listen(currentPort, host, onListening);
      else server.listen(currentPort, onListening);
    };

    attempt();
  });
}

function getLanIPv4() {
  for (const nets of Object.values(os.networkInterfaces())) {
    for (const net of nets || []) {
      if (net && net.family === "IPv4" && !net.internal) return net.address;
    }
  }
  return "";
}

function shellLegacyRedirectTarget(pathname) {
  if (pathname === "/shell" || pathname === "/shell/") return "/";
  const match = String(pathname || "").match(/^\/shell\/([^/]+)\/?$/);
  if (!match) return null;
  const segment = decodeURIComponent(match[1]);
  if (SHELL_ASSET_SEGMENTS.has(segment)) return null;
  if (!isKnownAgentId(segment)) return null;
  return `/${encodeURIComponent(segment)}/`;
}

async function startVoiceServer(options = {}) {
  await stopVoiceServer();

  agentRegistry.init(options.root || ROOT);

  const host = options.host ?? process.env.VOICE_HOST ?? process.env.HOST ?? "127.0.0.1";
  const port = Number(options.port ?? process.env.VOICE_PORT ?? 3088);
  const tlsPort = Number(options.tlsPort ?? process.env.VOICE_TLS_PORT ?? 3488);
  const tryNextPort = Boolean(options.tryNextPort);
  const handler = createVoiceRequestHandler();
  const lanIp = getLanIPv4();
  const tls = readTlsCredentials();

  if (process.env.VOICE_TLS_ONLY === "1" && tls) {
    httpsServer = https.createServer(tls, handler);
    const boundTlsPort = await listenServer(httpsServer, { host, port: tlsPort, tryNextPort });
    const hostname = host || "localhost";
    const url = `https://${hostname}:${boundTlsPort}`;
    return {
      port: boundTlsPort,
      tlsPort: boundTlsPort,
      host: hostname,
      url,
      scheme: "https",
      lanIp,
      tls: true,
      httpUrl: null,
      httpsUrl: lanIp ? `https://${lanIp}:${boundTlsPort}` : url,
      cmsApiUrl: cmsApiBase(),
      shellLegacyRedirect: shellLegacyRedirectTarget,
      stop: stopVoiceServer
    };
  }

  const hostname = host || "localhost";
  let httpUrl = null;
  let httpsUrl = null;
  let boundPort = null;
  let boundTlsPort = null;

  if (tls) {
    httpsServer = https.createServer(tls, handler);
    boundTlsPort = await listenServer(httpsServer, { host, port: tlsPort, tryNextPort: false });
    httpsUrl = `https://${hostname}:${boundTlsPort}`;

    const httpHandler = isHttpsRedirectEnabled()
      ? createHttpToHttpsRedirectHandler({ tlsPort: boundTlsPort, hostname })
      : handler;
    httpServer = http.createServer(httpHandler);
    boundPort = await listenServer(httpServer, { host, port, tryNextPort });
    httpUrl = `http://${hostname}:${boundPort}`;
  } else {
    httpServer = http.createServer(handler);
    boundPort = await listenServer(httpServer, { host, port, tryNextPort });
    httpUrl = `http://${hostname}:${boundPort}`;
  }

  return {
    port: boundPort,
    tlsPort: boundTlsPort,
    host: hostname,
    url: httpsUrl || httpUrl,
    scheme: httpsUrl ? "https" : "http",
    lanIp,
    tls: Boolean(httpsUrl),
    httpUrl: lanIp ? `http://${lanIp}:${boundPort}` : httpUrl,
    httpsUrl: lanIp && boundTlsPort ? `https://${lanIp}:${boundTlsPort}` : httpsUrl,
    cmsApiUrl: cmsApiBase(),
    shellLegacyRedirect: shellLegacyRedirectTarget,
    stop: stopVoiceServer
  };
}

async function stopVoiceServer() {
  const closes = [];
  if (httpServer) {
    closes.push(
      new Promise((resolve, reject) => {
        httpServer.close((error) => (error ? reject(error) : resolve()));
      })
    );
    httpServer = null;
  }
  if (httpsServer) {
    closes.push(
      new Promise((resolve, reject) => {
        httpsServer.close((error) => (error ? reject(error) : resolve()));
      })
    );
    httpsServer = null;
  }
  if (closes.length) await Promise.all(closes);
}

if (require.main === module) {
  startVoiceServer({ root: ROOT, tryNextPort: false })
    .then((info) => {
      if (info.httpUrl) {
        console.log(
          `Agent CMS Voice HTTP  at ${info.httpUrl}${
            info.httpsUrl && isHttpsRedirectEnabled() ? " → redirects to HTTPS" : ""
          }`
        );
      }
      if (info.httpsUrl) console.log(`Agent CMS Voice HTTPS at ${info.httpsUrl}`);
      console.log(`CMS API proxy      → ${info.cmsApiUrl}`);
      console.log("");
      console.log("Откройте: /  или  /<agent-id>/");
      console.log("Пример:   /agent-cms-core/");
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = {
  startVoiceServer,
  stopVoiceServer,
  shellLegacyRedirectTarget,
  SHELL_ASSET_SEGMENTS
};
