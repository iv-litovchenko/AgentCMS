"use strict";

const { getAgentCmsPorts } = require("../config/agent-cms-ports");

function isSinglePublicHttpDoor(env = process.env) {
  const flag = String(env.AGENT_CMS_SINGLE_HTTP_DOOR ?? "").trim().toLowerCase();
  if (flag === "0" || flag === "false" || flag === "no") return false;
  if (flag === "1" || flag === "true" || flag === "yes") return true;
  const expose = String(env.AGENT_CMS_EXPOSE_INTERNAL_PORTS ?? "").trim().toLowerCase();
  if (expose === "1" || expose === "true" || expose === "yes") return false;
  return true;
}

/** Порты для UI: при одной двери voice/control/mcp/commander = editor (path-based). */
function getClientFacingPorts(env = process.env) {
  const ports = getAgentCmsPorts(env);
  if (!isSinglePublicHttpDoor(env)) return { ...ports };
  return {
    ...ports,
    voiceHttp: ports.editorHttp,
    voiceHttps: ports.editorHttps,
    commanderHttp: ports.editorHttp,
    controlHttp: ports.editorHttp,
    mcpHttp: ports.editorHttp
  };
}

function resolveVoicePublicBaseUrl(env = process.env, publicBase = "") {
  const explicit = String(env.VOICE_PUBLIC_URL || env.VOICE_BASE_URL || "").trim().replace(/\/+$/, "");
  if (explicit) return explicit;
  const base = String(publicBase || env.AGENT_CMS_PUBLIC_URL || "").trim().replace(/\/+$/, "");
  if (base && isSinglePublicHttpDoor(env)) return `${base}/app-chat`;
  return "";
}

module.exports = {
  isSinglePublicHttpDoor,
  getClientFacingPorts,
  resolveVoicePublicBaseUrl
};
