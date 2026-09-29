const http = require("http");
const https = require("https");
const { fetchBufferFromImportUrl } = require("../media/media-import");

const GOOGLE_CSE_ENDPOINT = "https://www.googleapis.com/customsearch/v1";
const GOOGLE_WEB_SEARCH_URL = "https://www.google.com/search";
const GOOGLE_IMAGE_SEARCH_URL = "https://www.google.com/search";

const DEFAULT_LIMIT = 10;
const MAX_WEB_LIMIT = 20;
const MAX_IMAGE_LIMIT = 20;
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_PAGE_MAX_BYTES = 512_000;
const DEFAULT_PAGE_MAX_CHARS = 50_000;

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function readGoogleSearchConfig() {
  const apiKey = String(
    process.env.GOOGLE_SEARCH_API_KEY ||
      process.env.GOOGLE_CSE_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      ""
  ).trim();
  const searchEngineId = String(
    process.env.GOOGLE_SEARCH_ENGINE_ID ||
      process.env.GOOGLE_CSE_ID ||
      process.env.GOOGLE_SEARCH_CX ||
      ""
  ).trim();
  return {
    apiKey,
    searchEngineId,
    configured: Boolean(apiKey && searchEngineId)
  };
}

function getSearchMode() {
  const mode = String(process.env.WEB_SEARCH_MODE || "direct").trim().toLowerCase();
  return mode === "api" ? "api" : "direct";
}

function clampLimit(limit, max) {
  const n = Number(limit);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_LIMIT;
  return Math.min(Math.floor(n), max);
}

function normalizeLangCode(lang) {
  const raw = String(lang || "").trim();
  if (!raw) return "";
  if (raw.startsWith("lang_")) return raw.replace(/^lang_/, "");
  return raw;
}

function normalizeCountryCode(country) {
  const raw = String(country || "").trim();
  if (!raw) return "";
  if (raw.startsWith("country")) return raw.replace(/^country/, "").toLowerCase();
  return raw.toLowerCase();
}

function normalizeImageSize(size) {
  const raw = String(size || "").trim().toLowerCase();
  const allowed = new Set(["icon", "small", "medium", "large", "xlarge", "xxlarge", "huge"]);
  return allowed.has(raw) ? raw : "";
}

function normalizeImageType(type) {
  const raw = String(type || "").trim().toLowerCase();
  const allowed = new Set(["clipart", "face", "lineart", "stock", "photo", "animated"]);
  return allowed.has(raw) ? raw : "";
}

function decodeHtmlEntities(text) {
  return String(text || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function stripHtmlTags(text) {
  return decodeHtmlEntities(
    String(text || "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<\/h[1-6]>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\s+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function htmlToText(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .split("\n")
    .map((line) => stripHtmlTags(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractHtmlTitle(html) {
  const match = String(html || "").match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? stripHtmlTags(match[1]) : "";
}

function excerptText(text, maxLen = 400) {
  const cleaned = String(text || "").replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  if (cleaned.length <= maxLen) return cleaned;
  return `${cleaned.slice(0, maxLen).trim()}…`;
}

function isGoogleBlockedHtml(html) {
  const body = String(html || "").toLowerCase();
  return (
    body.includes("unusual traffic") ||
    body.includes("detected unusual traffic") ||
    body.includes("/sorry/index") ||
    body.includes("recaptcha") ||
    body.includes("before you continue to google") ||
    body.includes("enablejs") ||
    body.includes("/httpservice/retry/enablejs")
  );
}

function isGoogleJsShellHtml(html) {
  const body = String(html || "");
  return (
    isGoogleBlockedHtml(body) ||
    (!body.includes("/url?q=") && !body.includes("<h3") && body.includes("<noscript"))
  );
}

function fetchText(urlString, { timeoutMs = DEFAULT_TIMEOUT_MS, maxBytes = 2_000_000, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    let parsed;
    try {
      parsed = new URL(urlString);
    } catch {
      reject(new Error("Invalid URL"));
      return;
    }
    const lib = parsed.protocol === "https:" ? https : http;
    const req = lib.request(
      parsed,
      {
        method: "GET",
        headers: {
          "User-Agent": BROWSER_USER_AGENT,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9,ru;q=0.8",
          ...headers
        },
        timeout: timeoutMs
      },
      (res) => {
        if ([301, 302, 303, 307, 308].includes(Number(res.statusCode)) && res.headers.location) {
          res.resume();
          try {
            resolve(fetchText(new URL(res.headers.location, parsed).toString(), { timeoutMs, maxBytes, headers }));
          } catch (error) {
            reject(error);
          }
          return;
        }
        if (Number(res.statusCode) < 200 || Number(res.statusCode) >= 300) {
          res.resume();
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        const chunks = [];
        let total = 0;
        res.on("data", (chunk) => {
          total += chunk.length;
          if (total > maxBytes) {
            req.destroy();
            reject(new Error("Response too large"));
            return;
          }
          chunks.push(chunk);
        });
        res.on("end", () => {
          resolve(Buffer.concat(chunks).toString("utf-8"));
        });
      }
    );
    req.on("timeout", () => {
      req.destroy(new Error("Request timed out"));
    });
    req.on("error", reject);
    req.end();
  });
}

function fetchJson(url, timeoutMs = DEFAULT_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { Accept: "application/json" } }, (res) => {
      let body = "";
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        let data = null;
        try {
          data = body ? JSON.parse(body) : null;
        } catch (error) {
          reject(new Error(`Invalid JSON from Google Search API: ${error.message}`));
          return;
        }
        if (res.statusCode >= 400) {
          reject(new Error(data?.error?.message || `Google Search API HTTP ${res.statusCode}`));
          return;
        }
        resolve(data || {});
      });
    });
    req.on("error", reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error("Google Search API request timed out"));
    });
  });
}

function buildGoogleSearchUrl(params) {
  const url = new URL(GOOGLE_CSE_ENDPOINT);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

function buildGoogleDirectSearchUrl(query, payload = {}, { images = false } = {}) {
  const url = new URL(images ? GOOGLE_IMAGE_SEARCH_URL : GOOGLE_WEB_SEARCH_URL);
  url.searchParams.set("q", query);
  if (images) url.searchParams.set("tbm", "isch");
  const limit = clampLimit(payload.limit, images ? MAX_IMAGE_LIMIT : MAX_WEB_LIMIT);
  if (!images && limit <= 10) url.searchParams.set("num", String(limit));
  const hl = normalizeLangCode(payload.lang || process.env.GOOGLE_SEARCH_LANG || "");
  if (hl) url.searchParams.set("hl", hl);
  const gl = String(payload.gl || process.env.GOOGLE_SEARCH_GL || normalizeCountryCode(payload.country || process.env.GOOGLE_SEARCH_COUNTRY || "")).trim();
  if (gl) url.searchParams.set("gl", gl);
  const safe = String(payload.safe || process.env.GOOGLE_SEARCH_SAFE || "active").trim();
  if (safe === "off") url.searchParams.set("safe", "off");
  return url.toString();
}

function normalizeResultUrl(raw) {
  const text = decodeHtmlEntities(String(raw || "").trim());
  if (!text) return "";
  if (text.startsWith("/url?q=")) {
    try {
      const parsed = new URL(`https://www.google.com${text}`);
      return decodeURIComponent(parsed.searchParams.get("q") || "");
    } catch {
      return "";
    }
  }
  return text;
}

function isUsableExternalUrl(url) {
  if (!/^https?:\/\//i.test(url)) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host === "google.com" || host.endsWith(".google.com")) return false;
    if (host === "googleusercontent.com" || host.endsWith(".googleusercontent.com")) return false;
    if (host === "gstatic.com" || host.endsWith(".gstatic.com")) return false;
  } catch {
    return false;
  }
  return true;
}

function parseGoogleDirectWebResults(html, limit) {
  const results = [];
  const seen = new Set();

  const pushResult = (url, title = "", snippet = "") => {
    const normalized = normalizeResultUrl(url);
    if (!isUsableExternalUrl(normalized) || seen.has(normalized)) return;
    seen.add(normalized);
    results.push({
      title: stripHtmlTags(title),
      url: normalized,
      snippet: stripHtmlTags(snippet),
      displayUrl: normalized.replace(/^https?:\/\//i, "").replace(/\/$/, "")
    });
  };

  const urlQRe = /href="\/url\?q=([^"#&]+)[^"]*"[^>]*>([\s\S]{0,1200}?)<\/a>/gi;
  let match;
  while ((match = urlQRe.exec(html)) !== null && results.length < limit) {
    const chunk = match[2] || "";
    const titleMatch = chunk.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
    const snippetMatch =
      chunk.match(/<(?:div|span)[^>]*class="[^"]*(?:VwiC3b|IsZvec|st)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|span)>/i) ||
      chunk.match(/<span[^>]*>([\s\S]*?)<\/span>/i);
    pushResult(decodeURIComponent(match[1].replace(/&amp;/g, "&")), titleMatch?.[1], snippetMatch?.[1]);
  }

  if (results.length < limit) {
    const anchorRe = /<a[^>]+href="(https?:\/\/[^"]+)"[^>]*>([\s\S]{0,1200}?)<\/a>/gi;
    while ((match = anchorRe.exec(html)) !== null && results.length < limit) {
      const chunk = match[2] || "";
      const titleMatch = chunk.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
      if (!titleMatch) continue;
      pushResult(match[1], titleMatch[1], "");
    }
  }

  return results.slice(0, limit);
}

function unescapeGoogleJsonUrl(raw) {
  return String(raw || "")
    .replace(/\\u003d/g, "=")
    .replace(/\\u0026/g, "&")
    .replace(/\\\//g, "/")
    .replace(/\\"/g, '"');
}

function parseGoogleDirectImageResults(html, limit) {
  const results = [];
  const seen = new Set();

  const pushImage = (imageUrl, contextUrl = "", title = "", thumbnailUrl = "") => {
    const normalizedImage = unescapeGoogleJsonUrl(imageUrl);
    const normalizedContext = unescapeGoogleJsonUrl(contextUrl);
    if (!isUsableExternalUrl(normalizedImage) || seen.has(normalizedImage)) return;
    seen.add(normalizedImage);
    results.push({
      title: stripHtmlTags(title),
      imageUrl: normalizedImage,
      contextUrl: isUsableExternalUrl(normalizedContext) ? normalizedContext : "",
      thumbnailUrl: thumbnailUrl ? unescapeGoogleJsonUrl(thumbnailUrl) : normalizedImage
    });
  };

  const jsonOuRe = /"ou":"((?:https?:)?(?:\\\/\\\/|\/\/)[^"\\]+)"/g;
  let match;
  const imageUrls = [];
  while ((match = jsonOuRe.exec(html)) !== null) {
    imageUrls.push(unescapeGoogleJsonUrl(match[1]));
  }

  const jsonRuRe = /"ru":"((?:https?:)?(?:\\\/\\\/|\/\/)[^"\\]+)"/g;
  const contextUrls = [];
  while ((match = jsonRuRe.exec(html)) !== null) {
    contextUrls.push(unescapeGoogleJsonUrl(match[1]));
  }

  for (let i = 0; i < imageUrls.length && results.length < limit; i += 1) {
    pushImage(imageUrls[i], contextUrls[i] || "", "", imageUrls[i]);
  }

  if (results.length < limit) {
    const imgRe = /<img[^>]+(?:src|data-src)="(https?:\/\/[^"]+)"/gi;
    while ((match = imgRe.exec(html)) !== null && results.length < limit) {
      pushImage(match[1], "", "", match[1]);
    }
  }

  return results.slice(0, limit);
}

async function googleCustomSearch(query, { apiKey, searchEngineId, limit, maxLimit = MAX_WEB_LIMIT, extraParams = {} }) {
  const q = String(query || "").trim();
  if (!q) return { error: "Query is required", status: 400 };
  if (!apiKey || !searchEngineId) {
    return {
      error:
        "Google Search API is not configured. Set GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_ENGINE_ID, or use WEB_SEARCH_MODE=direct.",
      status: 503
    };
  }

  const wanted = clampLimit(limit, maxLimit);
  const collected = [];
  let start = 1;
  let searchInformation = null;

  while (collected.length < wanted && start <= 91) {
    const num = Math.min(10, wanted - collected.length);
    const url = buildGoogleSearchUrl({
      key: apiKey,
      cx: searchEngineId,
      q,
      num,
      start,
      ...extraParams
    });
    const data = await fetchJson(url);
    searchInformation = data.searchInformation || searchInformation;
    const items = Array.isArray(data.items) ? data.items : [];
    if (!items.length) break;
    collected.push(...items);
    if (items.length < num) break;
    start += num;
  }

  return { items: collected.slice(0, wanted), searchInformation };
}

function mapApiWebResult(item) {
  return {
    title: String(item.title || "").trim(),
    url: String(item.link || "").trim(),
    snippet: String(item.snippet || "").trim(),
    displayUrl: String(item.displayLink || "").trim(),
    mime: item.mime ? String(item.mime) : null,
    fileFormat: item.fileFormat ? String(item.fileFormat) : null
  };
}

function mapApiImageResult(item) {
  const image = item.image && typeof item.image === "object" ? item.image : {};
  return {
    title: String(item.title || "").trim(),
    imageUrl: String(item.link || "").trim(),
    contextUrl: String(image.contextLink || "").trim(),
    thumbnailUrl: String(image.thumbnailLink || "").trim(),
    width: Number.isFinite(Number(image.width)) ? Number(image.width) : null,
    height: Number.isFinite(Number(image.height)) ? Number(image.height) : null,
    byteSize: Number.isFinite(Number(image.byteSize)) ? Number(image.byteSize) : null
  };
}

async function googleDirectWebSearch(query, payload = {}) {
  const url = buildGoogleDirectSearchUrl(query, payload, { images: false });
  const html = await fetchText(url);
  if (isGoogleBlockedHtml(html)) {
    return {
      error: "Google blocked automated search (captcha / unusual traffic). Retry later or set WEB_SEARCH_MODE=api with API keys.",
      status: 429,
      fallback: true
    };
  }
  const results = parseGoogleDirectWebResults(html, clampLimit(payload.limit, MAX_WEB_LIMIT));
  if (!results.length && isGoogleJsShellHtml(html)) {
    return { items: [], jsShell: true, fallback: true };
  }
  return { items: results, blocked: false };
}

async function googleDirectImageSearch(query, payload = {}) {
  const url = buildGoogleDirectSearchUrl(query, payload, { images: true });
  const html = await fetchText(url);
  if (isGoogleBlockedHtml(html)) {
    return {
      error: "Google blocked automated image search (captcha / unusual traffic). Retry later or set WEB_SEARCH_MODE=api with API keys.",
      status: 429,
      fallback: true
    };
  }
  const results = parseGoogleDirectImageResults(html, clampLimit(payload.limit, MAX_IMAGE_LIMIT));
  if (!results.length && isGoogleJsShellHtml(html)) {
    return { items: [], jsShell: true, fallback: true };
  }
  return { items: results, blocked: false };
}

function fetchPostText(urlString, body, { timeoutMs = DEFAULT_TIMEOUT_MS, maxBytes = 2_000_000, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    let parsed;
    try {
      parsed = new URL(urlString);
    } catch {
      reject(new Error("Invalid URL"));
      return;
    }
    const lib = parsed.protocol === "https:" ? https : http;
    const payload = typeof body === "string" ? body : new URLSearchParams(body).toString();
    const req = lib.request(
      parsed,
      {
        method: "POST",
        headers: {
          "User-Agent": BROWSER_USER_AGENT,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9,ru;q=0.8",
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(payload),
          ...headers
        },
        timeout: timeoutMs
      },
      (res) => {
        if ([301, 302, 303, 307, 308].includes(Number(res.statusCode)) && res.headers.location) {
          res.resume();
          try {
            resolve(fetchPostText(new URL(res.headers.location, parsed).toString(), body, { timeoutMs, maxBytes, headers }));
          } catch (error) {
            reject(error);
          }
          return;
        }
        if (Number(res.statusCode) < 200 || Number(res.statusCode) >= 300) {
          res.resume();
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        const chunks = [];
        let total = 0;
        res.on("data", (chunk) => {
          total += chunk.length;
          if (total > maxBytes) {
            req.destroy();
            reject(new Error("Response too large"));
            return;
          }
          chunks.push(chunk);
        });
        res.on("end", () => {
          resolve(Buffer.concat(chunks).toString("utf-8"));
        });
      }
    );
    req.on("timeout", () => {
      req.destroy(new Error("Request timed out"));
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

function parseDuckDuckGoWebResults(html, limit) {
  const results = [];
  const seen = new Set();
  const rowRe = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = rowRe.exec(html)) !== null && results.length < limit) {
    let url = decodeHtmlEntities(match[1]).trim();
    if (url.startsWith("//")) url = `https:${url}`;
    if (!isUsableExternalUrl(url) || seen.has(url)) continue;
    seen.add(url);
    const title = stripHtmlTags(match[2]);
    const tail = html.slice(match.index, match.index + 2500);
    const snippetMatch = tail.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i);
    results.push({
      title,
      url,
      snippet: snippetMatch ? stripHtmlTags(snippetMatch[1]) : "",
      displayUrl: url.replace(/^https?:\/\//i, "").replace(/\/$/, "")
    });
  }
  return results.slice(0, limit);
}

async function duckDuckGoWebSearch(query, payload = {}) {
  const limit = clampLimit(payload.limit, MAX_WEB_LIMIT);
  const lang = normalizeLangCode(payload.lang || process.env.GOOGLE_SEARCH_LANG || "ru");
  const kl = lang === "ru" ? "ru-ru" : lang === "en" ? "us-en" : `${lang}-${lang}`;
  const html = await fetchPostText("https://html.duckduckgo.com/html/", { q: query, kl });
  const results = parseDuckDuckGoWebResults(html, limit);
  return { items: results };
}

async function duckDuckGoImageSearch(query, payload = {}) {
  const limit = clampLimit(payload.limit, MAX_IMAGE_LIMIT);
  const lang = normalizeLangCode(payload.lang || process.env.GOOGLE_SEARCH_LANG || "ru");
  const kl = lang === "ru" ? "ru-ru" : lang === "en" ? "us-en" : `${lang}-${lang}`;
  const landingUrl = `https://duckduckgo.com/?${new URLSearchParams({
    q: query,
    iax: "images",
    ia: "images"
  }).toString()}`;
  const landingHtml = await fetchText(landingUrl);
  const vqdMatch = landingHtml.match(/vqd=(\d+-[\d]+)/);
  if (!vqdMatch) {
    return { error: "DuckDuckGo image search token not found", status: 502 };
  }
  const apiUrl = `https://duckduckgo.com/i.js?${new URLSearchParams({
    l: kl,
    o: "json",
    q: query,
    vqd: vqdMatch[1]
  }).toString()}`;
  const jsonText = await fetchText(apiUrl, {
    headers: { Referer: "https://duckduckgo.com/" }
  });
  let data;
  try {
    data = JSON.parse(jsonText);
  } catch (error) {
    return { error: `Invalid DuckDuckGo image JSON: ${error.message}`, status: 502 };
  }
  const items = (Array.isArray(data.results) ? data.results : [])
    .slice(0, limit)
    .map((item) => ({
      title: String(item.title || "").trim(),
      imageUrl: String(item.image || "").trim(),
      contextUrl: String(item.url || "").trim(),
      thumbnailUrl: String(item.thumbnail || item.image || "").trim()
    }))
    .filter((item) => isUsableExternalUrl(item.imageUrl));
  return { items };
}

function createWebSearchService() {
  const config = readGoogleSearchConfig();

  function buildApiParams(payload = {}) {
    const extraParams = {};
    const safe = String(payload.safe || process.env.GOOGLE_SEARCH_SAFE || "active").trim();
    if (safe) extraParams.safe = safe;
    const lang = normalizeLangCode(payload.lang || process.env.GOOGLE_SEARCH_LANG || "");
    if (lang) extraParams.lr = `lang_${lang}`;
    const country = normalizeCountryCode(payload.country || process.env.GOOGLE_SEARCH_COUNTRY || "");
    if (country) extraParams.cr = `country${country.toUpperCase()}`;
    const gl = String(payload.gl || process.env.GOOGLE_SEARCH_GL || country || "").trim();
    if (gl) extraParams.gl = gl;
    return extraParams;
  }

  async function resolveWebSearch(query, payload, { images = false } = {}) {
    const mode = getSearchMode();
    if (mode === "api" && config.configured) {
      const extraParams = {
        ...buildApiParams(payload),
        ...(images ? { searchType: "image" } : {})
      };
      if (images) {
        const imgSize = normalizeImageSize(payload.size);
        if (imgSize) extraParams.imgSize = imgSize;
        const imgType = normalizeImageType(payload.type);
        if (imgType) extraParams.imgType = imgType;
      }
      const result = await googleCustomSearch(query, {
        apiKey: config.apiKey,
        searchEngineId: config.searchEngineId,
        limit: payload.limit,
        maxLimit: images ? MAX_IMAGE_LIMIT : MAX_WEB_LIMIT,
        extraParams
      });
      if (result.error) return result;
      return {
        provider: "google-api",
        mode: "api",
        items: result.items,
        searchInformation: result.searchInformation,
        mapItem: images ? mapApiImageResult : mapApiWebResult
      };
    }

    const direct = images ? await googleDirectImageSearch(query, payload) : await googleDirectWebSearch(query, payload);
    if (direct.error && !direct.fallback) return direct;
    if (direct.items?.length) {
      return {
        provider: "google-direct",
        mode: "direct",
        items: direct.items,
        searchInformation: null,
        mapItem: null
      };
    }

    const fallback = images ? await duckDuckGoImageSearch(query, payload) : await duckDuckGoWebSearch(query, payload);
    if (fallback.error) return fallback;
    return {
      provider: "duckduckgo",
      mode: "direct",
      items: fallback.items,
      searchInformation: null,
      mapItem: null,
      fallbackFrom: direct.jsShell || direct.fallback ? "google-direct" : null
    };
  }

  async function searchWeb(payload = {}) {
    const query = String(payload.query || payload.q || "").trim();
    if (!query) return { error: "Query is required", status: 400 };

    try {
      const resolved = await resolveWebSearch(query, payload, { images: false });
      if (resolved.error) return resolved;
      const results = resolved.mapItem
        ? resolved.items.map(resolved.mapItem)
        : resolved.items;

      return {
        provider: resolved.provider,
        mode: resolved.mode,
        query,
        configured: config.configured,
        fallbackFrom: resolved.fallbackFrom || null,
        totalResults: resolved.searchInformation?.totalResults || null,
        searchTime: resolved.searchInformation?.searchTime || null,
        results
      };
    } catch (error) {
      return { error: String(error.message || error), status: 502 };
    }
  }

  async function searchWebImages(payload = {}) {
    const query = String(payload.query || payload.q || "").trim();
    if (!query) return { error: "Query is required", status: 400 };

    try {
      const resolved = await resolveWebSearch(query, payload, { images: true });
      if (resolved.error) return resolved;
      const results = resolved.mapItem
        ? resolved.items.map(resolved.mapItem)
        : resolved.items;

      return {
        provider: resolved.provider,
        mode: resolved.mode,
        query,
        configured: config.configured,
        fallbackFrom: resolved.fallbackFrom || null,
        totalResults: resolved.searchInformation?.totalResults || null,
        searchTime: resolved.searchInformation?.searchTime || null,
        results
      };
    } catch (error) {
      return { error: String(error.message || error), status: 502 };
    }
  }

  async function readWebPage(payload = {}) {
    const url = String(payload.url || "").trim();
    if (!url) return { error: "URL is required", status: 400 };

    const maxBytes = Number(payload.maxBytes) > 0 ? Number(payload.maxBytes) : DEFAULT_PAGE_MAX_BYTES;
    const maxChars = Number(payload.maxChars) > 0 ? Number(payload.maxChars) : DEFAULT_PAGE_MAX_CHARS;

    try {
      const fetched = await fetchBufferFromImportUrl(url, {
        maxBytes,
        timeoutMs: DEFAULT_TIMEOUT_MS
      });
      const contentType = String(fetched.contentType || "").split(";")[0].trim().toLowerCase();
      const buffer = fetched.buffer;
      let text = "";
      let title = "";

      if (contentType.includes("html") || /^<!doctype html/i.test(buffer.slice(0, 200).toString("utf-8"))) {
        const html = buffer.toString("utf-8");
        title = extractHtmlTitle(html);
        text = htmlToText(html);
      } else if (contentType.includes("json")) {
        try {
          text = JSON.stringify(JSON.parse(buffer.toString("utf-8")), null, 2);
        } catch {
          text = buffer.toString("utf-8");
        }
      } else if (contentType.startsWith("text/") || contentType.includes("xml")) {
        text = buffer.toString("utf-8");
      } else {
        return {
          error: `Unsupported content type for page reading: ${contentType || "unknown"}. Use import_content_from_url for binaries.`,
          status: 415
        };
      }

      if (text.length > maxChars) {
        text = `${text.slice(0, maxChars).trim()}…`;
      }

      return {
        url: fetched.sourceUrl,
        finalUrl: fetched.sourceUrl,
        title,
        contentType: contentType || "text/plain",
        excerpt: excerptText(text),
        text,
        charCount: text.length,
        truncated: text.endsWith("…")
      };
    } catch (error) {
      const status = Number(error.status) || 502;
      return {
        error: String(error.message || error),
        status
      };
    }
  }

  return {
    getStatus() {
      return {
        provider: getSearchMode() === "api" && config.configured ? "google-api" : "google-direct",
        mode: getSearchMode(),
        configured: config.configured,
        hasApiKey: Boolean(config.apiKey),
        hasSearchEngineId: Boolean(config.searchEngineId)
      };
    },
    searchWeb,
    searchWebImages,
    readWebPage
  };
}

module.exports = {
  createWebSearchService,
  readGoogleSearchConfig,
  getSearchMode
};
