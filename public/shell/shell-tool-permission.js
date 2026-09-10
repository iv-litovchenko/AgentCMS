/** Claude CLI tool permission modal (SSE → Allow / Deny / session). */

function formatToolInput(value) {
  if (value == null || value === "") return "";
  if (typeof value === "string") return value.trim();
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function shortenToolName(name) {
  const raw = String(name || "tool").trim() || "tool";
  return raw.replace(/^mcp__[^_]+__/, "");
}

export function initShellToolPermission({
  dialog,
  titleEl,
  toolEl,
  inputEl,
  allowBtn,
  denyBtn,
  allowSessionBtn,
  apiFetch,
  getAgentId,
  onStatus
} = {}) {
  if (!dialog || !allowBtn || !denyBtn) return {};

  const queue = [];
  let active = null;
  let busy = false;

  function resolveAgentId(fallback = "") {
    if (typeof getAgentId === "function") {
      const id = String(getAgentId() || "").trim();
      if (id) return id;
    }
    return String(fallback || "").trim();
  }

  function setStatus(text) {
    if (typeof onStatus === "function") onStatus(String(text || "").trim());
  }

  function dismissAll() {
    queue.length = 0;
    active = null;
    busy = false;
    if (dialog.open && typeof dialog.close === "function") dialog.close();
  }

  function renderRequest(item) {
    const toolName = String(item?.toolName || "tool").trim() || "tool";
    if (titleEl) {
      titleEl.textContent = "Разрешить инструмент?";
    }
    if (toolEl) {
      toolEl.textContent = toolName;
      toolEl.title = toolName;
    }
    if (inputEl) {
      const body = formatToolInput(item?.toolInput);
      inputEl.value = body;
      inputEl.closest(".shell-field")?.classList.toggle("hidden", !body);
    }
    setStatus(`Claude запрашивает: ${shortenToolName(toolName)}`);
  }

  async function complete(decision) {
    if (!active || busy) return;
    busy = true;
    const requestId = active.requestId;
    const agentId = active.agentId;
    try {
      await apiFetch("/api/shell/tool-permission/complete", {
        agentId,
        method: "POST",
        body: JSON.stringify({
          agentId,
          requestId,
          allow: Boolean(decision.allow),
          scope: decision.scope === "session" ? "session" : "once"
        })
      });
      setStatus(decision.allow ? `Разрешено: ${shortenToolName(active.toolName)}` : "Инструмент отклонён");
    } catch (error) {
      setStatus(String(error?.message || error || "Не удалось отправить решение"));
    } finally {
      busy = false;
      active = null;
      if (typeof dialog.close === "function") dialog.close();
      showNext();
    }
  }

  function showNext() {
    if (active || busy || queue.length === 0) return;
    active = queue.shift();
    renderRequest(active);
    if (typeof dialog.showModal === "function") dialog.showModal();
  }

  function handleRequest(payload) {
    const requestId = String(payload?.requestId || "").trim();
    if (!requestId) return;
    const requestAgentId = String(payload?.agentId || resolveAgentId() || "").trim();
    const currentAgentId = resolveAgentId();
    if (currentAgentId && requestAgentId && requestAgentId !== currentAgentId) return;
    queue.push({
      agentId: requestAgentId || currentAgentId,
      requestId,
      cliRequestId: String(payload?.cliRequestId || "").trim(),
      toolName: String(payload?.toolName || "tool").trim() || "tool",
      toolInput: payload?.toolInput ?? null,
      toolUseId: String(payload?.toolUseId || "").trim()
    });
    showNext();
  }

  allowBtn.addEventListener("click", (event) => {
    event.preventDefault();
    void complete({ allow: true, scope: "once" });
  });

  denyBtn.addEventListener("click", (event) => {
    event.preventDefault();
    void complete({ allow: false, scope: "once" });
  });

  allowSessionBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    void complete({ allow: true, scope: "session" });
  });

  dialog.addEventListener("cancel", (event) => {
    if (!active) return;
    event.preventDefault();
    void complete({ allow: false, scope: "once" });
  });

  return { handleRequest, dismissAll, hasPending: () => Boolean(active || queue.length) };
}
