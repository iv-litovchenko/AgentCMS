const https = require("https");

const GOOGLE_CSE_ENDPOINT = "https://www.googleapis.com/customsearch/v1";
const DEFAULT_LIMIT = 10;
const MAX_WEB_LIMIT = 20;
const MAX_IMAGE_LIMIT = 20;
const DEFAULT_TIMEOUT_MS = 15_000;

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

function clampLimit(limit, max) {
  const n = Number(limit);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_LIMIT;
  return Math.min(Math.floor(n), max);
}

function normalizeLangCode(lang) {
  const raw = String(lang || "").trim();
  if (!raw) return "";
  if (raw.startsWith("lang_")) return raw;
  return `lang_${raw.replace(/^lang_/, "")}`;
}

function normalizeCountryCode(country) {
  const raw = String(country || "").trim();
  if (!raw) return "";
  if (raw.startsWith("country")) return raw;
  return `country${raw.toUpperCase()}`;
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
          const message = data?.error?.message || `Google Search API HTTP ${res.statusCode}`;
          reject(new Error(message));
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

async function googleCustomSearch(query, { apiKey, searchEngineId, limit, maxLimit = MAX_WEB_LIMIT, extraParams = {} }) {
  const q = String(query || "").trim();
  if (!q) return { error: "Query is required", status: 400 };
  if (!apiKey || !searchEngineId) {
    return {
      error:
        "Google Search is not configured. Set GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_ENGINE_ID (Programmable Search Engine cx) in .env",
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

  return {
    items: collected.slice(0, wanted),
    searchInformation
  };
}

function mapWebResult(item) {
  return {
    title: String(item.title || "").trim(),
    url: String(item.link || "").trim(),
    snippet: String(item.snippet || "").trim(),
    displayUrl: String(item.displayLink || "").trim(),
    mime: item.mime ? String(item.mime) : null,
    fileFormat: item.fileFormat ? String(item.fileFormat) : null
  };
}

function mapImageResult(item) {
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

function createWebSearchService() {
  const config = readGoogleSearchConfig();

  function buildCommonParams(payload = {}) {
    const extraParams = {};
    const safe = String(payload.safe || process.env.GOOGLE_SEARCH_SAFE || "active").trim();
    if (safe) extraParams.safe = safe;

    const lang = normalizeLangCode(payload.lang || process.env.GOOGLE_SEARCH_LANG || "");
    if (lang) extraParams.lr = lang;

    const country = normalizeCountryCode(payload.country || process.env.GOOGLE_SEARCH_COUNTRY || "");
    if (country) extraParams.cr = country;

    const gl = String(payload.gl || process.env.GOOGLE_SEARCH_GL || "").trim();
    if (gl) extraParams.gl = gl;

    return extraParams;
  }

  async function searchWeb(payload = {}) {
    const query = String(payload.query || payload.q || "").trim();
    if (!query) return { error: "Query is required", status: 400 };

    try {
      const extraParams = buildCommonParams(payload);
      const result = await googleCustomSearch(query, {
        apiKey: config.apiKey,
        searchEngineId: config.searchEngineId,
        limit: payload.limit,
        maxLimit: MAX_WEB_LIMIT,
        extraParams
      });
      if (result.error) return result;

      return {
        provider: "google",
        query,
        configured: config.configured,
        totalResults: result.searchInformation?.totalResults || null,
        searchTime: result.searchInformation?.searchTime || null,
        results: result.items.map(mapWebResult)
      };
    } catch (error) {
      return {
        error: String(error.message || error),
        status: 502
      };
    }
  }

  async function searchWebImages(payload = {}) {
    const query = String(payload.query || payload.q || "").trim();
    if (!query) return { error: "Query is required", status: 400 };

    try {
      const extraParams = {
        ...buildCommonParams(payload),
        searchType: "image"
      };
      const imgSize = normalizeImageSize(payload.size);
      if (imgSize) extraParams.imgSize = imgSize;
      const imgType = normalizeImageType(payload.type);
      if (imgType) extraParams.imgType = imgType;

      const result = await googleCustomSearch(query, {
        apiKey: config.apiKey,
        searchEngineId: config.searchEngineId,
        limit: payload.limit ?? MAX_IMAGE_LIMIT,
        maxLimit: MAX_IMAGE_LIMIT,
        extraParams
      });
      if (result.error) return result;

      return {
        provider: "google",
        query,
        configured: config.configured,
        totalResults: result.searchInformation?.totalResults || null,
        searchTime: result.searchInformation?.searchTime || null,
        results: result.items.map(mapImageResult)
      };
    } catch (error) {
      return {
        error: String(error.message || error),
        status: 502
      };
    }
  }

  return {
    getStatus() {
      return {
        provider: "google",
        configured: config.configured,
        hasApiKey: Boolean(config.apiKey),
        hasSearchEngineId: Boolean(config.searchEngineId)
      };
    },
    searchWeb,
    searchWebImages
  };
}

module.exports = {
  createWebSearchService,
  readGoogleSearchConfig
};
