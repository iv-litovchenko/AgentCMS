/**
 * Preview: [marker:type] … [/marker] → HTML в renderMarkdownToHtml (CMS).
 * Парсинг согласован с examples/study-markers/parse-marker-blocks.js
 */
(function (global) {
  const MARKER_OPEN_RE = /^\[marker:([a-z0-9-]+)\]\s*$/i;
  const MARKER_CLOSE_RE = /^\[\/marker\]\s*$/i;
  const META_SEP = /^---\s*$/;

  const MARKER_META_FIELD_MAP = {
    "awn-create": "added",
    "awn-update": "updated",
    "awn-status": "status",
    "awn-repeat": "review",
    "awn-review": "review",
    создано: "created",
    добавлено: "added",
    обновлено: "updated",
    повторить: "review",
    статус: "status",
    тема: "topic",
  };

  const MARKER_BLOCK_UI = {
    idea: { icon: "★", label: "Идея", typeClass: "moe-ideya" },
    important: { icon: "!", label: "Важно", typeClass: "moe-vazhno" },
    note: { icon: "✎", label: "Заметка", typeClass: "moe-zametka" },
    todo: { icon: "✓", label: "Задача", typeClass: "moe-todo" },
    question: { icon: "?", label: "Вопрос", typeClass: "moe-vopros" },
    mistake: { icon: "✕", label: "Ошибка", typeClass: "moe-oshibka" },
    term: { icon: "§", label: "Термин", typeClass: "moe-termin" },
    repeat: { icon: "↻", label: "Повторить", typeClass: "moe-povtorit" },
  };

  const CHIP_META_KEYS = new Set(["added", "updated", "status", "review", "created", "topic"]);

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function normalizeMarkerMetaKey(rawKey) {
    const key = String(rawKey || "").trim().toLowerCase();
    if (MARKER_META_FIELD_MAP[key]) return MARKER_META_FIELD_MAP[key];
    return key.replace(/\s+/g, "_");
  }

  function parseMetaLines(lines) {
    const meta = {};
    for (const raw of lines || []) {
      const line = String(raw || "").trim();
      if (!line) continue;
      const kv = line.match(/^([\wа-яё.-]+):\s*(.+)$/i);
      if (!kv) continue;
      meta[normalizeMarkerMetaKey(kv[1])] = kv[2].trim();
    }
    return meta;
  }

  function parseMarkerBlocks(lines) {
    const blocks = [];
    for (let i = 0; i < lines.length; i++) {
      const open = lines[i].trim().match(MARKER_OPEN_RE);
      if (!open) continue;
      const blockSlug = open[1].toLowerCase();
      const metaLines = [];
      const bodyLines = [];
      let mode = "meta";
      let j = i + 1;
      while (j < lines.length) {
        const trimmed = lines[j].trim();
        if (MARKER_CLOSE_RE.test(trimmed)) break;
        if (mode === "meta" && META_SEP.test(trimmed)) {
          mode = "body";
          j++;
          continue;
        }
        if (mode === "meta") metaLines.push(lines[j]);
        else bodyLines.push(lines[j]);
        j++;
      }
      if (j >= lines.length || !MARKER_CLOSE_RE.test(lines[j].trim())) continue;
      const text = bodyLines.join("\n").trim();
      if (!text) continue;
      blocks.push({
        blockSlug,
        meta: parseMetaLines(metaLines),
        text,
        lineStart: i + 1,
        lineEnd: j + 1,
      });
      i = j;
    }
    return blocks;
  }

  function renderMetaChips(meta) {
    if (!meta || typeof meta !== "object") return "";
    const chips = [];
    if (meta.added) {
      chips.push(
        `<span class="md-marker-chip md-marker-chip--added" title="awn-create">+ ${escapeHtml(meta.added)}</span>`
      );
    }
    if (meta.updated) {
      chips.push(
        `<span class="md-marker-chip md-marker-chip--updated" title="awn-update">↻ ${escapeHtml(meta.updated)}</span>`
      );
    }
    if (meta.review) {
      chips.push(
        `<span class="md-marker-chip md-marker-chip--review" title="awn-repeat">⏱ ${escapeHtml(meta.review)}</span>`
      );
    }
    if (meta.status) {
      const slug = String(meta.status).toLowerCase().replace(/\s+/g, "-");
      chips.push(
        `<span class="md-marker-chip md-marker-chip--status md-marker-chip--status-${escapeHtml(slug)}" title="awn-status">${escapeHtml(meta.status)}</span>`
      );
    }
    for (const [key, value] of Object.entries(meta)) {
      if (CHIP_META_KEYS.has(key)) continue;
      const fieldTitle = `Пользовательское поле: ${key}`;
      chips.push(
        `<span class="md-marker-chip md-marker-chip--extra" title="${escapeHtml(fieldTitle)}">` +
        `<span class="md-marker-chip-extra-icon" aria-hidden="true">◇</span>` +
        `${escapeHtml(value)}</span>`
      );
    }
    if (!chips.length) return "";
    return chips.join("");
  }

  function renderMarkerBlockHtml(block, renderMarkdownFragment) {
    const slug = block.blockSlug || "note";
    const ui = MARKER_BLOCK_UI[slug] || { icon: "•", label: slug, typeClass: "moe-zametka" };
    const typeClass = ui.typeClass || "moe-zametka";
    const innerHtml =
      typeof renderMarkdownFragment === "function"
        ? renderMarkdownFragment(block.text)
        : `<p>${escapeHtml(block.text)}</p>`;
    const chips = renderMetaChips(block.meta);
    const syntaxHint = `[marker:${slug}]`;
    const inlineMeta = chips
      ? `<span class="md-marker-block-inline-meta">${chips}</span>`
      : "";
    return (
      `<div class="md-marker-block md-marker-block--${escapeHtml(slug)}" data-marker-type="${escapeHtml(slug)}">` +
      `<div class="md-marker-block-title">` +
      `<span class="md-marker-block-icon type-icon type-${escapeHtml(typeClass)}" aria-hidden="true">${escapeHtml(ui.icon)}</span>` +
      `<span class="md-marker-block-label" title="${escapeHtml(syntaxHint)}">${escapeHtml(ui.label)}</span>` +
      inlineMeta +
      `</div>` +
      `<div class="md-marker-block-body">${innerHtml}</div>` +
      `</div>`
    );
  }

  function convertMarkerBlocksForPreview(markdown, renderMarkdownFragment) {
    const text = String(markdown ?? "");
    if (!text.includes("[marker:")) return text;
    const lines = text.split("\n");
    const blocks = parseMarkerBlocks(lines);
    if (!blocks.length) return text;

    const out = [];
    for (let i = 0; i < lines.length; i++) {
      const block = blocks.find((b) => b.lineStart - 1 === i);
      if (block) {
        if (out.length && out[out.length - 1] !== "") out.push("");
        out.push(renderMarkerBlockHtml(block, renderMarkdownFragment));
        out.push("");
        i = block.lineEnd;
        continue;
      }
      const inside = blocks.some((b) => i > b.lineStart - 1 && i <= b.lineEnd - 1);
      if (inside) continue;
      out.push(lines[i]);
    }
    return out.join("\n");
  }

  global.convertMarkerBlocksForPreview = convertMarkerBlocksForPreview;
  global.MarkerBlocksPreview = {
    convertMarkerBlocksForPreview,
    parseMarkerBlocks,
    MARKER_BLOCK_UI,
  };
})(typeof window !== "undefined" ? window : globalThis);
