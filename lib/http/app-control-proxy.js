"use strict";

const http = require("http");
const https = require("https");
const { URL } = require("url");
const { resolveControlInternalBase } = require("../platform/platform-apps");

function proxyAppControlRequest(req, res, url) {
  const internalBase = resolveControlInternalBase();
  const pathname = url.pathname || "/app-control";
  let upstreamPath = "/";
  if (pathname.length > "/app-control".length) {
    upstreamPath = pathname.slice("/app-control".length) || "/";
  }
  if (!upstreamPath.startsWith("/")) upstreamPath = `/${upstreamPath}`;

  let target;
  try {
    target = new URL(upstreamPath + (url.search || ""), `${internalBase}/`);
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
      res.end(JSON.stringify({ ok: false, error: "control_unreachable" }));
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

module.exports = { proxyAppControlRequest };
