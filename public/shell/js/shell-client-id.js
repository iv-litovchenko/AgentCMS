const CLIENT_ID_KEY = "agentcms.shellClientId.v1";
const TAB_ID_KEY = "agentcms.shellTabId";

export function getShellClientId() {
  try {
    let id = localStorage.getItem(CLIENT_ID_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `shell-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(CLIENT_ID_KEY, id);
    }
    return id;
  } catch {
    return "shell-anonymous";
  }
}

/** Уникален для вкладки (sessionStorage), общий tab id с TTS coordinator. */
export function getShellTabId() {
  try {
    let id = sessionStorage.getItem(TAB_ID_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `tab-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      sessionStorage.setItem(TAB_ID_KEY, id);
    }
    return id;
  } catch {
    return "tab-anonymous";
  }
}

/** Ключ presence: один браузер + одна вкладка (разные браузеры — разные clientId). */
export function getShellPresenceClientId() {
  return `${getShellClientId()}:${getShellTabId()}`;
}
