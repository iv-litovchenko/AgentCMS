const GIT_STATUS_LABELS = {
  staged: "В индексе",
  modified: "Изменено",
  untracked: "Неотслеживаемые",
  deleted: "Удалено",
  renamed: "Переименовано",
  conflict: "Конфликт"
};

function classifyGitPorcelainEntry(indexStatus, workTreeStatus) {
  if (indexStatus === "?" && workTreeStatus === "?") return "untracked";
  if (indexStatus === "U" || workTreeStatus === "U" || (indexStatus === "A" && workTreeStatus === "A")) {
    return "conflict";
  }
  if (indexStatus === "R") return "renamed";
  if (indexStatus === "D" || workTreeStatus === "D") return "deleted";
  if (indexStatus && indexStatus !== " " && indexStatus !== "?") return "staged";
  if (workTreeStatus && workTreeStatus !== " " && workTreeStatus !== "?") return "modified";
  return "modified";
}

function decodeGitPorcelainPathEscapes(value) {
  const bytes = [];
  const text = String(value || "");
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch !== "\\" || i + 1 >= text.length) {
      const code = text.charCodeAt(i);
      if (code <= 0x7f) bytes.push(code);
      else bytes.push(...Buffer.from(text[i], "utf8"));
      continue;
    }
    const next = text[i + 1];
    if (next === "n") {
      bytes.push(0x0a);
      i += 1;
      continue;
    }
    if (next === "t") {
      bytes.push(0x09);
      i += 1;
      continue;
    }
    if (next === "b") {
      bytes.push(0x08);
      i += 1;
      continue;
    }
    if (next >= "0" && next <= "7") {
      let octal = next;
      let j = i + 2;
      for (let k = 0; k < 2 && j < text.length && text[j] >= "0" && text[j] <= "7"; k += 1) {
        octal += text[j];
        j += 1;
      }
      bytes.push(parseInt(octal, 8));
      i = j - 1;
      continue;
    }
    bytes.push(text.charCodeAt(i + 1));
    i += 1;
  }
  return Buffer.from(bytes).toString("utf8");
}

function unquoteGitPorcelainPath(rawPath) {
  let value = String(rawPath || "").trim();
  if (!value.startsWith('"') || !value.endsWith('"') || value.length < 2) {
    return value;
  }
  return decodeGitPorcelainPathEscapes(value.slice(1, -1));
}

function parseGitStatusPorcelain(rawOutput) {
  const lines = String(rawOutput || "")
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean);

  let branch = "";
  let upstream = "";
  let ahead = 0;
  let behind = 0;
  const changes = [];

  for (const line of lines) {
    if (line.startsWith("##")) {
      const header = line.slice(2).trim();
      const branchMatch = header.match(/^([^.\s]+(?:\.[^.\s]+)*?)(?:\.\.\.([^ \[]+))?(?:\s+\[(.+)\])?$/);
      if (branchMatch) {
        branch = branchMatch[1] || "";
        upstream = branchMatch[2] || "";
        const flags = branchMatch[3] || "";
        const aheadMatch = flags.match(/ahead (\d+)/);
        const behindMatch = flags.match(/behind (\d+)/);
        ahead = aheadMatch ? Number(aheadMatch[1]) : 0;
        behind = behindMatch ? Number(behindMatch[1]) : 0;
      } else {
        branch = header.split("...")[0] || header;
      }
      continue;
    }

    const indexStatus = line[0] || " ";
    const workTreeStatus = line[1] || " ";
    const rawPath = line.slice(3).trim();
    if (!rawPath) continue;

    let filePath = unquoteGitPorcelainPath(rawPath);
    let oldPath = "";
    if (rawPath.includes("->")) {
      const parts = rawPath.split("->").map((part) => unquoteGitPorcelainPath(part.trim()));
      oldPath = parts[0] || "";
      filePath = parts[1] || parts[0] || "";
    }

    // Пути как в git status (на macOS часто NFD) — не нормализуем в NFC, иначе git add/stat промахиваются.
    filePath = String(filePath || "");
    oldPath = String(oldPath || "");

    const kind = classifyGitPorcelainEntry(indexStatus, workTreeStatus);
    changes.push({
      path: filePath.replace(/\\/g, "/"),
      oldPath: oldPath.replace(/\\/g, "/"),
      indexStatus,
      workTreeStatus,
      kind,
      label: GIT_STATUS_LABELS[kind] || kind
    });
  }

  return { branch, upstream, ahead, behind, changes };
}

const GIT_LOG_COMMIT_LINE_RE = /^([0-9a-f]+)\|([^|]+)\|([^|]*)\|([^|]*)\|(.*)$/;
const GIT_LOG_SHORTSTAT_FILES_RE = /(\d+)\s+files?\s+changed/i;

function parseGitLogCommitLine(line) {
  const trimmed = String(line || "").trim();
  if (!trimmed) return null;
  const match = trimmed.match(GIT_LOG_COMMIT_LINE_RE);
  if (!match) {
    return {
      hash: trimmed.slice(0, 7),
      shortHash: trimmed.slice(0, 7),
      subject: trimmed,
      when: "",
      author: ""
    };
  }
  return {
    hash: match[1],
    shortHash: match[2],
    subject: match[3],
    when: match[4],
    author: match[5]
  };
}

function parseGitLogOneline(rawOutput) {
  const commits = [];
  let current = null;

  for (const line of String(rawOutput || "").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const commitLine = parseGitLogCommitLine(trimmed);
    if (commitLine && GIT_LOG_COMMIT_LINE_RE.test(trimmed)) {
      if (current) commits.push(current);
      current = commitLine;
      continue;
    }

    const statMatch = trimmed.match(GIT_LOG_SHORTSTAT_FILES_RE);
    if (statMatch && current) {
      current.fileCount = Number(statMatch[1]) || 0;
      continue;
    }

    if (commitLine && !GIT_LOG_COMMIT_LINE_RE.test(trimmed)) {
      if (current) commits.push(current);
      current = commitLine;
    }
  }

  if (current) commits.push(current);
  return commits;
}

module.exports = {
  GIT_STATUS_LABELS,
  classifyGitPorcelainEntry,
  unquoteGitPorcelainPath,
  decodeGitPorcelainPathEscapes,
  parseGitStatusPorcelain,
  parseGitLogOneline
};
