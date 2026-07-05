const HTTPS_MOBILE_PORT = 3443;

export function getMobileHttpsUrl(hostname = window.location.hostname) {
  if (!hostname || hostname === "localhost" || hostname === "127.0.0.1") {
    return `https://127.0.0.1:${HTTPS_MOBILE_PORT}/shell/mobile/`;
  }
  return `https://${hostname}:${HTTPS_MOBILE_PORT}/shell/mobile/`;
}

export function isMobileSecureContext() {
  return window.isSecureContext === true;
}

export function mobilePermissionIssue() {
  if (isMobileSecureContext()) return null;
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") return null;
  const httpsUrl = getMobileHttpsUrl(host);
  return {
    title: "Нужен HTTPS",
    body:
      "Safari на iPhone не спрашивает микрофон по http://. " +
      "Откройте ссылку ниже (порт 3443). На Mac: npm run start:https",
    hint: "Сертификат: Подробнее → Перейти на сайт.",
    httpsUrl
  };
}

export function renderMobilePermissionBanner(bannerEl) {
  if (!bannerEl) return;
  const issue = mobilePermissionIssue();
  if (!issue) {
    bannerEl.classList.add("hidden");
    bannerEl.innerHTML = "";
    return;
  }
  bannerEl.classList.remove("hidden");
  bannerEl.innerHTML = `
    <div class="mobile-permission-banner__main">
      <strong>${issue.title}</strong>
      <p>${issue.body}</p>
      <p class="mobile-permission-banner__hint">${issue.hint}</p>
      <a class="mobile-permission-banner__link" href="${issue.httpsUrl}">${issue.httpsUrl}</a>
    </div>
    <button type="button" class="mobile-permission-banner__btn" id="mobile-permission-check">Проверить</button>
  `;
  bannerEl.querySelector("#mobile-permission-check")?.addEventListener("click", () => {
    void runMobilePermissionCheck({ micDialog: document.getElementById("mobile-mic-dialog") });
  });
}

export async function warmUpMicrophone() {
  if (!isMobileSecureContext()) {
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

export async function runMobilePermissionCheck({ micDialog } = {}) {
  const issue = mobilePermissionIssue();
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

export function initMobilePermissions({ bannerEl, micDialog } = {}) {
  renderMobilePermissionBanner(bannerEl);
  return { runCheck: () => runMobilePermissionCheck({ micDialog }) };
}
