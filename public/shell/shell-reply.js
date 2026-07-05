const SHOW_BLOCK_RE = /\[show\]([\s\S]*?)\[\/show\]/gi;
const VIDEO_EXT_RE = /\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i;
const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|svg|avif|bmp)(\?|#|$)/i;

function inferShowType(src, declaredType) {
  const type = String(declaredType || "").trim().toLowerCase();
  if (type && type !== "image") return type;
  const lower = String(src || "").toLowerCase();
  if (VIDEO_EXT_RE.test(lower)) return "video";
  if (IMAGE_EXT_RE.test(lower)) return "image";
  return type || "image";
}

function parseShowBlockBody(blockBody) {
  const fields = {};
  for (const line of String(blockBody || "").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const sep = trimmed.indexOf(":");
    if (sep <= 0) continue;
    const key = trimmed.slice(0, sep).trim().toLowerCase();
    const value = trimmed.slice(sep + 1).trim();
    if (key && value) fields[key] = value;
  }

  const src = fields.src || fields.url || fields.image || fields.href || fields.video || "";
  const caption = fields.caption || fields.title || fields.alt || "";
  if (!src) return null;
  const type = inferShowType(src, fields.type);
  return { type, src, caption };
}

export function parseShellReply(body) {
  const raw = String(body || "");
  const shows = [];

  raw.replace(SHOW_BLOCK_RE, (_, blockBody) => {
    const item = parseShowBlockBody(blockBody);
    if (item) shows.push(item);
    return "";
  });

  let text = raw.replace(SHOW_BLOCK_RE, "").trim();

  if (!text && shows.length) text = "—";
  return { text: text || "—", shows };
}

function stripInlineMarkdown(text) {
  return String(text || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function resolveShowSrc(src, agentId) {
  const raw = String(src || "").trim();
  if (!raw) return "";

  if (/^https?:\/\//i.test(raw)) return raw;

  if (raw.startsWith("/")) {
    const url = new URL(raw, window.location.origin);
    if (agentId && url.pathname.startsWith("/api/") && !url.searchParams.has("agent")) {
      url.searchParams.set("agent", agentId);
    }
    return `${url.pathname}${url.search}${url.hash}`;
  }

  return raw;
}

export function toSpeechText(body, options = {}) {
  const { includeCaptions = true } = options;
  const { text, shows } = parseShellReply(body);
  let speech = stripInlineMarkdown(text === "—" ? "" : text);
  if (includeCaptions) {
    for (const item of shows) {
      if (item.caption) {
        speech = speech ? `${speech} ${item.caption}` : item.caption;
      }
    }
  }
  return speech.trim();
}

export function extractAllTtsBlocks(text) {
  const blocks = [];
  const source = String(text || "");
  const re = /\[tts\]([\s\S]*?)\[\/tts\]/gi;
  let match = re.exec(source);
  while (match) {
    const chunk = String(match[1] || "").trim();
    if (chunk) blocks.push(chunk);
    match = re.exec(source);
  }
  return blocks;
}

export function stripAllTtsBlocks(text) {
  return String(text || "")
    .replace(/\[tts\][\s\S]*?\[\/tts\]/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function parseDualReply(text) {
  const raw = String(text || "").trim();
  if (!raw) return { body: "", spoken: null, spokenParts: [], parsed: false };

  const spokenParts = extractAllTtsBlocks(raw);
  const spoken = spokenParts.length ? spokenParts.join("\n\n") : null;

  const closedText = raw.match(/\[text\]([\s\S]*?)\[\/text\]/i);
  if (closedText) {
    return { body: closedText[1].trim(), spoken, spokenParts, parsed: true };
  }

  const openText = raw.match(/\[text\]\s*([\s\S]*)/i);
  if (openText) {
    const body = openText[1].replace(/\[\/text\]\s*$/i, "").trim();
    return { body, spoken, spokenParts, parsed: true };
  }

  if (spokenParts.length) {
    return { body: stripAllTtsBlocks(raw), spoken, spokenParts, parsed: true };
  }

  if (/\[tts\]/i.test(raw)) {
    return { body: "", spoken: null, spokenParts: [], parsed: true };
  }

  return { body: raw, spoken: null, spokenParts: [], parsed: false };
}

export function extractStreamingTtsBody(partialText) {
  const raw = String(partialText || "");
  const openMatch = raw.match(/\[tts\]\s*/i);
  if (!openMatch || openMatch.index === undefined) return "";
  const afterOpen = raw.slice(openMatch.index + openMatch[0].length);
  const closeMatch = afterOpen.match(/\[\/tts\]/i);
  if (closeMatch && closeMatch.index !== undefined) {
    return afterOpen.slice(0, closeMatch.index).trim();
  }
  return afterOpen.replace(/\n*\[text\][\s\S]*$/i, "").trim();
}

export function extractStreamingReplyBody(partialText) {
  const raw = String(partialText || "");
  if (/\[text\]/i.test(raw)) {
    return parseDualReply(raw).body || "";
  }
  let visible = stripAllTtsBlocks(raw);
  const openMatch = raw.match(/\[tts\](?![\s\S]*\[\/tts\])/i);
  if (openMatch && openMatch.index !== undefined) {
    visible = stripAllTtsBlocks(raw.slice(0, openMatch.index));
  }
  return visible.trim();
}

export function prepareSpeechText(body, settings = {}) {
  let speech = toSpeechText(body, {
    includeCaptions: settings.ttsIncludeCaptions !== false
  });
  if (settings.ttsStripEmoji !== false) {
    speech = speech.replace(/\p{Extended_Pictographic}/gu, " ").replace(/\s+/g, " ").trim();
  }
  return speech;
}

const SENTENCE_END_RE = /[.!?…](?:\s+|$)|\n+/;

export function pullSpeechSentences(speechText, fromIndex = 0) {
  const sentences = [];
  let cursor = Math.max(0, Number(fromIndex) || 0);
  const source = String(speechText || "");

  while (cursor < source.length) {
    const tail = source.slice(cursor);
    const match = tail.match(SENTENCE_END_RE);
    if (!match || match.index === undefined) break;
    const end = cursor + match.index + match[0].length;
    const chunk = source.slice(cursor, end).trim();
    cursor = end;
    if (chunk) sentences.push(chunk);
  }

  return { sentences, cursor };
}

export function renderShellReplyMedia(containerEl, shows, agentId) {
  if (!containerEl) return;
  containerEl.innerHTML = "";
  const items = Array.isArray(shows) ? shows.filter((item) => item?.src) : [];
  containerEl.classList.toggle("hidden", !items.length);
  if (!items.length) return;

  for (const item of items) {
    const wrap = document.createElement("figure");
    wrap.className = "shell-show-item";
    const mediaType = inferShowType(item.src, item.type);
    const mediaSrc = resolveShowSrc(item.src, agentId);

    if (mediaType === "video") {
      const video = document.createElement("video");
      video.className = "shell-show-video";
      video.controls = true;
      video.playsInline = true;
      video.preload = "metadata";
      video.src = mediaSrc;
      if (item.caption) {
        video.setAttribute("aria-label", item.caption);
        video.title = item.caption;
      }
      wrap.append(video);
    } else if (mediaType === "image") {
      const img = document.createElement("img");
      img.className = "shell-show-image";
      img.loading = "lazy";
      img.decoding = "async";
      img.alt = item.caption || "Изображение от агента";
      img.src = mediaSrc;
      img.addEventListener("click", () => {
        window.open(img.src, "_blank", "noopener,noreferrer");
      });
      wrap.append(img);
    } else {
      const link = document.createElement("a");
      link.className = "shell-show-link";
      link.href = mediaSrc;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = item.caption || item.src;
      wrap.append(link);
    }

    if (item.caption) {
      const cap = document.createElement("figcaption");
      cap.className = "shell-show-caption";
      cap.textContent = item.caption;
      wrap.append(cap);
    }

    containerEl.append(wrap);
  }
}
