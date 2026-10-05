/** Шаблоны команд для поля сообщения — хранятся в settings.json агента (compose.promptTemplates). */

export const DEFAULT_COMPOSE_TEMPLATE_GROUP = "Стиль ответа";
export const COMPOSE_TEMPLATE_MARKER_PREFIX = "tpl";
export const COMPOSE_TEMPLATE_KEY_RE = /^[a-z][a-z0-9_-]*$/;

/** Основной формат: {{tpl:brief}} — не конфликтует с wiki [[…]] и ::: VOICE-END :::. */
export const COMPOSE_TEMPLATE_MARKER_RE = /\{\{tpl:([a-z0-9_-]+)\}\}/gi;

/** Старый формат для обратной совместимости. */
export const COMPOSE_TEMPLATE_LEGACY_MARKER_RE = /\[\[([^\]]+?)\]\]/g;

export const DEFAULT_COMPOSE_PROMPT_TEMPLATES = [
  {
    id: "very-brief",
    key: "very-brief",
    group: DEFAULT_COMPOSE_TEMPLATE_GROUP,
    label: "Ответ очень кратко",
    text: "Ответь очень кратко — одним-двумя предложениями."
  },
  {
    id: "brief",
    key: "brief",
    group: DEFAULT_COMPOSE_TEMPLATE_GROUP,
    label: "Ответ кратко",
    text: "Ответь кратко, без лишних деталей."
  },
  {
    id: "detailed",
    key: "detailed",
    group: DEFAULT_COMPOSE_TEMPLATE_GROUP,
    label: "Ответ развернуто",
    text: "Ответь развёрнутo, с подробностями и примерами."
  }
];

export function slugifyTemplateKey(value, fallback = "tpl") {
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

function normalizeTemplateGroup(value) {
  const group = String(value ?? "").trim();
  return group || DEFAULT_COMPOSE_TEMPLATE_GROUP;
}

function assignTemplateKey(item, usedKeys, index) {
  const id = String(item.id || "").trim();
  const fromKey = slugifyTemplateKey(item.key, "");
  const fromId = slugifyTemplateKey(id, "");
  const fromLabel = slugifyTemplateKey(item.label, "");
  let key = fromKey || fromId || fromLabel || `tpl-${index + 1}`;
  if (!COMPOSE_TEMPLATE_KEY_RE.test(key)) {
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

export function normalizeComposePromptTemplates(raw) {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_COMPOSE_PROMPT_TEMPLATES.map((item) => ({ ...item }));
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
  return out.length ? out : DEFAULT_COMPOSE_PROMPT_TEMPLATES.map((item) => ({ ...item }));
}

function coerceEditorTemplate(item, index, existing = []) {
  const id = String(item?.id || "").trim() || createTemplateId(existing);
  return {
    id,
    key: String(item?.key ?? "").trim(),
    group: normalizeTemplateGroup(item?.group),
    label: String(item?.label ?? ""),
    text: String(item?.text ?? "")
  };
}

function groupEditorTemplates(templates) {
  const groups = [];
  const map = new Map();
  for (const tpl of templates) {
    const group = normalizeTemplateGroup(tpl.group);
    if (!map.has(group)) {
      map.set(group, []);
      groups.push(group);
    }
    map.get(group).push(tpl);
  }
  return { groups, map };
}

export function formatTemplateMarker(template) {
  const key = String(template?.key || "").trim();
  return key ? `{{tpl:${key}}}` : "";
}

function buildTemplateLookup(templates) {
  const normalized = normalizeComposePromptTemplates(templates);
  const byKey = new Map();
  const byLabel = new Map();
  const byId = new Map();
  for (const item of normalized) {
    byKey.set(item.key, item);
    byId.set(item.id, item);
    if (!byLabel.has(item.label)) byLabel.set(item.label, item);
  }
  return { byKey, byLabel, byId, normalized };
}

function resolveTemplateToken(token, lookup) {
  const value = String(token || "").trim();
  if (!value) return null;
  return lookup.byKey.get(value) || lookup.byLabel.get(value) || lookup.byId.get(value) || null;
}

export function findTemplateMarkers(text) {
  const markers = [];
  const source = String(text || "");

  COMPOSE_TEMPLATE_MARKER_RE.lastIndex = 0;
  let match;
  while ((match = COMPOSE_TEMPLATE_MARKER_RE.exec(source))) {
    const key = String(match[1] || "").trim();
    if (!key) continue;
    markers.push({
      kind: "key",
      key,
      token: key,
      raw: match[0],
      index: match.index
    });
  }

  COMPOSE_TEMPLATE_LEGACY_MARKER_RE.lastIndex = 0;
  while ((match = COMPOSE_TEMPLATE_LEGACY_MARKER_RE.exec(source))) {
    const token = String(match[1] || "").trim();
    if (!token) continue;
    markers.push({
      kind: "legacy",
      key: "",
      token,
      raw: match[0],
      index: match.index
    });
  }

  markers.sort((a, b) => a.index - b.index);
  return markers;
}

export function removeTemplateMarkerRaw(text, raw, { occurrence = 0 } = {}) {
  const target = String(raw || "");
  if (!target) return String(text || "");
  let seen = -1;
  let idx = 0;
  const source = String(text || "");
  while (idx <= source.length) {
    const pos = source.indexOf(target, idx);
    if (pos < 0) break;
    if (seen === occurrence) {
      return `${source.slice(0, pos)}${source.slice(pos + target.length)}`;
    }
    seen += 1;
    idx = pos + target.length;
  }
  return source;
}

export function expandComposeTemplateMarkers(text, templates) {
  const lookup = buildTemplateLookup(templates);
  let expanded = String(text || "");

  expanded = expanded.replace(COMPOSE_TEMPLATE_MARKER_RE, (raw, captured) => {
    const item = lookup.byKey.get(String(captured || "").trim());
    return item?.text?.trim() || raw;
  });

  expanded = expanded.replace(COMPOSE_TEMPLATE_LEGACY_MARKER_RE, (raw, captured) => {
    const item = resolveTemplateToken(captured, lookup);
    return item?.text?.trim() || raw;
  });

  return expanded;
}

function createTemplateId(existing = []) {
  const used = new Set(existing.map((item) => item.id));
  let n = existing.length + 1;
  let id = `tpl-${n}`;
  while (used.has(id)) {
    n += 1;
    id = `tpl-${n}`;
  }
  return id;
}

function appendToTextarea(textarea, chunk, { join = "newline" } = {}) {
  if (!textarea || !chunk) return;
  const trimmed = String(chunk).trim();
  if (!trimmed) return;
  const current = String(textarea.value || "").trimEnd();
  const separator =
    join === "newline" ? (current.endsWith("\n") || !current ? "" : "\n") : current ? " " : "";
  textarea.value = current ? `${current}${separator}${trimmed}` : trimmed;
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  textarea.focus();
  const len = textarea.value.length;
  try {
    textarea.setSelectionRange(len, len);
  } catch {
    // ignore
  }
}

function updateMarkerPreview(card) {
  const keyInput = card.querySelector(".shell-compose-templates-editor-key");
  const preview = card.querySelector(".shell-compose-templates-editor-marker");
  if (!preview || !keyInput) return;
  const key = slugifyTemplateKey(keyInput.value, "");
  preview.textContent = key ? `{{tpl:${key}}}` : "{{tpl:…}}";
}

function buildTemplateCard(tpl, { onChange, onRemove }) {
  const card = document.createElement("article");
  card.className = "shell-compose-templates-editor-item";
  card.dataset.templateId = tpl.id;

  const head = document.createElement("div");
  head.className = "shell-compose-templates-editor-item-head";
  const markerPreview = document.createElement("code");
  markerPreview.className = "shell-compose-templates-marker shell-compose-templates-editor-marker";
  markerPreview.textContent = formatTemplateMarker(tpl) || "{{tpl:…}}";
  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "shell-icon-btn shell-compose-templates-editor-remove";
  removeBtn.title = "Удалить шаблон";
  removeBtn.setAttribute("aria-label", "Удалить шаблон");
  removeBtn.textContent = "×";
  removeBtn.addEventListener("click", () => onRemove?.(card));
  head.append(markerPreview, removeBtn);

  const fields = document.createElement("div");
  fields.className = "shell-compose-templates-editor-fields";

  const keyField = document.createElement("label");
  keyField.className = "shell-field shell-field--compact";
  keyField.innerHTML = `<span class="shell-label">Ключ</span>`;
  const keyInput = document.createElement("input");
  keyInput.type = "text";
  keyInput.className = "shell-input shell-input--mono shell-compose-templates-editor-key";
  keyInput.value = tpl.key;
  keyInput.placeholder = "brief";
  keyInput.spellcheck = false;
  keyField.appendChild(keyInput);

  const labelField = document.createElement("label");
  labelField.className = "shell-field shell-field--compact";
  labelField.innerHTML = `<span class="shell-label">Название</span>`;
  const labelInput = document.createElement("input");
  labelInput.type = "text";
  labelInput.className = "shell-input shell-compose-templates-editor-label";
  labelInput.value = tpl.label;
  labelInput.placeholder = "Ответ кратко";
  labelField.appendChild(labelInput);

  const textField = document.createElement("label");
  textField.className = "shell-field shell-field--compact shell-compose-templates-editor-text-field";
  textField.innerHTML = `<span class="shell-label">Текст команды</span>`;
  const textInput = document.createElement("textarea");
  textInput.className = "shell-textarea shell-textarea--compact shell-compose-templates-editor-text";
  textInput.rows = 3;
  textInput.value = tpl.text;
  textInput.placeholder = "Ответь кратко…";
  textField.appendChild(textInput);

  fields.append(keyField, labelField, textField);
  card.append(head, fields);

  const sync = () => {
    updateMarkerPreview(card);
    onChange?.();
  };
  keyInput.addEventListener("input", sync);
  labelInput.addEventListener("input", sync);
  textInput.addEventListener("input", sync);

  return card;
}

export function initComposeTemplates({
  dialog,
  pickerList,
  activeList,
  insertBtn,
  closeBtn,
  editorRoot,
  editorAddBtn,
  editorAddGroupBtn,
  textarea,
  getTemplates,
  onEditorChange,
  insertText
} = {}) {
  const selected = new Set();
  let editorDraft = normalizeComposePromptTemplates(getTemplates?.()).map((item, index, all) =>
    coerceEditorTemplate(item, index, all)
  );
  let triggerBtn = null;

  function readTemplates() {
    return normalizeComposePromptTemplates(getTemplates?.());
  }

  function syncDraftFromEditorDom() {
    if (!editorRoot) return editorDraft;
    const next = [];
    editorRoot.querySelectorAll(".shell-compose-templates-editor-group").forEach((section) => {
      const group =
        section.querySelector(".shell-compose-templates-editor-group-title")?.value ??
        section.dataset.groupName ??
        DEFAULT_COMPOSE_TEMPLATE_GROUP;
      section.querySelectorAll(".shell-compose-templates-editor-item").forEach((card) => {
        next.push({
          id: card.dataset.templateId || createTemplateId(next),
          key: card.querySelector(".shell-compose-templates-editor-key")?.value ?? "",
          group,
          label: card.querySelector(".shell-compose-templates-editor-label")?.value ?? "",
          text: card.querySelector(".shell-compose-templates-editor-text")?.value ?? ""
        });
      });
    });
    editorDraft = next;
    return editorDraft;
  }

  function renderActiveMarkers() {
    if (!activeList || !textarea) return;
    const markers = findTemplateMarkers(textarea.value);
    const lookup = buildTemplateLookup(readTemplates());
    activeList.innerHTML = "";
    if (!markers.length) {
      const empty = document.createElement("li");
      empty.className = "shell-compose-templates-active-empty";
      empty.textContent = "Пока нет — выберите шаблоны ниже";
      activeList.appendChild(empty);
      return;
    }
    const counts = new Map();
    for (const marker of markers) {
      const countKey = marker.raw;
      const n = counts.get(countKey) || 0;
      counts.set(countKey, n + 1);
      const resolved =
        marker.kind === "key"
          ? lookup.byKey.get(marker.key)
          : resolveTemplateToken(marker.token, lookup);
      const li = document.createElement("li");
      li.className = "shell-compose-templates-active-item";
      const chip = document.createElement("code");
      chip.className = "shell-compose-templates-marker";
      chip.textContent = marker.raw;
      if (resolved?.label) chip.title = resolved.label;
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "shell-icon-btn shell-compose-templates-active-remove";
      removeBtn.title = "Убрать из сообщения";
      removeBtn.setAttribute("aria-label", `Убрать ${marker.raw}`);
      removeBtn.textContent = "×";
      const occurrence = n;
      removeBtn.addEventListener("click", () => {
        const next = removeTemplateMarkerRaw(textarea.value, marker.raw, { occurrence });
        textarea.value = next.replace(/\n{3,}/g, "\n\n").trimEnd();
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
        renderActiveMarkers();
      });
      li.append(chip, removeBtn);
      activeList.appendChild(li);
    }
  }

  function renderPicker() {
    if (!pickerList) return;
    const templates = readTemplates();
    pickerList.innerHTML = "";
    if (!templates.length) {
      const empty = document.createElement("li");
      empty.className = "shell-compose-templates-picker-empty";
      empty.textContent = "Нет шаблонов — добавьте в настройках «Шаблоны»";
      pickerList.appendChild(empty);
      return;
    }
    const { groups, map } = groupEditorTemplates(templates);
    for (const groupName of groups) {
      const groupLi = document.createElement("li");
      groupLi.className = "shell-compose-templates-picker-group";
      const title = document.createElement("div");
      title.className = "shell-compose-templates-picker-group-title";
      title.textContent = groupName;
      groupLi.appendChild(title);
      const sub = document.createElement("ul");
      sub.className = "shell-compose-templates-picker-group-list";
      for (const tpl of map.get(groupName) || []) {
        const li = document.createElement("li");
        li.className = "shell-compose-templates-picker-item";
        const label = document.createElement("label");
        label.className = "shell-compose-templates-picker-label";
        const input = document.createElement("input");
        input.type = "checkbox";
        input.className = "shell-compose-templates-picker-check";
        input.value = tpl.id;
        input.checked = selected.has(tpl.id);
        input.addEventListener("change", () => {
          if (input.checked) selected.add(tpl.id);
          else selected.delete(tpl.id);
        });
        const titleRow = document.createElement("span");
        titleRow.className = "shell-compose-templates-picker-title";
        const marker = document.createElement("code");
        marker.className = "shell-compose-templates-marker";
        marker.textContent = formatTemplateMarker(tpl);
        titleRow.appendChild(marker);
        const name = document.createElement("span");
        name.className = "shell-compose-templates-picker-name";
        name.textContent = tpl.label;
        const hint = document.createElement("span");
        hint.className = "shell-compose-templates-picker-text";
        hint.textContent = tpl.text;
        label.append(input, titleRow, name, hint);
        li.appendChild(label);
        sub.appendChild(li);
      }
      groupLi.appendChild(sub);
      pickerList.appendChild(groupLi);
    }
  }

  function renderEditor(preserveDraft = false) {
    if (!editorRoot) return;
    if (!preserveDraft) {
      editorDraft = normalizeComposePromptTemplates(getTemplates?.()).map((item, index, all) =>
        coerceEditorTemplate(item, index, all)
      );
    }
    const { groups, map } = groupEditorTemplates(editorDraft);
    editorRoot.replaceChildren();

    for (const groupName of groups) {
      const section = document.createElement("section");
      section.className = "shell-compose-templates-editor-group";
      section.dataset.groupName = groupName;

      const header = document.createElement("div");
      header.className = "shell-compose-templates-editor-group-head";

      const titleInput = document.createElement("input");
      titleInput.type = "text";
      titleInput.className = "shell-input shell-compose-templates-editor-group-title";
      titleInput.value = groupName;
      titleInput.placeholder = "Название группы";
      titleInput.addEventListener("input", () => {
        const next = titleInput.value.trim() || DEFAULT_COMPOSE_TEMPLATE_GROUP;
        section.dataset.groupName = next;
        onEditorChange?.();
      });

      const groupActions = document.createElement("div");
      groupActions.className = "shell-compose-templates-editor-group-actions";

      const addInGroupBtn = document.createElement("button");
      addInGroupBtn.type = "button";
      addInGroupBtn.className = "shell-label-action";
      addInGroupBtn.textContent = "+ Шаблон";
      addInGroupBtn.addEventListener("click", () => {
        syncDraftFromEditorDom();
        const group = section.dataset.groupName || groupName;
        editorDraft.push({
          id: createTemplateId(editorDraft),
          key: "",
          group,
          label: "",
          text: ""
        });
        renderEditor(true);
        onEditorChange?.();
        section
          .querySelector(".shell-compose-templates-editor-item:last-child .shell-compose-templates-editor-key")
          ?.focus();
      });

      const removeGroupBtn = document.createElement("button");
      removeGroupBtn.type = "button";
      removeGroupBtn.className = "shell-icon-btn shell-compose-templates-editor-group-remove";
      removeGroupBtn.title = "Удалить группу";
      removeGroupBtn.setAttribute("aria-label", "Удалить группу");
      removeGroupBtn.textContent = "×";
      removeGroupBtn.addEventListener("click", () => {
        syncDraftFromEditorDom();
        const group = section.dataset.groupName || groupName;
        editorDraft = editorDraft.filter((item) => normalizeTemplateGroup(item.group) !== group);
        if (!editorDraft.length) {
          editorDraft.push({
            id: createTemplateId([]),
            key: "",
            group: DEFAULT_COMPOSE_TEMPLATE_GROUP,
            label: "",
            text: ""
          });
        }
        renderEditor(true);
        onEditorChange?.();
      });

      groupActions.append(addInGroupBtn, removeGroupBtn);
      header.append(titleInput, groupActions);

      const items = document.createElement("div");
      items.className = "shell-compose-templates-editor-group-items";

      for (const tpl of map.get(groupName) || []) {
        const card = buildTemplateCard(tpl, {
          onChange: () => onEditorChange?.(),
          onRemove: (cardEl) => {
            syncDraftFromEditorDom();
            const id = cardEl.dataset.templateId;
            editorDraft = editorDraft.filter((item) => item.id !== id);
            if (!editorDraft.length) {
              editorDraft.push({
                id: createTemplateId([]),
                key: "",
                group: section.dataset.groupName || groupName,
                label: "",
                text: ""
              });
            }
            renderEditor(true);
            onEditorChange?.();
          }
        });
        items.appendChild(card);
      }

      section.append(header, items);
      editorRoot.appendChild(section);
    }
  }

  function openDialog(btn = null) {
    if (!dialog) return;
    triggerBtn = btn;
    selected.clear();
    renderPicker();
    renderActiveMarkers();
    triggerBtn?.setAttribute("aria-expanded", "true");
    try {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    } catch {
      dialog.setAttribute("open", "");
    }
  }

  function closeDialog() {
    if (!dialog) return;
    dialog.close?.();
    dialog.removeAttribute("open");
    selected.clear();
    document.querySelectorAll("[data-compose-action='templates-preview']").forEach((btn) => {
      btn.setAttribute("aria-expanded", "false");
    });
    triggerBtn = null;
  }

  function insertSelected() {
    const templates = readTemplates();
    const picked = templates.filter((tpl) => selected.has(tpl.id));
    if (!picked.length) return;
    const block = picked.map((tpl) => formatTemplateMarker(tpl)).filter(Boolean).join("\n");
    if (insertText) insertText(block);
    else appendToTextarea(textarea, block, { join: "newline" });
    selected.clear();
    renderPicker();
    renderActiveMarkers();
  }

  function collectForSave() {
    syncDraftFromEditorDom();
    return normalizeComposePromptTemplates(editorDraft);
  }

  function applyFromSettings(templates) {
    editorDraft = normalizeComposePromptTemplates(templates).map((item, index, all) =>
      coerceEditorTemplate(item, index, all)
    );
    renderEditor(true);
    selected.clear();
    renderPicker();
    renderActiveMarkers();
  }

  function addTemplate(group = "") {
    syncDraftFromEditorDom();
    const targetGroup =
      group ||
      editorDraft[editorDraft.length - 1]?.group ||
      editorRoot?.querySelector(".shell-compose-templates-editor-group:last-child")?.dataset.groupName ||
      DEFAULT_COMPOSE_TEMPLATE_GROUP;
    editorDraft.push({
      id: createTemplateId(editorDraft),
      key: "",
      group: targetGroup,
      label: "",
      text: ""
    });
    renderEditor(true);
    onEditorChange?.();
    editorRoot
      ?.querySelector(".shell-compose-templates-editor-item:last-child .shell-compose-templates-editor-key")
      ?.focus();
  }

  function addGroup() {
    syncDraftFromEditorDom();
    const base = `Группа ${editorRoot?.querySelectorAll(".shell-compose-templates-editor-group").length + 1 || 1}`;
    editorDraft.push({
      id: createTemplateId(editorDraft),
      key: "",
      group: base,
      label: "",
      text: ""
    });
    renderEditor(true);
    onEditorChange?.();
    editorRoot
      ?.querySelector(".shell-compose-templates-editor-group:last-child .shell-compose-templates-editor-group-title")
      ?.focus();
  }

  document.querySelectorAll("[data-compose-action='templates-preview']").forEach((btn) => {
    if (btn.dataset.shellBound === "1") return;
    btn.dataset.shellBound = "1";
    btn.addEventListener("click", () => openDialog(btn));
  });

  insertBtn?.addEventListener("click", () => insertSelected());
  closeBtn?.addEventListener("click", () => closeDialog());
  dialog?.addEventListener("close", () => closeDialog());
  dialog?.addEventListener("cancel", () => closeDialog());

  editorAddBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    addTemplate();
  });
  editorAddGroupBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    addGroup();
  });

  textarea?.addEventListener("input", () => {
    if (dialog?.open) renderActiveMarkers();
  });

  renderEditor(true);
  renderPicker();

  return {
    applyFromSettings,
    collectForSave,
    refreshPicker: renderPicker,
    openDialog,
    closeDialog
  };
}
