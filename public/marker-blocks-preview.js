/**
 * Preview: ```awn-marker-<type> … ``` → HTML в renderMarkdownToHtml (CMS).
 * Legacy: [marker:type] … [/marker] (вне обычных fenced blocks).
 */
(function (global) {
  const MARKER_OPEN_RE = /^\[marker:([a-z0-9-]+)\]\s*$/i;
  const MARKER_CLOSE_RE = /^\[\/marker\]\s*$/i;
  const AWN_MARKER_FENCE_OPEN_RE = /^(\s{0,3})(`{3,}|~{3,})awn-marker-([a-z0-9-]+)\s*$/i;
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

  function findAllFenceRegions(lines) {
    const regions = [];
    let open = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const m = line.match(/^(\s{0,3})(`{3,}|~{3,})(.*)$/);
      if (!m) continue;
      const marker = m[2];
      const ch = marker[0];
      const len = marker.length;
      const after = m[3].trim();

      if (!open) {
        open = { start: i, ch, len };
        continue;
      }

      const isClose = after === "" && ch === open.ch && len >= open.len;
      if (isClose) {
        regions.push({ start: open.start, end: i });
        open = null;
      }
    }

    return regions;
  }

  function isEnclosedByOtherFence(openIdx, closeIdx, regions, selfStart) {
    return regions.some(
      (r) => r.start < openIdx && r.end >= closeIdx && r.start !== selfStart
    );
  }

  function buildFencedLineMask(lines) {
    const inside = new Array(lines.length).fill(false);
    let fence = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const m = line.match(/^(\s*)(`{3,}|~{3,})(.*)$/);
      if (!m) {
        if (fence) inside[i] = true;
        continue;
      }
      const marker = m[2];
      const ch = marker[0];
      const len = marker.length;
      const after = m[3].trim();

      if (!fence) {
        fence = { ch, len, openLine: i };
        inside[i] = true;
        continue;
      }

      const isClose = after === "" && ch === fence.ch && len >= fence.len;
      if (isClose) {
        inside[i] = true;
        fence = null;
        continue;
      }

      inside[i] = true;
    }

    if (fence) {
      for (let i = fence.openLine + 1; i < lines.length; i++) inside[i] = true;
    }

    return inside;
  }

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

  function parseInnerMetaBody(lines) {
    const metaLines = [];
    const bodyLines = [];
    let mode = "meta";
    for (const raw of lines || []) {
      const trimmed = String(raw || "").trim();
      if (mode === "meta" && META_SEP.test(trimmed)) {
        mode = "body";
        continue;
      }
      if (mode === "meta") metaLines.push(raw);
      else bodyLines.push(raw);
    }
    return { meta: parseMetaLines(metaLines), text: bodyLines.join("\n").trim() };
  }

  function parseAwnMarkerFenceBlocks(lines) {
    const blocks = [];
    const regions = findAllFenceRegions(lines);
    for (let i = 0; i < lines.length; i++) {
      const openM = lines[i].match(AWN_MARKER_FENCE_OPEN_RE);
      if (!openM) continue;
      const openChar = openM[2][0];
      const openLen = openM[2].length;
      const blockSlug = openM[3].toLowerCase();
      let j = i + 1;
      while (j < lines.length) {
        const closeM = lines[j].match(/^(\s{0,3})(`{3,}|~{3,})\s*$/);
        if (closeM && closeM[2][0] === openChar && closeM[2].length >= openLen) break;
        j++;
      }
      if (j >= lines.length) continue;
      if (isEnclosedByOtherFence(i, j, regions, i)) continue;
      const { meta, text } = parseInnerMetaBody(lines.slice(i + 1, j));
      if (!text) continue;
      blocks.push({
        blockSlug,
        meta,
        text,
        lineStart: i + 1,
        lineEnd: j + 1,
        syntax: "fence",
      });
      i = j;
    }
    return blocks;
  }

  function parseLegacyBracketMarkerBlocks(lines) {
    const blocks = [];
    const fenced = buildFencedLineMask(lines);
    for (let i = 0; i < lines.length; i++) {
      if (fenced[i]) continue;
      const open = lines[i].trim().match(MARKER_OPEN_RE);
      if (!open) continue;
      const blockSlug = open[1].toLowerCase();
      const metaLines = [];
      const bodyLines = [];
      let mode = "meta";
      let j = i + 1;
      while (j < lines.length) {
        if (fenced[j]) break;
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
        syntax: "bracket",
      });
      i = j;
    }
    return blocks;
  }

  function parseMarkerBlocks(lines) {
    const fenceBlocks = parseAwnMarkerFenceBlocks(lines);
    const legacyBlocks = parseLegacyBracketMarkerBlocks(lines);
    return [...fenceBlocks, ...legacyBlocks].sort((a, b) => a.lineStart - b.lineStart);
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

  function markerSyntaxHint(slug, syntax) {
    if (syntax === "bracket") return `[marker:${slug}]`;
    return `\`\`\`awn-marker-${slug}`;
  }

  function formatMarkerCounter(index, total) {
    const n = Math.max(1, Number(total) || 1);
    const i = Math.min(Math.max(1, Number(index) || 1), n);
    const pad = n >= 100 ? 3 : 2;
    const fmt = (v) => String(v).padStart(pad, "0");
    return `${fmt(i)} / ${fmt(n)}`;
  }

  function renderMarkerBlockHtml(block, renderMarkdownFragment, counter) {
    const slug = block.blockSlug || "note";
    const ui = MARKER_BLOCK_UI[slug] || { icon: "•", label: slug, typeClass: "moe-zametka" };
    const typeClass = ui.typeClass || "moe-zametka";
    const innerHtml =
      typeof renderMarkdownFragment === "function"
        ? renderMarkdownFragment(block.text)
        : `<p>${escapeHtml(block.text)}</p>`;
    const chips = renderMetaChips(block.meta);
    const syntaxHint = markerSyntaxHint(slug, block.syntax);
    const index = counter?.index ?? 1;
    const total = counter?.total ?? 1;
    const counterLabel = formatMarkerCounter(index, total);
    const inlineMeta = chips ? `<span class="md-marker-block-inline-meta">${chips}</span>` : "";
    const counterHtml =
      `<span class="md-marker-block-counter markdown-preview-image-counter" aria-label="Маркер ${index} из ${total}">` +
      `${escapeHtml(counterLabel)}</span>`;
    const titleAside =
      `<span class="md-marker-block-title-aside">${inlineMeta}${counterHtml}</span>`;
    return (
      `<div class="md-marker-block md-marker-block--${escapeHtml(slug)}" data-marker-type="${escapeHtml(slug)}" data-marker-index="${index}" data-marker-total="${total}">` +
      `<div class="md-marker-block-title">` +
      `<span class="md-marker-block-icon type-icon type-${escapeHtml(typeClass)}" aria-hidden="true">${escapeHtml(ui.icon)}</span>` +
      `<span class="md-marker-block-label" title="${escapeHtml(syntaxHint)}">${escapeHtml(ui.label)}</span>` +
      titleAside +
      `</div>` +
      `<div class="md-marker-block-body">${innerHtml}</div>` +
      `</div>`
    );
  }

  function shouldConvertMarkers(text) {
    return text.includes("awn-marker-") || text.includes("[marker:");
  }

  function convertMarkerBlocksForPreview(markdown, renderMarkdownFragment) {
    const text = String(markdown ?? "");
    if (!shouldConvertMarkers(text)) return text;
    const lines = text.split("\n");
    const blocks = parseMarkerBlocks(lines);
    if (!blocks.length) return text;

    const total = blocks.length;
    let markerIndex = 0;
    const out = [];
    for (let i = 0; i < lines.length; i++) {
      const block = blocks.find((b) => b.lineStart - 1 === i);
      if (block) {
        markerIndex += 1;
        if (out.length && out[out.length - 1] !== "") out.push("");
        out.push(
          renderMarkerBlockHtml(block, renderMarkdownFragment, { index: markerIndex, total })
        );
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
    parseAwnMarkerFenceBlocks,
    buildFencedLineMask,
    MARKER_BLOCK_UI,
    shouldConvertMarkers,
  };
})(typeof window !== "undefined" ? window : globalThis);
