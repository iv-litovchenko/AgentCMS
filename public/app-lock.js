(function () {
  "use strict";

  const SESSION_KEY = "agentcms.appLock.unlocked.v1";
  const DEFAULT_LOGIN = "admin";

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
  const logoutBtn = document.getElementById("app-lock-logout-btn");

  let unlockResolve = null;
  let mode = "login";
  let lockActive = false;

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

  function updateLogoutButton() {
    if (!logoutBtn) return;
    const show = lockActive && mode === "login" && isSessionUnlocked();
    logoutBtn.classList.toggle("hidden", !show);
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
    updateLogoutButton();
  }

  function hideLockScreen() {
    lockNode?.classList.add("hidden");
    document.body.classList.remove("app-locked");
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
    updateLogoutButton();
    window.setTimeout(() => loginNode?.focus(), 60);
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

  function logout() {
    if (!lockActive || mode === "setup") return;
    clearSessionUnlocked();
    if (loginNode) loginNode.value = "";
    if (passwordNode) passwordNode.value = "";
    if (confirmNode) confirmNode.value = "";
    setError("");
    setMode("login");
    showLockScreen();
  }

  async function fetchLockStatus() {
    const response = await fetch("/api/app-lock/status", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Request failed with ${response.status}`);
    }
    return response.json();
  }

  async function verifyCredentials(login, password) {
    const response = await fetch("/api/app-lock/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, password })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "Неверный логин или пароль");
    }
    return data;
  }

  async function setupCredentials(login, password, confirm) {
    const response = await fetch("/api/app-lock/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, password, confirm })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "Не удалось сохранить пароль");
    }
    return data;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const login = String(loginNode?.value || "").trim();
    const password = String(passwordNode?.value || "");
    const confirm = String(confirmNode?.value || "");

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
        await setupCredentials(login, password, confirm);
        lockActive = true;
        setMode("login");
        if (loginNode) loginNode.value = "";
        if (passwordNode) passwordNode.value = "";
        if (confirmNode) confirmNode.value = "";
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
      await verifyCredentials(login, password);
      if (loginNode) loginNode.value = "";
      if (passwordNode) passwordNode.value = "";
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
    if (!lockNode || !formNode) {
      unlockResolve?.();
      return;
    }

    formNode.addEventListener("submit", (event) => {
      void handleSubmit(event);
    });

    logoutBtn?.addEventListener("click", () => {
      logout();
    });

    try {
      const status = await fetchLockStatus();
      lockActive = Boolean(status?.enabled || status?.needsSetup);

      if (status?.needsSetup) {
        setMode("setup");
        if (loginNode && !loginNode.value.trim()) {
          loginNode.value = DEFAULT_LOGIN;
        }
        showLockScreen();
        return;
      }

      setMode("login");

      if (isSessionUnlocked()) {
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
    logout
  };

  void boot();
})();
