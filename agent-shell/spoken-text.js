const SHOW_BLOCK_RE = /\[show\]([\s\S]*?)\[\/show\]/gi;

function findFirstTtsBlock(text) {
  const source = String(text || "");
  const leading = source.match(/^\s*/)?.[0]?.length || 0;
  const openMatch = /\[tts\]/i.exec(source.slice(leading));
  if (!openMatch || openMatch.index !== 0) return null;

  const openStart = leading;
  const contentStart = openStart + openMatch[0].length;
  const afterOpen = source.slice(contentStart);
  const closeMatch = /\[\/tts\]/i.exec(afterOpen);
  if (!closeMatch || closeMatch.index === undefined) return null;

  return {
    content: String(afterOpen.slice(0, closeMatch.index)).trim(),
    start: openStart,
    end: contentStart + closeMatch.index + closeMatch[0].length
  };
}

function extractAllTtsBlocks(text) {
  const block = findFirstTtsBlock(text);
  if (!block?.content) return [];
  return [block.content];
}

function stripAllTtsBlocks(text) {
  const block = findFirstTtsBlock(text);
  const source = String(text || "");
  if (!block) return source.replace(/\n{3,}/g, "\n\n").trim();
  return (source.slice(0, block.start) + source.slice(block.end)).replace(/\n{3,}/g, "\n\n").trim();
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
      "\n\nФормат ответа (строго, в таком порядке):\n[tts]\n…кратко для озвучки…\n[/tts]\n\nДалее — полный текст ответа для экрана.\n\nПо умолчанию — без озвучки, если нет блока [tts].";
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

  if (/^\s*\[tts\]/i.test(raw) && !findFirstTtsBlock(raw)) {
    return { body: "", spoken: null, spokenParts: [], parsed: true };
  }

  return { body: raw, spoken: null, spokenParts: [], parsed: false };
}

function extractStreamingReplyBody(partialText) {
  const raw = String(partialText || "");
  if (/\[text\]/i.test(raw)) {
    return parseDualReply(raw).body || "";
  }
  const block = findFirstTtsBlock(raw);
  if (block) {
    return (raw.slice(0, block.start) + raw.slice(block.end)).trim();
  }
  const firstOpen = /^\s*\[tts\]/i.exec(raw);
  if (firstOpen) {
    return raw.slice(0, firstOpen.index).trim();
  }
  return raw.trim();
}

function finalizeDualReply(rawText, settings = {}) {
  const parsed = parseDualReply(rawText);
  if (parsed.parsed) {
    const spokenParts = parsed.spokenParts?.length ? parsed.spokenParts : [];
    const spoken = spokenParts.length ? spokenParts.join("\n\n") : null;
    return {
      body: parsed.body || rawText.trim(),
      spoken,
      spokenParts
    };
  }
  const body = parsed.body;
  const spoken = shouldRequestDualReply(settings) ? null : ruleBasedSpeechText(body, settings) || null;
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
