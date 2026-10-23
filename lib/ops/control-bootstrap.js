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

function buildAnonymizedMcpConfig() {
  return {
    mcpServers: {
      "agent-cms": {
        command: "node",
        args: ["<ABS_PATH>/mcp-server/index.js"]
      }
    }
  };
}

function buildDeploymentInfo() {
  if (String(process.env.AGENT_CMS_DOCKER_OPS || "").trim() !== "1") {
    return {
      mode: "native",
      electronNote:
        "Desktop-приложения (Electron) запускают или подключаются к локальному серверу; на VPS — только Docker-стек."
    };
  }
  return {
    mode: "docker",
    composeFile: String(process.env.AGENT_CMS_COMPOSE_FILE || "").trim() || null,
    composeService: String(process.env.AGENT_CMS_COMPOSE_SERVICE || "cms").trim(),
    upServices: String(process.env.AGENT_CMS_DOCKER_UP_SERVICES || "cms mcp")
      .trim()
      .split(/\s+/)
      .filter(Boolean),
    electronNote:
      "Electron (.app на Mac) вне Docker — открывают Editor/Control как клиенты по AGENT_CMS_PUBLIC_URL или localhost."
  };
}

function buildMcpConnectInfo(root) {
  const { getServerPortsPayload } = loadActionsModule(root);
  const SERVER_PORTS = getServerPortsPayload();
  const publicUrl = String(process.env.AGENT_CMS_PUBLIC_URL || "").trim().replace(/\/$/, "");
  const cmsBaseUrl = publicUrl || `https://localhost:${SERVER_PORTS.editorHttps}`;
  const mcpServerPath = path.join(root, "mcp-server", "index.js");

  let docs = null;
  try {
    docs = enrichMcpDocsForClient(docsRegistry.getMcpDocs("0.0.2"), `localhost:${SERVER_PORTS.editorHttps}`, {
      projectRoot: root
    });
  } catch {
    docs = null;
  }

  const configJson = JSON.stringify(buildAnonymizedMcpConfig(), null, 2);
  const configJsonCopy = JSON.stringify(
    {
      mcpServers: {
        "agent-cms": {
          command: "node",
          args: [mcpServerPath]
        }
      }
    },
    null,
    2
  );

  return {
    cmsBaseUrl,
    mcpServerPath,
    configJson,
    configJsonCopy,
    docsUrl: `${cmsBaseUrl}/api/mcp-docs?version=0.0.2`
  };
}

function buildMobileConnectInfo(environment, root) {
  const { getServerPortsPayload } = loadActionsModule(root);
  const SERVER_PORTS = getServerPortsPayload();
  const lanIp = String(environment?.host?.lanIp || "").trim();
  const voiceHttpsPort = SERVER_PORTS.voiceHttps;
  const voiceHttpPort = SERVER_PORTS.voiceHttp;
  const voiceUrl = lanIp ? `https://${lanIp}:${voiceHttpsPort}/` : null;
  const mkcertCaUrl = lanIp ? `http://${lanIp}:${voiceHttpPort}/dev/mkcert-root-ca.pem` : null;

  return {
    lanIp: lanIp || null,
    voiceUrl,
    mkcertCaUrl,
    usesLoopback: !lanIp,
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
