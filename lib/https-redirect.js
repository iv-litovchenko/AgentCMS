/**
 * HTTP → HTTPS redirect для Agent CMS и Agent CMS Voice.
 * Включено по умолчанию, если есть TLS-сертификаты (HTTPS_REDIRECT=0 — выкл).
 */

function isHttpsRedirectEnabled() {
  return process.env.HTTPS_REDIRECT !== "0";
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
    const port = Number(process.env.TLS_PORT || 3443);
    return `https://${host}:${port}`;
  }
  const port = Number(process.env.PORT || 3000);
  return `http://${host}:${port}`;
}

function usesTrustedDevCert() {
  return String(process.env.DEV_CERT_PROVIDER || "").trim() === "mkcert";
}

function enrichMcpDocsForClient(docs, reqHost = "") {
  if (!docs || typeof docs !== "object") return docs;
  const cmsBaseUrl = getClientCmsBaseUrl(reqHost);
  const tls = isTlsConfigured();
  const needsInsecureTls = tls && !usesTrustedDevCert();
  const copy = { ...docs, cmsBaseUrl, tls, devCertProvider: process.env.DEV_CERT_PROVIDER || null };

  if (copy.cursorConfig) {
    const env = {
      ...(copy.cursorConfig.env || {}),
      AGENT_CMS_BASE_URL: cmsBaseUrl
    };
    if (needsInsecureTls) env.AGENT_CMS_TLS_INSECURE = "1";
    else delete env.AGENT_CMS_TLS_INSECURE;
    copy.cursorConfig = { ...copy.cursorConfig, env };
  }

  if (copy.copawConfig?.mcp_servers?.["agent-cms"]) {
    const entry = copy.copawConfig.mcp_servers["agent-cms"];
    const env = {
      ...(entry.env || {}),
      AGENT_CMS_BASE_URL: cmsBaseUrl
    };
    if (needsInsecureTls) env.AGENT_CMS_TLS_INSECURE = "1";
    else delete env.AGENT_CMS_TLS_INSECURE;
    copy.copawConfig = {
      ...copy.copawConfig,
      mcp_servers: {
        ...copy.copawConfig.mcp_servers,
        "agent-cms": { ...entry, env }
      }
    };
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
