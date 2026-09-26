/** Shared URL helpers for Agent Shell Companion (ES module). */

export const DEFAULT_CMS_BASE_URL = "https://localhost:3443";
export const DEFAULT_VOICE_BASE_URL = "https://localhost:3488";

export const CMS_PROBE_CANDIDATES = [
  DEFAULT_CMS_BASE_URL,
  "https://127.0.0.1:3443",
  "http://localhost:3000",
  "http://127.0.0.1:3000"
];

function uniqueUrls(urls) {
  const seen = new Set();
  const out = [];
  for (const raw of urls) {
    const value = String(raw || "").replace(/\/$/, "").trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

/** mkcert и Chrome Side Panel надёжнее с localhost, чем с 127.0.0.1. */
export function normalizeVoiceBaseForBrowser(voiceBase) {
  try {
    const url = new URL(String(voiceBase || DEFAULT_VOICE_BASE_URL).replace(/\/$/, "") + "/");
    if (url.hostname === "127.0.0.1" || url.hostname === "0.0.0.0") {
      url.hostname = "localhost";
    }
    return url.origin;
  } catch {
    return DEFAULT_VOICE_BASE_URL;
  }
}

/** Side panel iframe: Voice /{agent}/extension/ (not CMS /shell redirect). */
export function buildExtensionShellUrl(voiceBase, agentId) {
  const base = normalizeVoiceBaseForBrowser(voiceBase);
  const agent = String(agentId || "").trim();
  if (!agent) {
    // Root + companion=1 → agent picker; /extension/ would be parsed as agentId "extension".
    return `${base}/?companion=1`;
  }
  return `${base}/${encodeURIComponent(agent)}/extension/?companion=1`;
}

/** Full tab: обычный Voice /{agent}/ без companion/extension. */
export function buildVoiceShellTabUrl(voiceBase, agentId) {
  const base = normalizeVoiceBaseForBrowser(voiceBase);
  const agent = String(agentId || "").trim();
  if (!agent) return `${base}/`;
  return `${base}/${encodeURIComponent(agent)}/`;
}

const DEFAULT_EDITOR_HTTPS_PORT = 3443;
const DEFAULT_EDITOR_HTTP_PORT = 3000;
const DEFAULT_VOICE_HTTPS_PORT = 3488;
const DEFAULT_VOICE_HTTP_PORT = 3088;
const VOICE_HTTPS_OFFSET = DEFAULT_VOICE_HTTPS_PORT - DEFAULT_EDITOR_HTTPS_PORT;

export function voiceBaseFromCmsHost(cmsBase) {
  try {
    const url = new URL(String(cmsBase || DEFAULT_CMS_BASE_URL).replace(/\/$/, ""));
    if (url.hostname === "127.0.0.1" || url.hostname === "0.0.0.0") {
      url.hostname = "localhost";
    }
    const port = url.port;
    if (!port || port === String(DEFAULT_EDITOR_HTTPS_PORT)) {
      url.protocol = "https:";
      url.port = String(DEFAULT_VOICE_HTTPS_PORT);
      return url.origin;
    }
    if (port === String(DEFAULT_EDITOR_HTTP_PORT)) {
      url.protocol = "https:";
      url.port = String(DEFAULT_VOICE_HTTPS_PORT);
      return url.origin;
    }
    if (port === String(DEFAULT_VOICE_HTTPS_PORT) || port === String(DEFAULT_VOICE_HTTP_PORT)) {
      return url.origin;
    }
    const editorHttps = Number(port);
    if (Number.isFinite(editorHttps) && editorHttps > 0 && url.protocol === "https:") {
      url.port = String(editorHttps + VOICE_HTTPS_OFFSET);
      return url.origin;
    }
  } catch {
    // ignore
  }
  return DEFAULT_VOICE_BASE_URL;
}

function voiceBaseFromCmsHtml(cmsBase, html) {
  const text = String(html || "");
  const voiceMatch = text.match(/window\.__AGENT_CMS_VOICE_URL__\s*=\s*"([^"]+)"/);
  if (voiceMatch?.[1]) return normalizeVoiceBaseForBrowser(voiceMatch[1]);
  const portsMatch = text.match(/window\.__AGENT_CMS_PORTS__\s*=\s*(\{[\s\S]*?\});/);
  if (portsMatch?.[1]) {
    try {
      const ports = JSON.parse(portsMatch[1]);
      const voiceHttps = Number(ports?.voiceHttps);
      if (Number.isFinite(voiceHttps) && voiceHttps > 0) {
        const cmsUrl = new URL(String(cmsBase || DEFAULT_CMS_BASE_URL).replace(/\/$/, "") + "/");
        if (cmsUrl.hostname === "127.0.0.1" || cmsUrl.hostname === "0.0.0.0") {
          cmsUrl.hostname = "localhost";
        }
        cmsUrl.protocol = "https:";
        cmsUrl.port = String(voiceHttps);
        return cmsUrl.origin;
      }
    } catch {
      // ignore
    }
  }
  return null;
}

export function buildShellFrameUrl(cmsBase, agentId) {
  return buildExtensionShellUrl(voiceBaseFromCmsHost(cmsBase), agentId);
}

export async function resolveVoiceBaseUrl(cmsBase) {
  const cms = String(cmsBase || DEFAULT_CMS_BASE_URL).replace(/\/$/, "");
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const response = await fetch(`${cms}/`, { cache: "no-store", signal: controller.signal });
    clearTimeout(timer);
    if (response.ok) {
      const html = await response.text();
      const fromHtml = voiceBaseFromCmsHtml(cms, html);
      if (fromHtml) return fromHtml;
    }
  } catch {
    // ignore
  }
  return voiceBaseFromCmsHost(cms);
}

export async function isCmsReachable(base) {
  const url = String(base || "").replace(/\/$/, "").trim();
  if (!url) return false;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const response = await fetch(`${url}/api/agents`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: controller.signal
    });
    clearTimeout(timer);
    return response.ok;
  } catch {
    return false;
  }
}

export async function probeCmsBase(preferredBase) {
  const preferred = String(preferredBase || DEFAULT_CMS_BASE_URL).replace(/\/$/, "");
  const candidates = uniqueUrls([preferred, ...CMS_PROBE_CANDIDATES]);

  for (const base of candidates) {
    if (await isCmsReachable(base)) return base;
  }

  return preferred;
}
