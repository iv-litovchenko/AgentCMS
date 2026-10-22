"use strict";

const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const {
  getAgentCmsPorts,
  hydrateProcessEnvFromRoot,
  syncLegacyPortEnvVars
} = require("../config/agent-cms-ports");
const { resolveInternalCmsApiUrl } = require("../http/https-redirect");
const { shouldHandleLocally, handleLocalApi } = require("./control-server-local-api");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon"
};

let activeServer = null;

function resolvePublicRoot(options = {}) {
  if (options.publicRoot) return path.resolve(options.publicRoot);
  const root = path.resolve(String(options.root || process.cwd()));
  return path.join(root, "desktop", "agent-control", "ui");
}

function resolveAssetsRoot(options = {}) {
  const root = path.resolve(String(options.root || process.cwd()));
  return path.join(root, "desktop", "agent-control", "assets");
}

function resolveCmsApiUrl(options = {}) {
  const explicit = String(options.cmsApiUrl || process.env.CMS_API_URL || process.env.AGENT_CMS_BASE_URL || "").trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  return resolveInternalCmsApiUrl({
    boundPort: options.boundPort,
    boundTlsPort: options.boundTlsPort
  });
}

function createUpstreamAgent(targetUrl) {
  if (String(targetUrl || "").startsWith("https:")) {
    return new https.Agent({ rejectUnauthorized: false });
  }
  return undefined;
}

function proxyToCms(cmsApiUrl, req, res) {
  let target;
  try {
    target = new URL(String(req.url || "/"), `${cmsApiUrl.replace(/\/+$/, "")}/`);
  } catch {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Bad request");
    return;
  }

  const isHttps = target.protocol === "https:";
  const lib = isHttps ? https : http;
  const agent = createUpstreamAgent(target.href);

  const headers = { ...req.headers, host: target.host };
  delete headers.connection;

  const upstream = lib.request(
    {
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port || (isHttps ? 443 : 80),
      path: `${target.pathname}${target.search}`,
      method: req.method,
      headers,
      agent
    },
    (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode || 502, upstreamRes.headers);
      upstreamRes.pipe(res);
    }
  );

  upstream.on("error", () => {
    if (!res.headersSent) {
      res.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: false, error: "cms_unreachable", message: "Editor API недоступен" }));
    } else {
      res.end();
    }
  });

  if (req.method === "GET" || req.method === "HEAD") {
    upstream.end();
    return;
  }
  req.pipe(upstream);
}

function createStaticHandler(publicRoot, assetsRoot) {
  return (req, res) => {
    const urlPath = decodeURIComponent(String(req.url || "/").split("?")[0]);
    let rel = urlPath === "/" ? "/index.html" : urlPath;
    if (rel.includes("..")) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    let filePath = path.join(publicRoot, rel);
    let rootUsed = publicRoot;
    if (rel.startsWith("/assets/") && assetsRoot) {
      filePath = path.join(assetsRoot, rel.slice("/assets/".length));
      rootUsed = assetsRoot;
    }

    if (!filePath.startsWith(rootUsed)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    fs.readFile(filePath, (error, data) => {
      if (error) {
        if (error.code === "ENOENT") {
          res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
          res.end("Not found");
          return;
        }
        res.writeHead(500);
        res.end("Internal error");
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
        "Cache-Control": "no-cache, no-store, must-revalidate"
      });
      res.end(data);
    });
  };
}

function createRequestHandler(publicRoot, cmsApiUrl, assetsRoot, projectRoot) {
  const serveStatic = createStaticHandler(publicRoot, assetsRoot);
  return (req, res) => {
    const urlPath = String(req.url || "/").split("?")[0];
    if (urlPath.startsWith("/api/")) {
      if (shouldHandleLocally(urlPath)) {
        void handleLocalApi(req, res, projectRoot);
        return;
      }
      proxyToCms(cmsApiUrl, req, res);
      return;
    }
    serveStatic(req, res);
  };
}

function startControlServer(options = {}) {
  if (activeServer) {
    return Promise.resolve(activeServer.info);
  }

  const projectRoot = path.resolve(String(options.root || process.cwd()));
  hydrateProcessEnvFromRoot(projectRoot);
  syncLegacyPortEnvVars();

  const ports = getAgentCmsPorts();
  const port = Number(options.port ?? ports.controlHttp);
  const publicRoot = resolvePublicRoot({ ...options, root: projectRoot });
  const assetsRoot = resolveAssetsRoot({ root: projectRoot });
  const host = String(options.host ?? process.env.CONTROL_HOST ?? "127.0.0.1").trim() || "127.0.0.1";
  const cmsApiUrl = resolveCmsApiUrl(options);

  return new Promise((resolve, reject) => {
    const server = http.createServer(
      createRequestHandler(publicRoot, cmsApiUrl, assetsRoot, projectRoot)
    );
    server.on("error", reject);
    server.listen(port, host, () => {
      const url = `http://${host}:${port}/`;
      const info = { port, host, url, publicRoot, projectRoot, cmsApiUrl };
      activeServer = { server, info };
      resolve(info);
    });
  });
}

function stopControlServer() {
  if (!activeServer) return Promise.resolve();
  const { server } = activeServer;
  activeServer = null;
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

module.exports = {
  startControlServer,
  stopControlServer,
  resolvePublicRoot,
  resolveAssetsRoot
};
