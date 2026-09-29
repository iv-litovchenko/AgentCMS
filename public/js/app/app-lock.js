(function () {
  "use strict";

  const SESSION_KEY = "agentcms.appLock.unlocked.v1";
  const REMEMBER_KEY = "agentcms.appLock.remember.v1";
  const DEFAULT_LOGIN = "admin";
  const FETCH_OPTS = { credentials: "same-origin" };

  const lockNode = document.getElementById("app-lock");
  const leadNode = document.getElementById("app-lock-lead");
  const footnoteNode = document.getElementById("app-lock-footnote");
  const formNode = document.getElementById("app-lock-form");
  const loginNode = document.getElementById("app-lock-login");
  const passwordNode = document.getElementById("app-lock-password");
  const confirmFieldNode = document.getElementById("app-lock-confirm-field");
  const confirmNode = document.getElementById("app-lock-confirm");
  const errorNode = document.getElementById("app-lock-error");
  const submitNode = document.getElementById("app-lock-submit");
  const biometricBtn = document.getElementById("app-lock-biometric-btn");
  const biometricLabelNode = document.getElementById("app-lock-biometric-label");
  const logoutButtons = () => document.querySelectorAll("[data-app-lock-logout]");
  const rememberFieldNode = document.getElementById("app-lock-remember-field");
  const rememberNode = document.getElementById("app-lock-remember");

  let unlockResolve = null;
  let mode = "login";
  let lockActive = false;
  let passkeyRegistered = false;
  let webAuthnSupported = false;

  const unlockPromise = new Promise((resolve) => {
    unlockResolve = resolve;
  });

  function isSessionUnlocked() {
    try {
      return sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      return false;
    }
  }

  function isParentSessionUnlocked() {
    try {
      if (window.parent === window) return false;
      return window.parent.sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      return false;
    }
  }

  function inheritParentUnlockSession() {
    if (!isParentSessionUnlocked()) return false;
    markSessionUnlocked();
    return true;
  }

  function markSessionUnlocked() {
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // ignore
    }
  }

  function clearSessionUnlocked() {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // ignore
    }
  }

  function encodeStoredSecret(text) {
    try {
      return btoa(unescape(encodeURIComponent(String(text || ""))));
    } catch {
      return "";
    }
  }

  function decodeStoredSecret(encoded) {
    try {
      return decodeURIComponent(escape(atob(String(encoded || ""))));
    } catch {
      return "";
    }
  }

  function readRememberedCredentials() {
    try {
      const raw = localStorage.getItem(REMEMBER_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || data.remember !== true) return null;
      const login = String(data.login || "").trim();
      const password = decodeStoredSecret(data.password);
      if (!login || !password) return null;
      return { login, password, remember: true };
    } catch {
      return null;
    }
  }

  function writeRememberedCredentials(login, password, remember) {
    try {
      if (!remember) {
        localStorage.removeItem(REMEMBER_KEY);
        return;
      }
      localStorage.setItem(
        REMEMBER_KEY,
        JSON.stringify({
          remember: true,
          login: String(login || "").trim(),
          password: encodeStoredSecret(password)
        })
      );
    } catch {
      // ignore
    }
  }

  function isRememberChecked() {
    if (!rememberNode) return true;
    return rememberNode.checked;
  }

  function applyRememberedToForm() {
    const saved = readRememberedCredentials();
    if (rememberNode) {
      rememberNode.checked = saved ? true : rememberNode.checked;
    }
    if (!saved || mode !== "login") return;
    if (loginNode && !loginNode.value.trim()) loginNode.value = saved.login;
    if (passwordNode && !passwordNode.value) passwordNode.value = saved.password;
  }

  function updateRememberFieldVisibility() {
    if (!rememberFieldNode) return;
    rememberFieldNode.classList.toggle("hidden", mode === "setup");
  }

  function bufferToBase64URL(buffer) {
    const bytes = new Uint8Array(buffer);
    let str = "";
    for (const byte of bytes) str += String.fromCharCode(byte);
    return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function base64URLToBuffer(base64url) {
    const base64 = String(base64url || "").replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  }

  function prepareRegistrationOptions(options) {
    return {
      ...options,
      challenge: base64URLToBuffer(options.challenge),
      user: {
        ...options.user,
        id: base64URLToBuffer(options.user.id)
      },
      excludeCredentials: (options.excludeCredentials || []).map((cred) => ({
        ...cred,
        id: base64URLToBuffer(cred.id)
      }))
    };
  }

  function prepareAuthenticationOptions(options) {
    return {
      ...options,
      challenge: base64URLToBuffer(options.challenge),
      allowCredentials: (options.allowCredentials || []).map((cred) => ({
        ...cred,
        id: base64URLToBuffer(cred.id)
      }))
    };
  }

  function credentialToJSON(credential) {
    const response = credential.response;
    const payload = {
      id: credential.id,
      rawId: bufferToBase64URL(credential.rawId),
      type: credential.type,
      response: {
        clientDataJSON: bufferToBase64URL(response.clientDataJSON)
      }
    };

    if (response.attestationObject) {
      payload.response.attestationObject = bufferToBase64URL(response.attestationObject);
      if (typeof credential.getTransports === "function") {
        payload.response.transports = credential.getTransports();
      }
    }

    if (response.authenticatorData) {
      payload.response.authenticatorData = bufferToBase64URL(response.authenticatorData);
      payload.response.signature = bufferToBase64URL(response.signature);
      if (response.userHandle) {
        payload.response.userHandle = bufferToBase64URL(response.userHandle);
      }
    }

    return payload;
  }

  function detectWebAuthnSupport() {
    return Boolean(window.PublicKeyCredential && navigator.credentials);
  }

  function getBiometricLabel() {
    if (!passkeyRegistered) return "Face ID / Touch ID";
    return "Войти по Face ID / Touch ID";
  }

  function updateLogoutButton() {
    const show = lockActive && mode === "login" && isSessionUnlocked();
    for (const btn of logoutButtons()) {
      btn.classList.toggle("hidden", !show);
    }
  }

  function updateBiometricButton() {
    if (!biometricBtn) return;
    const show = mode === "login";
    biometricBtn.classList.toggle("hidden", !show);
    biometricBtn.disabled = true;
    biometricBtn.title = "Скоро";
    if (biometricLabelNode) {
      biometricLabelNode.textContent = "Face ID / Touch ID";
    }
  }

  function setError(message = "") {
    if (!errorNode) return;
    const text = String(message || "").trim();
    errorNode.textContent = text;
    errorNode.classList.toggle("hidden", !text);
  }

  function setSubmitting(isSubmitting) {
    if (!submitNode) return;
    submitNode.disabled = isSubmitting;
    if (mode === "setup") {
      submitNode.textContent = isSubmitting ? "Сохранение…" : "Создать пароль";
      return;
    }
    submitNode.textContent = isSubmitting ? "Проверка…" : "Войти";
  }

  function setBiometricSubmitting() {
    if (!biometricBtn) return;
    biometricBtn.disabled = true;
  }

  function setMode(nextMode) {
    mode = nextMode === "setup" ? "setup" : "login";

    if (leadNode) {
      leadNode.textContent =
        mode === "setup"
          ? "Задайте логин и пароль для доступа к Agent CMS"
          : "Введите логин и пароль";
    }

    if (footnoteNode) {
      footnoteNode.innerHTML =
        mode === "setup"
          ? "Пароль будет сохранён в файле <code>.env</code> в корне проекта."
          : "Логин и пароль задаются в файле <code>.env</code> в корне проекта.";
    }

    confirmFieldNode?.classList.toggle("hidden", mode !== "setup");

    if (passwordNode) {
      passwordNode.placeholder = mode === "setup" ? "Новый пароль" : "Пароль";
      passwordNode.autocomplete = mode === "setup" ? "new-password" : "current-password";
    }

    if (confirmNode) {
      confirmNode.required = mode === "setup";
      if (mode !== "setup") confirmNode.value = "";
    }

    setSubmitting(false);
    setBiometricSubmitting(false);
    updateLogoutButton();
    updateBiometricButton();
    updateRememberFieldVisibility();
    if (mode === "login") applyRememberedToForm();
  }

  function hideLockScreen() {
    lockNode?.classList.add("hidden");
    document.body.classList.remove("app-locked");
    document.getElementById("shell-app")?.removeAttribute("inert");
    updateLogoutButton();
  }

  function hideSplashForLock() {
    document.body.classList.remove("app-booting");
    const splashNode = document.getElementById("app-splash");
    if (!splashNode || splashNode.classList.contains("app-splash--hide")) return;
    splashNode.classList.add("app-splash--hide");
    window.setTimeout(() => splashNode.remove(), 460);
  }

  function showLockScreen() {
    hideSplashForLock();
    lockNode?.classList.remove("hidden");
    document.body.classList.add("app-locked");
    document.getElementById("shell-app")?.setAttribute("inert", "");
    updateLogoutButton();
    updateBiometricButton();
    updateRememberFieldVisibility();
    applyRememberedToForm();
    window.setTimeout(() => {
      if (passkeyRegistered && biometricBtn && !biometricBtn.classList.contains("hidden")) {
        biometricBtn.focus();
        return;
      }
      loginNode?.focus();
    }, 60);
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

  async function logout() {
    if (!lockActive || mode === "setup") return;
    try {
      await fetch("/api/app-lock/logout", { method: "POST", ...FETCH_OPTS });
    } catch {
      // ignore
    }
    clearSessionUnlocked();
    const saved = readRememberedCredentials();
    if (loginNode) loginNode.value = saved?.login || "";
    if (passwordNode) passwordNode.value = saved?.password || "";
    if (confirmNode) confirmNode.value = "";
    if (rememberNode) rememberNode.checked = Boolean(saved?.remember);
    setError("");
    setMode("login");
    showLockScreen();
  }

  async function fetchLockStatus() {
    const response = await fetch("/api/app-lock/status", { cache: "no-store", ...FETCH_OPTS });
    if (!response.ok) {
      throw new Error(`Request failed with ${response.status}`);
    }
    return response.json();
  }

  async function verifyCredentials(login, password, remember) {
    const response = await fetch("/api/app-lock/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      ...FETCH_OPTS,
      body: JSON.stringify({ login, password, remember })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "Неверный логин или пароль");
    }
    return data;
  }

  async function setupCredentials(login, password, confirm, remember) {
    const response = await fetch("/api/app-lock/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      ...FETCH_OPTS,
      body: JSON.stringify({ login, password, confirm, remember })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "Не удалось сохранить пароль");
    }
    return data;
  }

  async function registerPasskey(login, password) {
    const optionsResponse = await fetch("/api/app-lock/passkey/register/options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, password })
    });
    const optionsData = await optionsResponse.json().catch(() => ({}));
    if (!optionsResponse.ok) {
      throw new Error(optionsData.error || "Не удалось начать привязку Touch ID");
    }

    const credential = await navigator.credentials.create({
      publicKey: prepareRegistrationOptions(optionsData)
    });
    if (!credential) {
      throw new Error("Touch ID не подтверждён");
    }

    const verifyResponse = await fetch("/api/app-lock/passkey/register/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        login,
        password,
        ...credentialToJSON(credential)
      })
    });
    const verifyData = await verifyResponse.json().catch(() => ({}));
    if (!verifyResponse.ok) {
      throw new Error(verifyData.error || "Не удалось сохранить Touch ID");
    }

    passkeyRegistered = true;
    updateBiometricButton();
    setMode("login");
  }

  async function maybeOfferPasskeyRegistration(login, password) {
    if (!webAuthnSupported || passkeyRegistered) return;
    const shouldRegister = window.confirm(
      "Привязать Touch ID / Face ID для быстрого входа на этом Mac?"
    );
    if (!shouldRegister) return;
    try {
      await registerPasskey(login, password);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось привязать Touch ID";
      window.alert(message);
    }
  }

  async function loginWithPasskey() {
    if (!webAuthnSupported) {
      setError("Touch ID работает в Safari или Chrome: откройте http://127.0.0.1:3000");
      return;
    }

    if (!passkeyRegistered) {
      setError("Сначала войдите паролем — появится предложение привязать Face ID / Touch ID");
      passwordNode?.focus();
      return;
    }

    setError("");
    setBiometricSubmitting(true);
    try {
      const optionsResponse = await fetch("/api/app-lock/passkey/auth/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      const optionsData = await optionsResponse.json().catch(() => ({}));
      if (!optionsResponse.ok) {
        throw new Error(optionsData.error || "Touch ID недоступен");
      }

      const credential = await navigator.credentials.get({
        publicKey: prepareAuthenticationOptions(optionsData)
      });
      if (!credential) {
        throw new Error("Touch ID не подтверждён");
      }

      const verifyResponse = await fetch("/api/app-lock/passkey/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        ...FETCH_OPTS,
        body: JSON.stringify({
          remember: isRememberChecked(),
          ...credentialToJSON(credential)
        })
      });
      const verifyData = await verifyResponse.json().catch(() => ({}));
      if (!verifyResponse.ok) {
        throw new Error(verifyData.error || "Touch ID не принят");
      }

      if (loginNode) loginNode.value = "";
      if (passwordNode) passwordNode.value = "";
      completeUnlock();
    } catch (error) {
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        setError("Touch ID отменён");
      } else {
        setError(error instanceof Error ? error.message : "Ошибка Touch ID");
      }
    } finally {
      setBiometricSubmitting(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const login = String(loginNode?.value || "").trim();
    const password = String(passwordNode?.value || "");
    const confirm = String(confirmNode?.value || "");
    const remember = isRememberChecked();

    if (!login) {
      setError("Введите логин");
      loginNode?.focus();
      return;
    }
    if (!password) {
      setError("Введите пароль");
      passwordNode?.focus();
      return;
    }

    if (mode === "setup") {
      if (!confirm) {
        setError("Повторите пароль");
        confirmNode?.focus();
        return;
      }
      if (password !== confirm) {
        setError("Пароли не совпадают");
        confirmNode?.focus();
        return;
      }

      setSubmitting(true);
      try {
        await setupCredentials(login, password, confirm, remember);
        writeRememberedCredentials(login, password, remember);
        lockActive = true;
        setMode("login");
        if (loginNode) loginNode.value = remember ? login : "";
        if (passwordNode) passwordNode.value = remember ? password : "";
        if (confirmNode) confirmNode.value = "";
        await maybeOfferPasskeyRegistration(login, password);
        completeUnlock();
      } catch (error) {
        setError(error instanceof Error ? error.message : "Ошибка сохранения");
        passwordNode?.focus();
      } finally {
        setSubmitting(false);
      }
      return;
    }

    setSubmitting(true);
    try {
      await verifyCredentials(login, password, remember);
      writeRememberedCredentials(login, password, remember);
      await maybeOfferPasskeyRegistration(login, password);
      if (loginNode) loginNode.value = remember ? login : "";
      if (passwordNode) passwordNode.value = remember ? password : "";
      completeUnlock();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Ошибка входа");
      if (passwordNode) passwordNode.value = "";
      passwordNode?.focus();
    } finally {
      setSubmitting(false);
    }
  }

  async function boot() {
    webAuthnSupported = detectWebAuthnSupport();

    if (!lockNode || !formNode) {
      unlockResolve?.();
      return;
    }

    formNode.addEventListener("submit", (event) => {
      void handleSubmit(event);
    });

    for (const btn of logoutButtons()) {
      btn.addEventListener("click", () => {
        void logout();
      });
    }

    try {
      const status = await fetchLockStatus();
      lockActive = Boolean(status?.enabled || status?.needsSetup);
      passkeyRegistered = Boolean(status?.passkeyRegistered);

      if (status?.needsSetup) {
        setMode("setup");
        if (loginNode && !loginNode.value.trim()) {
          loginNode.value = DEFAULT_LOGIN;
        }
        showLockScreen();
        return;
      }

      if (!lockActive) {
        completeUnlock();
        return;
      }

      setMode("login");

      if (status?.sessionActive || isSessionUnlocked() || inheritParentUnlockSession()) {
        completeUnlock();
        return;
      }

      showLockScreen();
    } catch {
      setError("Не удалось проверить настройки входа");
      setMode("login");
      showLockScreen();
    }
  }

  window.agentAppLock = {
    whenUnlocked: () => unlockPromise,
    logout,
    completeUnlock
  };

  void boot();
})();
