/** Pending Claude CLI AskUserQuestion → Shell UI (SSE) → answers in updatedInput. */

function requestKey(agentId, requestId) {
  return `${String(agentId || "").trim()}:${String(requestId || "").trim()}`;
}

function normalizeQuestions(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const question = String(item.question || "").trim();
      if (!question) return null;
      const options = Array.isArray(item.options)
        ? item.options
            .map((opt) => {
              if (!opt || typeof opt !== "object") return null;
              const label = String(opt.label || "").trim();
              if (!label) return null;
              return {
                label,
                description: String(opt.description || "").trim(),
                preview: opt.preview
              };
            })
            .filter(Boolean)
        : [];
      return {
        question,
        header: String(item.header || "").trim(),
        multiSelect: Boolean(item.multiSelect),
        options
      };
    })
    .filter(Boolean);
}

function createUserQuestionService({ emitShellEvent, timeoutMs = 300000 } = {}) {
  const pending = new Map();

  function requestQuestion(agentId, details = {}) {
    const cliRequestId = String(details.cliRequestId || "").trim();
    const questions = normalizeQuestions(details.questions ?? details.toolInput?.questions);
    const requestId = `auq-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const key = requestKey(agentId, requestId);

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(key);
        reject(new Error("AskUserQuestion timed out — откройте Shell и выберите вариант"));
      }, Math.max(10000, Math.min(Number(timeoutMs) || 300000, 600000)));

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
        questions,
        toolInput: details.toolInput ?? null
      });

      emitShellEvent(agentId, "user_question_request", {
        agentId: String(agentId || "").trim(),
        requestId,
        cliRequestId,
        toolUseId: String(details.toolUseId || "").trim(),
        streamId: String(details.streamId || "").trim(),
        questions
      });
    });
  }

  function completeQuestion(agentId, requestId, payload = {}) {
    const key = requestKey(agentId, requestId);
    const entry = pending.get(key);
    if (!entry) return false;

    if (Boolean(payload.cancelled)) {
      entry.resolve({ allow: false });
      return true;
    }

    const answers =
      payload.answers && typeof payload.answers === "object" && !Array.isArray(payload.answers)
        ? payload.answers
        : {};
    const questions = entry.questions.length
      ? entry.questions
      : normalizeQuestions(entry.toolInput?.questions);

    entry.resolve({
      allow: true,
      updatedInput: {
        questions,
        answers
      }
    });
    return true;
  }

  function rejectAllForAgent(agentId, reason = "Session closed") {
    const prefix = `${String(agentId || "").trim()}:`;
    for (const [key, entry] of pending.entries()) {
      if (!key.startsWith(prefix)) continue;
      entry.reject(new Error(reason));
    }
  }

  return { requestQuestion, completeQuestion, rejectAllForAgent, normalizeQuestions };
}

function isAskUserQuestionTool(toolName, toolInput, req = {}) {
  if (String(toolName || "").trim() === "AskUserQuestion") return true;
  if (Boolean(req.requires_user_interaction ?? req.requiresUserInteraction)) return true;
  return Array.isArray(toolInput?.questions) && toolInput.questions.length > 0;
}

module.exports = {
  createUserQuestionService,
  isAskUserQuestionTool,
  normalizeQuestions
};
