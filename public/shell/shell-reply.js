import {
  hasVoiceEndDelimiter,
  splitVoiceEndReply,
  extractStreamingVoiceSpeech,
  extractStreamingVoiceDisplay,
  stripHtmlComments
} from "@shell/voice-end-format";

export { hasVoiceEndDelimiter, stripHtmlComments };

const SHOW_BLOCK_RE = /\[show\]([\s\S]*?)\[\/show\]/gi;
const VIDEO_EXT_RE = /\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i;
const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|svg|avif|bmp)(\?|#|$)/i;
const YOUTUBE_HOST_RE = /(?:^|\.)((?:youtube\.com|youtu\.be|youtube-nocookie\.com))(?:\/|$)/i;

function extractYouTubeVideoId(src) {
  const raw = String(src || "").trim();
  if (!raw) return "";

  try {
    const url = new URL(raw, "https://www.youtube.com");
    const host = url.hostname.toLowerCase();

    if (host === "youtu.be") {
      return url.pathname.replace(/^\//, "").split("/")[0] || "";
    }

    if (host.includes("youtube.com")) {
      if (url.pathname.startsWith("/embed/")) {
        return url.pathname.split("/")[2] || "";
      }
      if (url.pathname.startsWith("/shorts/")) {
        return url.pathname.split("/")[2] || "";
      }
      return url.searchParams.get("v") || "";
    }
  } catch {
    return "";
  }

  return "";
}

function isYouTubeUrl(src) {
  const raw = String(src || "").trim();
  if (!raw) return false;
  if (extractYouTubeVideoId(raw)) return true;
  return YOUTUBE_HOST_RE.test(raw);
}

function inferShowType(src, declaredType) {
  const type = String(declaredType || "").trim().toLowerCase();
  if (type === "youtube" || type === "embed") return "youtube";
  if (type && !["image", "video"].includes(type)) return type;
  if (isYouTubeUrl(src)) return "youtube";
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
  text = stripHtmlComments(text);

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

const LEGACY_TTS_BLOCK_RE = /\[tts\][\s\S]*?\[\/tts\]/gi;
const LEGACY_TEXT_BLOCK_RE = /\[text\]([\s\S]*?)\[\/text\]/gi;

export function stripAllTtsBlocks(text) {
  return stripLegacyReplyTags(String(text || ""));
}

export function stripLegacyReplyTags(text) {
  let value = String(text || "");
  value = value.replace(LEGACY_TTS_BLOCK_RE, "");
  value = value.replace(LEGACY_TEXT_BLOCK_RE, (_, inner) => inner);
  value = value.replace(/^\s*\[text\]\s*/i, "").replace(/\[\/text\]\s*$/i, "");
  return stripHtmlComments(value);
}

export function cleanReplyTextSegment(text) {
  return stripLegacyReplyTags(text);
}

export function parseDualReply(text) {
  const raw = String(text || "").trim();
  if (!raw) return { body: "", spoken: null, spokenParts: [], parsed: false };

  const voiceSplit = splitVoiceEndReply(raw);
  if (voiceSplit) {
    const spokenParts = (voiceSplit.spokenParts || [])
      .map((part) => stripHtmlComments(part))
      .filter(Boolean);
    return {
      body: stripLegacyReplyTags(voiceSplit.body || ""),
      spoken: stripHtmlComments(voiceSplit.spoken || "") || null,
      spokenParts,
      parsed: true
    };
  }

  return { body: stripLegacyReplyTags(raw), spoken: null, spokenParts: [], parsed: false };
}

export function extractStreamingTtsBody(partialText) {
  return stripHtmlComments(extractStreamingVoiceSpeech(String(partialText || "")));
}

export function extractStreamingReplyBody(partialText) {
  const raw = String(partialText || "");
  const display = extractStreamingVoiceDisplay(raw);
  if (display || hasVoiceEndDelimiter(raw)) {
    return stripLegacyReplyTags(display);
  }
  return stripLegacyReplyTags(raw.trim());
}

export function prepareSpeechText(body, settings = {}) {
  let speech = toSpeechText(body, {
    includeCaptions: settings.ttsIncludeCaptions !== false
  });
  if (settings.ttsStripEmoji === true) {
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

/** Склеивает предложения в более длинные фрагменты — меньше пауз между запросами TTS. */
export function mergeSpeechStreamChunks(sentences, { maxChars = 280, maxParts = 4 } = {}) {
  const merged = [];
  let batch = "";
  let parts = 0;
  for (const raw of sentences) {
    const sentence = String(raw || "").trim();
    if (!sentence) continue;
    const candidate = batch ? `${batch} ${sentence}` : sentence;
    if (batch && (candidate.length > maxChars || parts >= maxParts)) {
      merged.push(batch);
      batch = sentence;
      parts = 1;
    } else {
      batch = candidate;
      parts += 1;
    }
  }
  if (batch) merged.push(batch);
  return merged;
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

    if (mediaType === "youtube") {
      const videoId = extractYouTubeVideoId(mediaSrc);
      if (videoId) {
        const iframe = document.createElement("iframe");
        iframe.className = "shell-show-youtube";
        iframe.src = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}`;
        iframe.title = item.caption || "YouTube video";
        iframe.loading = "lazy";
        iframe.allow =
          "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
        iframe.referrerPolicy = "strict-origin-when-cross-origin";
        iframe.allowFullscreen = true;
        wrap.append(iframe);
      } else {
        const link = document.createElement("a");
        link.className = "shell-show-link";
        link.href = mediaSrc;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = item.caption || mediaSrc;
        wrap.append(link);
      }
    } else if (mediaType === "video") {
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
