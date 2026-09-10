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
  if (dialog.dataset.shellToolPermissionBound === "1") {
    return dialog.__shellToolPermissionApi || {};
  }
  dialog.dataset.shellToolPermissionBound = "1";

  const actionBtns = [allowBtn, denyBtn, allowSessionBtn].filter(Boolean);
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

  function setActionsEnabled(enabled) {
    for (const btn of actionBtns) {
      btn.disabled = !enabled;
      btn.setAttribute("aria-disabled", enabled ? "false" : "true");
    }
  }

  function closeDialog() {
    if (dialog.open && typeof dialog.close === "function") dialog.close();
  }

  function isRequestTracked(requestId) {
    const id = String(requestId || "").trim();
    if (!id) return false;
    if (active?.requestId === id) return true;
    return queue.some((item) => item?.requestId === id);
  }

  function purgeRequestId(requestId) {
    const id = String(requestId || "").trim();
    if (!id) return;
    for (let i = queue.length - 1; i >= 0; i -= 1) {
      if (queue[i]?.requestId === id) queue.splice(i, 1);
    }
  }

  function dismissAll() {
    queue.length = 0;
    active = null;
    busy = false;
    setActionsEnabled(true);
    closeDialog();
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
    setActionsEnabled(false);
    const item = active;
    const { requestId, agentId, toolName } = item;
    active = null;
    closeDialog();
    purgeRequestId(requestId);
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
      setStatus(
        decision.allow ? `Разрешено: ${shortenToolName(toolName)}` : "Инструмент отклонён"
      );
    } catch (error) {
      setStatus(String(error?.message || error || "Не удалось отправить решение"));
    } finally {
      busy = false;
      setActionsEnabled(true);
      showNext();
    }
  }

  function showNext() {
    if (active || busy || queue.length === 0) return;
    active = queue.shift();
    renderRequest(active);
    setActionsEnabled(true);
    if (!dialog.open && typeof dialog.showModal === "function") dialog.showModal();
  }

  function handleRequest(payload) {
    const requestId = String(payload?.requestId || "").trim();
    if (!requestId) return;
    const requestAgentId = String(payload?.agentId || resolveAgentId() || "").trim();
    const currentAgentId = resolveAgentId();
    if (currentAgentId && requestAgentId && requestAgentId !== currentAgentId) return;
    if (isRequestTracked(requestId)) return;
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
    if (!active || busy) return;
    event.preventDefault();
    void complete({ allow: false, scope: "once" });
  });

  const api = { handleRequest, dismissAll, hasPending: () => Boolean(active || queue.length) };
  dialog.__shellToolPermissionApi = api;
  return api;
}
