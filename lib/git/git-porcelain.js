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

function unquoteGitPorcelainPath(rawPath) {
  let value = String(rawPath || "").trim();
  if (!value.startsWith('"') || !value.endsWith('"') || value.length < 2) {
    return value;
  }
  value = value.slice(1, -1);
  let out = "";
  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i];
    if (ch === "\\" && i + 1 < value.length) {
      out += value[i + 1];
      i += 1;
      continue;
    }
    out += ch;
  }
  return out;
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

    filePath = String(filePath || "").normalize("NFC");
    oldPath = String(oldPath || "").normalize("NFC");

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

function parseGitLogOneline(rawOutput) {
  return String(rawOutput || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^([0-9a-f]+)\|([^|]+)\|([^|]*)\|([^|]*)\|(.*)$/);
      if (!match) {
        return { hash: line.slice(0, 7), shortHash: line.slice(0, 7), subject: line, when: "", author: "" };
      }
      return {
        hash: match[1],
        shortHash: match[2],
        subject: match[3],
        when: match[4],
        author: match[5]
      };
    });
}

module.exports = {
  GIT_STATUS_LABELS,
  classifyGitPorcelainEntry,
  unquoteGitPorcelainPath,
  parseGitStatusPorcelain,
  parseGitLogOneline
};
