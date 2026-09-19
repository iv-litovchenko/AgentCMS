const fs = require("fs/promises");
const path = require("path");

const AGENT_CMS_DIR = ".agent-cms";
const REGISTRY_FILE = "nav-flags-registry.json";
const MODEL = "nav-flags-registry-v1";

function normalizeRelPath(relPath) {
  return String(relPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
}

function registryAbsolute(agentRoot) {
  return path.join(agentRoot, AGENT_CMS_DIR, REGISTRY_FILE);
}

function emptyRegistry() {
  return {
    model: MODEL,
    builtAt: null,
    rebuildMs: null,
    focus: [],
    main: []
  };
}

function createNavFlagsRegistryService(deps) {
  const {
    getAgentRoot,
    resolveAgent,
    collectAgentFocusEntries,
    collectAgentMainEntries,
    buildNavFlagEntry,
    isNavFocusActive,
    isNavMainActive
  } = deps;

  async function readRegistry(agentRoot) {
    if (!agentRoot) return null;
    try {
      const raw = await fs.readFile(registryAbsolute(agentRoot), "utf-8");
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.model !== MODEL) return null;
      return {
        ...emptyRegistry(),
        ...parsed,
        focus: Array.isArray(parsed.focus) ? parsed.focus : [],
        main: Array.isArray(parsed.main) ? parsed.main : []
      };
    } catch {
      return null;
    }
  }

  async function writeRegistry(agentRoot, payload) {
    await fs.mkdir(path.join(agentRoot, AGENT_CMS_DIR), { recursive: true });
    await fs.writeFile(registryAbsolute(agentRoot), `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
  }

  function upsertEntry(list, entry) {
    const nodePath = normalizeRelPath(entry?.nodePath);
    if (!nodePath) return list;
    const next = Array.isArray(list) ? [...list] : [];
    const index = next.findIndex((item) => normalizeRelPath(item?.nodePath) === nodePath);
    const row = { ...entry, nodePath };
    if (index >= 0) next[index] = row;
    else next.push(row);
    return next;
  }

  function removeEntry(list, nodePath) {
    const normalized = normalizeRelPath(nodePath);
    return (Array.isArray(list) ? list : []).filter((item) => normalizeRelPath(item?.nodePath) !== normalized);
  }

  async function rebuild({ agentRoot, agentId } = {}) {
    const started = Date.now();
    let root = agentRoot || null;
    let agent = null;

    if (!root && agentId) {
      agent = resolveAgent(agentId);
      root = agent?.rootAbsolute || null;
    }
    if (!root) {
      root = getAgentRoot();
      agent = resolveAgent(agentId) || null;
    }
    if (!root) throw new Error("Agent workspace root is not available");

    if (!agent && typeof resolveAgent === "function") {
      for (const entry of deps.getAgentsPublicList?.() || []) {
        const candidate = resolveAgent(entry.id);
        if (candidate?.rootAbsolute === root) {
          agent = candidate;
          break;
        }
      }
    }
    if (!agent) {
      agent = {
        id: agentId || path.basename(root),
        rootAbsolute: root,
        folderExists: true,
        name: path.basename(root),
        path: "",
        active: true
      };
    }

    const payload = {
      model: MODEL,
      builtAt: new Date().toISOString(),
      rebuildMs: 0,
      focus: collectAgentFocusEntries(agent),
      main: collectAgentMainEntries(agent)
    };
    payload.rebuildMs = Date.now() - started;
    await writeRegistry(root, payload);
    return {
      ready: true,
      ...payload,
      focusCount: payload.focus.length,
      mainCount: payload.main.length
    };
  }

  async function syncFromFrontmatter(agentRoot, nodeRelPath, frontmatterYaml) {
    const root = agentRoot || getAgentRoot();
    const nodePath = normalizeRelPath(nodeRelPath);
    if (!root || !nodePath) return null;

    const registry = (await readRegistry(root)) || emptyRegistry();
    const entry = buildNavFlagEntry(nodePath, frontmatterYaml);
    registry.focus = isNavFocusActive(frontmatterYaml)
      ? upsertEntry(registry.focus, entry)
      : removeEntry(registry.focus, nodePath);
    registry.main = isNavMainActive(frontmatterYaml)
      ? upsertEntry(registry.main, entry)
      : removeEntry(registry.main, nodePath);
    registry.model = MODEL;
    registry.builtAt = registry.builtAt || new Date().toISOString();
    registry.syncedAt = new Date().toISOString();
    await writeRegistry(root, registry);
    return registry;
  }

  async function getStatus({ agentRoot, agentId } = {}) {
    let root = agentRoot || null;
    if (!root && agentId) {
      const agent = resolveAgent(agentId);
      root = agent?.rootAbsolute || null;
    }
    if (!root) root = getAgentRoot();
    if (!root) return { ready: false, reason: "Agent workspace root is not available" };

    const registry = await readRegistry(root);
    if (!registry) {
      return {
        ready: false,
        reason: "Реестр не построен — нажмите «Пересобрать реестр»",
        focusCount: 0,
        mainCount: 0
      };
    }

    return {
      ready: true,
      model: registry.model,
      builtAt: registry.builtAt,
      syncedAt: registry.syncedAt || null,
      rebuildMs: registry.rebuildMs ?? null,
      focusCount: registry.focus.length,
      mainCount: registry.main.length
    };
  }

  async function getAgentEntries(agent, kind) {
    if (!agent?.rootAbsolute || agent.folderExists === false) return null;
    const registry = await readRegistry(agent.rootAbsolute);
    if (!registry) return null;
    return kind === "main" ? registry.main : registry.focus;
  }

  return {
    readRegistry,
    rebuild,
    syncFromFrontmatter,
    getStatus,
    getAgentEntries
  };
}

module.exports = {
  createNavFlagsRegistryService,
  REGISTRY_FILE,
  AGENT_CMS_DIR,
  MODEL
};
