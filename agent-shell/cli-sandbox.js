const fs = require("fs/promises");
const path = require("path");

const CLI_SANDBOX_REL = path.join("workspaces", "cli-sandbox");
const CLI_SANDBOX_SCRATCH = "scratch";

const README = `# CLI sandbox (Agent CMS Shell)

Общая рабочая папка для **Claude Code** и **Codex CLI**, когда Shell отправляет сообщения.

- Shell запускает \`claude\` / \`codex\` с \`cwd\` здесь — **не** в корне workspace агента.
- Локальные Read/Write/Bash CLI видят только эту папку (и вложенные \`scratch/\`).
- Доступ к хранилищу CMS (\`awn-container/\`, темы, слоты) — через **MCP Agent CMS**, не напрямую с диска.

Временные файлы агента кладите в \`scratch/\`.
`;

function resolveProjectRootFromPath(hintPath = process.cwd()) {
  let current = path.resolve(String(hintPath || process.cwd()));
  for (let depth = 0; depth < 14; depth += 1) {
    const agentsFile = path.join(current, "awn-agents.json");
    const pkgFile = path.join(current, "package.json");
    if (
      (fsSyncExists(agentsFile) || fsSyncExists(pkgFile)) &&
      fsSyncExists(path.join(current, "workspaces"))
    ) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return path.resolve(process.cwd());
}

function fsSyncExists(filePath) {
  try {
    require("fs").accessSync(filePath);
    return true;
  } catch {
    return false;
  }
}

function resolveCliSandboxRoot(projectRoot) {
  const root = resolveProjectRootFromPath(projectRoot);
  return path.join(root, CLI_SANDBOX_REL);
}

async function ensureCliSandbox(projectRoot) {
  const sandboxRoot = resolveCliSandboxRoot(projectRoot);
  await fs.mkdir(path.join(sandboxRoot, CLI_SANDBOX_SCRATCH), { recursive: true });
  const readmePath = path.join(sandboxRoot, "README.md");
  try {
    await fs.access(readmePath);
  } catch {
    await fs.writeFile(readmePath, README, "utf-8");
  }
  return sandboxRoot;
}

function cliSandboxMeta(projectRoot) {
  const absolute = resolveCliSandboxRoot(projectRoot);
  return {
    relative: CLI_SANDBOX_REL.replace(/\\/g, "/"),
    absolute
  };
}

module.exports = {
  CLI_SANDBOX_REL,
  CLI_SANDBOX_SCRATCH,
  resolveProjectRootFromPath,
  resolveCliSandboxRoot,
  ensureCliSandbox,
  cliSandboxMeta
};
