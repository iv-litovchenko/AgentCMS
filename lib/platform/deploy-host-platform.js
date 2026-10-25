"use strict";

/** UI-платформа хоста (mac / linux / windows), не OS внутри контейнера. */
function resolveDeployHostPlatform(env = process.env) {
  const explicit = String(env.AGENT_CMS_DEPLOY_PLATFORM || env.AGENT_CMS_HOST_PLATFORM || "")
    .trim()
    .toLowerCase();
  if (explicit === "mac" || explicit === "macos" || explicit === "darwin") return "mac";
  if (explicit === "linux") return "linux";
  if (explicit === "windows" || explicit === "win32") return "windows";

  const composeHint = String(
    env.AGENT_CMS_HOST_COMPOSE_FILE || env.AGENT_CMS_COMPOSE_FILE || ""
  ).toLowerCase();
  if (composeHint.includes(".mac.") || composeHint.includes("mac.yml")) return "mac";
  if (composeHint.includes(".linux.") || composeHint.includes("linux.yml")) return "linux";

  return null;
}

module.exports = {
  resolveDeployHostPlatform
};
