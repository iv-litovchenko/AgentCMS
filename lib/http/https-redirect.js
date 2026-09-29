/**
 * HTTP → HTTPS redirect для Agent CMS и Agent CMS Voice.
 * Включено по умолчанию, если есть TLS-сертификаты (HTTPS_REDIRECT=0 — выкл).
 */

function isHttpsRedirectEnabled() {
  const { isHttpToHttpsRedirectEnabled } = require("../config/agent-cms-ports");
  return isHttpToHttpsRedirectEnabled();
}

function createHttpToHttpsRedirectHandler({ tlsPort, hostname = "localhost" } = {}) {
  const port = Number(tlsPort);
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error("createHttpToHttpsRedirectHandler: tlsPort is required");
  }

  return (req, res) => {
    const hostHeader = String(req.headers.host || "").trim();
    const hostName = (hostHeader.split(":")[0] || hostname || "localhost").trim();
    const portSuffix = port === 443 ? "" : `:${port}`;
    const rawUrl = String(req.url || "/");
    const location = `https://${hostName}${portSuffix}${rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`}`;

    res.writeHead(308, {
      Location: location,
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store"
    });
    res.end(`Redirecting to ${location}\n`);
  };
}

function resolveInternalCmsApiUrl({ boundTlsPort, boundPort } = {}) {
  const explicit = String(process.env.CMS_API_URL || process.env.AGENT_CMS_BASE_URL || "").trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  if (boundTlsPort && isHttpsRedirectEnabled()) {
    return `https://127.0.0.1:${boundTlsPort}`;
  }
  if (boundPort) return `http://127.0.0.1:${boundPort}`;
  if (boundTlsPort) return `https://127.0.0.1:${boundTlsPort}`;
  return "http://127.0.0.1:3000";
}

function readTlsCredentialsFromEnv() {
  const fs = require("fs");
  const keyPath = process.env.TLS_KEY || process.env.HTTPS_KEY;
  const certPath = process.env.TLS_CERT || process.env.HTTPS_CERT;
  if (!keyPath || !certPath || !fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
    return null;
  }
  return { keyPath, certPath };
}

function isTlsConfigured() {
  return Boolean(readTlsCredentialsFromEnv());
}

function getClientCmsBaseUrl(reqHost = "") {
  const clientHost = String(reqHost || "").split(":")[0].trim();
  const host = clientHost && clientHost !== "0.0.0.0" ? clientHost : "localhost";
  if (isTlsConfigured()) {
    const { getAgentCmsPorts } = require("../config/agent-cms-ports");
    const port = getAgentCmsPorts().editorHttps;
    return `https://${host}:${port}`;
  }
  const { getAgentCmsPorts } = require("../config/agent-cms-ports");
  const port = getAgentCmsPorts().editorHttp;
  return `http://${host}:${port}`;
}

function usesTrustedDevCert() {
  return String(process.env.DEV_CERT_PROVIDER || "").trim() === "mkcert";
}

function enrichMcpDocsForClient(docs, reqHost = "", options = {}) {
  if (!docs || typeof docs !== "object") return docs;
  const path = require("path");
  const projectRoot = String(options.projectRoot || "").trim();
  const cmsBaseUrl = getClientCmsBaseUrl(reqHost);
  const tls = isTlsConfigured();
  const needsInsecureTls = tls && !usesTrustedDevCert();
  const copy = { ...docs, cmsBaseUrl, tls, devCertProvider: process.env.DEV_CERT_PROVIDER || null };

  const buildMcpEnv = (baseEnv = {}) => {
    const env = {
      ...baseEnv,
      AGENT_CMS_BASE_URL: cmsBaseUrl
    };
    if (needsInsecureTls) env.AGENT_CMS_TLS_INSECURE = "1";
    else delete env.AGENT_CMS_TLS_INSECURE;
    delete env.AGENT_CMS_AGENT;
    delete env.YAMLCMS_AGENT;
    return env;
  };

  const mcpScriptPath = projectRoot
    ? path.join(projectRoot, "mcp-server", "index.js")
    : "<ABS_PATH_YamlCMS>/mcp-server/index.js";

  if (copy.cursorConfig) {
    copy.cursorConfig = {
      ...copy.cursorConfig,
      command: "node",
      args: [mcpScriptPath],
      env: buildMcpEnv(copy.cursorConfig.env || {})
    };
  }

  if (copy.copawConfig?.mcp_servers?.["agent-cms"]) {
    const entry = copy.copawConfig.mcp_servers["agent-cms"];
    copy.copawConfig = {
      ...copy.copawConfig,
      mcp_servers: {
        ...copy.copawConfig.mcp_servers,
        "agent-cms": {
          ...entry,
          command: "node",
          args: [mcpScriptPath],
          env: buildMcpEnv(entry.env || {})
        }
      }
    };
  }

  const cursorConfigExample = copy.cursorConfig
    ? { mcpServers: { "agent-cms": copy.cursorConfig } }
    : null;

  if (cursorConfigExample) {
    copy.cursorConfigExample = cursorConfigExample;
    copy.configHandoff = [
      "Задача: подключить MCP Agent CMS в Claude Desktop или Cursor.",
      "",
      `1. Agent CMS должен быть запущен (${cmsBaseUrl}).`,
      "2. AGENT_CMS_AGENT в env НЕ добавляй — хранилище (agentId) выбирается в каждом чате через MCP tools.",
      "3. Вставь JSON ниже в конфиг MCP-клиента:",
      "   • Cursor — Settings → MCP или .cursor/mcp.json",
      "   • Claude Desktop — ~/Library/Application Support/Claude/claude_desktop_config.json",
      "",
      JSON.stringify(cursorConfigExample, null, 2),
      "",
      "4. После подключения, в начале каждого нового чата:",
      "   list_workspaces → выбери agentId (workspace / vault / хранилище) →",
      "   get_session_context({ agentId }) → дальше тот же agentId во всех workspace-tools.",
      "",
      projectRoot ? `Путь mcp-server на этом сервере: ${mcpScriptPath}` : ""
    ]
      .filter(Boolean)
      .join("\n");
  }

  const httpsNote =
    "HTTPS: npm run start:https → AGENT_CMS_BASE_URL на порту 3443. Без предупреждений браузера: brew install mkcert && mkcert -install && npm run setup:certs";
  copy.notes = Array.isArray(copy.notes) ? [...copy.notes] : [];
  if (tls && !copy.notes.some((note) => String(note).includes("mkcert"))) {
    copy.notes.unshift(httpsNote);
  }

  return copy;
}

module.exports = {
  isHttpsRedirectEnabled,
  createHttpToHttpsRedirectHandler,
  resolveInternalCmsApiUrl,
  isTlsConfigured,
  getClientCmsBaseUrl,
  usesTrustedDevCert,
  enrichMcpDocsForClient
};
