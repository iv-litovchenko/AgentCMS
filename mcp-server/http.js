#!/usr/bin/env node
/**
 * Agent CMS MCP — Streamable HTTP (Cursor / Claude remote URL).
 *
 * Env:
 *   AGENT_CMS_MCP_HTTP_HOST  (default 127.0.0.1; server/docker: 0.0.0.0)
 *   AGENT_CMS_MCP_HTTP_PORT  (default 3490)
 *   AGENT_CMS_MCP_TOKEN      optional Bearer / X-Agent-Cms-Mcp-Token
 *   AGENT_CMS_BASE_URL       CMS API (default http://localhost:3000)
 */

import { randomUUID } from "node:crypto";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { createServer } from "./index.js";

const host = String(process.env.AGENT_CMS_MCP_HTTP_HOST || "127.0.0.1").trim() || "127.0.0.1";
const port = Number(process.env.AGENT_CMS_MCP_HTTP_PORT || 3490);
const mcpToken = String(process.env.AGENT_CMS_MCP_TOKEN || "").trim();
const allowedHosts = String(process.env.AGENT_CMS_MCP_ALLOWED_HOSTS || "")
  .split(",")
  .map((h) => h.trim())
  .filter(Boolean);

const app = createMcpExpressApp({
  host,
  ...(allowedHosts.length ? { allowedHosts } : {})
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "agent-cms-mcp", transport: "streamable-http" });
});

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

app.all("/mcp", requireMcpToken, async (req, res) => {
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
      const server = createServer();
      await server.connect(transport);
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
  console.log(`CMS API: ${process.env.AGENT_CMS_BASE_URL || "http://localhost:3000"}`);
});
