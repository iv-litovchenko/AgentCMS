/** Device chips: compass / tilt (shared desktop + mobile). */

const ORIENT_THROTTLE_MS = 200;

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
