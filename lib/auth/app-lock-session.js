const crypto = require("crypto");

const COOKIE_NAME = "agentcms_app_lock";
const SESSION_MAX_AGE_SEC = 30 * 24 * 60 * 60;

function parseCookieHeader(header) {
  const result = {};
  for (const part of String(header || "").split(";")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    try {
      result[key] = decodeURIComponent(value);
    } catch {
      result[key] = value;
    }
  }
  return result;
}

function getSessionCookieValue(req) {
  const cookies = parseCookieHeader(req?.headers?.cookie);
  return String(cookies[COOKIE_NAME] || "").trim();
}

async function deriveSessionSecret(readRootEnvFile) {
  const env = await readRootEnvFile();
  const login = String(env.APP_LOCK_LOGIN || "").trim();
  const password = String(env.APP_LOCK_PASSWORD || "").trim();
  if (!login || !password) return null;
  return crypto.createHash("sha256").update(`${login}\0${password}\0agentcms-app-lock-v1`).digest();
}

function signPayload(secret, payload) {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

function createSessionToken(secret, { remember = true } = {}) {
  const nonce = crypto.randomBytes(16).toString("hex");
  const payload = remember
    ? `${Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SEC}.${nonce}`
    : `session.${nonce}`;
  return `${payload}.${signPayload(secret, payload)}`;
}

function verifySessionToken(secret, token) {
  const text = String(token || "").trim();
  const lastDot = text.lastIndexOf(".");
  if (lastDot <= 0) return null;
  const payload = text.slice(0, lastDot);
  const sig = text.slice(lastDot + 1);
  if (!payload || !sig) return null;

  const expected = signPayload(secret, payload);
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  const dot = payload.indexOf(".");
  if (dot <= 0) return null;
  const kind = payload.slice(0, dot);
  if (kind === "session") {
    return { remember: false };
  }

  const exp = Number(kind);
  if (!Number.isFinite(exp) || exp <= Math.floor(Date.now() / 1000)) {
    return null;
  }
  return { remember: true };
}

async function getValidAppLockSession(req, readRootEnvFile) {
  const token = getSessionCookieValue(req);
  if (!token) return null;
  const secret = await deriveSessionSecret(readRootEnvFile);
  if (!secret) return null;
  return verifySessionToken(secret, token);
}

function shouldUseSecureCookie(req) {
  const forwardedProto = String(req?.headers?.["x-forwarded-proto"] || "")
    .split(",")[0]
    .trim()
    .toLowerCase();
  if (forwardedProto === "https") return true;
  const host = String(req?.headers?.host || "").trim().toLowerCase();
  if (!host) return false;
  const hostname = host.split(":")[0];
  return hostname !== "localhost" && hostname !== "127.0.0.1";
}

function buildSessionSetCookie(token, req, { remember = true } = {}) {
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax"
  ];
  if (remember) {
    parts.push(`Max-Age=${SESSION_MAX_AGE_SEC}`);
  }
  if (shouldUseSecureCookie(req)) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

function buildSessionClearCookie(req) {
  const parts = [`${COOKIE_NAME}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (shouldUseSecureCookie(req)) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

async function issueAppLockSession(req, readRootEnvFile, { remember = true } = {}) {
  const secret = await deriveSessionSecret(readRootEnvFile);
  if (!secret) return null;
  const token = createSessionToken(secret, { remember });
  return buildSessionSetCookie(token, req, { remember });
}

module.exports = {
  COOKIE_NAME,
  SESSION_MAX_AGE_SEC,
  getValidAppLockSession,
  issueAppLockSession,
  buildSessionClearCookie
};
