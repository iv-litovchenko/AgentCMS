/** Human labels for agent-supplied platform slugs (sections in awn-storage/data/). */

const PLATFORM_LABELS = {
  cursor: "Cursor",
  claude: "Claude",
  "claude-desktop": "Claude Desktop",
  "claude-code": "Claude Code",
  "claude-cli": "Claude CLI",
  chatgpt: "ChatGPT",
  codex: "Codex",
  "codex-cli": "Codex CLI",
  terminal: "Terminal",
  iterm: "iTerm",
  warp: "Warp",
  vscode: "VS Code",
  composer: "Composer",
  other: "Другое"
};

const EXTERNAL_MEMORY_PLATFORM_REQUIRED =
  "platform обязателен: укажи, кто ты (kebab-case), например cursor, claude-code, codex, claude-cli, chatgpt — не имя LLM-модели; под slug создаётся раздел data/{platform}/";

function externalMemoryPlatformDisplayName(slug) {
  const key = String(slug || "").trim().toLowerCase();
  if (PLATFORM_LABELS[key]) return PLATFORM_LABELS[key];
  if (!key) return "";
  return key
    .split("-")
    .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : ""))
    .join(" ");
}

module.exports = {
  PLATFORM_LABELS,
  EXTERNAL_MEMORY_PLATFORM_REQUIRED,
  externalMemoryPlatformDisplayName
};
