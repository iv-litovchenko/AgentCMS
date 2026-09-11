/** Codex app-server approval request parsing and response building. */

const APPROVAL_METHODS = new Set([
  "item/commandExecution/requestApproval",
  "item/fileChange/requestApproval",
  "item/permissions/requestApproval"
]);

const USER_INPUT_METHOD = "item/tool/requestUserInput";

function resolveCodexApprovalPolicy(permissionMode) {
  const mode = String(permissionMode || "").trim();
  if (mode === "bypassPermissions") return "never";
  return "on-request";
}

function usesCodexBypass(permissionMode) {
  return String(permissionMode || "").trim() === "bypassPermissions";
}

function approvalCacheKey(method, params = {}) {
  if (method === "item/commandExecution/requestApproval") {
    return `${method}\0${String(params.command || "").trim()}`;
  }
  if (method === "item/fileChange/requestApproval") {
    return `${method}\0${String(params.grantRoot || params.reason || "").trim()}`;
  }
  try {
    return `${method}\0${JSON.stringify(params.permissions || {})}`;
  } catch {
    return method;
  }
}

function parseCodexApprovalRequest(method, params = {}, requestId) {
  if (method === "item/commandExecution/requestApproval") {
    const command = String(params.command || "").trim();
    const actions = Array.isArray(params.commandActions) ? params.commandActions : [];
    const actionSummary = actions
      .map((entry) => String(entry?.command || entry?.name || "").trim())
      .filter(Boolean)
      .join("\n");
    return {
      cliRequestId: String(requestId ?? ""),
      toolName: "Bash",
      toolInput: {
        command: command || actionSummary,
        cwd: params.cwd ?? null,
        reason: params.reason ?? null,
        kind: params.kind ?? null,
        networkApprovalContext: params.networkApprovalContext ?? null,
        commandActions: actions
      },
      toolUseId: String(params.itemId || "")
    };
  }

  if (method === "item/fileChange/requestApproval") {
    return {
      cliRequestId: String(requestId ?? ""),
      toolName: "Edit",
      toolInput: {
        reason: params.reason ?? null,
        grantRoot: params.grantRoot ?? null
      },
      toolUseId: String(params.itemId || "")
    };
  }

  if (method === "item/permissions/requestApproval") {
    return {
      cliRequestId: String(requestId ?? ""),
      toolName: "Permissions",
      toolInput: {
        permissions: params.permissions ?? null,
        reason: params.reason ?? null,
        cwd: params.cwd ?? null
      },
      toolUseId: String(params.itemId || "")
    };
  }

  return {
    cliRequestId: String(requestId ?? ""),
    toolName: String(method || "tool"),
    toolInput: params,
    toolUseId: String(params?.itemId || "")
  };
}

function buildCodexApprovalResponse(method, params = {}, { allow, scope = "once" } = {}) {
  const session = String(scope || "").trim() === "session";

  if (!allow) {
    if (method === "item/permissions/requestApproval") {
      return {
        permissions: {
          fileSystem: { entries: [] },
          network: { enabled: false }
        },
        scope: "turn"
      };
    }
    return { decision: "decline" };
  }

  if (method === "item/permissions/requestApproval") {
    return {
      permissions: params.permissions,
      scope: session ? "session" : "turn"
    };
  }

  return { decision: session ? "acceptForSession" : "accept" };
}

function normalizeCodexUserQuestions(raw = []) {
  const source = Array.isArray(raw) ? raw : [];
  const questions = [];
  const idByQuestion = new Map();

  for (const item of source) {
    if (!item || typeof item !== "object") continue;
    const question = String(item.question || "").trim();
    const id = String(item.id || "").trim();
    if (!question || !id) continue;
    idByQuestion.set(question, id);
    questions.push({
      question,
      header: String(item.header || "").trim(),
      multiSelect: false,
      options: Array.isArray(item.options)
        ? item.options
            .map((opt) => {
              if (!opt || typeof opt !== "object") return null;
              const label = String(opt.label || "").trim();
              if (!label) return null;
              return {
                label,
                description: String(opt.description || "").trim()
              };
            })
            .filter(Boolean)
        : []
    });
  }

  return { questions, idByQuestion };
}

function buildCodexUserInputResponse(codexQuestions = [], answersByQuestion = {}) {
  const answers = {};
  for (const item of Array.isArray(codexQuestions) ? codexQuestions : []) {
    if (!item || typeof item !== "object") continue;
    const id = String(item.id || "").trim();
    const question = String(item.question || "").trim();
    if (!id || !question) continue;
    const value = String(answersByQuestion[question] || "").trim();
    if (!value) continue;
    answers[id] = { answers: [value] };
  }
  return { answers };
}

module.exports = {
  APPROVAL_METHODS,
  USER_INPUT_METHOD,
  resolveCodexApprovalPolicy,
  usesCodexBypass,
  approvalCacheKey,
  parseCodexApprovalRequest,
  buildCodexApprovalResponse,
  normalizeCodexUserQuestions,
  buildCodexUserInputResponse
};
