import { SHELL_STORAGE } from "@shell/storage-keys";

export const DEFAULT_WINDOW_SETTINGS = {
  windowTopmost: true,
  windowTransparent: false,
  windowBackground: "wallpaper",
  windowCompact: false,
  windowPetOverlay: false,
  compactDialogQa: true
};

export function normalizeWindowSettings(raw) {
  const merged = {
    ...DEFAULT_WINDOW_SETTINGS,
    ...(raw && typeof raw === "object" ? raw : {})
  };
  merged.windowTopmost = merged.windowTopmost !== false;
  merged.windowTransparent = Boolean(merged.windowTransparent);
  const bg = String(merged.windowBackground || "wallpaper").trim();
  if (!["wallpaper", "dark", "transparent"].includes(bg)) {
    merged.windowBackground = "wallpaper";
  }
  if (merged.windowTransparent || merged.windowBackground === "transparent") {
    merged.windowTransparent = true;
    merged.windowBackground = "transparent";
  }
  merged.windowCompact = Boolean(merged.windowCompact);
  merged.windowPetOverlay = Boolean(merged.windowPetOverlay);
  merged.compactDialogQa = Boolean(merged.compactDialogQa);
  return merged;
}

export function readWindowSettingsFromStorage() {
  try {
    const raw = localStorage.getItem(SHELL_STORAGE.windowSettings);
    if (!raw) return null;
    return normalizeWindowSettings(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeWindowSettingsToStorage(patch) {
  const current = readWindowSettingsFromStorage() || normalizeWindowSettings({});
  const next = normalizeWindowSettings({ ...current, ...(patch && typeof patch === "object" ? patch : {}) });
  localStorage.setItem(SHELL_STORAGE.windowSettings, JSON.stringify(next));
  return next;
}
