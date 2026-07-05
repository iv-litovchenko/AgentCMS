const BG_STORAGE_KEY = "agentcms.shellMobile.characterBg.v1";
const LEGACY_BG_KEY = "agentcms.shellMobile.background.v1";

export function normalizeCharacterBackdrop(value) {
  return value === "dark" ? "dark" : "wallpaper";
}

export function readStoredCharacterBackdrop() {
  const stored = localStorage.getItem(BG_STORAGE_KEY) || localStorage.getItem(LEGACY_BG_KEY);
  return normalizeCharacterBackdrop(stored || "wallpaper");
}

export function storeCharacterBackdrop(value) {
  const bg = normalizeCharacterBackdrop(value);
  localStorage.setItem(BG_STORAGE_KEY, bg);
  return bg;
}

export function applyCharacterBackdrop(value, stageEl = null) {
  const bg = normalizeCharacterBackdrop(value);
  const stage = stageEl || document.querySelector(".mobile-character-stage");
  if (!stage) return bg;
  stage.classList.remove("mobile-character-bg-wallpaper", "mobile-character-bg-dark");
  stage.classList.add(`mobile-character-bg-${bg}`);
  return bg;
}

export function saveCharacterBackdrop(value, stageEl = null) {
  const bg = storeCharacterBackdrop(value);
  applyCharacterBackdrop(bg, stageEl);
  return bg;
}
