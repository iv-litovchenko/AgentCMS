"use strict";

const net = require("net");
const path = require("path");
const { getAgentCmsPorts, buildLocalhostUrls } = require("../config/agent-cms-ports");
const { isPlatformMaintenanceMode } = require("../workspace/workspace-agent-settings");

const SERVICE_DEFS = [
  {
    id: "editor",
    title: "Agent CMS Editor",
    shortName: "Editor",
    accent: "cms",
    icon: "cms.svg",
    portKey: "editorHttps",
    altPortKey: "editorHttp",
    protocol: "HTTPS",
    path: "/"
  },
  {
    id: "voice",
    title: "Agent CMS Voice-Chat",
    shortName: "Chat",
    accent: "voice",
    icon: "voice.svg",
    portKey: "voiceHttps",
    altPortKey: "voiceHttp",
    protocol: "HTTPS",
    path: "/"
  },
  {
    id: "commander",
    title: "Agent CMS Commander",
    shortName: "Commander",
    accent: "commander",
    icon: "commander.svg",
    portKey: "commanderHttp",
    protocol: "HTTP",
    path: "/",
    editorPath: "/commander/"
  },
  {
    id: "mcp",
    title: "Agent CMS MCP",
    shortName: "MCP",
    accent: "mcp",
    icon: "mcp.svg",
    portKey: "mcpHttp",
    protocol: "HTTP",
    path: "/health",
    editorPingPath: "/api/agent/mcp-ping"
  },
  {
    id: "control",
    title: "Agent CMS Control (Launcher)",
    shortName: "Control",
    accent: "control",
    icon: "control.svg",
    portKey: "controlHttp",
    protocol: "HTTP",
    path: "/"
  }
];

function probeTcpPort(port, host = "127.0.0.1", timeoutMs = 450) {
  return new Promise((resolve) => {
    const numeric = Number(port);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      resolve(false);
      return;
    }

    const socket = net.connect({ host, port: numeric });
    let settled = false;

    const finish = (ok) => {
      if (settled) return;
      settled = true;
      try {
        socket.destroy();
      } catch {
        // ignore
      }
      resolve(Boolean(ok));
    };

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

function buildServiceUrls(ports, hostHeader = "") {
  const host = String(hostHeader || "")
    .split(":")[0]
    .trim();
  const publicHost = host && host !== "localhost" && host !== "127.0.0.1" ? host : "localhost";
  const urls = buildLocalhostUrls(ports, publicHost);
  return {
    editor: urls.editorHttps,
    editorHttp: urls.editorHttp,
    voice: urls.voiceHttps,
    voiceHttp: urls.voiceHttp,
    commanderHttp: `${urls.commanderHttp}/`,
    commanderHttps: `${urls.editorHttps}/commander/`,
    mcpHttp: `${urls.mcpHttp}/health`,
    mcpPing: `${urls.editorHttps}/api/agent/mcp-ping`,
    control: `${urls.editorHttps}/control/`,
    controlHttp: `${urls.controlHttp}/`
  };
}

async function buildOpsStatus({
  projectRoot,
  hostHeader = "",
  getPlatformSettings,
  buildAgentMcpPing,
  packageVersion = null
} = {}) {
  const ports = getAgentCmsPorts();
  const urls = buildServiceUrls(ports, hostHeader);

  const [editorHttps, editorHttp, voiceHttps, voiceHttp, commanderHttp, controlHttp, mcpHttp] =
    await Promise.all([
      probeTcpPort(ports.editorHttps),
      probeTcpPort(ports.editorHttp),
      probeTcpPort(ports.voiceHttps),
      probeTcpPort(ports.voiceHttp),
      probeTcpPort(ports.commanderHttp),
      probeTcpPort(ports.controlHttp),
      probeTcpPort(ports.mcpHttp)
    ]);

  let mcpPingOk = null;
  try {
    if (typeof buildAgentMcpPing === "function") {
      const ping = buildAgentMcpPing();
      mcpPingOk = Boolean(ping?.ok);
    }
  } catch {
    mcpPingOk = false;
  }

  let maintenance = false;
  try {
    if (typeof getPlatformSettings === "function") {
      const settings = await getPlatformSettings(projectRoot || process.cwd());
      maintenance = isPlatformMaintenanceMode(settings);
    }
  } catch {
    maintenance = false;
  }

  const services = SERVICE_DEFS.map((def) => {
    const port = ports[def.portKey];
    const altListening =
      def.altPortKey && ports[def.altPortKey] != null
        ? Boolean(
            def.id === "editor"
              ? editorHttp
              : def.id === "voice"
                ? voiceHttp
                : false
          )
        : false;

    let listening = false;
    let state = "off";
    let label = "Не запущен";
    let detail = "порт свободен";
    let openUrl = null;

    if (def.id === "editor") {
      listening = editorHttps || editorHttp;
      if (listening) {
        state = "on";
        label = "В сети";
        detail = editorHttps ? "HTTPS localhost" : "HTTP localhost";
        openUrl = editorHttps ? urls.editor : urls.editorHttp;
      }
    } else if (def.id === "voice") {
      listening = voiceHttps || voiceHttp;
      if (listening) {
        state = "on";
        label = "В сети";
        detail = voiceHttps ? "HTTPS localhost" : "HTTP localhost";
        openUrl = voiceHttps ? urls.voice : urls.voiceHttp;
      }
    } else if (def.id === "commander") {
      listening = commanderHttp;
      if (listening) {
        state = "on";
        label = "В сети";
        detail = "HTTP localhost";
        openUrl = urls.commanderHttp;
      } else if (editorHttps || editorHttp) {
        state = "on";
        label = "Через Editor";
        detail = `/commander/ · :${ports.editorHttps}`;
        openUrl = urls.commanderHttps;
      }
    } else if (def.id === "control") {
      listening = controlHttp;
      if (listening) {
        state = "on";
        label = "В сети";
        detail = "HTTP localhost";
        openUrl = urls.controlHttp;
      } else if (editorHttps || editorHttp) {
        state = "on";
        label = "Через Editor";
        detail = `/control/ · :${ports.editorHttps}`;
        openUrl = urls.control;
      }
    } else if (def.id === "mcp") {
      listening = mcpHttp;
      if (mcpPingOk === true || listening) {
        state = "on";
        label = "В сети";
        const parts = [];
        if (mcpPingOk === true) parts.push("API mcp-ping");
        if (listening) parts.push(`HTTP :${port}`);
        detail = parts.join(" · ") || "MCP";
        openUrl = listening ? urls.mcpHttp : urls.mcpPing;
      } else if (mcpPingOk === false && (editorHttps || editorHttp)) {
        state = "off";
        label = "Не отвечает";
        detail = "mcp-ping без ответа";
      } else {
        detail = "нужен запущенный сервер";
      }
    }

    return {
      id: def.id,
      title: def.title,
      shortName: def.shortName,
      accent: def.accent,
      icon: def.icon,
      protocol: def.protocol,
      port,
      listening,
      state,
      label,
      detail,
      openUrl
    };
  });

  const online = services.filter((svc) => svc.state === "on").length;

  return {
    ok: true,
    probedAt: Date.now(),
    role: "web-ops",
    note: `Agent CMS Control (Launcher) — HTTP :${ports.controlHttp}. UI: desktop/agent-control/ui (Electron на Mac или браузер).`,
    version: packageVersion || null,
    maintenance,
    ports,
    urls,
    summary: {
      online,
      total: services.length
    },
    services,
    self: {
      editorHttps,
      editorHttp,
      voiceHttps,
      voiceHttp,
      commanderHttp,
      controlHttp,
      mcpHttp,
      mcpPingOk
    }
  };
}

module.exports = {
  SERVICE_DEFS,
  probeTcpPort,
  buildOpsStatus,
  buildServiceUrls
};
