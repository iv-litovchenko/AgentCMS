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

function buildMcpConnectInfo(root) {
  const { getServerPortsPayload } = loadActionsModule(root);
  const SERVER_PORTS = getServerPortsPayload();
  const cmsBaseUrl = `https://localhost:${SERVER_PORTS.editorHttps}`;
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
    launcherMode: options.launcherMode || "web"
  };
}

module.exports = {
  buildControlBootstrap,
  buildMcpConnectInfo,
  buildMobileConnectInfo,
  buildProjectSetupFlags
};
