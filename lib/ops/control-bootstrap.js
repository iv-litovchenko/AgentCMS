"use strict";

const fs = require("fs");
const path = require("path");
const { buildSystemEnvironment } = require("../runtime/system-environment");
const { enrichMcpDocsForClient } = require("../http/https-redirect");
const docsRegistry = require("../docs/docs-registry");
const { probeServerStatus, loadActionsModule } = require("./control-server-probe");

function buildProjectSetupFlags(root) {
  return {
    depsOk: fs.existsSync(path.join(root, "node_modules")),
    certsOk: fs.existsSync(path.join(root, ".dev-certs", "cert.pem"))
  };
}

function buildStdioMcpClientConfig(scriptPath = "<ABS_PATH>/mcp-server/index.js") {
  return {
    mcpServers: {
      "agent-cms": {
        command: "node",
        args: [scriptPath]
      }
    }
  };
}

function buildHttpMcpClientConfig(mcpHttpUrl, token = "<AGENT_CMS_MCP_TOKEN>") {
  return {
    mcpServers: {
      "agent-cms": {
        url: String(mcpHttpUrl || "").trim(),
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    }
  };
}

function buildAnonymizedMcpConfig() {
  return buildStdioMcpClientConfig();
}

const { isDeployUpdateEnabled } = require("./ops-deploy-update");
const { resolveDeployHostPlatform } = require("../platform/deploy-host-platform");

function resolveHostPlatformForUi(env = process.env) {
  const fromDeploy = resolveDeployHostPlatform(env);
  if (fromDeploy) return fromDeploy;
  const p = String(process.platform || "").toLowerCase();
  if (p === "darwin") return "mac";
  if (p === "win32") return "windows";
  if (p === "linux") return "linux";
  return null;
}

function buildDeploymentInfo() {
  const updateEnabled = isDeployUpdateEnabled();
  const hostPlatform = resolveHostPlatformForUi(process.env);
  if (String(process.env.AGENT_CMS_DOCKER_OPS || "").trim() !== "1") {
    return {
      mode: "native",
      updateEnabled,
      hostPlatform,
      hostComposeFile: null,
      electronNote:
        "Desktop-приложения (Electron) запускают или подключаются к локальному серверу; на VPS — только Docker-стек."
    };
  }
  const os = require("os");
  const hostname = String(process.env.HOSTNAME || os.hostname() || "").trim();
  const containerShort =
    hostname.length > 12 ? hostname.slice(0, 12) : hostname || null;
  return {
    mode: "docker",
    updateEnabled,
    hostPlatform: hostPlatform || resolveDeployHostPlatform(process.env) || "linux",
    hostComposeFile:
      String(process.env.AGENT_CMS_HOST_COMPOSE_FILE || "").trim() ||
      String(process.env.AGENT_CMS_COMPOSE_FILE || "")
        .trim()
        .replace(/^.*\//, "") ||
      null,
    composeFile: String(process.env.AGENT_CMS_COMPOSE_FILE || "").trim() || null,
    composeProject: String(process.env.COMPOSE_PROJECT_NAME || "agent-cms").trim() || "agent-cms",
    composeService: String(process.env.AGENT_CMS_COMPOSE_SERVICE || "cms").trim(),
    controlService: "control",
    containerHostname: hostname || null,
    containerShort,
    upServices: String(process.env.AGENT_CMS_DOCKER_UP_SERVICES || "cms mcp")
      .trim()
      .split(/\s+/)
      .filter(Boolean),
    electronNote:
      "Mac/VPS: сервер только в Docker + браузер (Editor, /app-control). Electron (.app) — опциональный клиент по URL, не замена compose."
  };
}

function buildMcpConnectInfo(root) {
  const { getServerPortsPayload } = loadActionsModule(root);
  const SERVER_PORTS = getServerPortsPayload();
  const publicUrl = String(process.env.AGENT_CMS_PUBLIC_URL || "").trim().replace(/\/$/, "");
  const cmsBaseUrl = publicUrl || `https://localhost:${SERVER_PORTS.editorHttps}`;
  const { isSinglePublicHttpDoor } = require("../platform/single-door-ports");
  const mcpHttpUrl = isSinglePublicHttpDoor()
    ? `${cmsBaseUrl}/app-mcp`
    : `http://127.0.0.1:${SERVER_PORTS.mcpHttp}/mcp`;
  const mcpServerPath = path.join(root, "mcp-server", "index.js");

  let docs = null;
  try {
    docs = enrichMcpDocsForClient(docsRegistry.getMcpDocs("0.0.2"), `localhost:${SERVER_PORTS.editorHttps}`, {
      projectRoot: root
    });
  } catch {
    docs = null;
  }

  const useHttpMcp = isSinglePublicHttpDoor();
  const configJson = JSON.stringify(
    useHttpMcp ? buildHttpMcpClientConfig(mcpHttpUrl) : buildAnonymizedMcpConfig(),
    null,
    2
  );
  const configJsonCopy = JSON.stringify(
    useHttpMcp
      ? buildHttpMcpClientConfig(mcpHttpUrl, String(process.env.AGENT_CMS_MCP_TOKEN || "").trim() || "<AGENT_CMS_MCP_TOKEN>")
      : buildStdioMcpClientConfig(mcpServerPath),
    null,
    2
  );

  return {
    cmsBaseUrl,
    mcpHttpUrl,
    mcpServerPath,
    mcpConnectMode: useHttpMcp ? "http" : "stdio",
    configJson,
    configJsonCopy,
    docsUrl: `${cmsBaseUrl}/api/mcp-docs?version=0.0.2`
  };
}

function buildMobileConnectInfo(environment, root) {
  const { getServerPortsPayload } = loadActionsModule(root);
  const SERVER_PORTS = getServerPortsPayload();
  const lanIp = String(environment?.host?.lanIp || "").trim();
  const publicUrl = String(process.env.AGENT_CMS_PUBLIC_URL || "").trim().replace(/\/$/, "");
  const { isSinglePublicHttpDoor } = require("../platform/single-door-ports");
  const voiceHttpsPort = SERVER_PORTS.voiceHttps;
  const voiceHttpPort = SERVER_PORTS.voiceHttp;
  const dockerInternalLan = (ip) => /^172\.(1[6-9]|2\d|3[01])\./.test(String(ip || ""));

  let voiceUrl = null;
  let mkcertCaUrl = null;
  if (isSinglePublicHttpDoor() && publicUrl) {
    voiceUrl = `${publicUrl.replace(/\/+$/, "")}/app-chat/`;
  } else if (lanIp && !dockerInternalLan(lanIp)) {
    voiceUrl = `https://${lanIp}:${voiceHttpsPort}/`;
    mkcertCaUrl = `http://${lanIp}:${voiceHttpPort}/dev/mkcert-root-ca.pem`;
  }

  return {
    lanIp: lanIp && !dockerInternalLan(lanIp) ? lanIp : null,
    voiceUrl,
    mkcertCaUrl,
    usesLoopback: !lanIp || dockerInternalLan(lanIp),
    hotspotHint:
      lanIp && /^172\.20\.10\./.test(lanIp)
        ? "Mac на точке доступа iPhone — откройте этот адрес на телефоне."
        : null
  };
}

async function buildControlBootstrap(projectRoot, options = {}) {
  const root = path.resolve(String(projectRoot || process.cwd()));
  const {
    ACTIONS,
    APP_PRODUCTS,
    COMMANDER_SELF,
    CONTROL_SELF,
    SETUP_ACTIONS,
    getServerPortsPayload,
    getChromeExtensionConfig,
    SERVER_TEST,
    MCP_TEST
  } = loadActionsModule(root);
  const serverPorts = getServerPortsPayload();
  const chromeExtension = getChromeExtensionConfig();
  const environment = await buildSystemEnvironment(root).catch(() => null);
  const server = await probeServerStatus(root, {
    attachedServerProcess: options.attachedServerProcess
  });

  return {
    projectRoot: root,
    actions: ACTIONS,
    appProducts: APP_PRODUCTS,
    commanderSelf: COMMANDER_SELF,
    controlSelf: CONTROL_SELF,
    setupActionIds: SETUP_ACTIONS,
    serverPorts,
    serverTest: SERVER_TEST,
    mcpTest: MCP_TEST,
    mcpConnect: buildMcpConnectInfo(root),
    chromeExtension: {
      ...chromeExtension,
      folderPath: path.join(root, chromeExtension.folderName)
    },
    environment,
    mobileConnect: buildMobileConnectInfo(environment, root),
    server,
    setupFlags: buildProjectSetupFlags(root),
    launcherMode: options.launcherMode || "web",
    deployment: buildDeploymentInfo()
  };
}

module.exports = {
  buildControlBootstrap,
  buildMcpConnectInfo,
  buildMobileConnectInfo,
  buildProjectSetupFlags
};
