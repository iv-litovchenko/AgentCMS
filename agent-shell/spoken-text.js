const SHOW_BLOCK_RE = /\[show\]([\s\S]*?)\[\/show\]/gi;
const TTS_BLOCK_RE = /\[tts\]([\s\S]*?)\[\/tts\]/gi;

function extractAllTtsBlocks(text) {
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

function stripAllTtsBlocks(text) {
  return String(text || "")
    .replace(TTS_BLOCK_RE, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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

function parseShowCaptions(body) {
  const captions = [];
  String(body || "").replace(SHOW_BLOCK_RE, (_, blockBody) => {
    for (const line of String(blockBody || "").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const sep = trimmed.indexOf(":");
      if (sep <= 0) continue;
      const key = trimmed.slice(0, sep).trim().toLowerCase();
      const value = trimmed.slice(sep + 1).trim();
      if ((key === "caption" || key === "title" || key === "alt") && value) captions.push(value);
    }
    return "";
  });
  return captions;
}

function ruleBasedSpeechText(body, settings = {}) {
  let text = String(body || "").replace(SHOW_BLOCK_RE, "").trim();
  if (!text) text = "";
  let speech = stripInlineMarkdown(text === "—" ? "" : text);
  if (settings.ttsIncludeCaptions !== false) {
    for (const caption of parseShowCaptions(body)) {
      speech = speech ? `${speech} ${caption}` : caption;
    }
  }
  if (settings.ttsStripEmoji !== false) {
    speech = speech.replace(/\p{Extended_Pictographic}/gu, " ").replace(/\s+/g, " ").trim();
  }
  return speech.trim();
}

function shouldRequestDualReply(settings = {}) {
  return settings.ttsEnabled !== false && Boolean(String(settings.ttsPrompt || "").trim());
}

function buildDualReplyInstruction(userText, settings = {}) {
  const text = String(userText || "").trim();
  if (!shouldRequestDualReply(settings)) return text;
  const prompt = String(settings.ttsPrompt || "").trim();
  let suffix = "";
  if (!/\[tts\]/i.test(prompt)) {
    suffix =
      "\n\nФормат ответа (строго, в таком порядке):\n[tts]\n…кратко для озвучки…\n[/tts]\n\nДалее — полный текст ответа для экрана.";
  }
  return `${text}

---
${prompt}${suffix}`;
}

function parseDualReply(text) {
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

function extractStreamingReplyBody(partialText) {
  const raw = String(partialText || "");
  if (/\[text\]/i.test(raw)) {
    return parseDualReply(raw).body || "";
  }
  let visible = stripAllTtsBlocks(raw);
  const openMatch = raw.match(/\[tts\](?![\s\S]*\[\/tts\])/i);
  if (openMatch && openMatch.index !== undefined) {
    const prefix = raw.slice(0, openMatch.index);
    visible = stripAllTtsBlocks(prefix);
  }
  return visible.trim();
}

function finalizeDualReply(rawText, settings = {}) {
  const parsed = parseDualReply(rawText);
  if (parsed.parsed) {
    const spokenParts = parsed.spokenParts?.length
      ? parsed.spokenParts
      : parsed.spoken
        ? [parsed.spoken]
        : [];
    const spoken =
      spokenParts.join("\n\n") || ruleBasedSpeechText(parsed.body, settings) || null;
    return {
      body: parsed.body || rawText.trim(),
      spoken,
      spokenParts: spokenParts.length ? spokenParts : spoken ? [spoken] : []
    };
  }
  const body = parsed.body;
  const spoken = shouldRequestDualReply(settings) ? ruleBasedSpeechText(body, settings) : null;
  return {
    body,
    spoken,
    spokenParts: spoken ? [spoken] : []
  };
}

function isInternalTtsPrepSession(sessionId) {
  const value = String(sessionId || "").trim();
  return value.includes("-tts-prep-") || value.startsWith("__shell-tts-prep-");
}

module.exports = {
  ruleBasedSpeechText,
  shouldRequestDualReply,
  buildDualReplyInstruction,
  extractAllTtsBlocks,
  stripAllTtsBlocks,
  parseDualReply,
  extractStreamingReplyBody,
  finalizeDualReply,
  isInternalTtsPrepSession
};
