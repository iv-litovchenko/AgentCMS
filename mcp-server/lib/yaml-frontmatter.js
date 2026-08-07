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
