import { hashText, markdownBodyStartLine } from "./content-read-window.js";

export const WRITE_MODES = ["replace", "append", "prepend", "patch", "replace_lines", "insert"];
const HASH_REQUIRED_MODES = new Set(["replace_lines", "insert"]);

export class ContentConflictError extends Error {
  constructor(expectedHash, currentHash) {
    super(
      `conflict: file changed since read (expectedHash ${expectedHash}, currentHash ${currentHash}). ` +
        "Re-read with read_content and retry with the new hash."
    );
    this.currentHash = currentHash;
  }
}

function toLines(text) {
  return String(text ?? "").replace(/\r\n/g, "\n").split("\n");
}

function contentLines(content) {
  const text = String(content ?? "");
  return text === "" ? [] : toLines(text);
}

function intArg(args, key) {
  const value = args[key];
  if (value == null) return null;
  const num = Number(value);
  if (!Number.isInteger(num)) throw new Error(`${key} must be an integer`);
  return num;
}

function lineNumberOfIndex(text, index) {
  return text.slice(0, index).split("\n").length;
}

export function assertExpectedHash(raw, args) {
  const mode = args.mode || "replace";
  const currentHash = hashText(raw ?? "");
  if (args.expectedHash) {
    if (args.expectedHash !== currentHash) throw new ContentConflictError(args.expectedHash, currentHash);
  } else if (HASH_REQUIRED_MODES.has(mode)) {
    throw new Error(
      `expectedHash is required for mode=${mode} (line numbers belong to one file version). ` +
        `Take hash from read_content; current hash: ${currentHash}`
    );
  }
  return currentHash;
}

/**
 * Apply a body edit to raw file text. Line numbers are 1-based over the whole file
 * (frontmatter included) — the same numbering as read_content and search hits.
 * Returns the new raw text and the changed line range in it.
 */
export function applyBodyEdit(raw, args, { markdownBody = false } = {}) {
  const mode = args.mode || "replace";
  const source = String(raw ?? "");
  const eol = source.includes("\r\n") ? "\r\n" : "\n";
  const lines = toLines(source);
  const bodyStartLine = markdownBody ? markdownBodyStartLine(source) : 1;
  const bodyIdx = Math.min(bodyStartLine - 1, lines.length);
  const head = lines.slice(0, bodyIdx);
  let next;
  let changedStart;
  let changedCount;

  const requireContent = () => {
    if (args.content == null) throw new Error(`content is required for mode=${mode}`);
    return contentLines(args.content);
  };

  if (mode === "replace") {
    const inserted = requireContent();
    next = [...head, ...inserted];
    changedStart = bodyIdx;
    changedCount = inserted.length;
  } else if (mode === "prepend") {
    const inserted = requireContent();
    next = [...head, ...inserted, ...lines.slice(bodyIdx)];
    changedStart = bodyIdx;
    changedCount = inserted.length;
  } else if (mode === "append") {
    const inserted = requireContent();
    const trailingNewline = lines.length > bodyIdx && lines[lines.length - 1] === "";
    const kept = trailingNewline ? lines.slice(0, -1) : lines.slice();
    const bodyEmpty = kept.length === bodyIdx || (kept.length === bodyIdx + 1 && kept[bodyIdx] === "");
    const base = bodyEmpty ? head : kept;
    next = [...base, ...inserted, ...(trailingNewline ? [""] : [])];
    changedStart = base.length;
    changedCount = inserted.length;
  } else if (mode === "patch") {
    if (args.oldString == null || args.oldString === "") throw new Error("oldString is required for mode=patch");
    if (args.newString == null) throw new Error("newString is required for mode=patch (use \"\" to delete)");
    const oldString = String(args.oldString).replace(/\r\n/g, "\n");
    const newString = String(args.newString).replace(/\r\n/g, "\n");
    const headText = head.length ? `${head.join("\n")}\n` : "";
    const body = lines.slice(bodyIdx).join("\n");
    const positions = [];
    for (let at = body.indexOf(oldString); at !== -1; at = body.indexOf(oldString, at + oldString.length)) {
      positions.push(at);
    }
    if (!positions.length) {
      throw new Error("patch: oldString not found in body (frontmatter is not patched — use part=properties)");
    }
    if (positions.length > 1 && !args.replaceAll) {
      const at = positions.map((p) => bodyStartLine + lineNumberOfIndex(body, p) - 1);
      throw new Error(
        `patch: oldString matches ${positions.length} times (lines ${at.join(", ")}). ` +
          "Add surrounding context to make it unique or pass replaceAll=true."
      );
    }
    const newBody = args.replaceAll ? body.split(oldString).join(newString) : body.replace(oldString, () => newString);
    next = toLines(headText + newBody);
    changedStart = bodyIdx + lineNumberOfIndex(body, positions[0]) - 1;
    changedCount = args.replaceAll ? 0 : contentLines(newString).length;
    if (args.replaceAll) {
      const lastOld = positions[positions.length - 1];
      const shift = (newString.length - oldString.length) * (positions.length - 1);
      const lastEnd = lastOld + shift + newString.length;
      changedCount = lineNumberOfIndex(newBody, lastEnd) - (changedStart - bodyIdx);
    }
  } else if (mode === "replace_lines") {
    const startLine = intArg(args, "startLine");
    const endLine = intArg(args, "endLine") ?? startLine;
    if (startLine == null) throw new Error("startLine is required for mode=replace_lines");
    if (startLine < bodyStartLine) {
      throw new Error(`startLine ${startLine} is inside frontmatter; body starts at line ${bodyStartLine} (use part=properties)`);
    }
    if (endLine < startLine) throw new Error("endLine must be >= startLine");
    if (endLine > lines.length) throw new Error(`endLine ${endLine} is past end of file (totalLines ${lines.length})`);
    const inserted = requireContent();
    next = [...lines.slice(0, startLine - 1), ...inserted, ...lines.slice(endLine)];
    changedStart = startLine - 1;
    changedCount = inserted.length;
  } else if (mode === "insert") {
    const afterLine = intArg(args, "afterLine");
    const beforeLine = intArg(args, "beforeLine");
    if ((afterLine == null) === (beforeLine == null)) {
      throw new Error("mode=insert needs exactly one of afterLine or beforeLine");
    }
    const at = afterLine != null ? afterLine : beforeLine - 1;
    if (at < bodyStartLine - 1) {
      throw new Error(`insert position is inside frontmatter; body starts at line ${bodyStartLine}`);
    }
    if (at > lines.length) throw new Error(`insert position past end of file (totalLines ${lines.length})`);
    const inserted = requireContent();
    next = [...lines.slice(0, at), ...inserted, ...lines.slice(at)];
    changedStart = at;
    changedCount = inserted.length;
  } else {
    throw new Error(`mode must be one of: ${WRITE_MODES.join(", ")}`);
  }

  const text = next.join(eol);
  return {
    text,
    startLine: changedStart + 1,
    endLine: changedStart + Math.max(changedCount, 0),
    totalLines: next.length
  };
}
