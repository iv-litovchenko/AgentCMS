function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function formatYamlScalar(value) {
  const text = String(value ?? "");
  if (/^[a-zA-Z0-9_\-@.]+$/.test(text)) return text;
  return JSON.stringify(text);
}

/** Read one top-level scalar property from YAML frontmatter text. */
export function getFrontmatterScalar(frontmatter, key) {
  const normalizedKey = String(key || "").trim();
  if (!normalizedKey) return { value: "", exists: false };
  const text = String(frontmatter || "");
  const match = text.match(new RegExp(`^${escapeRegExp(normalizedKey)}:\\s*(.+)$`, "im"));
  if (!match) return { value: "", exists: false };
  const raw = match[1].trim();
  const unquoted =
    (raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))
      ? raw.slice(1, -1)
      : raw;
  return { value: unquoted, exists: true };
}

/** Set or replace one top-level scalar line in frontmatter text. */
export function upsertYamlScalarLine(frontmatter, key, value) {
  const normalizedKey = String(key || "").trim();
  const line = `${normalizedKey}: ${formatYamlScalar(value)}`;
  const pattern = new RegExp(`^${escapeRegExp(normalizedKey)}:.*$`, "m");
  const trimmed = String(frontmatter || "").trim();
  if (pattern.test(trimmed)) {
    return trimmed.replace(pattern, line);
  }
  return trimmed ? `${trimmed}\n${line}` : line;
}

/** Merge YAML frontmatter lines: overlay keys replace base keys (same as server mergeFrontmatterBlocks). */
export function mergeFrontmatterBlocks(baseFrontmatter, overlayFrontmatter) {
  const overlayText = String(overlayFrontmatter || "").trim();
  if (!overlayText) return String(baseFrontmatter || "").trim();
  const overlayKeys = new Set();
  const overlayLines = overlayText.split("\n").filter((line) => line.trim());
  for (const line of overlayLines) {
    const key = line.split(":")[0]?.trim().toLowerCase();
    if (key) overlayKeys.add(key);
  }
  const baseLines = String(baseFrontmatter || "")
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      const key = trimmed.split(":")[0]?.trim().toLowerCase();
      return key && !overlayKeys.has(key);
    });
  return [...baseLines, ...overlayLines].join("\n");
}
