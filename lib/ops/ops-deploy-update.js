"use strict";

function isDeployUpdateEnabled() {
  return String(process.env.AGENT_CMS_DEPLOY_UPDATE_ENABLED || "0").trim() === "1";
}

const fs = require("fs");
const path = require("path");
const { spawn, spawnSync } = require("child_process");
const { usesDockerComposeOps, getDockerComposeConfig } = require("./docker-compose-ops");

function resolveHostProjectRoot(projectRoot) {
  const host = String(process.env.AGENT_CMS_HOST_PROJECT || "").trim();
  if (host) return path.resolve(host);
  return path.resolve(String(projectRoot || process.cwd()));
}

function resolveHostComposeFile(hostProject) {
  const rel = String(
    process.env.AGENT_CMS_HOST_COMPOSE_FILE ||
      (String(process.env.AGENT_CMS_COMPOSE_FILE || "").includes("mac")
        ? "docker-compose.mac.yml"
        : "docker-compose.linux.yml")
  ).trim();
  if (path.isAbsolute(rel)) return rel;
  return path.join(hostProject, rel);
}

function gitHead(cwd) {
  const result = spawnSync("git", ["rev-parse", "--short", "HEAD"], {
    cwd,
    encoding: "utf8",
    timeout: 15000
  });
  return result.status === 0 ? String(result.stdout || "").trim() : null;
}

function gitPull(hostProject) {
  if (String(process.env.AGENT_CMS_DEPLOY_SKIP_PULL || "").trim() === "1") {
    return { ok: true, skipped: true, output: "git pull пропущен (AGENT_CMS_DEPLOY_SKIP_PULL=1)." };
  }
  const remote = String(process.env.AGENT_CMS_DEPLOY_GIT_REMOTE || "origin").trim() || "origin";
  const branch = String(process.env.AGENT_CMS_DEPLOY_GIT_BRANCH || "").trim();
  const args = branch ? ["pull", "--ff-only", remote, branch] : ["pull", "--ff-only"];
  const result = spawnSync("git", args, {
    cwd: hostProject,
    encoding: "utf8",
    timeout: 300000,
    env: process.env
  });
  const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
  return {
    ok: result.status === 0,
    exitCode: result.status,
    output,
    remote,
    branch: branch || "(current)"
  };
}

function runDockerComposeBuildDetached(hostProject) {
  const config = getDockerComposeConfig();
  const composeFile = resolveHostComposeFile(hostProject);
  if (!fs.existsSync(composeFile)) {
    return {
      ok: false,
      status: 500,
      error: "compose_missing",
      message: `Compose file not found: ${composeFile}`
    };
  }

  const runDir = path.join(hostProject, ".run");
  fs.mkdirSync(runDir, { recursive: true });
  const logPath = path.join(runDir, "deploy-update.log");
  const lockPath = path.join(runDir, "deploy-update.lock");

  if (fs.existsSync(lockPath)) {
    return {
      ok: true,
      status: 202,
      alreadyRunning: true,
      logPath: path.relative(hostProject, logPath),
      message: "Обновление уже выполняется — см. журнал (.run/deploy-update.log)."
    };
  }

  fs.writeFileSync(lockPath, `${Date.now()}\n`, "utf8");
  fs.writeFileSync(logPath, `\n▶ deploy-update ${new Date().toISOString()}\n`, { flag: "a" });
  const args = [
    "compose",
    "--project-directory",
    hostProject,
    "-f",
    composeFile,
    "-p",
    config.project,
    "up",
    "-d",
    "--build"
  ];
  const logFd = fs.openSync(logPath, "a");
  const child = spawn("docker", args, {
    detached: true,
    stdio: ["ignore", logFd, logFd]
  });
  child.unref();
  fs.closeSync(logFd);
  child.on("exit", (code) => {
    try {
      fs.appendFileSync(logPath, `\n■ exit ${code ?? "?"}\n`);
    } catch {
      /* ignore */
    }
    try {
      fs.unlinkSync(lockPath);
    } catch {
      /* ignore */
    }
  });

  return {
    ok: true,
    status: 202,
    started: true,
    rebuildStarted: true,
    logPath: path.relative(hostProject, logPath),
    message: "Сборка и перезапуск контейнеров в фоне (docker compose up -d --build). Прогресс — в журнале."
  };
}

function runDeployUpdate(projectRoot) {
  const hostProject = resolveHostProjectRoot(projectRoot);
  const gitDir = path.join(hostProject, ".git");
  if (!fs.existsSync(gitDir)) {
    return {
      ok: false,
      status: 400,
      error: "no_git",
      message: usesDockerComposeOps()
        ? "Нет git-репозитория в AGENT_CMS_HOST_PROJECT. Смонтируйте каталог проекта на хосте в control (см. docker-compose)."
        : "Нет .git в каталоге проекта — обновление только для git checkout."
    };
  }

  const commitBefore = gitHead(hostProject);
  const pull = gitPull(hostProject);
  const lines = [];
  if (commitBefore) lines.push(`commit до: ${commitBefore}`);
  if (pull.output) lines.push(pull.output);

  if (!pull.ok) {
    return {
      ok: false,
      status: 500,
      action: "deploy-update",
      error: "git_pull_failed",
      commitBefore,
      output: lines.join("\n"),
      message: "git pull не выполнен (merge/conflict или нет доступа к remote)."
    };
  }

  const commitAfter = gitHead(hostProject);
  if (commitAfter) lines.push(`commit после: ${commitAfter}`);

  if (usesDockerComposeOps()) {
    const build = runDockerComposeBuildDetached(hostProject);
    return {
      action: "deploy-update",
      commitBefore,
      commitAfter,
      output: lines.join("\n"),
      ...build
    };
  }

  const changed = commitBefore && commitAfter && commitBefore !== commitAfter;
  return {
    ok: true,
    status: 200,
    action: "deploy-update",
    commitBefore,
    commitAfter,
    output: lines.join("\n"),
    message: changed
      ? `Git обновлён (${commitBefore} → ${commitAfter}). Перезапустите сервер (Restart), если менялся код.`
      : `Git актуален (${commitAfter || "—"}).`
  };
}

module.exports = {
  isDeployUpdateEnabled,
  runDeployUpdate,
  resolveHostProjectRoot
};
