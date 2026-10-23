"use strict";

const { spawn, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const {
  usesDockerComposeOps,
  getDockerComposeConfig,
  runDockerComposeArgv,
  dockerComposeStatusOutput,
  cmsRunningFromComposePs
} = require("./docker-compose-ops");

const ALLOWED_ACTIONS = new Set(["start", "stop", "restart", "status", "install-npm"]);

function resolveHttpServiceScript(projectRoot) {
  return path.join(projectRoot, "scripts", "agent-cms-http-service.sh");
}

function resolveHttpsServiceScript(projectRoot) {
  return path.join(projectRoot, "scripts", "agent-https-service.sh");
}

function usesHttpServiceStack(projectRoot) {
  void projectRoot;
  return (
    process.platform === "linux" ||
    String(process.env.AGENT_CMS_OPS_HTTP_SERVICE || "").trim() === "1" ||
    String(process.env.AGENT_CMS_HTTP_TO_HTTPS || "1").trim() === "0"
  );
}

function pickServiceScript(projectRoot) {
  if (usesHttpServiceStack(projectRoot)) {
    return resolveHttpServiceScript(projectRoot);
  }
  return resolveHttpsServiceScript(projectRoot);
}

function getSupervisorPidFile(projectRoot) {
  const root = path.resolve(String(projectRoot || process.cwd()));
  const base = usesHttpServiceStack(root) ? "agent-cms-http.pid" : "agent-cms-https.pid";
  return path.join(root, ".run", base);
}

function mapActionToScriptArg(action) {
  if (action === "start") return "start-direct";
  return action;
}

function readTail(filePath, lines = 30) {
  try {
    const text = fs.readFileSync(filePath, "utf8");
    return text.split(/\r?\n/).slice(-lines).join("\n").trim();
  } catch {
    return "";
  }
}

function runDockerComposeAction(action) {
  const config = getDockerComposeConfig();
  if (action === "status") {
    const result = dockerComposeStatusOutput();
    return {
      ok: result.ok,
      status: result.ok ? 200 : 500,
      action,
      exitCode: result.exitCode,
      output: result.output
    };
  }

  let sub;
  let services;
  if (action === "start") {
    sub = "up";
    services = ["-d", ...config.upServices];
  } else if (action === "stop") {
    sub = "stop";
    services = config.stopServices;
  } else if (action === "restart") {
    sub = "restart";
    services = config.upServices;
  } else {
    return { ok: false, status: 400, error: "invalid_action", message: action };
  }

  const args = runDockerComposeArgv(sub, services);
  const result = spawnSync("docker", args, {
    encoding: "utf8",
    timeout: 180000
  });
  const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
  return {
    ok: result.status === 0,
    status: result.status === 0 ? 200 : 500,
    action,
    exitCode: result.status,
    output,
    message:
      action === "start"
        ? `Контейнеры ${config.upServices.join(", ")} поднимаются (docker compose up -d).`
        : action === "stop"
          ? `Контейнер ${config.stopServices.join(", ")} останавливается (Control остаётся).`
          : action === "restart"
            ? `Контейнеры ${config.upServices.join(", ")} перезапускаются.`
            : undefined
  };
}

function getServerProcessStatus(projectRoot) {
  if (usesDockerComposeOps()) {
    const result = runDockerComposeAction("status");
    const running = cmsRunningFromComposePs(result.output);
    return {
      ok: result.ok,
      state: running ? "running (docker)" : "stopped (docker)",
      detail: "docker compose",
      exitCode: result.exitCode
    };
  }
  const script = pickServiceScript(projectRoot);
  if (!fs.existsSync(script)) {
    return { ok: false, state: "unknown", detail: "service script missing" };
  }
  const result = spawnSync("bash", [script, "status"], {
    cwd: projectRoot,
    encoding: "utf8",
    timeout: 15000
  });
  const line = String(result.stdout || result.stderr || "").trim().split(/\r?\n/)[0] || "";
  return {
    ok: result.status === 0,
    state: line || "unknown",
    script: path.basename(script),
    exitCode: result.status
  };
}

function runInstallNpmDetached(projectRoot) {
  const runDir = path.join(projectRoot, ".run");
  fs.mkdirSync(runDir, { recursive: true });
  const logPath = path.join(runDir, "npm-ci.log");
  const lockPath = path.join(runDir, "npm-ci.lock");

  if (fs.existsSync(lockPath)) {
    return {
      ok: true,
      alreadyRunning: true,
      logPath: path.relative(projectRoot, logPath),
      message: "npm ci уже выполняется (см. лог)."
    };
  }

  fs.writeFileSync(lockPath, `${Date.now()}\n`, "utf8");
  const child = spawn(
    "bash",
    [
      "-lc",
      `cd "${projectRoot}" && npm ci >>"${logPath}" 2>&1; ec=$?; rm -f "${lockPath}"; exit $ec`
    ],
    {
      detached: true,
      stdio: "ignore"
    }
  );
  child.unref();

  return {
    ok: true,
    started: true,
    logPath: path.relative(projectRoot, logPath),
    message: "npm ci запущен в фоне (15–30+ мин на слабом VPS)."
  };
}

function runServerAction(projectRoot, action, options = {}) {
  const normalized = String(action || "").trim();
  if (!ALLOWED_ACTIONS.has(normalized)) {
    return {
      ok: false,
      status: 400,
      error: "invalid_action",
      message: `Allowed: ${[...ALLOWED_ACTIONS].join(", ")}`
    };
  }

  if (normalized === "install-npm") {
    const payload = runInstallNpmDetached(projectRoot);
    return { ok: true, status: 202, action: normalized, ...payload };
  }

  if (usesDockerComposeOps()) {
    if (normalized === "status") {
      return runDockerComposeAction("status");
    }
    const mapped =
      normalized === "start" ? "start" : normalized === "stop" ? "stop" : normalized === "restart" ? "restart" : null;
    if (!mapped) {
      return { ok: false, status: 400, error: "invalid_action", message: normalized };
    }
    const detach = mapped === "stop" || mapped === "restart";
    if (detach) {
      const config = getDockerComposeConfig();
      const sub = mapped === "stop" ? "stop" : "restart";
      const services = mapped === "stop" ? config.stopServices : config.upServices;
      const child = spawn("docker", runDockerComposeArgv(sub, services), {
        detached: true,
        stdio: "ignore"
      });
      child.unref();
      const msg =
        mapped === "stop"
          ? `Контейнер ${config.stopServices.join(", ")} останавливается (Control остаётся).`
          : `Контейнеры ${config.upServices.join(", ")} перезапускаются.`;
      return { ok: true, status: 202, action: normalized, detached: true, message: msg };
    }
    return runDockerComposeAction(mapped);
  }

  const script = pickServiceScript(projectRoot);
  if (!fs.existsSync(script)) {
    return {
      ok: false,
      status: 500,
      error: "script_missing",
      message: script
    };
  }

  const scriptArg = mapActionToScriptArg(normalized);
  const detach = normalized === "stop" || normalized === "restart";

  if (detach) {
    const delaySec = usesHttpServiceStack(projectRoot) ? 2 : 0.75;
    const quotedScript = script.replace(/"/g, '\\"');
    const child = spawn(
      "bash",
      ["-c", `sleep ${delaySec} && exec bash "${quotedScript}" "${scriptArg}"`],
      {
        cwd: projectRoot,
        detached: true,
        stdio: "ignore"
      }
    );
    child.unref();
    return {
      ok: true,
      status: 202,
      action: normalized,
      detached: true,
      message:
        normalized === "stop"
          ? "Остановка через несколько секунд (Control :3288 отключится)."
          : "Перезапуск через несколько секунд (страница может на секунду «упасть»)."
    };
  }

  const result = spawnSync("bash", [script, scriptArg], {
    cwd: projectRoot,
    encoding: "utf8",
    timeout: options.timeoutMs || 120000,
    env: { ...process.env, ...options.env }
  });

  const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
  const logPath =
    script === resolveHttpServiceScript(projectRoot)
      ? ".run/agent-cms-http.log"
      : ".run/agent-cms-https.log";

  return {
    ok: result.status === 0,
    status: result.status === 0 ? 200 : 500,
    action: normalized,
    exitCode: result.status,
    output: output || readTail(path.join(projectRoot, logPath)),
    logPath
  };
}

module.exports = {
  ALLOWED_ACTIONS,
  usesDockerComposeOps,
  usesHttpServiceStack,
  pickServiceScript,
  getSupervisorPidFile,
  getServerProcessStatus,
  runServerAction
};
