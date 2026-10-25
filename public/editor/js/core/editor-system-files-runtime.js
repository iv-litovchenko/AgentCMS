/**
 * Root system file catalogs (refactor 14 — slice from main.js).
 */
(function initEditorSystemFilesRuntime(global) {
const WORKSPACE_WSMAP_FILE = "WS-MAP.md";
const ROOT_SYSTEM_TODO_FILE = "TODO.md";
const ROOT_SYSTEM_NOTE_FILE = "NOTE.md";
const ROOT_SYSTEM_BUFFER_FILE = "BUFFER.md";
const MENU_TREE_VISIBLE_SYSTEM_MD = new Set([
  "AGENTS.md",
  "AUTH.md",
  "BOOTSTRAP.md",
  "ONBOARDING.md",
  "SKILL.md",
  ROOT_SYSTEM_NOTE_FILE,
  ROOT_SYSTEM_TODO_FILE,
  ROOT_SYSTEM_BUFFER_FILE,
  "README.md"
]);
const SYSTEM_FILE_TO_CHPU_PATH = {
  "AGENTS.md": "AGENTS",
  "AUTH.md": "AUTH",
  "BOOTSTRAP.md": "BOOTSTRAP",
  "ONBOARDING.md": "ONBOARDING",
  "SKILL.md": "SKILL",
  "NOTE.md": "NOTE",
  "TODO.md": "TODO",
  "BUFFER.md": "BUFFER",
  "README.md": "README",
  "WS-MAP.md": "WS-MAP",
  "WSMAP.md": "WS-MAP",
  ".env": ".env",
  ".gitignore": ".gitignore"
};
const CORE_SYSTEM_FILES = new Set([
  "AGENTS.md",
  "AUTH.md",
  "BOOTSTRAP.md",
  "ONBOARDING.md",
  "README.md",
  "SKILL.md",
  ROOT_SYSTEM_NOTE_FILE,
  ROOT_SYSTEM_TODO_FILE,
  ROOT_SYSTEM_BUFFER_FILE,
  WORKSPACE_WSMAP_FILE,
  ".env",
  ".gitignore"
]);
const SYSTEM_FILE_SCAFFOLD_FALLBACK = [
  { name: ".env", exists: false, empty: true, group: "config", openMode: "system", scaffold: true },
  { name: ".gitignore", exists: false, empty: true, group: "config", openMode: "system", scaffold: true },
  { name: "AGENTS.md", exists: false, empty: true, group: "md", openMode: "system", scaffold: true },
  { name: "AUTH.md", exists: false, empty: true, group: "md", openMode: "system", scaffold: true },
  { name: "BOOTSTRAP.md", exists: false, empty: true, group: "md", openMode: "system", scaffold: true },
  { name: "ONBOARDING.md", exists: false, empty: true, group: "md", openMode: "system", scaffold: true },
  { name: "SKILL.md", exists: false, empty: true, group: "md", openMode: "system", scaffold: true },
  { name: "dependencies.csv", exists: false, empty: true, group: "config", openMode: "system", scaffold: true },
  { name: "docker-compose.yml", exists: false, empty: true, group: "config", openMode: "system", scaffold: true },
  { name: "README.md", exists: false, empty: true, group: "md", openMode: "system", scaffold: true },
  { name: WORKSPACE_WSMAP_FILE, exists: false, empty: true, group: "md", openMode: "system", scaffold: true },
  { name: ROOT_SYSTEM_NOTE_FILE, exists: false, empty: true, group: "md", openMode: "system", scaffold: true },
  { name: ROOT_SYSTEM_TODO_FILE, exists: false, empty: true, group: "md", openMode: "system", scaffold: true },
  {
    name: ROOT_SYSTEM_BUFFER_FILE,
    exists: false,
    empty: true,
    group: "md",
    openMode: "system",
    scaffold: true
  }
];
const SYSTEM_FILE_GROUP_ORDER = ["md", "config", "other"];
const SYSTEM_FILE_GROUP_LABELS = {
  md: "Markdown",
  config: "Конфиги",
  other: "Прочее"
};

  global.WORKSPACE_WSMAP_FILE = WORKSPACE_WSMAP_FILE;
  global.ROOT_SYSTEM_TODO_FILE = ROOT_SYSTEM_TODO_FILE;
  global.ROOT_SYSTEM_NOTE_FILE = ROOT_SYSTEM_NOTE_FILE;
  global.ROOT_SYSTEM_BUFFER_FILE = ROOT_SYSTEM_BUFFER_FILE;
  global.MENU_TREE_VISIBLE_SYSTEM_MD = MENU_TREE_VISIBLE_SYSTEM_MD;
  global.SYSTEM_FILE_TO_CHPU_PATH = SYSTEM_FILE_TO_CHPU_PATH;
  global.CORE_SYSTEM_FILES = CORE_SYSTEM_FILES;
  global.SYSTEM_FILE_SCAFFOLD_FALLBACK = SYSTEM_FILE_SCAFFOLD_FALLBACK;
  global.SYSTEM_FILE_GROUP_ORDER = SYSTEM_FILE_GROUP_ORDER;
  global.SYSTEM_FILE_GROUP_LABELS = SYSTEM_FILE_GROUP_LABELS;
})(typeof globalThis !== "undefined" ? globalThis : window);
