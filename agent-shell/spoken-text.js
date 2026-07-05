const SHOW_BLOCK_RE = /\[show\]([\s\S]*?)\[\/show\]/gi;
const TTS_BLOCK_RE = /\[tts\]([\s\S]*?)\[\/tts\]/i;

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
  if (!raw) return { body: "", spoken: null, parsed: false };

  const spokenMatch = raw.match(TTS_BLOCK_RE);
  const spoken = spokenMatch ? spokenMatch[1].trim() : null;

  const closedText = raw.match(/\[text\]([\s\S]*?)\[\/text\]/i);
  if (closedText) {
    return { body: closedText[1].trim(), spoken, parsed: true };
  }

  const openText = raw.match(/\[text\]\s*([\s\S]*)/i);
  if (openText) {
    const body = openText[1].replace(/\[\/text\]\s*$/i, "").trim();
    return { body, spoken, parsed: true };
  }

  if (spokenMatch) {
    const afterTts = raw.slice(raw.indexOf(spokenMatch[0]) + spokenMatch[0].length).trim();
    return { body: afterTts, spoken, parsed: true };
  }

  if (/\[tts\]/i.test(raw)) {
    return { body: "", spoken: null, parsed: true };
  }

  return { body: raw, spoken: null, parsed: false };
}

function extractStreamingReplyBody(partialText) {
  const raw = String(partialText || "");
  if (/\[text\]/i.test(raw)) {
    return parseDualReply(raw).body || "";
  }
  const closeTts = raw.match(/\[\/tts\]\s*/i);
  if (closeTts && closeTts.index !== undefined) {
    return raw.slice(closeTts.index + closeTts[0].length).trim();
  }
  if (/\[tts\]/i.test(raw)) return "";
  return raw.trim();
}

function finalizeDualReply(rawText, settings = {}) {
  const parsed = parseDualReply(rawText);
  if (parsed.parsed) {
    return {
      body: parsed.body || rawText.trim(),
      spoken: parsed.spoken || ruleBasedSpeechText(parsed.body, settings)
    };
  }
  const body = parsed.body;
  return {
    body,
    spoken: shouldRequestDualReply(settings) ? ruleBasedSpeechText(body, settings) : null
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
  parseDualReply,
  extractStreamingReplyBody,
  finalizeDualReply,
  isInternalTtsPrepSession
};
