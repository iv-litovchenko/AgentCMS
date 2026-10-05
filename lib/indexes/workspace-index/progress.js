const progressByAgentRoot = new Map();

function normalizeKey(agentRoot) {
  return String(agentRoot || "").trim();
}

function startWorkspaceIndexProgress(agentRoot, layer, total = 0) {
  const key = normalizeKey(agentRoot);
  if (!key) return;
  progressByAgentRoot.set(key, {
    running: true,
    layer: String(layer || ""),
    current: 0,
    total: Math.max(0, Number(total) || 0),
    path: "",
    startedAt: Date.now()
  });
}

function tickWorkspaceIndexProgress(agentRoot, current, total, path = "") {
  const key = normalizeKey(agentRoot);
  const state = progressByAgentRoot.get(key);
  if (!state) return;
  state.current = Math.max(0, Number(current) || 0);
  if (total != null && Number.isFinite(Number(total))) {
    state.total = Math.max(0, Number(total) || 0);
  }
  if (path) state.path = String(path);
}

function finishWorkspaceIndexProgress(agentRoot) {
  progressByAgentRoot.delete(normalizeKey(agentRoot));
}

function getWorkspaceIndexProgress(agentRoot) {
  const state = progressByAgentRoot.get(normalizeKey(agentRoot));
  if (!state) return { running: false };
  return { ...state };
}

module.exports = {
  startWorkspaceIndexProgress,
  tickWorkspaceIndexProgress,
  finishWorkspaceIndexProgress,
  getWorkspaceIndexProgress
};
