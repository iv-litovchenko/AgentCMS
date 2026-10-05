import { loadAgentSelectData } from "/shared/agent-select.js";

let agentsCache = null;
let agentsCachePromise = null;

async function getAgentsList() {
  if (agentsCache) return agentsCache;
  if (!agentsCachePromise) {
    agentsCachePromise = loadAgentSelectData()
      .then((data) => {
        agentsCache = Array.isArray(data?.agents) ? data.agents : [];
        return agentsCache;
      })
      .catch(() => {
        agentsCache = [];
        return agentsCache;
      });
  }
  return agentsCachePromise;
}

function findAgentById(agentId, agents) {
  const id = String(agentId || "").trim();
  if (!id) return null;
  return (agents || []).find((agent) => String(agent?.id || "").trim() === id) || null;
}

function buildWorkspacePreviewThumbUrl(agent) {
  if (!agent?.path) return null;
  const workspacePreview =
    agent.hasPreview === true ||
    String(agent.previewUrl || "").startsWith("/api/agents/workspace-preview");
  if (!workspacePreview) return null;

  const pathPart = String(agent.previewUrl || "").startsWith("/api/agents/workspace-preview")
    ? agent.previewUrl
    : `/api/agents/workspace-preview?path=${encodeURIComponent(agent.path)}`;
  const url = new URL(pathPart, window.location.origin);
  if (agent.id) url.searchParams.set("agent", String(agent.id));
  url.searchParams.set("thumb", "1");
  url.searchParams.set("max", "480");
  url.searchParams.set("t", String(Date.now()));
  return `${url.pathname}${url.search}`;
}

/**
 * @param {HTMLButtonElement | null} avatarBtn
 * @param {HTMLImageElement | null} img
 * @param {string} agentId
 * @param {object | null} [agentHint]
 */
export async function syncShellHeroAgentPreview(avatarBtn, img, agentId, agentHint = null) {
  if (!avatarBtn || !img) return;
  const id = String(agentId || "").trim();
  if (!id) {
    avatarBtn.classList.remove("has-agent-preview");
    img.removeAttribute("src");
    img.hidden = true;
    return;
  }
  const agents = await getAgentsList();
  const agent = agentHint || findAgentById(id, agents);
  const previewUrl = agent ? buildWorkspacePreviewThumbUrl(agent) : null;
  if (!previewUrl) {
    avatarBtn.classList.remove("has-agent-preview");
    img.removeAttribute("src");
    img.hidden = true;
    return;
  }
  await new Promise((resolve) => {
    const onDone = () => {
      img.removeEventListener("load", onDone);
      img.removeEventListener("error", onFail);
      resolve();
    };
    const onFail = () => {
      avatarBtn.classList.remove("has-agent-preview");
      img.hidden = true;
      onDone();
    };
    img.addEventListener("load", () => {
      avatarBtn.classList.add("has-agent-preview");
      img.hidden = false;
      onDone();
    });
    img.addEventListener("error", onFail);
    if (img.getAttribute("src") === previewUrl) {
      if (img.complete && img.naturalWidth > 0) {
        avatarBtn.classList.add("has-agent-preview");
        img.hidden = false;
        resolve();
        return;
      }
    }
    img.hidden = true;
    img.src = previewUrl;
  });
}

export function invalidateShellHeroAgentPreviewCache() {
  agentsCache = null;
  agentsCachePromise = null;
}
