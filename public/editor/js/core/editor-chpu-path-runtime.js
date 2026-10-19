/**
 * CHPU / legacy path rewrites (refactor 14 — slice from main.js).
 * Sync: lib/config/chpu-topic-canonical.js
 */
(function initEditorChpuPathRuntime(global) {
const PLATFORM_AGENT_ID = "platform";
/** REFACTOR-9 — legacy ws id в закладках CHPU */
const LEGACY_CHPU_WORKSPACE_AGENT_IDS = {
  "agent-cms-core": "0-ws-core",
  "agent-cms-test": "0-ws-test"
};

function canonicalChpuWorkspaceId(workspaceId) {
  const id = String(workspaceId || "").trim();
  return LEGACY_CHPU_WORKSPACE_AGENT_IDS[id] || id;
}

/** @deprecated REFACTOR-10 — use canonicalChpuWorkspaceId */
function canonicalChpuWorkspaceAgentId(agentId) {
  return canonicalChpuWorkspaceId(agentId);
}

function isPlatformAgentId(agentId) {
  return String(agentId || "").trim() === PLATFORM_AGENT_ID;
}

function isPlatformAgent(agent) {
  return agent?.virtual === true || isPlatformAgentId(agent?.id);
}
const SHARED_THEME_LEGACY_SLUG_TO_CANON = {
  inbox: "0-inbox",
  notes: "0-notes",
  references: "0-references",
  artefacts: "0-artefacts",
  scripts: "0-scripts",
  media: "0-media",
  downloads: "0-downloads",
  context: "0-context"
};

/** Sync CHPU path → canonical 0-* (same rules as lib/config/chpu-topic-canonical.js). */
const AGENT_KIT_TOPIC_LEGACY_SLUG_TO_CANON = {
  agent: "0-agent",
  "a0-agent": "0-agent",
  user: "0-user",
  "a0-user": "0-user",
  users: "0-users",
  "a0-users": "0-users",
  devices: "0-devices",
  "a0-devices": "0-devices",
  taxonomies: "0-taxonomies",
  "a0-taxonomies": "0-taxonomies",
  catalog: "0-taxonomies",
  "agent-rules": "0-agent-rules",
  "a0-agent-rules": "0-agent-rules",
  "agent.rules": "0-agent-rules",
  "agent-voice-tts": "0-agent-voice-tts",
  "a0-agent-voice-tts": "0-agent-voice-tts",
  "agent.voice.tts": "0-agent-voice-tts",
  "agent-voice-stt": "0-agent-voice-stt",
  "a0-agent-voice-stt": "0-agent-voice-stt",
  "agent.voice.stt": "0-agent-voice-stt"
};

function rewriteLegacyTopicPathsInRelPathClient(relPath) {
  let p = String(relPath || "")
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "");
  if (!p) return p;

  p = p.replace(/^awn-container\b/i, "awn-topics");

  const rootRewrites = [
    ["awn-topics/shared", "awn-topics/0-shared"],
    ["awn-shared", "awn-topics/0-shared"],
    ["awn-topics/agent-kit", "awn-topics/0-agent-kit"],
    ["awn-topics/a0-agent-kit", "awn-topics/0-agent-kit"],
    ["awn-agent-kit", "awn-topics/0-agent-kit"],
    ["agent-kit", "awn-topics/0-agent-kit"]
  ];
  for (const [from, to] of rootRewrites) {
    const fromLower = from.toLowerCase();
    if (p.toLowerCase() === fromLower) {
      p = to;
      break;
    }
    const prefix = `${from}/`;
    if (p.toLowerCase().startsWith(prefix.toLowerCase())) {
      p = `${to}/${p.slice(prefix.length)}`;
      break;
    }
  }

  const kitPrefix = "awn-topics/0-agent-kit/";
  if (p.toLowerCase().startsWith(kitPrefix.toLowerCase())) {
    const rest = p.slice(kitPrefix.length);
    const slashIdx = rest.indexOf("/");
    const seg = slashIdx === -1 ? rest : rest.slice(0, slashIdx);
    const canon = AGENT_KIT_TOPIC_LEGACY_SLUG_TO_CANON[seg.toLowerCase()] || seg;
    p = `${kitPrefix}${canon}${slashIdx === -1 ? "" : rest.slice(slashIdx)}`;
  }

  const sharedPrefix = "awn-topics/0-shared/";
  if (p.toLowerCase().startsWith(sharedPrefix.toLowerCase())) {
    const rest = p.slice(sharedPrefix.length);
    const slashIdx = rest.indexOf("/");
    const seg = slashIdx === -1 ? rest : rest.slice(0, slashIdx);
    const canon = SHARED_THEME_LEGACY_SLUG_TO_CANON[seg.toLowerCase()] || seg;
    p = `${sharedPrefix}${canon}${slashIdx === -1 ? "" : rest.slice(slashIdx)}`;
  }

  p = p.replace(/^awn-data\b/i, "awn-databases");
  return p;
}

  global.PLATFORM_AGENT_ID = PLATFORM_AGENT_ID;
  global.LEGACY_CHPU_WORKSPACE_AGENT_IDS = LEGACY_CHPU_WORKSPACE_AGENT_IDS;
  global.canonicalChpuWorkspaceId = canonicalChpuWorkspaceId;
  global.canonicalChpuWorkspaceAgentId = canonicalChpuWorkspaceAgentId;
  global.isPlatformAgentId = isPlatformAgentId;
  global.isPlatformAgent = isPlatformAgent;
  global.SHARED_THEME_LEGACY_SLUG_TO_CANON = SHARED_THEME_LEGACY_SLUG_TO_CANON;
  global.AGENT_KIT_TOPIC_LEGACY_SLUG_TO_CANON = AGENT_KIT_TOPIC_LEGACY_SLUG_TO_CANON;
  global.rewriteLegacyTopicPathsInRelPathClient = rewriteLegacyTopicPathsInRelPathClient;
})(typeof globalThis !== "undefined" ? globalThis : window);
