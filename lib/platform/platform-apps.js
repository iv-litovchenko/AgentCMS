"use strict";

const http = require("http");
const https = require("https");
const { getAgentCmsPorts, hydrateProcessEnvFromRoot, buildLocalhostUrls } = require("../config/agent-cms-ports");

/** @typedef {"ui"|"api"} PlatformAppKind */

/**
 * @type {Array<{
 *   appId: string,
 *   title: string,
 *   kind: PlatformAppKind,
 *   publicPath: string,
 *   internalPortKey?: keyof ReturnType<typeof getAgentCmsPorts>,
 *   showInEditorDropdown: boolean,
 *   legacyPaths?: string[]
 * }>}
 */
const PLATFORM_APP_CATALOG = [
  {
    appId: "editor",
    title: "Agent CMS Editor",
    kind: "ui",
    publicPath: "/",
    internalPortKey: "editorHttp",
    showInEditorDropdown: false
  },
  {
    appId: "chat",
    title: "Agent CMS Voice (Flow / chat)",
    kind: "ui",
    publicPath: "/app-chat",
    internalPortKey: "voiceHttp",
    showInEditorDropdown: true,
    legacyPaths: ["/shell", "/chat"]
  },
  {
    appId: "commander",
    title: "Commander",
    kind: "ui",
    publicPath: "/app-commander",
    internalPortKey: "commanderHttp",
    showInEditorDropdown: true,
    legacyPaths: ["/commander"]
  },
  {
    appId: "control",
    title: "Agent CMS Control (Launcher)",
    kind: "ui",
    publicPath: "/app-control",
    internalPortKey: "controlHttp",
    showInEditorDropdown: true,
    legacyPaths: ["/control"]
  },
  {
    appId: "mcp",
    title: "Agent CMS MCP",
    kind: "api",
    publicPath: "/app-mcp",
    internalPortKey: "mcpHttp",
    showInEditorDropdown: false,
    legacyPaths: ["/mcp"]
  }
];

/** Chat — статика shell на CMS; commander/control/mcp — HTTP-прокси на server.js. */
const APP_PATH_REWRITES = {
  "/app-chat": "/shell/"
};

function normalizeTrailingSlash(pathname) {
  const p = String(pathname || "/");
  if (p.length > 1 && p.endsWith("/")) return p.replace(/\/+$/, "") || "/";
  return p;
}

/** Статика public/ (CSS/JS/…) — не редиректить /shell/* → /app-chat/* (иначе отдаётся SPA HTML). */
function isPublicStaticAssetPath(pathname) {
  const pathOnly = String(pathname || "").split("?")[0];
  return /\.(css|js|mjs|map|json|svg|png|jpe?g|gif|webp|ico|woff2?|ttf|eot|webmanifest|wasm|txt|mp3|mp4|wav)$/i.test(
    pathOnly
  );
}

/**
 * @param {import("http").IncomingMessage} [req]
 * @param {NodeJS.ProcessEnv} [env]
 */
function isInternalComposeHost(hostname) {
  const h = String(hostname || "")
    .split(":")[0]
    .trim()
    .toLowerCase();
  return h === "cms" || h === "mcp" || h === "control";
}

function resolvePublicBaseUrl(req, env = process.env) {
  const fromEnv = String(
    env.AGENT_CMS_PUBLIC_URL || env.AGENT_CMS_BASE_URL || env.AGENT_CMS_EDITOR_HTTPS_URL || env.AGENT_CMS_EDITOR_HTTP_URL || ""
  )
    .trim()
    .replace(/\/+$/, "");
  if (fromEnv) return fromEnv;

  if (req?.headers?.host) {
    const hostHeader = String(req.headers.host).trim();
    const hostname = hostHeader.split(":")[0].trim();
    if (!isInternalComposeHost(hostname)) {
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
      return `${proto}://${hostHeader}`.replace(/\/+$/, "");
    }
  }

  const ports = getAgentCmsPorts(env);
  return `http://localhost:${ports.editorHttp}`;
}

function resolveSiteTitle(env = process.env) {
  return String(env.AGENT_CMS_SITE_TITLE || "Agent CMS").trim() || "Agent CMS";
}

function shouldExposeInternalPorts(env = process.env) {
  const flag = String(env.AGENT_CMS_EXPOSE_INTERNAL_PORTS || "").trim().toLowerCase();
  if (flag === "1" || flag === "true" || flag === "yes") return true;
  return String(env.NODE_ENV || "").trim().toLowerCase() !== "production";
}

function joinPublicUrl(base, publicPath) {
  const root = String(base || "").replace(/\/+$/, "");
  const path = String(publicPath || "/");
  if (path === "/") return `${root}/`;
  const segment = path.startsWith("/") ? path : `/${path}`;
  return `${root}${segment}`;
}

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

async function probeMcpHealth(baseUrl) {
  const url = `${String(baseUrl || "").replace(/\/+$/, "")}/health`;
  try {
    const lib = url.startsWith("https:") ? https : http;
    return await new Promise((resolve) => {
      const req = lib.get(url, { timeout: 800 }, (res) => {
        res.resume();
        resolve(res.statusCode >= 200 && res.statusCode < 300);
      });
      req.on("error", () => resolve(false));
      req.on("timeout", () => {
        req.destroy();
        resolve(false);
      });
    });
  } catch {
    return false;
  }
}

/**
 * @param {string} pathname
 * @returns {string|null}
 */
function rewriteAppPublicPath(pathname) {
  const raw = String(pathname || "/");
  const bare = normalizeTrailingSlash(raw);
  if (APP_PATH_REWRITES[bare]) {
    const target = APP_PATH_REWRITES[bare];
    if (raw.endsWith("/") && !target.endsWith("/")) return `${target}/`;
    return target;
  }
  for (const [appPath, target] of Object.entries(APP_PATH_REWRITES)) {
    if (bare === appPath || raw.startsWith(`${appPath}/`)) {
      const rest = raw.slice(appPath.length) || "";
      return `${target.replace(/\/+$/, "")}${rest}`;
    }
  }
  return null;
}

/**
 * Legacy redirect target for /control, /mcp, etc.
 * @param {string} pathname
 * @returns {string|null}
 */
function legacyAppRedirect(pathname) {
  const p = String(pathname || "/");
  if (p === "/control") return "/app-control/";
  if (p.startsWith("/control/")) return `/app-control${p.slice("/control".length)}`;
  if (p === "/mcp") return "/app-mcp";
  if (p.startsWith("/mcp/")) return `/app-mcp${p.slice("/mcp".length)}`;
  if (p === "/shell" || p === "/shell/") return "/app-chat/";
  if (p.startsWith("/shell/")) {
    if (isPublicStaticAssetPath(p)) return null;
    return `/app-chat${p.slice("/shell".length)}`;
  }
  if (p === "/chat" || p === "/chat/") return "/app-chat/";
  if (p === "/commander" || p === "/commander/") return "/app-commander/";
  if (p.startsWith("/commander/")) {
    if (isPublicStaticAssetPath(p)) return null;
    return `/app-commander${p.slice("/commander".length)}`;
  }
  return null;
}

function resolveMcpInternalBase(env = process.env) {
  return String(env.AGENT_CMS_MCP_INTERNAL_URL || `http://127.0.0.1:${getAgentCmsPorts(env).mcpHttp}`).replace(
    /\/+$/,
    ""
  );
}

function resolveControlInternalBase(env = process.env) {
  return String(
    env.AGENT_CMS_CONTROL_INTERNAL_URL || `http://127.0.0.1:${getAgentCmsPorts(env).controlHttp}`
  ).replace(/\/+$/, "");
}

function resolveCommanderInternalBase(env = process.env) {
  return String(
    env.AGENT_CMS_COMMANDER_INTERNAL_URL || `http://127.0.0.1:${getAgentCmsPorts(env).commanderHttp}`
  ).replace(/\/+$/, "");
}

/**
 * @param {object} options
 * @param {import("http").IncomingMessage} [options.req]
 * @param {string} [options.projectRoot]
 * @param {boolean} [options.uiOnly]
 * @param {{ voice?: boolean, commander?: boolean, control?: boolean, mcp?: boolean }} [options.runtime]
 */
async function buildPlatformAppsPayload(options = {}) {
  const root = options.projectRoot || process.cwd();
  hydrateProcessEnvFromRoot(root);
  const env = process.env;
  const ports = getAgentCmsPorts(env);
  const publicBase = resolvePublicBaseUrl(options.req, env);
  const exposeInternal = shouldExposeInternalPorts(env);
  const runtime = options.runtime || {};
  const mcpInternal = resolveMcpInternalBase(env);

  let mcpRunning = runtime.mcp;
  if (mcpRunning === undefined) {
    mcpRunning = await probeMcpHealth(mcpInternal);
  }

  const localhostUrls = buildLocalhostUrls(ports, "localhost");

  /** @type {typeof PLATFORM_APP_CATALOG} */
  let catalog = PLATFORM_APP_CATALOG;
  if (options.uiOnly) {
    catalog = catalog.filter((entry) => entry.kind === "ui" && entry.showInEditorDropdown);
  }

  const apps = [];
  for (const entry of catalog) {
    const port = entry.internalPortKey ? ports[entry.internalPortKey] : null;
    let running = null;
    if (entry.appId === "editor") running = true;
    else if (entry.appId === "chat") running = runtime.voice ?? (await probeTcp("127.0.0.1", ports.voiceHttp));
    else if (entry.appId === "commander") {
      running = runtime.commander ?? (await probeTcp("127.0.0.1", ports.commanderHttp));
    } else if (entry.appId === "control") {
      if (runtime.control !== undefined) running = runtime.control;
      else {
        try {
          const controlBase = new URL(resolveControlInternalBase(env));
          running = await probeTcp(controlBase.hostname, Number(controlBase.port) || ports.controlHttp);
        } catch {
          running = await probeTcp("127.0.0.1", ports.controlHttp);
        }
      }
    } else if (entry.appId === "mcp") running = Boolean(mcpRunning);

    /** @type {Record<string, unknown>} */
    const row = {
      appId: entry.appId,
      title: entry.title,
      kind: entry.kind,
      publicPath: entry.publicPath,
      publicUrl: joinPublicUrl(publicBase, entry.publicPath),
      showInEditorDropdown: entry.showInEditorDropdown,
      running: Boolean(running)
    };
    if (exposeInternal && entry.internalPortKey && port) {
      row.internalPort = port;
      row.internalUrl = localhostUrls[entry.internalPortKey] || null;
    }
    if (entry.legacyPaths?.length) row.legacyPaths = entry.legacyPaths;
    apps.push(row);
  }

  return {
    ok: true,
    siteTitle: resolveSiteTitle(env),
    publicBaseUrl: publicBase,
    apps
  };
}

module.exports = {
  PLATFORM_APP_CATALOG,
  APP_PATH_REWRITES,
  rewriteAppPublicPath,
  isPublicStaticAssetPath,
  legacyAppRedirect,
  resolvePublicBaseUrl,
  resolveSiteTitle,
  resolveMcpInternalBase,
  resolveControlInternalBase,
  resolveCommanderInternalBase,
  buildPlatformAppsPayload
};
