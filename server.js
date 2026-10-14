const http = require("http");
const fs = require("fs");
const path = require("path");
const { loadAgentCmsPortsModule } = require("./ports-resolve");
const { getAgentCmsPorts, hydrateProcessEnvFromRoot, syncLegacyPortEnvVars } =
  loadAgentCmsPortsModule();

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
  const root = path.resolve(String(options.root || path.join(__dirname, "..", "..")));
  return path.join(root, "public", "commander");
}

function createStaticHandler(publicRoot) {
  return (req, res) => {
    const urlPath = decodeURIComponent(String(req.url || "/").split("?")[0]);
    let rel = urlPath === "/" ? "/index.html" : urlPath;
    if (rel.includes("..")) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    const filePath = path.join(publicRoot, rel);
    if (!filePath.startsWith(publicRoot)) {
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
      res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
      res.end(data);
    });
  };
}

function startCommanderServer(options = {}) {
  if (activeServer) {
    return Promise.resolve(activeServer.info);
  }

  const projectRoot = path.resolve(String(options.root || path.join(__dirname, "..", "..")));
  hydrateProcessEnvFromRoot(projectRoot);
  syncLegacyPortEnvVars();

  const ports = getAgentCmsPorts();
  const port = Number(options.port ?? ports.commanderHttp);
  const publicRoot = resolvePublicRoot({ ...options, root: projectRoot });
  const host = String(options.host || "127.0.0.1").trim() || "127.0.0.1";

  return new Promise((resolve, reject) => {
    const server = http.createServer(createStaticHandler(publicRoot));
    server.on("error", reject);
    server.listen(port, host, () => {
      const url = `http://${host}:${port}/`;
      const info = { port, host, url, publicRoot, projectRoot };
      activeServer = { server, info };
      resolve(info);
    });
  });
}

function stopCommanderServer() {
  if (!activeServer) return Promise.resolve();
  const { server } = activeServer;
  activeServer = null;
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

module.exports = {
  startCommanderServer,
  stopCommanderServer,
  resolvePublicRoot
};
