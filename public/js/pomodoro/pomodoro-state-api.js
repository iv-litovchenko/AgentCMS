/** Клиент: помидор в `.agent-cms/rest/pomodoro.json` (по workspace). */
export const POMODORO_STATE_API_PATH = "/api/workspace/pomodoro/state";
export const POMODORO_WORKSPACE_PERSIST_MS = 15_000;

export function buildPomodoroStateUrl(agentId) {
  const id = String(agentId || "main").trim() || "main";
  return `${POMODORO_STATE_API_PATH}?agent=${encodeURIComponent(id)}`;
}

export function snapshotFromApiResponse(data) {
  const state = data?.state;
  if (!state || typeof state !== "object") return null;
  const phase = String(state.phase || "").trim();
  const phaseEndsAt = Number(state.phaseEndsAt);
  if (phase !== "work" && phase !== "break") return null;
  if (!Number.isFinite(phaseEndsAt) || phaseEndsAt <= 0) return null;
  const updatedMs = Date.parse(state.updatedAt);
  return {
    phase,
    phaseEndsAt,
    workMinutes: state.workMinutes != null ? Number(state.workMinutes) : null,
    updatedAt: Number.isFinite(updatedMs) ? updatedMs : Date.now()
  };
}

export function pickNewestPomodoroSnapshot(local, remote) {
  if (!local && !remote) return null;
  if (!local) return remote;
  if (!remote) return local;
  const localAt = Number(local.updatedAt) || 0;
  const remoteAt = Number(remote.updatedAt) || 0;
  return remoteAt >= localAt ? remote : local;
}

export async function readPomodoroWorkspaceState(agentId) {
  try {
    const response = await fetch(buildPomodoroStateUrl(agentId), { credentials: "same-origin" });
    if (!response.ok) return null;
    const data = await response.json();
    return snapshotFromApiResponse(data);
  } catch {
    return null;
  }
}

export async function writePomodoroWorkspaceState(agentId, snapshot) {
  const id = String(agentId || "main").trim() || "main";
  const body =
    !snapshot || snapshot.phase === "idle"
      ? { phase: "idle", phaseEndsAt: 0, updatedAt: Date.now() }
      : {
          phase: snapshot.phase,
          phaseEndsAt: snapshot.phaseEndsAt,
          workMinutes: snapshot.workMinutes ?? null,
          updatedAt: snapshot.updatedAt ?? Date.now()
        };
  try {
    const response = await fetch(buildPomodoroStateUrl(id), {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    return response.ok;
  } catch {
    return false;
  }
}
