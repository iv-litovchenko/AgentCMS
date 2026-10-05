const crypto = require("crypto");
const { createMockDriver } = require("./mock-driver");
const { createFingerprintStore } = require("./store");
const { findBestMatch, MATCH_THRESHOLD } = require("./matcher");

const ENROLL_SCANS_REQUIRED = 3;
const SESSION_TTL_MS = 10 * 60 * 1000;

function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function createFingerprintScannerService({ projectRoot, verifyCredentials }) {
  const store = createFingerprintStore(projectRoot);
  const driver = createMockDriver();
  const enrollSessions = new Map();

  function purgeExpiredSessions() {
    const now = Date.now();
    for (const [key, session] of enrollSessions.entries()) {
      if (now > session.expiresAt) enrollSessions.delete(key);
    }
  }

  function getStatus(login = null) {
    const templates = store.listTemplates(login || undefined);
    const primary = templates.find((row) => row.fingerLabel === "primary") || templates[0] || null;
    return {
      driver: driver.name,
      driverLabel: driver.label,
      featureSize: driver.featureSize,
      enrolled: templates.length > 0,
      enrolledLogin: primary?.login || null,
      templateCount: templates.length,
      matchThreshold: MATCH_THRESHOLD,
      enrollScansRequired: ENROLL_SCANS_REQUIRED,
      dbPath: store.dbPath
    };
  }

  async function startEnroll(login, password) {
    purgeExpiredSessions();
    const ok = await verifyCredentials(login, password);
    if (!ok) throw createHttpError("Неверный логин или пароль", 401);

    const sessionId = crypto.randomBytes(16).toString("hex");
    const sessionSeed = crypto.randomBytes(20).toString("hex");
    enrollSessions.set(sessionId, {
      login: String(login),
      sessionSeed,
      scans: [],
      expiresAt: Date.now() + SESSION_TTL_MS
    });

    return {
      sessionId,
      requiredScans: ENROLL_SCANS_REQUIRED,
      driver: driver.name
    };
  }

  async function captureEnrollScan(sessionId) {
    purgeExpiredSessions();
    const session = enrollSessions.get(String(sessionId || ""));
    if (!session) throw createHttpError("Сессия сканирования истекла", 400);
    if (session.scans.length >= ENROLL_SCANS_REQUIRED) {
      throw createHttpError("Все сканы уже получены", 409);
    }

    const sample = await driver.captureEnrollSample(session.sessionSeed, session.scans.length);
    session.scans.push(sample.features);
    const scanIndex = session.scans.length;

    return {
      sessionId,
      scanIndex,
      requiredScans: ENROLL_SCANS_REQUIRED,
      completed: scanIndex >= ENROLL_SCANS_REQUIRED,
      quality: sample.quality
    };
  }

  async function finishEnroll(sessionId) {
    purgeExpiredSessions();
    const session = enrollSessions.get(String(sessionId || ""));
    if (!session) throw createHttpError("Сессия сканирования истекла", 400);
    if (session.scans.length < ENROLL_SCANS_REQUIRED) {
      throw createHttpError(`Нужно ${ENROLL_SCANS_REQUIRED} скана, получено ${session.scans.length}`, 400);
    }

    const features = driver.averageVectors(session.scans);
    const saved = store.saveTemplate({
      login: session.login,
      fingerLabel: "primary",
      template: {
        version: 1,
        driver: driver.name,
        featureSize: features.length,
        features,
        enrolledAt: new Date().toISOString()
      }
    });

    enrollSessions.delete(String(sessionId));

    return {
      ok: true,
      login: saved?.login || session.login,
      enrolled: true
    };
  }

  async function verifyScan(loginHint = null) {
    const templates = store.listTemplates(loginHint || undefined);
    if (!templates.length) throw createHttpError("Отпечаток не привязан", 404);

    const reference = templates[0]?.template?.features;
    const sample = await driver.captureVerifySample(reference);
    const match = findBestMatch(sample.features, templates);
    if (!match?.matched) {
      throw createHttpError("Отпечаток не совпал", 401);
    }

    return {
      ok: true,
      login: match.login,
      score: Number(match.score.toFixed(4)),
      threshold: MATCH_THRESHOLD,
      driver: driver.name
    };
  }

  async function resetEnroll(login, password) {
    const ok = await verifyCredentials(login, password);
    if (!ok) throw createHttpError("Неверный логин или пароль", 401);
    const removed = store.deleteTemplatesForLogin(login);
    return { ok: true, removed };
  }

  return {
    getStatus,
    startEnroll,
    captureEnrollScan,
    finishEnroll,
    verifyScan,
    resetEnroll
  };
}

module.exports = {
  createFingerprintScannerService
};
