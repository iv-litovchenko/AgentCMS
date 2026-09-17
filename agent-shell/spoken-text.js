const {
  hasVoiceEndDelimiter,
  splitVoiceEndReply,
  extractStreamingVoiceSpeech,
  extractStreamingVoiceDisplay,
  VOICE_END_MARKER,
  stripHtmlComments
} = require("./voice-end-format");

const SHOW_BLOCK_RE = /\[show\]([\s\S]*?)\[\/show\]/gi;
const LEGACY_TTS_BLOCK_RE = /\[tts\][\s\S]*?\[\/tts\]/gi;
const LEGACY_TEXT_BLOCK_RE = /\[text\]([\s\S]*?)\[\/text\]/gi;

function stripLegacyReplyTags(text) {
  let value = String(text || "");
  value = value.replace(LEGACY_TTS_BLOCK_RE, "");
  value = value.replace(LEGACY_TEXT_BLOCK_RE, (_, inner) => inner);
  value = value.replace(/^\s*\[text\]\s*/i, "").replace(/\[\/text\]\s*$/i, "");
  return stripHtmlComments(value);
}

function stripAllTtsBlocks(text) {
  return stripLegacyReplyTags(text);
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
  let text = stripLegacyReplyTags(String(body || "").replace(SHOW_BLOCK_RE, "").trim());
  if (!text) text = "";
  let speech = stripInlineMarkdown(text === "—" ? "" : text);
  if (settings.ttsIncludeCaptions !== false) {
    for (const caption of parseShowCaptions(body)) {
      speech = speech ? `${speech} ${caption}` : caption;
    }
  }
  if (settings.ttsStripEmoji === true) {
    speech = speech.replace(/\p{Extended_Pictographic}/gu, " ").replace(/\s+/g, " ").trim();
  }
  return speech.trim();
}

function shouldRequestDualReply(_settings = {}) {
  return false;
}

function buildDualReplyInstruction(userText, settings = {}) {
  const text = String(userText || "").trim();
  if (!shouldRequestDualReply(settings)) return text;
  const prompt = String(settings.ttsPrompt || "").trim();
  let suffix = "";
  if (!/\[tts-break\]|voice-end/i.test(prompt)) {
    suffix =
      `\n\nФормат ответа (строго, в таком порядке):\n1) Текст для озвучки (plain text, без markdown, только то, что можно произнести вслух; длина не ограничена).\n2) Отдельной строкой маркер: ${VOICE_END_MARKER}\n3) Полный текст ответа для экрана.\n\nБез маркера ${VOICE_END_MARKER} — только экран, без озвучки.`;
  }
  return `${text}

---
${prompt}${suffix}`;
}

function parseDualReply(text) {
  const raw = String(text || "").trim();
  if (!raw) return { body: "", spoken: null, spokenParts: [], parsed: false };

  const voiceSplit = splitVoiceEndReply(raw);
  if (voiceSplit) {
    const spokenParts = (voiceSplit.spokenParts || []).map((part) => stripHtmlComments(part)).filter(Boolean);
    return {
      body: stripLegacyReplyTags(voiceSplit.body || ""),
      spoken: stripHtmlComments(voiceSplit.spoken || "") || null,
      spokenParts,
      parsed: true
    };
  }

  return { body: stripLegacyReplyTags(raw), spoken: null, spokenParts: [], parsed: false };
}

function extractStreamingReplyBody(partialText) {
  const raw = String(partialText || "");
  const display = extractStreamingVoiceDisplay(raw);
  if (display || hasVoiceEndDelimiter(raw)) {
    return stripLegacyReplyTags(display);
  }
  return stripLegacyReplyTags(raw.trim());
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

const { renderShellVoicePlaceholders } = require("./shell-prompt-placeholders");

function buildSystemPromptContext(settings = {}, context = {}) {
  const agentName = String(context.agentId || context.agent_name || settings.agentId || "agent").trim() || "agent";
  const runtime = String(context.runtime || settings.messageTarget || "qwenpaw").trim() || "qwenpaw";
  const language = String(context.language || settings.sttLang || "ru-RU").trim() || "ru-RU";
  return { agent_name: agentName, runtime, language };
}

function getSystemPrompt(settings = {}, context = {}) {
  const raw = String(settings.systemPrompt || "").trim();
  if (!raw) return "";
  return renderShellVoicePlaceholders(raw, buildSystemPromptContext(settings, context));
}

function buildOpenAiMessages(userText, settings = {}, context = {}) {
  const system = getSystemPrompt(settings, context);
  const user = buildDualReplyInstruction(userText, settings);
  const messages = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content: user });
  return messages;
}

function buildQwenPawChatInput(userText, settings = {}, context = {}) {
  const system = getSystemPrompt(settings, context);
  const user = buildDualReplyInstruction(userText, settings);
  const input = [];
  if (system) {
    input.push({
      role: "system",
      content: [{ type: "text", text: system }]
    });
  }
  input.push({
    role: "user",
    content: [{ type: "text", text: user }]
  });
  return input;
}

function buildCliUserPrompt(userText, settings = {}, context = {}) {
  const system = getSystemPrompt(settings, context);
  const user = buildDualReplyInstruction(userText, settings);
  if (!system) return user;
  return `${system}\n\n---\n\n${user}`;
}

module.exports = {
  ruleBasedSpeechText,
  shouldRequestDualReply,
  buildDualReplyInstruction,
  getSystemPrompt,
  buildOpenAiMessages,
  buildQwenPawChatInput,
  buildCliUserPrompt,
  stripAllTtsBlocks,
  parseDualReply,
  extractStreamingReplyBody,
  finalizeDualReply,
  isInternalTtsPrepSession
};
