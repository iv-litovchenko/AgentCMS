#!/usr/bin/env node
/**
 * Подключает локальный Agent CMS к серверному туннелю (/api/tunnel/ws).
 *
 * AGENT_CMS_TUNNEL_URL=ws://127.0.0.1:3001/api/tunnel/ws
 * AGENT_CMS_DEVICE_ID=marina-macbook
 * AGENT_CMS_DEVICE_TOKEN=…  (AGENT_CMS_TUNNEL_TOKEN / AGENT_CMS_MCP_TOKEN на сервере)
 * AGENT_CMS_BASE_URL=http://127.0.0.1:3001  (локальный CMS для прокси)
 */

const WebSocket = require("ws");

const tunnelUrl = String(process.env.AGENT_CMS_TUNNEL_URL || "").trim();
const deviceId = String(process.env.AGENT_CMS_DEVICE_ID || "").trim();
const token = String(
  process.env.AGENT_CMS_DEVICE_TOKEN ||
    process.env.AGENT_CMS_TUNNEL_TOKEN ||
    process.env.AGENT_CMS_MCP_TOKEN ||
    ""
).trim();
const cmsBase = String(process.env.AGENT_CMS_BASE_URL || "http://127.0.0.1:3001").replace(
  /\/$/,
  ""
);

if (!tunnelUrl || !deviceId) {
  console.error("Need AGENT_CMS_TUNNEL_URL and AGENT_CMS_DEVICE_ID");
  process.exit(2);
}

async function cmsFetch(method, path, { query = {}, body, agentId } = {}) {
  const url = new URL(path, cmsBase);
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }
  if (agentId) url.searchParams.set("agent", String(agentId));
  const init = {
    method,
    headers: { Accept: "application/json", "X-Activity-Source": "tunnel-device" }
  };
  if (body !== undefined && body !== null) {
    init.headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  const response = await fetch(url, init);
  const ct = response.headers.get("content-type") || "";
  const payload = ct.includes("json")
    ? await response.json().catch(() => null)
    : await response.text();
  return { status: response.status, body: payload };
}

function connect() {
  const ws = new WebSocket(tunnelUrl);
  ws.on("open", () => {
    ws.send(JSON.stringify({ type: "register", deviceId, token }));
    console.log(`Tunnel connected: ${deviceId} → ${tunnelUrl} (CMS ${cmsBase})`);
  });
  ws.on("message", async (raw) => {
    let msg;
    try {
      msg = JSON.parse(String(raw || ""));
    } catch {
      return;
    }
    if (msg.type !== "api" || !msg.id) return;
    try {
      const result = await cmsFetch(msg.method, msg.path, {
        query: msg.query,
        body: msg.body,
        agentId: msg.agentId
      });
      ws.send(JSON.stringify({ type: "api_res", id: msg.id, status: result.status, body: result.body }));
    } catch (error) {
      ws.send(
        JSON.stringify({
          type: "api_res",
          id: msg.id,
          status: 502,
          error: error.message || String(error)
        })
      );
    }
  });
  ws.on("close", () => {
    console.warn("Tunnel closed, reconnect in 3s…");
    setTimeout(connect, 3000);
  });
  ws.on("error", (err) => console.error("Tunnel error:", err.message || err));
}

connect();
