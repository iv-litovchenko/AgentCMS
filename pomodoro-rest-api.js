const fs = require("fs/promises");
const { rel, abs } = require("./paths/agent-cms");

const STATE_REL_PATH = rel.rest.pomodoroState;

const VALID_PHASES = new Set(["idle", "work", "break"]);

function normalizeStatePayload(raw) {
  if (!raw || typeof raw !== "object") {
    return { error: "Invalid payload" };
  }
  const phase = String(raw.phase || "idle").trim().toLowerCase();
  if (!VALID_PHASES.has(phase)) {
    return { error: "Invalid phase" };
  }
  if (phase === "idle") {
    return {
      phase: "idle",
      phaseEndsAt: 0,
      workMinutes: null,
      updatedAt: new Date().toISOString()
    };
  }
  const phaseEndsAt = Number(raw.phaseEndsAt);
  if (!Number.isFinite(phaseEndsAt) || phaseEndsAt <= 0) {
    return { error: "Invalid phaseEndsAt" };
  }
  let workMinutes = raw.workMinutes;
  if (workMinutes != null && workMinutes !== "") {
    workMinutes = parseInt(String(workMinutes).trim(), 10);
    if (!Number.isFinite(workMinutes) || workMinutes <= 0) workMinutes = null;
  } else {
    workMinutes = null;
  }
  const clientUpdated = Number(raw.updatedAt);
  const updatedAt =
    Number.isFinite(clientUpdated) && clientUpdated > 0
      ? new Date(clientUpdated).toISOString()
      : new Date().toISOString();
  return {
    phase,
    phaseEndsAt: Math.floor(phaseEndsAt),
    workMinutes,
    updatedAt
  };
}

function clientSnapshotFromState(state) {
  if (!state || state.phase === "idle") return null;
  const updatedMs = Date.parse(state.updatedAt);
  return {
    phase: state.phase,
    phaseEndsAt: state.phaseEndsAt,
    workMinutes: state.workMinutes,
    updatedAt: Number.isFinite(updatedMs) ? updatedMs : Date.now()
  };
}

async function readPomodoroState(agentRoot) {
  if (!agentRoot) {
    return { exists: false, state: null, path: STATE_REL_PATH };
  }
  const absolute = abs(agentRoot, STATE_REL_PATH);
  try {
    const raw = await fs.readFile(absolute, "utf-8");
    const parsed = JSON.parse(raw);
    const normalized = normalizeStatePayload(parsed);
    if (normalized.error) {
      return { exists: true, state: null, corrupt: true, path: STATE_REL_PATH };
    }
    if (normalized.phase === "idle") {
      return { exists: false, state: null, path: STATE_REL_PATH };
    }
    return { exists: true, state: normalized, path: STATE_REL_PATH };
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return { exists: false, state: null, path: STATE_REL_PATH };
    }
    throw error;
  }
}

async function writePomodoroState(agentRoot, payload) {
  if (!agentRoot) throw new Error("Agent root is required");
  const normalized = normalizeStatePayload(payload);
  if (normalized.error) {
    return { error: normalized.error, status: 400 };
  }
  const absolute = abs(agentRoot, STATE_REL_PATH);
  if (normalized.phase === "idle") {
    try {
      await fs.unlink(absolute);
    } catch (error) {
      if (!error || error.code !== "ENOENT") throw error;
    }
    return { path: STATE_REL_PATH, exists: false, state: null };
  }
  await fs.mkdir(abs(agentRoot, rel.rest.dir), { recursive: true });
  await fs.writeFile(absolute, `${JSON.stringify(normalized, null, 2)}\n`, "utf-8");
  return { path: STATE_REL_PATH, exists: true, state: normalized };
}

module.exports = {
  STATE_REL_PATH,
  clientSnapshotFromState,
  readPomodoroState,
  writePomodoroState
};
