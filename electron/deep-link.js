const PROTOCOL = "agentcms";

function parseDeepLink(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return null;

  try {
    const parsed = new URL(rawUrl);
    const protocol = parsed.protocol.replace(/:$/, "");
    if (protocol !== PROTOCOL) return null;

    const action = parsed.hostname || parsed.pathname.replace(/^\/+/, "") || "open";
    if (action !== "open") return null;

    const agentId = parsed.searchParams.get("agent");
    return { action: "open", agentId: agentId ? String(agentId).trim() : null };
  } catch {
    return null;
  }
}

function findDeepLinkInArgv(argv = []) {
  const match = argv.find((item) => typeof item === "string" && item.startsWith(`${PROTOCOL}://`));
  return match ? parseDeepLink(match) : null;
}

function buildAppUrl(serverUrl, deepLink) {
  if (!deepLink?.agentId) return serverUrl;
  const url = new URL(serverUrl);
  url.searchParams.set("agent", deepLink.agentId);
  return url.toString();
}

function registerProtocol(defaultAppPath) {
  const { app } = require("electron");

  if (process.defaultApp && defaultAppPath) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [defaultAppPath]);
    return;
  }

  app.setAsDefaultProtocolClient(PROTOCOL);
}

module.exports = {
  PROTOCOL,
  parseDeepLink,
  findDeepLinkInArgv,
  buildAppUrl,
  registerProtocol
};
