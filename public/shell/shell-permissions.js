/** HTTPS / mic permissions for iPhone Safari (shared desktop + mobile). */

import { buildVoiceShellPath, parseVoiceShellPath } from "./voice-chpu.js";
import { resolveVoiceTlsPort } from "./shell-ports.js";

function resolveHostname(hostname = window.location.hostname) {
  const host = String(hostname || "").trim();
  if (!host || host === "localhost" || host === "127.0.0.1") return "127.0.0.1";
  return host;
}

function pathnameForVoiceUrl(pathname = window.location.pathname) {
  let path = String(pathname || "/").trim();
  if (path === "/shell" || path === "/shell/") return "/";
  if (path.startsWith("/shell/")) {
    path = path.slice("/shell".length);
    if (!path.startsWith("/")) path = `/${path}`;
  }
  if (path !== "/" && !path.endsWith("/")) path = `${path}/`;
  return path;
}

function defaultVoiceShellPath() {
  const { agentId } = parseVoiceShellPath(pathnameForVoiceUrl());
  return buildVoiceShellPath(agentId);
}

function normalizeShellPath(shellPath) {
  if (shellPath == null || shellPath === "") return defaultVoiceShellPath();
  const path = String(shellPath).trim();
  const withSlash = path.startsWith("/") ? path : `/${path}`;
  return withSlash.endsWith("/") ? withSlash : `${withSlash}/`;
}

export function getShellHttpsUrl(hostname = window.location.hostname, shellPath) {
  const host = resolveHostname(hostname);
  const path = normalizeShellPath(shellPath);
  return `https://${host}:${resolveVoiceTlsPort()}${path}`;
}

export function isShellSecureContext() {
  return window.isSecureContext === true;
}

export function shellPermissionIssue({ shellPath } = {}) {
  if (isShellSecureContext()) return null;
  const host = window.location.hostname;
  const httpsUrl = getShellHttpsUrl(
    host === "localhost" || host === "127.0.0.1" ? "127.0.0.1" : host,
    shellPath
  );
  const onLan = /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host);
  return {
    title: "Нужен HTTPS",
    body: onLan
      ? "Сейчас страница открыта по HTTP (например http://192.168…). Браузер не даст микрофон без HTTPS."
      : "Сейчас страница не в защищённом контексте (HTTPS). Без этого микрофон и Web Speech недоступны.",
    hint: `Запустите npm run start:https и откройте ссылку ниже (порт ${resolveVoiceTlsPort()}).`,
    httpsUrl,
    currentUrl: window.location.href
  };
}

function detectBrowserKind() {
  const ua = String(navigator.userAgent || "");
  const isMobile = /iPhone|iPad|iPod|Android/i.test(ua);
  const isMac = /Macintosh|Mac OS X/i.test(ua) && !isMobile;
  const isChrome = /Chrome|CriOS/i.test(ua) && !/Edg/i.test(ua);
  const isSafari = /Safari/i.test(ua) && !isChrome && !/Edg/i.test(ua);
  return { isMobile, isMac, isChrome, isSafari };
}

export function describeMicPermissionDialog({ shellPath, reason = "insecure" } = {}) {
  const issue = shellPermissionIssue({ shellPath });
  const httpsUrl = issue?.httpsUrl || getShellHttpsUrl();
  const currentUrl = window.location.href;
  const { isMobile, isMac, isChrome, isSafari } = detectBrowserKind();

  if (reason === "denied") {
    const steps = ["Браузер отклонил доступ к микрофону для этого сайта."];
    if (isChrome) {
      steps.push(
        "Chrome: нажмите 🔒 слева от адреса → «Микрофон» → «Разрешить», затем обновите страницу.",
        "Или chrome://settings/content/microphone — уберите сайт из «Запрещено».",
        "macOS: Системные настройки → Конфиденциальность → Микрофон — Google Chrome включён."
      );
    } else if (isSafari && isMac) {
      steps.push(
        "Safari → Настройки → Веб-сайты → Микрофон — разрешите для этого сайта.",
        "macOS: Конфиденциальность → Микрофон — Safari включён."
      );
    } else if (isMobile) {
      steps.push("Настройки → Safari/Chrome → Микрофон → «Спросить» или «Разрешить».");
    } else {
      steps.push("Разрешите микрофон в настройках сайта (иконка замка в адресной строке).");
    }
    steps.push("Обновите страницу и нажмите 🎤 снова.");
    return { title: "Микрофон заблокирован", steps, httpsUrl, currentUrl };
  }

  const browserLabel = isChrome ? "Chrome" : isSafari ? "Safari" : "браузер";
  return {
    title: "Нужен HTTPS для микрофона",
    steps: [
      `Сейчас: ${currentUrl}`,
      issue?.body ||
        `${browserLabel} не даёт микрофон по HTTP — только по HTTPS.`,
      `Откройте: ${httpsUrl}`,
      `На Mac: npm run start:https (Voice на порту ${resolveVoiceTlsPort()}).`,
      isMobile
        ? `iPhone и Mac — одна Wi‑Fi; с телефона: https://IP-Mac:${resolveVoiceTlsPort()}/…`
        : `http://192.168… в Chrome тоже без микрофона — нужен https://…:${resolveVoiceTlsPort()}`,
      `После HTTPS ${browserLabel} спросит «Разрешить микрофон?» — нажмите Разрешить.`
    ],
    httpsUrl,
    currentUrl
  };
}

export function renderShellPermissionBanner(bannerEl, { shellPath } = {}) {
  if (!bannerEl) return;
  const issue = shellPermissionIssue({ shellPath });
  if (!issue) {
    bannerEl.classList.add("hidden");
    bannerEl.innerHTML = "";
    return;
  }
  bannerEl.classList.remove("hidden");
  bannerEl.innerHTML = `
    <div class="shell-permission-banner__main">
      <strong>${issue.title}</strong>
      <p>${issue.body}</p>
      <p class="shell-permission-banner__hint">${issue.hint}</p>
      <a class="shell-permission-banner__link" href="${issue.httpsUrl}">${issue.httpsUrl}</a>
    </div>
    <button type="button" class="shell-permission-banner__btn" data-permission-check>Проверить</button>
  `;
  bannerEl.querySelector("[data-permission-check]")?.addEventListener("click", () => {
    void runShellPermissionCheck({ shellPath, micDialog: document.getElementById("shell-mic-dialog") });
  });
}

export async function warmUpMicrophone() {
  if (!isShellSecureContext()) {
    const error = new Error("insecure-context");
    error.code = "insecure-context";
    throw error;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    const error = new Error("getUserMedia-unavailable");
    error.code = "no-getusermedia";
    throw error;
  }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  stream.getTracks().forEach((track) => track.stop());
  return true;
}

export async function runShellPermissionCheck({ micDialog, shellPath } = {}) {
  const issue = shellPermissionIssue({ shellPath });
  if (issue) {
    window.alert(`${issue.title}\n\n${issue.body}\n\n${issue.httpsUrl}\n\n${issue.hint}`);
    return { secure: false, mic: false, orient: false };
  }

  let mic = false;
  let orient = false;

  try {
    await warmUpMicrophone();
    mic = true;
  } catch (error) {
    mic = false;
    if (error?.name === "NotAllowedError") {
      window.alert("Микрофон: доступ запрещён.\n\nНастройки → Safari → Микрофон → для этого сайта «Разрешить».");
      micDialog?.showModal();
    } else {
      window.alert(`Микрофон: ${error?.message || error?.name || "ошибка"}`);
    }
  }

  if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
    try {
      const state = await DeviceOrientationEvent.requestPermission();
      orient = state === "granted";
      if (!orient) {
        window.alert("Компас: доступ не дан.\n\nНастройки → Safari → Движение и ориентация.");
      }
    } catch {
      orient = false;
    }
  } else {
    orient = true;
  }

  if (mic && orient) {
    window.alert("Готово: микрофон и ориентация доступны.");
  }

  return { secure: true, mic, orient };
}

export function initShellPermissions({ bannerEl, micDialog, shellPath } = {}) {
  renderShellPermissionBanner(bannerEl, { shellPath });
  return { runCheck: () => runShellPermissionCheck({ micDialog, shellPath }) };
}
