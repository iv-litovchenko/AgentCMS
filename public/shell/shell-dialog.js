/** Mobile-style dialog: history, refresh, copy, errors. */

import { renderShellReplyBody, renderUserMessageBody, scheduleShellMermaidTypeset } from "@shell/markdown";

const MAX_HISTORY = 50;

function formatHistoryTime(at) {
  try {
    return new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(new Date(at));
  } catch {
    return "";
  }
}

function formatReplyDuration(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n) || n < 0) return "";
  const sec = n / 1000;
  if (sec < 10) {
    const rounded = Math.round(sec * 10) / 10;
    return `${String(rounded).replace(".", ",")} с`;
  }
  return `${Math.round(sec)} с`;
}

function withReplyDurations(items) {
  let lastUserAt = 0;
  return (Array.isArray(items) ? items : []).map((item) => {
    const next = { ...item };
    const at = Number(next.at) || 0;
    if (next.role === "user") {
      lastUserAt = at;
    } else if (next.role === "agent" && lastUserAt && at) {
      next.durationMs = Math.max(0, at - lastUserAt);
    }
    return next;
  });
}

/** Per user turn: user → tools → agent (tools must not jump after the reply). */
function normalizeThreadOrder(items) {
  const list = Array.isArray(items) ? items : [];
  if (list.length < 2) return list.slice();

  const out = [];
  let i = 0;
  while (i < list.length) {
    const item = list[i];
    out.push(item);
    i += 1;
    if (item?.role !== "user") continue;

    const turnRest = [];
    while (i < list.length && list[i]?.role !== "user") {
      turnRest.push(list[i]);
      i += 1;
    }
    if (!turnRest.length) continue;

    const tools = turnRest.filter(isToolHistoryItem);
    const agents = turnRest.filter((entry) => entry?.role === "agent");
    const errors = turnRest.filter((entry) => entry?.role === "error");
    const other = turnRest.filter(
      (entry) => !isToolHistoryItem(entry) && entry?.role !== "agent" && entry?.role !== "error"
    );
    out.push(...tools, ...agents, ...errors, ...other);
  }
  return out;
}

function isToolHistoryItem(item) {
  return item?.role === "tool";
}

function isMeaningfulToolArgs(value) {
  const text = String(value ?? "").trim();
  return Boolean(text && text !== "{}" && text !== "[]");
}

function isGenericToolName(name) {
  const value = String(name || "").trim().toLowerCase();
  return !value || value === "tool";
}

function toolItemHasBody(item) {
  return isMeaningfulToolArgs(item?.args) || Boolean(String(item?.result || "").trim());
}

function toolItemIsNamed(item) {
  return !isGenericToolName(item?.tool) || (!isGenericToolName(item?.toolId) && item?.toolId !== item?.tool);
}

function isMeaningfulToolItem(item) {
  if (!isToolHistoryItem(item)) return false;
  const status = String(item?.status || "").trim().toLowerCase();
  if (status === "error") return toolItemHasBody(item) || toolItemIsNamed(item);
  if (status === "running") return toolItemHasBody(item) || toolItemIsNamed(item);
  return toolItemHasBody(item) || toolItemIsNamed(item);
}

function shouldPersistToolPayload(payload = {}) {
  const tool = String(payload.tool || "").trim();
  const toolId = String(payload.toolId || "").trim();
  const phase = String(payload.phase || "start").trim().toLowerCase();
  const status = String(payload.status || "").trim().toLowerCase();
  const stub = {
    role: "tool",
    tool: tool || "tool",
    toolId: toolId || tool || "tool",
    args: payload.args != null ? String(payload.args) : "",
    result: payload.result != null ? String(payload.result) : "",
    status: status || (phase === "end" ? "ok" : "running")
  };
  if (payload.error || status === "error") return isMeaningfulToolItem(stub);
  if (phase === "progress") return toolItemHasBody(stub) || toolItemIsNamed(stub);
  if (phase === "end") return isMeaningfulToolItem(stub);
  return isMeaningfulToolItem(stub);
}

function pickRicherToolArgs(next, prev) {
  const n = String(next ?? "").trim();
  const p = String(prev ?? "").trim();
  if (!isMeaningfulToolArgs(n)) return p;
  if (!isMeaningfulToolArgs(p)) return n;
  return n.length >= p.length ? n : p;
}

function mergeToolHistoryItem(left, right) {
  const merged = { ...left };
  merged.args = pickRicherToolArgs(right.args, merged.args);
  const nextResult = String(right.result ?? "").trim();
  const prevResult = String(merged.result ?? "").trim();
  if (nextResult && nextResult.length >= prevResult.length) merged.result = right.result;
  const leftDone = left.status !== "running";
  const rightDone = right.status !== "running";
  if (!leftDone && rightDone) merged.status = right.status;
  else if (leftDone && rightDone) merged.status = right.status;
  const leftAt = Number(left.at) || 0;
  const rightAt = Number(right.at) || 0;
  merged.at = leftAt && rightAt ? Math.min(leftAt, rightAt) : leftAt || rightAt || Date.now();
  if (right.tool) merged.tool = right.tool;
  if (right.toolId) merged.toolId = right.toolId;
  return merged;
}

function finalizeStaleRunningTools(items) {
  const out = (Array.isArray(items) ? items : []).map((item) => ({ ...item }));
  for (let i = 0; i < out.length; i += 1) {
    const item = out[i];
    if (!isToolHistoryItem(item) || item.status !== "running") continue;
    let hasAgentAfter = false;
    for (let j = i + 1; j < out.length; j += 1) {
      if (out[j].role === "user") break;
      if (out[j].role === "agent") {
        hasAgentAfter = true;
        break;
      }
    }
    if (!hasAgentAfter) continue;
    item.status = "ok";
    if (!isMeaningfulToolArgs(item.args)) item.args = "";
  }
  return out;
}

function toolHistoryKey(item) {
  return String(item?.toolId || item?.tool || "tool").trim() || "tool";
}

function messageHistoryKey(item) {
  const role = String(item?.role || "").trim();
  if (role !== "user" && role !== "agent" && role !== "error") return "";
  const body = String(item.body || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!body) return "";
  const at = Number(item.at) || 0;
  return `${role}:${at}:${body}`;
}

function mergeDialogHistory(archived, preserved = []) {
  const byToolId = new Map();
  const plainKeys = new Set();
  const plain = [];
  for (const item of [...archived, ...preservedOptimisticItems(archived, preserved)]) {
    if (!isToolHistoryItem(item)) {
      const key = messageHistoryKey(item);
      if (key) {
        if (plainKeys.has(key)) continue;
        plainKeys.add(key);
      }
      plain.push(item);
      continue;
    }
    if (!isMeaningfulToolItem(item)) continue;
    const key = toolHistoryKey(item);
    const prev = byToolId.get(key);
    if (!prev) {
      byToolId.set(key, item);
      continue;
    }
    byToolId.set(key, mergeToolHistoryItem(prev, item));
  }
  const merged = normalizeThreadOrder(
    dedupeAdjacentHistory([
      ...plain,
      ...finalizeStaleRunningTools([...byToolId.values()])
    ]).sort((left, right) => (Number(left.at) || 0) - (Number(right.at) || 0))
  );
  return withReplyDurations(merged.slice(-MAX_HISTORY));
}

function preservedOptimisticItems(archived, preserved = []) {
  const archivedMessageKeys = new Set(
    (Array.isArray(archived) ? archived : [])
      .map(messageHistoryKey)
      .filter(Boolean)
  );
  const archivedToolKeys = new Set(
    (Array.isArray(archived) ? archived : [])
      .filter(isToolHistoryItem)
      .map(toolHistoryKey)
  );
  return (Array.isArray(preserved) ? preserved : []).filter((item) => {
    if (isToolHistoryItem(item)) {
      if (!isMeaningfulToolItem(item)) return false;
      return !archivedToolKeys.has(toolHistoryKey(item));
    }
    const key = messageHistoryKey(item);
    if (!key) return true;
    return !archivedMessageKeys.has(key);
  });
}

function dedupeAdjacentHistory(items) {
  const out = [];
  let prevKey = "";
  for (const item of Array.isArray(items) ? items : []) {
    const key = isToolHistoryItem(item) ? toolHistoryKey(item) : messageHistoryKey(item);
    if (key && key === prevKey) continue;
    out.push(item);
    prevKey = key || prevKey;
  }
  return out;
}

function historyRoleLabel(item) {
  if (item?.role === "tool") return item?.tool || "Tool";
  if (item?.role === "error") return "Ошибка";
  if (item?.label) return item.label;
  if (item?.role === "agent") return "AI";
  return "Human (человек)";
}

function historyAvatarLabel(item) {
  if (item?.role === "tool") return "🔧";
  if (item?.role === "error") return "⚠";
  return item?.role === "agent" ? "AI" : "H";
}

function toolStatusLabel(status) {
  const value = String(status || "").trim().toLowerCase();
  if (value === "running") return "выполняется";
  if (value === "error") return "ошибка";
  return "готово";
}

function toolBubbleStorageKey(item) {
  const toolId = String(item?.toolId || item?.tool || "tool").trim() || "tool";
  const at = Number(item?.at) || 0;
  return `${toolId}:${at}`;
}

function toolBubbleHasBody(item) {
  return isMeaningfulToolArgs(item?.args) || Boolean(String(item?.result || "").trim());
}

function connectionHint(error) {
  const msg = String(error?.message || error || "").toLowerCase();
  const host = String(window.location?.hostname || "").toLowerCase();
  const onLocalHost = host === "localhost" || host === "127.0.0.1" || host === "::1";

  if (
    msg.includes("qwenpaw") ||
    msg.includes("quota exceeded") ||
    msg.includes("rate limit") ||
    msg.includes("model is unavailable") ||
    msg.includes("execution failed") ||
    msg.includes("upstream request failed") ||
    msg.includes("provider (console)")
  ) {
    return "Ошибка модели QwenPaw — смените модель у агента в http://127.0.0.1:8088 (free-модели часто падают по лимиту)";
  }

  if (msg.includes("cms backend unavailable") || msg.includes("502")) {
    return "CMS на порту 3000 недоступен. Запустите: npm start";
  }

  if (msg === "failed to fetch" || msg.includes("networkerror") || msg.includes("load failed")) {
    if (onLocalHost) {
      return "Сервер не отвечает. Запустите: npm run start:https";
    }
    return "Не достучались до Mac по сети. Одна Wi‑Fi? Запуск: npm run start:https";
  }

  if (msg.includes("404")) return "Перезапустите CMS после обновления";
  return "";
}

/**
 * @param {{
 *   panel?: HTMLElement | null,
 *   scroll?: HTMLElement | null,
 *   scrollProgress?: HTMLElement | null,
 *   scrollProgressFill?: HTMLElement | null,
 *   scrollBottomBtn?: HTMLElement | null,
 *   statusDot?: HTMLElement | null,
 *   refreshBtn?: HTMLElement | null,
 *   historyOpen?: HTMLElement | null,
 *   historyCount?: HTMLElement | null,
 *   historyDialog?: HTMLDialogElement | null,
 *   historyClose?: HTMLElement | null,
 *   historyList?: HTMLElement | null,
 *   lastAskWrap?: HTMLElement | null,
 *   lastAsk?: HTMLElement | null,
 *   thread?: HTMLElement | null,
 *   lastReply?: HTMLElement | null,
 *   errorEl?: HTMLElement | null,
 *   pullHint?: HTMLElement | null,
 *   onReconnect?: () => void,
 *   onScrollPositionChange?: (ratio: number) => void,
 *   onHistoryChange?: () => void,
 *   fetchHistory?: () => Promise<Array<{ role?: string, body?: string, at?: number, label?: string }>>
 * }} options
 */
export function createShellDialog(options = {}) {
  const nodes = options;
  const fetchHistory = typeof options.fetchHistory === "function" ? options.fetchHistory : null;
  const onScrollPositionChange =
    typeof options.onScrollPositionChange === "function" ? options.onScrollPositionChange : null;
  const onHistoryChange = typeof options.onHistoryChange === "function" ? options.onHistoryChange : null;
  let history = [];
  let historyLoading = false;
  let historyLoadError = null;
  let historyLoadPromise = null;
  let historyLoadGeneration = 0;
  let lastReplyRaw = "";
  let lastAskRaw = "";
  let pullStartY = 0;
  let liveStreamTools = [];
  let liveActivityHint = "";
  let pullActive = false;
  let reconnectHandler = options.onReconnect || null;
  let suppressScrollPersist = false;
  let pendingScrollRestoreRatio = null;
  let scrollRestoreOnNextLoad = false;
  let scrollRestoreWatchTimer = 0;
  let scrollRestoreRetryTimer = 0;
  let scrollRestoreApplying = false;
  let scrollRestoreDeadline = 0;
  let scrollRestoreActive = false;
  let scrollRestoreSuppressUntil = 0;

  function notifyHistoryChange() {
    try {
      onHistoryChange?.();
    } catch (error) {
      console.error("[shell-dialog] onHistoryChange failed", error);
    }
  }
  const SCROLL_RESTORE_MAX_MS = 12000;
  const toolBubbleFoldState = new Map();

  function isToolBubbleExpanded(item) {
    const key = toolBubbleStorageKey(item);
    if (toolBubbleFoldState.has(key)) return toolBubbleFoldState.get(key);
    return false;
  }

  function setToolBubbleExpanded(item, expanded) {
    toolBubbleFoldState.set(toolBubbleStorageKey(item), Boolean(expanded));
  }

  function getScrollRatio() {
    const scrollEl = nodes.scroll;
    if (!scrollEl) return 0;
    const maxScroll = scrollEl.scrollHeight - scrollEl.clientHeight;
    if (maxScroll <= 1) return 0;
    return Math.min(1, Math.max(0, scrollEl.scrollTop / maxScroll));
  }

  function isScrollNearBottom(threshold = 56) {
    const scrollEl = nodes.scroll;
    if (!scrollEl) return true;
    const maxScroll = scrollEl.scrollHeight - scrollEl.clientHeight;
    if (maxScroll <= 1) return true;
    return scrollEl.scrollTop >= maxScroll - threshold;
  }

  function updateScrollBottomButton() {
    const btn = nodes.scrollBottomBtn;
    if (!btn) return;
    const scrollEl = nodes.scroll;
    if (!scrollEl) {
      btn.classList.add("hidden");
      btn.setAttribute("aria-hidden", "true");
      return;
    }
    const maxScroll = scrollEl.scrollHeight - scrollEl.clientHeight;
    const show = maxScroll > 1 && !isScrollNearBottom();
    btn.classList.toggle("hidden", !show);
    btn.setAttribute("aria-hidden", show ? "false" : "true");
  }

  function scrollDialogToBottom({ smooth = true } = {}) {
    const scrollEl = nodes.scroll;
    if (!scrollEl) return;
    finishScrollRestoreWatch();
    const maxScroll = scrollEl.scrollHeight - scrollEl.clientHeight;
    if (maxScroll <= 1) return;
    suppressScrollPersist = true;
    scrollEl.scrollTo({ top: maxScroll, behavior: smooth ? "smooth" : "auto" });
    window.setTimeout(
      () => {
        suppressScrollPersist = false;
        updateScrollProgress();
      },
      smooth ? 320 : 0
    );
  }

  function applyScrollRatio(ratio) {
    const scrollEl = nodes.scroll;
    if (!scrollEl) return;
    const maxScroll = scrollEl.scrollHeight - scrollEl.clientHeight;
    if (maxScroll <= 1) return;
    const normalized = Math.min(1, Math.max(0, Number(ratio) || 0));
    suppressScrollPersist = true;
    scrollRestoreApplying = true;
    scrollRestoreSuppressUntil = Date.now() + 180;
    scrollEl.scrollTop = normalized * maxScroll;
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        scrollRestoreApplying = false;
        suppressScrollPersist = false;
      });
    });
    updateScrollProgress();
  }

  function scheduleScrollRestore(ratio) {
    if (ratio == null || !Number.isFinite(Number(ratio))) {
      pendingScrollRestoreRatio = null;
      return;
    }
    pendingScrollRestoreRatio = Math.min(1, Math.max(0, Number(ratio)));
  }

  function stopScrollRestoreRetry() {
    if (scrollRestoreRetryTimer) {
      window.clearTimeout(scrollRestoreRetryTimer);
      scrollRestoreRetryTimer = 0;
    }
  }

  function stopScrollRestoreWatch() {
    if (!scrollRestoreWatchTimer) return;
    window.clearInterval(scrollRestoreWatchTimer);
    scrollRestoreWatchTimer = 0;
  }

  function finishScrollRestoreWatch() {
    scrollRestoreOnNextLoad = false;
    scrollRestoreActive = false;
    scrollRestoreDeadline = 0;
    stopScrollRestoreWatch();
    stopScrollRestoreRetry();
  }

  function clearPendingScrollRestore() {
    pendingScrollRestoreRatio = null;
    finishScrollRestoreWatch();
  }

  function ensureScrollRestoreDeadline() {
    if (!scrollRestoreDeadline) {
      scrollRestoreDeadline = Date.now() + SCROLL_RESTORE_MAX_MS;
    }
    return scrollRestoreDeadline;
  }

  function isScrollAtTargetRatio() {
    if (pendingScrollRestoreRatio == null) return true;
    const scrollEl = nodes.scroll;
    if (!scrollEl) return true;
    const maxScroll = scrollEl.scrollHeight - scrollEl.clientHeight;
    if (maxScroll <= 1) return false;
    const expected = pendingScrollRestoreRatio * maxScroll;
    return Math.abs(scrollEl.scrollTop - expected) <= 24;
  }

  function applyPendingScrollOnce() {
    if (pendingScrollRestoreRatio == null) return;
    if (nodes.panel?.classList.contains("is-streaming")) return;
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => tryApplyPendingScrollRestore());
    });
  }

  function queueScrollRestoreAfterLayout() {
    if (pendingScrollRestoreRatio == null || !scrollRestoreActive) return;
    if (nodes.panel?.classList.contains("is-streaming")) return;
    const deadline = ensureScrollRestoreDeadline();
    if (Date.now() > deadline) {
      finishScrollRestoreWatch();
      return;
    }
    if (isScrollAtTargetRatio()) {
      finishScrollRestoreWatch();
      return;
    }

    stopScrollRestoreRetry();
    scrollRestoreRetryTimer = window.setTimeout(() => {
      scrollRestoreRetryTimer = 0;
      if (!scrollRestoreActive || pendingScrollRestoreRatio == null) return;
      if (Date.now() > deadline) {
        finishScrollRestoreWatch();
        return;
      }
      if (isScrollAtTargetRatio()) {
        finishScrollRestoreWatch();
        return;
      }
      tryApplyPendingScrollRestore();
    }, 64);
  }

  function tryApplyPendingScrollRestore() {
    if (pendingScrollRestoreRatio == null) return false;
    if (nodes.panel?.classList.contains("is-streaming")) return false;
    const scrollEl = nodes.scroll;
    if (!scrollEl) return false;
    const maxScroll = scrollEl.scrollHeight - scrollEl.clientHeight;
    if (maxScroll <= 1) return false;
    if (isScrollAtTargetRatio()) {
      finishScrollRestoreWatch();
      return true;
    }
    applyScrollRatio(pendingScrollRestoreRatio);
    return true;
  }

  function startScrollRestoreWatch() {
    if (pendingScrollRestoreRatio == null) return;
    scrollRestoreOnNextLoad = true;
    scrollRestoreActive = true;
    ensureScrollRestoreDeadline();
    queueScrollRestoreAfterLayout();
  }

  function requestScrollRestoreOnLoad() {
    scrollRestoreOnNextLoad = true;
    scrollRestoreActive = true;
    ensureScrollRestoreDeadline();
  }

  function noteScrollPositionChange() {
    if (suppressScrollPersist || scrollRestoreApplying || Date.now() < scrollRestoreSuppressUntil) return;
    finishScrollRestoreWatch();
    if (!onScrollPositionChange) return;
    const ratio = getScrollRatio();
    onScrollPositionChange(ratio);
    pendingScrollRestoreRatio = Math.min(1, Math.max(0, Number(ratio) || 0));
  }

  function markUserScrollIntent() {
    finishScrollRestoreWatch();
  }

  function syncHistoryPanelState() {
    if (!nodes.panel) return;
    if (historyLoading) {
      nodes.panel.dataset.historyState = "loading";
      return;
    }
    if (historyLoadError && !history.length) {
      nodes.panel.dataset.historyState = "error";
      return;
    }
    nodes.panel.dataset.historyState = history.length ? "ready" : "empty";
  }

  function renderHistoryLoading() {
    syncHistoryPanelState();
    clearError();
    if (!nodes.thread) return;
    nodes.thread.replaceChildren();

    const row = document.createElement("div");
    row.className = "shell-dialog-history-loading";
    row.setAttribute("role", "status");
    row.setAttribute("aria-live", "polite");
    row.setAttribute("aria-busy", "true");

    const dots = document.createElement("span");
    dots.className = "shell-dialog-history-loading-dots";
    dots.setAttribute("aria-hidden", "true");
    for (let i = 0; i < 3; i += 1) {
      const dot = document.createElement("span");
      dot.className = "shell-dialog-history-loading-dot";
      dot.style.animationDelay = `${i * 0.15}s`;
      dots.append(dot);
    }

    const text = document.createElement("span");
    text.className = "shell-dialog-history-loading-text";
    text.textContent = "Загружаю историю";

    row.append(dots, text);
    nodes.thread.append(row);
    nodes.lastReply?.classList.add("hidden");
    nodes.lastAskWrap?.classList.add("hidden");
  }

  function renderHistoryLoadError(error) {
    syncHistoryPanelState();
    clearError();
    if (!nodes.thread) {
      const hint = connectionHint(error);
      setError("Не удалось загрузить историю", { hint });
      return;
    }

    nodes.thread.replaceChildren();
    const row = document.createElement("div");
    row.className = "shell-dialog-history-loading shell-dialog-history-loading--error";
    row.setAttribute("role", "alert");

    const icon = document.createElement("span");
    icon.className = "shell-dialog-history-loading-icon";
    icon.textContent = "↻";
    icon.setAttribute("aria-hidden", "true");

    const copy = document.createElement("div");
    copy.className = "shell-dialog-history-loading-copy";

    const title = document.createElement("span");
    title.className = "shell-dialog-history-loading-text";
    title.textContent = "Не удалось загрузить историю";

    const hintEl = document.createElement("span");
    hintEl.className = "shell-dialog-history-loading-hint";
    const hint = connectionHint(error);
    hintEl.textContent =
      hint || String(error?.message || error || "Проверьте связь с сервером и нажмите «Обновить»");

    copy.append(title, hintEl);

    const retry = document.createElement("button");
    retry.type = "button";
    retry.className = "shell-btn shell-btn--ghost shell-btn--compact shell-dialog-history-retry";
    retry.textContent = "Повторить";
    retry.addEventListener("click", () => {
      void loadHistory();
    });

    row.append(icon, copy, retry);
    nodes.thread.append(row);
    nodes.lastReply?.classList.add("hidden");
    nodes.lastAskWrap?.classList.add("hidden");
  }

  function loadHistory({ replace = false, restoreScroll = false } = {}) {
    if (!fetchHistory) {
      history = [];
      historyLoadError = null;
      renderHistoryUi();
      return Promise.resolve();
    }

    if (replace) {
      history = [];
      lastReplyRaw = "";
      lastAskRaw = "";
      historyLoadError = null;
      historyLoadPromise = null;
      clearError();
      setLastAsk("");
    } else if (historyLoadPromise) {
      return historyLoadPromise;
    }

    if (restoreScroll) {
      scrollRestoreOnNextLoad = true;
      scrollRestoreActive = true;
      ensureScrollRestoreDeadline();
    }

    const generation = (historyLoadGeneration += 1);
    const restoreScrollForLoad = Boolean(restoreScroll);
    historyLoading = true;
    if (!replace) historyLoadError = null;
    renderHistoryUi();

    historyLoadPromise = fetchHistory()
      .then((items) => {
        if (generation !== historyLoadGeneration) return;
        const preserved = replace ? [] : history.slice();
        const archived = withReplyDurations(Array.isArray(items) ? items : []);
        history = replace
          ? finalizeStaleRunningTools(archived.slice(-MAX_HISTORY))
          : mergeDialogHistory(archived, preserved);
        historyLoadError = null;
        clearError();
        syncLiveReplySlot();
      })
      .catch((error) => {
        if (generation !== historyLoadGeneration) return;
        historyLoadError = error;
        if (history.length) {
          const hint = connectionHint(error);
          setError("Не удалось обновить историю", { hint });
        }
      })
      .finally(() => {
        if (generation !== historyLoadGeneration) return;
        historyLoading = false;
        historyLoadPromise = null;
        try {
          renderHistoryUi();
          if (restoreScrollForLoad && pendingScrollRestoreRatio != null) {
            startScrollRestoreWatch();
          }
        } catch (error) {
          historyLoadError = error;
          console.error("[shell-dialog] renderHistoryUi failed", error);
        }
      });
    return historyLoadPromise;
  }

  function pushHistory(role, body) {
    const text = String(body || "").trim();
    if (!text) return;
    const last = history[history.length - 1];
    if (last?.role === role && String(last.body || "").trim() === text) return;
    const item = {
      role,
      body: text,
      at: Date.now(),
      label: historyRoleLabel({ role })
    };
    if (role === "agent") {
      const prevUser = [...history].reverse().find((entry) => entry.role === "user");
      if (prevUser?.at) item.durationMs = Math.max(0, item.at - prevUser.at);
    }
    history.push(item);
    if (history.length > MAX_HISTORY) history = history.slice(-MAX_HISTORY);
    renderHistoryUi();
  }

  function pushThreadError(message, { hint = "" } = {}) {
    const text = String(message || "").trim();
    if (!text) return;
    const body = hint ? `${text} — ${hint}` : text;
    const last = history[history.length - 1];
    if (last?.role === "error" && last.body === body) return;
    const stickToBottom = isScrollNearBottom();
    pushHistory("error", body);
    if (stickToBottom) {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          scrollDialogToBottom({ smooth: true });
        });
      });
    }
  }

  async function copyMessageText(text, btn) {
    const raw = String(text || "").trim();
    if (!raw) return;
    try {
      await navigator.clipboard.writeText(raw);
      if (btn) {
        btn.classList.add("is-copied");
        btn.title = "Скопировано";
        window.setTimeout(() => {
          btn.classList.remove("is-copied");
          btn.title = "Копировать";
        }, 1200);
      }
    } catch {
      setError("Не удалось скопировать");
    }
  }

  function renderToolThreadMessage(item) {
    const row = document.createElement("div");
    row.className = "shell-chat-row shell-chat-row--tool";
    row.dataset.toolId = String(item.toolId || item.tool || "");

    const bubble = document.createElement("div");
    bubble.className = "shell-chat-bubble shell-chat-bubble--tool";

    const el = document.createElement("div");
    const statusName = String(item.status || "running").trim() || "running";
    const hasBody = toolBubbleHasBody(item);
    const expanded = hasBody ? isToolBubbleExpanded(item) : true;
    el.className = `shell-chat-msg shell-chat-msg--tool is-${statusName}${hasBody && !expanded ? " is-collapsed" : ""}`;

    const head = document.createElement("button");
    head.type = "button";
    head.className = "shell-tool-bubble-head";
    head.setAttribute("aria-expanded", hasBody ? String(expanded) : "true");
    if (!hasBody) head.disabled = true;

    const chevron = document.createElement("span");
    chevron.className = "shell-tool-bubble-chevron";
    chevron.textContent = "▾";
    chevron.setAttribute("aria-hidden", "true");
    if (!hasBody) chevron.hidden = true;

    const icon = document.createElement("span");
    icon.className = "shell-tool-bubble-icon";
    icon.textContent = item.status === "error" ? "⚠️" : item.status === "running" ? "🔧" : "✓";
    icon.setAttribute("aria-hidden", "true");
    const title = document.createElement("span");
    title.className = "shell-tool-bubble-title";
    title.textContent = String(item.tool || "tool");
    const status = document.createElement("span");
    status.className = "shell-tool-bubble-status";
    status.textContent = toolStatusLabel(item.status);
    head.append(chevron, icon, title, status);
    el.append(head);

    const body = document.createElement("div");
    body.className = "shell-tool-bubble-body";
    if (hasBody && !expanded) body.hidden = true;

    const args = String(item.args || "").trim();
    if (isMeaningfulToolArgs(args)) {
      const argsEl = document.createElement("pre");
      argsEl.className = "shell-tool-bubble-section shell-tool-bubble-args";
      argsEl.textContent = args;
      body.append(argsEl);
    }

    const result = String(item.result || "").trim();
    if (result) {
      const resultEl = document.createElement("pre");
      resultEl.className = "shell-tool-bubble-section shell-tool-bubble-result";
      resultEl.textContent = result;
      body.append(resultEl);
    }

    if (hasBody) {
      el.append(body);
      head.addEventListener("click", () => {
        const nextExpanded = !isToolBubbleExpanded(item);
        setToolBubbleExpanded(item, nextExpanded);
        el.classList.toggle("is-collapsed", !nextExpanded);
        body.hidden = !nextExpanded;
        head.setAttribute("aria-expanded", String(nextExpanded));
      });
    }

    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "shell-chat-copy";
    copyBtn.title = "Копировать";
    copyBtn.setAttribute("aria-label", "Копировать tool");
    copyBtn.textContent = "⎘";
    const copyText = [item.tool, args, result].filter(Boolean).join("\n\n");
    copyBtn.addEventListener("click", () => {
      void copyMessageText(copyText, copyBtn);
    });

    bubble.append(el, copyBtn);
    row.append(bubble);

    const clock = formatHistoryTime(item.at);
    if (clock) {
      const meta = document.createElement("div");
      meta.className = "shell-chat-meta";
      meta.textContent = clock;
      row.append(meta);
    }
    return row;
  }

  function findOpenToolIndexIn(list, payload = {}) {
    const toolId = String(payload.toolId || "").trim();
    const tool = String(payload.tool || "").trim();
    for (let i = list.length - 1; i >= 0; i -= 1) {
      const item = list[i];
      if (item.role !== "tool") continue;
      if (toolId && item.toolId === toolId) return i;
      if (tool && item.tool === tool && item.status === "running") return i;
    }
    return -1;
  }

  function findOpenToolIndex(payload = {}) {
    return findOpenToolIndexIn(history, payload);
  }

  function upsertToolInList(list, payload = {}) {
    const phase = String(payload.phase || "start").trim().toLowerCase();
    const tool = String(payload.tool || "tool").trim() || "tool";
    const toolId = String(payload.toolId || tool).trim() || tool;
    const args = String(payload.args || "").trim();
    const result = String(payload.result || "").trim();
    const status = String(payload.status || "").trim().toLowerCase();
    const openIndex = findOpenToolIndexIn(list, payload);

    if (phase === "end") {
      if (openIndex >= 0) {
        const item = list[openIndex];
        item.result = result || item.result || "";
        item.status = status || (payload.error ? "error" : "ok");
        item.args = pickRicherToolArgs(args, item.args);
        if (!isMeaningfulToolItem(item)) list.splice(openIndex, 1);
        return;
      }
      if (!shouldPersistToolPayload(payload)) return;
      list.push({
        role: "tool",
        tool,
        toolId,
        args,
        result,
        status: status || (payload.error ? "error" : "ok"),
        at: Date.now()
      });
      return;
    }

    if (phase === "progress") {
      if (openIndex >= 0 && isMeaningfulToolArgs(args)) {
        list[openIndex].args = pickRicherToolArgs(args, list[openIndex].args);
      }
      return;
    }

    if (openIndex >= 0 && !isMeaningfulToolArgs(args)) {
      return;
    }

    if (!shouldPersistToolPayload(payload)) return;

    list.push({
      role: "tool",
      tool,
      toolId,
      args,
      result: "",
      status: "running",
      at: Date.now()
    });
  }

  function finalizeRunningTools() {
    let changed = false;
    for (let i = history.length - 1; i >= 0; i -= 1) {
      const item = history[i];
      if (!isToolHistoryItem(item) || item.status !== "running") continue;
      item.status = "ok";
      if (!isMeaningfulToolArgs(item.args)) item.args = "";
      if (!isMeaningfulToolItem(item)) {
        history.splice(i, 1);
      }
      changed = true;
    }
    if (changed) renderHistoryUi();
  }

  function clearLiveStreamTools() {
    liveStreamTools = [];
    liveActivityHint = "";
    renderLiveToolStrip();
  }

  function setLiveActivityHint(text) {
    const hint = String(text || "").trim();
    if (!hint) return;
    liveActivityHint = hint;
    if (nodes.panel?.classList.contains("is-streaming")) renderLiveToolStrip();
  }

  function noteAgentActivity(payload = {}) {
    const phrase = String(payload.phrase || "").trim();
    const tool = String(payload.tool || "").trim();
    const kind = String(payload.kind || "").trim().toLowerCase();
    const isTool =
      kind === "tool" ||
      Boolean(tool) ||
      /^🔧|^✓/.test(phrase) ||
      payload.args != null ||
      payload.result != null;

    if (isTool) {
      const toolPayload = { ...payload, kind: "tool" };
      const canUpdateOpen = findOpenToolIndexIn(history, toolPayload) >= 0;
      if (shouldPersistToolPayload(toolPayload) || canUpdateOpen) {
        upsertToolActivity(toolPayload);
      }
      if (phrase) liveActivityHint = phrase;
      else if (tool) liveActivityHint = `🔧 ${tool}…`;
      return;
    }

    if (phrase) setLiveActivityHint(phrase);
  }

  function upsertToolActivity(payload = {}) {
    upsertToolInList(history, payload);
    if (history.length > MAX_HISTORY) history = history.slice(-MAX_HISTORY);
    upsertToolInList(liveStreamTools, payload);
    if (liveStreamTools.length > MAX_HISTORY) liveStreamTools = liveStreamTools.slice(-MAX_HISTORY);

    if (nodes.panel?.classList.contains("is-streaming")) {
      renderLiveToolStrip();
      return;
    }
    renderHistoryUi();
  }

  function renderErrorThreadMessage(item) {
    const row = document.createElement("div");
    row.className = "shell-chat-row shell-chat-row--error";

    const bubble = document.createElement("div");
    bubble.className = "shell-chat-bubble shell-chat-bubble--error";

    const el = document.createElement("div");
    el.className = "shell-chat-msg shell-chat-msg--error";
    el.dataset.role = "error";
    el.setAttribute("role", "alert");
    el.textContent = String(item.body || "").trim();

    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "shell-chat-copy";
    copyBtn.title = "Копировать";
    copyBtn.setAttribute("aria-label", "Копировать ошибку");
    copyBtn.textContent = "⎘";
    copyBtn.addEventListener("click", () => {
      void copyMessageText(item.body, copyBtn);
    });

    bubble.append(el, copyBtn);
    row.append(bubble);

    const clock = formatHistoryTime(item.at);
    if (clock) {
      const meta = document.createElement("div");
      meta.className = "shell-chat-meta";
      meta.textContent = clock;
      row.append(meta);
    }
    return row;
  }

  function renderThreadMessage(item) {
    if (item?.role === "tool") {
      if (!isMeaningfulToolItem(item)) return null;
      return renderToolThreadMessage(item);
    }
    if (item?.role === "error") return renderErrorThreadMessage(item);
    const role = item?.role === "agent" ? "agent" : "user";
    const row = document.createElement("div");
    row.className = `shell-chat-row shell-chat-row--${role}`;

    const bubble = document.createElement("div");
    bubble.className = "shell-chat-bubble";

    const el = document.createElement("div");
    el.className = `shell-chat-msg shell-chat-msg--${role}`;
    el.dataset.role = role;
    if (role === "agent") {
      renderShellReplyBody(el, String(item.body || ""));
    } else {
      renderUserMessageBody(el, String(item.body || ""));
    }

    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "shell-chat-copy";
    copyBtn.title = "Копировать";
    copyBtn.setAttribute("aria-label", "Копировать сообщение");
    copyBtn.textContent = "⎘";
    copyBtn.addEventListener("click", () => {
      void copyMessageText(item.body, copyBtn);
    });

    bubble.append(el, copyBtn);
    row.append(bubble);

    const duration = role === "agent" ? formatReplyDuration(item.durationMs) : "";
    const clock = formatHistoryTime(item.at);
    const metaText = duration || clock;
    if (metaText) {
      const meta = document.createElement("div");
      meta.className = "shell-chat-meta";
      meta.textContent = metaText;
      if (duration) meta.title = clock ? `Ответ за ${duration} · ${clock}` : `Ответ за ${duration}`;
      row.append(meta);
    }
    return row;
  }

  function syncLiveReplySlot() {
    const streaming = nodes.panel?.classList.contains("is-streaming");
    const hasThread = history.length > 0;
    const hideLiveReply = hasThread && !streaming;
    nodes.lastReply?.classList.toggle("hidden", hideLiveReply);
    nodes.lastAskWrap?.classList.toggle("hidden", hasThread || !lastAskRaw);
  }

  function findLastUserIndex() {
    for (let i = history.length - 1; i >= 0; i -= 1) {
      if (history[i]?.role === "user") return i;
    }
    return -1;
  }

  function getCurrentTurnTools() {
    const lastUserIndex = findLastUserIndex();
    if (lastUserIndex < 0) return [];
    return history.slice(lastUserIndex + 1).filter(isToolHistoryItem);
  }

  function renderLiveToolStrip() {
    if (!nodes.liveTools) return;
    const streaming = nodes.panel?.classList.contains("is-streaming");
    const tools = streaming ? liveStreamTools : [];
    nodes.liveTools.replaceChildren();
    if (tools.length) {
      for (const item of tools) {
        if (!isMeaningfulToolItem(item)) continue;
        nodes.liveTools.append(renderToolThreadMessage(item));
      }
      nodes.liveTools.classList.remove("hidden");
      nodes.lastReply?.classList.remove("shell-dialog-live-reply--stub");
      return;
    }
    if (streaming) {
      const pending = document.createElement("div");
      pending.className = "shell-live-tools-pending";
      pending.textContent = liveActivityHint || "Запускаю агента…";
      nodes.liveTools.append(pending);
      nodes.liveTools.classList.remove("hidden");
      return;
    }
    nodes.liveTools.classList.add("hidden");
  }

  function renderThread() {
    if (!nodes.thread) return;
    history = normalizeThreadOrder(history);
    const scrollEl = nodes.scroll;
    const preserveRatio =
      !scrollRestoreActive &&
      scrollEl &&
      scrollEl.scrollHeight - scrollEl.clientHeight > 1
        ? getScrollRatio()
        : null;

    nodes.thread.replaceChildren();
    for (let i = 0; i < history.length; i += 1) {
      const item = history[i];
      const row = renderThreadMessage(item);
      if (row) nodes.thread.append(row);
    }
    renderLiveToolStrip();
    syncLiveReplySlot();
    updateScrollProgress();
    scheduleShellMermaidTypeset(nodes.thread);
    scheduleShellMermaidTypeset(nodes.lastReply);

    if (scrollRestoreActive && pendingScrollRestoreRatio != null) {
      applyPendingScrollOnce();
      queueScrollRestoreAfterLayout();
    } else if (preserveRatio != null) {
      window.requestAnimationFrame(() => applyScrollRatio(preserveRatio));
    }
  }

  function renderHistoryUi() {
    if (historyLoading && !history.length) {
      renderHistoryLoading();
      return;
    }
    if (historyLoading && history.length) {
      syncHistoryPanelState();
      renderThread();
      return;
    }
    if (historyLoadError && !history.length) {
      renderHistoryLoadError(historyLoadError);
      return;
    }

    syncHistoryPanelState();
    if (nodes.historyCount) {
      nodes.historyCount.textContent = history.length ? String(history.length) : "";
    }
    nodes.historyOpen?.classList.toggle("hidden", history.length === 0);
    if (nodes.historyList) {
      nodes.historyList.innerHTML = "";
      for (const item of history) {
        if (item.role === "tool" && !isMeaningfulToolItem(item)) continue;
        const li = document.createElement("li");
        li.className = `shell-history-item shell-history-item--${item.role}`;
        const avatar = document.createElement("span");
        avatar.className = "shell-history-avatar";
        avatar.textContent = historyAvatarLabel(item);
        avatar.setAttribute("aria-hidden", "true");
        const bodyWrap = document.createElement("div");
        bodyWrap.className = "shell-history-body";
        const head = document.createElement("div");
        head.className = "shell-history-head";
        const label = document.createElement("span");
        label.className = "shell-history-role";
        label.textContent = historyRoleLabel(item);
        const time = document.createElement("time");
        time.className = "shell-history-time";
        time.textContent = formatHistoryTime(item.at);
        head.append(label, time);
        const body = document.createElement("div");
        body.className = "shell-history-text";
        if (item.role === "tool") {
          const parts = [`🔧 ${item.tool || "tool"}`, item.args, item.result].filter(Boolean);
          body.textContent = parts.join("\n\n");
        } else if (item.role === "agent") {
          renderShellReplyBody(body, String(item.body || ""));
        } else if (item.role === "error") {
          body.textContent = String(item.body || "");
        } else {
          renderUserMessageBody(body, String(item.body || ""));
        }
        bodyWrap.append(head, body);
        li.append(avatar, bodyWrap);
        nodes.historyList.append(li);
      }
    }
    renderThread();
    notifyHistoryChange();
  }

  function setLastAsk(text) {
    const raw = String(text || "").trim();
    lastAskRaw = raw;
    if (!raw) {
      nodes.lastAskWrap?.classList.add("hidden");
      if (nodes.lastAsk) nodes.lastAsk.replaceChildren();
      return;
    }
    nodes.lastAskWrap?.classList.remove("hidden");
    if (nodes.lastAsk) renderUserMessageBody(nodes.lastAsk, raw);
    notifyHistoryChange();
  }

  function onReplyRendered(rawText) {
    const raw = String(rawText || "").trim();
    lastReplyRaw = raw;
    syncLiveReplySlot();
  }

  function onUserMessage(text) {
    clearError();
    const stickToBottom = isScrollNearBottom();
    setLastAsk(text);
    pushHistory("user", text);
    if (stickToBottom) {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          scrollDialogToBottom({ smooth: true });
        });
      });
    }
  }

  function onAgentReply(body) {
    const raw = String(body || "").trim();
    if (!raw) return;
    onReplyRendered(raw);
  }

  function getLastReplyRaw() {
    return lastReplyRaw;
  }

  function getHistory() {
    return history.slice();
  }

  function getLastAskText() {
    return lastAskRaw;
  }

  function setConnectionState(stateName) {
    if (!nodes.statusDot) return;
    const state =
      stateName === "live" ? "live" : stateName === "error" ? "error" : stateName === "offline" ? "offline" : "connecting";
    nodes.statusDot.dataset.state = state;
    const labels = {
      live: "Связь с сервером · на связи",
      error: "Связь с сервером · обрыв",
      offline: "Связь с сервером · нет сети",
      connecting: "Связь с сервером · подключение…"
    };
    const title = labels[state] || labels.connecting;
    nodes.statusDot.title = title;
    nodes.statusDot.setAttribute("aria-label", title);
  }

  function setError(message, { hint = "", inThread = true } = {}) {
    if (!message) {
      if (nodes.errorEl) {
        nodes.errorEl.classList.add("hidden");
        nodes.errorEl.textContent = "";
      }
      return;
    }
    const text = hint ? `${message} — ${hint}` : message;
    if (nodes.errorEl) {
      nodes.errorEl.textContent = text;
      nodes.errorEl.classList.remove("hidden");
    }
    if (inThread) pushThreadError(message, { hint });
  }

  function clearError() {
    setError("");
  }

  function bindReconnect(fn) {
    reconnectHandler = fn;
  }

  function doReconnect({ soft = false } = {}) {
    clearError();
    if (typeof reconnectHandler === "function") reconnectHandler({ soft });
  }

  function refreshDialog() {
    return loadHistory().then(() => doReconnect({ soft: true }));
  }

  function updateScrollProgress() {
    const scrollEl = nodes.scroll;
    const fillEl = nodes.scrollProgressFill;
    const trackEl = nodes.scrollProgress;
    if (!scrollEl || !fillEl) return;
    const maxScroll = scrollEl.scrollHeight - scrollEl.clientHeight;
    if (maxScroll <= 1) {
      fillEl.style.width = "0%";
      trackEl?.classList.add("is-hidden");
      updateScrollBottomButton();
      return;
    }
    trackEl?.classList.remove("is-hidden");
    const ratio = Math.min(1, Math.max(0, scrollEl.scrollTop / maxScroll));
    fillEl.style.width = `${Math.round(ratio * 1000) / 10}%`;
    updateScrollBottomButton();
  }

  function bindScrollProgress() {
    const scrollEl = nodes.scroll;
    if (!scrollEl) return;
    scrollEl.addEventListener(
      "scroll",
      () => {
        updateScrollProgress();
        noteScrollPositionChange();
      },
      { passive: true }
    );
    scrollEl.addEventListener("wheel", markUserScrollIntent, { passive: true });
    scrollEl.addEventListener("mousedown", markUserScrollIntent);
    scrollEl.addEventListener("touchstart", markUserScrollIntent, { passive: true });
    scrollEl.addEventListener("keydown", (event) => {
      if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) {
        markUserScrollIntent();
      }
    });
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => {
        updateScrollProgress();
        if (scrollRestoreActive && pendingScrollRestoreRatio != null) queueScrollRestoreAfterLayout();
      });
      observer.observe(scrollEl);
      if (nodes.thread) observer.observe(nodes.thread);
      if (nodes.lastReply) observer.observe(nodes.lastReply);
    }
    updateScrollProgress();
  }

  function bindUi() {
    nodes.refreshBtn?.addEventListener("click", () => {
      void refreshDialog();
    });

    nodes.scrollBottomBtn?.addEventListener("click", () => {
      scrollDialogToBottom({ smooth: true });
    });

    const scrollRoot = nodes.scroll || nodes.panel;
    scrollRoot?.addEventListener(
      "touchstart",
      (event) => {
        if ((nodes.scroll?.scrollTop || 0) > 0) return;
        pullStartY = event.touches[0]?.clientY || 0;
        pullActive = true;
      },
      { passive: true }
    );
    scrollRoot?.addEventListener(
      "touchmove",
      (event) => {
        if (!pullActive) return;
        const dy = (event.touches[0]?.clientY || 0) - pullStartY;
        if (dy > 70) nodes.pullHint?.classList.remove("hidden");
        else nodes.pullHint?.classList.add("hidden");
      },
      { passive: true }
    );
    scrollRoot?.addEventListener(
      "touchend",
      () => {
        if (!pullActive) return;
        const show = !nodes.pullHint?.classList.contains("hidden");
        nodes.pullHint?.classList.add("hidden");
        pullActive = false;
        if (show) void refreshDialog();
      },
      { passive: true }
    );

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") doReconnect({ soft: true });
    });

    bindScrollProgress();
  }

  function init() {
    nodes.panel?.removeAttribute("data-collapsed");
    try {
      localStorage.removeItem("agentcms.shell.chatCollapsed.v1");
    } catch {
      /* ignore */
    }
    bindUi();
  }

  return {
    init,
    setLastAsk,
    onUserMessage,
    onAgentReply,
    onReplyRendered,
    getLastReplyRaw,
    getHistory,
    getLastAskText,
    setConnectionState,
    setError,
    clearError,
    bindReconnect,
    connectionHint,
    pushHistory,
    pushThreadError,
    upsertToolActivity,
    clearLiveStreamTools,
    finalizeRunningTools,
    noteAgentActivity,
    setLiveActivityHint,
    renderLiveToolStrip,
    scheduleScrollRestore,
    requestScrollRestoreOnLoad,
    startScrollRestoreWatch,
    tryApplyPendingScrollRestore,
    getScrollRatio,
    refreshDialog,
    refreshHistory: (options) => loadHistory(options),
    syncLiveReplySlot,
    updateScrollProgress
  };
}
