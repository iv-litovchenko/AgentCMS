/** Pending Claude CLI tool permission requests → Shell UI (SSE) → user decision. */

function requestKey(agentId, requestId) {
  return `${String(agentId || "").trim()}:${String(requestId || "").trim()}`;
}

function createToolPermissionService({ emitShellEvent, timeoutMs = 120000 } = {}) {
  const pending = new Map();

  function findPendingByCliRequestId(agentId, cliRequestId) {
    const cliId = String(cliRequestId || "").trim();
    const prefix = `${String(agentId || "").trim()}:`;
    if (!cliId || !prefix.trim()) return null;
    for (const [key, entry] of pending.entries()) {
      if (!key.startsWith(prefix)) continue;
      if (entry?.cliRequestId === cliId && entry?.promise) return entry;
    }
    return null;
  }

  function requestPermission(agentId, details = {}) {
    const cliRequestId = String(details.cliRequestId || "").trim();
    const existing = findPendingByCliRequestId(agentId, cliRequestId);
    if (existing?.promise) return existing.promise;

    const toolName = String(details.toolName || "tool").trim() || "tool";
    const requestId = `perm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const key = requestKey(agentId, requestId);

    const promise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(key);
        reject(new Error("Tool permission timed out — откройте Shell и подтвердите инструмент"));
      }, Math.max(5000, Math.min(Number(timeoutMs) || 120000, 300000)));

      const payload = {
        agentId: String(agentId || "").trim(),
        requestId,
        cliRequestId,
        toolName,
        toolInput: details.toolInput ?? null,
        toolUseId: String(details.toolUseId || "").trim(),
        streamId: String(details.streamId || "").trim()
      };

      pending.set(key, {
        resolve: (value) => {
          clearTimeout(timer);
          pending.delete(key);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timer);
          pending.delete(key);
          reject(error);
        },
        cliRequestId,
        toolName,
        payload,
        promise: null
      });

      emitShellEvent(agentId, "tool_permission_request", payload);
    });

    const entry = pending.get(key);
    if (entry) entry.promise = promise;
    return promise;
  }

  function completePermission(agentId, requestId, decision = {}) {
    const key = requestKey(agentId, requestId);
    const entry = pending.get(key);
    if (!entry) return false;
    const allow = Boolean(decision.allow);
    const scope = String(decision.scope || "once").trim() === "session" ? "session" : "once";
    entry.resolve({ allow, scope, toolName: entry.toolName, cliRequestId: entry.cliRequestId });
    return true;
  }

  function rejectAllForAgent(agentId, reason = "Session closed") {
    const prefix = `${String(agentId || "").trim()}:`;
    for (const [key, entry] of pending.entries()) {
      if (!key.startsWith(prefix)) continue;
      entry.reject(new Error(reason));
    }
  }

  function replayPendingForAgent(agentId) {
    const prefix = `${String(agentId || "").trim()}:`;
    for (const [key, entry] of pending.entries()) {
      if (!key.startsWith(prefix) || !entry?.payload) continue;
      emitShellEvent(agentId, "tool_permission_request", entry.payload);
    }
  }

  return { requestPermission, completePermission, rejectAllForAgent, replayPendingForAgent };
}

function parseClaudeCanUseToolRequest(event) {
  if (!event || typeof event !== "object") return null;
  const type = String(event.type || "").trim();
  if (type !== "control_request" && type !== "sdk_control_request") return null;

  const req = event.request && typeof event.request === "object" ? event.request : {};
  const subtype = String(req.subtype || "").trim();
  if (subtype !== "can_use_tool" && subtype !== "permission") return null;

  const requestId = String(event.request_id || req.request_id || "").trim();
  if (!requestId) return null;

  const toolName = String(req.tool_name || req.toolName || "").trim() || "tool";
  const toolInput = req.input ?? req.tool_input ?? req.toolInput ?? null;
  const toolUseId = String(req.tool_use_id || req.toolUseId || "").trim();
  const requiresUserInteraction = Boolean(
    req.requires_user_interaction ?? req.requiresUserInteraction
  );
  const permissionSuggestions = Array.isArray(req.permission_suggestions)
    ? req.permission_suggestions
    : Array.isArray(req.permissionSuggestions)
      ? req.permissionSuggestions
      : [];

  return {
    requestId,
    toolName,
    toolInput,
    toolUseId,
    requiresUserInteraction,
    permissionSuggestions
  };
}

function normalizeToolInput(toolInput) {
  return toolInput && typeof toolInput === "object" && !Array.isArray(toolInput) ? toolInput : {};
}

function buildClaudeControlAllowResponse(
  requestId,
  { updatedInput, toolUseId, updatedPermissions } = {}
) {
  const decision = {
    behavior: "allow",
    updatedInput: normalizeToolInput(updatedInput)
  };
  const useId = String(toolUseId || "").trim();
  if (useId) decision.toolUseID = useId;
  if (updatedPermissions) decision.updatedPermissions = updatedPermissions;
  return {
    type: "control_response",
    response: {
      subtype: "success",
      request_id: requestId,
      response: decision
    }
  };
}

function buildClaudeControlDenyResponse(requestId, reason = "", { toolUseId } = {}) {
  const decision = { behavior: "deny", message: String(reason || "Отклонено") };
  const useId = String(toolUseId || "").trim();
  if (useId) decision.toolUseID = useId;
  return {
    type: "control_response",
    response: {
      subtype: "success",
      request_id: requestId,
      response: decision
    }
  };
}

module.exports = {
  createToolPermissionService,
  parseClaudeCanUseToolRequest,
  buildClaudeControlAllowResponse,
  buildClaudeControlDenyResponse
};
