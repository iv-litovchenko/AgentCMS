/** Canonical storage keys + one-time migration from deprecated /shell/mobile/. */

export const SHELL_STORAGE = Object.freeze({
  agent: "agentcms.shellAgent.v1",
  voiceConfirm: "agentcms.shell.voiceConfirm.v1",
  keepAwake: "agentcms.shell.keepAwake.v1",
  installDismiss: "agentcms.shell.installDismiss.v1",
  chatCollapsed: "agentcms.shell.chatCollapsed.v1",
  history: "agentcms.shell.history.v1",
  locationShare: "agentcms.shell.locationShare.v1",
  characterBg: "agentcms.shell.characterBg.v1",
  migratedFlag: "agentcms.shell.storageMigrated.v1"
});

export const MOBILE_STORAGE_LEGACY = Object.freeze({
  agent: "agentcms.shellAgent.mobile.v1",
  voiceConfirm: "agentcms.shellMobile.voiceConfirm.v1",
  installDismiss: "agentcms.shellMobile.installDismiss.v1",
  chatCollapsed: "agentcms.shellMobile.chatCollapsed.v1",
  history: "agentcms.shellMobile.history.v1",
  characterBg: "agentcms.shellMobile.characterBg.v1",
  characterBgLegacy: "agentcms.shellMobile.background.v1"
});

function copyIfEmpty(store, fromKey, toKey) {
  try {
    const current = store.getItem(toKey);
    if (current !== null && current !== "") return false;
    const legacy = store.getItem(fromKey);
    if (legacy === null || legacy === "") return false;
    store.setItem(toKey, legacy);
    return true;
  } catch {
    return false;
  }
}

/**
 * Copies mobile-only keys into canonical shell keys when shell values are unset.
 * Safe to call on every boot; runs body once per browser profile.
 */
export function migrateShellStorageFromMobile() {
  if (localStorage.getItem(SHELL_STORAGE.migratedFlag) === "1") {
    return { migrated: false, copied: [] };
  }

  const copied = [];
  const localPairs = [
    [MOBILE_STORAGE_LEGACY.agent, SHELL_STORAGE.agent],
    [MOBILE_STORAGE_LEGACY.voiceConfirm, SHELL_STORAGE.voiceConfirm],
    [MOBILE_STORAGE_LEGACY.installDismiss, SHELL_STORAGE.installDismiss],
    [MOBILE_STORAGE_LEGACY.chatCollapsed, SHELL_STORAGE.chatCollapsed]
  ];

  for (const [from, to] of localPairs) {
    if (copyIfEmpty(localStorage, from, to)) copied.push(to);
  }

  if (copyIfEmpty(sessionStorage, MOBILE_STORAGE_LEGACY.history, SHELL_STORAGE.history)) {
    copied.push(`session:${SHELL_STORAGE.history}`);
  }

  const legacyBg =
    localStorage.getItem(MOBILE_STORAGE_LEGACY.characterBg) ||
    localStorage.getItem(MOBILE_STORAGE_LEGACY.characterBgLegacy);
  if (legacyBg && !localStorage.getItem(SHELL_STORAGE.characterBg)) {
    localStorage.setItem(SHELL_STORAGE.characterBg, legacyBg);
    copied.push(SHELL_STORAGE.characterBg);
  }

  localStorage.setItem(SHELL_STORAGE.migratedFlag, "1");
  return { migrated: true, copied };
}
