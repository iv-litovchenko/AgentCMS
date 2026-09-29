const CREATE_RECORD_PLAIN_TEXT_EXTENSIONS = new Set([
  ".txt",
  ".json",
  ".yaml",
  ".yml",
  ".toml",
  ".ini",
  ".csv",
  ".xml",
  ".html",
  ".htm",
  ".css",
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".py",
  ".sh",
  ".bash",
  ".zsh",
  ".ps1",
  ".bat",
  ".cmd",
  ".rb",
  ".go",
  ".rs",
  ".php",
  ".lua",
  ".pl",
  ".sql",
  ".env",
  ".log"
]);

function normalizeStorageRecordExtension(ext) {
  const raw = String(ext || "").trim().toLowerCase();
  if (!raw) return "";
  return raw.startsWith(".") ? raw : `.${raw}`;
}

function isPlainTextStorageRecordExtension(extension) {
  const ext = normalizeStorageRecordExtension(extension);
  return CREATE_RECORD_PLAIN_TEXT_EXTENSIONS.has(ext);
}

function isMarkdownRecordExtension(extension) {
  const ext = normalizeStorageRecordExtension(extension) || ".md";
  return ext === ".md";
}

function buildPlainTextPlaceholderContent(extension) {
  const ext = normalizeStorageRecordExtension(extension);
  const starters = {
    ".json": "{}\n",
    ".xml": '<?xml version="1.0" encoding="UTF-8"?>\n',
    ".html":
      '<!DOCTYPE html>\n<html lang="ru">\n<head>\n  <meta charset="UTF-8">\n  <title></title>\n</head>\n<body>\n\n</body>\n</html>\n',
    ".htm":
      '<!DOCTYPE html>\n<html lang="ru">\n<head>\n  <meta charset="UTF-8">\n  <title></title>\n</head>\n<body>\n\n</body>\n</html>\n',
    ".py": "#!/usr/bin/env python3\n\n",
    ".sh": "#!/usr/bin/env bash\n\n",
    ".bash": "#!/usr/bin/env bash\n\n",
    ".zsh": "#!/usr/bin/env zsh\n\n",
    ".ps1": "# PowerShell script\n\n",
    ".rb": "# Ruby script\n\n",
    ".go": "package main\n\nfunc main() {\n}\n",
    ".rs": "fn main() {\n}\n",
    ".php": "<?php\n\n",
    ".lua": "-- Lua script\n\n",
    ".pl": "#!/usr/bin/env perl\n\n",
    ".sql": "-- SQL script\n\n"
  };
  return starters[ext] ?? "";
}

function recordFileNameForId(id, fileExtension) {
  const normalized = normalizeStorageRecordExtension(fileExtension);
  if (normalized && isPlainTextStorageRecordExtension(normalized)) {
    return `${id}${normalized}`;
  }
  return `${id}.md`;
}

module.exports = {
  CREATE_RECORD_PLAIN_TEXT_EXTENSIONS,
  normalizeStorageRecordExtension,
  isPlainTextStorageRecordExtension,
  isMarkdownRecordExtension,
  buildPlainTextPlaceholderContent,
  recordFileNameForId
};
