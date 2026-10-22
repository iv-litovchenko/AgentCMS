import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AgentCmsClient } from "./client.js";

const require = createRequire(import.meta.url);
const {
  readInstances: readInstancesFromStore,
  normalizeDocument
} = require("../../lib/instances/instances-store.js");

const DEFAULT_PORTS = [3001, 3000, 3443, 3002];

function createTunnelInvokeClient(hubBaseUrl, deviceId, authToken) {
  const hub = String(hubBaseUrl || "").replace(/\/$/, "");
  const device = String(deviceId || "").trim();
  const token = String(authToken || "").trim();

  async function request(method, path, { query = {}, body, agentScope = true, agentId } = {}) {
    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json"
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
      headers["X-Agent-Cms-Mcp-Token"] = token;
    }
    const response = await fetch(`${hub}/api/tunnel/invoke`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        deviceId: device,
        method: String(method || "GET").toUpperCase(),
        path: String(path || "/"),
        query: query || {},
        body: body === undefined ? null : body,
        agentId: agentScope && agentId ? String(agentId) : ""
      })
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const reason =
        payload && typeof payload === "object"
          ? payload.error || JSON.stringify(payload)
          : response.statusText;
      throw new Error(`Tunnel invoke ${device} ${method} ${path} failed: ${reason}`);
    }
    if (payload && typeof payload === "object" && "body" in payload) return payload.body;
    return payload;
  }

  return {
    request,
    get: (p, q, o) => request("GET", p, { query: q, ...o }),
    post: (p, b, o) => request("POST", p, { body: b, ...o }),
    put: (p, b, o) => request("PUT", p, { body: b, ...o }),
    patch: (p, b, o) => request("PATCH", p, { body: b, ...o }),
    delete: (p, q, o) => request("DELETE", p, { query: q, ...o })
  };
}

function findRepoRoot(startDir) {
  let dir = path.resolve(startDir);
  for (let i = 0; i < 10; i += 1) {
    const pkg = path.join(dir, "package.json");
    const mcp = path.join(dir, "mcp-server");
    if (fs.existsSync(pkg) && fs.existsSync(mcp)) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

function readInstancesFile(repoRoot) {
  const custom = String(process.env.AGENT_CMS_INSTANCES_PATH || "").trim();
  if (custom) {
    const fs = require("node:fs");
    const parsed = JSON.parse(fs.readFileSync(custom, "utf8"));
    return { filePath: custom, instances: normalizeDocument(parsed).instances };
  }
  const { filePath, document } = readInstancesFromStore(repoRoot);
  return { filePath, instances: document.instances };
}

async function probeLocalBaseUrl() {
  const fromEnv = (
    process.env.AGENT_CMS_BASE_URL ||
    process.env.YAMLCMS_BASE_URL ||
    ""
  ).replace(/\/$/, "");
  if (fromEnv) return fromEnv;

  const extra = String(process.env.AGENT_CMS_PROBE_PORTS || "")
    .split(",")
    .map((p) => Number(p.trim()))
    .filter((p) => Number.isFinite(p) && p > 0);

  const ports = [...new Set([...extra, ...DEFAULT_PORTS])];

  for (const port of ports) {
    for (const host of ["127.0.0.1", "localhost"]) {
      const base = `http://${host}:${port}`;
      try {
        const response = await fetch(`${base}/api/agent/mcp-ping`, {
          signal: AbortSignal.timeout(1200)
        });
        if (response.ok) return base;
      } catch {
        /* try next */
      }
    }
  }

  return "http://localhost:3000";
}

export class InstanceRegistry {
  constructor(options = {}) {
    this.repoRoot = options.repoRoot || findRepoRoot(path.dirname(fileURLToPath(import.meta.url)));
    this.tunnelRegistry = options.tunnelRegistry || null;
    this._clients = new Map();
    this._localBaseUrl = null;
    const { instances } = readInstancesFile(this.repoRoot);
    this.instances = instances;
  }

  listInstances() {
    return this.instances.slice();
  }

  getInstance(instanceId) {
    const id = String(instanceId || "local").trim() || "local";
    return (
      this.instances.find((entry) => entry.id === id) ||
      (id === "local" ? { id: "local", kind: "local", auto: true, label: "local" } : null)
    );
  }

  async localBaseUrl() {
    if (this._localBaseUrl) return this._localBaseUrl;
    this._localBaseUrl = await probeLocalBaseUrl();
    return this._localBaseUrl;
  }

  async getClient(instanceId) {
    const id = String(instanceId || "local").trim() || "local";
    if (this._clients.has(id)) return this._clients.get(id);

    const meta = this.getInstance(id);
    if (!meta) {
      throw new Error(`Unknown MCP instance "${id}". Check .agent-cms-global/instances.json`);
    }

    let client;
    if (meta.kind === "tunnel") {
      const deviceId = String(meta.deviceId || meta.id).trim();
      const hubBase = String(meta.hubUrl || process.env.AGENT_CMS_TUNNEL_HUB_URL || "")
        .replace(/\/$/, "");
      const hub =
        hubBase || (await this.localBaseUrl());
      client = createTunnelInvokeClient(hub, deviceId, String(meta.token || "").trim());
    } else if (meta.kind === "remote" || meta.url) {
      const baseUrl = String(meta.url || "").replace(/\/$/, "");
      if (!baseUrl) throw new Error(`Instance "${id}" has no url`);
      client = new AgentCmsClient({
        baseUrl,
        agent: "",
        authToken: String(meta.token || "").trim()
      });
    } else {
      const baseUrl = meta.baseUrl
        ? String(meta.baseUrl).replace(/\/$/, "")
        : await this.localBaseUrl();
      client = new AgentCmsClient({ baseUrl, agent: "" });
    }

    this._clients.set(id, client);
    return client;
  }
}
