const DEFAULT_VOICE_COMPOSE_TEMPLATES = [
  {
    id: "very-brief",
    key: "very-brief",
    group: "Стиль ответа",
    label: "Ответ очень кратко",
    text: "Ответь очень кратко — одним-двумя предложениями."
  },
  {
    id: "brief",
    key: "brief",
    group: "Стиль ответа",
    label: "Ответ кратко",
    text: "Ответь кратко, без лишних деталей."
  },
  {
    id: "detailed",
    key: "detailed",
    group: "Стиль ответа",
    label: "Ответ развернуто",
    text: "Ответь развёрнуто, с подробностями и примерами."
  }
];

function isVoiceComposeTemplatesEmpty(value) {
  return !Array.isArray(value) || value.length === 0;
}

function slugifyTemplateKey(value, fallback = "tpl") {
  const base = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  const normalized = base.replace(/^[^a-z]+/, "") || fallback;
  return normalized.slice(0, 48) || fallback;
}

function assignTemplateKey(item, usedKeys, index) {
  const id = String(item.id || "").trim();
  const fromKey = slugifyTemplateKey(item.key, "");
  const fromId = slugifyTemplateKey(id, "");
  const fromLabel = slugifyTemplateKey(item.label, "");
  let key = fromKey || fromId || fromLabel || `tpl-${index + 1}`;
  if (!/^[a-z][a-z0-9_-]*$/.test(key)) {
    key = slugifyTemplateKey(key, `tpl-${index + 1}`);
  }
  let candidate = key;
  let n = 2;
  while (usedKeys.has(candidate)) {
    candidate = `${key}-${n}`;
    n += 1;
  }
  usedKeys.add(candidate);
  return candidate;
}

function normalizeTemplateGroup(value) {
  const group = String(value ?? "").trim();
  return group || "Стиль ответа";
}

function normalizeVoiceComposeTemplates(raw) {
  if (isVoiceComposeTemplatesEmpty(raw)) {
    return DEFAULT_VOICE_COMPOSE_TEMPLATES.map((item) => ({ ...item }));
  }
  const out = [];
  const seenIds = new Set();
  const usedKeys = new Set();
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const label = String(item.label || "").trim();
    const text = String(item.text || "").trim();
    if (!label || !text) continue;
    let id = String(item.id || "").trim();
    if (!id) id = `tpl-${out.length + 1}`;
    while (seenIds.has(id)) id = `${id}-${out.length + 1}`;
    seenIds.add(id);
    const key = assignTemplateKey({ ...item, id }, usedKeys, out.length);
    out.push({
      id,
      key,
      group: normalizeTemplateGroup(item.group),
      label,
      text
    });
  }
  return out.length ? out : DEFAULT_VOICE_COMPOSE_TEMPLATES.map((item) => ({ ...item }));
}

function resolveEffectiveVoiceComposeTemplates(raw) {
  return normalizeVoiceComposeTemplates(raw);
}

module.exports = {
  DEFAULT_VOICE_COMPOSE_TEMPLATES,
  isVoiceComposeTemplatesEmpty,
  normalizeVoiceComposeTemplates,
  resolveEffectiveVoiceComposeTemplates
};
