const DEFAULT_BASE_URL = "http://localhost:3000";

function isLocalCmsHost(hostname) {
  const host = String(hostname || "").trim().toLowerCase();
  return host === "127.0.0.1" || host === "localhost" || host === "::1" || host.endsWith(".local");
}

function shouldUseInsecureTls(urlString) {
  const flag = String(process.env.AGENT_CMS_TLS_INSECURE || "").trim();
  if (flag === "1" || flag.toLowerCase() === "true") return true;
  if (flag === "0" || flag.toLowerCase() === "false") return false;
  try {
    const url = new URL(urlString);
    return url.protocol === "https:" && isLocalCmsHost(url.hostname);
  } catch {
    return false;
  }
}

async function cmsFetch(url, init = {}) {
  if (!shouldUseInsecureTls(String(url))) {
    return fetch(url, init);
  }
  const previous = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  try {
    return await fetch(url, init);
  } finally {
    if (previous === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    else process.env.NODE_TLS_REJECT_UNAUTHORIZED = previous;
  }
}

export function getConfig() {
  const baseUrl = (
    process.env.AGENT_CMS_BASE_URL ||
    process.env.YAMLCMS_BASE_URL ||
    DEFAULT_BASE_URL
  ).replace(/\/$/, "");
  const agent = process.env.AGENT_CMS_AGENT || process.env.YAMLCMS_AGENT || "";
  return { baseUrl, defaultAgent: agent };
}

export class AgentCmsClient {
  constructor(options = {}) {
    const cfg = getConfig();
    this.baseUrl = options.baseUrl || cfg.baseUrl;
    this.defaultAgent = options.agent ?? cfg.defaultAgent;
  }

  buildUrl(path, query = {}, { agentScope = true } = {}) {
    const url = new URL(path, this.baseUrl);
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
    if (agentScope && this.defaultAgent) {
      url.searchParams.set("agent", this.defaultAgent);
    }
    return url;
  }

  async request(method, path, { query, body, agentScope = true } = {}) {
    const url = this.buildUrl(path, query, { agentScope });
    const init = {
      method,
      headers: {
        Accept: "application/json",
        "X-Activity-Source": "mcp"
      }
    };
    if (body !== undefined) {
      init.headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(body);
    }

    let response;
    try {
      response = await cmsFetch(url, init);
    } catch (error) {
      throw new Error(
        `Cannot reach Agent CMS at ${this.baseUrl}. Run "npm run start:https" or "npm start" in the project root. (${error.message})`
      );
    }

    const contentType = response.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const payload = isJson ? await response.json().catch(() => null) : await response.text();

    if (!response.ok) {
      const reason =
        payload && typeof payload === "object"
          ? payload.error || payload.details || JSON.stringify(payload)
          : String(payload || response.statusText);
      throw new Error(`API ${method} ${path} failed (${response.status}): ${reason}`);
    }

    return payload;
  }

  get(path, query, opts) {
    return this.request("GET", path, { query, ...opts });
  }

  post(path, body, opts) {
    return this.request("POST", path, { body, ...opts });
  }

  delete(path, query, opts) {
    return this.request("DELETE", path, { query, ...opts });
  }
}

/** @deprecated Use AgentCmsClient */
export const YamlCmsClient = AgentCmsClient;

export function jsonText(data) {
  return JSON.stringify(data, null, 2);
}
