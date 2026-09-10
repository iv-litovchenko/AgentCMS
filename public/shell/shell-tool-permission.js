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

  function closeDialogImmediately() {
    dialog.classList.add("shell-tool-permission--closing");
    dialog.inert = true;
    if (typeof dialog.close === "function") {
      try {
        dialog.close();
      } catch {
        /* ignore */
      }
    }
    dialog.removeAttribute("open");
  }

  function openDialog() {
    dialog.classList.remove("shell-tool-permission--closing");
    dialog.inert = false;
    if (!dialog.open && typeof dialog.showModal === "function") dialog.showModal();
  }

  function isRequestTracked(requestId, cliRequestId = "") {
    const id = String(requestId || "").trim();
    const cliId = String(cliRequestId || "").trim();
    if (id && (active?.requestId === id || queue.some((item) => item?.requestId === id))) {
      return true;
    }
    if (
      cliId &&
      (active?.cliRequestId === cliId || queue.some((item) => item?.cliRequestId === cliId))
    ) {
      return true;
    }
    return false;
  }

  function purgeRequestIds(ids) {
    const drop = new Set(
      (Array.isArray(ids) ? ids : [ids])
        .map((id) => String(id || "").trim())
        .filter(Boolean)
    );
    if (!drop.size) return;
    for (let i = queue.length - 1; i >= 0; i -= 1) {
      if (drop.has(queue[i]?.requestId)) queue.splice(i, 1);
    }
  }

  function collectCompletionBatch(item, decision) {
    const batch = [item];
    const toolName = String(item?.toolName || "").trim();
    const cliRequestId = String(item?.cliRequestId || "").trim();
    const sameSessionTool = Boolean(decision.allow && decision.scope === "session" && toolName);
    for (let i = queue.length - 1; i >= 0; i -= 1) {
      const queued = queue[i];
      if (!queued) continue;
      const sameRequest = cliRequestId && queued.cliRequestId === cliRequestId;
      const sameTool = sameSessionTool && queued.toolName === toolName;
      if (!sameRequest && !sameTool) continue;
      batch.push(queued);
      queue.splice(i, 1);
    }
    return batch;
  }

  async function postDecision(item, decision) {
    const { requestId, agentId } = item;
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
  }

  function dismissAll() {
    queue.length = 0;
    active = null;
    busy = false;
    setActionsEnabled(true);
    closeDialogImmediately();
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

  function beginDecision(decision) {
    if (!active || busy) return null;
    const item = active;
    const batch = collectCompletionBatch(item, decision);
    active = null;
    busy = true;
    closeDialogImmediately();
    setActionsEnabled(false);
    purgeRequestIds(batch.map((entry) => entry.requestId));
    return { batch, decision, toolName: item.toolName };
  }

  async function complete(decision) {
    const started = beginDecision(decision);
    if (!started) return;
    const { batch, toolName } = started;
    try {
      await Promise.all(batch.map((item) => postDecision(item, decision)));
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
    openDialog();
  }

  function handleRequest(payload) {
    const requestId = String(payload?.requestId || "").trim();
    if (!requestId) return;
    const cliRequestId = String(payload?.cliRequestId || "").trim();
    const requestAgentId = String(payload?.agentId || resolveAgentId() || "").trim();
    const currentAgentId = resolveAgentId();
    if (currentAgentId && requestAgentId && requestAgentId !== currentAgentId) return;
    if (isRequestTracked(requestId, cliRequestId)) return;
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

  function bindInstantDecision(btn, decision) {
    if (!btn) return;
    btn.addEventListener(
      "pointerdown",
      (event) => {
        if (event.button !== 0 || !active || busy) return;
        closeDialogImmediately();
      },
      { capture: true }
    );
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      void complete(decision);
    });
  }

  bindInstantDecision(allowBtn, { allow: true, scope: "once" });
  bindInstantDecision(denyBtn, { allow: false, scope: "once" });
  bindInstantDecision(allowSessionBtn, { allow: true, scope: "session" });

  dialog.addEventListener("cancel", (event) => {
    if (!active || busy) return;
    event.preventDefault();
    void complete({ allow: false, scope: "once" });
  });

  const api = { handleRequest, dismissAll, hasPending: () => Boolean(active || queue.length) };
  dialog.__shellToolPermissionApi = api;
  return api;
}
