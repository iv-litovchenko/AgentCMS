(function () {
  "use strict";

  const panelNode = document.getElementById("app-lock-scanner");
  if (!panelNode) return;

  const badgeNode = document.getElementById("app-lock-scanner-badge");
  const statusNode = document.getElementById("app-lock-scanner-status");
  const progressNode = document.getElementById("app-lock-scanner-progress");
  const actionNode = document.getElementById("app-lock-scanner-action");
  const loginNode = document.getElementById("app-lock-login");
  const passwordNode = document.getElementById("app-lock-password");
  const errorNode = document.getElementById("app-lock-error");

  let scannerStatus = null;
  let enrollSessionId = null;
  let enrollScanIndex = 0;
  let busy = false;

  function setError(message = "") {
    if (!errorNode) return;
    const text = String(message || "").trim();
    errorNode.textContent = text;
    errorNode.classList.toggle("hidden", !text);
  }

  function setBusy(nextBusy) {
    busy = Boolean(nextBusy);
    if (!actionNode) return;
    actionNode.disabled = busy;
    panelNode.classList.toggle("is-busy", busy);
  }

  function setProgress(text = "") {
    if (!progressNode) return;
    const value = String(text || "").trim();
    progressNode.textContent = value;
    progressNode.classList.toggle("hidden", !value);
  }

  function getCredentials() {
    return {
      login: String(loginNode?.value || "").trim(),
      password: String(passwordNode?.value || "")
    };
  }

  async function fetchScannerStatus() {
    const { login } = getCredentials();
    const query = login ? `?login=${encodeURIComponent(login)}` : "";
    const response = await fetch(`/api/fingerprint-scanner/status${query}`, { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "Не удалось получить статус сканера");
    }
    return data;
  }

  function renderStatus() {
    if (!scannerStatus) return;

    if (badgeNode) {
      badgeNode.textContent = `${scannerStatus.driver || "mock"} · SQLite`;
    }

    if (scannerStatus.enrolled) {
      if (statusNode) {
        statusNode.textContent = `Привязан для ${scannerStatus.enrolledLogin || "пользователя"} · ${scannerStatus.templateCount} шаблон(ов)`;
      }
      if (actionNode) actionNode.textContent = "Войти по сканеру";
      return;
    }

    if (statusNode) statusNode.textContent = "Не привязан — сначала нужна привязка (3 скана).";
    if (actionNode) actionNode.textContent = "Привязать USB-сканер";
  }

  async function refreshStatus() {
    try {
      scannerStatus = await fetchScannerStatus();
      renderStatus();
    } catch (error) {
      if (statusNode) {
        statusNode.textContent = error instanceof Error ? error.message : "Ошибка статуса сканера";
      }
    }
  }

  async function sleep(ms) {
    await new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  async function runEnrollFlow(login, password) {
    setProgress("Запуск привязки…");
    const startResponse = await fetch("/api/fingerprint-scanner/enroll/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, password })
    });
    const startData = await startResponse.json().catch(() => ({}));
    if (!startResponse.ok) {
      throw new Error(startData.error || "Не удалось начать привязку");
    }

    enrollSessionId = startData.sessionId;
    enrollScanIndex = 0;
    const required = Number(startData.requiredScans) || 3;

    for (let i = 0; i < required; i += 1) {
      setProgress(`Скан ${i + 1} из ${required}… приложите палец`);
      panelNode.classList.add("is-scanning");
      await sleep(700);
      const scanResponse = await fetch("/api/fingerprint-scanner/enroll/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: enrollSessionId })
      });
      const scanData = await scanResponse.json().catch(() => ({}));
      panelNode.classList.remove("is-scanning");
      if (!scanResponse.ok) {
        throw new Error(scanData.error || "Ошибка сканирования");
      }
      enrollScanIndex = scanData.scanIndex || i + 1;
      setProgress(`Скан ${enrollScanIndex} из ${required} получен`);
      await sleep(350);
    }

    const finishResponse = await fetch("/api/fingerprint-scanner/enroll/finish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: enrollSessionId })
    });
    const finishData = await finishResponse.json().catch(() => ({}));
    if (!finishResponse.ok) {
      throw new Error(finishData.error || "Не удалось сохранить шаблон");
    }

    enrollSessionId = null;
    setProgress("Шаблон сохранён в SQLite");
    await refreshStatus();
    window.setTimeout(() => setProgress(""), 1800);
  }

  async function runVerifyFlow() {
    setProgress("Сканирование… приложите палец");
    panelNode.classList.add("is-scanning");
    await sleep(800);

    const { login } = getCredentials();
    const verifyResponse = await fetch("/api/fingerprint-scanner/verify/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: login || undefined })
    });
    const verifyData = await verifyResponse.json().catch(() => ({}));
    panelNode.classList.remove("is-scanning");

    if (!verifyResponse.ok) {
      throw new Error(verifyData.error || "Отпечаток не принят");
    }

    setProgress(`Совпадение ${Math.round(Number(verifyData.score || 0) * 100)}%`);
    if (loginNode) loginNode.value = "";
    if (passwordNode) passwordNode.value = "";
    if (window.agentAppLock?.completeUnlock) {
      window.agentAppLock.completeUnlock();
    }
  }

  async function handleActionClick() {
    if (busy) return;
    setError("");
    setBusy(true);

    try {
      if (!scannerStatus?.enrolled) {
        const { login, password } = getCredentials();
        if (!login || !password) {
          setError("Для привязки сканера введите логин и пароль CMS");
          passwordNode?.focus();
          return;
        }
        await runEnrollFlow(login, password);
        return;
      }

      await runVerifyFlow();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Ошибка сканера");
      setProgress("");
    } finally {
      setBusy(false);
    }
  }

  actionNode?.addEventListener("click", () => {
    void handleActionClick();
  });

  loginNode?.addEventListener("input", () => {
    void refreshStatus();
  });

  void refreshStatus();

  window.agentAppLockScanner = {
    refreshStatus
  };
})();
