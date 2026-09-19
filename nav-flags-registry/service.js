const fs = require("fs/promises");
const path = require("path");

const AGENT_CMS_DIR = ".agent-cms";
const REGISTRY_DIR = ".agent-cms/nav-registry";
const FOCUS_REGISTRY_FILE = "focus.json";
const MAIN_REGISTRY_FILE = "main.json";
const LEGACY_COMBINED_REGISTRY_FILE = "nav-flags-registry.json";
const LEGACY_FOCUS_REGISTRY_FILE = "nav-focus-registry.json";
const LEGACY_MAIN_REGISTRY_FILE = "nav-main-registry.json";
const FOCUS_MODEL = "nav-focus-registry-v1";
const MAIN_MODEL = "nav-main-registry-v1";

function normalizeRelPath(relPath) {
  return String(relPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
}

function registryDirAbsolute(agentRoot) {
  return path.join(agentRoot, REGISTRY_DIR);
}

function registryAbsolute(agentRoot, kind) {
  const fileName = kind === "main" ? MAIN_REGISTRY_FILE : FOCUS_REGISTRY_FILE;
  return path.join(registryDirAbsolute(agentRoot), fileName);
}

function emptyRegistry(kind) {
  return {
    model: kind === "main" ? MAIN_MODEL : FOCUS_MODEL,
    builtAt: null,
    rebuildMs: null,
    syncedAt: null,
    items: []
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

  async function readRegistryFile(agentRoot, kind) {
    if (!agentRoot) return null;
    const model = kind === "main" ? MAIN_MODEL : FOCUS_MODEL;
    try {
      const raw = await fs.readFile(registryAbsolute(agentRoot, kind), "utf-8");
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.model !== model) return null;
      return {
        ...emptyRegistry(kind),
        ...parsed,
        items: Array.isArray(parsed.items) ? parsed.items : []
      };
    } catch {
      return null;
    }
  }

  async function readJsonFileSafe(fileAbsolute) {
    try {
      const raw = await fs.readFile(fileAbsolute, "utf-8");
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async function readLegacySplitRegistry(agentRoot, kind) {
    const fileName = kind === "main" ? LEGACY_MAIN_REGISTRY_FILE : LEGACY_FOCUS_REGISTRY_FILE;
    const parsed = await readJsonFileSafe(path.join(agentRoot, AGENT_CMS_DIR, fileName));
    if (!parsed) return null;
    const model = kind === "main" ? MAIN_MODEL : FOCUS_MODEL;
    if (parsed.model !== model) return null;
    return {
      items: Array.isArray(parsed.items) ? parsed.items : [],
      builtAt: parsed.builtAt || null,
      rebuildMs: parsed.rebuildMs ?? null,
      syncedAt: parsed.syncedAt || null
    };
  }

  async function readLegacyRegistry(agentRoot) {
    const combined = await readJsonFileSafe(
      path.join(agentRoot, AGENT_CMS_DIR, LEGACY_COMBINED_REGISTRY_FILE)
    );
    if (combined?.model === "nav-flags-registry-v1") {
      return {
        focus: Array.isArray(combined.focus) ? combined.focus : [],
        main: Array.isArray(combined.main) ? combined.main : [],
        builtAt: combined.builtAt || null,
        rebuildMs: combined.rebuildMs ?? null,
        syncedAt: combined.syncedAt || null
      };
    }

    const focus = await readLegacySplitRegistry(agentRoot, "focus");
    const main = await readLegacySplitRegistry(agentRoot, "main");
    if (!focus && !main) return null;
    return {
      focus: focus?.items || [],
      main: main?.items || [],
      builtAt: focus?.builtAt || main?.builtAt || null,
      rebuildMs: focus?.rebuildMs ?? main?.rebuildMs ?? null,
      syncedAt: focus?.syncedAt || main?.syncedAt || null
    };
  }

  async function readRegistry(agentRoot) {
    const focus = await readRegistryFile(agentRoot, "focus");
    const main = await readRegistryFile(agentRoot, "main");
    if (focus || main) {
      return {
        focus: focus?.items || [],
        main: main?.items || [],
        builtAt: focus?.builtAt || main?.builtAt || null,
        rebuildMs: focus?.rebuildMs ?? main?.rebuildMs ?? null,
        syncedAt: focus?.syncedAt || main?.syncedAt || null
      };
    }

    const legacy = await readLegacyRegistry(agentRoot);
    if (!legacy) return null;
    return legacy;
  }

  async function writeRegistryFile(agentRoot, kind, payload) {
    await fs.mkdir(registryDirAbsolute(agentRoot), { recursive: true });
    await fs.writeFile(registryAbsolute(agentRoot, kind), `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
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

    const builtAt = new Date().toISOString();
    const rebuildMs = Date.now() - started;
    const focusItems = collectAgentFocusEntries(agent);
    const mainItems = collectAgentMainEntries(agent);

    await Promise.all([
      writeRegistryFile(root, "focus", {
        model: FOCUS_MODEL,
        builtAt,
        rebuildMs,
        items: focusItems
      }),
      writeRegistryFile(root, "main", {
        model: MAIN_MODEL,
        builtAt,
        rebuildMs,
        items: mainItems
      })
    ]);

    return {
      ready: true,
      builtAt,
      rebuildMs,
      focus: focusItems,
      main: mainItems,
      focusCount: focusItems.length,
      mainCount: mainItems.length
    };
  }

  async function syncRegistryKind(agentRoot, kind, nodeRelPath, frontmatterYaml) {
    const nodePath = normalizeRelPath(nodeRelPath);
    if (!nodePath) return null;

    const isActive = kind === "main" ? isNavMainActive(frontmatterYaml) : isNavFocusActive(frontmatterYaml);
    const registry = (await readRegistryFile(agentRoot, kind)) || emptyRegistry(kind);
    const entry = buildNavFlagEntry(nodePath, frontmatterYaml);
    registry.items = isActive ? upsertEntry(registry.items, entry) : removeEntry(registry.items, nodePath);
    registry.syncedAt = new Date().toISOString();
    if (!registry.builtAt) registry.builtAt = registry.syncedAt;
    await writeRegistryFile(agentRoot, kind, registry);
    return registry;
  }

  async function syncFromFrontmatter(agentRoot, nodeRelPath, frontmatterYaml) {
    const root = agentRoot || getAgentRoot();
    if (!root) return null;

    const [focus, main] = await Promise.all([
      syncRegistryKind(root, "focus", nodeRelPath, frontmatterYaml),
      syncRegistryKind(root, "main", nodeRelPath, frontmatterYaml)
    ]);

    return {
      focus: focus?.items || [],
      main: main?.items || [],
      syncedAt: focus?.syncedAt || main?.syncedAt || null
    };
  }

  async function getStatus({ agentRoot, agentId } = {}) {
    let root = agentRoot || null;
    if (!root && agentId) {
      const agent = resolveAgent(agentId);
      root = agent?.rootAbsolute || null;
    }
    if (!root) root = getAgentRoot();
    if (!root) return { ready: false, reason: "Agent workspace root is not available" };

    const focusRegistry = await readRegistryFile(root, "focus");
    const mainRegistry = await readRegistryFile(root, "main");
    const legacy = !focusRegistry && !mainRegistry ? await readLegacyRegistry(root) : null;

    if (!focusRegistry && !mainRegistry && !legacy) {
      return {
        ready: false,
        reason: "Реестр не построен — нажмите «Пересобрать реестр»",
        focusCount: 0,
        mainCount: 0
      };
    }

    const focusCount = focusRegistry?.items?.length ?? legacy?.focus?.length ?? 0;
    const mainCount = mainRegistry?.items?.length ?? legacy?.main?.length ?? 0;

    return {
      ready: true,
      focusModel: FOCUS_MODEL,
      mainModel: MAIN_MODEL,
      registryDir: REGISTRY_DIR,
      focusFile: `${REGISTRY_DIR}/${FOCUS_REGISTRY_FILE}`,
      mainFile: `${REGISTRY_DIR}/${MAIN_REGISTRY_FILE}`,
      builtAt: focusRegistry?.builtAt || mainRegistry?.builtAt || legacy?.builtAt || null,
      syncedAt: focusRegistry?.syncedAt || mainRegistry?.syncedAt || legacy?.syncedAt || null,
      rebuildMs: focusRegistry?.rebuildMs ?? mainRegistry?.rebuildMs ?? legacy?.rebuildMs ?? null,
      focusCount,
      mainCount,
      legacy: Boolean(legacy && !focusRegistry && !mainRegistry)
    };
  }

  async function getAgentEntries(agent, kind) {
    if (!agent?.rootAbsolute || agent.folderExists === false) return null;

    const registry = await readRegistryFile(agent.rootAbsolute, kind);
    if (registry) return registry.items;

    const legacy = await readLegacyRegistry(agent.rootAbsolute);
    if (!legacy) return null;
    return kind === "main" ? legacy.main : legacy.focus;
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
  REGISTRY_DIR,
  FOCUS_REGISTRY_FILE,
  MAIN_REGISTRY_FILE,
  AGENT_CMS_DIR,
  FOCUS_MODEL,
  MAIN_MODEL
};
