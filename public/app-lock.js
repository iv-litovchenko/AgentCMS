(function () {
  "use strict";

  const STORAGE_KEY = "agentcms.appLock.v1";
  const SESSION_KEY = "agentcms.appLock.unlocked.v1";
  const MIN_PASSWORD_LENGTH = 4;
  const PBKDF2_ITERATIONS = 120000;

  const lockNode = document.getElementById("app-lock");
  const leadNode = document.getElementById("app-lock-lead");
  const formNode = document.getElementById("app-lock-form");
  const passwordNode = document.getElementById("app-lock-password");
  const confirmNode = document.getElementById("app-lock-password-confirm");
  const confirmWrapNode = document.getElementById("app-lock-confirm-wrap");
  const errorNode = document.getElementById("app-lock-error");
  const submitNode = document.getElementById("app-lock-submit");

  let unlockResolve = null;
  let setupMode = false;

  const unlockPromise = new Promise((resolve) => {
    unlockResolve = resolve;
  });

  function readStoredLock() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data?.salt || !data?.hash) return null;
      return data;
    } catch {
      return null;
    }
  }

  function isSessionUnlocked() {
    try {
      return sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      return false;
    }
  }

  function markSessionUnlocked() {
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // ignore
    }
  }

  function bytesToBase64(bytes) {
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
  }

  function base64ToBytes(value) {
    const binary = atob(String(value || ""));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  async function derivePasswordHash(password, saltBase64) {
    const encoder = new TextEncoder();
    const salt = saltBase64 ? base64ToBytes(saltBase64) : crypto.getRandomValues(new Uint8Array(16));
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      "PBKDF2",
      false,
      ["deriveBits"]
    );
    const bits = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt,
        iterations: PBKDF2_ITERATIONS,
        hash: "SHA-256"
      },
      keyMaterial,
      256
    );
    return {
      salt: bytesToBase64(salt),
      hash: bytesToBase64(new Uint8Array(bits))
    };
  }

  function setError(message = "") {
    if (!errorNode) return;
    const text = String(message || "").trim();
    errorNode.textContent = text;
    errorNode.classList.toggle("hidden", !text);
  }

  function setSetupMode(enabled) {
    setupMode = enabled;
    if (leadNode) {
      leadNode.textContent = enabled
        ? "Задайте пароль для доступа к Agent CMS"
        : "Введите пароль";
    }
    if (submitNode) submitNode.textContent = enabled ? "Сохранить пароль" : "Войти";
    if (confirmWrapNode) confirmWrapNode.classList.toggle("hidden", !enabled);
    if (passwordNode) {
      passwordNode.autocomplete = enabled ? "new-password" : "current-password";
      passwordNode.placeholder = enabled ? "Новый пароль" : "Пароль";
    }
    if (confirmNode) confirmNode.value = "";
  }

  function hideLockScreen() {
    lockNode?.classList.add("hidden");
    document.body.classList.remove("app-locked");
  }

  function showLockScreen() {
    lockNode?.classList.remove("hidden");
    document.body.classList.add("app-locked");
    window.setTimeout(() => passwordNode?.focus(), 60);
  }

  function completeUnlock() {
    markSessionUnlocked();
    hideLockScreen();
    setError("");
    if (unlockResolve) {
      unlockResolve();
      unlockResolve = null;
    }
  }

  async function verifyPassword(password) {
    const stored = readStoredLock();
    if (!stored) return false;
    const derived = await derivePasswordHash(password, stored.salt);
    return derived.hash === stored.hash;
  }

  async function savePassword(password) {
    const derived = await derivePasswordHash(password);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        salt: derived.salt,
        hash: derived.hash,
        createdAt: new Date().toISOString()
      })
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const password = String(passwordNode?.value || "");
    const confirm = String(confirmNode?.value || "");

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Минимум ${MIN_PASSWORD_LENGTH} символа`);
      return;
    }

    if (setupMode) {
      if (password !== confirm) {
        setError("Пароли не совпадают");
        return;
      }
      try {
        await savePassword(password);
        if (passwordNode) passwordNode.value = "";
        if (confirmNode) confirmNode.value = "";
        completeUnlock();
      } catch {
        setError("Не удалось сохранить пароль");
      }
      return;
    }

    try {
      const ok = await verifyPassword(password);
      if (!ok) {
        setError("Неверный пароль");
        if (passwordNode) passwordNode.value = "";
        passwordNode?.focus();
        return;
      }
      if (passwordNode) passwordNode.value = "";
      completeUnlock();
    } catch {
      setError("Ошибка проверки пароля");
    }
  }

  function boot() {
    if (!lockNode || !formNode) {
      unlockResolve?.();
      return;
    }

    formNode.addEventListener("submit", (event) => {
      void handleSubmit(event);
    });

    if (isSessionUnlocked()) {
      hideLockScreen();
      unlockResolve?.();
      return;
    }

    setSetupMode(!readStoredLock());
    showLockScreen();
  }

  window.agentAppLock = {
    whenUnlocked: () => unlockPromise
  };

  boot();
})();
