export const SHELL_VOICE_PROMPT_NS = "agent-cms-voice";

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function shellVoicePlaceholder(key) {
  const name = String(key || "").trim();
  return `{{${SHELL_VOICE_PROMPT_NS}:${name}}}`;
}

export function renderShellVoicePlaceholders(template, vars = {}) {
  let text = String(template || "");
  const ns = escapeRegExp(SHELL_VOICE_PROMPT_NS);
  for (const [key, value] of Object.entries(vars)) {
    if (value === undefined || value === null) continue;
    const safe = String(value);
    const k = escapeRegExp(key);
    text = text.replace(new RegExp(`\\{\\{${ns}:${k}\\}\\}`, "g"), safe);
    text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), safe);
  }
  return text.trim();
}
