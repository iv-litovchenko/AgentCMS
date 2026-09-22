const path = require("path");
const { normalizePlatformAgentSettings } = require("./workspace-agent-settings");

const DEFAULT_INDEX_FILE_EXTENSIONS = [".md", ".sidecar.md"];

const DEFAULT_INDEX_EXCLUDE_LINES = [
  ".git",
  ".agent-cms",
  "node_modules/",
  "awn-repositories/ !manifest.md !README.md"
];

const INDEX_FILE_EXTENSION_OPTIONS = [
  { key: ".md", name: "Markdown (.md)" },
  { key: ".sidecar.md", name: "Sidecar (.sidecar.md)" },
  { key: ".yml", name: "YAML (.yml)" },
  { key: ".yaml", name: "YAML (.yaml)" },
  { key: ".txt", name: "Text (.txt)" },
  { key: ".json", name: "JSON (.json)" }
];

const INDEX_PATH_PREFIX_OPTIONS = [
  { key: "awn-storage/", name: "awn-storage/" },
  { key: "awn-container/", name: "awn-container/" },
  { key: "awn-shared/", name: "awn-shared/" },
  { key: "codex-test/", name: "codex-test/" }
];

const SEARCH_SCOPE_OPTIONS = [
  { key: "semantic", name: "Смысл (semantic)" },
  { key: "fulltext", name: "Слова (fulltext)" }
];

const DEFAULT_OCR_LANGS = "rus+eng";

const INDEXING_POLICY_SETTING_KEYS = [
  "index-semantic-enabled",
  "index-fulltext-enabled",
  "index-storage-enabled",
  "index-links-enabled",
  "indexing-ocr-langs",
  "index-ocr-enabled",
  "index-workspace-id-enabled",
  "index-storage-mode",
  "index-file-extensions",
  "index-path-prefixes",
  "index-exclude-patterns",
  "search-default-scopes",
  "search-semantic-chunk-size",
  "search-semantic-chunk-overlap",
  "search-hybrid-semantic-weight",
  "search-hybrid-fulltext-weight"
];

const PIPELINE_STEP_KEYS = ["ocr", "fulltext", "semantic", "storage", "link", "workspace-id"];
const SEARCH_SCOPE_KEYS = ["semantic", "fulltext"];
const DEFAULT_SEARCH_SCOPES = ["semantic", "fulltext"];

const PIPELINE_STEP_SETTING_KEYS = {
  ocr: "index-ocr-enabled",
  fulltext: "index-fulltext-enabled",
  semantic: "index-semantic-enabled",
  storage: "index-storage-enabled",
  link: "index-links-enabled",
  "workspace-id": "index-workspace-id-enabled"
};

const LAYER_POLICY_MAP = {
  ocr: "ocr",
  fulltext: "fulltext",
  semantic: "semantic",
  storage: "storage",
  link: "link",
  "workspace-id": "workspaceId"
};

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function normalizePathPrefix(value) {
  return String(value || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}

function normalizeExcludePattern(value) {
  let pattern = String(value || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .trim();
  if (!pattern) return "";
  if (!pattern.endsWith("/") && !pattern.includes("*")) pattern = `${pattern}/`;
  return pattern;
}

function parseListSetting(value, fallback = []) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }
  const raw = String(value ?? "").trim();
  if (!raw) return [...fallback];
  return raw
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseIndexFileExtensions(settings = {}) {
  const normalized = normalizePlatformAgentSettings(settings);
  const parsed = parseListSetting(normalized["index-file-extensions"], DEFAULT_INDEX_FILE_EXTENSIONS);
  const extensions = parsed
    .map((item) => {
      const lower = String(item || "").trim().toLowerCase();
      if (!lower) return "";
      return lower.startsWith(".") ? lower : `.${lower}`;
    })
    .filter(Boolean);
  return extensions.length ? [...new Set(extensions)] : [...DEFAULT_INDEX_FILE_EXTENSIONS];
}

function parseIndexPathPrefixes(settings = {}) {
  return parseListSetting(normalizePlatformAgentSettings(settings)["index-path-prefixes"], []).map(
    normalizePathPrefix
  );
}

function parseExcludeRuleLine(raw) {
  const parts = String(raw || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return null;
  const pattern = normalizeExcludePattern(parts[0]);
  if (!pattern) return null;
  const allow = parts
    .filter((part) => part.startsWith("!"))
    .map((part) => part.slice(1).toLowerCase())
    .filter(Boolean);
  return { pattern, allow, raw: String(raw || "").trim() };
}

function parseIndexExcludeRules(settings = {}) {
  return parseListSetting(
    normalizePlatformAgentSettings(settings)["index-exclude-patterns"],
    DEFAULT_INDEX_EXCLUDE_LINES
  )
    .map(parseExcludeRuleLine)
    .filter(Boolean);
}

function parseIndexExcludePatterns(settings = {}) {
  return parseIndexExcludeRules(settings).map((rule) => rule.raw);
}

function matchesExcludeRule(relPath, rule) {
  const normalized = String(relPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  const raw = String(rule?.pattern || "").trim();
  if (!raw) return false;

  let matched = false;
  if (raw.includes("*")) {
    const escaped = raw.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
    matched = new RegExp(`^${escaped}$`).test(normalized);
  } else {
    const prefix = raw.replace(/\/$/, "");
    matched = normalized === prefix || normalized.startsWith(`${prefix}/`);
  }
  if (!matched) return false;

  const allow = Array.isArray(rule.allow) ? rule.allow : [];
  if (!allow.length) return true;
  const base = path.basename(normalized).toLowerCase();
  return !allow.includes(base);
}

function isPathExcluded(relPath, rules = parseIndexExcludeRules()) {
  const normalized = String(relPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized) return false;
  for (const rule of rules) {
    if (matchesExcludeRule(normalized, rule)) return true;
  }
  return false;
}

function matchesIndexFileExtension(relPath, extensions = DEFAULT_INDEX_FILE_EXTENSIONS) {
  const base = String(path.basename(relPath || "")).toLowerCase();
  if (!base) return false;
  if (base === ".env" || base === ".gitignore") {
    return extensions.includes(".env") || extensions.includes(".gitignore");
  }
  const sorted = [...extensions].sort((a, b) => b.length - a.length);
  return sorted.some((ext) => base.endsWith(ext));
}

function matchesIndexPathPrefix(relPath, prefixes = []) {
  if (!prefixes.length) return true;
  const normalized = String(relPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  return prefixes.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`));
}

function parseSearchDefaultScopes(settings = {}) {
  const parsed = parseListSetting(
    normalizePlatformAgentSettings(settings)["search-default-scopes"],
    DEFAULT_SEARCH_SCOPES
  )
    .map((item) => String(item || "").trim().toLowerCase())
    .filter((item) => SEARCH_SCOPE_KEYS.includes(item));
  return parsed.length ? [...new Set(parsed)] : [...DEFAULT_SEARCH_SCOPES];
}

function getPlatformSearchTuning(settings = {}) {
  const normalized = normalizePlatformAgentSettings(settings);
  return {
    semanticChunkMaxLen: clampNumber(normalized["search-semantic-chunk-size"], 400, 2400, 900),
    semanticChunkOverlap: clampNumber(normalized["search-semantic-chunk-overlap"], 0, 400, 100),
    hybridSemanticWeight:
      clampNumber(normalized["search-hybrid-semantic-weight"], 0, 100, 60) / 100,
    hybridFulltextWeight:
      clampNumber(normalized["search-hybrid-fulltext-weight"], 0, 100, 40) / 100
  };
}

function resolveSearchScopes(settings = {}, requestedScopes = null) {
  const base =
    Array.isArray(requestedScopes) && requestedScopes.length
      ? requestedScopes.map((item) => String(item || "").trim().toLowerCase()).filter(Boolean)
      : parseSearchDefaultScopes(settings);
  const enabled = base.filter((scope) => {
    if (scope === "semantic") return isPlatformPipelineStepEnabled(settings, "semantic");
    if (scope === "fulltext") return isPlatformPipelineStepEnabled(settings, "fulltext");
    return SEARCH_SCOPE_KEYS.includes(scope);
  });
  return enabled.length ? enabled : [];
}

function normalizeOcrLangToken(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "");
}

function parseOcrLangs(settings = {}, fallback = DEFAULT_OCR_LANGS) {
  const raw = String(normalizePlatformAgentSettings(settings)["indexing-ocr-langs"] || "").trim();
  if (!raw) return fallback;
  const parts = raw.split("+").map(normalizeOcrLangToken).filter(Boolean);
  return parts.length ? parts.join("+") : fallback;
}

function resolveOcrLangs(settings = {}, payload = {}) {
  const override = String(payload?.langs || "").trim();
  if (override) return parseOcrLangs({ "indexing-ocr-langs": override });
  return parseOcrLangs(settings);
}

function getPlatformIndexStorageMode(settings = {}) {
  const mode = String(normalizePlatformAgentSettings(settings)["index-storage-mode"] || "quick")
    .trim()
    .toLowerCase();
  return mode === "full" ? "full" : "quick";
}

function isPlatformPipelineStepEnabled(settings = {}, step = "") {
  const key = PIPELINE_STEP_SETTING_KEYS[String(step || "").trim()];
  if (!key) return false;
  return Boolean(normalizePlatformAgentSettings(settings)[key]);
}

function buildIndexPolicy(settings = {}) {
  const extensions = parseIndexFileExtensions(settings);
  const prefixes = parseIndexPathPrefixes(settings);
  const excludeRules = parseIndexExcludeRules(settings);
  const excludePatterns = excludeRules.map((rule) => rule.raw);
  const storageMode = getPlatformIndexStorageMode(settings);
  const searchTuning = getPlatformSearchTuning(settings);
  const steps = {};
  for (const step of PIPELINE_STEP_KEYS) {
    steps[step] = isPlatformPipelineStepEnabled(settings, step);
  }
  return {
    extensions,
    prefixes,
    excludePatterns,
    excludeRules,
    storageMode,
    searchTuning,
    ocrLangs: parseOcrLangs(settings),
    steps,
    isIndexable(relPath) {
      if (isPathExcluded(relPath, excludeRules)) return false;
      if (!matchesIndexPathPrefix(relPath, prefixes)) return false;
      return matchesIndexFileExtension(relPath, extensions);
    }
  };
}

function resolvePipelineSteps(settings = {}, payload = {}) {
  const policy = buildIndexPolicy(settings);
  const overrides = payload?.steps && typeof payload.steps === "object" ? payload.steps : {};
  const resolved = {};
  for (const step of PIPELINE_STEP_KEYS) {
    if (Object.prototype.hasOwnProperty.call(overrides, step)) {
      resolved[step] = Boolean(overrides[step]);
    } else {
      resolved[step] = policy.steps[step];
    }
  }
  return {
    ...resolved,
    storageMode:
      String(payload?.storageMode || payload?.mode || policy.storageMode || "quick").toLowerCase() ===
      "full"
        ? "full"
        : "quick"
  };
}

function getIndexPolicyPayload(settings = {}) {
  const policy = buildIndexPolicy(settings);
  const defaultScopes = parseSearchDefaultScopes(settings);
  const enabledSearchScopes = resolveSearchScopes(settings, defaultScopes);
  const layerPolicy = {};
  for (const [step, layerKey] of Object.entries(LAYER_POLICY_MAP)) {
    layerPolicy[layerKey] = {
      enabled: Boolean(policy.steps[step]),
      step
    };
  }
  return {
    extensions: policy.extensions,
    extensionOptions: INDEX_FILE_EXTENSION_OPTIONS,
    pathPrefixOptions: INDEX_PATH_PREFIX_OPTIONS,
    prefixes: policy.prefixes,
    excludePatterns: policy.excludePatterns,
    storageMode: policy.storageMode,
    searchTuning: policy.searchTuning,
    ocrLangs: policy.ocrLangs,
    steps: policy.steps,
    layers: {
      semantic: policy.steps.semantic,
      fulltext: policy.steps.fulltext,
      storage: policy.steps.storage,
      link: policy.steps.link,
      ocr: policy.steps.ocr,
      workspaceId: policy.steps["workspace-id"]
    },
    layerPolicy,
    search: {
      defaultScopes,
      enabledScopes: enabledSearchScopes,
      scopeOptions: SEARCH_SCOPE_OPTIONS,
      layers: {
        semantic: { enabled: policy.steps.semantic, label: "Смысл" },
        fulltext: { enabled: policy.steps.fulltext, label: "Слова" },
        storage: { enabled: policy.steps.storage, label: "Поля" },
        link: { enabled: policy.steps.link, label: "Связи" }
      }
    }
  };
}

module.exports = {
  DEFAULT_INDEX_FILE_EXTENSIONS,
  DEFAULT_INDEX_EXCLUDE_LINES,
  INDEX_FILE_EXTENSION_OPTIONS,
  INDEX_PATH_PREFIX_OPTIONS,
  SEARCH_SCOPE_OPTIONS,
  INDEXING_POLICY_SETTING_KEYS,
  PIPELINE_STEP_KEYS,
  SEARCH_SCOPE_KEYS,
  DEFAULT_SEARCH_SCOPES,
  LAYER_POLICY_MAP,
  parseSearchDefaultScopes,
  resolveSearchScopes,
  parseIndexFileExtensions,
  parseIndexPathPrefixes,
  parseIndexExcludePatterns,
  parseIndexExcludeRules,
  matchesExcludeRule,
  isPathExcluded,
  matchesIndexFileExtension,
  matchesIndexPathPrefix,
  DEFAULT_OCR_LANGS,
  parseOcrLangs,
  resolveOcrLangs,
  getPlatformIndexStorageMode,
  getPlatformSearchTuning,
  isPlatformPipelineStepEnabled,
  buildIndexPolicy,
  resolvePipelineSteps,
  getIndexPolicyPayload
};
