const fs = require("fs/promises");
const path = require("path");

const CLI_SANDBOX_REL = path.join("workspaces", "cli-sandbox");
const CLI_SANDBOX_SCRATCH = "scratch";
const CLI_SANDBOX_RUNTIMES = ["claude", "codex"];

const ROOT_README = `# CLI sandbox (Agent CMS Shell)

Песочницы для **Claude Code** и **Codex CLI** — отдельная папка на каждый runtime и агента CMS:

\`\`\`
workspaces/cli-sandbox/
├── claude/
│   ├── agent-cms-test/
│   └── …
└── codex/
    ├── agent-cms-test/
    └── …
\`\`\`

Shell запускает CLI с \`cwd\` в \`cli-sandbox/<runtime>/<agent-id>/\`, не в корне workspace и не в \`awn-container/\`.
Доступ к хранилищу CMS — через **MCP Agent CMS**.
`;

function agentReadme(runtime, agentId) {
  const rt = sanitizeCliRuntime(runtime);
  const id = sanitizeCliAgentId(agentId);
  return `# CLI sandbox — ${rt} / ${id}

Рабочая папка **${rt}** для агента \`${id}\` в Agent CMS Shell.

- \`cwd\` CLI — только эта папка и \`scratch/\`.
- Хранилище workspace (\`awn-container/\`, темы) — через MCP, не с диска напрямую.

Временные файлы — в \`scratch/\`.
`;
}

function sanitizeCliAgentId(agentId) {
  const raw = String(agentId || "").trim();
  const safe = raw.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return safe || "default";
}

function sanitizeCliRuntime(runtime) {
  const raw = String(runtime || "").trim().toLowerCase();
  if (CLI_SANDBOX_RUNTIMES.includes(raw)) return raw;
  return "claude";
}

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

function resolveCliSandboxRoot(projectRoot, agentId, runtime) {
  const root = resolveProjectRootFromPath(projectRoot);
  const id = sanitizeCliAgentId(agentId);
  const rt = sanitizeCliRuntime(runtime);
  return path.join(root, CLI_SANDBOX_REL, rt, id);
}

async function ensureCliSandboxRootReadme(projectRoot) {
  const root = path.join(resolveProjectRootFromPath(projectRoot), CLI_SANDBOX_REL);
  await fs.mkdir(root, { recursive: true });
  const readmePath = path.join(root, "README.md");
  try {
    await fs.access(readmePath);
  } catch {
    await fs.writeFile(readmePath, ROOT_README, "utf-8");
  }
}

async function ensureCliSandbox(projectRoot, agentId, runtime) {
  const id = sanitizeCliAgentId(agentId);
  const rt = sanitizeCliRuntime(runtime);
  await ensureCliSandboxRootReadme(projectRoot);
  const sandboxRoot = resolveCliSandboxRoot(projectRoot, id, rt);
  await fs.mkdir(path.join(sandboxRoot, CLI_SANDBOX_SCRATCH), { recursive: true });
  const readmePath = path.join(sandboxRoot, "README.md");
  try {
    await fs.access(readmePath);
  } catch {
    await fs.writeFile(readmePath, agentReadme(rt, id), "utf-8");
  }
  return sandboxRoot;
}

function cliSandboxMeta(projectRoot, agentId, runtime) {
  const id = sanitizeCliAgentId(agentId);
  const rt = sanitizeCliRuntime(runtime);
  const absolute = resolveCliSandboxRoot(projectRoot, id, rt);
  const relative = path.posix.join(CLI_SANDBOX_REL.replace(/\\/g, "/"), rt, id);
  return {
    agentId: id,
    runtime: rt,
    relative,
    absolute
  };
}

function cliSandboxesMeta(projectRoot, agentId) {
  const sandboxes = {};
  for (const runtime of CLI_SANDBOX_RUNTIMES) {
    sandboxes[runtime] = cliSandboxMeta(projectRoot, agentId, runtime);
  }
  return sandboxes;
}

module.exports = {
  CLI_SANDBOX_REL,
  CLI_SANDBOX_SCRATCH,
  CLI_SANDBOX_RUNTIMES,
  sanitizeCliAgentId,
  sanitizeCliRuntime,
  resolveProjectRootFromPath,
  resolveCliSandboxRoot,
  ensureCliSandbox,
  cliSandboxMeta,
  cliSandboxesMeta
};
