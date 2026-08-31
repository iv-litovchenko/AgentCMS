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
    return `${base}/?embed=1&companion=1`;
  }
  return `${base}/${encodeURIComponent(agent)}/extension/`;
}

export function voiceBaseFromCmsHost(cmsBase) {
  try {
    const url = new URL(String(cmsBase || DEFAULT_CMS_BASE_URL).replace(/\/$/, ""));
    if (url.hostname === "127.0.0.1" || url.hostname === "0.0.0.0") {
      url.hostname = "localhost";
    }
    if (url.port === "3443" || url.port === "3000" || !url.port) {
      url.protocol = "https:";
      url.port = "3488";
      return url.origin;
    }
  } catch {
    // ignore
  }
  return DEFAULT_VOICE_BASE_URL;
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
      const match = html.match(/window\.__AGENT_CMS_VOICE_URL__\s*=\s*"([^"]+)"/);
      if (match?.[1]) return normalizeVoiceBaseForBrowser(match[1]);
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
