/** Device chips: compass / tilt / GPS (shared desktop + mobile). */

const ORIENT_THROTTLE_MS = 200;
import { SHELL_STORAGE } from "@shell/storage-keys";

const LOCATION_SHARE_KEY = SHELL_STORAGE.locationShare;
const LOCATION_MAX_AGE_MS = 60_000;

/** @type {{ latitude: number, longitude: number, accuracy?: number, altitude?: number | null, heading?: number | null, speed?: number | null, capturedAt: string } | null} */
let lastLocation = null;
let locationShareEnabled = localStorage.getItem(LOCATION_SHARE_KEY) === "1";
/** @type {number | null} */
let locationWatchId = null;

function formatHeading(alpha) {
  if (alpha == null || Number.isNaN(alpha)) return null;
  const deg = Math.round(((alpha % 360) + 360) % 360);
  const dirs = ["С", "СВ", "В", "ЮВ", "Ю", "ЮЗ", "З", "СЗ"];
  const dir = dirs[Math.round(deg / 45) % 8];
  return { deg, dir, label: `${deg}° ${dir}` };
}

function formatTilt(beta, gamma) {
  if (beta == null || gamma == null || Number.isNaN(beta) || Number.isNaN(gamma)) return null;
  return { beta: Math.round(beta), gamma: Math.round(gamma) };
}

function needsOrientationPermission() {
  return (
    typeof DeviceOrientationEvent !== "undefined" &&
    typeof DeviceOrientationEvent.requestPermission === "function"
  );
}

async function requestOrientationPermission() {
  if (!needsOrientationPermission()) return true;
  try {
    const state = await DeviceOrientationEvent.requestPermission();
    return state === "granted";
  } catch {
    return false;
  }
}

/** @param {{ button?: HTMLElement | null, valueEl?: HTMLElement | null }} options */
export function initShellOrientationChip({ button, valueEl } = {}) {
  const buttonEl = button;
  const valueNode = valueEl || button;
  if (!buttonEl || !valueNode) return;

  let lastRender = 0;
  let active = false;
  let lastAlpha = null;
  let lastBeta = null;
  let lastGamma = null;

  const render = () => {
    const heading = formatHeading(lastAlpha);
    const tilt = formatTilt(lastBeta, lastGamma);

    if (!active) {
      valueNode.textContent = needsOrientationPermission() ? "нажмите" : "—";
      buttonEl.title = needsOrientationPermission()
        ? "Нажмите, чтобы включить компас и наклон"
        : "Ориентация недоступна в этом браузере";
      buttonEl.dataset.active = "0";
      return;
    }

    buttonEl.dataset.active = "1";
    if (heading) {
      valueNode.textContent = `${heading.deg}°`;
      const tiltPart = tilt ? ` · ↕${tilt.beta}° ↔${tilt.gamma}°` : "";
      buttonEl.title = `Компас: ${heading.label}${tiltPart}`;
    } else if (tilt) {
      valueNode.textContent = `↕${tilt.beta}°`;
      buttonEl.title = `Наклон: ↕${tilt.beta}° ↔${tilt.gamma}°`;
    } else {
      valueNode.textContent = "…";
      buttonEl.title = "Ожидание данных сенсоров…";
    }
  };

  const onOrientation = (event) => {
    if (event.alpha != null) lastAlpha = event.alpha;
    if (event.beta != null) lastBeta = event.beta;
    if (event.gamma != null) lastGamma = event.gamma;
    const now = Date.now();
    if (now - lastRender < ORIENT_THROTTLE_MS) return;
    lastRender = now;
    render();
  };

  const startListening = () => {
    window.addEventListener("deviceorientation", onOrientation, true);
    active = true;
    render();
  };

  const enable = async () => {
    if (!window.isSecureContext) {
      valueNode.textContent = "HTTPS";
      buttonEl.title =
        "Компас на iPhone нужен HTTPS — npm run start:https на Mac (порт 3443)";
      buttonEl.dataset.active = "0";
      return false;
    }
    const granted = await requestOrientationPermission();
    if (!granted) {
      active = false;
      valueNode.textContent = "нет доступа";
      buttonEl.title = "Разрешите доступ к движению и ориентации";
      buttonEl.dataset.active = "0";
      return false;
    }
    startListening();
    return true;
  };

  buttonEl.addEventListener("click", () => {
    if (!active) void enable();
  });

  render();

  if (!needsOrientationPermission() && typeof DeviceOrientationEvent !== "undefined") {
    startListening();
  }
}

function formatLocationLabel(location) {
  if (!location) return "—";
  return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
}

function storeLocation(position) {
  const coords = position?.coords;
  if (!coords) return null;
  lastLocation = {
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracy: coords.accuracy,
    altitude: coords.altitude,
    heading: coords.heading,
    speed: coords.speed,
    capturedAt: new Date(position.timestamp || Date.now()).toISOString()
  };
  return lastLocation;
}

function geolocationUnavailableReason() {
  if (!window.isSecureContext) return "HTTPS";
  if (!navigator.geolocation) return "n/a";
  return null;
}

export function getShellDeviceLocation() {
  return lastLocation ? { ...lastLocation } : null;
}

export function isShellLocationShareEnabled() {
  return locationShareEnabled && Boolean(lastLocation);
}

export function refreshShellLocationForSend() {
  return new Promise((resolve) => {
    if (!navigator.geolocation || !window.isSecureContext) {
      resolve(lastLocation);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(storeLocation(position)),
      () => resolve(lastLocation),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: LOCATION_MAX_AGE_MS }
    );
  });
}

/**
 * @param {{
 *   button?: HTMLElement | null,
 *   valueEl?: HTMLElement | null,
 *   shareBtn?: HTMLElement | null,
 *   onUpdate?: () => void
 * }} options
 */
export function initShellLocationChip({ button, valueEl, shareBtn, onUpdate } = {}) {
  const buttonEl = button;
  const valueNode = valueEl || button;
  if (!buttonEl || !valueNode) return;

  let active = false;
  let busy = false;

  const syncShareBtn = () => {
    if (!shareBtn) return;
    shareBtn.classList.toggle("hidden", !lastLocation);
    shareBtn.dataset.active = locationShareEnabled ? "1" : "0";
    shareBtn.setAttribute("aria-pressed", locationShareEnabled ? "true" : "false");
    shareBtn.title = locationShareEnabled
      ? "GPS прикрепляется к сообщениям агенту"
      : "Поделиться местоположением с агентом";
  };

  const stopWatch = () => {
    if (locationWatchId == null || !navigator.geolocation) return;
    navigator.geolocation.clearWatch(locationWatchId);
    locationWatchId = null;
  };

  const startWatch = () => {
    if (locationWatchId != null || !navigator.geolocation) return;
    locationWatchId = navigator.geolocation.watchPosition(
      (position) => {
        storeLocation(position);
        render();
        onUpdate?.();
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: LOCATION_MAX_AGE_MS }
    );
  };

  const render = () => {
    syncShareBtn();
    const unavailable = geolocationUnavailableReason();
    if (unavailable) {
      valueNode.textContent = unavailable;
      buttonEl.dataset.active = "0";
      buttonEl.title =
        unavailable === "HTTPS"
          ? "GPS на iPhone нужен HTTPS — npm run start:https (порт 3443)"
          : "Геолокация недоступна в этом браузере";
      return;
    }

    if (!active || !lastLocation) {
      valueNode.textContent = active ? "…" : "нажмите";
      buttonEl.dataset.active = active ? "1" : "0";
      buttonEl.title = active
        ? "Определяем GPS…"
        : "Нажмите, чтобы включить GPS";
      return;
    }

    buttonEl.dataset.active = "1";
    valueNode.textContent = formatLocationLabel(lastLocation);
    const acc =
      lastLocation.accuracy != null ? ` · ±${Math.round(lastLocation.accuracy)} м` : "";
    buttonEl.title = `GPS: ${lastLocation.latitude.toFixed(6)}, ${lastLocation.longitude.toFixed(6)}${acc}`;
  };

  const enable = () => {
    if (busy || !navigator.geolocation) return;
    if (!window.isSecureContext) {
      render();
      return;
    }
    busy = true;
    active = true;
    render();
    navigator.geolocation.getCurrentPosition(
      (position) => {
        storeLocation(position);
        active = true;
        busy = false;
        startWatch();
        render();
        onUpdate?.();
      },
      (error) => {
        active = false;
        busy = false;
        if (error?.code === error.PERMISSION_DENIED) {
          valueNode.textContent = "нет доступа";
          buttonEl.title = "Разрешите доступ к геопозиции в Safari";
        } else {
          valueNode.textContent = "ошибка";
          buttonEl.title = error?.message || "Не удалось получить GPS";
        }
        buttonEl.dataset.active = "0";
        syncShareBtn();
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: LOCATION_MAX_AGE_MS }
    );
  };

  buttonEl.addEventListener("click", () => {
    if (!navigator.geolocation || !window.isSecureContext) {
      render();
      return;
    }
    enable();
  });

  shareBtn?.addEventListener("click", () => {
    if (!lastLocation) return;
    locationShareEnabled = !locationShareEnabled;
    localStorage.setItem(LOCATION_SHARE_KEY, locationShareEnabled ? "1" : "0");
    if (locationShareEnabled) startWatch();
    else stopWatch();
    syncShareBtn();
    onUpdate?.();
  });

  if (locationShareEnabled && navigator.geolocation && window.isSecureContext) {
    active = true;
    startWatch();
    void refreshShellLocationForSend().then(() => {
      render();
      onUpdate?.();
    });
  }

  render();
}
