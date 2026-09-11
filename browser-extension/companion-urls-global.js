(function initCompanionUrlsGlobal(global) {
  "use strict";

  const DEFAULT_CMS_BASE_URL = "https://localhost:3443";
  const DEFAULT_VOICE_BASE_URL = "https://localhost:3488";

  const CMS_PROBE_CANDIDATES = [
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

  function normalizeVoiceBaseForBrowser(voiceBase) {
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

  function buildExtensionShellUrl(voiceBase, agentId) {
    const base = normalizeVoiceBaseForBrowser(voiceBase);
    const agent = String(agentId || "").trim();
    if (!agent) {
      return `${base}/extension/`;
    }
    return `${base}/${encodeURIComponent(agent)}/extension/`;
  }

  function buildVoiceShellTabUrl(voiceBase, agentId) {
    const base = normalizeVoiceBaseForBrowser(voiceBase);
    const agent = String(agentId || "").trim();
    if (!agent) return `${base}/`;
    return `${base}/${encodeURIComponent(agent)}/`;
  }

  function voiceBaseFromCmsHost(cmsBase) {
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

  function buildShellFrameUrl(cmsBase, agentId) {
    return buildExtensionShellUrl(voiceBaseFromCmsHost(cmsBase), agentId);
  }

  async function resolveVoiceBaseUrl(cmsBase) {
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

  async function isCmsReachable(base) {
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

  function decodeUrlSegment(segment) {
    const value = String(segment || "");
    if (!value) return value;
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  function readDecodeUrlsSetting(stored = {}) {
    if (typeof stored.decodeUrls === "boolean") return stored.decodeUrls;
    if (stored.decodeUrlsInCompanion === false && !stored.decodeUrlsOnCopy) return false;
    return stored.decodeUrlsInCompanion !== false || Boolean(stored.decodeUrlsOnCopy);
  }

  function decodeReadableUrl(raw) {
    const value = String(raw || "").trim();
    if (!value) return value;
    try {
      const parsed = new URL(value);
      const pathname = parsed.pathname
        .split("/")
        .map(decodeUrlSegment)
        .join("/");
      let search = "";
      if (parsed.search.length > 1) {
        search =
          "?" +
          parsed.search
            .slice(1)
            .split("&")
            .map((pair) => {
              const idx = pair.indexOf("=");
              if (idx === -1) return decodeUrlSegment(pair);
              return `${decodeUrlSegment(pair.slice(0, idx))}=${decodeUrlSegment(pair.slice(idx + 1))}`;
            })
            .join("&");
      }
      let hash = "";
      if (parsed.hash.length > 1) {
        hash = `#${decodeUrlSegment(parsed.hash.slice(1))}`;
      }
      // Do not use parsed.href here — URL API re-encodes Cyrillic back to %D0%…
      return `${parsed.origin}${pathname}${search}${hash}`;
    } catch {
      try {
        return decodeURI(value);
      } catch {
        return value;
      }
    }
  }

  async function isVoiceReachable(voiceUrl) {
    let origin = DEFAULT_VOICE_BASE_URL;
    try {
      origin = new URL(String(voiceUrl || DEFAULT_VOICE_BASE_URL)).origin;
    } catch {
      // keep default
    }
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const response = await fetch(`${origin}/`, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal
      });
      clearTimeout(timer);
      return response.ok;
    } catch {
      return false;
    }
  }

  global.CompanionUrls = {
    DEFAULT_CMS_BASE_URL,
    DEFAULT_VOICE_BASE_URL,
    CMS_PROBE_CANDIDATES,
    uniqueUrls,
    normalizeVoiceBaseForBrowser,
    buildExtensionShellUrl,
    buildVoiceShellTabUrl,
    voiceBaseFromCmsHost,
    buildShellFrameUrl,
    resolveVoiceBaseUrl,
    isCmsReachable,
    isVoiceReachable,
    decodeReadableUrl,
    readDecodeUrlsSetting
  };
})(typeof globalThis !== "undefined" ? globalThis : self);
