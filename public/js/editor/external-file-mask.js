(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.ExternalFileMask = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const AWN_MASK_FILE_KEY = "awn-mask-file";
  const ID_INCREMENT_FILENAME = "id-increment.txt";
  const AWN_MASK_FILE_PLACEHOLDER = "{YYYY}, {YY}, {MM}, {DD}, {WW}, {id}";

  const AWN_MASK_FILE_FIELD_DEF = {
    type: "awn.string",
    name: "Маска файла",
    title: "awn-mask file",
    description: "Счётчик {id} хранится в main/id-increment.txt.",
    format: AWN_MASK_FILE_PLACEHOLDER,
    locked: true,
    default: ""
  };

  function pad2(value) {
    return String(value).padStart(2, "0");
  }

  function getIsoWeekNumber(date) {
    const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = target.getUTCDay() || 7;
    target.setUTCDate(target.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
    return Math.ceil(((target - yearStart) / 86400000 + 1) / 7);
  }

  function resolveFileMask(mask, { id = 1, date = new Date() } = {}) {
    const safeId = Number.isFinite(Number(id)) ? Math.max(1, Math.floor(Number(id))) : 1;
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const week = getIsoWeekNumber(date);
    return String(mask || "")
      .replace(/\{YYYY\}/gi, String(year))
      .replace(/\{YY\}/gi, String(year).slice(-2))
      .replace(/\{MM\}/gi, pad2(month))
      .replace(/\{DD\}/gi, pad2(day))
      .replace(/\{WW\}/gi, pad2(week))
      .replace(/\{id\}/gi, String(safeId));
  }

  function normalizeMaskValue(raw) {
    if (Array.isArray(raw)) {
      const first = raw.map((item) => String(item ?? "").trim()).find(Boolean);
      return first || "";
    }
    return String(raw ?? "").trim();
  }

  function maskUsesId(mask) {
    return /\{id\}/i.test(String(mask || ""));
  }

  function ensureMarkdownExtension(relativePath) {
    const trimmed = String(relativePath || "").trim().replace(/\\/g, "/");
    if (!trimmed) return "";
    return /\.md$/i.test(trimmed) ? trimmed : `${trimmed}.md`;
  }

  function sanitizeMaskRelativePath(relativePath) {
    const normalized = ensureMarkdownExtension(relativePath)
      .replace(/\\/g, "/")
      .replace(/^\/+/, "")
      .split("/")
      .map((part) => part.trim())
      .filter((part) => part && part !== "." && part !== "..")
      .join("/");
    return normalized;
  }

  function displayNameFromMaskPath(relativePath) {
    const normalized = sanitizeMaskRelativePath(relativePath);
    if (!normalized) return "Запись";
    const base = normalized.split("/").pop() || normalized;
    return base.replace(/\.md$/i, "") || "Запись";
  }

  function mergeBuiltinSettingsSchemaFields(fields = {}) {
    return {
      [AWN_MASK_FILE_KEY]: { ...AWN_MASK_FILE_FIELD_DEF },
      ...(fields && typeof fields === "object" ? fields : {})
    };
  }

  function isBuiltinSettingsSchemaKey(key) {
    return String(key || "").trim() === AWN_MASK_FILE_KEY;
  }

  function stripBuiltinSettingsSchemaFields(fields = {}) {
    const next = { ...(fields && typeof fields === "object" ? fields : {}) };
    delete next[AWN_MASK_FILE_KEY];
    return next;
  }

  function extractAwnMaskFileValue(awnSettings) {
    if (!awnSettings || typeof awnSettings !== "object") return "";
    return normalizeMaskValue(awnSettings[AWN_MASK_FILE_KEY]);
  }

  return {
    AWN_MASK_FILE_KEY,
    ID_INCREMENT_FILENAME,
    AWN_MASK_FILE_PLACEHOLDER,
    AWN_MASK_FILE_FIELD_DEF,
    resolveFileMask,
    normalizeMaskValue,
    maskUsesId,
    ensureMarkdownExtension,
    sanitizeMaskRelativePath,
    displayNameFromMaskPath,
    mergeBuiltinSettingsSchemaFields,
    isBuiltinSettingsSchemaKey,
    stripBuiltinSettingsSchemaFields,
    extractAwnMaskFileValue
  };
});
