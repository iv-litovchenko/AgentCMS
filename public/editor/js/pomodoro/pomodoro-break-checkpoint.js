const CHECKPOINT_PREFIX = "🍅 Помодор · на чём остановился:";

function buildJournalAppendUrl(agentId) {
  if (typeof globalThis.buildApiUrl === "function") {
    return globalThis.buildApiUrl("/api/agent/workspace-journal/append", {}, agentId);
  }
  const id = encodeURIComponent(String(agentId || "main").trim() || "main");
  return `/api/agent/workspace-journal/append?agent=${id}`;
}

/**
 * @param {object} options
 * @param {HTMLInputElement | HTMLTextAreaElement | null} options.inputEl
 * @param {() => string} [options.getAgentId]
 * @param {() => Promise<{ path?: string, topic?: string }>} [options.resolveJournalContext]
 * @param {boolean} [options.linkContext]
 * @param {(kind: "success" | "error", message: string) => void} [options.onNotify]
 */
export function createPomodoroBreakCheckpoint(options = {}) {
  const inputEl = options.inputEl || null;
  const getAgentId = typeof options.getAgentId === "function" ? options.getAgentId : () => "main";
  const resolveJournalContext =
    typeof options.resolveJournalContext === "function"
      ? options.resolveJournalContext
      : async () => ({ path: "", topic: "" });
  const linkContext = options.linkContext !== false;
  const onNotify = typeof options.onNotify === "function" ? options.onNotify : null;

  let savedThisBreak = false;
  let saveInFlight = false;

  function reset() {
    savedThisBreak = false;
    if (inputEl) inputEl.value = "";
  }

  function focusInput() {
    inputEl?.focus({ preventScroll: true });
  }

  async function flush() {
    if (!inputEl || saveInFlight) return false;
    const note = String(inputEl.value || "").trim();
    if (!note || savedThisBreak) return false;

    saveInFlight = true;
    try {
      const ctx = await resolveJournalContext();
      const path = linkContext ? String(ctx.path || ctx.topic || "").trim() : "";
      const topic = linkContext ? String(ctx.topic || ctx.path || "").trim() : "";
      let body = `${CHECKPOINT_PREFIX} ${note}`;
      const urlHint = String(ctx.url || "").trim();
      if (urlHint) body += `\n${urlHint}`;
      const response = await fetch(buildJournalAppendUrl(getAgentId()), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          body,
          type: "action",
          author: "user",
          topic,
          path,
          notify: false
        })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      savedThisBreak = true;
      inputEl.value = "";
      onNotify?.("success", "Запись добавлена в журнал");
      if (typeof globalThis.refreshWorkspaceJournalSurfaces === "function") {
        void globalThis.refreshWorkspaceJournalSurfaces();
      }
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      onNotify?.("error", message);
      return false;
    } finally {
      saveInFlight = false;
    }
  }

  function onBreakOpen() {
    reset();
    requestAnimationFrame(() => focusInput());
  }

  function onBreakClose() {
    reset();
  }

  async function beforeBreakComplete() {
    await flush();
  }

  inputEl?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || !(event.metaKey || event.ctrlKey)) return;
    event.preventDefault();
    void flush();
  });

  return {
    reset,
    focusInput,
    flush,
    onBreakOpen,
    onBreakClose,
    beforeBreakComplete
  };
}
