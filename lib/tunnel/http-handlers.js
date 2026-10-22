"use strict";

const { tunnelRequest, listOnlineDeviceIds } = require("./registry.js");

function readTunnelAuth(req) {
  const expected = String(
    process.env.AGENT_CMS_TUNNEL_TOKEN || process.env.AGENT_CMS_MCP_TOKEN || ""
  ).trim();
  if (!expected) return true;
  const auth = String(req.headers.authorization || "");
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const header = String(req.headers["x-agent-cms-mcp-token"] || "").trim();
  return bearer === expected || header === expected;
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

/** @returns {Promise<true|null>} true when a response was sent for a tunnel route */
async function handleTunnelHttp(req, res, url, sendJson) {
  const isDevices = req.method === "GET" && url.pathname === "/api/tunnel/devices";
  const isInvoke = req.method === "POST" && url.pathname === "/api/tunnel/invoke";
  if (!isDevices && !isInvoke) {
    return null;
  }

  if (!readTunnelAuth(req)) {
    sendJson(res, 401, { error: "Unauthorized" });
    return true;
  }

  if (isDevices) {
    sendJson(res, 200, { devices: listOnlineDeviceIds() });
    return true;
  }

  try {
    const payload = await readJsonBody(req);
    const deviceId = String(payload.deviceId || "").trim();
    if (!deviceId) {
      sendJson(res, 400, { error: "deviceId required" });
      return true;
    }
    const result = await tunnelRequest(deviceId, payload.method, payload.path, {
      query: payload.query || {},
      body: payload.body,
      agentId: payload.agentId || ""
    });
    sendJson(res, 200, { status: result.status, body: result.body });
    return true;
  } catch (error) {
    sendJson(res, 502, {
      error: error.message || String(error)
    });
    return true;
  }
}

module.exports = { handleTunnelHttp, readTunnelAuth };
