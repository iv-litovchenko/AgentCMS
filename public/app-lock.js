(function () {
  "use strict";

  const SESSION_KEY = "agentcms.appLock.unlocked.v1";

  const lockNode = document.getElementById("app-lock");
  const leadNode = document.getElementById("app-lock-lead");
  const formNode = document.getElementById("app-lock-form");
  const loginNode = document.getElementById("app-lock-login");
  const passwordNode = document.getElementById("app-lock-password");
  const errorNode = document.getElementById("app-lock-error");
  const submitNode = document.getElementById("app-lock-submit");

  let unlockResolve = null;

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

  function setError(message = "") {
    if (!errorNode) return;
    const text = String(message || "").trim();
    errorNode.textContent = text;
    errorNode.classList.toggle("hidden", !text);
  }

  function setSubmitting(isSubmitting) {
    if (!submitNode) return;
    submitNode.disabled = isSubmitting;
    submitNode.textContent = isSubmitting ? "Проверка…" : "Войти";
  }

  function hideLockScreen() {
    lockNode?.classList.add("hidden");
    document.body.classList.remove("app-locked");
  }

  function showLockScreen() {
    lockNode?.classList.remove("hidden");
    document.body.classList.add("app-locked");
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

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const login = String(loginNode?.value || "").trim();
    const password = String(passwordNode?.value || "");

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

    try {
      const status = await fetchLockStatus();
      if (!status?.enabled) {
        hideLockScreen();
        unlockResolve?.();
        return;
      }

      if (leadNode) {
        leadNode.textContent = "Введите логин и пароль";
      }

      if (isSessionUnlocked()) {
        completeUnlock();
        return;
      }

      showLockScreen();
    } catch {
      setError("Не удалось проверить настройки входа");
      showLockScreen();
    }
  }

  window.agentAppLock = {
    whenUnlocked: () => unlockPromise
  };

  void boot();
})();
