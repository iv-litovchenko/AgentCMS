"use strict";

const { randomUUID } = require("node:crypto");

/** @type {Map<string, { ws: import('ws').WebSocket, deviceId: string, connectedAt: number }>} */
const devices = new Map();

/** @type {Map<string, { resolve: Function, reject: Function, timer: NodeJS.Timeout }>} */
const pending = new Map();

const DEFAULT_TIMEOUT_MS = 120_000;

function requireToken() {
  return String(process.env.AGENT_CMS_TUNNEL_TOKEN || process.env.AGENT_CMS_MCP_TOKEN || "").trim();
}

function registerDevice(deviceId, ws) {
  const id = String(deviceId || "").trim();
  if (!id) return false;
  const prev = devices.get(id);
  if (prev?.ws && prev.ws !== ws) {
    try {
      prev.ws.close(4000, "replaced");
    } catch {
      /* ignore */
    }
  }
  devices.set(id, { ws, deviceId: id, connectedAt: Date.now() });
  return true;
}

function unregisterWs(ws) {
  for (const [id, entry] of devices.entries()) {
    if (entry.ws === ws) devices.delete(id);
  }
}

function handleDeviceMessage(ws, raw) {
  let msg;
  try {
    msg = JSON.parse(String(raw || ""));
  } catch {
    return;
  }
  if (msg.type === "api_res" && msg.id) {
    const slot = pending.get(msg.id);
    if (!slot) return;
    pending.delete(msg.id);
    clearTimeout(slot.timer);
    if (msg.error) slot.reject(new Error(String(msg.error)));
    else slot.resolve({ status: msg.status || 200, body: msg.body });
    return;
  }
}

function attachWebSocketHandlers(ws) {
  ws.on("message", (data) => handleDeviceMessage(ws, data));
  ws.on("close", () => unregisterWs(ws));
}

function handleRegister(ws, msg) {
  const expected = requireToken();
  const token = String(msg.token || "").trim();
  if (expected && token !== expected) {
    ws.send(JSON.stringify({ type: "error", error: "Unauthorized" }));
    ws.close(4401, "Unauthorized");
    return;
  }
  const deviceId = String(msg.deviceId || "").trim();
  if (!deviceId) {
    ws.send(JSON.stringify({ type: "error", error: "deviceId required" }));
    ws.close(4400, "Bad Request");
    return;
  }
  registerDevice(deviceId, ws);
  ws.send(JSON.stringify({ type: "registered", deviceId }));
}

function tunnelRequest(deviceId, method, path, { query = {}, body, agentId, timeoutMs } = {}) {
  const entry = devices.get(String(deviceId || "").trim());
  if (!entry?.ws || entry.ws.readyState !== 1) {
    return Promise.reject(new Error(`Tunnel device "${deviceId}" is offline`));
  }
  const id = randomUUID();
  const payload = {
    type: "api",
    id,
    method: String(method || "GET").toUpperCase(),
    path: String(path || "/"),
    query: query || {},
    body: body === undefined ? null : body,
    agentId: agentId ? String(agentId) : ""
  };
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`Tunnel request timeout (${deviceId})`));
    }, timeoutMs || DEFAULT_TIMEOUT_MS);
    pending.set(id, { resolve, reject, timer });
    entry.ws.send(JSON.stringify(payload));
  });
}

function listOnlineDeviceIds() {
  return [...devices.keys()];
}

function createTunnelApiClient(deviceId) {
  async function request(method, path, { query, body, agentScope = true, agentId } = {}) {
    const result = await tunnelRequest(deviceId, method, path, {
      query,
      body,
      agentId: agentScope ? agentId : undefined
    });
    if (result.status >= 400) {
      const reason =
        result.body && typeof result.body === "object"
          ? result.body.error || JSON.stringify(result.body)
          : String(result.body || result.status);
      throw new Error(`Tunnel API ${method} ${path} failed (${result.status}): ${reason}`);
    }
    return result.body;
  }
  return {
    get: (p, q, o) => request("GET", p, { query: q, ...o }),
    post: (p, b, o) => request("POST", p, { body: b, ...o }),
    put: (p, b, o) => request("PUT", p, { body: b, ...o }),
    patch: (p, b, o) => request("PATCH", p, { body: b, ...o }),
    delete: (p, q, o) => request("DELETE", p, { query: q, ...o }),
    request
  };
}

function attachAgentCmsTunnel(server) {
  let WebSocketServer;
  try {
    ({ WebSocketServer } = require("ws"));
  } catch {
    console.warn("Agent CMS tunnel: install `ws` package to enable /api/tunnel/ws");
    return null;
  }

  const wss = new WebSocketServer({ noServer: true });

  wss.on("connection", (ws, req) => {
    attachWebSocketHandlers(ws);
    ws.on("message", (data) => {
      let msg;
      try {
        msg = JSON.parse(String(data || ""));
      } catch {
        return;
      }
      if (msg.type === "register") handleRegister(ws, msg);
    });
  });

  server.on("upgrade", (req, socket, head) => {
    try {
      const pathname = new URL(req.url || "/", "http://localhost").pathname;
      if (pathname !== "/api/tunnel/ws") return;
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    } catch {
      socket.destroy();
    }
  });

  return wss;
}

module.exports = {
  attachAgentCmsTunnel,
  tunnelRequest,
  listOnlineDeviceIds,
  createTunnelApiClient,
  registerDevice
};
