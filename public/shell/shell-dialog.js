/** Mobile-style dialog: history, refresh, copy, errors. */

import { renderShellReplyBody } from "@shell/markdown";

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
    } else if (lastUserAt && at) {
      next.durationMs = Math.max(0, at - lastUserAt);
    }
    return next;
  });
}

function historyRoleLabel(item) {
  if (item?.label) return item.label;
  if (item?.role === "agent") return "AI";
  return "Human (человек)";
}

function historyAvatarLabel(item) {
  return item?.role === "agent" ? "AI" : "H";
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
 *   fetchHistory?: () => Promise<Array<{ role?: string, body?: string, at?: number, label?: string }>>
 * }} options
 */
export function createShellDialog(options = {}) {
  const nodes = options;
  const fetchHistory = typeof options.fetchHistory === "function" ? options.fetchHistory : null;
  let history = [];
  let historyLoading = false;
  let historyLoadPromise = null;
  let lastReplyRaw = "";
  let lastAskRaw = "";
  let pullStartY = 0;
  let pullActive = false;
  let reconnectHandler = options.onReconnect || null;

  function loadHistory() {
    if (!fetchHistory) {
      history = [];
      renderHistoryUi();
      return Promise.resolve();
    }
    if (historyLoadPromise) return historyLoadPromise;
    historyLoading = true;
    historyLoadPromise = fetchHistory()
      .then((items) => {
        history = withReplyDurations(Array.isArray(items) ? items.slice(-MAX_HISTORY) : []);
        clearError();
        renderHistoryUi();
      })
      .catch((error) => {
        const hint = connectionHint(error);
        setError("Не удалось загрузить историю", { hint });
        renderHistoryUi();
      })
      .finally(() => {
        historyLoading = false;
        historyLoadPromise = null;
      });
    return historyLoadPromise;
  }

  function pushHistory(role, body) {
    const text = String(body || "").trim();
    if (!text) return;
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

  function renderThreadMessage(item) {
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
      el.textContent = String(item.body || "");
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
    nodes.lastReply?.classList.toggle("hidden", hasThread && !streaming);
    nodes.lastAskWrap?.classList.toggle("hidden", hasThread || !lastAskRaw);
  }

  function renderThread() {
    if (!nodes.thread) return;
    nodes.thread.replaceChildren();
    for (const item of history) {
      nodes.thread.append(renderThreadMessage(item));
    }
    syncLiveReplySlot();
    if (history.length) {
      nodes.scroll?.scrollTo?.({ top: nodes.scroll.scrollHeight, behavior: "auto" });
    }
  }

  function renderHistoryUi() {
    if (nodes.historyCount) {
      nodes.historyCount.textContent = history.length ? String(history.length) : "";
    }
    nodes.historyOpen?.classList.toggle("hidden", history.length === 0);
    if (nodes.historyList) {
      nodes.historyList.innerHTML = "";
      for (const item of history) {
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
        if (item.role === "agent") {
          renderShellReplyBody(body, String(item.body || ""));
        } else {
          body.textContent = String(item.body || "");
        }
        bodyWrap.append(head, body);
        li.append(avatar, bodyWrap);
        nodes.historyList.append(li);
      }
    }
    renderThread();
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
    syncLiveReplySlot();
    if (raw && raw !== "—") {
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
      live: "Связь с сервером · на связи",
      error: "Связь с сервером · обрыв",
      offline: "Связь с сервером · нет сети",
      connecting: "Связь с сервером · подключение…"
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

  function refreshDialog() {
    return loadHistory().then(() => doReconnect({ soft: true }));
  }

  function bindUi() {
    nodes.refreshBtn?.addEventListener("click", () => {
      void refreshDialog();
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
    setConnectionState,
    setError,
    clearError,
    bindReconnect,
    connectionHint,
    pushHistory,
    refreshHistory: loadHistory,
    syncLiveReplySlot
  };
}
