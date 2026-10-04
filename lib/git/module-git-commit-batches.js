const { normalizeGitExtensions, MODULE_GIT_DEFAULT_EXTENSIONS } = require("./workspace-git-module");
const {
  formatModuleGitCommitMessageTemplate,
  MODULE_GIT_COMMIT_MESSAGE_TEMPLATE_DEFAULT
} = require("./module-git-config");
const {
  readIntegrationsSettingsFile,
  parseSettingsFileContent
} = require("../config/settings-store");
const { normalizeIntegrationsAgentSettings } = require("../workspace/workspace-agent-settings");
const { parseBatchMaxFileSizeMb } = require("./module-git-commit-limits");

const MODULE_GIT_COMMIT_BATCHES_KEY = "module-git-commit-batches";

const MODULE_GIT_COMMIT_BATCH_KEYS = {
  batches: MODULE_GIT_COMMIT_BATCHES_KEY,
  batchOrder: "module-git-commit-batch-order",
  contentExtensions: "module-git-commit-extensions-content",
  systemExtensions: "module-git-commit-extensions-system",
  imagesExtensions: "module-git-commit-extensions-images",
  contentTemplate: "module-git-commit-message-template-content",
  systemTemplate: "module-git-commit-message-template-system",
  imagesTemplate: "module-git-commit-message-template-images",
  legacyExtensions: "module-git-commit-extensions",
  legacyTemplate: "module-git-commit-message-template",
  legacyContentImagesExtensions: "module-git-commit-extensions-content-images",
  legacySystemImagesExtensions: "module-git-commit-extensions-system-images",
  legacyContentImagesTemplate: "module-git-commit-message-template-content-images",
  legacySystemImagesTemplate: "module-git-commit-message-template-system-images"
};

const MODULE_GIT_RECORDS_EXTENSIONS_DEFAULT = ["md", "mdx", "csv", "txt"];

const MODULE_GIT_LINE_DELIMITED_JSON_EXTENSIONS = ["jsonl", "ndjson"];

const MODULE_GIT_RECORDS_HISTORY_EXTENSIONS_DEFAULT = ["mdback"];

const MODULE_GIT_IMAGE_EXTENSIONS_DEFAULT = [
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "svg",
  "avif",
  "heic",
  "heif",
  "jfif",
  "apng",
  "ico",
  "bmp",
  "tif",
  "tiff"
];

const MODULE_GIT_SOURCES_EXTENSIONS_DEFAULT = [
  "html",
  "htm",
  "css",
  "scss",
  "js",
  "mjs",
  "ts",
  "sh",
  "xml",
  "py",
  "pyi",
  "rb",
  "go",
  "rs",
  "sql"
];

const MODULE_GIT_DOCUMENTS_EXTENSIONS_DEFAULT = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx"];

const MODULE_GIT_MEDIA_EXTENSIONS_DEFAULT = [
  "mp4",
  "mp3",
  "webm",
  "wav",
  "ogg",
  "m4a",
  "aac",
  "flac",
  "mov",
  "mkv",
  "avi"
];

const MODULE_GIT_ARCHIVES_EXTENSIONS_DEFAULT = ["zip", "tar", "gz", "tgz", "bz2", "xz", "7z"];

const MODULE_GIT_OTHER_EXTENSIONS_DEFAULT = ["wasm", "woff", "woff2"];

const MODULE_GIT_CONFIGS_EXTENSIONS_DEFAULT = [
  "yml",
  "yaml",
  "json",
  "jsonl",
  "ndjson",
  "toml",
  "ini",
  "cfg",
  "properties",
  "lock"
];

const MODULE_GIT_SOURCES_EXTENSION_SET = new Set(MODULE_GIT_SOURCES_EXTENSIONS_DEFAULT);
const MODULE_GIT_DOCUMENTS_EXTENSION_SET = new Set(MODULE_GIT_DOCUMENTS_EXTENSIONS_DEFAULT);
const MODULE_GIT_MEDIA_EXTENSION_SET = new Set(MODULE_GIT_MEDIA_EXTENSIONS_DEFAULT);
const MODULE_GIT_ARCHIVES_EXTENSION_SET = new Set(MODULE_GIT_ARCHIVES_EXTENSIONS_DEFAULT);
const MODULE_GIT_OTHER_EXTENSION_SET = new Set(MODULE_GIT_OTHER_EXTENSIONS_DEFAULT);
const MODULE_GIT_CONFIGS_EXTENSION_SET = new Set(MODULE_GIT_CONFIGS_EXTENSIONS_DEFAULT);
const MODULE_GIT_RECORDS_EXTENSION_SET = new Set(MODULE_GIT_RECORDS_EXTENSIONS_DEFAULT);
const MODULE_GIT_RECORDS_HISTORY_EXTENSION_SET = new Set(MODULE_GIT_RECORDS_HISTORY_EXTENSIONS_DEFAULT);

const MODULE_GIT_COMMIT_TEMPLATE_RECORDS_DEFAULT =
  "[{branch}] Сохранение workspace ({date} {time}) - Records";
const MODULE_GIT_COMMIT_TEMPLATE_RECORDS_HISTORY_DEFAULT =
  "[{branch}] Сохранение workspace ({date} {time}) - Records history";
const MODULE_GIT_COMMIT_TEMPLATE_IMAGES_DEFAULT =
  "[{branch}] Сохранение workspace ({date} {time}) - Images";
const MODULE_GIT_COMMIT_TEMPLATE_SOURCES_DEFAULT =
  "[{branch}] Сохранение workspace ({date} {time}) - Sources";
const MODULE_GIT_COMMIT_TEMPLATE_DOCUMENTS_DEFAULT =
  "[{branch}] Сохранение workspace ({date} {time}) - Documents";
const MODULE_GIT_COMMIT_TEMPLATE_MEDIA_DEFAULT =
  "[{branch}] Сохранение workspace ({date} {time}) - Media";
const MODULE_GIT_COMMIT_TEMPLATE_ARCHIVES_DEFAULT =
  "[{branch}] Сохранение workspace ({date} {time}) - Archives";
const MODULE_GIT_COMMIT_TEMPLATE_OTHER_DEFAULT =
  "[{branch}] Сохранение workspace ({date} {time}) - Other";
const MODULE_GIT_COMMIT_TEMPLATE_CONFIGS_DEFAULT =
  "[{branch}] Сохранение workspace ({date} {time}) - Configs";

const MODULE_GIT_COMMIT_BATCHES_DEFAULT = [
  {
    id: "records",
    label: "Записи (контент)",
    extensions: extensionsTextFromList(MODULE_GIT_RECORDS_EXTENSIONS_DEFAULT),
    messageTemplate: MODULE_GIT_COMMIT_TEMPLATE_RECORDS_DEFAULT,
    maxFileSizeMb: 1
  },
  {
    id: "records-history",
    label: "Записи (контент) — история",
    extensions: extensionsTextFromList(MODULE_GIT_RECORDS_HISTORY_EXTENSIONS_DEFAULT),
    messageTemplate: MODULE_GIT_COMMIT_TEMPLATE_RECORDS_HISTORY_DEFAULT,
    maxFileSizeMb: 1
  },
  {
    id: "images",
    label: "Изображения (контент)",
    extensions: extensionsTextFromList(MODULE_GIT_IMAGE_EXTENSIONS_DEFAULT),
    messageTemplate: MODULE_GIT_COMMIT_TEMPLATE_IMAGES_DEFAULT,
    maxFileSizeMb: 5
  },
  {
    id: "sources",
    label: "Исходник (код)",
    extensions: extensionsTextFromList(MODULE_GIT_SOURCES_EXTENSIONS_DEFAULT),
    messageTemplate: MODULE_GIT_COMMIT_TEMPLATE_SOURCES_DEFAULT,
    maxFileSizeMb: 5
  },
  {
    id: "documents",
    label: "Документы",
    extensions: extensionsTextFromList(MODULE_GIT_DOCUMENTS_EXTENSIONS_DEFAULT),
    messageTemplate: MODULE_GIT_COMMIT_TEMPLATE_DOCUMENTS_DEFAULT,
    maxFileSizeMb: 5
  },
  {
    id: "media",
    label: "Медиа",
    extensions: extensionsTextFromList(MODULE_GIT_MEDIA_EXTENSIONS_DEFAULT),
    messageTemplate: MODULE_GIT_COMMIT_TEMPLATE_MEDIA_DEFAULT,
    maxFileSizeMb: 5
  },
  {
    id: "archives",
    label: "Архивы",
    extensions: extensionsTextFromList(MODULE_GIT_ARCHIVES_EXTENSIONS_DEFAULT),
    messageTemplate: MODULE_GIT_COMMIT_TEMPLATE_ARCHIVES_DEFAULT,
    maxFileSizeMb: 5
  },
  {
    id: "other",
    label: "Прочее",
    extensions: extensionsTextFromList(MODULE_GIT_OTHER_EXTENSIONS_DEFAULT),
    messageTemplate: MODULE_GIT_COMMIT_TEMPLATE_OTHER_DEFAULT,
    maxFileSizeMb: 5
  },
  {
    id: "configs",
    label: "Конфиги, настройки (служебное)",
    extensions: extensionsTextFromList(MODULE_GIT_CONFIGS_EXTENSIONS_DEFAULT),
    messageTemplate: MODULE_GIT_COMMIT_TEMPLATE_CONFIGS_DEFAULT,
    maxFileSizeMb: 1
  }
];

/** @deprecated */
const MODULE_GIT_CONTENT_EXTENSIONS_DEFAULT = [...MODULE_GIT_RECORDS_EXTENSIONS_DEFAULT];
/** @deprecated */
const MODULE_GIT_SYSTEM_EXTENSIONS_DEFAULT = MODULE_GIT_DEFAULT_EXTENSIONS.filter(
  (ext) => !MODULE_GIT_RECORDS_EXTENSION_SET.has(ext)
);
/** @deprecated */
const MODULE_GIT_COMMIT_TEMPLATE_CONTENT_DEFAULT = MODULE_GIT_COMMIT_TEMPLATE_RECORDS_DEFAULT;
/** @deprecated */
const MODULE_GIT_COMMIT_TEMPLATE_SYSTEM_DEFAULT = MODULE_GIT_COMMIT_TEMPLATE_CONFIGS_DEFAULT;

function extensionsTextFromList(list) {
  return (Array.isArray(list) ? list : [])
    .map((entry) => String(entry || "").trim().toLowerCase().replace(/^\./, ""))
    .filter(Boolean)
    .join("\n");
}

function parseExtensionsSettingValue(value, fallbackList) {
  return normalizeGitExtensions(
    value == null || String(value).trim() === "" ? extensionsTextFromList(fallbackList) : value
  );
}

function splitLegacyExtensions(legacyValue) {
  const all = parseExtensionsSettingValue(legacyValue, MODULE_GIT_DEFAULT_EXTENSIONS);
  return partitionExtensionsIntoBatches(all);
}

function migrateJsonlNdjsonExtensionsToConfigsBatch(byId) {
  if (!(byId instanceof Map)) return;
  const recordsEntry = byId.get("records");
  if (!recordsEntry) return;
  const recordExts = parseExtensionsSettingValue(recordsEntry.extensions, MODULE_GIT_RECORDS_EXTENSIONS_DEFAULT);
  const toMove = MODULE_GIT_LINE_DELIMITED_JSON_EXTENSIONS.filter((ext) => recordExts.includes(ext));
  if (!toMove.length) return;
  const recordsWithout = recordExts.filter((ext) => !MODULE_GIT_LINE_DELIMITED_JSON_EXTENSIONS.includes(ext));
  byId.set("records", {
    ...recordsEntry,
    extensions: extensionsTextFromList(
      recordsWithout.length ? recordsWithout : MODULE_GIT_RECORDS_EXTENSIONS_DEFAULT
    )
  });
  const configsEntry = byId.get("configs") || {};
  const configExts = parseExtensionsSettingValue(
    configsEntry.extensions,
    MODULE_GIT_CONFIGS_EXTENSIONS_DEFAULT
  );
  for (const ext of MODULE_GIT_LINE_DELIMITED_JSON_EXTENSIONS) {
    if (!configExts.includes(ext)) configExts.push(ext);
  }
  byId.set("configs", {
    ...configsEntry,
    id: "configs",
    label: configsEntry.label || "Конфиги, настройки (служебное)",
    extensions: extensionsTextFromList(configExts),
    messageTemplate:
      configsEntry.messageTemplate || MODULE_GIT_COMMIT_TEMPLATE_CONFIGS_DEFAULT,
    maxFileSizeMb: configsEntry.maxFileSizeMb ?? 1
  });
}

function migrateMdbackExtensionsBetweenRecordBatches(byId) {
  if (!(byId instanceof Map)) return;
  const recordsEntry = byId.get("records");
  if (!recordsEntry) return;
  const recordExts = parseExtensionsSettingValue(recordsEntry.extensions, MODULE_GIT_RECORDS_EXTENSIONS_DEFAULT);
  if (!recordExts.includes("mdback")) return;
  const recordsWithout = recordExts.filter((ext) => ext !== "mdback");
  byId.set("records", {
    ...recordsEntry,
    extensions: extensionsTextFromList(
      recordsWithout.length ? recordsWithout : MODULE_GIT_RECORDS_EXTENSIONS_DEFAULT
    )
  });
  const historyEntry = byId.get("records-history") || {};
  const historyExts = parseExtensionsSettingValue(
    historyEntry.extensions,
    MODULE_GIT_RECORDS_HISTORY_EXTENSIONS_DEFAULT
  );
  if (!historyExts.includes("mdback")) {
    historyExts.push("mdback");
  }
  byId.set("records-history", {
    ...historyEntry,
    id: "records-history",
    label: historyEntry.label || "Записи (контент) — история",
    extensions: extensionsTextFromList(historyExts),
    messageTemplate:
      historyEntry.messageTemplate || MODULE_GIT_COMMIT_TEMPLATE_RECORDS_HISTORY_DEFAULT,
    maxFileSizeMb: historyEntry.maxFileSizeMb ?? 1
  });
}

function partitionExtensionsIntoBatches(list) {
  const parsed = parseExtensionsSettingValue(list, []);
  const buckets = {
    records: [],
    recordsHistory: [],
    images: [],
    sources: [],
    documents: [],
    media: [],
    archives: [],
    other: [],
    configs: []
  };
  for (const ext of parsed) {
    if (MODULE_GIT_RECORDS_HISTORY_EXTENSION_SET.has(ext)) buckets.recordsHistory.push(ext);
    else if (MODULE_GIT_RECORDS_EXTENSION_SET.has(ext)) buckets.records.push(ext);
    else if (MODULE_GIT_IMAGE_EXTENSIONS_DEFAULT.includes(ext)) buckets.images.push(ext);
    else if (MODULE_GIT_CONFIGS_EXTENSION_SET.has(ext)) buckets.configs.push(ext);
    else if (MODULE_GIT_DOCUMENTS_EXTENSION_SET.has(ext)) buckets.documents.push(ext);
    else if (MODULE_GIT_MEDIA_EXTENSION_SET.has(ext)) buckets.media.push(ext);
    else if (MODULE_GIT_ARCHIVES_EXTENSION_SET.has(ext)) buckets.archives.push(ext);
    else if (MODULE_GIT_OTHER_EXTENSION_SET.has(ext)) buckets.other.push(ext);
    else if (MODULE_GIT_SOURCES_EXTENSION_SET.has(ext)) buckets.sources.push(ext);
    else buckets.sources.push(ext);
  }
  return {
    records: buckets.records.length ? buckets.records : [...MODULE_GIT_RECORDS_EXTENSIONS_DEFAULT],
    recordsHistory: buckets.recordsHistory.length
      ? buckets.recordsHistory
      : [...MODULE_GIT_RECORDS_HISTORY_EXTENSIONS_DEFAULT],
    images: buckets.images.length ? buckets.images : [...MODULE_GIT_IMAGE_EXTENSIONS_DEFAULT],
    sources: buckets.sources.length ? buckets.sources : [...MODULE_GIT_SOURCES_EXTENSIONS_DEFAULT],
    documents: buckets.documents.length ? buckets.documents : [...MODULE_GIT_DOCUMENTS_EXTENSIONS_DEFAULT],
    media: buckets.media.length ? buckets.media : [...MODULE_GIT_MEDIA_EXTENSIONS_DEFAULT],
    archives: buckets.archives.length ? buckets.archives : [...MODULE_GIT_ARCHIVES_EXTENSIONS_DEFAULT],
    other: buckets.other.length ? buckets.other : [...MODULE_GIT_OTHER_EXTENSIONS_DEFAULT],
    configs: buckets.configs.length ? buckets.configs : [...MODULE_GIT_CONFIGS_EXTENSIONS_DEFAULT]
  };
}

function splitMergedSourceExtensions(list) {
  const parsed = parseExtensionsSettingValue(list, []);
  const buckets = {
    sources: [],
    documents: [],
    media: [],
    archives: [],
    other: []
  };
  for (const ext of parsed) {
    if (MODULE_GIT_DOCUMENTS_EXTENSION_SET.has(ext)) buckets.documents.push(ext);
    else if (MODULE_GIT_MEDIA_EXTENSION_SET.has(ext)) buckets.media.push(ext);
    else if (MODULE_GIT_ARCHIVES_EXTENSION_SET.has(ext)) buckets.archives.push(ext);
    else if (MODULE_GIT_OTHER_EXTENSION_SET.has(ext)) buckets.other.push(ext);
    else buckets.sources.push(ext);
  }
  return buckets;
}

function partitionSystemExtensions(systemExtensions) {
  const list = parseExtensionsSettingValue(systemExtensions, MODULE_GIT_SYSTEM_EXTENSIONS_DEFAULT);
  const buckets = {
    sources: [],
    documents: [],
    media: [],
    archives: [],
    other: [],
    configs: []
  };
  for (const ext of list) {
    if (MODULE_GIT_CONFIGS_EXTENSION_SET.has(ext)) buckets.configs.push(ext);
    else if (MODULE_GIT_DOCUMENTS_EXTENSION_SET.has(ext)) buckets.documents.push(ext);
    else if (MODULE_GIT_MEDIA_EXTENSION_SET.has(ext)) buckets.media.push(ext);
    else if (MODULE_GIT_ARCHIVES_EXTENSION_SET.has(ext)) buckets.archives.push(ext);
    else if (MODULE_GIT_OTHER_EXTENSION_SET.has(ext)) buckets.other.push(ext);
    else if (MODULE_GIT_SOURCES_EXTENSION_SET.has(ext)) buckets.sources.push(ext);
    else buckets.sources.push(ext);
  }
  return {
    sources: buckets.sources.length ? buckets.sources : [...MODULE_GIT_SOURCES_EXTENSIONS_DEFAULT],
    documents: buckets.documents.length ? buckets.documents : [...MODULE_GIT_DOCUMENTS_EXTENSIONS_DEFAULT],
    media: buckets.media.length ? buckets.media : [...MODULE_GIT_MEDIA_EXTENSIONS_DEFAULT],
    archives: buckets.archives.length ? buckets.archives : [...MODULE_GIT_ARCHIVES_EXTENSIONS_DEFAULT],
    other: buckets.other.length ? buckets.other : [...MODULE_GIT_OTHER_EXTENSIONS_DEFAULT],
    configs: buckets.configs.length ? buckets.configs : [...MODULE_GIT_CONFIGS_EXTENSIONS_DEFAULT]
  };
}

function buildRuntimeBatch(def, item = {}) {
  const fallbackExtensions = parseExtensionsSettingValue(def.extensions, []);
  const extensions = parseExtensionsSettingValue(item.extensions, fallbackExtensions);
  const messageTemplate =
    String(item.messageTemplate || "").trim() ||
    String(def.messageTemplate || "").trim() ||
    MODULE_GIT_COMMIT_TEMPLATE_RECORDS_DEFAULT;
  const maxFileSizeMb = parseBatchMaxFileSizeMb(item.maxFileSizeMb ?? def.maxFileSizeMb, def.id);
  return {
    id: def.id,
    label: String(item.label || def.label || def.id).trim() || def.id,
    extensions,
    messageTemplate,
    maxFileSizeMb,
    maxFileBytes: Math.round(maxFileSizeMb * 1024 * 1024)
  };
}

function batchesFromRepeaterValue(raw) {
  if (!Array.isArray(raw) || !raw.length) return null;
  const byId = new Map();
  for (const entry of raw) {
    const id = String(entry?.id || "").trim();
    if (id) byId.set(id, entry);
  }
  const sourcesEntry = byId.get("sources");
  const hasSplitBatches = ["documents", "media", "archives", "other"].some((id) => byId.has(id));
  if (sourcesEntry && !hasSplitBatches) {
    const part = splitMergedSourceExtensions(sourcesEntry.extensions);
    byId.set("sources", {
      ...sourcesEntry,
      extensions: extensionsTextFromList(
        part.sources.length ? part.sources : [...MODULE_GIT_SOURCES_EXTENSIONS_DEFAULT]
      )
    });
    byId.set("documents", {
      id: "documents",
      extensions: extensionsTextFromList(
        part.documents.length ? part.documents : [...MODULE_GIT_DOCUMENTS_EXTENSIONS_DEFAULT]
      )
    });
    byId.set("media", {
      id: "media",
      extensions: extensionsTextFromList(
        part.media.length ? part.media : [...MODULE_GIT_MEDIA_EXTENSIONS_DEFAULT]
      )
    });
    byId.set("archives", {
      id: "archives",
      extensions: extensionsTextFromList(
        part.archives.length ? part.archives : [...MODULE_GIT_ARCHIVES_EXTENSIONS_DEFAULT]
      )
    });
    byId.set("other", {
      id: "other",
      extensions: extensionsTextFromList(
        part.other.length ? part.other : [...MODULE_GIT_OTHER_EXTENSIONS_DEFAULT]
      )
    });
  }
  migrateJsonlNdjsonExtensionsToConfigsBatch(byId);
  migrateMdbackExtensionsBetweenRecordBatches(byId);
  return MODULE_GIT_COMMIT_BATCHES_DEFAULT.map((def) => {
    const item = byId.get(def.id) || {};
    return buildRuntimeBatch(def, item);
  });
}

function batchesFromLegacyFlatSettings(normalized) {
  const legacyExtensions = normalized[MODULE_GIT_COMMIT_BATCH_KEYS.legacyExtensions];
  const hasContentKey =
    String(normalized[MODULE_GIT_COMMIT_BATCH_KEYS.contentExtensions] || "").trim() !== "";
  const hasSystemKey =
    String(normalized[MODULE_GIT_COMMIT_BATCH_KEYS.systemExtensions] || "").trim() !== "";

  let recordsExtensions;
  let recordsHistoryExtensions = [...MODULE_GIT_RECORDS_HISTORY_EXTENSIONS_DEFAULT];
  let systemExtensions;
  if (hasContentKey || hasSystemKey) {
    const parsedRecords = parseExtensionsSettingValue(
      normalized[MODULE_GIT_COMMIT_BATCH_KEYS.contentExtensions],
      MODULE_GIT_RECORDS_EXTENSIONS_DEFAULT
    );
    if (parsedRecords.includes("mdback")) {
      recordsHistoryExtensions = ["mdback"];
    }
    recordsExtensions = parsedRecords.filter(
      (ext) => ext !== "mdback" && !MODULE_GIT_LINE_DELIMITED_JSON_EXTENSIONS.includes(ext)
    );
    systemExtensions = parseExtensionsSettingValue(
      normalized[MODULE_GIT_COMMIT_BATCH_KEYS.systemExtensions],
      MODULE_GIT_SYSTEM_EXTENSIONS_DEFAULT
    );
  } else if (String(legacyExtensions || "").trim()) {
    const split = splitLegacyExtensions(legacyExtensions);
    recordsExtensions = split.records;
    recordsHistoryExtensions = split.recordsHistory;
    systemExtensions = [
      ...split.sources,
      ...split.documents,
      ...split.media,
      ...split.archives,
      ...split.other,
      ...split.configs,
      ...split.images
    ];
  } else {
    recordsExtensions = [...MODULE_GIT_RECORDS_EXTENSIONS_DEFAULT];
    systemExtensions = [...MODULE_GIT_SYSTEM_EXTENSIONS_DEFAULT];
  }

  let { sources, documents, media, archives, other, configs } =
    partitionSystemExtensions(systemExtensions);
  for (const ext of MODULE_GIT_LINE_DELIMITED_JSON_EXTENSIONS) {
    if (!configs.includes(ext)) configs.push(ext);
  }
  recordsExtensions = recordsExtensions.filter(
    (ext) => !MODULE_GIT_LINE_DELIMITED_JSON_EXTENSIONS.includes(ext)
  );

  let imagesExtensions = parseExtensionsSettingValue(
    normalized[MODULE_GIT_COMMIT_BATCH_KEYS.imagesExtensions],
    MODULE_GIT_IMAGE_EXTENSIONS_DEFAULT
  );
  const legacyContent = String(
    normalized[MODULE_GIT_COMMIT_BATCH_KEYS.legacyContentImagesExtensions] || ""
  ).trim();
  const legacySystem = String(
    normalized[MODULE_GIT_COMMIT_BATCH_KEYS.legacySystemImagesExtensions] || ""
  ).trim();
  if (legacyContent || legacySystem) {
    imagesExtensions = [
      ...new Set([
        ...imagesExtensions,
        ...parseExtensionsSettingValue(legacyContent, []),
        ...parseExtensionsSettingValue(legacySystem, [])
      ])
    ];
  }
  if (!imagesExtensions.length) {
    imagesExtensions = [...MODULE_GIT_IMAGE_EXTENSIONS_DEFAULT];
  }

  const legacyTemplate = String(normalized[MODULE_GIT_COMMIT_BATCH_KEYS.legacyTemplate] || "").trim();
  const recordsTemplate =
    String(normalized[MODULE_GIT_COMMIT_BATCH_KEYS.contentTemplate] || "").trim() ||
    (legacyTemplate ? `${legacyTemplate} - Records` : MODULE_GIT_COMMIT_TEMPLATE_RECORDS_DEFAULT);
  const configsTemplate =
    String(normalized[MODULE_GIT_COMMIT_BATCH_KEYS.systemTemplate] || "").trim() ||
    (legacyTemplate ? `${legacyTemplate} - Configs` : MODULE_GIT_COMMIT_TEMPLATE_CONFIGS_DEFAULT);
  const imagesTemplate =
    String(normalized[MODULE_GIT_COMMIT_BATCH_KEYS.imagesTemplate] || "").trim() ||
    String(normalized[MODULE_GIT_COMMIT_BATCH_KEYS.legacyContentImagesTemplate] || "").trim() ||
    String(normalized[MODULE_GIT_COMMIT_BATCH_KEYS.legacySystemImagesTemplate] || "").trim() ||
    MODULE_GIT_COMMIT_TEMPLATE_IMAGES_DEFAULT;

  const batchExtensionsById = {
    records: recordsExtensions,
    "records-history": recordsHistoryExtensions,
    images: imagesExtensions,
    sources,
    documents,
    media,
    archives,
    other,
    configs
  };

  const batchTemplatesById = {
    records: recordsTemplate,
    "records-history": MODULE_GIT_COMMIT_TEMPLATE_RECORDS_HISTORY_DEFAULT,
    images: imagesTemplate,
    configs: configsTemplate
  };

  return MODULE_GIT_COMMIT_BATCHES_DEFAULT.map((def) =>
    buildRuntimeBatch(def, {
      extensions: extensionsTextFromList(batchExtensionsById[def.id] || []),
      messageTemplate: batchTemplatesById[def.id]
    })
  );
}

function pickCommitBatchesFromSettings(awnSettings = {}) {
  const normalized = normalizeIntegrationsAgentSettings(awnSettings);
  const batches =
    batchesFromRepeaterValue(normalized[MODULE_GIT_COMMIT_BATCHES_KEY]) ||
    batchesFromLegacyFlatSettings(normalized);

  const unionExtensions = [...new Set(batches.flatMap((batch) => batch.extensions))];

  return {
    batchOrder: "records-first",
    batches,
    unionExtensions,
    commitBatchesRepeater: MODULE_GIT_COMMIT_BATCHES_DEFAULT.map((def, index) => ({
      id: def.id,
      label: batches[index]?.label || def.label,
      extensions: extensionsTextFromList(batches[index]?.extensions || []),
      messageTemplate: batches[index]?.messageTemplate || def.messageTemplate,
      maxFileSizeMb: batches[index]?.maxFileSizeMb ?? def.maxFileSizeMb
    }))
  };
}

function formatCommitBatchMessages(
  batches,
  { branch = "main", date = "", time = "", messageSuffix = "" } = {}
) {
  const suffix = String(messageSuffix || "").trim();
  return batches.map((batch) => {
    const prefix = formatModuleGitCommitMessageTemplate(batch.messageTemplate, { branch, date, time });
    const message = suffix ? `${prefix}\n${suffix}` : prefix;
    return {
      ...batch,
      message
    };
  });
}

async function loadModuleGitCommitBatchSettings(agentRoot) {
  if (!agentRoot) {
    return pickCommitBatchesFromSettings({});
  }
  const file = await readIntegrationsSettingsFile(agentRoot);
  const parsed = file.exists
    ? parseSettingsFileContent(file.content || "")
    : { headerComment: "", awn_settings: {} };
  return pickCommitBatchesFromSettings(parsed.awn_settings);
}

module.exports = {
  MODULE_GIT_COMMIT_BATCHES_KEY,
  MODULE_GIT_COMMIT_BATCH_KEYS,
  MODULE_GIT_COMMIT_BATCHES_DEFAULT,
  MODULE_GIT_RECORDS_EXTENSIONS_DEFAULT,
  MODULE_GIT_RECORDS_HISTORY_EXTENSIONS_DEFAULT,
  MODULE_GIT_IMAGE_EXTENSIONS_DEFAULT,
  MODULE_GIT_SOURCES_EXTENSIONS_DEFAULT,
  MODULE_GIT_DOCUMENTS_EXTENSIONS_DEFAULT,
  MODULE_GIT_MEDIA_EXTENSIONS_DEFAULT,
  MODULE_GIT_ARCHIVES_EXTENSIONS_DEFAULT,
  MODULE_GIT_OTHER_EXTENSIONS_DEFAULT,
  MODULE_GIT_CONFIGS_EXTENSIONS_DEFAULT,
  MODULE_GIT_CONTENT_EXTENSIONS_DEFAULT,
  MODULE_GIT_SYSTEM_EXTENSIONS_DEFAULT,
  MODULE_GIT_COMMIT_TEMPLATE_RECORDS_DEFAULT,
  MODULE_GIT_COMMIT_TEMPLATE_RECORDS_HISTORY_DEFAULT,
  MODULE_GIT_COMMIT_TEMPLATE_IMAGES_DEFAULT,
  MODULE_GIT_COMMIT_TEMPLATE_SOURCES_DEFAULT,
  MODULE_GIT_COMMIT_TEMPLATE_DOCUMENTS_DEFAULT,
  MODULE_GIT_COMMIT_TEMPLATE_MEDIA_DEFAULT,
  MODULE_GIT_COMMIT_TEMPLATE_ARCHIVES_DEFAULT,
  MODULE_GIT_COMMIT_TEMPLATE_OTHER_DEFAULT,
  MODULE_GIT_COMMIT_TEMPLATE_CONFIGS_DEFAULT,
  MODULE_GIT_COMMIT_TEMPLATE_CONTENT_DEFAULT,
  MODULE_GIT_COMMIT_TEMPLATE_SYSTEM_DEFAULT,
  pickCommitBatchesFromSettings,
  loadModuleGitCommitBatchSettings,
  formatCommitBatchMessages,
  extensionsTextFromList
};
