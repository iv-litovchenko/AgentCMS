"use strict";

const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const { tickServerRuntime } = require("../runtime/server-runtime-tracker");
const { getSupervisorPidFile, usesHttpServiceStack, usesDockerComposeOps } = require("./ops-server-control");

const LAUNCH_AGENT_LABEL = "com.agentcms.https";

function loadActionsModule(projectRoot) {
  const target = path.join(projectRoot, "desktop", "agent-control", "actions.js");
  return require(target);
}

function parsePsElapsedSec(stdout) {
  const raw = String(stdout || "").trim();
  if (!raw) return null;

  if (/^\d+$/.test(raw)) {
    const sec = Number(raw);
    return Number.isFinite(sec) && sec >= 0 ? sec : null;
  }

  const dayMatch = raw.match(/^(\d+)-(\d+):(\d{2}):(\d{2})$/);
  if (dayMatch) {
    const [, days, hours, minutes, seconds] = dayMatch.map(Number);
    return days * 86400 + hours * 3600 + minutes * 60 + seconds;
  }

  const parts = raw.split(":").map(Number);
  if (parts.some((value) => !Number.isFinite(value))) return null;

  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    return hours * 3600 + minutes * 60 + seconds;
  }
  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return minutes * 60 + seconds;
  }

  return null;
}

function getLaunchAgentPlistPath() {
  const os = require("os");
  return path.join(os.homedir(), "Library", "LaunchAgents", `${LAUNCH_AGENT_LABEL}.plist`);
}

function getLaunchAgentTarget() {
  const os = require("os");
  const uid = typeof process.getuid === "function" ? process.getuid() : os.userInfo().uid;
  return `gui/${uid}/${LAUNCH_AGENT_LABEL}`;
}

async function probeLaunchAgentStatus() {
  if (process.platform !== "darwin") {
    return { supported: false, enabled: false, loaded: false, plistExists: false, plistPath: null };
  }

  const plistPath = getLaunchAgentPlistPath();
  const plistExists = fs.existsSync(plistPath);
  const target = getLaunchAgentTarget();

  const loaded = await new Promise((resolve) => {
    execFile("launchctl", ["print", target], { timeout: 2500 }, (error) => {
      resolve(!error);
    });
  });

  return {
    supported: true,
    enabled: plistExists,
    loaded,
    plistExists,
    plistPath
  };
}

async function probeHttpOk(url, timeoutMs = 5000) {
  const target = String(url || "").trim();
  if (!target) return false;
  try {
    const res = await fetch(target, { signal: AbortSignal.timeout(timeoutMs) });
    return res.ok;
  } catch {
    return false;
  }
}

async function probeServerStatusDocker(root) {
  const cmsApi = String(process.env.CMS_API_URL || "http://cms:3000")
    .trim()
    .replace(/\/$/, "");
  const mcpInternal = String(process.env.AGENT_CMS_MCP_INTERNAL_URL || "http://mcp:3490")
    .trim()
    .replace(/\/$/, "");
  const controlInternal = String(
    process.env.AGENT_CMS_CONTROL_INTERNAL_URL || "http://control:3288"
  )
    .trim()
    .replace(/\/$/, "");

  const cms = await probeHttpOk(`${cmsApi}/api/agent/mcp-ping`);
  const [mcpHttp, controlHttp, voice, commander] = await Promise.all([
    probeHttpOk(`${mcpInternal}/health`),
    probeHttpOk(`${controlInternal}/`),
    cms ? probeHttpOk(`${cmsApi}/app-chat/`) : Promise.resolve(false),
    cms ? probeHttpOk(`${cmsApi}/app-commander/`) : Promise.resolve(false)
  ]);
  const running = cms;
  const probedAt = Date.now();

  let runtimeTodayMinutes = 0;
  try {
    runtimeTodayMinutes = tickServerRuntime(root, running, probedAt);
  } catch {
    runtimeTodayMinutes = 0;
  }

  const publicBase = String(process.env.AGENT_CMS_PUBLIC_URL || "").trim().replace(/\/$/, "");
  const { isSinglePublicHttpDoor } = require("../platform/single-door-ports");

  return {
    running,
    cms,
    voice,
    commander,
    controlHttp,
    mcpHttp,
    singleHttpDoor: isSinglePublicHttpDoor(process.env),
    supervisorAlive: false,
    supervisorPid: null,
    mode: running ? "docker" : "off",
    uptimeSec: null,
    startedAt: null,
    probedAt,
    runtimeTodayMinutes,
    autoStart: { supported: false, enabled: false, loaded: false },
    modeLabel: running ? "контейнер CMS" : "остановлен (Docker)",
    deploymentProbe: "docker-http",
    urls: {
      cms: publicBase ? `${publicBase}/` : cms ? cmsApi + "/" : null,
      voice: publicBase ? `${publicBase}/app-chat` : null,
      commanderHttp: publicBase ? `${publicBase}/app-commander` : null,
      commanderHttps: publicBase ? `${publicBase}/app-commander` : null,
      controlHttp: publicBase ? `${publicBase}/app-control` : null,
      controlEditor: publicBase ? `${publicBase}/app-control` : null,
      mcpHttp: publicBase ? `${publicBase}/app-mcp` : null
    }
  };
}

async function probeServerStatus(projectRoot, options = {}) {
  const root = path.resolve(String(projectRoot || process.cwd()));
  if (usesDockerComposeOps()) {
    return probeServerStatusDocker(root);
  }
  const { getServerPortsPayload } = loadActionsModule(root);
  const ports = getServerPortsPayload();
  const pidFile = getSupervisorPidFile(root);
  const httpStack = usesHttpServiceStack(root);
  const cmsProbePort = httpStack ? ports.editorHttp : ports.editorHttps;
  const voiceProbePort = httpStack ? ports.voiceHttp : ports.voiceHttps;
  let supervisorPid = null;
  let supervisorAlive = false;

  if (fs.existsSync(pidFile)) {
    supervisorPid = Number(fs.readFileSync(pidFile, "utf8").trim()) || null;
    if (supervisorPid) {
      try {
        process.kill(supervisorPid, 0);
        supervisorAlive = true;
      } catch {
        supervisorAlive = false;
      }
    }
  }

  const getPortPid = (port) =>
    new Promise((resolve) => {
      execFile("lsof", ["-ti", `:${port}`], { timeout: 2000 }, (error, stdout) => {
        const pid = Number(String(stdout || "").trim().split("\n")[0]);
        resolve(Number.isFinite(pid) && pid > 0 ? pid : null);
      });
    });

  const getProcessUptimeSec = (pid) =>
    new Promise((resolve) => {
      if (!pid) {
        resolve(null);
        return;
      }

      const readElapsed = (field, next) => {
        execFile("ps", ["-p", String(pid), "-o", `${field}=`], { timeout: 2000 }, (error, stdout) => {
          const sec = parsePsElapsedSec(stdout);
          if (sec != null) {
            resolve(sec);
            return;
          }
          if (next) next();
          else resolve(null);
        });
      };

      readElapsed("etimes", () => readElapsed("etime"));
    });

  const [cmsPid, voicePid, commanderPid, controlHttpPid, mcpHttpPid] = await Promise.all([
    getPortPid(cmsProbePort),
    getPortPid(voiceProbePort),
    getPortPid(ports.commanderHttp),
    getPortPid(ports.controlHttp),
    getPortPid(ports.mcpHttp)
  ]);
  const cms = Boolean(cmsPid);
  const voice = Boolean(voicePid);
  const commander = Boolean(commanderPid);
  const controlHttp = Boolean(controlHttpPid);
  const mcpHttp = Boolean(mcpHttpPid);
  const running = cms || voice;
  const autoStart = await probeLaunchAgentStatus();
  const attached = Boolean(options.attachedServerProcess);
  let mode = "off";

  if (running) {
    if (attached) mode = "attached";
    else if (autoStart.loaded) mode = "autostart";
    else if (supervisorAlive) mode = "background";
    else mode = "running";
  }

  let uptimeSec = null;
  if (running) {
    const pidCandidates = [cmsPid, voicePid, commanderPid, supervisorAlive ? supervisorPid : null].filter(Boolean);
    for (const pid of pidCandidates) {
      const elapsed = await getProcessUptimeSec(pid);
      if (elapsed != null) {
        uptimeSec = uptimeSec == null ? elapsed : Math.max(uptimeSec, elapsed);
      }
    }
  }

  const probedAt = Date.now();
  const startedAt = uptimeSec != null ? probedAt - uptimeSec * 1000 : null;
  let runtimeTodayMinutes = 0;
  try {
    runtimeTodayMinutes = tickServerRuntime(root, running, probedAt);
  } catch {
    runtimeTodayMinutes = 0;
  }

  return {
    running,
    cms,
    voice,
    commander,
    controlHttp,
    mcpHttp,
    supervisorAlive,
    supervisorPid,
    mode,
    uptimeSec,
    startedAt,
    probedAt,
    runtimeTodayMinutes,
    autoStart,
    modeLabel:
      mode === "attached"
        ? "пока Control открыт"
        : mode === "autostart"
          ? "автостарт"
          : mode === "background"
            ? "в фоне"
            : running
              ? "работает"
              : "остановлен",
    urls: {
      cms: cms ? `https://localhost:${ports.editorHttps}` : null,
      voice: voice ? `https://localhost:${ports.voiceHttps}` : null,
      commanderHttp: commander ? `http://localhost:${ports.commanderHttp}/` : null,
      commanderHttps: cms ? `https://localhost:${ports.editorHttps}/commander/` : null,
      controlHttp: controlHttp ? `http://localhost:${ports.controlHttp}/` : null,
      controlEditor: cms ? `https://localhost:${ports.editorHttps}/control/` : null
    }
  };
}

module.exports = {
  probeServerStatus,
  probeLaunchAgentStatus,
  loadActionsModule
};
