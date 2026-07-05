const { chatWithQwenPaw, createQwenPawChat } = require("./qwenpaw-client");

const STT_REFINE_TIMEOUT_MS = 90000;
const STT_CHAT_NAME = "Shell STT";

const ensuredSttChats = new Set();

function shouldRefineStt(settings) {
  return Boolean(String(settings?.sttPrompt || "").trim());
}

function buildSttSessionId(settings, agentId) {
  const configured = String(settings?.qwenpawSttSessionId || "").trim();
  if (configured) return configured;
  return `shell-stt-${String(agentId || "default")}`;
}

function buildSttRefineMessage(sttPrompt, rawText) {
  return `${String(sttPrompt || "").trim()}

Расшифровка речи (сырой текст STT):
"""
${String(rawText || "").trim()}
"""

Верни только готовый текст для отправки агенту — без пояснений, кавычек и markdown.`;
}

function stripRefinedReply(text) {
  let value = String(text || "").trim();
  if (!value) return value;
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("«") && value.endsWith("»")) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }
  return value;
}

async function ensureSttChat(settings, agentId) {
  const sessionId = buildSttSessionId(settings, agentId);
  const cacheKey = `${settings.qwenpawAgentId || "default"}:${sessionId}`;
  if (ensuredSttChats.has(cacheKey)) return sessionId;

  try {
    await createQwenPawChat({
      baseUrl: settings.qwenpawBaseUrl,
      agentId: settings.qwenpawAgentId,
      sessionId,
      userId: settings.qwenpawUserId,
      channel: "console",
      name: String(settings.qwenpawSttChatName || STT_CHAT_NAME).trim() || STT_CHAT_NAME
    });
  } catch {
    // Первое сообщение тоже может зарегистрировать чат.
  }

  ensuredSttChats.add(cacheKey);
  return sessionId;
}

async function refineSttTranscript({ settings, agentId, rawText, signal } = {}) {
  const text = String(rawText || "").trim();
  if (!text || !shouldRefineStt(settings)) {
    return { raw: text, refined: text, applied: false };
  }

  const sessionId = await ensureSttChat(settings, agentId);
  const reply = await chatWithQwenPaw({
    baseUrl: settings.qwenpawBaseUrl,
    agentId: settings.qwenpawAgentId,
    sessionId,
    userId: settings.qwenpawUserId,
    text: buildSttRefineMessage(settings.sttPrompt, text),
    signal,
    timeoutMs: STT_REFINE_TIMEOUT_MS
  });

  const refined = stripRefinedReply(reply.text) || text;
  return {
    raw: text,
    refined,
    applied: refined !== text,
    sessionId
  };
}

module.exports = {
  STT_CHAT_NAME,
  shouldRefineStt,
  buildSttSessionId,
  buildSttRefineMessage,
  ensureSttChat,
  refineSttTranscript
};
