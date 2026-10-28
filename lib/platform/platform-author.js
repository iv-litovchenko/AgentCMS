const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

/** Справочная карточка автора и проекта (MCP / UI). */
const AUTHOR_STATIC = {
  name: "Иван",
  nameEn: "Ivan",
  role: "автор Agent CMS",
  email: "iv-litovchenko@mail.ru",
  site: "https://agent-cms.ru/",
  github: "https://github.com/iv-litovchenko/AgentCMS",
  telegram: "https://t.me/AgentCMS"
};

const PROJECT_STATIC = {
  name: "Agent CMS",
  tagline: "Цифровая память на диске: редактор, MCP и голос — одно хранилище.",
  license: "AGPL-3.0-or-later",
  copyright: "Copyright © 2026 Agent CMS",
  repository: "https://github.com/iv-litovchenko/AgentCMS"
};

/** Ориентиры для README; git-поля дополняются при запросе, если репозиторий доступен. */
const STATS_STATIC = {
  mcpToolsCanonicalGreenApprox: 233,
  easterEggSets: 2,
  easterEggSetsDetail: ["slogans — слоганы в шапке редактора", "quotes — заголовки на лендинге"],
  workspacesDirDefault: "workspaces/",
  note:
    "Цифры справочные; commitCount и lastCommitAt обновляются из git при GET /api/platform/paschal-eggs, если .git доступен."
};

function readGitStats(projectRoot) {
  const gitDir = path.join(projectRoot, ".git");
  if (!fs.existsSync(gitDir)) {
    return { gitAvailable: false };
  }
  try {
    const commitCount = Number(
      execFileSync("git", ["rev-list", "--count", "HEAD"], {
        cwd: projectRoot,
        encoding: "utf8",
        timeout: 8000
      }).trim()
    );
    const lastCommitAt = execFileSync("git", ["log", "-1", "--format=%cI"], {
      cwd: projectRoot,
      encoding: "utf8",
      timeout: 8000
    }).trim();
    const firstCommitYear = execFileSync("git", ["log", "--reverse", "--format=%ci", "-1"], {
      cwd: projectRoot,
      encoding: "utf8",
      timeout: 8000
    })
      .trim()
      .slice(0, 4);
    return {
      gitAvailable: true,
      commitCount: Number.isFinite(commitCount) ? commitCount : null,
      lastCommitAt: lastCommitAt || null,
      firstCommitYear: /^\d{4}$/.test(firstCommitYear) ? firstCommitYear : null
    };
  } catch {
    return { gitAvailable: false };
  }
}

function loadPlatformAuthor(projectRoot = process.cwd()) {
  const root = path.resolve(projectRoot);
  const git = readGitStats(root);
  return {
    author: { ...AUTHOR_STATIC },
    project: { ...PROJECT_STATIC },
    stats: {
      ...STATS_STATIC,
      ...git
    }
  };
}

module.exports = {
  AUTHOR_STATIC,
  PROJECT_STATIC,
  STATS_STATIC,
  loadPlatformAuthor
};
