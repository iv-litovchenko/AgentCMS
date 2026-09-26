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
