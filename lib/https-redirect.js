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

module.exports = {
  isHttpsRedirectEnabled,
  createHttpToHttpsRedirectHandler,
  resolveInternalCmsApiUrl
};
