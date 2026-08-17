import { initShellOrientationChip } from "/shell/shell-device-chips.js?v=1";

const CLOCK_LOCALE = "ru-RU";
const IOS_BATTERY_HINT = "Safari на iPhone не показывает уровень батареи";

function formatMobileClock(date = new Date()) {
  return new Intl.DateTimeFormat(CLOCK_LOCALE, {
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
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
  initShellOrientationChip({ button: orient, valueEl: orientValue || orient });
}
