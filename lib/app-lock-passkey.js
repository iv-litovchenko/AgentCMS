const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse
} = require("@simplewebauthn/server");

const PASSKEY_FILE = "app-lock-passkey.json";
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

function getPasskeyAbsolutePath(projectRoot) {
  return path.join(projectRoot, ".agent-cms", PASSKEY_FILE);
}

async function readPasskeyRecord(projectRoot) {
  const filePath = getPasskeyAbsolutePath(projectRoot);
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    if (!parsed?.credentialID || !parsed?.credentialPublicKey) return null;
    return parsed;
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function writePasskeyRecord(projectRoot, record) {
  const filePath = getPasskeyAbsolutePath(projectRoot);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(record, null, 2)}\n`, "utf-8");
}

function getWebAuthnContext(req) {
  const host = String(req.headers.host || "localhost:3000").trim();
  const hostname = host.split(":")[0] || "localhost";
  const forwardedProto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  const protocol =
    forwardedProto ||
    (hostname === "localhost" || hostname === "127.0.0.1" ? "http" : "https");
  return {
    origin: `${protocol}://${host}`,
    rpID: hostname
  };
}

function createChallengeStore() {
  const entries = new Map();

  function set(key, challenge) {
    entries.set(key, {
      challenge,
      expiresAt: Date.now() + CHALLENGE_TTL_MS
    });
  }

  function take(key) {
    const entry = entries.get(key);
    entries.delete(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) return null;
    return entry.challenge;
  }

  function purgeExpired() {
    const now = Date.now();
    for (const [key, entry] of entries.entries()) {
      if (now > entry.expiresAt) entries.delete(key);
    }
  }

  return { set, take, purgeExpired };
}

function createAppLockPasskeyService({ projectRoot, verifyCredentials }) {
  const challenges = createChallengeStore();

  async function getStatus() {
    const passkey = await readPasskeyRecord(projectRoot);
    return {
      passkeyRegistered: Boolean(passkey)
    };
  }

  async function createRegistrationOptions(req, login, password) {
    challenges.purgeExpired();
    const ok = await verifyCredentials(login, password);
    if (!ok) {
      const error = new Error("Неверный логин или пароль");
      error.statusCode = 401;
      throw error;
    }

    const existing = await readPasskeyRecord(projectRoot);
    if (existing) {
      const error = new Error("Touch ID уже привязан");
      error.statusCode = 409;
      throw error;
    }

    const { rpID } = getWebAuthnContext(req);
    const userId = crypto.createHash("sha256").update(String(login)).digest();

    const options = await generateRegistrationOptions({
      rpName: "Agent CMS",
      rpID,
      userName: String(login),
      userID: userId,
      attestationType: "none",
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        residentKey: "preferred",
        userVerification: "required"
      }
    });

    challenges.set(`register:${login}`, options.challenge);
    return options;
  }

  async function verifyRegistration(req, login, password, body) {
    challenges.purgeExpired();
    const ok = await verifyCredentials(login, password);
    if (!ok) {
      const error = new Error("Неверный логин или пароль");
      error.statusCode = 401;
      throw error;
    }

    const { login: _login, password: _password, ...credentialBody } = body || {};
    const { origin, rpID } = getWebAuthnContext(req);
    const expectedChallenge = challenges.take(`register:${login}`);
    if (!expectedChallenge) {
      const error = new Error("Сессия Touch ID истекла, попробуйте снова");
      error.statusCode = 400;
      throw error;
    }

    const verification = await verifyRegistrationResponse({
      response: credentialBody,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true
    });

    if (!verification.verified || !verification.registrationInfo) {
      const error = new Error("Не удалось привязать Touch ID");
      error.statusCode = 400;
      throw error;
    }

    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
    await writePasskeyRecord(projectRoot, {
      credentialID: credential.id,
      credentialPublicKey: Buffer.from(credential.publicKey).toString("base64url"),
      counter: credential.counter,
      credentialDeviceType,
      credentialBackedUp,
      transports: credentialBody?.response?.transports || ["internal"],
      login: String(login),
      registeredAt: new Date().toISOString()
    });

    return { ok: true };
  }

  async function createAuthenticationOptions(req) {
    challenges.purgeExpired();
    const passkey = await readPasskeyRecord(projectRoot);
    if (!passkey) {
      const error = new Error("Touch ID не привязан");
      error.statusCode = 404;
      throw error;
    }

    const { rpID } = getWebAuthnContext(req);
    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: [
        {
          id: passkey.credentialID,
          transports: passkey.transports || ["internal"]
        }
      ],
      userVerification: "required"
    });

    challenges.set("authenticate", options.challenge);
    return options;
  }

  async function verifyAuthentication(req, body) {
    challenges.purgeExpired();
    const passkey = await readPasskeyRecord(projectRoot);
    if (!passkey) {
      const error = new Error("Touch ID не привязан");
      error.statusCode = 404;
      throw error;
    }

    const credentialBody = { ...(body || {}) };
    delete credentialBody.login;
    delete credentialBody.password;
    const { origin, rpID } = getWebAuthnContext(req);
    const expectedChallenge = challenges.take("authenticate");
    if (!expectedChallenge) {
      const error = new Error("Сессия Touch ID истекла, попробуйте снова");
      error.statusCode = 400;
      throw error;
    }

    const verification = await verifyAuthenticationResponse({
      response: credentialBody,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
      credential: {
        id: passkey.credentialID,
        publicKey: Buffer.from(passkey.credentialPublicKey, "base64url"),
        counter: passkey.counter,
        transports: passkey.transports || ["internal"]
      }
    });

    if (!verification.verified) {
      const error = new Error("Touch ID не подтверждён");
      error.statusCode = 401;
      throw error;
    }

    passkey.counter = verification.authenticationInfo.newCounter;
    await writePasskeyRecord(projectRoot, passkey);
    return { ok: true };
  }

  return {
    getStatus,
    createRegistrationOptions,
    verifyRegistration,
    createAuthenticationOptions,
    verifyAuthentication
  };
}

module.exports = {
  createAppLockPasskeyService,
  readPasskeyRecord
};
