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

  /** Подпись в Side Panel: host с портом (если не 80/443) + path + query. */
  function formatCompanionPanelUrlLabel(rawUrl) {
    try {
      const url = new URL(String(rawUrl || "").trim());
      if (url.hostname === "127.0.0.1" || url.hostname === "0.0.0.0") {
        url.hostname = "localhost";
      }
      return `${url.host}${url.pathname}${url.search}${url.hash}`;
    } catch {
      return String(rawUrl || "").replace(/^https?:\/\//, "");
    }
  }

  /** Открыть Voice во вкладке из URL iframe (…/extension/ → …/). */
  function voiceTabUrlFromShellHref(href) {
    const raw = String(href || "").trim();
    if (!raw) return "";
    try {
      const url = new URL(raw);
      if (url.hostname === "127.0.0.1" || url.hostname === "0.0.0.0") {
        url.hostname = "localhost";
      }
      const parts = url.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
      if (parts.length >= 1 && parts[0] !== "extension") {
        let agent = parts[0];
        try {
          agent = decodeURIComponent(parts[0]);
        } catch {
          agent = parts[0];
        }
        url.pathname = `/${encodeURIComponent(agent)}/`;
      }
      url.searchParams.delete("companion");
      url.searchParams.delete("_asc_reload");
      const query = url.searchParams.toString();
      url.search = query ? `?${query}` : "";
      url.hash = "";
      return url.href;
    } catch {
      return raw;
    }
  }

  function buildExtensionShellUrl(voiceBase, agentId) {
    const base = normalizeVoiceBaseForBrowser(voiceBase);
    const agent = String(agentId || "").trim();
    if (!agent) {
      // Root + companion=1 → agent picker; /extension/ would be parsed as agentId "extension".
      return `${base}/?companion=1`;
    }
    return `${base}/${encodeURIComponent(agent)}/extension/?companion=1`;
  }

  function buildVoiceShellTabUrl(voiceBase, agentId) {
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

  function voiceBaseFromCmsHost(cmsBase) {
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
        if (editorHttps === DEFAULT_EDITOR_HTTPS_PORT) {
          url.port = String(DEFAULT_VOICE_HTTPS_PORT);
          return url.origin;
        }
        // Кастомные пары портов (напр. 3002/4002) — только из HTML CMS (__AGENT_CMS_PORTS__).
        return DEFAULT_VOICE_BASE_URL;
      }
    } catch {
      // ignore
    }
    return DEFAULT_VOICE_BASE_URL;
  }

  function buildShellFrameUrl(cmsBase, agentId) {
    return buildExtensionShellUrl(voiceBaseFromCmsHost(cmsBase), agentId);
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

  async function resolveVoiceBaseUrl(cmsBase) {
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

  async function isVoiceReachable(voiceUrl, timeoutMs = 4000) {
    let origin = DEFAULT_VOICE_BASE_URL;
    try {
      origin = new URL(String(voiceUrl || DEFAULT_VOICE_BASE_URL)).origin;
    } catch {
      // keep default
    }
    const waitMs = Math.max(500, Number(timeoutMs) || 4000);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), waitMs);
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
    formatCompanionPanelUrlLabel,
    voiceTabUrlFromShellHref,
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
