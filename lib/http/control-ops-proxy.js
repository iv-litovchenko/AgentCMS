"use strict";

const http = require("http");
const https = require("https");
const { URL } = require("url");
const { resolveControlInternalBase } = require("../platform/platform-apps");

/** Proxy /api/ops/* and app-lock to control container (docker.sock lives there, not in cms). */
function proxyControlOpsRequest(req, res, url) {
  const internalBase = resolveControlInternalBase();
  const pathname = url.pathname || "/";
  let target;
  try {
    target = new URL(`${pathname}${url.search || ""}`, `${internalBase}/`);
  } catch {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Bad request");
    return;
  }

  const lib = target.protocol === "https:" ? https : http;
  const headers = { ...req.headers, host: target.host };
  delete headers.connection;

  const upstream = lib.request(
    {
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port || (target.protocol === "https:" ? 443 : 80),
      path: `${target.pathname}${target.search}`,
      method: req.method,
      headers
    },
    (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode || 502, upstreamRes.headers);
      upstreamRes.pipe(res);
    }
  );

  upstream.on("error", () => {
    if (!res.headersSent) {
      res.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: false, error: "control_unreachable", message: "Control API недоступен" }));
    } else {
      res.end();
    }
  });

  if (req.method === "GET" || req.method === "HEAD") {
    upstream.end();
  } else {
    req.pipe(upstream);
  }
}

const CONTROL_OPS_PROXY_PATHS = new Set([
  "/api/ops/bootstrap",
  "/api/ops/server/action",
  "/api/ops/env-file",
  "/api/app-lock/login",
  "/api/app-lock/logout",
  "/api/app-lock/status"
]);

function shouldProxyControlOps(pathname) {
  const p = String(pathname || "").split("?")[0];
  return CONTROL_OPS_PROXY_PATHS.has(p);
}

function maybeProxyDockerControlOps(req, res, url) {
  try {
    const { usesDockerComposeOps } = require("../ops/docker-compose-ops");
    if (!usesDockerComposeOps()) return false;
    const pathname = url.pathname || "/";
    if (!shouldProxyControlOps(pathname)) return false;
    const method = req.method || "GET";
    const allowed =
      (pathname === "/api/ops/bootstrap" && method === "GET") ||
      (pathname === "/api/ops/env-file" && (method === "GET" || method === "POST")) ||
      (pathname === "/api/ops/server/action" && method === "POST") ||
      (pathname === "/api/app-lock/status" && method === "GET") ||
      (pathname === "/api/app-lock/login" && method === "POST") ||
      (pathname === "/api/app-lock/logout" && method === "POST");
    if (!allowed) return false;
    proxyControlOpsRequest(req, res, url);
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  proxyControlOpsRequest,
  shouldProxyControlOps,
  maybeProxyDockerControlOps
};
