/**
 * Workspace graph/map lazy chunk (refactor 14) — каркас.
 * Следующие PR: перенос renderAgentMap* / renderAgentGraph* из main.js.
 */

/** @typedef {Record<string, unknown>} WorkspaceGraphHost */

/** @type {WorkspaceGraphHost | null} */
let host = null;

/**
 * @param {WorkspaceGraphHost} next
 */
export function registerWorkspaceGraphHost(next) {
  host = next && typeof next === "object" ? next : null;
}

/**
 * @param {"map" | "map2" | "map3" | "graph"} viewId
 */
export async function renderWorkspaceGraphView(viewId) {
  if (!host) {
    return { ok: false, reason: "host-not-registered" };
  }
  const fnName =
    viewId === "map"
      ? "renderAgentMapView"
      : viewId === "map2"
        ? "renderAgentMap2View"
        : viewId === "map3"
          ? "renderAgentMap3View"
          : viewId === "graph"
            ? "renderAgentGraphView"
            : "";
  const fn = fnName && typeof host[fnName] === "function" ? host[fnName] : null;
  if (!fn) {
    return { ok: false, reason: "renderer-missing" };
  }
  await fn();
  return { ok: true };
}
