/** Порты Voice/Editor из window.__AGENT_CMS_PORTS__ или дефолты dev. */

const DEFAULT_PORTS = {
  editorHttp: 3000,
  editorHttps: 3443,
  voiceHttp: 3088,
  voiceHttps: 3488
};

export function readAgentCmsPorts() {
  const injected = globalThis.__AGENT_CMS_PORTS__;
  if (!injected || typeof injected !== "object") return { ...DEFAULT_PORTS };
  return {
    editorHttp: Number(injected.editorHttp) || DEFAULT_PORTS.editorHttp,
    editorHttps: Number(injected.editorHttps) || DEFAULT_PORTS.editorHttps,
    voiceHttp: Number(injected.voiceHttp) || DEFAULT_PORTS.voiceHttp,
    voiceHttps: Number(injected.voiceHttps) || DEFAULT_PORTS.voiceHttps
  };
}

export function resolveVoiceTlsPort() {
  const ports = readAgentCmsPorts();
  const fromLocation = Number(globalThis.location?.port);
  if (globalThis.location?.protocol === "https:" && Number.isFinite(fromLocation) && fromLocation > 0) {
    return fromLocation;
  }
  return ports.voiceHttps;
}

function normalizeHostname(hostname) {
  const value = String(hostname || "localhost").trim();
  if (value === "127.0.0.1" || value === "0.0.0.0") return "localhost";
  return value;
}

function formatOrigin(protocol, hostname, port) {
  const defaultPort = protocol === "https:" ? 443 : 80;
  const portNum = Number(port);
  const portSuffix =
    Number.isFinite(portNum) && portNum > 0 && portNum !== defaultPort ? `:${portNum}` : "";
  return `${protocol}//${hostname}${portSuffix}`;
}

/** URL workspace в Agent CMS Editor (не Voice): с порта Voice — на порт Editor. */
export function buildEditorWorkspaceUrl(agentId) {
  const ports = readAgentCmsPorts();
  const agent = String(agentId || "").trim();
  const pathname = agent ? `/${encodeURIComponent(agent)}/` : "/";
  const loc = globalThis.location;
  if (!loc?.hostname) return pathname;

  const hostname = normalizeHostname(loc.hostname);
  const protocol = loc.protocol === "https:" ? "https:" : "http:";
  const currentPort = loc.port
    ? Number(loc.port)
    : protocol === "https:"
      ? 443
      : 80;

  let targetPort = currentPort;
  if (currentPort === ports.voiceHttps) {
    targetPort = ports.editorHttps;
  } else if (currentPort === ports.voiceHttp) {
    targetPort = ports.editorHttp;
  } else if (protocol === "https:" && ports.voiceHttps !== ports.editorHttps) {
    const offset = ports.voiceHttps - ports.editorHttps;
    if (currentPort === ports.editorHttps + offset) {
      targetPort = ports.editorHttps;
    }
  } else if (protocol === "http:" && ports.voiceHttp !== ports.editorHttp) {
    const offset = ports.voiceHttp - ports.editorHttp;
    if (currentPort === ports.editorHttp + offset) {
      targetPort = ports.editorHttp;
    }
  }

  return `${formatOrigin(protocol, hostname, targetPort)}${pathname}`;
}
