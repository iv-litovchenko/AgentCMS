export const SETTINGS_SECTIONS = ["window", "route", "proactive", "templates", "tts", "stt"];

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

export function createSettingsSaveController() {
  const baselines = {};
  const dirty = { window: false, route: false, proactive: false, templates: false, tts: false, stt: false };
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

  function forceDirty(section) {
    if (!SETTINGS_SECTIONS.includes(section)) return;
    dirty[section] = true;
    syncUi();
  }

  function syncUi() {
    let settingsPanelDirty = false;
    const menuBtn = settingsMenuBtn || document.getElementById("shell-settings-btn");
    const saveBtnIds = {
      window: "shell-window-save",
      route: "shell-route-save",
      proactive: "shell-proactive-save",
      templates: "shell-templates-save",
      tts: "shell-tts-save",
      stt: "shell-stt-save"
    };
    for (const section of SETTINGS_SECTIONS) {
      const saveBtn = saveButtons[section] || document.getElementById(saveBtnIds[section]);
      if (saveBtn) {
        const hasBaseline = Object.prototype.hasOwnProperty.call(baselines, section);
        saveBtn.classList.toggle("is-dirty", Boolean(dirty[section]));
        saveBtn.classList.toggle("is-saved", hasBaseline && !dirty[section]);
        saveBtn.disabled = false;
      }
      toggleButtons[section]?.classList.toggle("has-unsaved", Boolean(dirty[section]));
      const tabName =
        section === "stt" || section === "tts"
          ? section
          : ["window", "route", "proactive", "templates"].includes(section)
            ? section
            : "";
      if (tabName) {
        document
          .querySelectorAll(`.shell-settings-tab[data-settings-tab="${tabName}"]`)
          .forEach((tab) => {
            tab.classList.toggle("has-unsaved", Boolean(dirty[section]));
          });
        if (dirty[section]) settingsPanelDirty = true;
      }
    }
    menuBtn?.classList.toggle("has-unsaved", settingsPanelDirty);
  }

  function commitBaseline(section, snapshot) {
    baselines[section] = stableStringify(snapshot ?? {});
    dirty[section] = false;
    syncUi();
  }

  function patchBaseline(section, patch) {
    if (!patch || typeof patch !== "object") return;
    if (!Object.prototype.hasOwnProperty.call(baselines, section)) return;
    let base = {};
    try {
      base = JSON.parse(baselines[section]);
    } catch {
      base = {};
    }
    baselines[section] = stableStringify({ ...base, ...patch });
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
    if (current && typeof current === "object" && current.__dirtyFallback) {
      dirty[section] = true;
      syncUi();
      return;
    }
    if (!Object.prototype.hasOwnProperty.call(baselines, section)) {
      dirty[section] = true;
      syncUi();
      return;
    }
    dirty[section] = stableStringify(current) !== baselines[section];
    syncUi();
  }

  function ensureBaseline(section, snapshot) {
    if (Object.prototype.hasOwnProperty.call(baselines, section)) return;
    commitBaseline(section, snapshot ?? {});
  }

  return {
    attachUi,
    isSectionDirty,
    forceDirty,
    syncUi,
    commitBaseline,
    patchBaseline,
    commitAllBaselines,
    markDirty,
    ensureBaseline
  };
}
