/** HTTPS / mic permissions for iPhone Safari (shared desktop + mobile). */

import { buildVoiceShellPath, parseVoiceShellPath } from "./voice-chpu.js";
import { resolveVoiceTlsPort } from "./shell-ports.js";
import { getShellSurface } from "./shell-surface.js";

/** Сохраняем localhost и 127.0.0.1 — Chrome считает их разными origin для микрофона. */
function resolveHostname(hostname = window.location.hostname) {
  const host = String(hostname || "").trim();
  if (!host || host === "0.0.0.0") return "localhost";
  if (host === "localhost" || host === "127.0.0.1") return host;
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
  const path =
    shellPath != null && shellPath !== ""
      ? normalizeShellPath(shellPath)
      : isShellSecureContext() && window.location.protocol === "https:"
        ? pathnameForVoiceUrl()
        : normalizeShellPath(shellPath);
  const host = resolveHostname(hostname);

  if (isShellSecureContext() && window.location.protocol === "https:") {
    const liveHost = resolveHostname(window.location.hostname);
    const livePort = window.location.port || String(resolveVoiceTlsPort());
    const portSuffix = livePort ? `:${livePort}` : "";
    return `https://${liveHost}${portSuffix}${path}`;
  }

  return `https://${host}:${resolveVoiceTlsPort()}${path}`;
}

export function isShellSecureContext() {
  return window.isSecureContext === true;
}

export function shellPermissionIssue({ shellPath } = {}) {
  if (isShellSecureContext()) return null;
  const host = window.location.hostname;
  const httpsUrl = getShellHttpsUrl(host || "localhost", shellPath);
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

export const CHROME_MIC_SETTINGS_URL = "chrome://settings/content/microphone";

/** Side Panel: права сайта Voice через меню иконки расширения (не chrome://). */
export const CHROME_COMPANION_MIC_HINT =
  "ПКМ по иконке расширения Agent Shell (панель расширений справа сверху) → «Просмотреть разрешения для сайта» → Микрофон → Разрешить.";

function detectBrowserKind() {
  const ua = String(navigator.userAgent || "");
  const isMobile = /iPhone|iPad|iPod|Android/i.test(ua);
  const isMac = /Macintosh|Mac OS X/i.test(ua) && !isMobile;
  const isChrome = /Chrome|CriOS/i.test(ua) && !/Edg/i.test(ua);
  const isSafari = /Safari/i.test(ua) && !isChrome && !/Edg/i.test(ua);
  return { isMobile, isMac, isChrome, isSafari };
}

/** Оранжевая подсказка на вкладке STT — только десктопный Chrome. */
export function initMicChromeHint({ hintEl, originEl } = {}) {
  if (!hintEl) return;
  const { isChrome, isMobile } = detectBrowserKind();
  if (!isChrome || isMobile) {
    hintEl.hidden = true;
    return;
  }
  hintEl.hidden = false;
  if (originEl) {
    originEl.textContent = voiceSiteOriginLabel();
  }
}

export function resolveMicPermissionDialogInput(input = "insecure") {
  if (typeof input === "string") return { reason: input };
  if (input && typeof input === "object") return { ...input };
  return { reason: "insecure" };
}

function readMicPermissionSurfaceHost(surfaceHost) {
  const explicit = String(surfaceHost || "").trim();
  if (explicit) return explicit;
  try {
    return getShellSurface()?.host || "";
  } catch {
    return "";
  }
}

function voiceSiteOriginLabel() {
  try {
    const { protocol, hostname, port } = window.location;
    const portSuffix = port ? `:${port}` : "";
    return `${protocol}//${hostname}${portSuffix}`;
  } catch {
    return window.location.href;
  }
}

/** Короткая строка для статуса под 🎤. */
export function formatMicAccessPhaseMessage(input = "denied") {
  const { reason, surfaceHost } = resolveMicPermissionDialogInput(input);
  const host = readMicPermissionSurfaceHost(surfaceHost);
  const { isChrome, isSafari } = detectBrowserKind();

  if (reason === "insecure") {
    return `Нужен HTTPS для микрофона · ${getShellHttpsUrl()}`;
  }
  if (reason === "policy") {
    if (host === "chrome-panel") {
      return "Микрофон в Side Panel · ПКМ по иконке расширения → разрешения сайта";
    }
    return "Микрофон недоступен в этом окне · см. диалог помощи";
  }
  if (host === "chrome-panel") {
    return "Нет микрофона в Side Panel · ПКМ по иконке расширения → разрешения сайта";
  }
  if (isChrome) return "Нет доступа к микрофону · ПКМ по иконке расширения или 🔒 у сайта Voice";
  if (isSafari) return "Нет доступа к микрофону · разрешите в настройках Safari";
  return "Нет доступа к микрофону · см. диалог помощи";
}

export function describeMicPermissionDialog(input = {}) {
  const {
    shellPath,
    reason = "insecure",
    surfaceHost: surfaceHostInput,
    deniedSource = "",
    errorDetail = ""
  } = resolveMicPermissionDialogInput(input);
  const issue = shellPermissionIssue({ shellPath });
  const httpsUrl = issue?.httpsUrl || getShellHttpsUrl();
  const currentUrl = window.location.href;
  const siteOrigin = voiceSiteOriginLabel();
  const surfaceHost = readMicPermissionSurfaceHost(surfaceHostInput);
  const inChromePanel = surfaceHost === "chrome-panel";
  const { isMobile, isMac, isChrome, isSafari } = detectBrowserKind();
  const detail = String(errorDetail || "").trim();
  const source = String(deniedSource || "").trim();

  if (reason === "policy") {
    const steps = [
      "Браузер не дал доступ к микрофону или распознаванию речи в этом окне (часто не связано со списком «Запрещено»)."
    ];
    if (detail) steps.push(`Код: ${detail}`);
    if (inChromePanel) {
      steps.push(CHROME_COMPANION_MIC_HINT, `Сайт Voice: ${siteOrigin} (127.0.0.1 и localhost — разные записи).`);
    } else if (isChrome) {
      steps.push(
        `Chrome: 🔒 у ${siteOrigin} → Микрофон → Разрешить.`,
        `${CHROME_MIC_SETTINGS_URL} — сайт может быть не в «Запрещено», но и без «Разрешить».`
      );
    } else {
      steps.push("Разрешите микрофон для этого сайта в настройках браузера.");
    }
    steps.push("Обновите страницу и нажмите 🎤 снова.");
    return { title: "Микрофон недоступен в этом окне", steps, httpsUrl, currentUrl, siteOrigin };
  }

  if (reason === "denied") {
    const steps = [
      "Браузер отклонил микрофон. Это не всегда значит, что сайт в «Запрещено» — иногда запрос даже не показывался."
    ];
    if (detail) steps.push(`Код: ${detail}${source ? ` (${source})` : ""}`);
    if (inChromePanel) {
      steps.push(CHROME_COMPANION_MIC_HINT, `Сайт Voice в панели: ${siteOrigin}.`);
    }
    if (isChrome) {
      if (!inChromePanel) {
        steps.push(
          `🔒 слева от адреса Voice (${siteOrigin}) → «Микрофон» → «Разрешить», затем обновите.`,
          `${CHROME_MIC_SETTINGS_URL} — проверьте «Разрешено» для ${siteOrigin}, не только «Запрещено».`
        );
      }
      if (isMac) {
        steps.push("macOS: Системные настройки → Конфиденциальность → Микрофон — Google Chrome включён.");
      }
    } else if (isSafari && isMac) {
      steps.push(
        "Safari → Настройки → Веб-сайты → Микрофон — разрешите для этого сайта.",
        "macOS: Конфиденциальность → Микрофон — Safari включён."
      );
    } else if (isMobile) {
      steps.push("Настройки → Safari/Chrome → Микрофон → «Спросить» или «Разрешить».");
    } else if (!inChromePanel) {
      steps.push("Разрешите микрофон в настройках сайта (иконка замка в адресной строке).");
    }
    steps.push("Обновите страницу и нажмите 🎤 снова.");
    return { title: "Микрофон недоступен", steps, httpsUrl, currentUrl, siteOrigin };
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
      const info = describeMicPermissionDialog({
        reason: "denied",
        deniedSource: "getUserMedia",
        errorDetail: error.name
      });
      if (micDialog && typeof micDialog.showModal === "function") {
        const titleEl = document.getElementById("shell-mic-dialog-title");
        const stepsEl = document.getElementById("shell-mic-dialog-steps");
        const urlEl = document.getElementById("shell-mic-dialog-url");
        if (titleEl) titleEl.textContent = info.title;
        if (stepsEl) {
          stepsEl.replaceChildren(
            ...info.steps.map((step) => {
              const li = document.createElement("li");
              li.textContent = step;
              return li;
            })
          );
        }
        if (urlEl) {
          urlEl.textContent = info.httpsUrl;
          urlEl.href = info.httpsUrl;
        }
        micDialog.showModal();
      } else {
        window.alert(`${info.title}\n\n${info.steps.join("\n")}\n\nHTTPS Voice: ${info.httpsUrl}`);
      }
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
