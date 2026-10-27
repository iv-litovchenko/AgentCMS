"use strict";

const { getAgentCmsPorts } = require("../config/agent-cms-ports");
const { joinPublicUrl } = require("./platform-apps");
const { isSinglePublicHttpDoor } = require("./single-door-ports");

function isResolvePublicBaseUrlFallback(publicBase, env) {
  const trimmed = String(publicBase || "").trim();
  if (!trimmed) return true;
  try {
    const u = new URL(trimmed);
    const host = u.hostname.toLowerCase();
    if (host !== "localhost" && host !== "127.0.0.1") return false;
    const ports = getAgentCmsPorts(env);
    const portNum = u.port ? Number(u.port) : u.protocol === "https:" ? 443 : 80;
    return u.protocol === "http:" && portNum === ports.editorHttp;
  } catch {
    return true;
  }
}

function buildPublicDoorUrls(publicBase, env) {
  const base = String(publicBase || "").trim().replace(/\/+$/, "");
  if (!base || isResolvePublicBaseUrlFallback(base, env)) return null;
  if (isSinglePublicHttpDoor(env)) {
    return {
      editor: joinPublicUrl(base, "/"),
      voice: joinPublicUrl(base, "/app-chat"),
      commander: joinPublicUrl(base, "/app-commander"),
      control: joinPublicUrl(base, "/app-control"),
      mcp: joinPublicUrl(base, "/app-mcp")
    };
  }
  return {
    editor: joinPublicUrl(base, "/"),
    voice: null,
    commander: null,
    control: null,
    mcp: null
  };
}

module.exports = {
  isResolvePublicBaseUrlFallback,
  buildPublicDoorUrls
};
