/** HTTPS / mic permissions for iPhone Safari (shared desktop + mobile). */

const HTTPS_SHELL_PORT = 3443;

function normalizeShellPath(shellPath = "/shell/") {
  const path = String(shellPath || "/shell/").trim();
  const withSlash = path.startsWith("/") ? path : `/${path}`;
  return withSlash.endsWith("/") ? withSlash : `${withSlash}/`;
}

export function getShellHttpsUrl(hostname = window.location.hostname, shellPath = "/shell/") {
  const path = normalizeShellPath(shellPath);
  if (!hostname || hostname === "localhost" || hostname === "127.0.0.1") {
    return `https://127.0.0.1:${HTTPS_SHELL_PORT}${path}`;
  }
  return `https://${hostname}:${HTTPS_SHELL_PORT}${path}`;
}

export function isShellSecureContext() {
  return window.isSecureContext === true;
}

export function shellPermissionIssue({ shellPath = "/shell/" } = {}) {
  if (isShellSecureContext()) return null;
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") return null;
  const httpsUrl = getShellHttpsUrl(host, shellPath);
  return {
    title: "Нужен HTTPS",
    body:
      "Safari на iPhone не спрашивает микрофон по http://. " +
      "Откройте ссылку ниже (порт 3443). На Mac: npm run start:https",
    hint: "Сертификат: Подробнее → Перейти на сайт.",
    httpsUrl
  };
}

export function renderShellPermissionBanner(bannerEl, { shellPath = "/shell/" } = {}) {
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

export async function runShellPermissionCheck({ micDialog, shellPath = "/shell/" } = {}) {
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

export function initShellPermissions({ bannerEl, micDialog, shellPath = "/shell/" } = {}) {
  renderShellPermissionBanner(bannerEl, { shellPath });
  return { runCheck: () => runShellPermissionCheck({ micDialog, shellPath }) };
}
