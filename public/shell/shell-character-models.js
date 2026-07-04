export const SHELL_CHARACTER_STORAGE_KEY = "shell-character-model";
export const HERO_CHARACTER_ID = "cloud";

export const SHELL_CHARACTER_MODELS = [
  {
    id: "robot",
    label: "Робот",
    icon: "🤖",
    file: "/shell/models/RobotExpressive.glb",
    credit: "Tomás Laulhé · CC0",
    transform: { rotY: 0, framePadding: 1.42, targetHeight: 1.15 },
    phases: {
      waiting: { clip: "Idle", timeScale: 1 },
      listening: { clip: "Wave", timeScale: 1 },
      thinking: { clip: "Walking", timeScale: 0.35 },
      speaking: { clip: "Standing", timeScale: 1 },
      disabled: { clip: "Sitting", timeScale: 1 }
    }
  },
  {
    id: "fox",
    label: "Лиса",
    icon: "🦊",
    file: "/shell/models/Fox.glb",
    credit: "Khronos glTF Samples · CC-BY 4.0",
    transform: { rotY: 0.4, framePadding: 1.34, targetHeight: 0.72, lookRatio: 0.4 },
    phases: {
      waiting: { clip: "Survey", timeScale: 1 },
      listening: { clip: "Walk", timeScale: 0.3 },
      thinking: { clip: "Walk", timeScale: 0.55 },
      speaking: { clip: "Survey", timeScale: 1.1 },
      disabled: { clip: "Survey", timeScale: 0.5 }
    }
  },
  {
    id: "parrot",
    label: "Попугай",
    icon: "🦜",
    file: "/shell/models/Parrot.glb",
    credit: "three.js examples · CC0",
    transform: { rotY: 0.5, framePadding: 1.36, targetHeight: 0.62, lookRatio: 0.38 },
    phases: {
      waiting: { clip: "parrot_A_", timeScale: 0.35 },
      listening: { clip: "parrot_A_", timeScale: 0.55 },
      thinking: { clip: "parrot_A_", timeScale: 0.75 },
      speaking: { clip: "parrot_A_", timeScale: 0.9 },
      disabled: { clip: "parrot_A_", timeScale: 0.2 }
    }
  },
  {
    id: "flamingo",
    label: "Фламинго",
    icon: "🦩",
    file: "/shell/models/Flamingo.glb",
    credit: "three.js examples · CC0",
    transform: { rotY: 0.45, framePadding: 1.36, targetHeight: 0.78, lookRatio: 0.4 },
    phases: {
      waiting: { clip: "flamingo_flyA_", timeScale: 0.35 },
      listening: { clip: "flamingo_flyA_", timeScale: 0.55 },
      thinking: { clip: "flamingo_flyA_", timeScale: 0.75 },
      speaking: { clip: "flamingo_flyA_", timeScale: 0.9 },
      disabled: { clip: "flamingo_flyA_", timeScale: 0.2 }
    }
  },
  {
    id: "lego",
    label: "LEGO",
    iconSvg: "/shell/icons/lego-minifig.svg",
    file: "/shell/models/LegoMinifig.glb",
    credit: "Kenney · CC0 · mini-characters",
    transform: { rotY: 0.2, framePadding: 1.32, targetHeight: 1.22, lookRatio: 0.46 },
    phases: {
      waiting: { clip: "idle", timeScale: 1 },
      listening: { clip: "emote-yes", timeScale: 1 },
      thinking: { clip: "walk", timeScale: 0.35 },
      speaking: { clip: "holding-right", timeScale: 0.85 },
      disabled: { clip: "sit", timeScale: 1 }
    }
  },
  {
    id: HERO_CHARACTER_ID,
    label: "Облачко",
    icon: "☁️",
    heroPick: true,
    fallback: true,
    credit: "Клик по аватару вверху"
  }
];

export const PICKER_CHARACTER_MODELS = SHELL_CHARACTER_MODELS.filter((item) => !item.heroPick);

export function getCharacterModel(id) {
  return SHELL_CHARACTER_MODELS.find((item) => item.id === id) || SHELL_CHARACTER_MODELS[0];
}

export function isFallbackCharacter(spec) {
  return Boolean(spec?.fallback);
}

export function loadStoredCharacterId() {
  try {
    const stored = localStorage.getItem(SHELL_CHARACTER_STORAGE_KEY);
    const normalized = stored === "minifig" ? "lego" : stored;
    if (normalized && SHELL_CHARACTER_MODELS.some((item) => item.id === normalized)) return normalized;
  } catch {
    // ignore
  }
  return SHELL_CHARACTER_MODELS[0].id;
}

export function saveStoredCharacterId(id) {
  try {
    localStorage.setItem(SHELL_CHARACTER_STORAGE_KEY, id);
  } catch {
    // ignore
  }
}
