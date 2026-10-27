"use strict";

const http = require("http");
const https = require("https");
const { URL } = require("url");

function proxyEdgeUpstreamRequest(req, res, upstreamBase, url) {
  let target;
  try {
    target = new URL(`${url.pathname || "/"}${url.search || ""}`, `${upstreamBase.replace(/\/+$/, "")}/`);
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
      res.end(JSON.stringify({ ok: false, error: "edge_upstream_unreachable" }));
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

module.exports = { proxyEdgeUpstreamRequest };
