"use strict";

const http = require("http");
const https = require("https");
const { URL } = require("url");
const { resolveMcpInternalBase } = require("../platform/platform-apps");

/** Host header for upstream MCP (SDK allowlist expects the public door, not Docker service name). */
function resolveMcpUpstreamHostHeader(req) {
  const clientHost = String(req.headers.host || "").trim();
  if (clientHost) return clientHost;
  const publicUrl = String(process.env.AGENT_CMS_PUBLIC_URL || "").trim();
  if (publicUrl) {
    try {
      const u = new URL(publicUrl);
      if (u.port) return `${u.hostname}:${u.port}`;
      return u.hostname;
    } catch {
      // ignore
    }
  }
  return "127.0.0.1";
}

function proxyAppMcpRequest(req, res, url) {
  const internalBase = resolveMcpInternalBase();
  let upstreamPath = "/mcp";
  const pathname = url.pathname || "/app-mcp";
  if (pathname.length > "/app-mcp".length) {
    upstreamPath = `/mcp${pathname.slice("/app-mcp".length)}`;
  }
  let target;
  try {
    target = new URL(upstreamPath + (url.search || ""), `${internalBase}/`);
  } catch {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Bad request");
    return;
  }

  const lib = target.protocol === "https:" ? https : http;
  const headers = { ...req.headers, host: resolveMcpUpstreamHostHeader(req) };
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
      res.end(JSON.stringify({ ok: false, error: "mcp_unreachable" }));
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

module.exports = { proxyAppMcpRequest };
