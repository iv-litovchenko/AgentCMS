"use strict";

const http = require("http");
const https = require("https");
const { URL } = require("url");

/**
 * @param {object} options
 * @param {() => string} options.resolveInternalBase
 * @param {string} options.publicPrefix e.g. "/app-control"
 * @param {string} [options.upstreamPrefix] prepended after strip, e.g. "/shell"
 * @param {string} [options.unreachableError]
 */
function createAppPathProxy(options) {
  const publicPrefix = String(options.publicPrefix || "").replace(/\/+$/, "");
  const upstreamPrefix = String(options.upstreamPrefix ?? "");
  const unreachableError = options.unreachableError || "upstream_unreachable";

  return function proxyAppRequest(req, res, url) {
    const internalBase = options.resolveInternalBase();
    const pathname = url.pathname || publicPrefix;
    let rest = "/";
    if (pathname.length > publicPrefix.length) {
      rest = pathname.slice(publicPrefix.length) || "/";
    }
    if (!rest.startsWith("/")) rest = `/${rest}`;
    let upstreamPath = `${upstreamPrefix}${rest}`.replace(/\/{2,}/g, "/") || "/";

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
        res.end(JSON.stringify({ ok: false, error: unreachableError }));
      } else {
        res.end();
      }
    });

    if (req.method === "GET" || req.method === "HEAD") {
      upstream.end();
    } else {
      req.pipe(upstream);
    }
  };
}

module.exports = { createAppPathProxy };
