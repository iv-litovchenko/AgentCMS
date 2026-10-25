"use strict";

const { isSinglePublicHttpDoor, resolveVoicePublicBaseUrl } = require("../platform/single-door-ports");

/** Path prefix for Voice on single HTTP door, e.g. `/app-chat`. Empty on legacy multi-port dev. */
function resolveVoicePublicPathPrefix(env = process.env) {
  if (!isSinglePublicHttpDoor(env)) return "";

  const explicit = String(env.AGENT_CMS_VOICE_PUBLIC_PATH || "").trim().replace(/\/+$/, "");
  if (explicit) return explicit.startsWith("/") ? explicit : `/${explicit}`;

  const voiceBase = resolveVoicePublicBaseUrl(env);
  if (voiceBase) {
    try {
      const raw = voiceBase.includes("://") ? voiceBase : `http://127.0.0.1${voiceBase.startsWith("/") ? voiceBase : `/${voiceBase}`}`;
      const pathname = new URL(raw).pathname.replace(/\/+$/, "");
      if (pathname && pathname !== "/") return pathname;
    } catch {
      /* fall through */
    }
  }

  return "/app-chat";
}

function stripVoicePublicPrefix(pathname, prefix = resolveVoicePublicPathPrefix()) {
  const base = String(prefix || "").replace(/\/+$/, "");
  if (!base) return String(pathname || "/");

  const normalized = String(pathname || "/").replace(/\/+$/, "") || "/";
  if (normalized === base) return "/";
  if (normalized.startsWith(`${base}/`)) {
    const rest = normalized.slice(base.length);
    return rest || "/";
  }
  return String(pathname || "/");
}

function applyVoicePublicPrefix(innerPath, prefix = resolveVoicePublicPathPrefix()) {
  const base = String(prefix || "").replace(/\/+$/, "");
  let inner = String(innerPath || "/");
  if (!inner.startsWith("/")) inner = `/${inner}`;
  if (!base) return inner.endsWith("/") ? inner : `${inner.replace(/\/+$/, "")}/`;

  if (inner === "/" || inner === "") return `${base}/`;
  const withSlash = inner.endsWith("/") ? inner : `${inner}/`;
  return `${base}${withSlash}`;
}

module.exports = {
  resolveVoicePublicPathPrefix,
  stripVoicePublicPrefix,
  applyVoicePublicPrefix
};
