/** Mobile-style dialog: history, collapse, copy/share, reconnect, errors. */

import { SHELL_STORAGE } from "@shell/storage-keys";

const HISTORY_KEY = SHELL_STORAGE.history;
const CHAT_COLLAPSE_KEY = SHELL_STORAGE.chatCollapsed;
const MAX_HISTORY = 12;
const STREAM_PREVIEW_LEN = 120;

function formatHistoryTime(at) {
  try {
    return new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(new Date(at));
  } catch {
    return "";
  }
}

function formatHistoryPreview(text) {
  const raw = String(text || "").replace(/\s+/g, " ").trim();
  if (!raw) return "";
  return raw.length > STREAM_PREVIEW_LEN ? `${raw.slice(0, STREAM_PREVIEW_LEN)}…` : raw;
}

function connectionHint(error) {
  const msg = String(error?.message || error || "").toLowerCase();
  if (msg.includes("failed") || msg.includes("network") || msg.includes("load") || msg.includes("abort")) {
    return "Mac и iPhone в одной Wi‑Fi? CMS: HOST=0.0.0.0 npm start";
  }
  if (msg.includes("404")) return "Перезапустите CMS после обновления";
  return "";
}

/**
 * @param {{
 *   panel?: HTMLElement | null,
 *   scroll?: HTMLElement | null,
 *   collapseBtn?: HTMLElement | null,
 *   collapseHint?: HTMLElement | null,
 *   statusDot?: HTMLElement | null,
 *   reconnectBtn?: HTMLElement | null,
 *   copyBtn?: HTMLElement | null,
 *   shareBtn?: HTMLElement | null,
 *   historyOpen?: HTMLElement | null,
 *   historyCount?: HTMLElement | null,
 *   historyDialog?: HTMLDialogElement | null,
 *   historyClose?: HTMLElement | null,
 *   historyList?: HTMLElement | null,
 *   lastAskWrap?: HTMLElement | null,
 *   lastAsk?: HTMLElement | null,
 *   errorEl?: HTMLElement | null,
 *   pullHint?: HTMLElement | null,
 *   onReconnect?: () => void
 * }} options
 */
export function createShellDialog(options = {}) {
  const nodes = options;
  let history = [];
  let collapsed = localStorage.getItem(CHAT_COLLAPSE_KEY) === "1";
  let lastReplyRaw = "";
  let lastAskRaw = "";
  let pullStartY = 0;
  let pullActive = false;
  let reconnectHandler = options.onReconnect || null;

  function loadHistory() {
    try {
      const raw = sessionStorage.getItem(HISTORY_KEY);
      history = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(history)) history = [];
    } catch {
      history = [];
    }
  }

  function saveHistory() {
    sessionStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-MAX_HISTORY)));
  }

  function pushHistory(role, body) {
    const text = String(body || "").trim();
    if (!text) return;
    history.push({ role, body: text, at: Date.now() });
    if (history.length > MAX_HISTORY) history = history.slice(-MAX_HISTORY);
    saveHistory();
    renderHistoryUi();
  }

  function renderHistoryUi() {
    if (nodes.historyCount) {
      nodes.historyCount.textContent = history.length ? String(history.length) : "";
    }
    nodes.historyOpen?.classList.toggle("hidden", history.length === 0);
    if (!nodes.historyList) return;
    nodes.historyList.innerHTML = "";
    for (const item of history) {
      const li = document.createElement("li");
      li.className = `shell-history-item shell-history-item--${item.role}`;
      const avatar = document.createElement("span");
      avatar.className = "shell-history-avatar";
      avatar.textContent = item.role === "user" ? "Вы" : "AI";
      avatar.setAttribute("aria-hidden", "true");
      const bodyWrap = document.createElement("div");
      bodyWrap.className = "shell-history-body";
      const head = document.createElement("div");
      head.className = "shell-history-head";
      const label = document.createElement("span");
      label.className = "shell-history-role";
      label.textContent = item.role === "user" ? "Вы" : "Агент";
      const time = document.createElement("time");
      time.className = "shell-history-time";
      time.textContent = formatHistoryTime(item.at);
      head.append(label, time);
      const body = document.createElement("div");
      body.className = "shell-history-text";
      body.textContent = item.body;
      bodyWrap.append(head, body);
      li.append(avatar, bodyWrap);
      nodes.historyList.append(li);
    }
  }

  function setCollapsed(next) {
    collapsed = Boolean(next);
    nodes.panel?.setAttribute("data-collapsed", collapsed ? "1" : "0");
    nodes.collapseBtn?.setAttribute("aria-expanded", collapsed ? "false" : "true");
    localStorage.setItem(CHAT_COLLAPSE_KEY, collapsed ? "1" : "0");
    updateCollapseHint();
  }

  function updateCollapseHint() {
    const preview = formatHistoryPreview(lastReplyRaw);
    if (!nodes.collapseHint) return;
    if (collapsed && preview) {
      nodes.collapseHint.textContent = preview;
      nodes.collapseHint.classList.remove("hidden");
      nodes.collapseBtn?.setAttribute("title", preview);
    } else {
      nodes.collapseHint.textContent = "";
      nodes.collapseHint.classList.add("hidden");
      nodes.collapseBtn?.setAttribute("title", collapsed ? "Развернуть диалог" : "Свернуть диалог");
    }
  }

  function setLastAsk(text) {
    const raw = String(text || "").trim();
    lastAskRaw = raw;
    if (!raw) {
      nodes.lastAskWrap?.classList.add("hidden");
      if (nodes.lastAsk) nodes.lastAsk.textContent = "";
      return;
    }
    nodes.lastAskWrap?.classList.remove("hidden");
    if (nodes.lastAsk) nodes.lastAsk.textContent = raw;
  }

  function onReplyRendered(rawText) {
    const raw = String(rawText || "").trim();
    lastReplyRaw = raw;
    const hasReply = raw && raw !== "—";
    nodes.copyBtn?.classList.toggle("hidden", !hasReply);
    nodes.shareBtn?.classList.toggle("hidden", !hasReply || !navigator.share);
    updateCollapseHint();
    if (hasReply) {
      nodes.scroll?.scrollTo?.({ top: nodes.scroll.scrollHeight, behavior: "smooth" });
    }
  }

  function onUserMessage(text) {
    clearError();
    setLastAsk(text);
    pushHistory("user", text);
  }

  function onAgentReply(body) {
    const raw = String(body || "").trim();
    if (!raw) return;
    pushHistory("agent", raw);
    onReplyRendered(raw);
  }

  function getLastReplyRaw() {
    return lastReplyRaw;
  }

  function setConnectionState(stateName) {
    if (!nodes.statusDot) return;
    const state =
      stateName === "live" ? "live" : stateName === "error" ? "error" : stateName === "offline" ? "offline" : "connecting";
    nodes.statusDot.dataset.state = state;
    const labels = {
      live: "На связи",
      error: "Обрыв SSE",
      offline: "Нет сети",
      connecting: "Подключение…"
    };
    const title = labels[state] || labels.connecting;
    nodes.statusDot.title = title;
    nodes.statusDot.setAttribute("aria-label", title);
  }

  function setError(message, { hint = "" } = {}) {
    if (!nodes.errorEl) return;
    if (!message) {
      nodes.errorEl.classList.add("hidden");
      nodes.errorEl.textContent = "";
      return;
    }
    nodes.errorEl.textContent = hint ? `${message} — ${hint}` : message;
    nodes.errorEl.classList.remove("hidden");
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

  function bindUi() {
    nodes.collapseBtn?.addEventListener("click", () => setCollapsed(!collapsed));
    nodes.reconnectBtn?.addEventListener("click", () => doReconnect());
    nodes.historyOpen?.addEventListener("click", () => {
      renderHistoryUi();
      nodes.historyDialog?.showModal();
    });
    nodes.historyClose?.addEventListener("click", () => nodes.historyDialog?.close());
    nodes.historyDialog?.addEventListener("click", (event) => {
      if (event.target === nodes.historyDialog) nodes.historyDialog.close();
    });

    nodes.copyBtn?.addEventListener("click", async () => {
      if (!lastReplyRaw) return;
      try {
        await navigator.clipboard.writeText(lastReplyRaw);
        nodes.copyBtn.title = "Скопировано";
        setTimeout(() => {
          if (nodes.copyBtn) nodes.copyBtn.title = "Копировать ответ";
        }, 1200);
      } catch {
        setError("Не удалось скопировать");
      }
    });

    nodes.shareBtn?.addEventListener("click", async () => {
      if (!lastReplyRaw || !navigator.share) return;
      try {
        await navigator.share({ title: "Agent Shell", text: lastReplyRaw });
      } catch (error) {
        if (error?.name !== "AbortError") setError("Не удалось поделиться");
      }
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
        if (show) doReconnect();
      },
      { passive: true }
    );

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") doReconnect({ soft: true });
    });
  }

  function init() {
    loadHistory();
    setCollapsed(collapsed);
    renderHistoryUi();
    bindUi();
  }

  return {
    init,
    setLastAsk,
    onUserMessage,
    onAgentReply,
    onReplyRendered,
    getLastReplyRaw,
    setConnectionState,
    setError,
    clearError,
    bindReconnect,
    connectionHint,
    pushHistory
  };
}
