"use strict";

const fs = require("fs");
const path = require("path");
const {
  isEdgeHttpGatewayEnabled,
  classifyEdgeHost,
  resolveUpstreamBase,
  readEdgeStaticFile,
  resolveEdgeStaticRoot
} = require("../platform/platform-edge-apps");
const { proxyEdgeUpstreamRequest } = require("./edge-app-proxy");

const STATIC_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon"
};

function sendStaticFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const type = STATIC_TYPES[ext] || "application/octet-stream";
  res.writeHead(200, {
    "Content-Type": type,
    "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=3600"
  });
  fs.createReadStream(filePath).pipe(res);
}

function sendUnknownStub(res, projectRoot) {
  const filePath = readEdgeStaticFile(projectRoot, "unknown", "/");
  if (!filePath) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }
  sendStaticFile(res, filePath);
}

/**
 * @param {import("http").IncomingMessage} req
 * @param {import("http").ServerResponse} res
 * @param {URL} url
 * @param {string} projectRoot
 * @returns {boolean} true if handled
 */
function tryEdgeHostGateway(req, res, url, projectRoot) {
  if (!isEdgeHttpGatewayEnabled()) return false;

  const hostHeader = String(req.headers.host || "");
  const classified = classifyEdgeHost(hostHeader);
  if (classified.kind === "apex" || classified.kind === "other") return false;

  if (classified.kind === "unknown") {
    sendUnknownStub(res, projectRoot);
    return true;
  }

  if (classified.kind === "app" && classified.app) {
    const app = classified.app;
    if (app.kind === "static") {
      const filePath = readEdgeStaticFile(projectRoot, app.staticDir || app.slug, url.pathname);
      if (filePath) {
        sendStaticFile(res, filePath);
        return true;
      }
      sendUnknownStub(res, projectRoot);
      return true;
    }
    if (app.kind === "proxy") {
      const upstream = resolveUpstreamBase(app);
      if (!upstream) {
        res.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Edge upstream not configured");
        return true;
      }
      proxyEdgeUpstreamRequest(req, res, upstream, url);
      return true;
    }
  }

  sendUnknownStub(res, projectRoot);
  return true;
}

module.exports = { tryEdgeHostGateway, resolveEdgeStaticRoot };
