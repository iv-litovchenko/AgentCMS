const http = require("http");
const fs = require("fs");
const fsPromises = require("fs/promises");
const path = require("path");
const { loadAgentCmsPortsModule } = require("./ports-resolve");
const { getAgentCmsPorts, hydrateProcessEnvFromRoot, syncLegacyPortEnvVars } =
  loadAgentCmsPortsModule();

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".wasm": "application/wasm",
  ".glb": "model/gltf-binary",
  ".mp3": "audio/mpeg",
  ".task": "application/octet-stream",
  ".md": "text/markdown; charset=utf-8"
};

let activeServer = null;

function resolvePublicRoot(options = {}) {
  if (options.publicRoot) return path.resolve(options.publicRoot);
  const root = path.resolve(String(options.root || path.join(__dirname, "..", "..")));
  return path.join(root, "public", "commander");
}

function resolveBrainsRoot(projectRoot) {
  const fromEnv = String(process.env.JARVIS_BRAINS_ROOT || "").trim();
  if (fromEnv) {
    const resolved = path.resolve(fromEnv);
    if (fs.existsSync(resolved)) return resolved;
  }
  const root = path.resolve(projectRoot);
  const candidates = [
    path.join(root, "..", "ws-focus", "awn-repositories", "JarvisAndBrains"),
    path.join(root, "workspaces", "0-ws-core", "awn-repositories", "JarvisAndBrains")
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function resolveCommanderFilePath(urlPath, publicRoot, projectRoot) {
  let rel = urlPath === "/" ? "/index.html" : urlPath;
  if (rel.includes("..")) return { error: 403 };

  const brainsPrefix = "/brains/";
  if (rel.startsWith(brainsPrefix)) {
    const brainsRoot = resolveBrainsRoot(projectRoot);
    if (!brainsRoot) return { error: 404 };
    const brainsRel = rel.slice(brainsPrefix.length);
    const filePath = path.join(brainsRoot, brainsRel);
    if (!filePath.startsWith(brainsRoot)) return { error: 403 };
    return { filePath };
  }

  const filePath = path.join(publicRoot, rel);
  if (!filePath.startsWith(publicRoot)) return { error: 403 };
  return { filePath };
}

function loadMaintenanceHelpers(projectRoot) {
  const root = path.resolve(projectRoot);
  return {
    getPlatformSettings: require(path.join(root, "lib", "config", "settings-store")).getPlatformSettings,
    isPlatformMaintenanceMode: require(path.join(root, "lib", "workspace", "workspace-agent-settings"))
      .isPlatformMaintenanceMode
  };
}

async function isCommanderMaintenanceActive(projectRoot) {
  try {
    const { getPlatformSettings, isPlatformMaintenanceMode } = loadMaintenanceHelpers(projectRoot);
    const settings = await getPlatformSettings(projectRoot);
    return isPlatformMaintenanceMode(settings);
  } catch {
    return false;
  }
}

async function serveCommanderMaintenanceHtml(res, projectRoot) {
  const maintenancePath = path.join(
    path.resolve(projectRoot),
    "public",
    "_resources",
    "maintenance.html"
  );
  const content = await fsPromises.readFile(maintenancePath);
  res.writeHead(503, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    "Retry-After": "300"
  });
  res.end(content);
}

function isCommanderMaintenanceBypassPath(urlPath) {
  const normalized = String(urlPath || "/").replace(/\/+$/, "") || "/";
  return normalized === "/maintenance";
}

function createStaticHandler(publicRoot, projectRoot) {
  return async (req, res) => {
    const urlPath = decodeURIComponent(String(req.url || "/").split("?")[0]);
    const normalized = String(urlPath || "/").replace(/\/+$/, "") || "/";

    if (normalized === "/maintenance") {
      const active = await isCommanderMaintenanceActive(projectRoot);
      if (!active) {
        res.writeHead(302, { Location: "/" });
        res.end();
        return;
      }
      try {
        await serveCommanderMaintenanceHtml(res, projectRoot);
      } catch {
        res.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Service Unavailable");
      }
      return;
    }

    const resolved = resolveCommanderFilePath(urlPath, publicRoot, projectRoot);
    if (resolved.error) {
      res.writeHead(resolved.error, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(resolved.error === 403 ? "Forbidden" : "Not found");
      return;
    }
    const filePath = resolved.filePath;

    const maintenanceActive = await isCommanderMaintenanceActive(projectRoot);
    if (maintenanceActive && !isCommanderMaintenanceBypassPath(urlPath)) {
      const ext = path.extname(filePath).toLowerCase();
      if (!ext || ext === ".html") {
        try {
          await serveCommanderMaintenanceHtml(res, projectRoot);
        } catch {
          res.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" });
          res.end("Service Unavailable");
        }
        return;
      }
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
    const server = http.createServer(createStaticHandler(publicRoot, projectRoot));
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
