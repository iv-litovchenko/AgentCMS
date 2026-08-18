const { loadSystemFilePresets } = require("../awn-system-presets-loader");

const SHELL_PROMPT_SLUGS = {
  ttsPrompt: "shell-tts-prompt",
  sttPrompt: "shell-stt-prompt",
  proactivePrompt: "shell-proactive-prompt"
};

function presetBodyBySlug(presets, slug) {
  const preset = (presets || []).find((item) => item.slug === slug);
  return String(preset?.body || "").trim();
}

function loadShellPromptTemplates(projectRoot, agentRoot = "") {
  const { presets } = loadSystemFilePresets(projectRoot, agentRoot);
  const ttsPreset = presets.find((item) => item.slug === SHELL_PROMPT_SLUGS.ttsPrompt);
  const sttPreset = presets.find((item) => item.slug === SHELL_PROMPT_SLUGS.sttPrompt);
  const proactivePreset = presets.find((item) => item.slug === SHELL_PROMPT_SLUGS.proactivePrompt);
  return {
    ttsPrompt: presetBodyBySlug(presets, SHELL_PROMPT_SLUGS.ttsPrompt),
    sttPrompt: presetBodyBySlug(presets, SHELL_PROMPT_SLUGS.sttPrompt),
    proactivePrompt: presetBodyBySlug(presets, SHELL_PROMPT_SLUGS.proactivePrompt),
    sources: {
      ttsPrompt: ttsPreset?.catalogFile || null,
      sttPrompt: sttPreset?.catalogFile || null,
      proactivePrompt: proactivePreset?.catalogFile || null
    }
  };
}

module.exports = {
  SHELL_PROMPT_SLUGS,
  loadShellPromptTemplates
};
