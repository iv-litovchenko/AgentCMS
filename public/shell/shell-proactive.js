const TICK_MS = 5000;

export const DEFAULT_PROACTIVE_PROMPT = `Пользователь неактивен {{idle_seconds}} секунд. Shell в режиме ожидания.
Представь, что ты живой человек рядом — не бот и не автоответчик.
Если уместно, мягко начни разговор: коротко, по-человечески, без канцелярита.
Если повода нет — не навязывайся: минимальный ответ или одна лёгкая фраза «Я рядом, если нужен».`;

export function renderProactivePrompt(template, { idleSeconds = 0 } = {}) {
  const sec = Math.max(1, Math.round(Number(idleSeconds) || 0));
  const minutes = Math.max(1, Math.round(sec / 60));
  const body = String(template || DEFAULT_PROACTIVE_PROMPT)
    .trim()
    .replace(/\{\{idle_seconds\}\}/g, String(sec))
    .replace(/\{\{idle_minutes\}\}/g, String(minutes));
  if (/^\[proactive\]/i.test(body)) return body;
  return `[proactive]\n${body}\n[/proactive]`;
}

export function buildProactiveMessage(idleSeconds, template = DEFAULT_PROACTIVE_PROMPT) {
  return renderProactivePrompt(template, { idleSeconds });
}

export function parseQuietTimeMinutes(value) {
  const match = String(value || "").trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function normalizeQuietTime(value, fallback = "23:00") {
  const minutes = parseQuietTimeMinutes(value);
  if (minutes === null) return fallback;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

/** true — сейчас в окне «не беспокоить» (в т.ч. через полночь, напр. 23:00–07:00). */
export function isProactiveQuietHours(
  now = new Date(),
  { enabled = false, start = "23:00", end = "07:00" } = {}
) {
  if (!enabled) return false;
  const startMin = parseQuietTimeMinutes(start);
  const endMin = parseQuietTimeMinutes(end);
  if (startMin === null || endMin === null || startMin === endMin) return false;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  if (startMin < endMin) return nowMin >= startMin && nowMin < endMin;
  return nowMin >= startMin || nowMin < endMin;
}

export function createShellProactive(deps) {
  let lastActivityAt = Date.now();
  let lastTriggeredAt = 0;
  let timer = null;
  let enabled = false;
  let idleSeconds = 180;
  let cooldownSeconds = 900;
  let quietHoursEnabled = false;
  let quietStart = "23:00";
  let quietEnd = "07:00";
  let listenersBound = false;

  function bumpActivity() {
    lastActivityAt = Date.now();
  }

  function syncToggleUi(on) {
    const btn = deps.toggleBtn;
    if (!btn) return;
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    const hint = on
      ? `Проактивность включена — диалог после ${idleSeconds} с бездействия`
      : "Проактивность — агент сам начнёт диалог при бездействии";
    btn.title = hint;
    btn.dataset.hint = hint;
    deps.syncEnabledUi?.(on);
  }

  function syncSettings(settings = {}) {
    enabled = Boolean(settings.proactiveEnabled);
    idleSeconds = Math.max(30, Number(settings.proactiveIdleSeconds) || 180);
    cooldownSeconds = Math.max(60, Number(settings.proactiveCooldownSeconds) || 900);
    quietHoursEnabled = Boolean(settings.proactiveQuietHoursEnabled);
    quietStart = normalizeQuietTime(settings.proactiveQuietStart, "23:00");
    quietEnd = normalizeQuietTime(settings.proactiveQuietEnd, "07:00");
    syncToggleUi(enabled);
  }

  function getPhase() {
    return deps.getPhase?.() || "waiting";
  }

  function canTrigger() {
    if (!enabled) return false;
    if (
      isProactiveQuietHours(new Date(), {
        enabled: quietHoursEnabled,
        start: quietStart,
        end: quietEnd
      })
    ) {
      return false;
    }
    if (document.visibilityState !== "visible") return false;
    if (deps.isPipelineBusy?.()) return false;
    if (deps.isTtsActive?.()) return false;
    if (deps.isMicActive?.()) return false;
    if (getPhase() !== "waiting") return false;
    const idleMs = Date.now() - lastActivityAt;
    if (idleMs < idleSeconds * 1000) return false;
    if (lastTriggeredAt && Date.now() - lastTriggeredAt < cooldownSeconds * 1000) return false;
    return true;
  }

  async function maybeTrigger() {
    if (!canTrigger()) return;
    const idleSec = Math.round((Date.now() - lastActivityAt) / 1000);
    lastTriggeredAt = Date.now();
    lastActivityAt = Date.now();
    try {
      await deps.sendProactive(idleSec);
    } catch {
      lastTriggeredAt = 0;
    }
  }

  function onActivity() {
    bumpActivity();
  }

  function bindActivityListeners() {
    if (listenersBound) return;
    listenersBound = true;
    document.addEventListener("pointerdown", onActivity, { passive: true });
    document.addEventListener("keydown", onActivity, { passive: true });
    document.addEventListener("touchstart", onActivity, { passive: true });
    document.addEventListener("visibilitychange", onActivity, { passive: true });
    deps.composeEl?.addEventListener("input", onActivity);
  }

  function unbindActivityListeners() {
    if (!listenersBound) return;
    listenersBound = false;
    document.removeEventListener("pointerdown", onActivity);
    document.removeEventListener("keydown", onActivity);
    document.removeEventListener("touchstart", onActivity);
    document.removeEventListener("visibilitychange", onActivity);
    deps.composeEl?.removeEventListener("input", onActivity);
  }

  function start() {
    stop();
    bumpActivity();
    bindActivityListeners();
    timer = window.setInterval(() => {
      void maybeTrigger();
    }, TICK_MS);
  }

  function stop() {
    if (timer) {
      window.clearInterval(timer);
      timer = null;
    }
    unbindActivityListeners();
  }

  async function toggleEnabled() {
    const next = !enabled;
    await deps.persistEnabled(next);
    enabled = next;
    syncToggleUi(enabled);
    bumpActivity();
    return next;
  }

  return {
    start,
    stop,
    bumpActivity,
    syncSettings,
    toggleEnabled,
    canTrigger,
    maybeTrigger
  };
}
