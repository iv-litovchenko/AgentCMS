"use strict";

const fs = require("fs");
const path = require("path");

function readEnvFile(envPath) {
  const out = {};
  if (!fs.existsSync(envPath)) return out;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[m[1]] = val;
  }
  return out;
}

function loadAgentCmsEnv() {
  const root = process.env.AGENT_CMS_HOME || process.env.AGENT_CMS_ROOT || path.join(__dirname, "..");
  return { root, env: readEnvFile(path.join(root, ".env")) };
}

function resolveMcpUrl(env) {
  const base = String(env.AGENT_CMS_PUBLIC_URL || "").replace(/\/+$/, "");
  if (base) return `${base}/app-mcp`;
  const port = String(env.AGENT_CMS_EDITOR_HTTP_PORT || "3000").trim() || "3000";
  return `http://127.0.0.1:${port}/app-mcp`;
}

function resolveMcpHttpAlt(env) {
  const port = String(env.AGENT_CMS_EDITOR_HTTP_PORT || "3000").trim() || "3000";
  return `http://127.0.0.1:${port}/app-mcp`;
}

function mcpToken(env) {
  return String(env.AGENT_CMS_MCP_TOKEN || "").trim();
}

module.exports = {
  readEnvFile,
  loadAgentCmsEnv,
  resolveMcpUrl,
  resolveMcpHttpAlt,
  mcpToken
};
