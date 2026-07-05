const CLOCK_LOCALE = "ru-RU";
const ORIENT_THROTTLE_MS = 200;
const IOS_BATTERY_HINT = "Safari на iPhone не показывает уровень батареи";

function formatMobileClock(date = new Date()) {
  return new Intl.DateTimeFormat(CLOCK_LOCALE, {
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

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

function renderBatteryValue(valueEl, battery) {
  if (!valueEl || !battery) return;
  const level = Math.max(0, Math.min(100, Math.round((battery.level || 0) * 100)));
  const charging = Boolean(battery.charging);
  valueEl.textContent = charging ? `${level}% ⚡` : `${level}%`;
  valueEl.dataset.charging = charging ? "1" : "0";
  valueEl.dataset.level = level <= 10 ? "critical" : level <= 20 ? "low" : "normal";
  valueEl.title = charging ? `Батарея: ${level}% (зарядка)` : `Батарея: ${level}%`;
}

function renderBatteryUnavailable(valueEl) {
  if (!valueEl) return;
  valueEl.textContent = "n/a";
  valueEl.dataset.level = "unknown";
  valueEl.title = IOS_BATTERY_HINT;
}

async function initBatteryValue(valueEl) {
  if (!valueEl) return;
  if (!navigator.getBattery) {
    renderBatteryUnavailable(valueEl);
    return;
  }
  try {
    const battery = await navigator.getBattery();
    const update = () => renderBatteryValue(valueEl, battery);
    update();
    battery.addEventListener("levelchange", update);
    battery.addEventListener("chargingchange", update);
  } catch {
    renderBatteryUnavailable(valueEl);
  }
}

function initOrientationChip(buttonEl, valueEl) {
  if (!buttonEl || !valueEl) return;

  let lastRender = 0;
  let active = false;
  let lastAlpha = null;
  let lastBeta = null;
  let lastGamma = null;

  const render = () => {
    const heading = formatHeading(lastAlpha);
    const tilt = formatTilt(lastBeta, lastGamma);

    if (!active) {
      valueEl.textContent = needsOrientationPermission() ? "нажмите" : "—";
      buttonEl.title = needsOrientationPermission()
        ? "Нажмите, чтобы включить компас и наклон"
        : "Ориентация недоступна в этом браузере";
      buttonEl.dataset.active = "0";
      return;
    }

    buttonEl.dataset.active = "1";
    if (heading) {
      valueEl.textContent = `${heading.deg}°`;
      const tiltPart = tilt ? ` · ↕${tilt.beta}° ↔${tilt.gamma}°` : "";
      buttonEl.title = `Компас: ${heading.label}${tiltPart}`;
    } else if (tilt) {
      valueEl.textContent = `↕${tilt.beta}°`;
      buttonEl.title = `Наклон: ↕${tilt.beta}° ↔${tilt.gamma}°`;
    } else {
      valueEl.textContent = "…";
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
      valueEl.textContent = "нужен HTTPS";
      buttonEl.title = "Safari не спрашивает компас по http://192.168… — npm run start:https на Mac";
      buttonEl.dataset.active = "0";
      return false;
    }
    const granted = await requestOrientationPermission();
    if (!granted) {
      active = false;
      valueEl.textContent = "нет доступа";
      buttonEl.title = "Разрешите доступ к движению и ориентации в Safari";
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

  if (!needsOrientationPermission()) {
    startListening();
  }
}

export function initMobileDeviceChips({ clock, battery, orient, orientValue } = {}) {
  if (clock) {
    const renderClock = () => {
      const now = new Date();
      clock.textContent = formatMobileClock(now);
      clock.dateTime = now.toISOString();
      clock.title = new Intl.DateTimeFormat(CLOCK_LOCALE, {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit"
      }).format(now);
    };
    renderClock();
    setInterval(renderClock, 1000);
  }

  void initBatteryValue(battery);
  initOrientationChip(orient, orientValue || orient);
}
