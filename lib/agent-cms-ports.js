/**
 * Порты Agent CMS Editor / Voice и флаг HTTP→HTTPS.
 * Новые имена: AGENT_CMS_EDITOR_* / AGENT_CMS_VOICE_*.
 * Legacy: PORT, TLS_PORT, VOICE_PORT, VOICE_TLS_PORT, HTTPS_REDIRECT.
 */

const fs = require("fs");
const path = require("path");

const DEFAULT_PORTS = {
  editorHttp: 3000,
  editorHttps: 3443,
  voiceHttp: 3088,
  voiceHttps: 3488
};

const PORT_ENV = {
  editorHttp: ["AGENT_CMS_EDITOR_HTTP_PORT", "PORT"],
  editorHttps: ["AGENT_CMS_EDITOR_HTTPS_PORT", "TLS_PORT"],
  voiceHttp: ["AGENT_CMS_VOICE_HTTP_PORT", "VOICE_PORT"],
  voiceHttps: ["AGENT_CMS_VOICE_HTTPS_PORT", "VOICE_TLS_PORT"]
};

function parseRootEnvFileContent(content) {
  const result = {};
  for (const line of String(content || "").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

function readPortFromEnv(env, keys, fallback) {
  for (const key of keys) {
    const raw = env[key];
    if (raw === undefined || raw === null || String(raw).trim() === "") continue;
    const numeric = Number(String(raw).trim());
    if (Number.isFinite(numeric) && numeric > 0 && numeric <= 65535) return numeric;
  }
  return fallback;
}

function getAgentCmsPorts(env = process.env) {
  return {
    editorHttp: readPortFromEnv(env, PORT_ENV.editorHttp, DEFAULT_PORTS.editorHttp),
    editorHttps: readPortFromEnv(env, PORT_ENV.editorHttps, DEFAULT_PORTS.editorHttps),
    voiceHttp: readPortFromEnv(env, PORT_ENV.voiceHttp, DEFAULT_PORTS.voiceHttp),
    voiceHttps: readPortFromEnv(env, PORT_ENV.voiceHttps, DEFAULT_PORTS.voiceHttps)
  };
}

function isHttpToHttpsRedirectEnabled(env = process.env) {
  const raw = env.AGENT_CMS_HTTP_TO_HTTPS ?? env.HTTPS_REDIRECT;
  if (raw === undefined || raw === null || String(raw).trim() === "") return true;
  const value = String(raw).trim().toLowerCase();
  return value !== "0" && value !== "false" && value !== "no" && value !== "off";
}

function hydrateProcessEnvFromRoot(projectRoot, env = process.env) {
  const root = path.resolve(String(projectRoot || "").trim() || process.cwd());
  const envPath = path.join(root, ".env");
  let fileEnv = {};
  try {
    fileEnv = parseRootEnvFileContent(fs.readFileSync(envPath, "utf8"));
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  for (const [key, value] of Object.entries(fileEnv)) {
    if (env[key] === undefined || env[key] === "") {
      env[key] = value;
    }
  }
  return env;
}

/** Синхронизирует legacy-имена для старого кода и дочерних процессов. */
function syncLegacyPortEnvVars(env = process.env) {
  const ports = getAgentCmsPorts(env);
  env.PORT = String(ports.editorHttp);
  env.TLS_PORT = String(ports.editorHttps);
  env.VOICE_PORT = String(ports.voiceHttp);
  env.VOICE_TLS_PORT = String(ports.voiceHttps);
  if (env.AGENT_CMS_HTTP_TO_HTTPS !== undefined && env.HTTPS_REDIRECT === undefined) {
    env.HTTPS_REDIRECT = env.AGENT_CMS_HTTP_TO_HTTPS;
  }
  return ports;
}

function allListenPorts(ports = getAgentCmsPorts()) {
  return [ports.voiceHttps, ports.voiceHttp, ports.editorHttps, ports.editorHttp];
}

function buildLocalhostUrls(ports = getAgentCmsPorts(), host = "localhost") {
  const h = String(host || "localhost").trim() || "localhost";
  return {
    editorHttp: `http://${h}:${ports.editorHttp}`,
    editorHttps: `https://${h}:${ports.editorHttps}`,
    voiceHttp: `http://${h}:${ports.voiceHttp}`,
    voiceHttps: `https://${h}:${ports.voiceHttps}`
  };
}

function printShellExports(projectRoot) {
  hydrateProcessEnvFromRoot(projectRoot);
  const ports = syncLegacyPortEnvVars();
  const urls = buildLocalhostUrls(ports);
  const lines = [
    `export AGENT_CMS_EDITOR_HTTP_PORT=${ports.editorHttp}`,
    `export AGENT_CMS_EDITOR_HTTPS_PORT=${ports.editorHttps}`,
    `export AGENT_CMS_VOICE_HTTP_PORT=${ports.voiceHttp}`,
    `export AGENT_CMS_VOICE_HTTPS_PORT=${ports.voiceHttps}`,
    `export PORT=${ports.editorHttp}`,
    `export TLS_PORT=${ports.editorHttps}`,
    `export VOICE_PORT=${ports.voiceHttp}`,
    `export VOICE_TLS_PORT=${ports.voiceHttps}`,
    `export AGENT_CMS_EDITOR_HTTPS_URL="${urls.editorHttps}"`,
    `export AGENT_CMS_VOICE_HTTPS_URL="${urls.voiceHttps}"`
  ];
  return lines.join("\n");
}

if (require.main === module) {
  const root = path.join(__dirname, "..");
  process.stdout.write(`${printShellExports(root)}\n`);
}

module.exports = {
  DEFAULT_PORTS,
  getAgentCmsPorts,
  isHttpToHttpsRedirectEnabled,
  hydrateProcessEnvFromRoot,
  syncLegacyPortEnvVars,
  allListenPorts,
  buildLocalhostUrls,
  printShellExports
};
