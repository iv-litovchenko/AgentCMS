#!/usr/bin/env node
/**
 * Agent CMS MCP — Streamable HTTP (Cursor / Claude remote URL).
 *
 * Env:
 *   AGENT_CMS_MCP_HTTP_HOST  (default 127.0.0.1; server/docker: 0.0.0.0)
 *   AGENT_CMS_MCP_HTTP_PORT  (default 3490)
 *   AGENT_CMS_MCP_TOKEN      optional Bearer / X-Agent-Cms-Mcp-Token
 *   AGENT_CMS_BASE_URL       CMS API (default http://localhost:3000)
 *   AGENT_CMS_MCP_BEHIND_PROXY  1 = за Caddy/nginx (Host: maptex.ru), без DNS-rebind check
 *   AGENT_CMS_MCP_ALLOWED_HOSTS maptex.ru,localhost,127.0.0.1 (если BEHIND_PROXY=0)
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { createServer } from "./index.js";

const host = String(process.env.AGENT_CMS_MCP_HTTP_HOST || "127.0.0.1").trim() || "127.0.0.1";
const port = Number(process.env.AGENT_CMS_MCP_HTTP_PORT || 3490);
const mcpToken = String(process.env.AGENT_CMS_MCP_TOKEN || "").trim();

function resolveAllowedHosts() {
  const list = String(process.env.AGENT_CMS_MCP_ALLOWED_HOSTS || "")
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean);
  for (const key of ["AGENT_CMS_MCP_PUBLIC_URL", "AGENT_CMS_PUBLIC_URL", "AGENT_CMS_EDITOR_HTTPS_URL"]) {
    const raw = String(process.env[key] || "").trim();
    if (!raw) continue;
    try {
      list.push(new URL(raw).hostname);
    } catch {
      // ignore
    }
  }
  const extras = String(process.env.AGENT_CMS_PUBLIC_HOST || "")
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean);
  list.push(...extras, "127.0.0.1", "localhost", "[::1]");
  return [...new Set(list.filter(Boolean))];
}

const allowedHosts = resolveAllowedHosts();

function isBehindProxy() {
  const flag = String(process.env.AGENT_CMS_MCP_BEHIND_PROXY || "").trim();
  if (flag === "1") return true;
  if (flag === "0") return false;
  return host === "127.0.0.1" || host === "localhost";
}

function createHttpApp() {
  if (isBehindProxy()) {
    const app = express();
    app.use(express.json({ limit: "4mb" }));
    return app;
  }
  return createMcpExpressApp({
    host,
    allowedHosts
  });
}

const app = createHttpApp();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MCP_ICON_CANDIDATES = [
  path.join(__dirname, "../public/_resources/favicon.png"),
  path.join(__dirname, "../public/favicon.png"),
  path.join(__dirname, "../../public/_resources/favicon.png"),
  path.join(__dirname, "../../public/favicon.png")
];

function loadMcpIconBuffer() {
  for (const candidate of MCP_ICON_CANDIDATES) {
    try {
      return readFileSync(candidate);
    } catch {
      // try next
    }
  }
  return null;
}

const mcpIconPng = loadMcpIconBuffer();

function sendMcpIcon(_req, res) {
  if (!mcpIconPng) {
    res.status(404).send("icon not found");
    return;
  }
  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.send(mcpIconPng);
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "agent-cms-mcp", transport: "streamable-http" });
});

app.get(["/icon", "/icon.png"], sendMcpIcon);

function requireMcpToken(req, res, next) {
  if (!mcpToken) return next();
  const auth = String(req.headers.authorization || "");
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const header = String(req.headers["x-agent-cms-mcp-token"] || "").trim();
  if (bearer === mcpToken || header === mcpToken) return next();
  res.status(401).json({
    jsonrpc: "2.0",
    error: { code: -32001, message: "Unauthorized" },
    id: null
  });
}

/** @type {Record<string, StreamableHTTPServerTransport>} */
const transports = {};

app.get("/mcp", (_req, res) => {
  res.json({
    ok: true,
    service: "agent-cms-mcp",
    transport: "streamable-http",
    auth: mcpToken ? "bearer" : "none"
  });
});

app.post("/mcp", requireMcpToken, async (req, res) => {
  try {
    const sessionId = req.headers["mcp-session-id"];
    let transport;

    if (sessionId && transports[sessionId]) {
      transport = transports[sessionId];
    } else if (!sessionId && req.method === "POST" && isInitializeRequest(req.body)) {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sid) => {
          transports[sid] = transport;
        }
      });
      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid && transports[sid]) delete transports[sid];
      };
      const server = createServer({ transport: "http" });
      await server.connect(transport);
    } else if (sessionId && !transports[sessionId]) {
      // Stale ID after MCP restart — 404 so clients (e.g. Claude connector) re-initialize
      res.status(404).json({
        jsonrpc: "2.0",
        error: {
          code: -32001,
          message: "Session not found or expired; send initialize without mcp-session-id to reconnect"
        },
        id: null
      });
      return;
    } else {
      res.status(400).json({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Bad Request: No valid session ID provided" },
        id: null
      });
      return;
    }

    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("MCP HTTP error:", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null
      });
    }
  }
});

async function shutdown() {
  for (const sid of Object.keys(transports)) {
    try {
      await transports[sid].close();
    } catch (error) {
      console.error(`Close session ${sid}:`, error);
    }
    delete transports[sid];
  }
}

process.on("SIGINT", async () => {
  await shutdown();
  process.exit(0);
});
process.on("SIGTERM", async () => {
  await shutdown();
  process.exit(0);
});

app.listen(port, host, () => {
  const base = `http://${host === "0.0.0.0" ? "localhost" : host}:${port}`;
  console.log(`Agent CMS MCP (Streamable HTTP) at ${base}/mcp`);
  if (mcpToken) console.log("MCP token auth: enabled");
  if (isBehindProxy()) console.log("MCP behind reverse proxy (Host check relaxed)");
  else console.log(`Allowed Host headers: ${allowedHosts.join(", ")}`);
  console.log(`CMS API: ${process.env.AGENT_CMS_BASE_URL || "http://localhost:3000"}`);
});
