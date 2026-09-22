function normalizeDialogScrollRatio(value) {
  const ratio = Number(value);
  if (!Number.isFinite(ratio)) return null;
  return Math.round(Math.min(1, Math.max(0, ratio)) * 10000) / 10000;
}

function hydrateWorkspaceUiFromShell(awnSettings = {}) {
  return { ...(awnSettings && typeof awnSettings === "object" ? awnSettings : {}) };
}

function buildShellUiPatchFromWorkspace() {
  return {};
}

function getUiSettingsDefaults() {
  return {};
}

module.exports = {
  UI_VOICE_TO_SHELL: {},
  hydrateWorkspaceUiFromShell,
  buildShellUiPatchFromWorkspace,
  getUiSettingsDefaults,
  normalizeDialogScrollRatio
};
