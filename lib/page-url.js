const {
  resolveChpuPath,
  workspaceRelToChpuPath,
  appendChpuViewToPath,
  buildAppPathname
} = require("./config/chpu-resolver");

function normalizeWorkspaceInputPath(inputPath) {
  return String(inputPath || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}

async function buildPageUrlPayload(agentRoot, agentId, inputPath, options = {}) {
  const normalized = normalizeWorkspaceInputPath(inputPath);
  const baseUrl = String(options.baseUrl || "")
    .trim()
    .replace(/\/+$/, "");
  if (!baseUrl) {
    throw new Error("baseUrl is required");
  }
  if (!agentId) {
    throw new Error("agentId is required");
  }

  let chpuPath = workspaceRelToChpuPath(normalized);
  const view = String(options.view || "").trim();
  if (view) {
    chpuPath = appendChpuViewToPath(chpuPath, view, { force: Boolean(options.forceView) });
  }

  const resolved = await resolveChpuPath(agentRoot, chpuPath);
  const pathname = buildAppPathname(agentId, chpuPath);
  const url = `${baseUrl}${pathname}`;
  const ok = resolved.kind !== "unknown";

  return {
    ok,
    url,
    pathname,
    agentId,
    workspacePath: normalized || null,
    chpuPath,
    view: resolved.view || view || null,
    resolved: {
      kind: resolved.kind,
      workspacePath: resolved.workspacePath ?? null,
      topicManifestPath: resolved.topicManifestPath ?? null
    },
    hint: ok
      ? "Share url in chat — opens Agent CMS at this page when CMS is running."
      : "Could not resolve path — URL may not open. Check path with resolve_workspace_path."
  };
}

module.exports = {
  buildPageUrlPayload,
  normalizeWorkspaceInputPath
};
