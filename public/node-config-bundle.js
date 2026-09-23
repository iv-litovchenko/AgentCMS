(function (global) {
  const NODE_CONFIG_SECTION_KEYS = ["awn_schema", "awn_ui", "awn_settings"];
  const NODE_CONFIG_LEGACY_UI_KEYS = new Set(["default_landing_mode"]);
  const NODE_CONFIG_RESERVED_ROOT_KEYS = new Set([
    ...NODE_CONFIG_SECTION_KEYS,
    ...NODE_CONFIG_LEGACY_UI_KEYS
  ]);

  function parseYamlScalar(value) {
    const raw = String(value ?? "").trim();
    if (!raw) return "";
    if (raw === "true" || raw === "false") return raw === "true";
    if (/^-?\d+(?:\.\d+)?$/.test(raw)) return Number(raw);
    if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
      return raw.slice(1, -1);
    }
    return raw;
  }

  function nextSignificantYamlLine(lines, startIndex) {
    for (let index = startIndex; index < lines.length; index += 1) {
      const line = lines[index];
      if (!line.trim() || line.trim().startsWith("#")) continue;
      return { line, index, indent: line.match(/^(\s*)/)[1].length, trimmed: line.trim() };
    }
    return null;
  }

  function parseTypeYaml(text) {
    const lines = String(text || "").replace(/^\uFEFF/, "").split(/\r?\n/);
    const root = {};
    const stack = [{ indent: -1, kind: "object", obj: root }];

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      const rawLine = lines[lineIndex];
      if (!rawLine.trim() || rawLine.trim().startsWith("#")) continue;

      const indent = rawLine.match(/^(\s*)/)[1].length;
      const trimmed = rawLine.trim();

      while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
        stack.pop();
      }

      const frame = stack[stack.length - 1];

      if (trimmed.startsWith("- ")) {
        if (frame.kind !== "array") continue;
        const itemText = trimmed.slice(2).trim();
        const targetArray = frame.arr;
        if (!itemText) {
          const item = {};
          targetArray.push(item);
          stack.push({ indent, kind: "object", obj: item });
          continue;
        }

        const itemKv = itemText.match(/^([^:]+):\s*(.*)$/);
        if (itemKv) {
          const itemKey = itemKv[1].trim();
          const itemValue = itemKv[2].trim();
          const item = {};
          if (itemValue === "" || itemValue === "|" || itemValue === ">") {
            item[itemKey] = {};
            targetArray.push(item);
            stack.push({ indent, kind: "object", obj: item[itemKey] });
          } else {
            item[itemKey] = parseYamlScalar(itemValue);
            targetArray.push(item);
            stack.push({ indent, kind: "object", obj: item });
          }
          continue;
        }

        targetArray.push(parseYamlScalar(itemText));
        continue;
      }

      const kv = trimmed.match(/^([^:]+):\s*(.*)$/);
      if (!kv) continue;

      const key = kv[1].trim();
      const value = kv[2].trim();
      let target = null;

      if (frame.kind === "object") {
        target = frame.obj;
      } else if (frame.kind === "array") {
        const lastItem = frame.arr[frame.arr.length - 1];
        if (lastItem && typeof lastItem === "object" && !Array.isArray(lastItem)) {
          target = lastItem;
        } else {
          const item = {};
          frame.arr.push(item);
          target = item;
        }
      } else {
        continue;
      }

      if (value === "" || value === "|" || value === ">") {
        const next = nextSignificantYamlLine(lines, lineIndex + 1);
        if (next && next.indent > indent && next.trimmed.startsWith("- ")) {
          const arr = [];
          target[key] = arr;
          stack.push({ indent, kind: "array", arr, parent: target, parentKey: key });
        } else {
          const child = {};
          target[key] = child;
          stack.push({ indent, kind: "object", obj: child });
        }
        continue;
      }

      if (value.startsWith("[") && value.endsWith("]")) {
        const inner = value.slice(1, -1).trim();
        target[key] = inner
          ? inner.split(",").map((part) => part.trim().replace(/^["']|["']$/g, ""))
          : [];
        continue;
      }

      target[key] = parseYamlScalar(value);
    }

    for (const frame of stack) {
      if (frame.kind === "array" && frame.parent && frame.parentKey) {
        frame.parent[frame.parentKey] = frame.arr;
      }
    }

    return root;
  }

  function formatYamlScalar(value) {
    const text = String(value ?? "");
    if (!text) return '""';
    if (/[\n\r\t"]/.test(text) || /[:#\[\]{}&,*?]/.test(text) || /^[\s-]/.test(text) || /\s$/.test(text)) {
      return JSON.stringify(text);
    }
    return text;
  }

  function appendYamlStringSetting(lines, pad, key, value) {
    const text = String(value ?? "");
    if (text.includes("\n")) {
      lines.push(`${pad}${key}: |`);
      for (const line of text.split("\n")) {
        lines.push(`${pad}  ${line}`);
      }
      return;
    }
    lines.push(`${pad}${key}: ${formatYamlScalar(text)}`);
  }

  function extractConfigHeaderComment(content) {
    const lines = String(content || "").replace(/^\uFEFF/, "").split(/\r?\n/);
    const comments = [];
    for (const line of lines) {
      if (!line.trim()) break;
      if (line.trim().startsWith("#")) comments.push(line);
      else break;
    }
    return comments.join("\n");
  }

  function stripSectionFromConfigText(content, sectionKey) {
    const text = String(content || "").replace(/^\uFEFF/, "");
    const lines = text.split(/\r?\n/);
    const result = [];
    let skipping = false;
    let sectionIndent = 0;
    const sectionPattern = new RegExp(`^${sectionKey}:\\s*(?:.*)?$`);

    for (const line of lines) {
      if (!skipping && sectionPattern.test(line.trim())) {
        const valuePart = line.trim().slice(sectionKey.length + 1).trim();
        if (!valuePart || valuePart === '""' || valuePart === "''") {
          skipping = false;
          continue;
        }
        skipping = true;
        sectionIndent = line.match(/^(\s*)/)[1].length;
        continue;
      }
      if (skipping) {
        if (!line.trim()) continue;
        const indent = line.match(/^(\s*)/)[1].length;
        if (indent <= sectionIndent) {
          skipping = false;
          result.push(line);
        }
        continue;
      }
      result.push(line);
    }

    return result.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  }

  function stripAllConfigSections(content) {
    let text = String(content || "");
    for (const key of NODE_CONFIG_SECTION_KEYS) {
      text = stripSectionFromConfigText(text, key);
    }
    return text;
  }

  function extractSectionYamlText(content, sectionKey) {
    const lines = String(content || "").replace(/^\uFEFF/, "").split(/\r?\n/);
    const sectionLines = [];
    let capturing = false;
    let sectionIndent = 0;
    const sectionPattern = new RegExp(`^${sectionKey}:\\s*$`);

    for (const line of lines) {
      if (!capturing && sectionPattern.test(line.trim())) {
        capturing = true;
        sectionIndent = line.match(/^(\s*)/)[1].length;
        sectionLines.push(line);
        continue;
      }
      if (!capturing) continue;
      if (!line.trim()) {
        sectionLines.push(line);
        continue;
      }
      const indent = line.match(/^(\s*)/)[1].length;
      if (indent <= sectionIndent) break;
      sectionLines.push(line);
    }

    return sectionLines.join("\n").trim();
  }

  function settingsObjectToEntries(settingsObj) {
    if (!settingsObj || typeof settingsObj !== "object" || Array.isArray(settingsObj)) return [];
    const entries = [];
    for (const [key, value] of Object.entries(settingsObj)) {
      if (!key || NODE_CONFIG_SECTION_KEYS.includes(key)) continue;
      if (value === null) entries.push({ key, kind: "null", value: null });
      else if (typeof value === "boolean") entries.push({ key, kind: "bool", value });
      else if (typeof value === "number") entries.push({ key, kind: "number", value });
      else if (Array.isArray(value)) entries.push({ key, kind: "array", value: [...value] });
      else entries.push({ key, kind: "string", value: String(value ?? "") });
    }
    return entries;
  }

  function coerceSettingBoolean(value) {
    if (typeof value === "boolean") return value;
    const text = String(value ?? "").trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(text)) return true;
    if (["false", "0", "no", "off", ""].includes(text)) return false;
    return Boolean(value);
  }

  function settingsEntriesToObject(entries) {
    const result = {};
    for (const entry of entries || []) {
      if (!entry?.key || NODE_CONFIG_SECTION_KEYS.includes(entry.key)) continue;
      if (entry.kind === "null") result[entry.key] = null;
      else if (entry.kind === "bool") result[entry.key] = coerceSettingBoolean(entry.value);
      else if (entry.kind === "number") result[entry.key] = Number(entry.value) || 0;
      else if (entry.kind === "array") result[entry.key] = Array.isArray(entry.value) ? [...entry.value] : [];
      else result[entry.key] = String(entry.value ?? "");
    }
    return result;
  }

  function stringifyIndentedPropsYaml(obj, indent = 2) {
    const entries = settingsObjectToEntries(obj);
    const pad = " ".repeat(indent);
    const lines = [];
    for (const entry of entries) {
      if (!entry.key) continue;
      if (entry.kind === "array") {
        const items = Array.isArray(entry.value) ? entry.value : [];
        if (!items.length) lines.push(`${pad}${entry.key}: []`);
        else if (items.length === 1) lines.push(`${pad}${entry.key}: ${formatYamlScalar(items[0])}`);
        else {
          lines.push(`${pad}${entry.key}:`);
          for (const item of items) lines.push(`${pad}  - ${formatYamlScalar(item)}`);
        }
        continue;
      }
      if (entry.kind === "bool") {
        lines.push(`${pad}${entry.key}: ${entry.value ? "true" : "false"}`);
        continue;
      }
      if (entry.kind === "number") {
        lines.push(`${pad}${entry.key}: ${entry.value}`);
        continue;
      }
      if (entry.kind === "null") {
        lines.push(`${pad}${entry.key}: null`);
        continue;
      }
      appendYamlStringSetting(lines, pad, entry.key, entry.value ?? "");
    }
    return lines.join("\n");
  }

  function stringifyAwnUiYaml(awnUi) {
    if (!awnUi || typeof awnUi !== "object") return "";
    const body = stringifyIndentedPropsYaml(awnUi, 2);
    if (!body.trim()) return "";
    return `awn_ui:\n${body}`;
  }

  function stringifyAwnSettingsYaml(awnSettings) {
    if (!awnSettings || typeof awnSettings !== "object") return "";
    const body = stringifyIndentedPropsYaml(awnSettings, 2);
    if (!body.trim()) return "";
    return `awn_settings:\n${body}`;
  }

  function migrateLegacyRootKeys(parsed) {
    const awnUi = { ...(parsed.awn_ui && typeof parsed.awn_ui === "object" ? parsed.awn_ui : {}) };
    const awnSettings = {
      ...(parsed.awn_settings && typeof parsed.awn_settings === "object" && !Array.isArray(parsed.awn_settings)
        ? parsed.awn_settings
        : {})
    };

    for (const [key, value] of Object.entries(parsed)) {
      if (NODE_CONFIG_SECTION_KEYS.includes(key)) continue;
      if (NODE_CONFIG_LEGACY_UI_KEYS.has(key)) {
        if (awnUi[key] === undefined) awnUi[key] = value;
        continue;
      }
      if (typeof value === "object" && value !== null && !Array.isArray(value)) continue;
      if (awnSettings[key] === undefined) awnSettings[key] = value;
    }

    return { awnUi, awnSettings };
  }

  function parseNodeConfigBundle(content) {
    const text = String(content || "").replace(/^\uFEFF/, "");
    const headerComment = extractConfigHeaderComment(text);
    const parsed = parseTypeYaml(stripAllConfigSections(text)) || {};
    const sectionParsed = parseTypeYaml(text) || {};

    let awnSchemaRaw = sectionParsed.awn_schema;
    if (typeof awnSchemaRaw === "string" && !awnSchemaRaw.trim()) {
      awnSchemaRaw = null;
    }
    if (!awnSchemaRaw || typeof awnSchemaRaw !== "object") {
      const schemaYaml = extractSectionYamlText(text, "awn_schema");
      awnSchemaRaw = schemaYaml ? parseTypeYaml(schemaYaml)?.awn_schema : null;
    }

    const { awnUi, awnSettings } = migrateLegacyRootKeys({
      ...parsed,
      awn_ui: sectionParsed.awn_ui,
      awn_settings: sectionParsed.awn_settings
    });

    return {
      headerComment,
      awn_schema: awnSchemaRaw && typeof awnSchemaRaw === "object" ? awnSchemaRaw : null,
      awn_ui: awnUi,
      awn_settings: awnSettings
    };
  }

  function composeNodeConfigBundle(bundle) {
    const parts = [];
    if (bundle?.headerComment) parts.push(bundle.headerComment);

    const awnUiYaml = stringifyAwnUiYaml(bundle?.awn_ui);
    if (awnUiYaml) parts.push(awnUiYaml);

    const awnSettingsYaml = stringifyAwnSettingsYaml(bundle?.awn_settings);
    if (awnSettingsYaml) parts.push(awnSettingsYaml);

    const schemaYaml =
      typeof bundle?.awn_schemaYaml === "string" && bundle.awn_schemaYaml.trim()
        ? bundle.awn_schemaYaml.trim()
        : "";

    if (schemaYaml) parts.push(schemaYaml);

    if (!parts.length) return "";
    return `${parts.join("\n\n")}\n`;
  }

  function extractDefaultLandingModeFromNodeConfig(content) {
    const bundle = parseNodeConfigBundle(content);
    const mode = bundle.awn_ui?.default_landing_mode;
    return mode ? String(mode).trim() || null : null;
  }

  function applyAwnUiToConfig(content, awnUiPatch) {
    const bundle = parseNodeConfigBundle(content);
    const nextUi = { ...bundle.awn_ui };
    if (awnUiPatch && typeof awnUiPatch === "object") {
      for (const [key, value] of Object.entries(awnUiPatch)) {
        if (value === undefined || value === null || value === "") delete nextUi[key];
        else nextUi[key] = value;
      }
    }
    bundle.awn_ui = nextUi;
    bundle.awn_schemaYaml = extractSectionYamlText(content, "awn_schema");
    bundle.awn_schema = null;
    return composeNodeConfigBundle(bundle);
  }

  function applyAwnSettingsToConfig(content, entries) {
    const bundle = parseNodeConfigBundle(content);
    bundle.awn_settings = settingsEntriesToObject(entries);
    bundle.awn_schemaYaml = extractSectionYamlText(content, "awn_schema");
    bundle.awn_schema = null;
    return composeNodeConfigBundle(bundle);
  }

  global.NodeConfigBundle = {
    NODE_CONFIG_SECTION_KEYS,
    NODE_CONFIG_RESERVED_ROOT_KEYS,
    extractConfigHeaderComment,
    stripSectionFromConfigText,
    extractSectionYamlText,
    settingsObjectToEntries,
    settingsEntriesToObject,
    parseNodeConfigBundle,
    composeNodeConfigBundle,
    extractDefaultLandingModeFromNodeConfig,
    applyAwnUiToConfig,
    applyAwnSettingsToConfig
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
