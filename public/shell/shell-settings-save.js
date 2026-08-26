export const SETTINGS_SECTIONS = ["window", "route", "proactive", "tts", "stt"];

export function createSettingsSaveController() {
  const baselines = {};
  const dirty = { window: false, route: false, proactive: false, tts: false, stt: false };
  let saveButtons = {};
  let toggleButtons = {};
  let settingsMenuBtn = null;

  function attachUi({ saveButtons: saveMap = {}, toggleButtons: toggleMap = {}, settingsMenuBtn: menuBtn = null } = {}) {
    saveButtons = saveMap;
    toggleButtons = toggleMap;
    settingsMenuBtn = menuBtn;
    syncUi();
  }

  function isSectionDirty(section) {
    return Boolean(dirty[section]);
  }

  function syncUi() {
    let settingsPanelDirty = false;
    for (const section of SETTINGS_SECTIONS) {
      const saveBtn = saveButtons[section];
      if (saveBtn) {
        const hasBaseline = Object.prototype.hasOwnProperty.call(baselines, section);
        saveBtn.classList.toggle("is-dirty", Boolean(dirty[section]));
        saveBtn.classList.toggle("is-saved", hasBaseline && !dirty[section]);
        saveBtn.disabled = false;
      }
      toggleButtons[section]?.classList.toggle("has-unsaved", Boolean(dirty[section]));
      if (["window", "route", "proactive"].includes(section)) {
        document
          .querySelectorAll(`.shell-settings-tab[data-settings-tab="${section}"]`)
          .forEach((tab) => tab.classList.toggle("has-unsaved", Boolean(dirty[section])));
        if (dirty[section]) settingsPanelDirty = true;
      }
    }
    settingsMenuBtn?.classList.toggle("has-unsaved", settingsPanelDirty);
  }

  function commitBaseline(section, snapshot) {
    baselines[section] = JSON.stringify(snapshot ?? {});
    dirty[section] = false;
    syncUi();
  }

  function commitAllBaselines(snapshots) {
    for (const section of SETTINGS_SECTIONS) {
      if (snapshots?.[section] !== undefined) {
        commitBaseline(section, snapshots[section]);
      }
    }
  }

  function markDirty(section, snapshot, getSnapshot) {
    const current = snapshot ?? getSnapshot?.(section);
    if (current === undefined) return;
    if (!Object.prototype.hasOwnProperty.call(baselines, section)) {
      commitBaseline(section, current);
      return;
    }
    dirty[section] = JSON.stringify(current) !== baselines[section];
    syncUi();
  }

  return {
    attachUi,
    isSectionDirty,
    syncUi,
    commitBaseline,
    commitAllBaselines,
    markDirty
  };
}
