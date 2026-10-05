const fs = require("fs");
const path = require("path");
const { projectRel, abs } = require("../paths/agent-cms");

const STORE_FILE = "server-runtime.json";
/** Не начислять больше этого интервала за один тик (защита от долгого простоя Control). */
const MAX_DELTA_SEC = 90;

function localDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function storePath(projectRoot) {
  return abs(projectRoot, path.join(projectRel.root, STORE_FILE));
}

function emptyStore() {
  return {
    version: 1,
    days: {},
    meta: { lastSampleAt: null, lastRunning: false }
  };
}

function readStore(projectRoot) {
  const filePath = storePath(projectRoot);
  try {
    if (!fs.existsSync(filePath)) return emptyStore();
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (!parsed || typeof parsed !== "object") return emptyStore();
    if (!parsed.days || typeof parsed.days !== "object") parsed.days = {};
    if (!parsed.meta || typeof parsed.meta !== "object") {
      parsed.meta = { lastSampleAt: null, lastRunning: false };
    }
    return parsed;
  } catch {
    return emptyStore();
  }
}

function writeStore(projectRoot, store) {
  const filePath = storePath(projectRoot);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

function ensureDay(store, dateKey) {
  if (!store.days[dateKey]) {
    store.days[dateKey] = { minutes: 0, seconds: 0 };
  }
  return store.days[dateKey];
}

function addSecondsToDay(day, deltaSec) {
  if (!deltaSec || deltaSec <= 0) return;
  day.seconds = (day.seconds || 0) + deltaSec;
  while (day.seconds >= 60) {
    day.seconds -= 60;
    day.minutes = (day.minutes || 0) + 1;
  }
}

function dayTotalMinutes(day) {
  if (!day) return 0;
  const mins = Number(day.minutes) || 0;
  const secs = Number(day.seconds) || 0;
  return mins + (secs >= 30 ? 1 : 0);
}

function getServerRuntimeTodayMinutes(projectRoot, dateKey = localDateKey()) {
  const store = readStore(projectRoot);
  return dayTotalMinutes(store.days[dateKey]);
}

/**
 * Учитывает время работы сервера с прошлого сэмпла.
 * @returns {number} минут за сегодня (для UI)
 */
function tickServerRuntime(projectRoot, serverRunning, nowMs = Date.now()) {
  const store = readStore(projectRoot);
  const today = localDateKey(new Date(nowMs));
  const day = ensureDay(store, today);
  const lastAt = store.meta.lastSampleAt;
  const wasRunning = Boolean(store.meta.lastRunning);

  if (lastAt != null && serverRunning && wasRunning) {
    const deltaSec = Math.min(MAX_DELTA_SEC, Math.max(0, Math.floor((nowMs - lastAt) / 1000)));
    addSecondsToDay(day, deltaSec);
  }

  store.meta.lastSampleAt = nowMs;
  store.meta.lastRunning = Boolean(serverRunning);
  writeStore(projectRoot, store);
  return dayTotalMinutes(day);
}

function getServerRuntimeSnapshot(projectRoot) {
  const today = localDateKey();
  const store = readStore(projectRoot);
  return {
    date: today,
    minutes: dayTotalMinutes(store.days[today]),
    storePath: path.relative(projectRoot, storePath(projectRoot))
  };
}

module.exports = {
  localDateKey,
  getServerRuntimeTodayMinutes,
  tickServerRuntime,
  getServerRuntimeSnapshot
};
