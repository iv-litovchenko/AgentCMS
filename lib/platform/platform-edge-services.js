"use strict";

const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");
const { hydrateProcessEnvFromRoot } = require("../config/agent-cms-ports");
const { resolvePublicBaseUrl } = require("./platform-apps");

function probeTcp(host, port, timeoutMs = 400) {
  return new Promise((resolve) => {
    const socket = require("net").connect({ host, port, timeout: timeoutMs }, () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("error", () => resolve(false));
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

/** @typedef {"proxy"|"static"} EdgeServiceKind */

/**
 * @type {Array<{
 *   serviceId: string,
 *   slug: string,
 *   title: string,
 *   description: string,
 *   kind: EdgeServiceKind,
 *   icon: string,
 *   healthPath?: string,
 *   upstreamEnvKey?: string,
 *   defaultUpstream?: string,
 *   staticDir?: string,
 *   dataOnDisk?: boolean
 * }>}
 */
const PLATFORM_EDGE_SERVICE_CATALOG = [
  {
    serviceId: "all",
    slug: "all",
    title: "Каталог «Все»",
    description: "Ссылки на CMS и edge-сервисы на этом хосте.",
    kind: "static",
    icon: "🗺️",
    staticDir: "all"
  },
  {
    serviceId: "qwenpaw",
    slug: "qwenpaw",
    title: "Agent CMS QwenPaw",
    description: "Отдельный контейнер agentscope/qwenpaw.",
    kind: "proxy",
    icon: "🐾",
    healthPath: "/",
    upstreamEnvKey: "AGENT_CMS_QWENPAW_INTERNAL_URL",
    defaultUpstream: "http://qwenpaw:8088",
    dataOnDisk: true
  }
];

function isEdgeServicesEnabled(env = process.env) {
  const raw = env.AGENT_CMS_EDGE_SERVICES_ENABLED;
  if (raw === undefined || raw === null || String(raw).trim() === "") {
    return true;
  }
  const v = String(raw).trim().toLowerCase();
  if (v === "0" || v === "false" || v === "no") return false;
  return v === "1" || v === "true" || v === "yes";
}

function resolveServicesDataDirName(env = process.env) {
  return String(env.AGENT_CMS_SERVICES_DATA_DIR || "0-services-data").replace(/^\/+|\/+$/g, "");
}

function resolveServicesWorkspacesRoot(env = process.env) {
  return String(env.AGENT_CMS_WORKSPACES_DIR || "./workspaces").replace(/\/+$/, "");
}

/** Host-relative path: workspaces/0-services-data/{serviceId} */
function resolveEdgeServiceDataRelPath(serviceId, env = process.env) {
  const ws = resolveServicesWorkspacesRoot(env).replace(/^\.\/+/, "");
  const dataDir = resolveServicesDataDirName(env);
  const id = String(serviceId || "").trim();
  return `${ws}/${dataDir}/${id}`.replace(/\/+/g, "/");
}

function isEdgeHttpGatewayEnabled(env = process.env) {
  if (!isEdgeServicesEnabled(env)) return false;
  const gate = String(env.AGENT_CMS_EDGE_HTTP_GATE || "").trim().toLowerCase();
  if (gate === "1" || gate === "true" || gate === "yes") return true;
  if (gate === "0" || gate === "false" || gate === "no") return false;
  const platform = String(env.AGENT_CMS_DEPLOY_PLATFORM || "").trim().toLowerCase();
  return platform === "mac" || platform === "windows";
}

function resolveEdgeApexHost(env = process.env) {
  const domain = String(env.AGENT_CMS_PUBLIC_DOMAIN || "").trim().toLowerCase();
  if (domain) return domain;
  try {
    const base = resolvePublicBaseUrl(undefined, env);
    return new URL(base).hostname.toLowerCase();
  } catch {
    return "localhost";
  }
}

/**
 * @param {string} hostHeader
 * @param {NodeJS.ProcessEnv} [env]
 */
function classifyEdgeHost(hostHeader, env = process.env) {
  const host = String(hostHeader || "")
    .split(":")[0]
    .trim()
    .toLowerCase();
  if (!host || host === "127.0.0.1" || host === "0.0.0.0") {
    return { kind: "apex", host };
  }
  const apex = resolveEdgeApexHost(env);
  if (host === apex) return { kind: "apex", host };
  const suffix = `.${apex}`;
  if (!host.endsWith(suffix)) return { kind: "other", host };
  const slug = host.slice(0, -suffix.length);
  if (!slug || slug.includes(".")) return { kind: "unknown", host, slug };
  const svc = PLATFORM_EDGE_SERVICE_CATALOG.find((row) => row.slug === slug);
  if (svc) {
    return { kind: "service", host, slug, serviceId: svc.serviceId, service: svc };
  }
  return { kind: "unknown", host, slug };
}

function resolveEdgeStaticRoot(projectRoot) {
  return path.join(projectRoot, "docs", "deploy", "edge-static");
}

function resolveUpstreamBase(entry, env = process.env) {
  const key = entry.upstreamEnvKey;
  const fromEnv = key ? String(env[key] || "").trim().replace(/\/+$/, "") : "";
  return fromEnv || String(entry.defaultUpstream || "").replace(/\/+$/, "");
}

/**
 * @param {import("http").IncomingMessage} [req]
 * @param {NodeJS.ProcessEnv} [env]
 */
function buildEdgeSubdomainUrl(slug, req, env = process.env) {
  const apex = resolveEdgeApexHost(env);
  const host = `${slug}.${apex}`;
  if (req?.headers?.host) {
    const raw = String(req.headers.host).trim();
    const portMatch = raw.match(/:(\d+)$/);
    if (portMatch) {
      const port = portMatch[1];
      if (port !== "80" && port !== "443") {
        const forwarded = String(req.headers["x-forwarded-proto"] || "")
          .split(",")[0]
          .trim()
          .toLowerCase();
        const proto =
          forwarded === "https" || forwarded === "http"
            ? forwarded
            : req.socket?.encrypted
              ? "https"
              : "http";
        return `${proto}://${host}:${port}/`;
      }
    }
    const forwarded = String(req.headers["x-forwarded-proto"] || "")
      .split(",")[0]
      .trim()
      .toLowerCase();
    const proto =
      forwarded === "https" || forwarded === "http"
        ? forwarded
        : req.socket?.encrypted
          ? "https"
          : "http";
    return `${proto}://${host}/`;
  }
  const base = resolvePublicBaseUrl(req, env);
  try {
    const u = new URL(base);
    u.hostname = host;
    u.pathname = "/";
    u.search = "";
    u.hash = "";
    return u.toString();
  } catch {
    return `http://${host}:3000/`;
  }
}

function probeHttpOk(url, timeoutMs = 1200) {
  return new Promise((resolve) => {
    let target;
    try {
      target = new URL(url);
    } catch {
      resolve(false);
      return;
    }
    const lib = target.protocol === "https:" ? https : http;
    const req = lib.request(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port || (target.protocol === "https:" ? 443 : 80),
        path: `${target.pathname}${target.search}`,
        method: "GET",
        timeout: timeoutMs
      },
      (res) => {
        res.resume();
        resolve(res.statusCode >= 200 && res.statusCode < 500);
      }
    );
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

async function probeEdgeAppRunning(entry, env = process.env) {
  if (entry.kind === "static") return true;
  const base = resolveUpstreamBase(entry, env);
  if (!base) return false;
  try {
    const u = new URL(entry.healthPath || "/", `${base}/`);
    const host = u.hostname;
    const port = Number(u.port) || (u.protocol === "https:" ? 443 : 80);
    if (await probeTcp(host, port, 500)) {
      return probeHttpOk(u.toString(), 1500);
    }
    return false;
  } catch {
    return false;
  }
}

function resolveEdgeRoutingMode(env = process.env) {
  if (isEdgeHttpGatewayEnabled(env)) return "cms-http-gate";
  return "caddy";
}

/**
 * @param {object} options
 * @param {string} [options.projectRoot]
 * @param {import("http").IncomingMessage} [options.req]
 */
async function buildPlatformServicesPayload(options = {}) {
  const root = options.projectRoot || process.cwd();
  hydrateProcessEnvFromRoot(root);
  const env = process.env;
  const servicesEnabled = isEdgeServicesEnabled(env);
  if (!servicesEnabled) {
    return {
      ok: true,
      servicesEnabled: false,
      apexHost: resolveEdgeApexHost(env),
      servicesDataDir: resolveServicesDataDirName(env),
      routing: null,
      services: []
    };
  }

  const apexHost = resolveEdgeApexHost(env);
  const routing = resolveEdgeRoutingMode(env);
  const services = [];
  for (const entry of PLATFORM_EDGE_SERVICE_CATALOG) {
    const running = await probeEdgeAppRunning(entry, env);
    /** @type {Record<string, unknown>} */
    const row = {
      serviceId: entry.serviceId,
      slug: entry.slug,
      title: entry.title,
      description: entry.description,
      kind: entry.kind,
      icon: entry.icon,
      publicUrl: buildEdgeSubdomainUrl(entry.slug, options.req, env),
      running: Boolean(running)
    };
    if (entry.dataOnDisk) {
      row.dataPathRel = resolveEdgeServiceDataRelPath(entry.serviceId, env);
    }
    if (entry.kind === "proxy") {
      const internal = resolveUpstreamBase(entry, env);
      if (internal && String(env.NODE_ENV || "").toLowerCase() !== "production") {
        row.internalUrl = internal;
      }
    }
    services.push(row);
  }

  return {
    ok: true,
    servicesEnabled: true,
    apexHost,
    servicesDataDir: resolveServicesDataDirName(env),
    routing,
    httpGate: isEdgeHttpGatewayEnabled(env),
    catalogUrl: buildEdgeSubdomainUrl("all", options.req, env),
    services
  };
}

function findEdgeCatalogEntry(id) {
  const key = String(id || "").trim();
  return (
    PLATFORM_EDGE_SERVICE_CATALOG.find((row) => row.serviceId === key || row.slug === key) ||
    null
  );
}

function readEdgeStaticFile(projectRoot, dirName, urlPath) {
  const root = path.join(resolveEdgeStaticRoot(projectRoot), dirName);
  let rel = String(urlPath || "/").split("?")[0];
  if (rel === "/" || rel === "") rel = "/index.html";
  const filePath = path.normalize(path.join(root, rel));
  if (!filePath.startsWith(root)) return null;
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    const indexPath = path.join(root, "index.html");
    return fs.existsSync(indexPath) ? indexPath : null;
  }
  return filePath;
}

module.exports = {
  PLATFORM_EDGE_SERVICE_CATALOG,
  isEdgeServicesEnabled,
  isEdgeHttpGatewayEnabled,
  resolveServicesDataDirName,
  resolveEdgeServiceDataRelPath,
  resolveEdgeApexHost,
  classifyEdgeHost,
  resolveEdgeStaticRoot,
  resolveUpstreamBase,
  buildEdgeSubdomainUrl,
  buildPlatformServicesPayload,
  findEdgeCatalogEntry,
  readEdgeStaticFile
};
