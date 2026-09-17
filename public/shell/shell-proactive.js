import { unwrapProactiveMessage, wrapProactiveDialogBody } from "./proactive-format.js";
import { renderShellVoicePlaceholders } from "./shell-prompt-placeholders.js";

const TICK_MS = 5000;

export const DEFAULT_PROACTIVE_PROMPT = `Фоновый пинг: пользователь молчит {{agent-cms-voice:idle_minutes}} мин ({{agent-cms-voice:idle_seconds}} сек).

Загляни в хранилище Agent CMS (MCP): заметки, задачи, расписание, недавние темы.
Если найдёшь повод — коротко поделись: интересный факт, напоминание по расписанию, открытый вопрос из workspace.
Если повода нет — одна фраза: «Я рядом, если понадоблюсь.»

Ответ 1–2 предложения, живо, по-человечески. Не напоминай про таймер и не начинай монолог.`;

export function renderProactivePrompt(template, { idleSeconds = 0 } = {}) {
  const sec = Math.max(1, Math.round(Number(idleSeconds) || 0));
  const minutes = Math.max(1, Math.round(sec / 60));
  const raw = unwrapProactiveMessage(template || DEFAULT_PROACTIVE_PROMPT);
  return renderShellVoicePlaceholders(raw, {
    idle_seconds: sec,
    idle_minutes: minutes
  });
}

export function buildProactiveMessage(idleSeconds, template = DEFAULT_PROACTIVE_PROMPT) {
  return renderProactivePrompt(template, { idleSeconds });
}

export function buildProactiveDialogBody(idleSeconds, template = DEFAULT_PROACTIVE_PROMPT) {
  return wrapProactiveDialogBody(buildProactiveMessage(idleSeconds, template));
}

export { isProactiveDialogBody, unwrapProactiveMessage, wrapProactiveDialogBody } from "./proactive-format.js";

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

/** Нормализует диапазон бездействия (сек). Legacy: proactiveIdleSeconds → min=max. */
export function normalizeProactiveIdleRange(settings = {}) {
  const legacy = Math.min(3600, Math.max(30, Number(settings.proactiveIdleSeconds) || 180));
  let min = Number(settings.proactiveIdleSecondsMin);
  let max = Number(settings.proactiveIdleSecondsMax);
  if (!Number.isFinite(min) && !Number.isFinite(max)) {
    min = legacy;
    max = legacy;
  } else {
    if (!Number.isFinite(min)) min = Number.isFinite(max) ? Math.min(legacy, max) : legacy;
    if (!Number.isFinite(max)) max = Number.isFinite(min) ? Math.max(legacy, min) : legacy;
  }
  min = Math.min(3600, Math.max(30, min));
  max = Math.min(3600, Math.max(30, max));
  if (min > max) [min, max] = [max, min];
  return { min, max };
}

export function pickProactiveIdleTarget(min, max) {
  const lo = Math.max(30, Number(min) || 180);
  const hi = Math.max(lo, Number(max) || lo);
  if (lo >= hi) return lo;
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

export function formatProactiveIdleRangeHint(min, max) {
  const { min: lo, max: hi } = normalizeProactiveIdleRange({
    proactiveIdleSecondsMin: min,
    proactiveIdleSecondsMax: max
  });
  return lo === hi ? `${lo} с` : `${lo}–${hi} с`;
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
  let idleSecondsMin = 120;
  let idleSecondsMax = 240;
  let idleTargetSeconds = 180;
  let cooldownSeconds = 900;
  let quietHoursEnabled = false;
  let quietStart = "23:00";
  let quietEnd = "07:00";
  let listenersBound = false;

  function pickIdleTarget() {
    idleTargetSeconds = pickProactiveIdleTarget(idleSecondsMin, idleSecondsMax);
  }

  function bumpActivity() {
    lastActivityAt = Date.now();
    pickIdleTarget();
  }

  function syncToggleUi(on) {
    const btn = deps.toggleBtn;
    if (!btn) return;
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    const rangeHint = formatProactiveIdleRangeHint(idleSecondsMin, idleSecondsMax);
    const hint = on
      ? `Проактивность включена — диалог через ${rangeHint} бездействия (случайно в диапазоне)`
      : "Проактивность — агент сам начнёт диалог при бездействии";
    btn.title = hint;
    btn.dataset.hint = hint;
    deps.syncEnabledUi?.(on);
  }

  function syncSettings(settings = {}) {
    enabled = Boolean(settings.proactiveEnabled);
    const range = normalizeProactiveIdleRange(settings);
    idleSecondsMin = range.min;
    idleSecondsMax = range.max;
    cooldownSeconds = Math.max(60, Number(settings.proactiveCooldownSeconds) || 900);
    quietHoursEnabled = Boolean(settings.proactiveQuietHoursEnabled);
    quietStart = normalizeQuietTime(settings.proactiveQuietStart, "23:00");
    quietEnd = normalizeQuietTime(settings.proactiveQuietEnd, "07:00");
    pickIdleTarget();
    syncToggleUi(enabled);
    syncRunningState();
  }

  function getPhase() {
    return deps.getPhase?.() || "waiting";
  }

  function getBlockReason() {
    if (!enabled) return "disabled";
    if (
      isProactiveQuietHours(new Date(), {
        enabled: quietHoursEnabled,
        start: quietStart,
        end: quietEnd
      })
    ) {
      return "quiet-hours";
    }
    if (document.visibilityState !== "visible") return "tab-hidden";
    if (deps.isPipelineBusy?.()) return "pipeline-busy";
    if (deps.isTtsActive?.()) return "tts-active";
    if (deps.isMicActive?.()) return "mic-active";
    const phase = getPhase();
    if (phase !== "waiting") return `phase-${phase}`;
    const idleMs = Date.now() - lastActivityAt;
    if (idleMs < idleTargetSeconds * 1000) {
      return `idle-${Math.max(1, Math.ceil((idleTargetSeconds * 1000 - idleMs) / 1000))}s`;
    }
    if (lastTriggeredAt && Date.now() - lastTriggeredAt < cooldownSeconds * 1000) {
      return `cooldown-${Math.max(1, Math.ceil((cooldownSeconds * 1000 - (Date.now() - lastTriggeredAt)) / 1000))}s`;
    }
    return "ready";
  }

  function canTrigger() {
    return getBlockReason() === "ready";
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
    deps.composeEl?.addEventListener("input", onActivity);
  }

  function unbindActivityListeners() {
    if (!listenersBound) return;
    listenersBound = false;
    document.removeEventListener("pointerdown", onActivity);
    document.removeEventListener("keydown", onActivity);
    document.removeEventListener("touchstart", onActivity);
    deps.composeEl?.removeEventListener("input", onActivity);
  }

  function ensureRunning() {
    if (!enabled) return;
    bindActivityListeners();
    if (timer) return;
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

  function syncRunningState() {
    if (enabled) {
      bumpActivity();
      ensureRunning();
    } else {
      stop();
    }
  }

  async function toggleEnabled() {
    const next = !enabled;
    await deps.persistEnabled(next);
    enabled = next;
    syncToggleUi(enabled);
    syncRunningState();
    return next;
  }

  return {
    stop,
    bumpActivity,
    syncSettings,
    toggleEnabled,
    canTrigger,
    getBlockReason,
    maybeTrigger,
    isEnabled: () => enabled
  };
}
