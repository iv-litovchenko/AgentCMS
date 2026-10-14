/** @typedef {{ id: string, label: string }} KokoroVoice */

/** @type {Record<string, { label: string, engine?: string, lang: string, voices: KokoroVoice[], sample?: string }>} */
export const KOKORO_LANG_PRESETS = {
  "en-us": {
    label: "English (US)",
    lang: "en-us",
    sample: "Hello! This is Kokoro American English.",
    voices: [
      { id: "af_bella", label: "Bella (F)" },
      { id: "af_sarah", label: "Sarah (F)" },
      { id: "af_nicole", label: "Nicole (F)" },
      { id: "am_adam", label: "Adam (M)" },
      { id: "am_michael", label: "Michael (M)" }
    ]
  },
  "en-gb": {
    label: "English (UK)",
    lang: "en-gb",
    sample: "Hello! This is Kokoro British English.",
    voices: [
      { id: "bf_emma", label: "Emma (F)" },
      { id: "bf_isabella", label: "Isabella (F)" },
      { id: "bm_george", label: "George (M)" },
      { id: "bm_lewis", label: "Lewis (M)" }
    ]
  },
  es: {
    label: "Español",
    lang: "es",
    sample: "Hola, ¿cómo estás?",
    voices: [
      { id: "ef_dora", label: "Dora (F)" },
      { id: "em_alex", label: "Alex (M)" }
    ]
  },
  "fr-fr": {
    label: "Français",
    lang: "fr-fr",
    sample: "Bonjour, comment allez-vous?",
    voices: [{ id: "ff_siwis", label: "Siwis (F)" }]
  },
  ja: {
    label: "日本語",
    lang: "ja",
    sample: "こんにちは、元気ですか。",
    voices: [
      { id: "jf_alpha", label: "Alpha (F)" },
      { id: "jm_kumo", label: "Kumo (M)" }
    ]
  },
  zh: {
    label: "中文",
    lang: "zh",
    sample: "你好，很高兴见到你。",
    voices: [
      { id: "zf_xiaobei", label: "Xiaobei (F)" },
      { id: "zm_yunjian", label: "Yunjian (M)" }
    ]
  },
  hi: {
    label: "हिन्दी",
    lang: "hi",
    sample: "नमस्ते, आप कैसे हैं?",
    voices: [
      { id: "hf_alpha", label: "Alpha (F)" },
      { id: "hm_omega", label: "Omega (M)" }
    ]
  },
  it: {
    label: "Italiano",
    lang: "it",
    sample: "Ciao, come stai?",
    voices: [
      { id: "if_sara", label: "Sara (F)" },
      { id: "im_nicola", label: "Nicola (M)" }
    ]
  },
  "pt-br": {
    label: "Português (BR)",
    lang: "pt-br",
    sample: "Olá, como você está?",
    voices: [
      { id: "pf_dora", label: "Dora (F)" },
      { id: "pm_alex", label: "Alex (M)" }
    ]
  },
  ru: {
    label: "Русский (kokoro-ru)",
    engine: "ru",
    lang: "ru",
    sample: "Привет! Это русский голос Kokoro — Света.",
    voices: [
      { id: "sveta", label: "Sveta (F)" },
      { id: "masha", label: "Masha (F)" },
      { id: "dima", label: "Dima (M)" }
    ]
  }
};

export function fillKokoroVoiceSelect(langKey, voiceSelect) {
  const preset = KOKORO_LANG_PRESETS[langKey] || KOKORO_LANG_PRESETS["en-us"];
  voiceSelect.replaceChildren();
  for (const v of preset.voices) {
    const opt = document.createElement("option");
    opt.value = v.id;
    opt.textContent = v.label;
    voiceSelect.appendChild(opt);
  }
  return preset;
}
