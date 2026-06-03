const sidebarWidthDecreaseBtn = document.getElementById("sidebar-width-decrease-btn");
const sidebarWidthIncreaseBtn = document.getElementById("sidebar-width-increase-btn");
const menuNode = document.getElementById("menu");
const menuLoadingNode = document.getElementById("menu-loading");
const menuLoadingTextNode = document.getElementById("menu-loading-text");
const appRootNode = document.getElementById("app-root");
const appSplashNode = document.getElementById("app-splash");
const APP_SPLASH_MIN_MS = 420;
const APP_SPLASH_HIDE_MS = 460;
const homePaneNode = document.getElementById("home-pane");
const homeHintNode = document.getElementById("home-hint");
const menuSearchInputNode = document.getElementById("menu-search-input");
const contentSearchInputNode = document.getElementById("content-search-input");
const contentSearchScopeNode = document.getElementById("content-search-scope");
const contentSearchResultsNode = document.getElementById("content-search-results");
const menuCardsFilterWrapNode = document.getElementById("menu-cards-filter-wrap");
const menuCardsPreviewOnlyNode = document.getElementById("menu-cards-preview-only");
const menuViewTreeBtn = document.getElementById("menu-view-tree-btn");
const menuViewFlatBtn = document.getElementById("menu-view-flat-btn");
const menuViewBookmarksBtn = document.getElementById("menu-view-bookmarks-btn");
const menuViewCardsBtn = document.getElementById("menu-view-cards-btn");
const menuRefreshBtn = document.getElementById("menu-refresh-btn");
const menuCollapseAllBtn = document.getElementById("menu-collapse-all-btn");
const menuSettingsBtn = document.getElementById("menu-settings-btn");
const menuSettingsPopoverNode = document.getElementById("menu-settings-popover");
const menuTreeShowEmptyFoldersNode = document.getElementById("menu-tree-show-empty-folders");
const menuTreePadSortIndexesNode = document.getElementById("menu-tree-pad-sort-indexes");
const agentViewDashboardBtn = document.getElementById("agent-view-dashboard-btn");
const agentViewMapBtn = document.getElementById("agent-view-map-btn");
const agentViewMap2Btn = document.getElementById("agent-view-map2-btn");
const agentViewRegistryBtn = document.getElementById("agent-view-registry-btn");
const agentViewSchemaBtn = document.getElementById("agent-view-schema-btn");
const agentViewVaultBtn = document.getElementById("agent-view-vault-btn");
const agentViewGraphBtn = document.getElementById("agent-view-graph-btn");
const agentDashboardStatsNode = document.getElementById("agent-dashboard-stats");
const agentMapPaneNode = document.getElementById("agent-map-pane");
const agentMapStageNode = document.getElementById("agent-map-stage");
const agentMapLinksNode = document.getElementById("agent-map-links");
const agentMapZonesNode = document.getElementById("agent-map-zones");
const agentMapHubNode = document.getElementById("agent-map-hub");
const agentMapHubAvatarNode = document.getElementById("agent-map-hub-avatar");
const agentMapHubTitleNode = document.getElementById("agent-map-hub-title");
const agentMapHubSubNode = document.getElementById("agent-map-hub-sub");
const agentMap2PaneNode = document.getElementById("agent-map2-pane");
const agentMap2StatsNode = document.getElementById("agent-map2-stats");
const agentMap2ViewportNode = document.getElementById("agent-map2-viewport");
const agentMap2CanvasNode = document.getElementById("agent-map2-canvas");
const agentMap2LinksNode = document.getElementById("agent-map2-links");
const agentMap2NodesNode = document.getElementById("agent-map2-nodes");
const agentSchemaPaneNode = document.getElementById("agent-schema-pane");
const agentSchemaContentNode = document.getElementById("agent-schema-content");
const agentVaultPaneNode = document.getElementById("agent-vault-pane");
const agentVaultSearchNode = document.getElementById("agent-vault-search");
const agentVaultGridNode = document.getElementById("agent-vault-grid");
const agentVaultEmptyNode = document.getElementById("agent-vault-empty");
const agentVaultStatsNode = document.getElementById("agent-vault-stats");
const agentGraphPaneNode = document.getElementById("agent-graph-pane");
const agentGraphContentNode = document.getElementById("agent-graph-content");
const agentGraphShowPreviewsNode = document.getElementById("agent-graph-show-previews");
const filePathNode = document.getElementById("file-path");
const workspacePathHeaderNode = document.getElementById("workspace-path-header");
const fileContentInputNode = document.getElementById("file-content-input");
const fileContentPreviewNode = document.getElementById("file-content-preview");
const titleEditorBlockNode = document.getElementById("title-editor-block");
const nodeDescriptionHintNode = document.getElementById("node-description-hint");
const titleRowNode = titleEditorBlockNode?.querySelector(".title-row");
const editorViewToggleNode = document.getElementById("editor-view-toggle");
const docActionsNode = document.getElementById("doc-actions");
const workspacePathToolbarNode = document.getElementById("workspace-path-toolbar");
const listViewBlockNode = document.getElementById("list-view-block");
const previewUploadBlockNode = document.getElementById("preview-upload-block");
const previewUploadZoneNode = document.getElementById("preview-upload-zone");
const previewFileInputNode = document.getElementById("preview-file-input");
const previewImageNode = document.getElementById("preview-image");
const previewUploadPlaceholderNode = document.getElementById("preview-upload-placeholder");
const previewUploadActionsNode = document.getElementById("preview-upload-actions");
const previewReplaceBtn = document.getElementById("preview-replace-btn");
const previewRemoveBtn = document.getElementById("preview-remove-btn");
const previewPasteBtn = document.getElementById("preview-paste-btn");
const previewPasteActionsBtn = document.getElementById("preview-paste-actions-btn");
const graphViewBlockNode = document.getElementById("graph-view-block");
const graphViewContentNode = document.getElementById("graph-view-content");
const editorSurfaceNode = document.querySelector(".editor-surface");
const listViewTitleNode = document.getElementById("list-view-title");
const listViewContentNode = document.getElementById("list-view-content");
const nodeOverviewBlockNode = document.getElementById("node-overview-block");
const nodeOverviewContentNode = document.getElementById("node-overview-content");
const externalViewSelectNode = document.getElementById("external-view-select");
const mediaViewSelectNode = document.getElementById("media-view-select");
const mediaUploadInputNode = document.getElementById("media-upload-input");
const mediaUploadBtnNode = document.getElementById("media-upload-btn");
const createExternalMemoryBtn = document.getElementById("create-external-memory-btn");
const createExternalSectionBtn = document.getElementById("create-external-section-btn");
const createSectionModalNode = document.getElementById("create-section-modal");
const createSectionNameInputNode = document.getElementById("create-section-name-input");
const createSectionCancelBtn = document.getElementById("create-section-cancel-btn");
const createSectionOkBtn = document.getElementById("create-section-ok-btn");
const editorViewPreviewBtn = document.getElementById("editor-view-preview-btn");
const editorViewWysiwygBtn = document.getElementById("editor-view-wysiwyg-btn");
const editorViewSourceBtn = document.getElementById("editor-view-source-btn");
const editorWysiwygWrapNode = document.getElementById("editor-wysiwyg-wrap");
const editorLineNumbersBtn = document.getElementById("editor-line-numbers-btn");
const editorCodeWrapNode = document.getElementById("editor-code-wrap");
const editorLineNumbersNode = document.getElementById("editor-line-numbers");
const mediaSidecarBackBtn = document.getElementById("media-sidecar-back-btn");
const externalMemoryBackBtn = document.getElementById("external-memory-back-btn");
const tabularSourceBtn = document.getElementById("tabular-source-btn");
const tabularTableBackBtn = document.getElementById("tabular-table-back-btn");
const titleInputNode = document.getElementById("title-input");
const titleMediaExtNode = document.getElementById("title-media-ext");
const titleFixedValueNode = document.getElementById("title-fixed-value");
const titleFixedTextNode = document.getElementById("title-fixed-text");
const saveContentBtn = document.getElementById("save-content-btn");
const saveSystemFileBtn = document.getElementById("save-system-file-btn");
const yamlPanelNode = document.getElementById("yaml-form-panel");
const yamlPanelLabelNode = document.getElementById("yaml-panel-label");
const propsFormFieldsNode = document.getElementById("props-form-fields");
const propsYamlToggleBtn = document.getElementById("props-yaml-toggle");
const propsAddFieldBtn = document.getElementById("props-add-field-btn");
const propsInputNode = document.getElementById("props-input");
const nodeWorkspaceCloseBtn = document.getElementById("node-workspace-close-btn");
const workspaceRefreshBtn = document.getElementById("workspace-refresh-btn");
const workspaceRevealFolderBtn = document.getElementById("workspace-reveal-folder-btn");
const toastNode = document.getElementById("toast");
const createNodeModalNode = document.getElementById("create-node-modal");
const createNodeModalTitleNode = document.getElementById("create-node-modal-title");
const createNameInputNode = document.getElementById("create-name-input");
const createFolderBtn = document.getElementById("create-folder-btn");
const createManifestBtn = document.getElementById("create-manifest-btn");
const createNodeActionsNode = document.getElementById("create-node-actions");
const createFileBtn = document.getElementById("create-file-btn");
const createNodeCatalogWrapNode = document.getElementById("create-node-catalog-wrap");
const createNodeCatalogActionsNode = document.getElementById("create-node-catalog-actions");
const createNodeStructureLabelNode = document.getElementById("create-node-structure-label");
const createNodeCancelBtn = document.getElementById("create-node-cancel-btn");
const createNodeVaultOptionWrapNode = document.getElementById("create-node-vault-option-wrap");
const createNodeVaultOptionNode = document.getElementById("create-node-vault-option");
const createNodeVaultOptionLabelNode = document.getElementById("create-node-vault-option-label");
const nodeSettingsPathControlsNode = document.getElementById("node-settings-path-controls");
const nodeSettingsModeSelectNode = document.getElementById("node-settings-mode-select");
const nodeNavigationPathControlsNode = document.getElementById("node-navigation-path-controls");
const nodeWorkspaceDomainSelectNode = document.getElementById("node-workspace-domain-select");
const nodeWorkspaceNavControlsNode = document.getElementById("node-workspace-nav-controls");
const nodeDefaultLandingBtn = document.getElementById("node-default-landing-btn");
const nodeMemoryPathControlsNode = document.getElementById("node-memory-path-controls");
const nodeMemoryModeSelectNode = document.getElementById("node-memory-mode-select");
const confirmModalNode = document.getElementById("confirm-modal");
const confirmMessageNode = document.getElementById("confirm-message");
const confirmCancelBtn = document.getElementById("confirm-cancel-btn");
const confirmOkBtn = document.getElementById("confirm-ok-btn");
const agentSelectNode = document.getElementById("agent-select");
const agentsManageBtn = document.getElementById("agents-manage-btn");
const agentPreviewWrapNode = document.getElementById("agent-preview-wrap");
const agentPreviewThumbNode = document.getElementById("agent-preview-thumb");
const appHomeLink = document.getElementById("app-home-link");
const appHomeTitleNode = document.getElementById("app-home-title");
const agentsRegistryModalNode = document.getElementById("agents-registry-modal");
const agentsRegistryListNode = document.getElementById("agents-registry-list");
const agentsRegistryAddBtn = document.getElementById("agents-registry-add-btn");
const agentsRegistryCreateBtn = document.getElementById("agents-registry-create-btn");
const agentsRegistryCreateModalNode = document.getElementById("agents-registry-create-modal");
const agentsRegistryCreatePathInputNode = document.getElementById("agents-registry-create-path-input");
const agentsRegistryCreateCancelBtn = document.getElementById("agents-registry-create-cancel-btn");
const agentsRegistryCreateSubmitBtn = document.getElementById("agents-registry-create-submit-btn");
const agentsRegistryCancelBtn = document.getElementById("agents-registry-cancel-btn");
const agentsRegistrySaveBtn = document.getElementById("agents-registry-save-btn");
const agentsRegistryDiscoverModalNode = document.getElementById("agents-registry-discover-modal");
const agentsRegistryDiscoverListNode = document.getElementById("agents-registry-discover-list");
const agentsRegistryDiscoverCloseBtn = document.getElementById("agents-registry-discover-close-btn");
const agentsRegistryDiscoverScanBtn = document.getElementById("agents-registry-discover-scan-btn");
const mdShowcaseBtn = document.getElementById("md-showcase-btn");
const mdShowcaseModalNode = document.getElementById("md-showcase-modal");
const mdShowcaseCloseBtn = document.getElementById("md-showcase-close-btn");
const mdShowcaseContentNode = document.getElementById("md-showcase-content");
let mdShowcaseCache = null;
const componentsIdeasBtn = document.getElementById("components-ideas-btn");
const componentsIdeasModalNode = document.getElementById("components-ideas-modal");
const componentsIdeasCloseBtn = document.getElementById("components-ideas-close-btn");
const componentsIdeasContentNode = document.getElementById("components-ideas-content");
let componentsIdeasCache = null;
const userDocsBtn = document.getElementById("user-docs-btn");
const userDocsModalNode = document.getElementById("user-docs-modal");
const userDocsCloseBtn = document.getElementById("user-docs-close-btn");
const userDocsContentNode = document.getElementById("user-docs-content");
let userDocsCache = null;
const bestPracticesBtn = document.getElementById("best-practices-btn");
const bestPracticesModalNode = document.getElementById("best-practices-modal");
const bestPracticesCloseBtn = document.getElementById("best-practices-close-btn");
const bestPracticesContentNode = document.getElementById("best-practices-content");
let bestPracticesCache = null;
const apiDocsBtn = document.getElementById("api-docs-btn");
const apiDocsModalNode = document.getElementById("api-docs-modal");
const apiDocsCloseBtn = document.getElementById("api-docs-close-btn");
const apiDocsContentNode = document.getElementById("api-docs-content");
const apiDocsNotesNode = document.getElementById("api-docs-notes");
const apiDocsTitleNode = document.getElementById("api-docs-title");
const apiDocsSubtitleNode = document.getElementById("api-docs-subtitle");
let apiDocsCache = null;
const mcpDocsBtn = document.getElementById("mcp-docs-btn");
const mcpDocsModalNode = document.getElementById("mcp-docs-modal");
const mcpDocsCloseBtn = document.getElementById("mcp-docs-close-btn");
const mcpDocsContentNode = document.getElementById("mcp-docs-content");
const mcpDocsNotesNode = document.getElementById("mcp-docs-notes");
const mcpDocsConfigNode = document.getElementById("mcp-docs-config");
const mcpDocsTitleNode = document.getElementById("mcp-docs-title");
const mcpDocsSubtitleNode = document.getElementById("mcp-docs-subtitle");
let mcpDocsCache = null;

const STORAGE_LEGACY_PREFIX = "yamlcms.";
const STORAGE_PREFIX = "agentcms.";

function migrateLegacyStorageKey(key) {
  if (!key.startsWith(STORAGE_PREFIX)) return;
  const legacyKey = STORAGE_LEGACY_PREFIX + key.slice(STORAGE_PREFIX.length);
  try {
    if (localStorage.getItem(key) !== null) return;
    const legacy = localStorage.getItem(legacyKey);
    if (legacy !== null) {
      localStorage.setItem(key, legacy);
      localStorage.removeItem(legacyKey);
    }
  } catch {
    // ignore quota / private mode
  }
}

function readStorageItem(key) {
  migrateLegacyStorageKey(key);
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

const ACTIVE_AGENT_STORAGE_KEY = "agentcms.activeAgent.v1";
const AGENT_WORKSPACE_VIEW_STORAGE_KEY = "agentcms.agentWorkspaceView.v1";
const AREA_MANIFEST_FILE = "_.x.md";
const LEGACY_AREA_MANIFEST_ALIASES = ["_.node.md", "_Self.node.md", "00_MAIN.node.md", "README.node.md"];
const MANIFEST_MD_RE = /\.(node|x)\.md$/i;
const STORAGE_FOLDER_NAME = "_Storage";
const BUNDLE_CONTENT_FILE = "Content.md";
const BUNDLE_TABULAR_FILE = "Content.csv";
const BUNDLE_CONFIG_FILE = "Config.yml";
const BUNDLE_TODO_FILE = "Todo.md";
const PREVIEW_FILE_BASENAME = "Preview";
const VAULT_FOLDER_DEFAULT = "_Vault";
const SERVICE_FOLDER_DEFAULT = "_System";
let agentsCache = [];
let agentsRegistryDraft = [];
let agentsRegistryPathValidateTimer = null;
let agentsRegistryPathValidateRequestId = 0;

const AGENT_ENVIRONMENT_OPTIONS = [
  { value: "local", label: "Local" },
  { value: "production", label: "Production" }
];

function normalizeAgentEnvironmentDraft(raw) {
  const value = String(raw || "local").trim().toLowerCase();
  return AGENT_ENVIRONMENT_OPTIONS.some((item) => item.value === value) ? value : "local";
}
let activeAgentId = readStorageItem(ACTIVE_AGENT_STORAGE_KEY) || "main";

function nodeStorageKey(agentId, nodePath) {
  const id = agentId || activeAgentId || "main";
  const relPath = nodePath || ".";
  return `${id}:${relPath}`;
}

function normalizeStorageKey(key) {
  if (!key || typeof key !== "string") return key;
  if (key.includes(":")) return key;
  return nodeStorageKey("main", key);
}

function getAgentIdFromUrl() {
  return new URLSearchParams(location.search).get("agent");
}

function syncAgentToUrl(agentId) {
  const url = new URL(location.href);
  if (agentId) {
    url.searchParams.set("agent", agentId);
  } else {
    url.searchParams.delete("agent");
  }
  history.replaceState(null, "", `${url.pathname}${url.search}${location.hash}`);
}

function buildApiUrl(apiPath, params = {}, agentId = activeAgentId) {
  const search = new URLSearchParams({ agent: agentId || activeAgentId || "main" });
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== "") search.set(key, String(value));
  }
  return `${apiPath}?${search.toString()}`;
}

function appendAgentToApiUrl(url, agentId = activeAgentId) {
  if (!url || typeof url !== "string" || !url.startsWith("/api/")) return url;
  const parsed = new URL(url, window.location.origin);
  parsed.searchParams.set("agent", agentId || activeAgentId || "main");
  return `${parsed.pathname}?${parsed.searchParams.toString()}`;
}

function getActiveAgentMeta() {
  return agentsCache.find((agent) => agent.id === activeAgentId) || null;
}

function getAgentTreeTitle(agentId = activeAgentId) {
  return agentsCache.find((agent) => agent.id === agentId)?.name || "Workspaces";
}

function isAgentRootTreeNode(depth, folderPath) {
  return depth === 0 && folderPath === ".";
}

async function loadAgents() {
  const response = await fetch("/api/agents");
  if (!response.ok) throw new Error(`Request failed with ${response.status}`);
  const data = await response.json();
  agentsCache = Array.isArray(data.agents) ? data.agents : [];
  const selectableAgents = getSelectableAgents();
  const urlAgentId = getAgentIdFromUrl();
  if (urlAgentId && selectableAgents.some((agent) => agent.id === urlAgentId)) {
    activeAgentId = urlAgentId;
    localStorage.setItem(ACTIVE_AGENT_STORAGE_KEY, activeAgentId);
  } else if (!selectableAgents.some((agent) => agent.id === activeAgentId)) {
    activeAgentId = data.defaultAgentId || selectableAgents[0]?.id || agentsCache[0]?.id || "main";
    localStorage.setItem(ACTIVE_AGENT_STORAGE_KEY, activeAgentId);
  }
  syncAgentToUrl(activeAgentId);
  renderAgentSelect();
}

function isAreaManifestFileName(fileName) {
  return fileName === AREA_MANIFEST_FILE || LEGACY_AREA_MANIFEST_ALIASES.includes(fileName);
}

function isNodeManifestFileName(fileName) {
  return isAreaManifestFileName(fileName);
}

function isNodeManifestPath(nodePath) {
  const fileName = String(nodePath || "").split("/").filter(Boolean).pop() || "";
  return isAreaManifestFileName(fileName);
}

function isTopicManifestPath(nodePath) {
  const fileName = String(nodePath || "").split("/").filter(Boolean).pop() || "";
  return MANIFEST_MD_RE.test(fileName) && !isAreaManifestFileName(fileName);
}

function isNodeMdPath(nodePath) {
  return isTopicManifestPath(nodePath) || isNodeManifestPath(nodePath);
}

function getFolderPathFromManifest(nodePath) {
  if (!isNodeManifestPath(nodePath)) {
    const parts = String(nodePath || "").split("/").filter(Boolean);
    parts.pop();
    return parts.join("/");
  }
  const parts = String(nodePath || "").split("/").filter(Boolean);
  parts.pop();
  return parts.join("/");
}

function getAgentMeta(agentId = activeAgentId) {
  return agentsCache.find((agent) => agent.id === agentId) || null;
}

function getActiveAgentVaultFolder(agentId = activeAgentId) {
  const agent = getAgentMeta(agentId);
  if (!agent || agent.vaultFolder === null) return null;
  const configured = String(agent.vaultFolder || "").trim();
  return configured || VAULT_FOLDER_DEFAULT;
}

function getActiveAgentServiceFolder(agentId = activeAgentId) {
  const agent = getAgentMeta(agentId);
  if (!agent || agent.serviceFolder === null) return null;
  const configured = String(agent.serviceFolder || "").trim();
  return configured || SERVICE_FOLDER_DEFAULT;
}

function getCreateModalAgentId() {
  return createModalAgentId || activeAgentId;
}

function stripVaultPrefixFromRelPath(relPath) {
  const vaultFolder = getActiveAgentVaultFolder();
  const normalized = String(relPath || "").replace(/\\/g, "/");
  if (!vaultFolder) return normalized;
  const prefix = `${vaultFolder}/`;
  if (normalized === vaultFolder) return "";
  if (normalized.startsWith(prefix)) return normalized.slice(prefix.length);
  return normalized;
}

function stripServicePrefixFromRelPath(relPath) {
  const serviceFolder = getActiveAgentServiceFolder();
  const normalized = String(relPath || "").replace(/\\/g, "/");
  if (!serviceFolder) return normalized;
  const prefix = `${serviceFolder}/`;
  if (normalized === serviceFolder) return "";
  if (normalized.startsWith(prefix)) return normalized.slice(prefix.length);
  return normalized;
}

function stripAgentContentPrefixFromRelPath(relPath) {
  return stripVaultPrefixFromRelPath(stripServicePrefixFromRelPath(relPath));
}

function getServiceRootManifestPath() {
  const serviceFolder = getActiveAgentServiceFolder();
  return serviceFolder ? `${serviceFolder}/${AREA_MANIFEST_FILE}` : null;
}

function isServiceNodePath(nodePath) {
  const serviceFolder = getActiveAgentServiceFolder();
  if (!serviceFolder || !nodePath) return false;
  const normalized = String(nodePath || "").replace(/\\/g, "/");
  return normalized === serviceFolder || normalized.startsWith(`${serviceFolder}/`);
}

function isFilePartNodePath(nodePath) {
  const normalized = String(nodePath || "").replace(/\\/g, "/");
  const base = normalized.split("/").pop() || "";
  if (!MANIFEST_MD_RE.test(base)) return false;
  return !isAreaManifestFileName(base);
}

function isPartNodePath(nodePath) {
  const normalized = String(nodePath || "").replace(/\\/g, "/");
  if (isFilePartNodePath(normalized)) return true;
  const match = normalized.match(/\/_Parts\/[^/]+\/([^/]+)$/i);
  return Boolean(match && isNodeManifestFileName(match[1]));
}

function collectMenuNodePaths(node, acc = []) {
  if (!node) return acc;
  if (node.indexPath) acc.push(normalizeMenuNodePath(node.indexPath));
  for (const item of node.items || []) {
    if (item?.path) acc.push(normalizeMenuNodePath(item.path));
  }
  for (const section of node.sections || []) {
    collectMenuNodePaths(section, acc);
  }
  return acc;
}

function resolveNodeManifestPathFromMenu(nodePath) {
  const normalized = normalizeMenuNodePath(nodePath);
  if (!normalized) return normalized;
  if (normalized.includes("/")) return normalized;
  if (isAgentRootIndexPath(normalized)) return normalized;
  if (!currentMenuData) return normalized;

  const baseTree = { title: getAgentTreeTitle(), ...currentMenuData };
  const candidates = collectMenuNodePaths(baseTree).filter(
    (candidate) => candidate === normalized || candidate.endsWith(`/${normalized}`)
  );
  const exact = candidates.find((candidate) => candidate === normalized);
  if (exact) return exact;
  if (candidates.length === 1) return candidates[0];
  if (candidates.length > 1) {
    return [...candidates].sort((a, b) => b.length - a.length)[0];
  }
  return normalized;
}

function getResolvedNodePath(nodePath = activePath) {
  return resolveNodeManifestPathFromMenu(nodePath);
}

function getActiveNodeApiPath() {
  return getResolvedNodePath(activePath);
}

function isFullWorkspaceRelPath(relPath) {
  return String(relPath || "").includes("/");
}

function normalizeCreateParentPath(parentPath) {
  const raw = String(parentPath || ".").trim().replace(/\\/g, "/");
  if (!raw || raw === ".") return ".";
  const base = raw.split("/").filter(Boolean).pop() || "";
  if (isAreaManifestFileName(base) || MANIFEST_MD_RE.test(base)) {
    const folder = getFolderPathFromManifest(raw);
    return folder || ".";
  }
  const vaultFolder = getActiveAgentVaultFolder();
  if (vaultFolder) {
    const vaultLower = vaultFolder.toLowerCase();
    const rawLower = raw.toLowerCase();
    if (rawLower === vaultLower || rawLower.startsWith(`${vaultLower}/`)) {
      return raw;
    }
  }
  return raw;
}

function isAgentRootIndexPath(nodePath) {
  return (
    nodePath === AREA_MANIFEST_FILE || LEGACY_AREA_MANIFEST_ALIASES.includes(nodePath)
  );
}

function updateAgentPreviewCache(previewMeta) {
  const index = agentsCache.findIndex((agent) => agent.id === activeAgentId);
  if (index === -1) return;
  agentsCache[index] = {
    ...agentsCache[index],
    hasPreview: Boolean(previewMeta?.hasPreview),
    previewUrl: previewMeta?.previewUrl || null
  };
}

function syncAgentPreview(previewMeta = null) {
  if (!agentPreviewThumbNode || !agentPreviewWrapNode) return;

  const agent = getActiveAgentMeta();
  const hasPreview = previewMeta ? Boolean(previewMeta.hasPreview) : Boolean(agent?.hasPreview);
  const previewUrl = previewMeta?.previewUrl ?? agent?.previewUrl ?? null;

  if (previewMeta) {
    updateAgentPreviewCache(previewMeta);
  }

  if (hasPreview && previewUrl) {
    agentPreviewWrapNode.classList.remove("hidden");
    agentPreviewThumbNode.onerror = () => {
      agentPreviewWrapNode.classList.add("hidden");
      agentPreviewThumbNode.removeAttribute("src");
    };
    agentPreviewThumbNode.onload = () => {
      agentPreviewThumbNode.onerror = null;
    };
    agentPreviewThumbNode.src = appendCacheBuster(appendAgentToApiUrl(previewUrl));
    return;
  }

  agentPreviewWrapNode.classList.add("hidden");
  agentPreviewThumbNode.removeAttribute("src");
}

function syncAgentsRegistryDraftPreview(agentPath) {
  if (!agentsRegistryModalNode || agentsRegistryModalNode.classList.contains("hidden")) return;
  const key = normalizeRegistryPathKey(agentPath);
  const index = agentsRegistryDraft.findIndex((item) => normalizeRegistryPathKey(item.path) === key);
  if (index === -1) return;
  const updated = agentsCache.find((item) => normalizeRegistryPathKey(item.path) === key);
  agentsRegistryDraft[index].hasPreview = Boolean(updated?.hasPreview);
  agentsRegistryDraft[index].previewUrl = updated?.previewUrl || null;
  agentsRegistryDraft[index].previewRel = null;
  const row = agentsRegistryListNode?.querySelector(`.agents-registry-row[data-registry-index="${index}"]`);
  if (row) updateRegistryRowPreview(row, agentsRegistryDraft[index]);
}

async function uploadAgentPreviewFile(agentPath, file) {
  if (!agentPath) throw new Error("Workspace не задан");
  if (!isAllowedPreviewFile(file)) throw new Error("Допустимы только JPG, PNG и GIF");

  const data = await readFileAsBase64(file);
  const response = await fetch("/api/agents/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      path: agentPath,
      data,
      fileName: file.name,
      mimeType: file.type
    })
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const details = errorData.details ? `: ${errorData.details}` : "";
    throw new Error(`${errorData.error || `Request failed with ${response.status}`}${details}`);
  }
  return response.json();
}

async function removeAgentPreviewFile(agentPath) {
  if (!agentPath) throw new Error("Workspace не задан");

  const response = await fetch(`/api/agents/preview?path=${encodeURIComponent(agentPath)}`, {
    method: "DELETE"
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const details = errorData.details ? `: ${errorData.details}` : "";
    throw new Error(`${errorData.error || `Request failed with ${response.status}`}${details}`);
  }
  return response.json();
}

async function refreshAgentPreviewAfterFileChange(agentPath) {
  await loadAgents();
  syncAgentsRegistryDraftPreview(agentPath);
  syncAgentPreview();
}

function getSelectableAgents() {
  return agentsCache.filter((agent) => agent.active !== false);
}

function getActiveAgentLabel() {
  return getActiveAgentMeta()?.name || "";
}

function renderAgentSelect() {
  if (!agentSelectNode) return;

  const agents = getSelectableAgents();
  const previousValue = agentSelectNode.value;
  agentSelectNode.innerHTML = "";

  if (agents.length === 0) {
    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = "Нет агентов";
    emptyOption.disabled = true;
    emptyOption.selected = true;
    agentSelectNode.appendChild(emptyOption);
    agentSelectNode.disabled = true;
    syncAgentPreview();
    return;
  }

  for (const agent of agents) {
    const option = document.createElement("option");
    option.value = agent.id;
    option.textContent = agent.name || agent.id;
    agentSelectNode.appendChild(option);
  }

  agentSelectNode.disabled = false;
  const nextValue = agents.some((agent) => agent.id === activeAgentId)
    ? activeAgentId
    : previousValue && agents.some((agent) => agent.id === previousValue)
      ? previousValue
      : agents[0].id;
  agentSelectNode.value = nextValue;
  syncAgentPreview();
}

function selectAgentOption(agentId) {
  if (!agentId || agentId === activeAgentId) return;
  if (agentSelectNode) agentSelectNode.value = agentId;
  switchActiveAgent(agentId).catch((error) => {
    showHomeView(`Ошибка переключения агента: ${error.message}`);
    renderAgentSelect();
  });
}

async function switchActiveAgent(nextAgentId) {
  if (!nextAgentId || nextAgentId === activeAgentId) return;
  if (!agentsCache.some((agent) => agent.id === nextAgentId)) return;

  setMenuLoading(true);
  try {
    saveCollapsedFoldersByAgent();
    closeCreateNodeModal();
    activeAgentId = nextAgentId;
    migrateAgentCollapsedFolderKeys(activeAgentId);
    localStorage.setItem(ACTIVE_AGENT_STORAGE_KEY, activeAgentId);
    syncAgentToUrl(activeAgentId);
    activateMenuAgentPane(activeAgentId);
    activePath = null;
    activeLabel = null;
    activeSystemFile = null;
    clearMediaSidecarEditor();
    showHomeView();
    renderAgentSelect();
    applyMenuTreeSettingsUi();
    applyAgentGraphSettingsUi();
    closeMenuSettingsPopover();
    setMenuLoading(true, `Загрузка: ${getActiveAgentLabel() || nextAgentId}`);

    const cachedMenu = menuCacheByAgent.get(activeAgentId);
    const cachedPane = menuAgentPanes.get(activeAgentId);
    const hasCachedView = Boolean(cachedMenu && cachedPane && cachedPane.childElementCount > 0);

    if (hasCachedView) {
      activateMenuAgentPane(activeAgentId);
      currentMenuData = cachedMenu;
      updateActiveButton();
      syncAgentPreview({
        hasPreview: cachedMenu.hasPreview,
        previewUrl: cachedMenu.previewUrl
      });
    }

    await loadSystemFiles();

    if (hasCachedView) {
      renderSystemFiles(systemFilesCache);
      return;
    }

    await refreshMenu({ agentId: activeAgentId });
  } finally {
    setMenuLoading(false);
  }
}

function setMenuLoading(isLoading, message = "Загрузка...") {
  if (!menuLoadingNode) return;
  if (menuLoadingTextNode) {
    menuLoadingTextNode.textContent = message;
  }
  menuLoadingNode.classList.toggle("hidden", !isLoading);
  menuLoadingNode.setAttribute("aria-busy", isLoading ? "true" : "false");
  menuNode?.classList.toggle("is-loading", isLoading);
  if (agentSelectNode) agentSelectNode.disabled = isLoading;
  if (agentsManageBtn) agentsManageBtn.disabled = isLoading;
  if (menuRefreshBtn) menuRefreshBtn.disabled = isLoading;
  if (menuCollapseAllBtn) menuCollapseAllBtn.disabled = isLoading;
  if (menuSettingsBtn) menuSettingsBtn.disabled = isLoading;
}

function ensureMenuAgentPane(agentId = activeAgentId) {
  const id = agentId || activeAgentId || "main";
  let pane = menuAgentPanes.get(id);
  if (!pane) {
    pane = document.createElement("div");
    pane.className = "menu-agent-pane hidden";
    pane.dataset.agentId = id;
    menuNode.appendChild(pane);
    menuAgentPanes.set(id, pane);
  }
  return pane;
}

function activateMenuAgentPane(agentId = activeAgentId) {
  for (const [id, pane] of menuAgentPanes.entries()) {
    pane.classList.toggle("hidden", id !== agentId);
  }
  const pane = ensureMenuAgentPane(agentId);
  pane.classList.remove("hidden");
}

function getMenuQueryRoot() {
  return menuAgentPanes.get(activeAgentId) || menuNode;
}

function invalidateMenuAgentCache(agentId = activeAgentId) {
  menuCacheByAgent.delete(agentId);
  const pane = menuAgentPanes.get(agentId);
  if (pane) pane.innerHTML = "";
}

function openAgentsRegistryModal() {
  agentsRegistryDraft = agentsCache.map((agent) => ({
    id: agent.id,
    path: agent.path,
    environment: normalizeAgentEnvironmentDraft(agent.environment),
    name: agent.name || agent.id,
    comment: agent.comment || "",
    vaultFolder: agent.vaultFolder === null ? null : agent.vaultFolder || VAULT_FOLDER_DEFAULT,
    serviceFolder: agent.serviceFolder === null ? null : agent.serviceFolder || SERVICE_FOLDER_DEFAULT,
    default: Boolean(agent.default),
    active: agent.active !== false,
    manifestFound: Boolean(agent.manifestFound),
    hasPreview: Boolean(agent.hasPreview),
    previewUrl: agent.previewUrl || null,
    previewRel: agent.previewRel || null
  }));
  renderAgentsRegistryList();
  agentsRegistryModalNode?.classList.remove("hidden");
}

function countActiveAgentsRegistryDraft() {
  return agentsRegistryDraft.filter((agent) => agent.active !== false).length;
}

function toggleAgentsRegistryDraftActive(index) {
  const agent = agentsRegistryDraft[index];
  if (!agent) return;

  const isActive = agent.active !== false;
  if (isActive && countActiveAgentsRegistryDraft() <= 1) {
    showToast("Нужен хотя бы один активный агент", "error");
    return;
  }

  agent.active = !isActive;
  if (!agent.active && agent.default) {
    agent.default = false;
    const replacement = agentsRegistryDraft.find((item, itemIndex) => itemIndex !== index && item.active !== false);
    if (replacement) replacement.default = true;
  }
  renderAgentsRegistryList();
}

function closeAgentsRegistryModal() {
  agentsRegistryModalNode?.classList.add("hidden");
  agentsRegistryDraft = [];
  agentsRegistryListNode.innerHTML = "";
  if (agentsRegistryPathValidateTimer) {
    clearTimeout(agentsRegistryPathValidateTimer);
    agentsRegistryPathValidateTimer = null;
  }
}

function normalizeRegistryPathKey(rawPath) {
  return String(rawPath || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/+$/, "");
}

function buildRegistryPathResultMap(results) {
  const byPath = new Map();
  if (!Array.isArray(results)) return byPath;
  for (const result of results) {
    const inputKey = normalizeRegistryPathKey(result?.path);
    if (inputKey) byPath.set(inputKey, result);
    const absoluteKey = normalizeRegistryPathKey(result?.absolute);
    if (absoluteKey) byPath.set(absoluteKey, result);
  }
  return byPath;
}

function findRegistryPathValidationResult(pathValue, byPath) {
  const key = normalizeRegistryPathKey(pathValue);
  if (!key) return null;
  if (byPath.has(key)) return byPath.get(key);
  return null;
}

function updateAgentsRegistryPathStatusNode(node, result) {
  if (!node) return;
  if (result?.status === "checking") {
    node.dataset.state = "checking";
    node.title = "Проверка…";
    syncRegistryRowActions(node.closest(".agents-registry-row"), "checking");
    return;
  }
  if (!result?.valid) {
    node.dataset.state = "invalid";
    node.title = result?.absolute
      ? `${result.error || "Некорректный путь"}\n${result.absolute}`
      : result?.error || "Некорректный путь";
    syncRegistryRowActions(node.closest(".agents-registry-row"), "invalid");
    return;
  }
  if (result.manifestFound) {
    node.dataset.state = "manifest";
    node.title = result.absolute ? `awn.agent.json найден:\n${result.absolute}` : "awn.agent.json найден";
    syncRegistryRowActions(node.closest(".agents-registry-row"), "manifest");
    return;
  }
  if (result.exists) {
    node.dataset.state = "missing";
    node.title = result.absolute
      ? `Папка есть, но нет awn.agent.json:\n${result.absolute}`
      : "Папка есть, но нет awn.agent.json";
    syncRegistryRowActions(node.closest(".agents-registry-row"), "missing");
    return;
  }
  node.dataset.state = "missing";
  node.title = result.absolute ? `Папка не найдена:\n${result.absolute}` : "Папка не найдена";
  syncRegistryRowActions(node.closest(".agents-registry-row"), "missing");
}

function syncRegistryRowActions(row, pathState) {
  if (!row) return;
  const activeBtn = row.querySelector(".agents-registry-active-btn");
  const deleteBtn = row.querySelector(".agents-registry-delete-btn");
  const isMissing = pathState === "missing";

  if (activeBtn) activeBtn.hidden = isMissing;
  if (deleteBtn) {
    deleteBtn.hidden = !isMissing;
    deleteBtn.disabled = agentsRegistryDraft.length <= 1;
    deleteBtn.title =
      agentsRegistryDraft.length <= 1
        ? "Нужен хотя бы один агент"
        : "Удалить из списка (без манифеста)";
  }
}

async function removeAgentsRegistryDraftRow(index) {
  if (agentsRegistryDraft.length <= 1) {
    showToast("Нужен хотя бы один агент", "error");
    return;
  }

  const agent = agentsRegistryDraft[index];
  if (!agent) return;

  const label = String(agent.name || agent.id || agent.path || "агента").trim();
  const confirmed = await askConfirm(
    `Удалить «${label}» из списка? Запись исчезнет после «Сохранить». Папка на диске не удаляется.`
  );
  if (!confirmed) return;

  const wasDefault = Boolean(agent.default);
  const wasActive = agent.active !== false;
  agentsRegistryDraft.splice(index, 1);

  if (wasDefault) {
    const replacement =
      agentsRegistryDraft.find((item) => item.active !== false) || agentsRegistryDraft[0];
    if (replacement) replacement.default = true;
  }
  if (wasActive && countActiveAgentsRegistryDraft() === 0 && agentsRegistryDraft[0]) {
    agentsRegistryDraft[0].active = true;
  }

  renderAgentsRegistryList();
}

function applyManifestToRegistryDraft(index, result) {
  if (!agentsRegistryDraft[index] || !result?.manifestFound || !result?.manifest) return;
  const manifest = result.manifest;
  agentsRegistryDraft[index].manifestFound = true;
  agentsRegistryDraft[index].name = manifest.name || agentsRegistryDraft[index].name;
  agentsRegistryDraft[index].comment = manifest.comment || "";
  agentsRegistryDraft[index].vaultFolder =
    manifest.vaultFolder === null ? null : manifest.vaultFolder || VAULT_FOLDER_DEFAULT;
  if (manifest.id) agentsRegistryDraft[index].id = manifest.id;
}

function getRegistryAgentPreviewUrl(agent) {
  if (!agent?.path || !agent.hasPreview) return null;
  if (agent.previewUrl && agent.previewUrl.startsWith("/api/preview/image")) {
    return appendCacheBuster(appendAgentToApiUrl(agent.previewUrl, agent.id));
  }
  return appendCacheBuster(`/api/agents/workspace-preview?path=${encodeURIComponent(agent.path)}`);
}

function updateRegistryRowPreview(row, agent) {
  const previewSlot = row.querySelector(".agents-registry-preview-slot");
  if (!previewSlot) return;

  const previewUrl = getRegistryAgentPreviewUrl(agent);
  const hasImage = Boolean(previewUrl);

  previewSlot.classList.toggle("has-image", hasImage);
  previewSlot.title = hasImage ? "Нажмите, чтобы заменить аватар" : "Загрузить аватар";

  let img = previewSlot.querySelector(".agents-registry-preview-thumb");
  if (hasImage) {
    if (!img) {
      img = document.createElement("img");
      img.className = "agents-registry-preview-thumb";
      img.alt = "";
      img.draggable = false;
      const placeholder = previewSlot.querySelector(".agents-registry-preview-placeholder");
      previewSlot.insertBefore(img, placeholder);
    }
    img.onerror = () => {
      img.remove();
      previewSlot.classList.remove("has-image");
    };
    img.src = previewUrl;
  } else if (img) {
    img.remove();
  }
}

function bindRegistryPreviewSlot(row, agent, index) {
  const previewSlot = row.querySelector(".agents-registry-preview-slot");
  if (!previewSlot || previewSlot.dataset.bound === "1") return;
  previewSlot.dataset.bound = "1";

  const fileInput = previewSlot.querySelector(".agents-registry-preview-file-input");
  const removeBtn = previewSlot.querySelector(".agents-registry-preview-remove-btn");

  previewSlot.addEventListener("click", () => {
    fileInput?.click();
  });
  previewSlot.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      fileInput?.click();
    }
  });

  fileInput?.addEventListener("click", (event) => {
    event.stopPropagation();
  });
  fileInput?.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (file) void uploadAgentsRegistryPreview(index, file, row);
    fileInput.value = "";
  });

  removeBtn?.addEventListener("click", (event) => {
    event.stopPropagation();
    void removeAgentsRegistryPreview(index, row);
  });
}

async function uploadAgentsRegistryPreview(index, file, row) {
  const agent = agentsRegistryDraft[index];
  if (!agent?.path) {
    showToast("Workspace не задан", "error");
    return;
  }

  const previewSlot = row.querySelector(".agents-registry-preview-slot");
  previewSlot?.classList.add("is-uploading");

  try {
    const payload = await uploadAgentPreviewFile(agent.path, file);
    agentsRegistryDraft[index].hasPreview = Boolean(payload.hasPreview);
    agentsRegistryDraft[index].previewUrl = payload.previewUrl || null;
    agentsRegistryDraft[index].previewRel = null;
    updateRegistryRowPreview(row, agentsRegistryDraft[index]);
    await refreshAgentPreviewAfterFileChange(agent.path);
    showToast("Аватар сохранён", "success");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showToast(message ? `Ошибка загрузки: ${message}` : "Ошибка загрузки", "error");
  } finally {
    previewSlot?.classList.remove("is-uploading");
  }
}

async function removeAgentsRegistryPreview(index, row) {
  const agent = agentsRegistryDraft[index];
  if (!agent?.path || !agent.hasPreview) return;

  const previewSlot = row.querySelector(".agents-registry-preview-slot");
  previewSlot?.classList.add("is-uploading");

  try {
    await removeAgentPreviewFile(agent.path);
    agentsRegistryDraft[index].previewRel = null;
    agentsRegistryDraft[index].hasPreview = false;
    agentsRegistryDraft[index].previewUrl = null;
    updateRegistryRowPreview(row, agentsRegistryDraft[index]);
    await refreshAgentPreviewAfterFileChange(agent.path);
    showToast("Аватар удалён", "success");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showToast(message ? `Ошибка удаления: ${message}` : "Ошибка удаления", "error");
  } finally {
    previewSlot?.classList.remove("is-uploading");
  }
}

function syncRegistryRowMetaFromDraft() {
  if (!agentsRegistryListNode) return;
  agentsRegistryDraft.forEach((agent, index) => {
    const row = agentsRegistryListNode.querySelector(`.agents-registry-row[data-registry-index="${index}"]`);
    if (!row) return;
    const nameNode = row.querySelector("[data-agent-name]");
    const commentNode = row.querySelector("[data-agent-comment]");
    const vaultNode = row.querySelector("[data-agent-vault]");
    const vaultDisabledNode = row.querySelector("[data-agent-vault-disabled]");
    const pathNode = row.querySelector("[data-agent-path]");
    if (nameNode && nameNode.value !== (agent.name || "")) {
      nameNode.value = agent.name || "";
    }
    if (commentNode && commentNode.value !== (agent.comment || "")) {
      commentNode.value = agent.comment || "";
    }
    if (vaultNode && vaultDisabledNode) {
      const vaultDisabled = agent.vaultFolder === null;
      vaultDisabledNode.checked = vaultDisabled;
      vaultNode.disabled = vaultDisabled || !agent.manifestFound;
      const vaultValue =
        agent.vaultFolder === null ? VAULT_FOLDER_DEFAULT : agent.vaultFolder || VAULT_FOLDER_DEFAULT;
      if (vaultNode.value !== vaultValue) {
        vaultNode.value = vaultValue;
      }
    }
    if (pathNode && pathNode.value !== (agent.path || "")) {
      pathNode.value = agent.path || "";
      pathNode.title = agent.path || "";
    }
    updateRegistryRowPreview(row, agent);
  });
}

function applyAgentsRegistryPathValidationResults(results, pathsSnapshot = null) {
  if (!agentsRegistryListNode || !Array.isArray(results)) return;
  const byPath = buildRegistryPathResultMap(results);
  const snapshot =
    Array.isArray(pathsSnapshot) && pathsSnapshot.length > 0
      ? pathsSnapshot
      : agentsRegistryDraft.map((agent) => normalizeRegistryPathKey(agent.path));

  agentsRegistryDraft.forEach((agent, index) => {
    const expectedPath = snapshot[index];
    const currentPath = normalizeRegistryPathKey(agent.path);
    if (expectedPath && currentPath !== expectedPath) return;

    const result = findRegistryPathValidationResult(agent.path, byPath);
    const statusNode = agentsRegistryListNode.querySelector(
      `.agents-registry-row[data-registry-index="${index}"] .agents-registry-path-dot`
    );
    if (!statusNode) return;
    if (result) {
      applyManifestToRegistryDraft(index, result);
      updateAgentsRegistryPathStatusNode(statusNode, result);
      return;
    }
    updateAgentsRegistryPathStatusNode(statusNode, { status: "checking" });
  });
  syncRegistryRowMetaFromDraft();
}

function markAgentsRegistryPathStatusesChecking() {
  if (!agentsRegistryListNode) return;
  for (const node of agentsRegistryListNode.querySelectorAll(".agents-registry-row .agents-registry-path-dot")) {
    updateAgentsRegistryPathStatusNode(node, { status: "checking" });
  }
}

function scheduleAgentsRegistryPathValidation() {
  if (agentsRegistryPathValidateTimer) {
    clearTimeout(agentsRegistryPathValidateTimer);
  }
  agentsRegistryPathValidateTimer = window.setTimeout(() => {
    agentsRegistryPathValidateTimer = null;
    void refreshAgentsRegistryPathStatuses();
  }, 350);
}

async function refreshAgentsRegistryPathStatuses() {
  if (!agentsRegistryListNode || agentsRegistryDraft.length === 0) return;
  const requestId = ++agentsRegistryPathValidateRequestId;
  const pathsSnapshot = agentsRegistryDraft.map((agent) => normalizeRegistryPathKey(agent.path));
  markAgentsRegistryPathStatusesChecking();
  try {
    const response = await fetch("/api/agents/validate-paths", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paths: agentsRegistryDraft.map((agent) => agent.path) })
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.details || errorData.error || `HTTP ${response.status}`);
    }
    const data = await response.json();
    if (requestId !== agentsRegistryPathValidateRequestId) return;
    applyAgentsRegistryPathValidationResults(data.results, pathsSnapshot);
  } catch (error) {
    if (requestId !== agentsRegistryPathValidateRequestId) return;
    for (const row of agentsRegistryListNode.querySelectorAll(".agents-registry-row")) {
      const statusNode = row.querySelector(".agents-registry-path-dot");
      updateAgentsRegistryPathStatusNode(statusNode, {
        valid: false,
        error: `Ошибка проверки: ${error.message}`
      });
    }
  }
}

function moveAgentsRegistryDraftRow(fromIndex, toIndex) {
  if (fromIndex === toIndex) return;
  if (fromIndex < 0 || toIndex < 0) return;
  if (fromIndex >= agentsRegistryDraft.length || toIndex >= agentsRegistryDraft.length) return;
  const [item] = agentsRegistryDraft.splice(fromIndex, 1);
  agentsRegistryDraft.splice(toIndex, 0, item);
  renderAgentsRegistryList();
}

function sortAgentsRegistryDraft(field) {
  const collator = new Intl.Collator("ru", { sensitivity: "base", numeric: true });
  agentsRegistryDraft.sort((left, right) => {
    if (field === "default") {
      return Number(Boolean(right.default)) - Number(Boolean(left.default));
    }
    return collator.compare(String(left[field] || ""), String(right[field] || ""));
  });
  renderAgentsRegistryList();
}

function renderAgentsRegistryList() {
  if (!agentsRegistryListNode) return;
  agentsRegistryListNode.innerHTML = "";

  agentsRegistryDraft.forEach((agent, index) => {
    const row = document.createElement("div");
    row.className = "agents-registry-row";
    if (agent.active === false) row.classList.add("is-inactive");
    row.dataset.registryIndex = String(index);

    const mainRow = document.createElement("div");
    mainRow.className = "agents-registry-row-main";

    const orderWrap = document.createElement("div");
    orderWrap.className = "agents-registry-order";
    const upBtn = document.createElement("button");
    upBtn.type = "button";
    upBtn.className = "agents-registry-order-btn";
    upBtn.textContent = "↑";
    upBtn.title = "Выше";
    upBtn.disabled = index === 0;
    upBtn.addEventListener("click", () => moveAgentsRegistryDraftRow(index, index - 1));
    const downBtn = document.createElement("button");
    downBtn.type = "button";
    downBtn.className = "agents-registry-order-btn";
    downBtn.textContent = "↓";
    downBtn.title = "Ниже";
    downBtn.disabled = index === agentsRegistryDraft.length - 1;
    downBtn.addEventListener("click", () => moveAgentsRegistryDraftRow(index, index + 1));
    orderWrap.append(upBtn, downBtn);

    const nameField = document.createElement("label");
    nameField.className = "agents-registry-field agents-registry-name-field";
    nameField.innerHTML = "<span>Название</span>";
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.className = "agents-registry-name-input";
    nameInput.dataset.agentName = "1";
    nameInput.placeholder = "Сохраняется в awn.agent.json";
    nameInput.value = agent.name || "";
    nameInput.addEventListener("input", () => {
      agentsRegistryDraft[index].name = nameInput.value;
    });
    nameField.appendChild(nameInput);

    const pathField = document.createElement("label");
    pathField.className = "agents-registry-field agents-registry-path-field";
    const pathLabelRow = document.createElement("span");
    pathLabelRow.className = "agents-registry-path-label";
    const pathStatusNode = document.createElement("span");
    pathStatusNode.className = "agents-registry-path-dot";
    pathStatusNode.dataset.state = "checking";
    pathStatusNode.title = "Проверка…";
    pathStatusNode.setAttribute("aria-label", "Статус awn.agent.json");
    const pathLabelText = document.createElement("span");
    pathLabelText.textContent = "Workspace";
    pathLabelRow.append(pathStatusNode, pathLabelText);
    const pathInput = document.createElement("input");
    pathInput.type = "text";
    pathInput.className = "agents-registry-path-input";
    pathInput.dataset.agentPath = "1";
    pathInput.value = agent.path || "";
    pathInput.title = agent.path || "";
    pathInput.disabled = true;
    pathInput.setAttribute("aria-disabled", "true");
    pathField.append(pathLabelRow, pathInput);

    const commentInput = document.createElement("textarea");
    commentInput.className = "agents-registry-comment-input";
    commentInput.dataset.agentComment = "1";
    commentInput.rows = 1;
    commentInput.placeholder = "Сохраняется в awn.agent.json";
    commentInput.value = agent.comment || "";
    commentInput.addEventListener("input", () => {
      agentsRegistryDraft[index].comment = commentInput.value;
    });

    const commentField = document.createElement("label");
    commentField.className = "agents-registry-field agents-registry-comment-field";
    commentField.innerHTML = "<span>Описание</span>";
    commentField.appendChild(commentInput);

    const environmentField = document.createElement("label");
    environmentField.className = "agents-registry-field agents-registry-environment-field";
    environmentField.innerHTML = "<span>Среда</span>";
    const environmentSelect = document.createElement("select");
    environmentSelect.className = "agents-registry-select";
    for (const option of AGENT_ENVIRONMENT_OPTIONS) {
      const optionNode = document.createElement("option");
      optionNode.value = option.value;
      optionNode.textContent = option.label;
      environmentSelect.appendChild(optionNode);
    }
    environmentSelect.value = normalizeAgentEnvironmentDraft(agent.environment);
    environmentSelect.addEventListener("change", () => {
      agentsRegistryDraft[index].environment = environmentSelect.value;
    });
    environmentField.appendChild(environmentSelect);

    const defaultWrap = document.createElement("div");
    defaultWrap.className = "agents-registry-field agents-registry-default-field";
    const defaultTitle = document.createElement("span");
    defaultTitle.textContent = "Def.";
    const defaultLabel = document.createElement("label");
    defaultLabel.className = "agents-registry-default";
    defaultLabel.title = "По умолчанию";
    const defaultInput = document.createElement("input");
    defaultInput.type = "radio";
    defaultInput.name = "agents-registry-default";
    defaultInput.checked = Boolean(agent.default) && agent.active !== false;
    defaultInput.disabled = agent.active === false;
    defaultInput.setAttribute("aria-label", "По умолчанию");
    defaultInput.addEventListener("change", () => {
      if (!defaultInput.checked || agent.active === false) return;
      for (const item of agentsRegistryDraft) item.default = false;
      agentsRegistryDraft[index].default = true;
      renderAgentsRegistryList();
    });
    const defaultText = document.createElement("span");
    defaultText.setAttribute("aria-hidden", "true");
    defaultLabel.append(defaultInput, defaultText);
    defaultWrap.append(defaultTitle, defaultLabel);

    const actionsWrap = document.createElement("div");
    actionsWrap.className = "agents-registry-row-actions";

    const activeBtn = document.createElement("button");
    activeBtn.type = "button";
    activeBtn.className = "agents-registry-active-btn";
    activeBtn.title = agent.active !== false ? "Активен — отключить" : "Неактивен — включить";
    activeBtn.setAttribute("aria-pressed", agent.active !== false ? "true" : "false");
    activeBtn.setAttribute("aria-label", agent.active !== false ? "Активен" : "Неактивен");
    activeBtn.textContent = agent.active !== false ? "●" : "○";
    activeBtn.hidden = true;
    activeBtn.addEventListener("click", () => {
      toggleAgentsRegistryDraftActive(index);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "agents-registry-delete-btn";
    deleteBtn.textContent = "✕";
    deleteBtn.title = "Удалить из списка (без манифеста)";
    deleteBtn.setAttribute("aria-label", "Удалить из списка");
    deleteBtn.hidden = true;
    deleteBtn.disabled = agentsRegistryDraft.length <= 1;
    deleteBtn.addEventListener("click", () => {
      void removeAgentsRegistryDraftRow(index);
    });

    actionsWrap.append(activeBtn, deleteBtn);

    const vaultControls = document.createElement("div");
    vaultControls.className = "agents-registry-vault-controls";

    const vaultInput = document.createElement("input");
    vaultInput.type = "text";
    vaultInput.className = "agents-registry-vault-input";
    vaultInput.dataset.agentVault = "1";
    vaultInput.placeholder = VAULT_FOLDER_DEFAULT;
    vaultInput.spellcheck = false;
    vaultInput.autocomplete = "off";
    vaultInput.value =
      agent.vaultFolder === null ? VAULT_FOLDER_DEFAULT : agent.vaultFolder || VAULT_FOLDER_DEFAULT;
    vaultInput.disabled = agent.vaultFolder === null || !agent.manifestFound;
    vaultInput.title = "Имя скрытой папки-контейнера в workspace";
    vaultInput.addEventListener("input", () => {
      if (agentsRegistryDraft[index].vaultFolder === null) return;
      const trimmed = vaultInput.value.trim();
      agentsRegistryDraft[index].vaultFolder = trimmed || VAULT_FOLDER_DEFAULT;
    });

    const vaultDisabledLabel = document.createElement("label");
    vaultDisabledLabel.className = "agents-registry-vault-disabled";
    const vaultDisabledInput = document.createElement("input");
    vaultDisabledInput.type = "checkbox";
    vaultDisabledInput.dataset.agentVaultDisabled = "1";
    vaultDisabledInput.checked = agent.vaultFolder === null;
    vaultDisabledInput.disabled = !agent.manifestFound;
    vaultDisabledInput.addEventListener("change", () => {
      if (vaultDisabledInput.checked) {
        agentsRegistryDraft[index].vaultFolder = null;
        vaultInput.disabled = true;
        return;
      }
      agentsRegistryDraft[index].vaultFolder = vaultInput.value.trim() || VAULT_FOLDER_DEFAULT;
      vaultInput.disabled = !agent.manifestFound;
    });
    const vaultDisabledText = document.createElement("span");
    vaultDisabledText.textContent = "Показывать как обычную папку";
    vaultDisabledLabel.append(vaultDisabledInput, vaultDisabledText);

    vaultControls.append(vaultInput, vaultDisabledLabel);

    const vaultHintText = "Скрыта в дереве, содержимое у корня.";

    const vaultField = document.createElement("div");
    vaultField.className = "agents-registry-field agents-registry-vault-field";

    const vaultLabelRow = document.createElement("div");
    vaultLabelRow.className = "agents-registry-vault-label-row";
    const vaultLabel = document.createElement("span");
    vaultLabel.className = "agents-registry-field-label";
    vaultLabel.textContent = "Vault-папка";
    const vaultHintMark = document.createElement("span");
    vaultHintMark.className = "agents-registry-vault-hint-mark";
    vaultHintMark.textContent = "*";
    vaultHintMark.title = vaultHintText;
    vaultLabelRow.append(vaultLabel, vaultHintMark);

    vaultField.append(vaultLabelRow, vaultControls);

    mainRow.append(orderWrap, nameField, commentField, environmentField, defaultWrap, actionsWrap);

    const detailsRow = document.createElement("div");
    detailsRow.className = "agents-registry-details-row";
    detailsRow.dataset.layout = "content-vault";
    detailsRow.append(pathField, vaultField);

    const rowContent = document.createElement("div");
    rowContent.className = "agents-registry-row-content";
    rowContent.append(mainRow, detailsRow);

    const previewSlot = document.createElement("div");
    previewSlot.className = "agents-registry-preview-slot";
    previewSlot.tabIndex = 0;
    previewSlot.setAttribute("role", "button");
    previewSlot.setAttribute("aria-label", "Загрузить аватар");

    const previewFileInput = document.createElement("input");
    previewFileInput.type = "file";
    previewFileInput.className = "agents-registry-preview-file-input";
    previewFileInput.accept = "image/jpeg,image/png,image/gif";

    const previewPlaceholder = document.createElement("span");
    previewPlaceholder.className = "agents-registry-preview-placeholder";
    previewPlaceholder.innerHTML =
      '<span class="agents-registry-preview-placeholder-icon" aria-hidden="true">+</span><span class="agents-registry-preview-placeholder-text">JPG, PNG, GIF</span>';

    const previewRemoveBtn = document.createElement("button");
    previewRemoveBtn.type = "button";
    previewRemoveBtn.className = "agents-registry-preview-remove-btn";
    previewRemoveBtn.title = "Удалить аватар";
    previewRemoveBtn.setAttribute("aria-label", "Удалить аватар");
    previewRemoveBtn.textContent = "×";

    previewSlot.append(previewFileInput, previewPlaceholder, previewRemoveBtn);

    const rowBody = document.createElement("div");
    rowBody.className = "agents-registry-row-body";
    rowBody.append(previewSlot, rowContent);

    row.append(rowBody);
    bindRegistryPreviewSlot(row, agent, index);
    updateRegistryRowPreview(row, agent);
    agentsRegistryListNode.appendChild(row);
  });

  void refreshAgentsRegistryPathStatuses();
}

function addAgentsRegistryDraftRow() {
  openAgentDiscoverModal();
}

function openAgentsRegistryCreateModal() {
  if (!agentsRegistryCreateModalNode) return;
  if (agentsRegistryCreatePathInputNode) {
    agentsRegistryCreatePathInputNode.value = "./workspaces/";
  }
  agentsRegistryCreateModalNode.classList.remove("hidden");
  window.setTimeout(() => agentsRegistryCreatePathInputNode?.focus(), 0);
}

function closeAgentsRegistryCreateModal() {
  agentsRegistryCreateModalNode?.classList.add("hidden");
  if (agentsRegistryCreateSubmitBtn) {
    agentsRegistryCreateSubmitBtn.disabled = false;
    agentsRegistryCreateSubmitBtn.textContent = "Создать";
  }
}

async function submitAgentsRegistryCreate() {
  if (!agentsRegistryCreateSubmitBtn || !agentsRegistryCreatePathInputNode) return;

  const workspacePath = agentsRegistryCreatePathInputNode.value.trim();
  if (!workspacePath) {
    showToast("Укажите путь workspace", "error");
    agentsRegistryCreatePathInputNode.focus();
    return;
  }

  agentsRegistryCreateSubmitBtn.disabled = true;
  agentsRegistryCreateSubmitBtn.textContent = "Создаю...";

  try {
    const response = await fetch("/api/agents/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: workspacePath })
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const details = errorData.details ? `: ${errorData.details}` : "";
      throw new Error(`${errorData.error || `Request failed with ${response.status}`}${details}`);
    }

    const data = await response.json();
    if (!applyDiscoverAgentToDraft(data.agent)) return;

    closeAgentsRegistryCreateModal();
    renderAgentsRegistryList();
    showToast("Агент создан — сохраните список", "success");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showToast(message ? `Ошибка создания: ${message}` : "Ошибка создания", "error");
  } finally {
    agentsRegistryCreateSubmitBtn.disabled = false;
    agentsRegistryCreateSubmitBtn.textContent = "Создать";
  }
}

function isAgentPathAlreadyInDraft(pathValue) {
  const key = normalizeRegistryPathKey(pathValue);
  return agentsRegistryDraft.some((item) => normalizeRegistryPathKey(item.path) === key);
}

function applyDiscoverAgentToDraft(discovered) {
  const entry = {
    id: discovered.id,
    path: discovered.path,
    environment: "local",
    name: discovered.name,
    comment: discovered.comment || "",
    vaultFolder:
      discovered.vaultFolder === null ? null : discovered.vaultFolder || VAULT_FOLDER_DEFAULT,
    manifestFound: true,
    hasPreview: Boolean(discovered.hasPreview),
    previewUrl: null,
    previewRel: discovered.previewRel || null,
    active: true,
    default: agentsRegistryDraft.length === 0
  };

  if (isAgentPathAlreadyInDraft(entry.path)) {
    showToast("Этот агент уже в списке", "error");
    return false;
  }
  agentsRegistryDraft.push(entry);
  return true;
}

async function loadAgentDiscoverResults() {
  if (!agentsRegistryDiscoverListNode) return;
  agentsRegistryDiscoverListNode.innerHTML = `<div class="agents-registry-discover-status">Сканирование awn.agent.json…</div>`;
  try {
    const response = await fetch("/api/agents/discover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ maxDepth: 6 })
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    renderAgentDiscoverResults(Array.isArray(data.agents) ? data.agents : []);
  } catch (error) {
    agentsRegistryDiscoverListNode.innerHTML = `<div class="agents-registry-discover-status">Ошибка: ${escapeHtml(error.message)}</div>`;
  }
}

function renderAgentDiscoverResults(items) {
  if (!agentsRegistryDiscoverListNode) return;
  agentsRegistryDiscoverListNode.innerHTML = "";
  if (items.length === 0) {
    agentsRegistryDiscoverListNode.innerHTML = `<div class="agents-registry-discover-status">awn.agent.json не найден</div>`;
    return;
  }

  for (const item of items) {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "agents-registry-discover-item";

    const previewSlot = document.createElement("div");
    previewSlot.className = "agents-registry-preview-slot agents-registry-discover-preview";
    if (item.hasPreview && item.path) {
      const img = document.createElement("img");
      img.className = "agents-registry-preview-thumb";
      img.alt = "";
      img.draggable = false;
      img.src = appendCacheBuster(`/api/agents/workspace-preview?path=${encodeURIComponent(item.path)}`);
      img.onerror = () => img.remove();
      previewSlot.appendChild(img);
    }

    const meta = document.createElement("div");
    meta.className = "agents-registry-discover-meta";
    meta.innerHTML = `
      <div class="agents-registry-discover-name">${escapeHtml(item.name || item.id || "Agent")}</div>
      <div class="agents-registry-discover-path">${escapeHtml(item.path || "")}</div>
      ${item.comment ? `<div class="agents-registry-discover-comment">${escapeHtml(item.comment)}</div>` : ""}
    `;

    row.append(previewSlot, meta);
    row.addEventListener("click", () => {
      if (!applyDiscoverAgentToDraft(item)) return;
      closeAgentDiscoverModal();
      renderAgentsRegistryList();
      showToast("Агент добавлен", "success");
    });
    agentsRegistryDiscoverListNode.appendChild(row);
  }
}

function openAgentDiscoverModal() {
  agentsRegistryDiscoverModalNode?.classList.remove("hidden");
  void loadAgentDiscoverResults();
}

function closeAgentDiscoverModal() {
  agentsRegistryDiscoverModalNode?.classList.add("hidden");
  if (agentsRegistryDiscoverListNode) agentsRegistryDiscoverListNode.innerHTML = "";
}

async function saveAgentsRegistryDraft() {
  if (!agentsRegistrySaveBtn) return;
  agentsRegistrySaveBtn.disabled = true;
  agentsRegistrySaveBtn.textContent = "Сохраняю...";

  try {
    const response = await fetch("/api/agents/registry", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agents: agentsRegistryDraft.map(({ id, path, environment, default: isDefault, active, name, comment, vaultFolder }) => ({
          id,
          path,
          environment,
          default: isDefault,
          active: active !== false,
          name: name ?? "",
          comment: comment ?? "",
          vaultFolder: vaultFolder === null ? null : vaultFolder || VAULT_FOLDER_DEFAULT
        }))
      })
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const details = errorData.details ? `: ${errorData.details}` : "";
      throw new Error(`${errorData.error || `Request failed with ${response.status}`}${details}`);
    }

    const data = await response.json();
    await loadAgents();
    migrateAllAgentCollapsedFolderKeys();
    const previousAgentId = activeAgentId;
    if (!agentsCache.some((agent) => agent.id === activeAgentId) || !getSelectableAgents().some((agent) => agent.id === activeAgentId)) {
      activeAgentId = data.defaultAgentId || getSelectableAgents()[0]?.id || agentsCache[0]?.id || "main";
      localStorage.setItem(ACTIVE_AGENT_STORAGE_KEY, activeAgentId);
      syncAgentToUrl(activeAgentId);
    }
    renderAgentSelect();
    syncAgentPreview();
    closeAgentsRegistryModal();

    if (previousAgentId !== activeAgentId) {
      activePath = null;
      activeLabel = null;
      activeSystemFile = null;
      clearMediaSidecarEditor();
      showHomeView();
      await loadSystemFiles();
    }
    await refreshMenu();
    showToast("Список агентов сохранён", "success");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showToast(message ? `Ошибка сохранения агентов: ${message}` : "Ошибка сохранения агентов", "error");
  } finally {
    agentsRegistrySaveBtn.disabled = false;
    agentsRegistrySaveBtn.textContent = "Сохранить";
  }
}

const NAVIGATION_GROUP = {
  id: "navigation",
  title: "Навигация",
  icon: "🧭",
  modes: [
    { id: "graph", label: "Граф", disabled: true },
    { id: "moc", label: "Карта (moc)", disabled: true },
    { id: "index", label: "Индекс", disabled: true }
  ]
};

const EXTRA_GROUP = {
  id: "extra",
  title: "Дополнительно",
  icon: "✨",
  modes: [
    { id: "vectorization", label: "Векторизация", disabled: true }
  ]
};

const NODE_SETTINGS_GROUP = {
  id: "main",
  title: "Настройки",
  icon: "⚙️",
  modes: [
    { id: "description", label: "Назначение" },
    { id: "configs", label: "Конфигурации" },
    { id: "scripts", label: "Скрипты" },
    { id: "env", label: ".env" },
    { id: "todo", label: "TODO" },
    { id: "node-preview", label: "Превью" }
  ]
};

const NODE_AUTO_GROUP = {
  id: "auto",
  title: "Автоматизация",
  icon: "⚡",
  modes: [
    { id: "schedule", label: "Задачи по расписанию", disabled: true },
    { id: "heartbeat", label: "Heartbeat (сердцебиение)", disabled: true }
  ]
};

const MODE_GROUPS = [
  {
    id: "memory",
    title: "Память",
    icon: "🧠",
    modes: [
      { id: "inbox", label: "Входящие" },
      { id: "external", label: "Многофайловая" },
      { id: "internal", label: "Однофайловая" },
      { id: "tabular", label: "Табличная" },
      { id: "external-db", label: "Реляционная БД", disabled: true },
      { id: "references", label: "Источники" },
      { id: "volume", label: "Рассуждения (volume)", disabled: true }
    ]
  },
  {
    id: "files",
    title: "Файлы",
    icon: "📎",
    modes: [
      { id: "media", label: "Медиа и документы" }
    ]
  }
];

function getNodeSettingsModeGroups() {
  return [NODE_SETTINGS_GROUP, NODE_AUTO_GROUP];
}

function getNodeGraphModeGroups() {
  return [...MODE_GROUPS, NAVIGATION_GROUP, EXTRA_GROUP];
}

function getAllModeGroups() {
  return [...getNodeSettingsModeGroups(), ...MODE_GROUPS, EXTRA_GROUP];
}

function getOverviewModeGroups() {
  const byId = new Map(getAllModeGroups().map((group) => [group.id, group]));
  const order = ["files", "main", "auto", "memory", "extra"];
  const ordered = [];
  for (const id of order) {
    const group = byId.get(id);
    if (group) ordered.push(group);
  }
  for (const group of getAllModeGroups()) {
    if (!ordered.includes(group)) ordered.push(group);
  }
  return ordered;
}

const NODE_OVERVIEW_MODE = "overview";
const NODE_NAVIGATION_MODE = "navigation";

/** @type {Record<string, "overview"|"document"|"browser"|"asset"|"canvas">} */
const NODE_VIEW_SURFACE = {
  overview: "overview",
  navigation: "overview",
  description: "document",
  internal: "document",
  tabular: "table",
  configs: "document",
  env: "document",
  todo: "document",
  external: "browser",
  inbox: "browser",
  references: "browser",
  media: "browser",
  scripts: "browser",
  "node-preview": "asset",
  graph: "canvas"
};

function getNodeViewSurface(mode = activeContentMode) {
  return NODE_VIEW_SURFACE[mode] || "document";
}

const OVERVIEW_HERO_PROP_KEYS = new Set(["AWN-TITLE", "title", "AWN-DESC", "summary", "AWN-TYPE"]);
const OVERVIEW_META_PROP_KEYS = [
  "AWN-STATUS",
  "AWN-PRIORITY",
  "AWN-LOAD",
  "AWN-MEMORY",
  "AWN-CATEGORY",
  "AWN-VERSION",
  "AWN-UPDATED",
  "AWN-TRIGGERS",
  "tags",
  "status",
  "priority"
];

let activeSystemFile = null;
let activePath = null;
let activeLabel = null;
let toastTimer = null;
let pendingConfirmResolve = null;
let createTargetParentPath = ".";
let createModalBaseParentPath = ".";
/** Агент, для которого открыта модалка «Создать» (защита от гонки при переключении). */
let createModalAgentId = null;
let createModalEmptyFolder = false;
let currentMenuData = null;
let menuSearchQuery = "";
let menuViewMode = "tree";
let agentWorkspaceView = loadAgentWorkspaceView();
let agentVaultSearchQuery = "";
let agentMapLinksResizeObserver = null;
let agentMap2LinksResizeObserver = null;
const menuCacheByAgent = new Map();
const menuAgentPanes = new Map();
const COLLAPSED_FOLDERS_STORAGE_KEY = "agentcms.collapsedFolders.v2";
const COLLAPSED_FOLDERS_LEGACY_STORAGE_KEY = "agentcms.collapsedFolders.v1";
const BOOKMARKS_STORAGE_KEY = "agentcms.bookmarks.v1";
const NODE_DEFAULT_VIEW_STORAGE_KEY = "agentcms.nodeDefaultView.v1";
const NODE_CONFIG_HEADER = "# Agent CMS — конфигурация\n";
const NODE_CONFIG_DEFAULT_LANDING_KEY = "default_landing_mode";
const CARDS_PREVIEW_ONLY_STORAGE_KEY = "agentcms.cardsPreviewOnly.v1";
const MENU_TREE_SETTINGS_STORAGE_KEY = "agentcms.menuTreeSettings.v1";
const AGENT_GRAPH_SETTINGS_STORAGE_KEY = "agentcms.agentGraphSettings.v1";
const SIDEBAR_WIDTH_STORAGE_KEY = "agentcms.sidebarWidth.v1";
const SIDEBAR_WIDTH_DEFAULT = 280;
const SIDEBAR_WIDTH_MIN = 200;
const SIDEBAR_WIDTH_MAX = 520;
const SIDEBAR_WIDTH_STEP = 20;
const OVERVIEW_ACCORDION_STORAGE_KEY = "agentcms.overviewAccordions.v1";
const OVERVIEW_ACCORDION_GROUP_IDS = new Set(["memory", "main", "files", "children"]);
const collapsedFoldersByAgent = loadCollapsedFoldersByAgent();
const bookmarkedPaths = loadBookmarks();
const menuTreeSettingsByAgent = loadMenuTreeSettingsByAgent();
const agentGraphSettingsByAgent = loadAgentGraphSettingsByAgent();
let menuCardsPreviewOnly = loadCardsPreviewOnly();
let contentSearchTimer = null;
let contentSearchRequestId = 0;
const NODE_OPEN_MEMORY_MODE = "internal";
const NODE_SETTINGS_MODE_IDS = new Set(["description", "configs", "scripts", "env", "todo", "node-preview"]);
const NODE_SETTINGS_AUTO_MODE_IDS = new Set(["schedule", "heartbeat"]);
const NODE_MEMORY_MODE_IDS = new Set([
  "inbox",
  "external",
  "internal",
  "tabular",
  "external-db",
  "references",
  "volume",
  "media"
]);
const NODE_MEMORY_SUB_MODE_IDS = new Set([
  "external",
  "internal",
  "tabular",
  "external-db",
  "volume",
  "media"
]);
const NODE_SETTINGS_CLOSE_MODES = new Set(["description", "todo"]);
const NODE_MEMORY_CLOSE_MODES = new Set(["external", "internal", "tabular"]);
const NODE_WORKSPACE_DOMAIN_OVERVIEW = "overview";
const NODE_WORKSPACE_DOMAIN_SETTINGS = "settings";
const NODE_WORKSPACE_DOMAIN_INBOX = "inbox";
const NODE_WORKSPACE_DOMAIN_MEMORY = "memory";
const NODE_WORKSPACE_DOMAIN_REFERENCES = "references";
const NODE_WORKSPACE_DOMAIN_NAVIGATION = "navigation";

const nodeConfigCacheByPath = new Map();

function getNodeWorkspaceDomain(mode = activeContentMode) {
  if (mode === NODE_OVERVIEW_MODE) return NODE_WORKSPACE_DOMAIN_OVERVIEW;
  if (mode === NODE_NAVIGATION_MODE) return NODE_WORKSPACE_DOMAIN_NAVIGATION;
  if (isNodeSettingsSelectMode(mode)) return NODE_WORKSPACE_DOMAIN_SETTINGS;
  if (mode === "inbox") return NODE_WORKSPACE_DOMAIN_INBOX;
  if (mode === "references") return NODE_WORKSPACE_DOMAIN_REFERENCES;
  if (NODE_MEMORY_SUB_MODE_IDS.has(mode)) return NODE_WORKSPACE_DOMAIN_MEMORY;
  return NODE_WORKSPACE_DOMAIN_SETTINGS;
}

function isNodeWorkspaceToolbarDomainActive(mode = activeContentMode) {
  if (!activePath || activeSystemFile || isGraphModeActive()) {
    return false;
  }
  const domain = getNodeWorkspaceDomain(mode);
  return (
    domain === NODE_WORKSPACE_DOMAIN_OVERVIEW ||
    domain === NODE_WORKSPACE_DOMAIN_SETTINGS ||
    domain === NODE_WORKSPACE_DOMAIN_INBOX ||
    domain === NODE_WORKSPACE_DOMAIN_MEMORY ||
    domain === NODE_WORKSPACE_DOMAIN_REFERENCES ||
    domain === NODE_WORKSPACE_DOMAIN_NAVIGATION
  );
}

function isNodeWorkspaceBreadcrumbDomain(mode = activeContentMode) {
  return isNodeWorkspaceToolbarDomainActive(mode);
}

function isNodeSettingsSelectMode(mode) {
  return NODE_SETTINGS_MODE_IDS.has(mode) || NODE_SETTINGS_AUTO_MODE_IDS.has(mode);
}

function isNodeMemorySelectMode(mode) {
  return NODE_MEMORY_MODE_IDS.has(mode);
}

function isSettingsDomainActive(mode = activeContentMode) {
  return isNodeSettingsSelectMode(mode);
}

function isMemoryDomainActive(mode = activeContentMode) {
  return isNodeMemorySelectMode(mode);
}

function isOverviewDomainActive(mode = activeContentMode) {
  return mode === NODE_OVERVIEW_MODE;
}

let activeContentMode = NODE_OPEN_MEMORY_MODE;
let nodeSettingsViewActive = false;
let nodeMemoryViewActive = false;
const WYSIWYG_EDITOR_ENABLED = true;
let wysiwygEditorInstance = null;
let wysiwygEditorResizeObserver = null;
const EDITOR_LINE_NUMBERS_STORAGE_KEY = "agentcms.editorLineNumbers";
let editorLineNumbersEnabled = readStorageItem(EDITOR_LINE_NUMBERS_STORAGE_KEY) === "1";
const EDITOR_VIEW_MODE_STORAGE_KEY = "agentcms.editorViewMode";
const _savedEditorViewMode = readStorageItem(EDITOR_VIEW_MODE_STORAGE_KEY);
let editorViewMode = (_savedEditorViewMode === "preview" || _savedEditorViewMode === "source") ? _savedEditorViewMode : "source";
let externalViewMode = "table";
let mediaViewMode = "all";
let mediaFilesCache = {};
let mediaAssetsExists = true;
let activeStorageFolderExists = true;
let externalFilesCache = [];
let tabularDataCache = { columns: [], rows: [], rowCount: 0 };
let activeMemorySummary = null;
let nodeOverviewRenderSeq = 0;
let activeExternalFilePath = null;
let activeMediaSidecarSourcePath = null;
let activeMediaSidecarPath = null;
let systemFilesCache = [];
const modeContentCache = {
  description: "",
  internal: "",
  external: "",
  tabular: "",
  inbox: "",
  references: "",
  media: "",
  configs: "",
  env: "",
  scripts: "",
  todo: ""
};

function clampSidebarWidth(value) {
  return Math.min(SIDEBAR_WIDTH_MAX, Math.max(SIDEBAR_WIDTH_MIN, value));
}

function loadSidebarWidth() {
  try {
    const raw = readStorageItem(SIDEBAR_WIDTH_STORAGE_KEY);
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed)) return SIDEBAR_WIDTH_DEFAULT;
    return clampSidebarWidth(parsed);
  } catch {
    return SIDEBAR_WIDTH_DEFAULT;
  }
}

let sidebarWidth = loadSidebarWidth();

function applySidebarWidth(width = sidebarWidth) {
  sidebarWidth = clampSidebarWidth(width);
  document.documentElement.style.setProperty("--sidebar-width", `${sidebarWidth}px`);
  syncSidebarWidthControls();
  if (!menuSettingsPopoverNode?.classList.contains("hidden")) {
    requestAnimationFrame(() => positionMenuSettingsPopover());
  }
}

function saveSidebarWidth() {
  try {
    localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(sidebarWidth));
  } catch {
    // Ignore storage write issues (private mode, quota, etc.)
  }
}

function syncSidebarWidthControls() {
  if (sidebarWidthDecreaseBtn) {
    sidebarWidthDecreaseBtn.disabled = sidebarWidth <= SIDEBAR_WIDTH_MIN;
  }
  if (sidebarWidthIncreaseBtn) {
    sidebarWidthIncreaseBtn.disabled = sidebarWidth >= SIDEBAR_WIDTH_MAX;
  }
}

function changeSidebarWidth(delta) {
  applySidebarWidth(sidebarWidth + delta);
  saveSidebarWidth();
}

applySidebarWidth();

function normalizeFolderPath(folderPath) {
  const raw = String(folderPath || "").trim().replace(/\\/g, "/");
  if (!raw || raw === ".") return ".";
  return raw.replace(/^\/+/, "").replace(/\/+$/, "");
}

function resolveSectionFolderPath(node, parentSectionPath = "", depth = 0) {
  if (depth === 0) return ".";
  return normalizeFolderPath(getSectionFolderPath(node, parentSectionPath));
}

function migrateAgentCollapsedFolderKeys(agentId = activeAgentId) {
  const set = getAgentCollapsedFolders(agentId);
  const agentName = String(agentsCache.find((agent) => agent.id === agentId)?.name || "").trim();
  if (!agentName || set.size === 0) return;

  let changed = false;
  for (const path of Array.from(set)) {
    if (path === agentName) {
      set.delete(path);
      set.add(".");
      changed = true;
      continue;
    }
    const prefix = `${agentName}/`;
    if (path.startsWith(prefix)) {
      set.delete(path);
      set.add(normalizeFolderPath(path.slice(prefix.length)));
      changed = true;
    }
  }
  if (changed) saveCollapsedFoldersByAgent();
}

function migrateAllAgentCollapsedFolderKeys() {
  for (const agent of agentsCache) {
    migrateAgentCollapsedFolderKeys(agent.id);
  }
}

function getAgentCollapsedFolders(agentId = activeAgentId) {
  const id = agentId || activeAgentId || "main";
  if (!collapsedFoldersByAgent[id]) {
    collapsedFoldersByAgent[id] = new Set();
  }
  return collapsedFoldersByAgent[id];
}

function isFolderCollapsed(folderPath, agentId = activeAgentId) {
  if (!folderPath) return false;
  return getAgentCollapsedFolders(agentId).has(normalizeFolderPath(folderPath));
}

function loadCollapsedFoldersByAgent() {
  const byAgent = {};

  const addPath = (agentId, folderPath) => {
    const id = String(agentId || "main").trim() || "main";
    const path = normalizeFolderPath(folderPath);
    if (!path) return;
    if (!byAgent[id]) byAgent[id] = new Set();
    byAgent[id].add(path);
  };

  try {
    const rawV2 = readStorageItem(COLLAPSED_FOLDERS_STORAGE_KEY);
    if (rawV2) {
      const parsed = JSON.parse(rawV2);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        for (const [agentId, paths] of Object.entries(parsed)) {
          if (!Array.isArray(paths)) continue;
          for (const folderPath of paths) {
            if (typeof folderPath === "string" && folderPath.length > 0) {
              addPath(agentId, folderPath);
            }
          }
        }
        return byAgent;
      }
    }
  } catch {
    // fall through to legacy migration
  }

  try {
    const rawLegacy =
      readStorageItem(COLLAPSED_FOLDERS_LEGACY_STORAGE_KEY) ||
      localStorage.getItem("yamlcms.collapsedFolders.v1");
    if (!rawLegacy) return byAgent;
    const parsed = JSON.parse(rawLegacy);
    if (!Array.isArray(parsed)) return byAgent;
    for (const item of parsed) {
      if (typeof item !== "string" || !item.length) continue;
      if (item.includes(":")) {
        const separatorIndex = item.indexOf(":");
        addPath(item.slice(0, separatorIndex), item.slice(separatorIndex + 1));
      } else {
        addPath("main", item);
      }
    }
  } catch {
    return byAgent;
  }

  return byAgent;
}

function saveCollapsedFoldersByAgent() {
  try {
    const payload = {};
    for (const [agentId, paths] of Object.entries(collapsedFoldersByAgent)) {
      if (!paths || paths.size === 0) continue;
      payload[agentId] = Array.from(paths);
    }
    localStorage.setItem(COLLAPSED_FOLDERS_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage write issues (private mode, quota, etc.)
  }
}

function loadBookmarks() {
  try {
    const raw = readStorageItem(BOOKMARKS_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((item) => typeof item === "string" && item.length > 0).map(normalizeStorageKey));
  } catch {
    return new Set();
  }
}

function readLegacyNodeDefaultViewsFromStorage() {
  try {
    const raw = readStorageItem(NODE_DEFAULT_VIEW_STORAGE_KEY);
    if (!raw) return new Map();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return new Map();
    const map = new Map();
    for (const [key, value] of Object.entries(parsed)) {
      if (!key || !value || typeof value !== "object") continue;
      const mode = String(value.mode || "").trim();
      if (!mode) continue;
      map.set(normalizeStorageKey(key), { mode });
    }
    return map;
  } catch {
    return new Map();
  }
}

function removeLegacyNodeDefaultViewFromStorage(storageKey) {
  const legacyViews = readLegacyNodeDefaultViewsFromStorage();
  if (!legacyViews.has(storageKey)) return;
  legacyViews.delete(storageKey);
  try {
    if (legacyViews.size === 0) {
      localStorage.removeItem(NODE_DEFAULT_VIEW_STORAGE_KEY);
      return;
    }
    const payload = {};
    for (const [key, value] of legacyViews.entries()) {
      payload[key] = { mode: value.mode };
    }
    localStorage.setItem(NODE_DEFAULT_VIEW_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore storage errors
  }
}

function isValidNodeDefaultLandingMode(mode) {
  if (!mode || mode === "graph") return false;
  if (mode === NODE_OVERVIEW_MODE || mode === NODE_NAVIGATION_MODE) return true;
  if (mode === "inbox" || mode === "references") return true;
  if (NODE_SETTINGS_MODE_IDS.has(mode)) return true;
  if (NODE_MEMORY_SUB_MODE_IDS.has(mode)) return true;
  return false;
}

function getNodeConfigCacheKey(nodePath, agentId = activeAgentId) {
  return nodeStorageKey(agentId, nodePath);
}

function getCachedNodeConfig(nodePath, agentId = activeAgentId) {
  if (!nodePath) return null;
  return nodeConfigCacheByPath.get(getNodeConfigCacheKey(nodePath, agentId)) || null;
}

function setCachedNodeConfig(nodePath, payload, agentId = activeAgentId) {
  if (!nodePath) return;
  nodeConfigCacheByPath.set(getNodeConfigCacheKey(nodePath, agentId), {
    path: payload?.path || "",
    content: payload?.content || "",
    exists: Boolean(payload?.exists),
    defaultLandingMode: payload?.defaultLandingMode || null
  });
}

function invalidateNodeConfigCache(nodePath, agentId = activeAgentId) {
  if (!nodePath) return;
  nodeConfigCacheByPath.delete(getNodeConfigCacheKey(nodePath, agentId));
}

function buildNodeConfigContent(entries) {
  const body = stringifyPropsYaml(entries).trim();
  if (!body) return "";
  return `${NODE_CONFIG_HEADER}${body}\n`;
}

function parseNodeConfigContent(content) {
  const text = String(content || "").replace(/^\uFEFF/, "");
  const body = text.replace(/^#.*$/gm, "").trim();
  const entries = parsePropsYaml(body);
  const mode = getPropsEntryValueByKey(entries, NODE_CONFIG_DEFAULT_LANDING_KEY);
  return {
    entries,
    defaultLandingMode: mode && isValidNodeDefaultLandingMode(mode) ? mode : null
  };
}

function buildNodeConfigEntriesWithDefaultLanding(entries, mode) {
  const next = (Array.isArray(entries) ? entries : []).filter(
    (entry) => entry.key !== NODE_CONFIG_DEFAULT_LANDING_KEY
  );
  if (mode && isValidNodeDefaultLandingMode(mode)) {
    next.push({ key: NODE_CONFIG_DEFAULT_LANDING_KEY, kind: "string", value: mode });
  }
  return next;
}

async function loadNodeConfig(nodePath, options = {}) {
  if (!nodePath || !isNodeMdPath(nodePath)) {
    return { path: "", content: "", exists: false, defaultLandingMode: null };
  }

  const agentId = options.agentId || activeAgentId;
  if (!options.force) {
    const cached = getCachedNodeConfig(nodePath, agentId);
    if (cached) return cached;
  }

  const response = await fetch(buildApiUrl("/api/file/node-config", { path: nodePath }, agentId));
  if (!response.ok) throw new Error(`Request failed with ${response.status}`);
  const data = await response.json();
  const parsed = parseNodeConfigContent(data.content || "");
  const payload = {
    path: data.path || "",
    content: data.content || "",
    exists: Boolean(data.exists),
    defaultLandingMode:
      (data.defaultLandingMode && isValidNodeDefaultLandingMode(data.defaultLandingMode)
        ? data.defaultLandingMode
        : null) || parsed.defaultLandingMode
  };

  if (agentId === activeAgentId && !payload.defaultLandingMode) {
    const legacyKey = nodeStorageKey(agentId, nodePath);
    const legacyViews = readLegacyNodeDefaultViewsFromStorage();
    const legacy = legacyViews.get(legacyKey);
    if (legacy?.mode && isValidNodeDefaultLandingMode(legacy.mode)) {
      try {
        const migrated = await saveNodeConfigDefaultLanding(nodePath, legacy.mode, { agentId, skipMigration: true });
        removeLegacyNodeDefaultViewFromStorage(legacyKey);
        setCachedNodeConfig(nodePath, migrated, agentId);
        return migrated;
      } catch {
        payload.defaultLandingMode = legacy.mode;
      }
    }
  }

  setCachedNodeConfig(nodePath, payload, agentId);
  return payload;
}

async function saveNodeConfigContent(nodePath, content, agentId = activeAgentId) {
  const response = await fetch(buildApiUrl("/api/file/node-config", {}, agentId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: nodePath, content })
  });
  if (!response.ok) {
    const details = await response.text();
    throw new Error(details || `Request failed with ${response.status}`);
  }
  const data = await response.json();
  const parsed = parseNodeConfigContent(data.content || "");
  const payload = {
    path: data.path || "",
    content: data.content || "",
    exists: Boolean(data.exists),
    defaultLandingMode:
      (data.defaultLandingMode && isValidNodeDefaultLandingMode(data.defaultLandingMode)
        ? data.defaultLandingMode
        : null) || parsed.defaultLandingMode
  };
  setCachedNodeConfig(nodePath, payload, agentId);
  return payload;
}

async function saveNodeConfigDefaultLanding(nodePath, mode, options = {}) {
  const agentId = options.agentId || activeAgentId;
  const current = options.skipMigration
    ? parseNodeConfigContent("")
    : parseNodeConfigContent((await loadNodeConfig(nodePath, { agentId, force: true })).content || "");
  const entries = buildNodeConfigEntriesWithDefaultLanding(current.entries, mode);
  const content = buildNodeConfigContent(entries);
  return saveNodeConfigContent(nodePath, content, agentId);
}

function getNodeDefaultView(nodePath) {
  if (!nodePath) return null;
  const cached = getCachedNodeConfig(nodePath);
  if (!cached?.defaultLandingMode) return null;
  return { mode: cached.defaultLandingMode };
}

async function setNodeDefaultView(nodePath, mode) {
  if (!nodePath || !isValidNodeDefaultLandingMode(mode)) return;
  await saveNodeConfigDefaultLanding(nodePath, mode);
  removeLegacyNodeDefaultViewFromStorage(nodeStorageKey(activeAgentId, nodePath));
}

async function clearNodeDefaultView(nodePath) {
  if (!nodePath) return;
  await saveNodeConfigDefaultLanding(nodePath, null);
  removeLegacyNodeDefaultViewFromStorage(nodeStorageKey(activeAgentId, nodePath));
}

function getContentModeLabel(mode) {
  if (mode === NODE_OVERVIEW_MODE) return "Обзор";
  if (mode === NODE_NAVIGATION_MODE) return "Навигация";
  for (const group of getAllModeGroups()) {
    const match = (group.modes || []).find((item) => item.id === mode);
    if (match) return match.label;
  }
  if (mode === "inbox") return "Входящие";
  if (mode === "references") return "Источники";
  return mode;
}

function getNodeDefaultLandingDomainLabel(mode) {
  const domain = getNodeWorkspaceDomain(mode);
  const domainLabels = {
    [NODE_WORKSPACE_DOMAIN_OVERVIEW]: "Обзор",
    [NODE_WORKSPACE_DOMAIN_SETTINGS]: "Настройки",
    [NODE_WORKSPACE_DOMAIN_MEMORY]: "Память",
    [NODE_WORKSPACE_DOMAIN_INBOX]: "Входящие",
    [NODE_WORKSPACE_DOMAIN_REFERENCES]: "Источники",
    [NODE_WORKSPACE_DOMAIN_NAVIGATION]: "Навигация"
  };
  const domainLabel = domainLabels[domain] || domain;
  const modeLabel = getContentModeLabel(mode);
  if (domain === NODE_WORKSPACE_DOMAIN_OVERVIEW || domain === NODE_WORKSPACE_DOMAIN_NAVIGATION) return domainLabel;
  if (domain === NODE_WORKSPACE_DOMAIN_INBOX || domain === NODE_WORKSPACE_DOMAIN_REFERENCES) {
    return domainLabel;
  }
  if (modeLabel && modeLabel !== domainLabel) {
    return `${domainLabel} → ${modeLabel}`;
  }
  return domainLabel;
}

function syncNodeDefaultLandingBtn() {
  const btn = nodeDefaultLandingBtn;
  if (!btn) return;

  const saved = getNodeDefaultView(activePath);
  const currentMode = activeContentMode;
  const currentIsSaved = Boolean(saved?.mode && saved.mode === currentMode);
  const hasCustom = Boolean(saved?.mode);

  btn.classList.toggle("is-active", currentIsSaved);
  btn.classList.toggle("has-custom", hasCustom && !currentIsSaved);
  btn.setAttribute("aria-pressed", currentIsSaved ? "true" : "false");

  if (currentIsSaved) {
    btn.title = `Стартовая страница в ${BUNDLE_CONFIG_FILE} (_Storage): ${getNodeDefaultLandingDomainLabel(saved.mode)}. Нажмите, чтобы сбросить (открывать обзор).`;
  } else if (hasCustom) {
    btn.title = `В конфиге: ${getNodeDefaultLandingDomainLabel(saved.mode)}. Нажмите, чтобы сохранить текущий раздел (${getNodeDefaultLandingDomainLabel(currentMode)}).`;
  } else {
    btn.title = `Закрепить в ${BUNDLE_CONFIG_FILE} (_Storage): ${getNodeDefaultLandingDomainLabel(currentMode)}`;
  }
}

async function toggleNodeDefaultLanding() {
  if (!activePath || activeSystemFile || !isNodeWorkspaceToolbarDomainActive()) return;
  if (!isValidNodeDefaultLandingMode(activeContentMode)) return;

  const saved = getNodeDefaultView(activePath);
  try {
    if (saved?.mode === activeContentMode) {
      await clearNodeDefaultView(activePath);
      showToast("Стартовая страница сброшена — при открытии будет обзор", "info");
    } else {
      await setNodeDefaultView(activePath, activeContentMode);
      showToast(`Стартовая страница сохранена в ${BUNDLE_CONFIG_FILE}: ${getNodeDefaultLandingDomainLabel(activeContentMode)}`, "success");
    }
  } catch (error) {
    showToast(`Не удалось сохранить конфигурацию: ${error.message}`, "error");
  }
  syncNodeDefaultLandingBtn();
}

function loadCardsPreviewOnly() {
  try {
    return readStorageItem(CARDS_PREVIEW_ONLY_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function saveCardsPreviewOnly(value) {
  try {
    localStorage.setItem(CARDS_PREVIEW_ONLY_STORAGE_KEY, value ? "1" : "0");
  } catch {
    // ignore storage errors
  }
}

function loadMenuTreeSettingsByAgent() {
  try {
    const raw = localStorage.getItem(MENU_TREE_SETTINGS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function getMenuTreeSettings(agentId = activeAgentId) {
  const stored = menuTreeSettingsByAgent[agentId] || {};
  return {
    showEmptyFolders: stored.showEmptyFolders !== false,
    padSortIndexes: Boolean(stored.padSortIndexes)
  };
}

function saveMenuTreeSettings(agentId, patch) {
  const current = getMenuTreeSettings(agentId);
  menuTreeSettingsByAgent[agentId] = { ...current, ...patch };
  try {
    localStorage.setItem(MENU_TREE_SETTINGS_STORAGE_KEY, JSON.stringify(menuTreeSettingsByAgent));
  } catch {
    // ignore storage errors
  }
}

function loadAgentGraphSettingsByAgent() {
  try {
    const raw = localStorage.getItem(AGENT_GRAPH_SETTINGS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function getAgentGraphSettings(agentId = activeAgentId) {
  const stored = agentGraphSettingsByAgent[agentId] || {};
  return {
    showPreviews: stored.showPreviews !== false
  };
}

function saveAgentGraphSettings(agentId, patch) {
  const current = getAgentGraphSettings(agentId);
  agentGraphSettingsByAgent[agentId] = { ...current, ...patch };
  try {
    localStorage.setItem(AGENT_GRAPH_SETTINGS_STORAGE_KEY, JSON.stringify(agentGraphSettingsByAgent));
  } catch {
    // ignore storage errors
  }
}

function applyAgentGraphSettingsUi(agentId = activeAgentId) {
  const settings = getAgentGraphSettings(agentId);
  if (agentGraphShowPreviewsNode) {
    agentGraphShowPreviewsNode.checked = settings.showPreviews;
  }
}

function applyMenuTreeSettingsUi(agentId = activeAgentId) {
  const settings = getMenuTreeSettings(agentId);
  if (menuTreeShowEmptyFoldersNode) {
    menuTreeShowEmptyFoldersNode.checked = settings.showEmptyFolders;
  }
  if (menuTreePadSortIndexesNode) {
    menuTreePadSortIndexesNode.checked = settings.padSortIndexes;
  }
}

function resetMenuSettingsPopoverPosition() {
  if (!menuSettingsPopoverNode) return;
  for (const prop of ["top", "left", "width", "maxHeight", "overflowY"]) {
    menuSettingsPopoverNode.style.removeProperty(prop);
  }
}

function positionMenuSettingsPopover() {
  const popover = menuSettingsPopoverNode;
  const anchor = menuSettingsBtn?.closest(".menu-view-wrap");
  if (!popover || !anchor || popover.classList.contains("hidden")) return;

  const rect = anchor.getBoundingClientRect();
  const width = Math.min(280, Math.max(Math.round(rect.width), 200));
  const left = Math.round(rect.left + rect.width - width);
  const top = Math.round(rect.bottom + 6);
  const maxHeight = Math.max(120, window.innerHeight - top - 12);

  popover.style.top = `${top}px`;
  popover.style.left = `${left}px`;
  popover.style.width = `${width}px`;
  popover.style.maxHeight = `${maxHeight}px`;
  popover.style.overflowY = "auto";
}

function closeMenuSettingsPopover() {
  menuSettingsPopoverNode?.classList.add("hidden");
  menuSettingsBtn?.setAttribute("aria-expanded", "false");
  resetMenuSettingsPopoverPosition();
}

function toggleMenuSettingsPopover() {
  if (!menuSettingsPopoverNode || !menuSettingsBtn) return;
  const willOpen = menuSettingsPopoverNode.classList.contains("hidden");
  if (willOpen) {
    applyMenuTreeSettingsUi();
    menuSettingsPopoverNode.classList.remove("hidden");
    menuSettingsBtn.setAttribute("aria-expanded", "true");
    positionMenuSettingsPopover();
  } else {
    closeMenuSettingsPopover();
  }
}

function formatMenuTreeSortLabel(sortKey, parentNode, displayLabel = sortKey, agentId = activeAgentId) {
  const label = displayLabel ?? sortKey ?? "";
  const key = String(sortKey || "").trim();
  const settings = getMenuTreeSettings(agentId);
  if (!settings.padSortIndexes || !key) return label;
  const order = Array.isArray(parentNode?.menuOrder) ? parentNode.menuOrder : null;
  if (!order?.length) return label;
  const sortIndex = order.indexOf(key);
  if (sortIndex < 0) return label;
  const width = Math.max(2, String(order.length).length);
  return `${String(sortIndex + 1).padStart(width, "0")} ${label}`;
}

function formatMenuTreeItemLabel(item, parentNode, agentId = activeAgentId) {
  return formatMenuTreeSortLabel(item?.label, parentNode, item?.label, agentId);
}

function getMenuTreeFolderSortKey(node) {
  if (!node) return "";
  return node.title || (node.indexPath ? getLabelFromPath(node.indexPath) : "");
}

function shouldShowMenuTreeFolder(node, agentId = activeAgentId) {
  if (!node) return false;
  if (getMenuTreeSettings(agentId).showEmptyFolders) return true;
  if (node.empty) return false;
  if (node.indexPath || (node.items?.length > 0)) return true;
  return getOrderedMenuChildren(node).some((child) => {
    if (child.kind === "item") return true;
    if (child.kind === "folder") return shouldShowMenuTreeFolder(child.entry, agentId);
    return true;
  });
}

function getVisibleMenuChildren(node, agentId = activeAgentId) {
  return getOrderedMenuChildren(node).filter((child) => {
    if (child.kind === "folder") return shouldShowMenuTreeFolder(child.entry, agentId);
    return true;
  });
}

function applyMenuCardsFilterUi() {
  menuCardsFilterWrapNode?.classList.toggle("hidden", menuViewMode !== "cards");
  if (menuCardsPreviewOnlyNode) {
    menuCardsPreviewOnlyNode.checked = menuCardsPreviewOnly;
  }
}

function saveBookmarks() {
  try {
    localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(Array.from(bookmarkedPaths)));
  } catch {
    // Ignore storage write issues (private mode, quota, etc.)
  }
}

function isBookmarked(nodePath) {
  return bookmarkedPaths.has(nodeStorageKey(activeAgentId, nodePath));
}

function toggleBookmark(nodePath) {
  const key = nodeStorageKey(activeAgentId, nodePath);
  if (!nodePath) return;
  if (bookmarkedPaths.has(key)) {
    bookmarkedPaths.delete(key);
  } else {
    bookmarkedPaths.add(key);
  }
  saveBookmarks();
  if (menuViewMode === "bookmarks" && currentMenuData) {
    renderMenu(currentMenuData);
    updateActiveButton();
  } else {
    updateBookmarkButtonStates();
  }
}

function updateBookmarkButtonStates() {
  const root = appRootNode || document;
  for (const btn of root.querySelectorAll(".bookmark-btn")) {
    const nodePath = btn.dataset.path || "";
    const on = isBookmarked(nodePath);
    btn.classList.toggle("bookmarked", on);
    btn.textContent = on ? "★" : "☆";
    btn.title = on ? "Убрать из закладок" : "Добавить в закладки";
  }
}

function isContainerNodePath(nodePath) {
  return isNodeManifestPath(nodePath) && !isPartNodePath(nodePath);
}

/** Область (Space): папка с _.x.md — без драйверов памяти. */
function isAreaNodePath(nodePath = getResolvedNodePath(activePath)) {
  return isContainerNodePath(nodePath);
}

function isMemoryDriverModeBlockedForActivePath(mode) {
  return isAreaNodePath() && MEMORY_DRIVER_MODES.has(mode);
}

function isNodeSettingsTargetPath(nodePath) {
  return isNodeMdPath(nodePath);
}

async function selectNodeManifest(label, filePath, contentMode) {
  await selectFile(label, filePath);
  if (contentMode) setContentMode(contentMode);
}

async function openNodeOverview(label, filePath) {
  nodeSettingsViewActive = false;
  nodeMemoryViewActive = false;
  await selectNodeManifest(label, filePath, NODE_OVERVIEW_MODE);
  applyNodeWorkspaceViewUi();
}

async function openNodeNavigation(label, filePath) {
  nodeSettingsViewActive = false;
  nodeMemoryViewActive = false;
  await selectNodeManifest(label, filePath, NODE_NAVIGATION_MODE);
  applyNodeWorkspaceViewUi();
}

async function openNodeFromMenu(label, filePath) {
  try {
    await loadNodeConfig(filePath);
  } catch {
    // ignore config read errors — fallback to navigation
  }
  const defaultView = getNodeDefaultView(filePath);
  if (defaultView?.mode && isValidNodeDefaultLandingMode(defaultView.mode)) {
    const landingMode =
      isContainerNodePath(filePath) && MEMORY_DRIVER_MODES.has(defaultView.mode)
        ? NODE_NAVIGATION_MODE
        : defaultView.mode;
    await selectNodeManifest(label, filePath, landingMode);
    return;
  }
  await openNodeNavigation(label, filePath);
}

async function openNodeMemory(label, filePath) {
  await openNodeMemoryWorkspace(label, filePath);
}

async function openNodeMemoryWorkspace(label, filePath) {
  nodeSettingsViewActive = false;
  nodeMemoryViewActive = true;
  const mode = await pickDefaultMemoryMode(filePath);
  await selectNodeManifest(label, filePath, mode);
  syncNodeMemoryModeSelect();
  applyNodeWorkspaceViewUi();
}

async function openNodeSettings(label, filePath) {
  nodeMemoryViewActive = false;
  nodeSettingsViewActive = true;
  await selectNodeManifest(label, filePath, "description");
  syncNodeSettingsModeSelect();
  applyNodeWorkspaceViewUi();
}

function syncNodeSettingsModeSelect() {
  if (!nodeSettingsModeSelectNode) return;
  if (isNodeSettingsSelectMode(activeContentMode)) {
    nodeSettingsModeSelectNode.value = activeContentMode;
  }
}

function syncNodeMemoryModeSelect() {
  if (!nodeMemoryModeSelectNode) return;
  syncNodeMemoryDriverOptions(activeMemorySummary);
  if (NODE_MEMORY_SUB_MODE_IDS.has(activeContentMode)) {
    nodeMemoryModeSelectNode.value = activeContentMode;
  }
}

function getNavigationSubsectionEntries() {
  if (!currentMenuData || !activePath || !isContainerNodePath(activePath)) return [];
  const baseTree = { title: getAgentTreeTitle(), ...currentMenuData };
  const menuNode = findOverviewChildrenSourceNode(baseTree, activePath);
  const activeResolvedPath = normalizeMenuNodePath(getResolvedNodePath(activePath));
  return collectDirectChildNodeEntries(menuNode).filter(
    (entry) => normalizeMenuNodePath(entry.path) !== activeResolvedPath
  );
}

function syncNodeWorkspaceDomainSelect() {
  if (!nodeWorkspaceDomainSelectNode) return;
  const isArea = isAreaNodePath();
  const memoryOption = nodeWorkspaceDomainSelectNode.querySelector('option[value="memory"]');
  if (memoryOption) memoryOption.disabled = isArea;
  const domain = getNodeWorkspaceDomain(activeContentMode);
  if (isArea && domain === NODE_WORKSPACE_DOMAIN_MEMORY) {
    nodeWorkspaceDomainSelectNode.value = NODE_WORKSPACE_DOMAIN_NAVIGATION;
  } else {
    nodeWorkspaceDomainSelectNode.value = domain;
  }
}

function applyNodeWorkspaceDomainChange(domain) {
  if (domain === NODE_WORKSPACE_DOMAIN_OVERVIEW) {
    setContentMode(NODE_OVERVIEW_MODE);
    return;
  }
  if (domain === NODE_WORKSPACE_DOMAIN_SETTINGS) {
    nodeSettingsViewActive = true;
    nodeMemoryViewActive = false;
    const mode = nodeSettingsModeSelectNode?.value;
    if (mode && isNodeSettingsSelectMode(mode)) {
      setContentMode(mode);
      return;
    }
    setContentMode("description");
    return;
  }
  if (domain === NODE_WORKSPACE_DOMAIN_INBOX) {
    nodeMemoryViewActive = true;
    nodeSettingsViewActive = false;
    setContentMode("inbox");
    return;
  }
  if (domain === NODE_WORKSPACE_DOMAIN_MEMORY) {
    if (isAreaNodePath()) {
      returnToNodeNavigation();
      return;
    }
    nodeMemoryViewActive = true;
    nodeSettingsViewActive = false;
    if (NODE_MEMORY_SUB_MODE_IDS.has(activeContentMode)) {
      syncNodeMemoryModeSelect();
      applyNodeWorkspaceViewUi();
      return;
    }
    const mode = nodeMemoryModeSelectNode?.value;
    if (mode && NODE_MEMORY_SUB_MODE_IDS.has(mode)) {
      setContentMode(mode);
      return;
    }
    void pickDefaultMemoryMode(activePath).then((memoryMode) => setContentMode(memoryMode));
    return;
  }
  if (domain === NODE_WORKSPACE_DOMAIN_REFERENCES) {
    nodeMemoryViewActive = true;
    nodeSettingsViewActive = false;
    setContentMode("references");
    return;
  }
  if (domain === NODE_WORKSPACE_DOMAIN_NAVIGATION) {
    nodeSettingsViewActive = false;
    nodeMemoryViewActive = false;
    setContentMode(NODE_NAVIGATION_MODE);
  }
}

function applyNodeWorkspaceViewUi() {
  const workspaceDomain = getNodeWorkspaceDomain();
  const overviewDomain = workspaceDomain === NODE_WORKSPACE_DOMAIN_OVERVIEW;
  const settingsDomain = workspaceDomain === NODE_WORKSPACE_DOMAIN_SETTINGS;
  const memoryDomain = workspaceDomain === NODE_WORKSPACE_DOMAIN_MEMORY;
  const referencesDomain = workspaceDomain === NODE_WORKSPACE_DOMAIN_REFERENCES;
  const navigationDomain = workspaceDomain === NODE_WORKSPACE_DOMAIN_NAVIGATION;
  const inboxDomain = workspaceDomain === NODE_WORKSPACE_DOMAIN_INBOX;
  const showWorkspaceDomainControls = isNodeWorkspaceToolbarDomainActive();
  nodeSettingsViewActive = settingsDomain;
  nodeMemoryViewActive = memoryDomain || referencesDomain || inboxDomain;
  workspacePathHeaderNode?.classList.toggle("is-node-settings", settingsDomain);
  workspacePathHeaderNode?.classList.toggle("is-node-memory", memoryDomain || inboxDomain);
  workspacePathHeaderNode?.classList.toggle("is-node-references", referencesDomain);
  workspacePathHeaderNode?.classList.toggle("is-node-navigation", navigationDomain);
  workspacePathHeaderNode?.classList.toggle("is-node-overview", overviewDomain);
  nodeWorkspaceNavControlsNode?.classList.toggle("hidden", !showWorkspaceDomainControls);
  nodeNavigationPathControlsNode?.classList.toggle("hidden", !showWorkspaceDomainControls || !navigationDomain);
  nodeSettingsPathControlsNode?.classList.toggle("hidden", !showWorkspaceDomainControls || !settingsDomain);
  nodeMemoryPathControlsNode?.classList.toggle("hidden", !showWorkspaceDomainControls || !memoryDomain);
  syncNodeWorkspaceDomainSelect();
  if (
    isAreaNodePath() &&
    (getNodeWorkspaceDomain() === NODE_WORKSPACE_DOMAIN_MEMORY ||
      MEMORY_DRIVER_MODES.has(activeContentMode))
  ) {
    returnToNodeNavigation();
    return;
  }
  syncNodeDefaultLandingBtn();
  updateBreadcrumbsForActiveMode();
  syncWorkspaceCloseButtonsVisibility();
}

function returnToNodeNavigation() {
  if (!activePath) return;
  setContentMode(NODE_NAVIGATION_MODE);
}

function syncWorkspaceCloseButtonsVisibility() {
  const settingsDomain = getNodeWorkspaceDomain() === NODE_WORKSPACE_DOMAIN_SETTINGS;
  const memoryDomain = getNodeWorkspaceDomain() === NODE_WORKSPACE_DOMAIN_MEMORY;
  const showClose =
    (settingsDomain && NODE_SETTINGS_CLOSE_MODES.has(activeContentMode)) ||
    (memoryDomain && NODE_MEMORY_CLOSE_MODES.has(activeContentMode));
  nodeWorkspaceCloseBtn?.classList.toggle("hidden", !showClose);
}

function createNodeSettingsButton(nodePath) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "node-settings-btn";
  btn.textContent = "⚙";
  btn.title = "Настройки";
  btn.setAttribute("aria-label", "Настройки");
  btn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    openNodeSettings(getLabelFromPath(nodePath), nodePath);
  });
  return btn;
}

function createBookmarkButton(nodePath) {
  const canonicalPath = normalizeMenuNodePath(nodePath);
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "bookmark-btn";
  btn.dataset.path = canonicalPath;
  btn.textContent = isBookmarked(canonicalPath) ? "★" : "☆";
  btn.classList.toggle("bookmarked", isBookmarked(canonicalPath));
  btn.title = isBookmarked(canonicalPath) ? "Убрать из закладок" : "Добавить в закладки";
  btn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleBookmark(canonicalPath);
  });
  return btn;
}

function createGitMarkerSvg() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("class", "menu-marker-svg");
  svg.setAttribute("aria-hidden", "true");

  for (const [cx, cy] of [
    [6, 6],
    [6, 18],
    [17, 9]
  ]) {
    const node = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    node.setAttribute("cx", String(cx));
    node.setAttribute("cy", String(cy));
    node.setAttribute("r", "2.35");
    node.setAttribute("fill", "currentColor");
    svg.appendChild(node);
  }

  for (const [x1, y1, x2, y2] of [
    [6, 8.35, 6, 15.65],
    [8.35, 9, 14.65, 9]
  ]) {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", String(x1));
    line.setAttribute("y1", String(y1));
    line.setAttribute("x2", String(x2));
    line.setAttribute("y2", String(y2));
    line.setAttribute("stroke", "currentColor");
    line.setAttribute("stroke-width", "2.2");
    line.setAttribute("stroke-linecap", "round");
    svg.appendChild(line);
  }

  return svg;
}

function createObsidianMarkerSvg() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("class", "menu-marker-svg");
  svg.setAttribute("aria-hidden", "true");

  const gem = document.createElementNS("http://www.w3.org/2000/svg", "path");
  gem.setAttribute(
    "d",
    "M12 3 19 8v8l-7 5-7-5V8l7-5z"
  );
  gem.setAttribute("fill", "currentColor");
  gem.setAttribute("opacity", "0.92");

  const facet = document.createElementNS("http://www.w3.org/2000/svg", "path");
  facet.setAttribute("d", "M12 3v13");
  facet.setAttribute("fill", "none");
  facet.setAttribute("stroke", "currentColor");
  facet.setAttribute("stroke-width", "1.4");
  facet.setAttribute("stroke-linecap", "round");
  facet.setAttribute("opacity", "0.45");

  svg.appendChild(gem);
  svg.appendChild(facet);
  return svg;
}

function createFolderMarkers(source) {
  const hasGit = Boolean(source?.hasGitSelf ?? source?.hasGit);
  const hasObsidian = Boolean(source?.hasObsidianSelf ?? source?.hasObsidian);
  if (!hasGit && !hasObsidian) return null;

  const wrap = document.createElement("span");
  wrap.className = "menu-folder-markers";

  if (hasGit) {
    const git = document.createElement("span");
    git.className = "menu-marker menu-marker-git";
    git.title = "Git-репозиторий (.git в этой папке)";
    git.setAttribute("aria-label", "Git");
    git.appendChild(createGitMarkerSvg());
    wrap.appendChild(git);
  }
  if (hasObsidian) {
    const obs = document.createElement("span");
    obs.className = "menu-marker menu-marker-obsidian";
    obs.title = "Obsidian vault (.obsidian в этой папке)";
    obs.setAttribute("aria-label", "Obsidian");
    obs.appendChild(createObsidianMarkerSvg());
    wrap.appendChild(obs);
  }

  return wrap;
}

function setMenuLabelWithMarkers(host, labelText, source, nameClass = "menu-folder-name") {
  host.replaceChildren();
  const labelWrap = document.createElement("span");
  labelWrap.className = "menu-folder-label";
  const markers = createFolderMarkers(source);
  if (markers) labelWrap.appendChild(markers);
  const nameNode = document.createElement("span");
  nameNode.className = nameClass;
  nameNode.textContent = labelText;
  labelWrap.appendChild(nameNode);
  host.appendChild(labelWrap);
}

function pruneBookmarks(validPaths, agentId = activeAgentId) {
  const agentPrefix = `${agentId}:`;
  let changed = false;
  for (const path of Array.from(bookmarkedPaths)) {
    if (!path.startsWith(agentPrefix)) continue;
    if (!validPaths.has(path)) {
      bookmarkedPaths.delete(path);
      changed = true;
    }
  }
  if (changed) saveBookmarks();
}

function pruneNodeConfigCache(validPaths, agentId = activeAgentId) {
  const agentPrefix = `${agentId}:`;
  for (const key of Array.from(nodeConfigCacheByPath.keys())) {
    if (!key.startsWith(agentPrefix)) continue;
    if (!validPaths.has(key)) {
      nodeConfigCacheByPath.delete(key);
    }
  }
}

function pruneCollapsedFolders(validFolderPaths, agentId = activeAgentId) {
  if (!validFolderPaths || validFolderPaths.size === 0) return;
  const collapsedFolders = getAgentCollapsedFolders(agentId);
  let changed = false;
  for (const folderPath of Array.from(collapsedFolders)) {
    if (!validFolderPaths.has(folderPath)) {
      collapsedFolders.delete(folderPath);
      changed = true;
    }
  }
  if (changed) saveCollapsedFoldersByAgent();
}

function collectFolderPaths(node, parentSectionPath = "", acc = new Set(), depth = 0) {
  const folderPath = resolveSectionFolderPath(node, parentSectionPath, depth);
  if (node && (node.title || node.indexPath)) {
    acc.add(folderPath);
  }
  for (const section of node?.sections || []) {
    collectFolderPaths(section, folderPath, acc, depth + 1);
  }
  return acc;
}

function getSectionFolderPath(node, parentSectionPath = "") {
  const explicitFolderPath = String(node?.folderPath || "")
    .replace(/\\/g, "/")
    .trim();
  if (explicitFolderPath) return normalizeFolderPath(explicitFolderPath);
  if (node?.indexPath && isNodeManifestPath(node.indexPath)) {
    return getFolderPathFromManifest(node.indexPath) || parentSectionPath || ".";
  }
  const title = String(node?.title || "").trim();
  if (!title) return parentSectionPath || ".";
  const parent = String(parentSectionPath || "").replace(/\\/g, "/");
  if (!parent || parent === ".") return title;
  return `${parent}/${title}`;
}

function createFolderToggleButton(hasContent, isCollapsed, onToggle) {
  const toggleBtn = document.createElement("button");
  toggleBtn.type = "button";
  toggleBtn.className = "folder-toggle-btn";
  toggleBtn.textContent = hasContent ? (isCollapsed ? "▸" : "▾") : "▸";
  toggleBtn.disabled = !hasContent;
  toggleBtn.title = hasContent ? (isCollapsed ? "Раскрыть" : "Скрыть") : "Нет вложенных элементов";
  toggleBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    onToggle();
  });
  return toggleBtn;
}

function setLoading(message) {
  fileContentInputNode.value = message;
  refreshEditorViewContent();
}

function getContentSearchScope() {
  const scope = contentSearchScopeNode?.value || "content";
  if (scope === "filename") return scope;
  if (scope === "tags" && !contentSearchScopeNode?.selectedOptions?.[0]?.disabled) return scope;
  return "content";
}

function getContentSearchMinLength(scope = getContentSearchScope()) {
  return scope === "filename" ? 1 : 2;
}

function updateContentSearchPlaceholder() {
  if (!contentSearchInputNode) return;
  const scope = getContentSearchScope();
  if (scope === "filename") {
    contentSearchInputNode.placeholder = "Поиск по названию файла...";
    return;
  }
  if (scope === "tags") {
    contentSearchInputNode.placeholder = "Поиск по тэгам...";
    return;
  }
  contentSearchInputNode.placeholder = "Поиск по содержимому...";
}

function hideContentSearchResults() {
  contentSearchResultsNode?.classList.add("hidden");
  contentSearchInputNode?.setAttribute("aria-expanded", "false");
}

function highlightSearchSnippet(snippet, query) {
  const escaped = String(query || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!escaped) return snippet;
  const regex = new RegExp(`(${escaped})`, "gi");
  return String(snippet || "").replace(regex, "<mark>$1</mark>");
}

function renderContentSearchResults(data) {
  if (!contentSearchResultsNode) return;
  const query = data?.query || "";
  const scope = data?.scope || getContentSearchScope();
  const results = Array.isArray(data?.results) ? data.results : [];
  const minLength = getContentSearchMinLength(scope);

  contentSearchResultsNode.innerHTML = "";

  if (query.length < minLength) {
    const hint =
      minLength === 1 ? "Введите текст для поиска" : "Введите минимум 2 символа";
    contentSearchResultsNode.innerHTML = `<div class="content-search-hint">${hint}</div>`;
    contentSearchResultsNode.classList.remove("hidden");
    contentSearchInputNode?.setAttribute("aria-expanded", "true");
    return;
  }

  if (results.length === 0) {
    contentSearchResultsNode.innerHTML = `<div class="content-search-empty">Ничего не найдено</div>`;
    contentSearchResultsNode.classList.remove("hidden");
    contentSearchInputNode?.setAttribute("aria-expanded", "true");
    return;
  }

  for (const item of results) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "content-search-item";
    btn.setAttribute("role", "option");

    const titleRow = document.createElement("div");
    titleRow.className = "content-search-item-title";

    const titleNode = document.createElement("span");
    titleNode.textContent = item.source || "Файл";
    titleRow.appendChild(titleNode);

    if (item.matchCount) {
      const badge = document.createElement("span");
      badge.className = "content-search-item-badge";
      badge.textContent = String(item.matchCount);
      titleRow.appendChild(badge);
    }

    const pathNode = document.createElement("div");
    pathNode.className = "content-search-item-path";
    pathNode.textContent = item.systemFile || item.filePath || item.nodePath || "";

    btn.appendChild(titleRow);
    btn.appendChild(pathNode);

    if (item.snippet) {
      const snippetNode = document.createElement("div");
      snippetNode.className = "content-search-item-snippet";
      snippetNode.innerHTML = highlightSearchSnippet(item.snippet, query);
      btn.appendChild(snippetNode);
    }

    btn.addEventListener("click", () => {
      void openContentSearchResult(item);
    });
    contentSearchResultsNode.appendChild(btn);
  }

  contentSearchResultsNode.classList.remove("hidden");
  contentSearchInputNode?.setAttribute("aria-expanded", "true");
}

async function fetchContentSearch(query, scope = getContentSearchScope()) {
  const response = await fetch(buildApiUrl("/api/search", { q: query, scope, limit: 30 }));
  if (!response.ok) throw new Error(`Request failed with ${response.status}`);
  return response.json();
}

function scheduleContentSearch() {
  if (!contentSearchInputNode) return;
  const query = contentSearchInputNode.value.trim();
  const scope = getContentSearchScope();
  const minLength = getContentSearchMinLength(scope);
  clearTimeout(contentSearchTimer);
  const requestId = ++contentSearchRequestId;

  if (!query) {
    hideContentSearchResults();
    return;
  }

  contentSearchTimer = setTimeout(async () => {
    if (query.length < minLength) {
      renderContentSearchResults({ query, scope, results: [] });
      return;
    }

    try {
      const data = await fetchContentSearch(query, scope);
      if (requestId !== contentSearchRequestId) return;
      renderContentSearchResults(data);
    } catch {
      if (requestId !== contentSearchRequestId) return;
      contentSearchResultsNode.innerHTML = `<div class="content-search-empty">Ошибка поиска</div>`;
      contentSearchResultsNode.classList.remove("hidden");
    }
  }, 280);
}

async function openContentSearchResult(result) {
  if (!result) return;
  hideContentSearchResults();
  contentSearchInputNode?.blur();

  if (result.systemFile) {
    await selectSystemFile(result.systemFile);
    return;
  }

  if (!result.nodePath) return;

  if (result.mode) {
    await selectNodeManifest(getLabelFromPath(result.nodePath), result.nodePath, result.mode);
  } else {
    await openNodeFromMenu(getLabelFromPath(result.nodePath), result.nodePath);
  }

  if (result.mode === "external" && result.externalFile) {
    await openExternalFile(result.externalFile);
  }
}

function showToast(message, type = "") {
  toastNode.textContent = message;
  toastNode.classList.remove("success", "error", "show");
  if (type) toastNode.classList.add(type);
  if (toastTimer) clearTimeout(toastTimer);
  toastNode.classList.add("show");
  toastTimer = setTimeout(() => {
    toastNode.classList.remove("show");
  }, 1600);
}

function askConfirm(message, { okLabel = "Удалить" } = {}) {
  confirmMessageNode.textContent = message;
  confirmOkBtn.textContent = okLabel;
  confirmModalNode.classList.remove("hidden");
  return new Promise((resolve) => {
    pendingConfirmResolve = resolve;
  });
}

function closeConfirm(result) {
  confirmModalNode.classList.add("hidden");
  confirmOkBtn.textContent = "Удалить";
  if (pendingConfirmResolve) {
    pendingConfirmResolve(result);
    pendingConfirmResolve = null;
  }
}

function formatCreateParentLabel(parentPath) {
  if (!parentPath || parentPath === ".") return getAgentTreeTitle();
  const parts = String(parentPath).split("/").filter(Boolean);
  return parts[parts.length - 1] || parentPath;
}

function resolveCreateTargetParentPath(baseParentPath, useVault, agentId = getCreateModalAgentId()) {
  const normalized = normalizeCreateParentPath(baseParentPath || ".");
  if (normalized !== ".") return normalized;
  if (useVault) {
    const vaultFolder = getActiveAgentVaultFolder(agentId);
    if (vaultFolder) return vaultFolder;
  }
  return ".";
}

function syncCreateNodeVaultOptionUi() {
  const vaultFolder = getActiveAgentVaultFolder(getCreateModalAgentId());
  const showVaultOption = createModalBaseParentPath === "." && Boolean(vaultFolder);
  createNodeVaultOptionWrapNode?.classList.toggle("hidden", !showVaultOption);
  if (createNodeVaultOptionLabelNode && vaultFolder) {
    createNodeVaultOptionLabelNode.textContent = `Создать в папке ${vaultFolder}`;
  }
  if (showVaultOption && createNodeVaultOptionNode) {
    createNodeVaultOptionNode.checked = true;
  }
  applyCreateNodeTargetPath();
}

const SERVICE_CATALOG_PRESET_LABELS = {
  categories: "Категории",
  tags: "Теги",
  schemas: "Схемы"
};

function isServiceRootCreateParent(parentPath) {
  const serviceFolder = getActiveAgentServiceFolder(getCreateModalAgentId());
  if (!serviceFolder) return false;
  return normalizeCreateParentPath(parentPath || ".") === serviceFolder;
}

function isServiceSubfolderCreateParent(parentPath) {
  const serviceFolder = getActiveAgentServiceFolder(getCreateModalAgentId());
  if (!serviceFolder) return false;
  const normalized = normalizeCreateParentPath(parentPath || ".");
  if (!normalized || normalized === serviceFolder) return false;
  return isServiceNodePath(normalized);
}

function syncCreateNodeActionsUi() {
  const showManifestOption = createModalEmptyFolder && createModalBaseParentPath !== ".";
  const serviceRoot = isServiceRootCreateParent(createModalBaseParentPath);
  const serviceSubfolder = isServiceSubfolderCreateParent(createModalBaseParentPath);
  const inServiceTree = serviceRoot || serviceSubfolder;

  createManifestBtn?.classList.toggle("hidden", !showManifestOption);
  createNodeActionsNode?.classList.toggle("has-manifest-option", showManifestOption);
  createNodeCatalogWrapNode?.classList.toggle("hidden", !serviceRoot);
  createNodeStructureLabelNode?.classList.toggle("hidden", !inServiceTree);
  createNodeActionsNode?.classList.toggle("create-node-actions--service", inServiceTree);

  if (createNameInputNode) {
    createNameInputNode.placeholder = inServiceTree ? "Например: statuses" : "Например: Плавание";
  }
}

function applyCreateNodeTargetPath() {
  const useVault = Boolean(createNodeVaultOptionNode?.checked);
  createTargetParentPath = resolveCreateTargetParentPath(createModalBaseParentPath, useVault);
  updateCreateNodeModalContext(createTargetParentPath);
}

function updateCreateNodeModalContext(parentPath) {
  const label = formatCreateParentLabel(parentPath);
  if (createNodeModalTitleNode) {
    if (createModalEmptyFolder && createModalBaseParentPath !== ".") {
      createNodeModalTitleNode.textContent = `Папка «${label}» — без темы`;
    } else {
      createNodeModalTitleNode.textContent = `Создать в «${label}»`;
    }
  }
}

function closeCreateNodeModal() {
  createNodeModalNode?.classList.add("hidden");
  createTargetParentPath = ".";
  createModalBaseParentPath = ".";
  createModalAgentId = null;
  createModalEmptyFolder = false;
  createNameInputNode.value = "";
  createNodeVaultOptionWrapNode?.classList.add("hidden");
  if (createNodeVaultOptionNode) createNodeVaultOptionNode.checked = true;
  syncCreateNodeActionsUi();
}

function openCreateNodeModal(parentPath, options = {}) {
  createModalAgentId = options.agentId || activeAgentId;
  createModalBaseParentPath = normalizeCreateParentPath(parentPath || ".");
  createModalEmptyFolder = Boolean(options.emptyFolder);
  syncCreateNodeVaultOptionUi();
  syncCreateNodeActionsUi();
  createNodeModalNode?.classList.remove("hidden");
  if (createModalEmptyFolder && createModalBaseParentPath !== ".") {
    createNameInputNode.value = formatCreateParentLabel(createModalBaseParentPath);
  } else {
    createNameInputNode.value = "";
  }
  createNameInputNode.focus();
}

function toggleFolderCollapsed(folderPath, agentId = activeAgentId) {
  const normalizedPath = normalizeFolderPath(folderPath);
  if (!normalizedPath) return;
  const collapsedFolders = getAgentCollapsedFolders(agentId);
  if (collapsedFolders.has(normalizedPath)) {
    collapsedFolders.delete(normalizedPath);
  } else {
    collapsedFolders.add(normalizedPath);
  }
  saveCollapsedFoldersByAgent();
  const menu = menuCacheByAgent.get(agentId) || (agentId === activeAgentId ? currentMenuData : null);
  if (menu) {
    renderMenu(menu, agentId);
    if (agentId === activeAgentId) updateActiveButton();
  }
}

function sanitizeCollapsedFolderPaths(agentId = activeAgentId) {
  const collapsedFolders = getAgentCollapsedFolders(agentId);
  if (collapsedFolders.delete(".")) {
    saveCollapsedFoldersByAgent();
  }
}

function getMenuTreeFolderPaths(agentId = activeAgentId) {
  if (!currentMenuData) return [];
  const agentTitle = getAgentTreeTitle(agentId);
  const baseTree = { title: agentTitle, ...currentMenuData };
  const folderPaths = collectFolderPaths(baseTree);
  if (currentMenuData.serviceTree) {
    collectFolderPaths({ title: "", ...currentMenuData.serviceTree }, "", folderPaths);
  }
  return Array.from(folderPaths).filter((path) => path !== ".");
}

function isMenuTreeFullyCollapsed(agentId = activeAgentId) {
  const paths = getMenuTreeFolderPaths(agentId);
  const collapsedFolders = getAgentCollapsedFolders(agentId);
  const nestedCollapsed = paths.length === 0 || paths.every((path) => collapsedFolders.has(path));
  return nestedCollapsed && isServiceTreeCollapsed();
}

function syncMenuCollapseAllButton() {
  if (!menuCollapseAllBtn) return;
  const enabled =
    menuViewMode === "tree" && !menuSearchQuery.trim().length && Boolean(currentMenuData);
  menuCollapseAllBtn.disabled = !enabled;
  if (!enabled) return;
  const expanded = isMenuTreeFullyCollapsed();
  menuCollapseAllBtn.title = expanded ? "Развернуть все ветки" : "Свернуть все ветки";
  menuCollapseAllBtn.setAttribute("aria-label", expanded ? "Развернуть все ветки" : "Свернуть все ветки");
  const icon = menuCollapseAllBtn.querySelector(".menu-collapse-all-icon");
  if (icon) icon.textContent = expanded ? "⊞" : "⊟";
}

function expandAllMenuTreeBranches(agentId = activeAgentId) {
  if (!currentMenuData || menuViewMode !== "tree" || menuSearchQuery.trim()) return;

  getAgentCollapsedFolders(agentId).clear();
  localStorage.setItem("agentcms.serviceTree.collapsed.v1", "0");
  saveCollapsedFoldersByAgent();
  renderMenu(currentMenuData, agentId);
  updateActiveButton();
  syncMenuCollapseAllButton();
}

function collapseAllMenuTreeBranches(agentId = activeAgentId) {
  if (!currentMenuData || menuViewMode !== "tree" || menuSearchQuery.trim()) return;

  const folderPaths = getMenuTreeFolderPaths(agentId);
  const collapsedFolders = getAgentCollapsedFolders(agentId);
  for (const folderPath of folderPaths) {
    collapsedFolders.add(folderPath);
  }
  localStorage.setItem("agentcms.serviceTree.collapsed.v1", "1");
  saveCollapsedFoldersByAgent();
  renderMenu(currentMenuData, agentId);
  updateActiveButton();
  syncMenuCollapseAllButton();
}

function toggleCollapseAllMenuTreeBranches() {
  if (isMenuTreeFullyCollapsed()) {
    expandAllMenuTreeBranches();
  } else {
    collapseAllMenuTreeBranches();
  }
}

function findModeGroup(modeId) {
  return getAllModeGroups().find((group) => group.modes.some((mode) => mode.id === modeId)) || null;
}

function isGraphModeActive() {
  return activeContentMode === "graph" && Boolean(activePath) && !activeSystemFile;
}

function setContentMode(mode) {
  if (mode === "graph") return;
  const group = findModeGroup(mode);
  const modeDef = group?.modes.find((item) => item.id === mode);
  if (modeDef?.disabled) return;
  if (mode === "graph" && !activePath) {
    showToast("Выберите тему в дереве слева", "info");
    return;
  }
  if (isMemoryDriverModeBlockedForActivePath(mode)) {
    mode = NODE_NAVIGATION_MODE;
  }

  activeContentMode = mode;
  if (mode !== "media") clearMediaSidecarEditor();
  if (mode !== "external") activeExternalFilePath = null;
  if (isFlatStorageListMode(mode) || mode === "tabular") {
    editorViewMode = "preview";
  }
  if (mode === NODE_OVERVIEW_MODE || mode === NODE_NAVIGATION_MODE) {
    nodeSettingsViewActive = false;
    nodeMemoryViewActive = false;
  } else if (NODE_SETTINGS_MODE_IDS.has(mode)) {
    nodeSettingsViewActive = true;
    nodeMemoryViewActive = false;
  } else if (NODE_MEMORY_MODE_IDS.has(mode)) {
    nodeMemoryViewActive = true;
    nodeSettingsViewActive = false;
  } else {
    if (nodeSettingsViewActive && !isNodeSettingsSelectMode(mode)) {
      nodeSettingsViewActive = false;
    }
    if (nodeMemoryViewActive && !isNodeMemorySelectMode(mode)) {
      nodeMemoryViewActive = false;
    }
  }
  syncNodeSettingsModeSelect();
  syncNodeMemoryModeSelect();
  applyNodeWorkspaceViewUi();
  void applyContentModeChange();
}

async function applyContentModeChange() {
  if (activePath) {
    await loadContentByMode();
    syncEditorLineNumbers();
  } else {
    applyModeUi();
  }
}

function isMediaSidecarEditing() {
  return activeContentMode === "media" && Boolean(activeMediaSidecarPath);
}

function isCurrentModeWithoutContentEditor() {
  if (activeSystemFile) return false;
  return (
    activeContentMode === NODE_OVERVIEW_MODE ||
    activeContentMode === NODE_NAVIGATION_MODE ||
    activeContentMode === "node-preview" ||
    (activeContentMode === "media" && !isMediaSidecarEditing())
  );
}

function getListViewRawContent() {
  if (activeContentMode === "media" && !isMediaSidecarEditing()) {
    return modeContentCache.media || "";
  }
  if (activeContentMode === "external" && !isExternalFileEditing()) {
    return modeContentCache.external || "";
  }
  return fileContentInputNode.value || "";
}

function isCurrentModeReadOnly() {
  if (activeSystemFile) return false;
  const externalEditing = activeContentMode === "external" && Boolean(activeExternalFilePath);
  const mediaSidecarEditing = isMediaSidecarEditing();
  return (
    (activeContentMode === "external" && !externalEditing) ||
    (activeContentMode === "tabular" && !isTabularSourceEditing()) ||
    activeContentMode === "inbox" ||
    activeContentMode === "references" ||
    (activeContentMode === "media" && !mediaSidecarEditing) ||
    activeContentMode === "scripts" ||
    activeContentMode === NODE_OVERVIEW_MODE ||
    activeContentMode === NODE_NAVIGATION_MODE ||
    activeContentMode === "node-preview" ||
    activeContentMode === "graph"
  );
}

function isCurrentModeTitleEditable() {
  const externalEditing = activeContentMode === "external" && Boolean(activeExternalFilePath);
  const mediaSidecarEditing = isMediaSidecarEditing();
  return activeContentMode === "description" || externalEditing || mediaSidecarEditing;
}

function isNodeDeleteAvailable() {
  if (!activePath || activeSystemFile) return false;
  if (activeContentMode !== "description") return false;
  if (isAgentRootIndexPath(getActiveNodeApiPath())) return false;
  return true;
}

function isCurrentModeListTemplate() {
  if (activeSystemFile) return false;
  const externalEditing = activeContentMode === "external" && Boolean(activeExternalFilePath);
  const mediaSidecarEditing = isMediaSidecarEditing();
  return (
    (activeContentMode === "external" && !externalEditing) ||
    (activeContentMode === "tabular" && !isTabularSourceEditing()) ||
    activeContentMode === "inbox" ||
    activeContentMode === "references" ||
    (activeContentMode === "media" && !mediaSidecarEditing) ||
    activeContentMode === "scripts"
  );
}

function getNodeFolderPath(nodePath) {
  if (isNodeManifestPath(nodePath)) return getFolderPathFromManifest(nodePath);
  const parts = String(nodePath || "").split("/").filter(Boolean);
  if (parts.length === 0) return "";
  return parts.slice(0, -1).join("/");
}

function getNodeStoragePrefix(nodePath) {
  const folder = getNodeFolderPath(getResolvedNodePath(nodePath));
  return folder ? `${folder}/_Storage` : "_Storage";
}

function getNodeStorageSubfolderPath(nodePath, subfolder) {
  return `${getNodeStoragePrefix(nodePath)}/${subfolder}`;
}

function getEnvBreadcrumbPath(nodePath) {
  return `${getNodeStoragePrefix(nodePath)}/.env`;
}

function parsePartFolderManifestRel(nodePath) {
  const normalized = String(nodePath || "").replace(/\\/g, "/");
  const match = normalized.match(/^(.*\/)?_Parts\/([^/]+)\/([^/]+\.(?:node|x)\.md)$/i);
  if (!match || !isAreaManifestFileName(match[3])) return null;
  const prefix = match[1] || "";
  const partName = match[2];
  return {
    dir: `${prefix}_Parts/${partName}`,
    partName,
    manifestName: match[3]
  };
}

function resolvePartFolderSidecarBaseRel(nodePath) {
  const parsed = parsePartFolderManifestRel(nodePath);
  if (!parsed) return null;
  const stem = parsed.manifestName.replace(MANIFEST_MD_RE, "");
  return `${parsed.dir}/${stem}.x`;
}

function isAreaManifestFileName(name) {
  const base = String(name || "");
  return base === AREA_MANIFEST_FILE || LEGACY_AREA_MANIFEST_ALIASES.includes(base);
}

function getManifestContainerDirRel(relPath) {
  const normalized = String(relPath || "").replace(/\\/g, "/");
  const slash = normalized.lastIndexOf("/");
  if (slash < 0) return "";
  return normalized.slice(0, slash);
}

function getManifestStorageKey(relPath) {
  const normalized = String(relPath || "").replace(/\\/g, "/");
  const base = normalized.slice(normalized.lastIndexOf("/") + 1);
  if (isAreaManifestFileName(base)) {
    const containerDir = getManifestContainerDirRel(normalized);
    if (!containerDir) return "_";
    return containerDir.slice(containerDir.lastIndexOf("/") + 1);
  }
  return base.replace(MANIFEST_MD_RE, "");
}

function getNamedStorageBundleRel(relPath, bundleFileName) {
  const containerDir = getManifestContainerDirRel(relPath);
  const key = getManifestStorageKey(relPath);
  const parts = [containerDir, STORAGE_FOLDER_NAME, key].filter(Boolean);
  return `${parts.join("/")}/${bundleFileName}`;
}

function getNamedStorageBundleDirRel(relPath) {
  const containerDir = getManifestContainerDirRel(relPath);
  const key = getManifestStorageKey(relPath);
  return [containerDir, STORAGE_FOLDER_NAME, key].filter(Boolean).join("/");
}

function resolveNodeSidecarRelPath(nodePath, kind) {
  const resolved = String(getResolvedNodePath(nodePath) || "");
  const partBase = resolvePartFolderSidecarBaseRel(resolved);
  const suffixByKind = {
    content: ".content.md",
    tabular: ".content.csv",
    todo: ".todo.md",
    preview: ".preview",
    config: ".config.yml"
  };
  if (partBase) return `${partBase}${suffixByKind[kind]}`;
  if (kind === "preview") {
    return `${getNamedStorageBundleDirRel(resolved)}/${PREVIEW_FILE_BASENAME}`;
  }
  const bundleByKind = {
    content: BUNDLE_CONTENT_FILE,
    tabular: BUNDLE_TABULAR_FILE,
    todo: BUNDLE_TODO_FILE,
    config: BUNDLE_CONFIG_FILE
  };
  return getNamedStorageBundleRel(resolved, bundleByKind[kind]);
}

function getTodoBreadcrumbPath(nodePath) {
  return resolveNodeSidecarRelPath(nodePath, "todo");
}

function getPreviewBreadcrumbPath(nodePath) {
  return resolveNodeSidecarRelPath(nodePath, "preview");
}

function getConfigsBreadcrumbPath(nodePath) {
  return resolveNodeSidecarRelPath(nodePath, "config");
}

function getInternalMemoryBreadcrumbPath(nodePath) {
  return resolveNodeSidecarRelPath(nodePath, "content");
}

function getTabularBreadcrumbPath(nodePath) {
  return resolveNodeSidecarRelPath(nodePath, "tabular");
}

function getHomeBreadcrumbPath() {
  return getActiveAgentLabel() || getAgentTreeTitle() || "Главная";
}

function getNodeDomainBreadcrumbPath(nodePath) {
  return getNodeDisplayPath(nodePath);
}

function getBreadcrumbPathForActiveMode(overrides = {}) {
  if (activeSystemFile) return activeSystemFile;
  if (appRootNode.classList.contains("home-view") || !activePath) {
    return getHomeBreadcrumbPath();
  }
  if (isGraphModeActive()) return normalizeBreadcrumbPath(activePath);

  if (isNodeWorkspaceBreadcrumbDomain()) {
    return getNodeDomainBreadcrumbPath(activePath);
  }

  const {
    previewFile = null,
    externalFile = activeExternalFilePath,
    mediaFile = activeMediaSidecarSourcePath
  } = overrides;

  switch (activeContentMode) {
    case NODE_OVERVIEW_MODE:
    case NODE_NAVIGATION_MODE:
    case "description":
      return getNodeDisplayPath(activePath);
    case "internal":
      return getInternalMemoryBreadcrumbPath(activePath);
    case "tabular":
      return getTabularBreadcrumbPath(activePath);
    case "external": {
      const base = getNodeStorageSubfolderPath(activePath, "_Content");
      return externalFile ? `${base}/${externalFile}` : base;
    }
    case "inbox":
      return getNodeStorageSubfolderPath(activePath, "_Inbox");
    case "references":
      return getNodeStorageSubfolderPath(activePath, "_Referenses");
    case "media": {
      const base = getNodeStorageSubfolderPath(activePath, "_Assets");
      return mediaFile ? `${base}/${mediaFile}` : base;
    }
    case "scripts":
      return getNodeStorageSubfolderPath(activePath, "_Scripts");
    case "node-preview": {
      const base = getPreviewBreadcrumbPath(activePath);
      return previewFile ? `${base}/${previewFile}` : base;
    }
    case "configs":
      return getConfigsBreadcrumbPath(activePath);
    case "env":
      return getEnvBreadcrumbPath(activePath);
    case "todo":
      return getTodoBreadcrumbPath(activePath);
    default:
      return activePath;
  }
}

function updateBreadcrumbsForActiveMode(overrides) {
  renderBreadcrumbs(getBreadcrumbPathForActiveMode(overrides));
}

function getListViewTitleByMode() {
  if (activeContentMode === "graph") {
    return `Пространство: ${activeLabel || getLabelFromPath(activePath) || "тема"}`;
  }
  if (activeContentMode === "external") return "Многофайловая (_Content)";
  if (activeContentMode === "tabular") {
    return isTabularSourceEditing() ? "Табличная — исходник CSV" : "Табличная (CSV)";
  }
  if (activeContentMode === "inbox") return "Входящие (_Inbox)";
  if (activeContentMode === "references") return "Источники (_Referenses)";
  if (activeContentMode === "media") return "Медиа и документы (_Assets)";
  if (activeContentMode === "scripts") return "Скрипты (_Scripts)";
  return "Список файлов";
}

function parseMediaSections(text) {
  const lines = String(text || "").split("\n");
  const sections = [];
  let current = null;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith("## ")) {
      if (current) sections.push(current);
      current = { title: line.slice(3).trim(), items: [] };
      continue;
    }
    if (line.startsWith("- ")) {
      if (!current) current = { title: "Файлы", items: [] };
      current.items.push(line.slice(2).trim());
    }
  }
  if (current) sections.push(current);
  return sections;
}

function parseFlatListItems(text) {
  return String(text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function buildMediaFilesCacheFromContent(text) {
  const sections = parseMediaSections(text);
  const groups = {};

  for (const section of sections) {
    const items = [];
    for (const rawItem of section.items) {
      const normalized = normalizeListItem(rawItem);
      const segments = normalized.path.split("/").filter(Boolean);
      const name = normalized.isFolder
        ? segments[segments.length - 1] || normalized.path.replace(/\/$/, "")
        : segments[segments.length - 1] || normalized.path;
      const ext = normalized.isFolder
        ? ""
        : (name.includes(".") ? `.${name.split(".").pop().toLowerCase()}` : "");

      items.push({
        path: normalized.path,
        name,
        group: section.title,
        isFolder: normalized.isFolder,
        size: 0,
        ext
      });
    }
    if (items.length > 0) groups[section.title] = items;
  }

  return groups;
}

function syncMediaFilesCache(content, groups) {
  if (groups && typeof groups === "object" && Object.keys(groups).length > 0) {
    mediaFilesCache = groups;
    return;
  }
  mediaFilesCache = buildMediaFilesCacheFromContent(content || "");
}

function normalizeListItem(rawItem) {
  const clean = String(rawItem || "")
    .trim()
    .replace(/^[-*]\s+/, "")
    .replace(/^📁\s+/, "")
    .replace(/^📄\s+/, "");
  return {
    path: clean,
    isFolder: clean.endsWith("/")
  };
}

function computeGraphNodeDegrees(edges) {
  const degrees = new Map();
  for (const edge of edges) {
    degrees.set(edge.from, (degrees.get(edge.from) || 0) + 1);
    degrees.set(edge.to, (degrees.get(edge.to) || 0) + 1);
  }
  return degrees;
}

function buildGraphAdjacency(edges) {
  const adjacency = new Map();
  const link = (from, to) => {
    if (!adjacency.has(from)) adjacency.set(from, new Set());
    adjacency.get(from).add(to);
  };
  for (const edge of edges) {
    link(edge.from, edge.to);
    link(edge.to, edge.from);
  }
  return adjacency;
}

function getObsidianGraphLayoutSize(nodeCount, containerWidth, containerHeight, fullViewport) {
  const spread = Math.max(720, Math.sqrt(nodeCount) * 95);
  const width = fullViewport
    ? Math.max(spread, containerWidth || 920)
    : Math.max(920, Math.min(1600, Math.max(containerWidth || 920, spread)));
  const height = fullViewport
    ? Math.max(spread, containerHeight || 560)
    : Math.max(520, Math.min(920, Math.max(380 + nodeCount * 12, spread * 0.85)));
  return { width, height };
}

function computeGraphLayoutBounds(nodes, degrees, padding = 64, showPreviews = false) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const node of nodes) {
    const radius = getGraphNodeRadius(node, degrees, showPreviews);
    minX = Math.min(minX, node.x - radius - padding);
    minY = Math.min(minY, node.y - radius - padding);
    maxX = Math.max(maxX, node.x + radius + padding);
    maxY = Math.max(maxY, node.y + radius + padding);
  }
  return {
    minX,
    minY,
    width: Math.max(maxX - minX, 160),
    height: Math.max(maxY - minY, 160)
  };
}

function createObsidianGraphSimulation(nodes, edges, width, height) {
  const centerIds = new Set(["root", "agent-root"]);
  const degrees = computeGraphNodeDegrees(edges);
  const spread = Math.min(width, height) * 0.36;
  const positioned = nodes.map((node, index) => {
    const angle = (index / Math.max(nodes.length, 1)) * Math.PI * 2;
    const ring = centerIds.has(node.id) ? 0 : spread * (0.88 + (index % 4) * 0.04);
    return {
      ...node,
      x: width / 2 + Math.cos(angle) * ring,
      y: height / 2 + Math.sin(angle) * ring,
      vx: 0,
      vy: 0,
      pinned: centerIds.has(node.id),
      floatPhase: Math.random() * Math.PI * 2,
      floatRadius: 0.75 + Math.random() * 0.55
    };
  });

  const nodeById = new Map(positioned.map((node) => [node.id, node]));

  return {
    nodes: positioned,
    nodeById,
    edges,
    width,
    height,
    centerIds,
    degrees,
    phase: "settling",
    alpha: 1,
    floatTime: 0
  };
}

function clampGraphNodeVelocity(node, maxSpeed) {
  const speed = Math.hypot(node.vx, node.vy);
  if (speed <= maxSpeed) return;
  const scale = maxSpeed / speed;
  node.vx *= scale;
  node.vy *= scale;
}

function warmUpObsidianGraphSimulation(sim, steps = 96) {
  sim.phase = "settling";
  for (let step = 0; step < steps; step += 1) {
    sim.alpha = Math.max(0.05, 1 - step / (steps - 1));
    tickObsidianGraphSimulation(sim);
  }
  for (const node of sim.nodes) {
    node.vx = 0;
    node.vy = 0;
  }
  sim.phase = "idle";
  sim.alpha = 0.052;
  sim.floatTime = 0;
}

function tickObsidianGraphSimulation(sim) {
  const { nodes, nodeById, edges, width, height, centerIds, degrees } = sim;

  if (sim.phase === "settling") {
    sim.alpha *= 0.972;
    if (sim.alpha < 0.035) {
      sim.phase = "idle";
      sim.alpha = 0.052;
      sim.floatTime = 0;
    }
  }

  if (sim.phase === "idle") {
    sim.floatTime += 1;
  }

  const forceAlpha = sim.phase === "idle" ? sim.alpha * 0.62 : sim.alpha;
  if (forceAlpha < 0.0004 && sim.phase !== "idle") return false;

  const repulsionStrength = (3200 + nodes.length * 12) * forceAlpha;
  const maxVelocity = sim.phase === "idle" ? 0.82 : 2.4;

  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const a = nodes[i];
      const b = nodes[j];
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      let dist = Math.hypot(dx, dy) || 0.01;
      const weight = (degrees.get(a.id) || 1) + (degrees.get(b.id) || 1);
      const repulse = (repulsionStrength * weight) / (dist * dist);
      dx = (dx / dist) * repulse;
      dy = (dy / dist) * repulse;
      if (!centerIds.has(a.id) && !a.pinned) {
        a.vx -= dx;
        a.vy -= dy;
      }
      if (!centerIds.has(b.id) && !b.pinned) {
        b.vx += dx;
        b.vy += dy;
      }
    }
  }

  for (const edge of edges) {
    const source = nodeById.get(edge.from);
    const target = nodeById.get(edge.to);
    if (!source || !target) continue;
    let dx = target.x - source.x;
    let dy = target.y - source.y;
    let dist = Math.hypot(dx, dy) || 0.01;
    const ideal = edge.weak ? 132 : 96;
    const spring = edge.weak ? 0.008 : 0.018;
    let pull = (dist - ideal) * spring * forceAlpha;
    pull = Math.max(-1.8, Math.min(1.8, pull));
    dx = (dx / dist) * pull;
    dy = (dy / dist) * pull;
    if (!centerIds.has(source.id) && !source.pinned) {
      source.vx += dx;
      source.vy += dy;
    }
    if (!centerIds.has(target.id) && !target.pinned) {
      target.vx -= dx;
      target.vy -= dy;
    }
  }

  for (const node of nodes) {
    if (centerIds.has(node.id)) {
      node.x = width / 2;
      node.y = height / 2;
      node.vx = 0;
      node.vy = 0;
      continue;
    }
    if (node.pinned) {
      node.vx = 0;
      node.vy = 0;
      continue;
    }
    node.vx += (width / 2 - node.x) * 0.0012 * forceAlpha;
    node.vy += (height / 2 - node.y) * 0.0012 * forceAlpha;

    if (sim.phase === "idle") {
      const drift = node.floatRadius || 1;
      const t = sim.floatTime * 0.014;
      node.vx += Math.cos(t * drift + node.floatPhase) * 0.016;
      node.vy += Math.sin(t * drift * 1.08 + node.floatPhase * 1.17) * 0.016;
    }

    node.vx *= sim.phase === "idle" ? 0.945 : 0.78;
    node.vy *= sim.phase === "idle" ? 0.945 : 0.78;
    clampGraphNodeVelocity(node, maxVelocity);
    node.x += node.vx;
    node.y += node.vy;
  }

  return true;
}

function reheatObsidianGraphSimulation(sim, alpha = 0.22) {
  sim.phase = "settling";
  sim.alpha = Math.max(sim.alpha, alpha);
}

function updateAllGraphVisuals(nodeById, nodeElements, linkElements) {
  for (const [nodeId, nodeState] of nodeElements.entries()) {
    const node = nodeById.get(nodeId);
    if (!node) continue;
    const labelOffset = nodeState.previewSize
      ? nodeState.previewSize / 2 + 10
      : nodeState.radius + 11;
    nodeState.glow.setAttribute("cx", String(node.x));
    nodeState.glow.setAttribute("cy", String(node.y));
    nodeState.circle.setAttribute("cx", String(node.x));
    nodeState.circle.setAttribute("cy", String(node.y));
    if (nodeState.previewGroup) {
      nodeState.previewGroup.setAttribute(
        "transform",
        `translate(${node.x - nodeState.previewSize / 2} ${node.y - nodeState.previewSize / 2})`
      );
    }
    nodeState.label.setAttribute("x", String(node.x));
    nodeState.label.setAttribute("y", String(node.y + labelOffset));
  }
  for (const line of linkElements) {
    const from = nodeById.get(line.from);
    const to = nodeById.get(line.to);
    if (!from || !to) continue;
    line.el.setAttribute("x1", String(from.x));
    line.el.setAttribute("y1", String(from.y));
    line.el.setAttribute("x2", String(to.x));
    line.el.setAttribute("y2", String(to.y));
  }
}

function getGraphNodePreviewSize(node, showPreviews = false) {
  if (!showPreviews || !node.previewUrl) return 0;
  return node.type === "folder" ? 28 : 22;
}

function getGraphNodeRadius(node, degrees, showPreviews = false) {
  const previewSize = getGraphNodePreviewSize(node, showPreviews);
  if (previewSize) return previewSize / 2 + 2;
  const degree = degrees.get(node.id) || 1;
  if (node.id === "root" || node.id === "agent-root") return 5 + Math.min(4, degree * 0.35);
  if (node.type === "folder") return 4 + Math.min(3, Math.sqrt(degree) * 0.9);
  return 3 + Math.min(2.5, Math.sqrt(degree) * 0.65);
}

function resolveGraphPreviewUrl(node) {
  if (!node?.previewUrl) return "";
  return appendCacheBuster(appendAgentToApiUrl(node.previewUrl));
}

function sanitizeGraphDomId(value) {
  return String(value || "node").replace(/[^a-zA-Z0-9_-]/g, "-");
}

function attachObsidianGraphViewport(wrap, svg, viewport, sim, nodeElements, linkElements, degrees, showPreviews = false) {
  const positioned = sim.nodes;
  const nodeById = sim.nodeById;
  let layoutBounds = computeGraphLayoutBounds(positioned, degrees, 64, showPreviews);
  let hasAutoFitted = false;
  let rafId = 0;

  const state = {
    scale: 1,
    tx: 0,
    ty: 0,
    panning: false,
    panStartX: 0,
    panStartY: 0,
    panOriginTx: 0,
    panOriginTy: 0,
    draggingNode: null,
    dragOffsetX: 0,
    dragOffsetY: 0,
    dragMoved: false,
    dragStartX: 0,
    dragStartY: 0
  };

  const applyTransform = () => {
    viewport.setAttribute("transform", `translate(${state.tx} ${state.ty}) scale(${state.scale})`);
  };

  const fitToView = () => {
    layoutBounds = computeGraphLayoutBounds(positioned, degrees, 64, showPreviews);
    const rect = svg.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const padding = 48;
    const scaleX = (rect.width - padding * 2) / layoutBounds.width;
    const scaleY = (rect.height - padding * 2) / layoutBounds.height;
    state.scale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.35), 1.65);
    state.tx = (rect.width - layoutBounds.width * state.scale) / 2 - layoutBounds.minX * state.scale;
    state.ty = (rect.height - layoutBounds.height * state.scale) / 2 - layoutBounds.minY * state.scale;
    applyTransform();
  };

  const clientToGraph = (clientX, clientY) => {
    const rect = svg.getBoundingClientRect();
    return {
      x: (clientX - rect.left - state.tx) / state.scale,
      y: (clientY - rect.top - state.ty) / state.scale
    };
  };

  const refreshGraphVisuals = () => {
    updateAllGraphVisuals(nodeById, nodeElements, linkElements);
  };

  const runSimulationFrame = () => {
    if (!wrap.isConnected) return;
    tickObsidianGraphSimulation(sim);
    refreshGraphVisuals();

    if (!hasAutoFitted && sim.alpha < 0.05) {
      fitToView();
      hasAutoFitted = true;
      wrap.classList.remove("is-entering");
      wrap.classList.add("is-settled");
    }

    rafId = requestAnimationFrame(runSimulationFrame);
  };

  wrap.classList.add("is-simulating");
  warmUpObsidianGraphSimulation(sim);
  refreshGraphVisuals();
  fitToView();
  hasAutoFitted = true;
  wrap.classList.add("is-settled");
  rafId = requestAnimationFrame(runSimulationFrame);

  const clearFocus = () => {
    wrap.classList.remove("is-focusing");
    for (const group of nodeElements.values()) group.el.classList.remove("highlighted");
    for (const line of linkElements) line.el.classList.remove("highlighted");
  };

  const focusNode = (nodeId) => {
    const neighbors = buildGraphAdjacency(
      linkElements.map((line) => ({ from: line.from, to: line.to }))
    );
    const related = new Set([nodeId, ...(neighbors.get(nodeId) || [])]);
    wrap.classList.add("is-focusing");
    for (const [id, group] of nodeElements.entries()) {
      group.el.classList.toggle("highlighted", related.has(id));
    }
    for (const line of linkElements) {
      line.el.classList.toggle(
        "highlighted",
        related.has(line.from) && related.has(line.to)
      );
    }
  };

  wrap.addEventListener("wheel", (event) => {
    event.preventDefault();
    const rect = svg.getBoundingClientRect();
    const mx = event.clientX - rect.left;
    const my = event.clientY - rect.top;
    const factor = event.deltaY > 0 ? 0.92 : 1.08;
    const nextScale = Math.min(3.2, Math.max(0.18, state.scale * factor));
    state.tx = mx - ((mx - state.tx) * nextScale) / state.scale;
    state.ty = my - ((my - state.ty) * nextScale) / state.scale;
    state.scale = nextScale;
    applyTransform();
  }, { passive: false });

  svg.addEventListener("mousedown", (event) => {
    if (event.button !== 0) return;
    const targetGroup = event.target.closest?.(".external-graph-node");
    if (targetGroup) {
      const nodeId = targetGroup.dataset.nodeId;
      const node = positioned.find((entry) => entry.id === nodeId);
      if (!node) return;
      const point = clientToGraph(event.clientX, event.clientY);
      state.draggingNode = node;
      state.dragOffsetX = node.x - point.x;
      state.dragOffsetY = node.y - point.y;
      state.dragMoved = false;
      state.dragStartX = event.clientX;
      state.dragStartY = event.clientY;
      if (!sim.centerIds.has(node.id)) node.pinned = true;
      wrap.classList.add("is-dragging-node");
      bindPointerTracking();
      event.preventDefault();
      return;
    }
    state.panning = true;
    state.panStartX = event.clientX;
    state.panStartY = event.clientY;
    state.panOriginTx = state.tx;
    state.panOriginTy = state.ty;
    wrap.classList.add("is-panning");
    bindPointerTracking();
  });

  const onMouseMove = (event) => {
    if (state.draggingNode) {
      if (
        !state.dragMoved &&
        Math.hypot(event.clientX - state.dragStartX, event.clientY - state.dragStartY) > 4
      ) {
        state.dragMoved = true;
      }
      const point = clientToGraph(event.clientX, event.clientY);
      state.draggingNode.x = point.x + state.dragOffsetX;
      state.draggingNode.y = point.y + state.dragOffsetY;
      refreshGraphVisuals();
      return;
    }
    if (!state.panning) return;
    state.tx = state.panOriginTx + (event.clientX - state.panStartX);
    state.ty = state.panOriginTy + (event.clientY - state.panStartY);
    applyTransform();
  };

  const endInteraction = () => {
    if (state.draggingNode && !sim.centerIds.has(state.draggingNode.id)) {
      state.draggingNode.pinned = false;
      reheatObsidianGraphSimulation(sim);
    }
    state.panning = false;
    state.draggingNode = null;
    wrap.classList.remove("is-panning", "is-dragging-node");
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  };

  const onMouseUp = () => {
    if (state.dragMoved) wrap.dataset.graphDragged = "true";
    endInteraction();
  };

  const bindPointerTracking = () => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  svg.addEventListener("dblclick", (event) => {
    if (event.target.closest?.(".external-graph-node")) return;
    fitToView();
  });

  for (const [nodeId, group] of nodeElements.entries()) {
    group.el.addEventListener("mouseenter", () => focusNode(nodeId));
    group.el.addEventListener("mouseleave", clearFocus);
  }

  const controls = document.createElement("div");
  controls.className = "external-graph-controls";
  controls.innerHTML = `
    <button type="button" class="external-graph-control-btn" data-action="zoom-in" title="Приблизить">+</button>
    <button type="button" class="external-graph-control-btn" data-action="zoom-out" title="Отдалить">−</button>
    <button type="button" class="external-graph-control-btn" data-action="reset" title="Сбросить вид">⟲</button>
  `;
  controls.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const rect = svg.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    if (button.dataset.action === "reset") {
      fitToView();
      return;
    }
    const factor = button.dataset.action === "zoom-in" ? 1.15 : 0.87;
    const nextScale = Math.min(3.2, Math.max(0.18, state.scale * factor));
    state.tx = cx - ((cx - state.tx) * nextScale) / state.scale;
    state.ty = cy - ((cy - state.ty) * nextScale) / state.scale;
    state.scale = nextScale;
    applyTransform();
  });
  wrap.appendChild(controls);
}

function buildGraphDataFromExternalFiles(items) {
  const nodes = [{ id: "root", label: "_Content", filePath: null, type: "folder", depth: 0 }];
  const edges = [];
  const folderIds = new Set(["root"]);
  const fileIdsByParent = new Map();

  function ensureFolder(folderPath) {
    if (!folderPath || folderPath === ".") return "root";
    const parts = folderPath.split("/").filter(Boolean);
    let parentId = "root";
    let builtPath = "";
    for (let i = 0; i < parts.length; i += 1) {
      builtPath = builtPath ? `${builtPath}/${parts[i]}` : parts[i];
      const folderId = `folder:${builtPath}`;
      if (!folderIds.has(folderId)) {
        nodes.push({ id: folderId, label: parts[i], filePath: null, type: "folder", depth: i + 1 });
        edges.push({ from: parentId, to: folderId });
        folderIds.add(folderId);
      }
      parentId = folderId;
    }
    return `folder:${folderPath}`;
  }

  for (const item of items) {
    const parentPath = item.parent && item.parent !== "." ? item.parent : ".";
    const parentId = ensureFolder(parentPath === "." ? null : parentPath);
    const fileId = `file:${item.path}`;
    const depth = parentPath && parentPath !== "." ? parentPath.split("/").filter(Boolean).length + 1 : 1;
    nodes.push({ id: fileId, label: item.title, filePath: item.path, type: "file", depth });
    edges.push({ from: parentId, to: fileId });
    if (!fileIdsByParent.has(parentPath)) fileIdsByParent.set(parentPath, []);
    fileIdsByParent.get(parentPath).push(fileId);
  }

  for (const group of fileIdsByParent.values()) {
    if (group.length < 2 || group.length > 8) continue;
    for (let i = 0; i < group.length - 1; i += 1) {
      edges.push({ from: group[i], to: group[i + 1], weak: true });
    }
  }

  return { nodes, edges };
}

function buildGraphDataFromNode() {
  const nodeLabel = activeLabel || getLabelFromPath(activePath) || "Тема";
  const nodes = [{ id: "root", label: nodeLabel, type: "folder", depth: 0 }];
  const edges = [];

  for (const group of getNodeGraphModeGroups()) {
    const hubId = `hub:${group.id}`;
    nodes.push({
      id: hubId,
      label: group.title,
      type: "folder",
      depth: 1
    });
    edges.push({ from: "root", to: hubId });

    for (const mode of group.modes) {
      const modeNodeId = `mode:${mode.id}`;
      nodes.push({
        id: modeNodeId,
        label: mode.label,
        type: "file",
        depth: 2,
        modeId: mode.id,
        disabled: Boolean(mode.disabled)
      });
      edges.push({ from: hubId, to: modeNodeId });
    }
  }

  return { nodes, edges };
}

function appendCosmicGraphBackground(wrap) {
  const bg = document.createElement("div");
  bg.className = "external-graph-space-bg";
  bg.setAttribute("aria-hidden", "true");
  bg.innerHTML = `
    <div class="external-graph-nebula external-graph-nebula--violet"></div>
    <div class="external-graph-nebula external-graph-nebula--blue"></div>
    <div class="external-graph-nebula external-graph-nebula--cyan"></div>
    <div class="external-graph-stars"></div>
  `;

  const starsLayer = bg.querySelector(".external-graph-stars");
  const starCount = 140;
  for (let i = 0; i < starCount; i += 1) {
    const star = document.createElement("span");
    star.className = "external-graph-star";
    const size = Math.random() > 0.9 ? 2.2 : Math.random() > 0.65 ? 1.4 : 1;
    star.style.left = `${Math.random() * 100}%`;
    star.style.top = `${Math.random() * 100}%`;
    star.style.width = `${size}px`;
    star.style.height = `${size}px`;
    star.style.opacity = String(0.2 + Math.random() * 0.75);
    star.style.animationDelay = `${Math.random() * 5}s`;
    star.style.animationDuration = `${2.4 + Math.random() * 3.6}s`;
    starsLayer.appendChild(star);
  }

  wrap.insertBefore(bg, wrap.firstChild);
}

function renderGraphCanvas(container, graph, options = {}) {
  const {
    ariaLabel = "Граф",
    fullViewport = false,
    showPreviews = false,
    isNodeActive = () => false,
    isNodeClickable = (node) => Boolean(node.filePath || (node.modeId && !node.disabled)),
    onNodeClick = () => {}
  } = options;

  const ns = "http://www.w3.org/2000/svg";
  const nodeCount = graph.nodes.length;
  const containerWidth = container.clientWidth || listViewContentNode?.clientWidth || 920;
  const containerHeight = container.clientHeight || 0;
  const { width, height } = getObsidianGraphLayoutSize(
    nodeCount,
    containerWidth,
    containerHeight,
    fullViewport
  );

  const wrap = document.createElement("div");
  wrap.className = "external-graph-wrap node-graph-wrap";
  if (showPreviews) wrap.classList.add("external-graph-wrap--previews");
  appendCosmicGraphBackground(wrap);

  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("class", "external-graph-canvas");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", ariaLabel);
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");

  const sim = createObsidianGraphSimulation(graph.nodes, graph.edges, width, height);
  const positioned = sim.nodes;
  const degrees = sim.degrees;
  const nodeById = sim.nodeById;

  const viewport = document.createElementNS(ns, "g");
  viewport.setAttribute("class", "external-graph-viewport");

  const defs = document.createElementNS(ns, "defs");
  viewport.appendChild(defs);

  const linksLayer = document.createElementNS(ns, "g");
  linksLayer.setAttribute("class", "external-graph-links");
  const linkElements = [];

  for (const edge of graph.edges) {
    const from = nodeById.get(edge.from);
    const to = nodeById.get(edge.to);
    if (!from || !to) continue;
    const line = document.createElementNS(ns, "line");
    line.setAttribute("x1", String(from.x));
    line.setAttribute("y1", String(from.y));
    line.setAttribute("x2", String(to.x));
    line.setAttribute("y2", String(to.y));
    line.setAttribute(
      "class",
      edge.weak ? "external-graph-link external-graph-link-weak" : "external-graph-link"
    );
    line.dataset.from = edge.from;
    line.dataset.to = edge.to;
    linksLayer.appendChild(line);
    linkElements.push({ el: line, from: edge.from, to: edge.to });
  }
  viewport.appendChild(linksLayer);

  const nodesLayer = document.createElementNS(ns, "g");
  nodesLayer.setAttribute("class", "external-graph-nodes");
  const nodeElements = new Map();

  for (const node of positioned) {
    const previewSize = getGraphNodePreviewSize(node, showPreviews);
    const radius = getGraphNodeRadius(node, degrees, showPreviews);
    const isActive = isNodeActive(node);
    const isDisabled = Boolean(node.disabled);
    const clickable = !isDisabled && isNodeClickable(node);

    const group = document.createElementNS(ns, "g");
    group.dataset.nodeId = node.id;
    group.setAttribute(
      "class",
      `external-graph-node${isActive ? " active" : ""}${isDisabled ? " disabled" : ""}${previewSize ? " has-preview" : ""}`.trim()
    );
    group.style.cursor = clickable ? "pointer" : "grab";

    const glow = document.createElementNS(ns, "circle");
    glow.setAttribute("cx", String(node.x));
    glow.setAttribute("cy", String(node.y));
    glow.setAttribute("r", String((previewSize || radius * 2) / 2 + 7));
    glow.setAttribute("class", `external-graph-glow ${node.type}${isActive ? " active" : ""}`.trim());
    group.appendChild(glow);

    let previewFrame = null;
    let previewImage = null;
    let previewGroup = null;
    const circle = document.createElementNS(ns, "circle");
    circle.setAttribute("cx", String(node.x));
    circle.setAttribute("cy", String(node.y));
    circle.setAttribute("r", String(radius));
    circle.setAttribute("class", `external-graph-dot ${node.type}${isActive ? " active" : ""}`.trim());

    if (previewSize) {
      circle.setAttribute("visibility", "hidden");
      const clipId = `graph-preview-${sanitizeGraphDomId(node.id)}`;
      const clipPath = document.createElementNS(ns, "clipPath");
      clipPath.setAttribute("id", clipId);
      const clipShape = document.createElementNS(ns, "rect");
      clipShape.setAttribute("width", String(previewSize));
      clipShape.setAttribute("height", String(previewSize));
      clipShape.setAttribute("rx", node.type === "folder" ? "6" : "4");
      clipPath.appendChild(clipShape);
      defs.appendChild(clipPath);

      previewGroup = document.createElementNS(ns, "g");
      previewGroup.setAttribute("class", "external-graph-preview-group");
      previewGroup.setAttribute(
        "transform",
        `translate(${node.x - previewSize / 2} ${node.y - previewSize / 2})`
      );

      previewFrame = document.createElementNS(ns, "rect");
      previewFrame.setAttribute("width", String(previewSize));
      previewFrame.setAttribute("height", String(previewSize));
      previewFrame.setAttribute("rx", node.type === "folder" ? "6" : "4");
      previewFrame.setAttribute(
        "class",
        `external-graph-preview-frame ${node.type}${isActive ? " active" : ""}`.trim()
      );
      previewGroup.appendChild(previewFrame);

      previewImage = document.createElementNS(ns, "image");
      previewImage.setAttribute("href", resolveGraphPreviewUrl(node));
      previewImage.setAttribute("width", String(previewSize));
      previewImage.setAttribute("height", String(previewSize));
      previewImage.setAttribute("clip-path", `url(#${clipId})`);
      previewImage.setAttribute("preserveAspectRatio", "xMidYMid slice");
      previewImage.setAttribute("class", "external-graph-preview-image");
      previewGroup.appendChild(previewImage);
      group.appendChild(previewGroup);
    }

    group.appendChild(circle);

    const label = document.createElementNS(ns, "text");
    label.setAttribute("x", String(node.x));
    label.setAttribute(
      "y",
      String(node.y + (previewSize ? previewSize / 2 + 10 : radius + 11))
    );
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("class", "external-graph-label");
    label.textContent = node.label;
    group.appendChild(label);

    const lines = linkElements.filter((line) => line.from === node.id || line.to === node.id);
    nodeElements.set(node.id, {
      el: group,
      glow,
      circle,
      label,
      radius,
      previewSize,
      previewGroup,
      previewFrame,
      previewImage,
      lines
    });

    group.addEventListener("mouseenter", () => {
      group.classList.add("hovered");
    });
    group.addEventListener("mouseleave", () => {
      group.classList.remove("hovered");
    });

    if (clickable) {
      group.addEventListener("click", (event) => {
        if (wrap.dataset.graphDragged === "true") {
          wrap.dataset.graphDragged = "false";
          return;
        }
        event.stopPropagation();
        onNodeClick(node);
      });
    }

    nodesLayer.appendChild(group);
  }

  viewport.appendChild(nodesLayer);
  svg.appendChild(viewport);
  wrap.appendChild(svg);
  container.appendChild(wrap);

  attachObsidianGraphViewport(
    wrap,
    svg,
    viewport,
    sim,
    nodeElements,
    linkElements,
    degrees,
    showPreviews
  );
}

function renderNodeGraphView() {
  if (!graphViewContentNode) return;
  graphViewContentNode.innerHTML = "";
  const render = () => {
    const graph = buildGraphDataFromNode();
    renderGraphCanvas(graphViewContentNode, graph, {
      ariaLabel: "Граф пространства",
      isNodeActive: (node) => Boolean(node.modeId && node.modeId === activeContentMode),
      isNodeClickable: (node) => Boolean(node.modeId && !node.disabled),
      onNodeClick: (node) => {
        setContentMode(node.modeId);
      }
    });
  };
  requestAnimationFrame(render);
}

function renderExternalGraphCanvas(container, items) {
  const graph = buildGraphDataFromExternalFiles(items);
  renderGraphCanvas(container, graph, {
    ariaLabel: "Граф файлов _Content",
    isNodeActive: (node) => Boolean(node.filePath && node.filePath === activeExternalFilePath),
    isNodeClickable: (node) => Boolean(node.filePath),
    onNodeClick: (node) => openExternalFile(node.filePath)
  });
}

const MEDIA_VIEW_GROUPS = {
  images: "Images",
  audio: "Audio",
  video: "Videos",
  documents: "Documents",
  archives: "Archives",
  other: "Other"
};

function buildMediaAssetUrl(filePath, nodePath = activePath) {
  if (!nodePath || !filePath) return "";
  return buildApiUrl("/api/media/file", { path: getResolvedNodePath(nodePath), file: filePath });
}

function buildMarkdownAttachmentRef(relativeAssetsPath) {
  const normalized = String(relativeAssetsPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("..")) return "";
  return `_Assets/${normalized}`;
}

function resolveMarkdownAssetSrc(src, nodePath) {
  const raw = String(src || "").trim();
  if (!raw) return raw;
  if (/^https?:\/\//i.test(raw) || /^data:/i.test(raw)) return raw;
  if (raw.startsWith("/api/")) return appendAgentToApiUrl(raw);

  let relFile = raw.replace(/\\/g, "/");
  const serviceFolder = getActiveAgentServiceFolder();
  const servicePrefix = serviceFolder ? `${serviceFolder}/` : "";

  if (serviceFolder && relFile.toLowerCase().startsWith(servicePrefix.toLowerCase())) {
    const tail = relFile.slice(servicePrefix.length);
    let serviceAsset = tail;
    if (serviceAsset.startsWith("_Storage/_Assets/")) {
      serviceAsset = serviceAsset.slice("_Storage/_Assets/".length);
    } else if (serviceAsset.toLowerCase().startsWith("_assets/")) {
      serviceAsset = serviceAsset.slice("_Assets/".length);
    }
    if (!serviceAsset.includes("..")) {
      const serviceManifest = getServiceRootManifestPath();
      if (serviceManifest) {
        return appendAgentToApiUrl(
          buildApiUrl("/api/media/file", { path: serviceManifest, file: serviceAsset })
        );
      }
    }
  }

  const resolvedNodePath = getResolvedNodePath(nodePath || activePath);
  if (!resolvedNodePath) return raw;

  if (relFile.startsWith("_Storage/_Assets/")) {
    relFile = relFile.slice("_Storage/_Assets/".length);
  } else if (relFile.toLowerCase().startsWith("_assets/")) {
    relFile = relFile.slice("_Assets/".length);
  }
  if (relFile.includes("..")) return raw;

  return appendAgentToApiUrl(
    buildApiUrl("/api/media/file", { path: resolvedNodePath, file: relFile })
  );
}

function getAttachmentAltText(fileName) {
  const base = String(fileName || "image").split("/").pop() || "image";
  const dot = base.lastIndexOf(".");
  const alt = dot > 0 ? base.slice(0, dot) : base;
  return alt.replace(/[[\]]/g, "").trim() || "image";
}

function buildMarkdownImageSnippet(relativeAssetsPath, altText) {
  const ref = buildMarkdownAttachmentRef(relativeAssetsPath);
  if (!ref) return "";
  const alt = String(altText || getAttachmentAltText(relativeAssetsPath)).replace(/[[\]]/g, "");
  return `\n![${alt}](${ref})\n`;
}

function buildPastedAttachmentFileName(file) {
  const mime = String(file?.type || "").toLowerCase();
  const name = String(file?.name || "").toLowerCase();
  let ext = "";
  if (mime === "image/png" || name.endsWith(".png")) ext = ".png";
  else if (mime === "image/gif" || name.endsWith(".gif")) ext = ".gif";
  else if (mime === "image/webp" || name.endsWith(".webp")) ext = ".webp";
  else if (mime === "image/heic" || mime === "image/heif" || name.endsWith(".heic") || name.endsWith(".heif")) {
    ext = ".heic";
  } else if (mime === "image/jpeg" || /\.jpe?g$/.test(name)) ext = ".jpg";
  else ext = ".png";
  const stamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
  return `pasted-${stamp}${ext}`;
}

async function normalizeImageAttachmentFile(file) {
  if (!file) return file;
  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  let ext = "";
  let mime = String(file.type || "").toLowerCase();

  if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47) {
    ext = ".png";
    mime = "image/png";
  } else if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
    ext = ".jpg";
    mime = "image/jpeg";
  } else if (header.length >= 6) {
    const gifHeader = String.fromCharCode(...header.slice(0, 6));
    if (gifHeader === "GIF87a" || gifHeader === "GIF89a") {
      ext = ".gif";
      mime = "image/gif";
    }
  }
  if (!ext && header.length >= 12) {
    const riff = String.fromCharCode(...header.slice(0, 4));
    const webp = String.fromCharCode(...header.slice(8, 12));
    if (riff === "RIFF" && webp === "WEBP") {
      ext = ".webp";
      mime = "image/webp";
    }
  }
  if (!ext && header.length >= 12 && String.fromCharCode(...header.slice(4, 8)) === "ftyp") {
    ext = ".heic";
    mime = "image/heic";
  }
  if (!ext) return file;

  const currentName = String(file.name || "");
  if (currentName.toLowerCase().endsWith(ext) && mime === String(file.type || "").toLowerCase()) {
    return file;
  }
  const baseName = buildPastedAttachmentFileName({ type: mime }).replace(/\.[^.]+$/, "");
  return new File([file], `${baseName}${ext}`, { type: mime });
}

function isAllowedMarkdownAttachmentImage(file) {
  if (!file) return false;
  const mime = String(file.type || "").toLowerCase();
  const name = String(file.name || "").toLowerCase();
  const extOk = /\.(jpe?g|png|gif|webp|heic|heif)$/.test(name);
  if (!extOk && mime && !mime.startsWith("image/")) return false;
  if (!mime) return extOk;
  return (
    mime === "image/jpeg" ||
    mime === "image/png" ||
    mime === "image/gif" ||
    mime === "image/webp" ||
    mime === "image/heic" ||
    mime === "image/heif"
  );
}

function dataTransferHasImage(dataTransfer) {
  if (!dataTransfer) return false;
  const files = dataTransfer.files ? [...dataTransfer.files] : [];
  if (files.some((file) => isAllowedMarkdownAttachmentImage(file))) return true;
  const types = dataTransfer.types ? [...dataTransfer.types] : [];
  return types.includes("Files");
}

function extractImageFileFromDataTransfer(dataTransfer) {
  if (!dataTransfer) return null;
  const items = dataTransfer.items ? [...dataTransfer.items] : [];
  for (const item of items) {
    if (item.kind !== "file") continue;
    const file = item.getAsFile();
    if (file && isAllowedMarkdownAttachmentImage(file)) return file;
  }
  const files = dataTransfer.files ? [...dataTransfer.files] : [];
  for (const file of files) {
    if (isAllowedMarkdownAttachmentImage(file)) return file;
  }
  return null;
}

function canPasteMarkdownAttachment() {
  if (!activePath || activeSystemFile) return false;
  if (isCurrentModeReadOnly()) return false;
  if (isCurrentModeListTemplate()) return false;
  if (editorViewMode === "preview") return false;
  return true;
}

function insertTextAtEditorCursor(text) {
  const snippet = String(text || "");
  if (!snippet || !fileContentInputNode) return;
  const start = fileContentInputNode.selectionStart ?? fileContentInputNode.value.length;
  const end = fileContentInputNode.selectionEnd ?? start;
  const before = fileContentInputNode.value.slice(0, start);
  const after = fileContentInputNode.value.slice(end);
  fileContentInputNode.value = `${before}${snippet}${after}`;
  const cursor = start + snippet.length;
  fileContentInputNode.selectionStart = cursor;
  fileContentInputNode.selectionEnd = cursor;
  fileContentInputNode.dispatchEvent(new Event("input", { bubbles: true }));
  fileContentInputNode.focus();
}

async function uploadMediaAttachment(file, { nodePath = getActiveNodeApiPath() } = {}) {
  if (!file) return null;
  if (!nodePath) {
    throw new Error("Сначала откройте тему");
  }
  const normalizedFile = await normalizeImageAttachmentFile(file);
  const data = await readFileAsBase64(normalizedFile);
  const response = await fetch(buildApiUrl("/api/media/file"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      path: getResolvedNodePath(nodePath),
      data,
      fileName: normalizedFile.name || buildPastedAttachmentFileName(normalizedFile),
      mimeType: normalizedFile.type
    })
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const details = errorData.details ? `: ${errorData.details}` : "";
    throw new Error(`${errorData.error || `Request failed with ${response.status}`}${details}`);
  }
  return response.json();
}

async function refreshMediaListIfVisible() {
  if (activeContentMode !== "media" || isMediaSidecarEditing()) return;
  await refreshMediaCache();
  renderListViewContent();
}

async function insertUploadedAttachmentIntoEditor(file) {
  const normalizedFile = await normalizeImageAttachmentFile(file);
  if (!isAllowedMarkdownAttachmentImage(normalizedFile)) {
    showToast("Допустимы только JPG, PNG, GIF, WebP и HEIC", "error");
    return;
  }

  try {
    const payload = await uploadMediaAttachment(normalizedFile);
    const relativeFile = payload?.file;
    if (!relativeFile) throw new Error("Upload response missing file path");

    const markdown = buildMarkdownImageSnippet(relativeFile, getAttachmentAltText(file.name));
    insertTextAtEditorCursor(markdown);

    showToast("Изображение сохранено в _Assets", "success");
    await refreshMediaListIfVisible();
  } catch (error) {
    showToast(`Ошибка загрузки: ${error.message}`, "error");
  }
}

async function uploadMediaFileFromPicker(file) {
  if (!file || !activePath) return;
  try {
    await uploadMediaAttachment(file);
    showToast("Файл сохранён в _Assets", "success");
    await refreshMediaListIfVisible();
  } catch (error) {
    showToast(`Ошибка загрузки: ${error.message}`, "error");
  } finally {
    if (mediaUploadInputNode) mediaUploadInputNode.value = "";
  }
}

function getMediaSidecarPath(mediaFilePath) {
  const normalized = String(mediaFilePath || "").replace(/\\/g, "/");
  if (!normalized || normalized.endsWith("/")) return null;
  const lastSlash = normalized.lastIndexOf("/");
  const dir = lastSlash >= 0 ? normalized.slice(0, lastSlash + 1) : "";
  const filename = lastSlash >= 0 ? normalized.slice(lastSlash + 1) : normalized;
  const dotIndex = filename.lastIndexOf(".");
  const base = dotIndex > 0 ? filename.slice(0, dotIndex) : filename;
  if (!base) return null;
  return `${dir}${base}.sidecar.md`;
}

function createMediaSidecarEditButton(item) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "media-action-btn";
  btn.textContent = "Редактировать";
  btn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    void openMediaSidecar(item.path);
  });
  return btn;
}

function createMediaOpenButton(item) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "media-action-btn";
  btn.textContent = "Открыть";
  btn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    window.open(buildMediaAssetUrl(item.path), "_blank", "noopener");
  });
  return btn;
}

function formatFileSize(bytes) {
  const size = Number(bytes) || 0;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getDocumentIcon(ext) {
  const extension = String(ext || "").toLowerCase();
  if (extension === ".pdf") return "📕";
  if ([".doc", ".docx"].includes(extension)) return "📘";
  if ([".xls", ".xlsx"].includes(extension)) return "📗";
  if ([".ppt", ".pptx"].includes(extension)) return "📙";
  if ([".md", ".txt"].includes(extension)) return "📝";
  return "📄";
}

function getMediaItemsForView(viewMode) {
  const groupName = MEDIA_VIEW_GROUPS[viewMode];
  if (!groupName) return [];
  const items = Array.isArray(mediaFilesCache[groupName]) ? mediaFilesCache[groupName] : [];
  return items.filter((item) => !item.isFolder);
}

function renderMediaEmpty(container, message = "Файлы не найдены") {
  renderListEmptyMessage(container, message);
}

const STORAGE_FOLDER_LABELS = {
  inbox: "_Inbox",
  references: "_Referenses",
  scripts: "_Scripts",
  media: "_Assets"
};

function getStorageFolderMissingMessage(mode = activeContentMode) {
  const folder = STORAGE_FOLDER_LABELS[mode];
  return folder ? `Папка ${folder} не найдена` : "Папка не найдена";
}

function getStorageFolderEmptyMessage(mode = activeContentMode) {
  const folder = STORAGE_FOLDER_LABELS[mode];
  return folder ? `Папка ${folder} пуста` : "Список пуст";
}

function isFlatStorageListMode(mode = activeContentMode) {
  return mode === "inbox" || mode === "references" || mode === "scripts";
}

function isFlatStorageListSourceToggleMode(mode = activeContentMode) {
  return mode === "scripts";
}

function isTabularSourceEditing() {
  return activeContentMode === "tabular" && editorViewMode === "source";
}

function isListViewWithSourceToggleMode(mode = activeContentMode) {
  return isFlatStorageListSourceToggleMode(mode);
}

function isWorkspaceRefreshAvailable() {
  if (!activePath || activeSystemFile) return false;
  if (activeContentMode === NODE_OVERVIEW_MODE || activeContentMode === NODE_NAVIGATION_MODE) return true;
  if (isFlatStorageListMode()) return true;
  if (activeContentMode === "external" && !activeExternalFilePath) return true;
  if (activeContentMode === "media" && !isMediaSidecarEditing()) return true;
  if (activeContentMode === "tabular" && !isTabularSourceEditing()) return true;
  return false;
}

function isRevealNodeFolderAvailable() {
  return Boolean(activePath && !activeSystemFile);
}

function syncWorkspaceRevealFolderButton() {
  if (!workspaceRevealFolderBtn) return;
  const label = getRevealFolderLabel();
  workspaceRevealFolderBtn.title = label;
  workspaceRevealFolderBtn.setAttribute("aria-label", label);
  workspaceRevealFolderBtn.classList.toggle("hidden", !isRevealNodeFolderAvailable());
}

let workspaceRefreshInFlight = false;

async function refreshWorkspaceContent() {
  if (!isWorkspaceRefreshAvailable() || workspaceRefreshInFlight) return;
  workspaceRefreshInFlight = true;
  workspaceRefreshBtn?.classList.add("is-spinning");
  workspaceRefreshBtn?.setAttribute("disabled", "disabled");
  try {
    await loadContentByMode();
  } finally {
    workspaceRefreshInFlight = false;
    workspaceRefreshBtn?.classList.remove("is-spinning");
    workspaceRefreshBtn?.removeAttribute("disabled");
  }
}

function renderListEmptyMessage(container, message) {
  const empty = document.createElement("div");
  empty.className = "list-empty";
  empty.textContent = message;
  container.appendChild(empty);
}

function applyFlatStorageFolderLoadState(mode, data) {
  activeStorageFolderExists = Boolean(data.exists);
  modeContentCache[mode] = data.content || "";
  if (!activeStorageFolderExists) {
    fileContentInputNode.value = isFlatStorageListSourceToggleMode(mode)
      ? getStorageFolderMissingMessage(mode)
      : "";
    return;
  }
  fileContentInputNode.value = modeContentCache[mode];
}

function renderMediaFileRows(container, items, { icon = "📄", showSize = true } = {}) {
  if (items.length === 0) {
    renderMediaEmpty(container);
    return;
  }

  const list = document.createElement("ul");
  list.className = "media-file-list";

  for (const item of items) {
    const li = document.createElement("li");
    li.className = "media-file-item";

    const iconNode = document.createElement("span");
    iconNode.className = "media-file-icon";
    iconNode.textContent = icon;

    const body = document.createElement("div");
    body.className = "media-file-body";

    const nameNode = document.createElement("div");
    nameNode.className = "media-file-name";
    nameNode.textContent = item.name;

    const pathNode = document.createElement("div");
    pathNode.className = "media-file-path";
    pathNode.textContent = item.path;

    body.appendChild(nameNode);
    body.appendChild(pathNode);

    if (showSize && item.size) {
      const sizeNode = document.createElement("div");
      sizeNode.className = "media-file-size";
      sizeNode.textContent = formatFileSize(item.size);
      body.appendChild(sizeNode);
    }

    const actions = document.createElement("div");
    actions.className = "media-file-actions";
    actions.appendChild(createMediaSidecarEditButton(item));
    actions.appendChild(createMediaOpenButton(item));

    li.appendChild(iconNode);
    li.appendChild(body);
    li.appendChild(actions);
    list.appendChild(li);
  }

  container.appendChild(list);
}

function renderMediaImagesGrid(container, items) {
  if (items.length === 0) {
    renderMediaEmpty(container, "Изображения не найдены");
    return;
  }

  const grid = document.createElement("div");
  grid.className = "media-images-grid";

  for (const item of items) {
    const card = document.createElement("article");
    card.className = "media-image-card";

    const imgWrap = document.createElement("div");
    imgWrap.className = "media-image-thumb";

    const img = document.createElement("img");
    img.alt = item.name;
    img.loading = "lazy";
    img.src = buildMediaAssetUrl(item.path);
    img.addEventListener("error", () => {
      imgWrap.classList.add("media-image-thumb-error");
      img.remove();
      const fallback = document.createElement("span");
      fallback.className = "media-image-fallback";
      fallback.textContent = "🖼";
      imgWrap.appendChild(fallback);
    });
    imgWrap.addEventListener("click", () => {
      window.open(buildMediaAssetUrl(item.path), "_blank", "noopener");
    });
    imgWrap.appendChild(img);

    const nameNode = document.createElement("div");
    nameNode.className = "media-image-name";
    nameNode.textContent = item.name;

    const pathNode = document.createElement("div");
    pathNode.className = "media-image-path";
    pathNode.textContent = item.path;

    const actions = document.createElement("div");
    actions.className = "media-image-actions";

    actions.appendChild(createMediaSidecarEditButton(item));
    actions.appendChild(createMediaOpenButton(item));

    card.appendChild(imgWrap);
    card.appendChild(nameNode);
    card.appendChild(pathNode);
    card.appendChild(actions);
    grid.appendChild(card);
  }

  container.appendChild(grid);
}

function renderMediaAudioList(container, items) {
  if (items.length === 0) {
    renderMediaEmpty(container, "Аудиофайлы не найдены");
    return;
  }

  const list = document.createElement("div");
  list.className = "media-player-list";

  for (const item of items) {
    const row = document.createElement("article");
    row.className = "media-player-item";

    const meta = document.createElement("div");
    meta.className = "media-player-meta";
    meta.innerHTML = `
      <div class="media-file-name">${escapeHtml(item.name)}</div>
      <div class="media-file-path">${escapeHtml(item.path)}</div>
    `;

    const audio = document.createElement("audio");
    audio.className = "media-audio-player";
    audio.controls = true;
    audio.preload="none";
    audio.src = buildMediaAssetUrl(item.path);

    row.appendChild(meta);
    row.appendChild(audio);

    const actions = document.createElement("div");
    actions.className = "media-player-actions";
    actions.appendChild(createMediaSidecarEditButton(item));
    actions.appendChild(createMediaOpenButton(item));
    row.appendChild(actions);
    list.appendChild(row);
  }

  container.appendChild(list);
}

function renderMediaVideoList(container, items) {
  if (items.length === 0) {
    renderMediaEmpty(container, "Видеофайлы не найдены");
    return;
  }

  const list = document.createElement("div");
  list.className = "media-player-list";

  for (const item of items) {
    const row = document.createElement("article");
    row.className = "media-player-item media-video-item";

    const meta = document.createElement("div");
    meta.className = "media-player-meta";
    meta.innerHTML = `
      <div class="media-file-name">${escapeHtml(item.name)}</div>
      <div class="media-file-path">${escapeHtml(item.path)}</div>
    `;

    const video = document.createElement("video");
    video.className = "media-video-player";
    video.controls = true;
    video.preload = "metadata";
    video.src = buildMediaAssetUrl(item.path);

    row.appendChild(meta);
    row.appendChild(video);

    const actions = document.createElement("div");
    actions.className = "media-player-actions";
    actions.appendChild(createMediaSidecarEditButton(item));
    actions.appendChild(createMediaOpenButton(item));
    row.appendChild(actions);
    list.appendChild(row);
  }

  container.appendChild(list);
}

function renderMediaFilteredView(container) {
  const items = getMediaItemsForView(mediaViewMode);

  if (mediaViewMode === "images") {
    renderMediaImagesGrid(container, items);
    return;
  }
  if (mediaViewMode === "audio") {
    renderMediaAudioList(container, items);
    return;
  }
  if (mediaViewMode === "video") {
    renderMediaVideoList(container, items);
    return;
  }
  if (mediaViewMode === "documents") {
    renderMediaFileRows(
      container,
      items,
      { icon: "📄", showSize: true }
    );
    for (const row of container.querySelectorAll(".media-file-item")) {
      const index = Array.from(container.querySelectorAll(".media-file-item")).indexOf(row);
      const item = items[index];
      if (!item) continue;
      const iconNode = row.querySelector(".media-file-icon");
      if (iconNode) iconNode.textContent = getDocumentIcon(item.ext);
    }
    return;
  }
  if (mediaViewMode === "archives") {
    renderMediaFileRows(container, items, { icon: "📦", showSize: true });
    return;
  }
  if (mediaViewMode === "other") {
    renderMediaFileRows(container, items, { icon: "📎", showSize: true });
  }
}

function renderListViewContent() {
  const raw = getListViewRawContent();
  listViewContentNode.innerHTML = "";

  if (activeContentMode === "tabular" && !isTabularSourceEditing()) {
    renderTabularTableView(listViewContentNode);
    return;
  }

  if (activeContentMode === "media" && !isMediaSidecarEditing()) {
    if (!mediaAssetsExists) {
      renderListEmptyMessage(listViewContentNode, getStorageFolderMissingMessage("media"));
      return;
    }
    if (mediaViewMode !== "all") {
      if (!Object.values(mediaFilesCache).some((items) => Array.isArray(items) && items.length > 0)) {
        syncMediaFilesCache(modeContentCache.media, mediaFilesCache);
      }
      renderMediaFilteredView(listViewContentNode);
      return;
    }
  }

  if (isFlatStorageListMode()) {
    if (!activeStorageFolderExists) {
      renderListEmptyMessage(listViewContentNode, getStorageFolderMissingMessage());
      return;
    }
    if (!raw.trim()) {
      renderListEmptyMessage(listViewContentNode, getStorageFolderEmptyMessage());
      return;
    }
  }

  const naturalCollator = new Intl.Collator("ru", { sensitivity: "base", numeric: true });

  function buildMockMeta(pathValue, index) {
    const fileName = pathValue.split("/").pop() || pathValue;
    const pathParts = pathValue.split("/").filter(Boolean);
    const title = fileName.replace(/\.md$/i, "");
    const baseDay = (index % 26) + 1;
    const created = `2026-05-${String(baseDay).padStart(2, "0")}`;
    const updated = `2026-06-${String(((baseDay + 5) % 28) + 1).padStart(2, "0")}`;
    const done = index % 3 === 0 ? "Да" : "Нет";
    const cover = "Есть";
    const tags = index % 2 === 0 ? "agent, note" : "task, draft";
    const parent = pathParts.length > 1 ? pathParts[pathParts.length - 2] : getAgentTreeTitle();
    return { title, created, updated, done, cover, tags, parent };
  }

  function comparePathsNatural(aPath, bPath) {
    const aParts = aPath.split("/").filter(Boolean);
    const bParts = bPath.split("/").filter(Boolean);
    const len = Math.min(aParts.length, bParts.length);
    for (let i = 0; i < len; i += 1) {
      const cmp = naturalCollator.compare(aParts[i], bParts[i]);
      if (cmp !== 0) return cmp;
    }
    return aParts.length - bParts.length;
  }

  if (!raw.trim()) {
    const externalListMode = activeContentMode === "external" && !isExternalFileEditing();
    const canRenderExternalFromCache = externalListMode && externalFilesCache.length > 0;
    if (!canRenderExternalFromCache) {
      const empty = document.createElement("div");
      empty.className = "list-empty";
      if (activeContentMode === "media" && !isMediaSidecarEditing()) {
        empty.textContent = getStorageFolderEmptyMessage("media");
      } else if (externalListMode) {
        empty.textContent = "Markdown-файлы не найдены";
      } else {
        empty.textContent = "Список пуст";
      }
      listViewContentNode.appendChild(empty);
      return;
    }
  }

  const sections = activeContentMode === "media"
    ? parseMediaSections(raw)
    : [{ title: "Файлы", items: parseFlatListItems(raw) }];

  if (activeContentMode === "external") {
    const mdItems = externalFilesCache
      .map((item) => ({
        path: item.relativePath,
        name: item.name,
        parent: item.parent,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        title: item.name.replace(/\.md$/i, "")
      }))
      .sort((a, b) => comparePathsNatural(a.path, b.path));

    if (mdItems.length === 0) {
      const empty = document.createElement("div");
      empty.className = "list-empty";
      empty.textContent = "Markdown-файлы не найдены";
      listViewContentNode.appendChild(empty);
      return;
    }

    if (externalViewMode === "table") {
      const table = document.createElement("table");
      table.className = "external-table";
      table.innerHTML = `
        <thead>
          <tr>
            <th>Файл</th>
            <th>Заголовок</th>
            <th>Создан</th>
            <th>Обновлен</th>
            <th>Выполнен</th>
            <th>Обложка</th>
            <th>Тэги</th>
            <th>Родитель</th>
            <th>Путь</th>
          </tr>
        </thead>
      `;
      const tbody = document.createElement("tbody");
      for (const [index, item] of mdItems.entries()) {
        const tr = document.createElement("tr");
        const meta = buildMockMeta(item.path, index);
        const created = item.createdAt ? item.createdAt.slice(0, 10) : meta.created;
        const updated = item.updatedAt ? item.updatedAt.slice(0, 10) : meta.updated;
        tr.innerHTML = `
          <td>${escapeHtml(item.name)}</td>
          <td>${escapeHtml(item.title)}</td>
          <td>${escapeHtml(created)}</td>
          <td>${escapeHtml(updated)}</td>
          <td>${escapeHtml(meta.done)}</td>
          <td>${escapeHtml(meta.cover)}</td>
          <td>${escapeHtml(meta.tags)}</td>
          <td>${escapeHtml(item.parent || meta.parent)}</td>
          <td>${escapeHtml(item.path)}</td>
        `;
        tr.style.cursor = "pointer";
        tr.addEventListener("click", () => openExternalFile(item.path));
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);
      listViewContentNode.appendChild(table);
      return;
    }

    if (externalViewMode === "cards") {
      const grid = document.createElement("div");
      grid.className = "external-cards-grid";
      for (const item of mdItems) {
        const card = document.createElement("article");
        card.className = "external-card";
        const fileName = item.path.split("/").pop() || item.path;
        card.innerHTML = `
          <div class="external-card-image">Фото (рыба)</div>
          <div class="external-card-body">
            <div class="list-item-path">${escapeHtml(fileName)}</div>
            <div class="list-item-path">${escapeHtml(item.path)}</div>
          </div>
        `;
        grid.appendChild(card);
      }
      listViewContentNode.appendChild(grid);
      return;
    }

    if (externalViewMode === "calendar") {
      const weekDays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
      const calendar = document.createElement("div");
      calendar.className = "external-calendar-grid";
      const buckets = weekDays.map((title) => ({ title, items: [] }));
      mdItems.forEach((item, idx) => {
        buckets[idx % 7].items.push(item.path.split("/").pop() || item.path);
      });
      for (const bucket of buckets) {
        const day = document.createElement("div");
        day.className = "external-calendar-day";
        const head = document.createElement("div");
        head.className = "external-calendar-day-title";
        head.textContent = bucket.title;
        day.appendChild(head);
        for (const entry of bucket.items.slice(0, 5)) {
          const chip = document.createElement("div");
          chip.className = "external-calendar-item";
          chip.textContent = entry;
          day.appendChild(chip);
        }
        calendar.appendChild(day);
      }
      listViewContentNode.appendChild(calendar);
      return;
    }

    if (externalViewMode === "index") {
      const groups = new Map();
      for (const item of mdItems) {
        const key = item.parent && item.parent !== "." ? item.parent : "Корень";
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(item);
      }

      const sortedGroups = Array.from(groups.entries()).sort((a, b) =>
        comparePathsNatural(a[0], b[0])
      );

      for (const [groupTitle, items] of sortedGroups) {
        const sectionNode = document.createElement("section");
        sectionNode.className = "external-index-section";

        const headerNode = document.createElement("div");
        headerNode.className = "external-index-section-title";
        headerNode.textContent = groupTitle;
        sectionNode.appendChild(headerNode);

        const listNode = document.createElement("ul");
        listNode.className = "external-index-list";

        for (const item of items) {
          const li = document.createElement("li");
          li.className = "external-index-item";
          li.textContent = item.title;
          li.title = item.path;
          li.addEventListener("click", () => openExternalFile(item.path));
          listNode.appendChild(li);
        }

        sectionNode.appendChild(listNode);
        listViewContentNode.appendChild(sectionNode);
      }
      return;
    }

    if (externalViewMode === "moc") {
      const groups = new Map();
      for (const [index, item] of mdItems.entries()) {
        const meta = buildMockMeta(item.path, index);
        const topic = String(meta.tags || "other")
          .split(",")[0]
          .trim() || "other";
        if (!groups.has(topic)) groups.set(topic, []);
        groups.get(topic).push(item);
      }

      const grid = document.createElement("div");
      grid.className = "external-moc-grid";

      for (const [topic, items] of Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0], "ru"))) {
        const card = document.createElement("article");
        card.className = "external-moc-card";

        const title = document.createElement("div");
        title.className = "external-moc-card-title";
        title.textContent = topic;
        card.appendChild(title);

        const listNode = document.createElement("ul");
        listNode.className = "external-moc-list";

        for (const item of items) {
          const li = document.createElement("li");
          li.className = "external-moc-item";
          li.textContent = item.title;
          li.title = item.path;
          li.addEventListener("click", () => openExternalFile(item.path));
          listNode.appendChild(li);
        }

        card.appendChild(listNode);
        grid.appendChild(card);
      }

      listViewContentNode.appendChild(grid);
      return;
    }

    if (externalViewMode === "graph") {
      renderExternalGraphCanvas(listViewContentNode, mdItems);
      return;
    }
  }

  for (const section of sections) {
    const normalizedItems = section.items
      .map((item) => normalizeListItem(item))
      .filter((item) => item.path)
      .sort((a, b) => {
        if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
        return comparePathsNatural(a.path, b.path);
      });

    const sectionNode = document.createElement("section");
    sectionNode.className = "list-section";

    if (!isFlatStorageListMode()) {
      const headerNode = document.createElement("div");
      headerNode.className = "list-section-header";
      headerNode.textContent = section.title;
      sectionNode.appendChild(headerNode);
    }

    const listNode = document.createElement("ul");
    listNode.className = "list-items";

    for (const normalized of normalizedItems) {
      const li = document.createElement("li");
      li.className = "list-item";
        if (activeContentMode === "external" && normalized.path.toLowerCase().endsWith(".md")) {
          li.style.cursor = "pointer";
          li.addEventListener("click", () => openExternalFile(normalized.path));
        }

      const icon = document.createElement("span");
      icon.className = "list-item-icon";
      icon.textContent = normalized.isFolder ? "📁" : "📄";

      const pathNode = document.createElement("span");
      pathNode.className = "list-item-path";
      pathNode.textContent = normalized.path;

      li.appendChild(icon);
      li.appendChild(pathNode);

      if (activeContentMode === "media" && !normalized.isFolder) {
        li.classList.add("list-item-with-actions");
        const actions = document.createElement("div");
        actions.className = "list-item-actions";
        actions.appendChild(createMediaSidecarEditButton({ path: normalized.path }));
        actions.appendChild(createMediaOpenButton({ path: normalized.path }));
        li.appendChild(actions);
      }

      listNode.appendChild(li);
    }

    sectionNode.appendChild(listNode);
    listViewContentNode.appendChild(sectionNode);
  }
}

function clearMediaSidecarEditor() {
  activeMediaSidecarSourcePath = null;
  activeMediaSidecarPath = null;
  resetTitleInputState();
}

function placeTitleFixedInBreadcrumbs() {
  if (!filePathNode || !titleFixedValueNode) return;
  titleFixedValueNode.classList.add("breadcrumb-service-title");
  if (titleFixedValueNode.parentElement !== filePathNode) {
    filePathNode.appendChild(titleFixedValueNode);
  }
}

function placeTitleFixedInTitleRow() {
  if (!titleRowNode || !titleFixedValueNode) return;
  titleFixedValueNode.classList.remove("breadcrumb-service-title");
  if (titleFixedValueNode.parentElement !== titleRowNode) {
    titleRowNode.appendChild(titleFixedValueNode);
  }
}

function clearFilePathNode() {
  if (!filePathNode) return;
  Array.from(filePathNode.childNodes).forEach((node) => {
    if (node !== titleFixedValueNode) node.remove();
  });
}

function setTitleLockedDisplay(label) {
  titleInputNode.classList.add("hidden");
  titleInputNode.readOnly = true;
  titleMediaExtNode?.classList.add("hidden");
  titleFixedValueNode.classList.remove("hidden");
  if (titleFixedTextNode) titleFixedTextNode.textContent = label || "";
  if (activeSystemFile) {
    placeTitleFixedInBreadcrumbs();
  } else {
    placeTitleFixedInTitleRow();
  }
}

function showTitleEditableInput() {
  titleInputNode.classList.remove("hidden");
  titleInputNode.disabled = false;
  titleInputNode.readOnly = false;
  titleFixedValueNode.classList.add("hidden");
  if (titleFixedTextNode) titleFixedTextNode.textContent = "";
  placeTitleFixedInTitleRow();
}

function resetTitleInputState() {
  showTitleEditableInput();
  titleMediaExtNode?.classList.add("hidden");
  if (titleMediaExtNode) titleMediaExtNode.textContent = "";
}

function splitMediaFileName(filePath = activeMediaSidecarSourcePath) {
  const fileName = getMediaSidecarFileName(filePath);
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex <= 0) return { base: fileName, ext: "" };
  return { base: fileName.slice(0, dotIndex), ext: fileName.slice(dotIndex) };
}

function getMediaSidecarTitleBase(filePath = activeMediaSidecarSourcePath) {
  return splitMediaFileName(filePath).base;
}

function buildMediaFileNameFromTitle(titleBase, filePath = activeMediaSidecarSourcePath) {
  const base = String(titleBase || "").trim();
  if (!base) return "";
  const { ext } = splitMediaFileName(filePath);
  return `${base}${ext}`;
}

function applyMediaSidecarTitleUi() {
  const { base, ext } = splitMediaFileName();
  showTitleEditableInput();
  titleInputNode.value = base;
  titleInputNode.readOnly = false;
  titleInputNode.disabled = false;
  if (titleMediaExtNode) {
    if (ext) {
      titleMediaExtNode.textContent = ext;
      titleMediaExtNode.classList.remove("hidden");
    } else {
      titleMediaExtNode.textContent = "";
      titleMediaExtNode.classList.add("hidden");
    }
  }
}

function getMediaSidecarFileName(filePath = activeMediaSidecarSourcePath) {
  return filePath ? (filePath.split("/").pop() || filePath) : "";
}

async function refreshMediaCache() {
  if (!activePath || activeContentMode !== "media") return;
  try {
    const response = await fetch(buildApiUrl("/api/media", { path: activePath }));
    if (!response.ok) return;
    const data = await response.json();
    mediaAssetsExists = Boolean(data.exists);
    modeContentCache.media = data.content || "";
    syncMediaFilesCache(data.content, data.groups);
  } catch {
    // ignore cache refresh errors
  }
}

function closeMediaSidecarEditor() {
  clearMediaSidecarEditor();
  fileContentInputNode.value = "";
  applyModeUi();
  renderListViewContent();
  updateBreadcrumbsForActiveMode();
}

function closeExternalFileEditor() {
  void refreshExternalFileListView();
}

async function refreshExternalFileListView({ reloadFromServer = true } = {}) {
  if (!activePath || activeContentMode !== "external") return;

  activeExternalFilePath = null;
  setPropsYamlContent("");
  titleInputNode.value = "";
  updateYamlPanelLabel();
  editorViewMode = "preview";

  if (reloadFromServer) {
    try {
      const response = await fetch(buildApiUrl("/api/external/files", { path: activePath }));
      if (response.ok) {
        const data = await response.json();
        externalFilesCache = Array.isArray(data.files) ? data.files : [];
        modeContentCache.external = externalFilesCache.map((file) => file.relativePath).join("\n");
        fileContentInputNode.value = data.exists ? modeContentCache.external : "Папка не найдена";
      } else {
        fileContentInputNode.value = modeContentCache.external || "";
      }
    } catch {
      fileContentInputNode.value = modeContentCache.external || "";
    }
  } else {
    fileContentInputNode.value = modeContentCache.external || "";
  }

  updateBreadcrumbsForActiveMode();
  applyModeUi();
  renderListViewContent();
}

function enableMediaSidecarEditor(sourceFilePath, sidecarPath, content) {
  activeMediaSidecarSourcePath = sourceFilePath;
  activeMediaSidecarPath = sidecarPath;
  updateBreadcrumbsForActiveMode();
  titleEditorBlockNode.classList.remove("hidden");
  applyMediaSidecarTitleUi();
  fileContentInputNode.value = content || "";
  editorViewMode = "source";
  applyModeUi();
  setEditorViewMode("source");
}

async function openMediaSidecar(mediaFilePath) {
  if (!activePath || activeContentMode !== "media" || !mediaFilePath) return;
  try {
    const response = await fetch(
      buildApiUrl("/api/media/sidecar", { path: activePath, file: mediaFilePath })
    );
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Request failed with ${response.status}`);
    }
    const data = await response.json();
    enableMediaSidecarEditor(data.sourceFile, data.sidecar, data.content || "");
    if (data.created) showToast("Sidecar-файл создан", "success");
  } catch (error) {
    showToast("Ошибка открытия sidecar", "error");
  }
}

function isExternalFileEditing() {
  return activeContentMode === "external" && Boolean(activeExternalFilePath);
}

let propsFormEntries = [];
let propsRawYamlVisible = false;

function formatYamlScalar(value) {
  const text = String(value ?? "");
  if (!text || /[:#\[\]{}&,*?]|^\s|\s$/.test(text)) {
    return `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return text;
}

function parsePropsYaml(text) {
  const lines = String(text || "").replace(/^\uFEFF/, "").split(/\r?\n/);
  const entries = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim() || line.trim().startsWith("#")) {
      index += 1;
      continue;
    }

    const match = line.match(/^(\s*)([^:]+):\s*(.*)$/);
    if (!match || match[1].length > 0) {
      index += 1;
      continue;
    }

    const key = match[2].trim();
    const rest = match[3];

    if (rest === "" || rest === "|" || rest === ">") {
      const items = [];
      index += 1;
      while (index < lines.length && /^\s+-\s?/.test(lines[index])) {
        items.push(lines[index].replace(/^\s+-\s?/, "").trim().replace(/^["']|["']$/g, ""));
        index += 1;
      }
      if (items.length) {
        entries.push({ key, kind: "array", value: items });
        continue;
      }
      entries.push({ key, kind: "string", value: "" });
      continue;
    }

    if (rest.startsWith("[") && rest.endsWith("]")) {
      const inner = rest.slice(1, -1).trim();
      const value = inner
        ? inner.split(",").map((part) => part.trim().replace(/^["']|["']$/g, ""))
        : [];
      entries.push({ key, kind: "array", value });
      index += 1;
      continue;
    }

    if (rest === "true" || rest === "false") {
      entries.push({ key, kind: "bool", value: rest === "true" });
      index += 1;
      continue;
    }

    if (rest === "null" || rest === "~") {
      entries.push({ key, kind: "null", value: null });
      index += 1;
      continue;
    }

    if (/^-?\d+(?:\.\d+)?$/.test(rest)) {
      entries.push({ key, kind: "number", value: Number(rest) });
      index += 1;
      continue;
    }

    if (
      (rest.startsWith('"') && rest.endsWith('"')) ||
      (rest.startsWith("'") && rest.endsWith("'"))
    ) {
      entries.push({ key, kind: "string", value: rest.slice(1, -1) });
      index += 1;
      continue;
    }

    entries.push({ key, kind: "string", value: rest });
    index += 1;
  }

  return entries;
}

function stringifyPropsYaml(entries) {
  const lines = [];
  for (const entry of entries) {
    if (!entry.key) continue;
    if (entry.kind === "array") {
      const items = Array.isArray(entry.value) ? entry.value : [];
      if (!items.length) {
        lines.push(`${entry.key}: []`);
      } else if (items.length === 1) {
        lines.push(`${entry.key}: ${formatYamlScalar(items[0])}`);
      } else {
        lines.push(`${entry.key}:`);
        for (const item of items) {
          lines.push(`  - ${formatYamlScalar(item)}`);
        }
      }
      continue;
    }
    if (entry.kind === "bool") {
      lines.push(`${entry.key}: ${entry.value ? "true" : "false"}`);
      continue;
    }
    if (entry.kind === "number") {
      lines.push(`${entry.key}: ${entry.value}`);
      continue;
    }
    if (entry.kind === "null") {
      lines.push(`${entry.key}: null`);
      continue;
    }
    lines.push(`${entry.key}: ${formatYamlScalar(entry.value ?? "")}`);
  }
  return lines.join("\n");
}

function getPropsEntryDisplayValue(entry) {
  if (entry.kind === "array") {
    return (entry.value || []).join(", ");
  }
  if (entry.kind === "bool") {
    return entry.value ? "true" : "false";
  }
  if (entry.kind === "null") {
    return "";
  }
  if (entry.kind === "number") {
    return String(entry.value);
  }
  return String(entry.value ?? "");
}

function applyFormValueToEntry(entry, rawValue) {
  const trimmed = String(rawValue ?? "").trim();
  if (entry.kind === "array") {
    return {
      ...entry,
      value: trimmed ? trimmed.split(",").map((part) => part.trim()).filter(Boolean) : []
    };
  }
  if (entry.kind === "bool") {
    return { ...entry, value: trimmed === "true" };
  }
  if (entry.kind === "number") {
    return { ...entry, value: trimmed === "" ? 0 : Number(trimmed) };
  }
  if (entry.kind === "null") {
    return { ...entry, value: null };
  }
  return { ...entry, kind: "string", value: rawValue };
}

function syncYamlFromPropsForm() {
  propsInputNode.value = stringifyPropsYaml(propsFormEntries);
}

function renderPropsForm() {
  if (!propsFormFieldsNode) return;
  propsFormFieldsNode.innerHTML = "";

  if (!propsFormEntries.length) {
    const empty = document.createElement("p");
    empty.className = "props-form-empty";
    empty.textContent = "Свойств пока нет — добавьте поле или откройте YAML.";
    propsFormFieldsNode.appendChild(empty);
    return;
  }

  for (let index = 0; index < propsFormEntries.length; index += 1) {
    const entry = propsFormEntries[index];
    const row = document.createElement("label");
    row.className = "props-form-row";
    row.dataset.index = String(index);

    const keyNode = document.createElement(entry.key ? "span" : "input");
    keyNode.className = entry.key ? "props-form-key" : "props-form-key props-form-key-input";
    if (entry.key) {
      keyNode.textContent = entry.key;
      keyNode.title = entry.key;
    } else {
      keyNode.type = "text";
      keyNode.placeholder = "ключ";
      keyNode.value = "";
      keyNode.dataset.field = "key";
    }

    const valueNode = document.createElement("input");
    valueNode.className = "props-form-value";
    valueNode.type = "text";
    valueNode.dataset.field = "value";
    valueNode.value = getPropsEntryDisplayValue(entry);
    valueNode.placeholder = entry.kind === "array" ? "значение1, значение2" : "значение";

    row.appendChild(keyNode);
    row.appendChild(valueNode);
    propsFormFieldsNode.appendChild(row);
  }
}

function setPropsYamlContent(content, { preserveRawMode = false } = {}) {
  propsInputNode.value = content || "";
  propsFormEntries = parsePropsYaml(content || "");
  if (!preserveRawMode) {
    propsRawYamlVisible = false;
    propsInputNode.classList.add("hidden");
    propsYamlToggleBtn.textContent = "Показать YAML";
  }
  renderPropsForm();
}

function readPropsFormIntoEntries() {
  if (!propsFormFieldsNode) return;
  const rows = propsFormFieldsNode.querySelectorAll(".props-form-row");
  const nextEntries = [];

  rows.forEach((row, index) => {
    const keyInput = row.querySelector('[data-field="key"]');
    const valueInput = row.querySelector('[data-field="value"]');
    const keyLabel = row.querySelector(".props-form-key:not(.props-form-key-input)");
    const base = propsFormEntries[index] || { kind: "string", value: "" };
    const key = keyInput
      ? keyInput.value.trim()
      : (keyLabel?.textContent || base.key || "").trim();
    let entry = { ...base, key };
    if (valueInput) {
      entry = applyFormValueToEntry(entry, valueInput.value);
      entry.key = key;
    }
    if (key || getPropsEntryDisplayValue(entry).trim()) {
      nextEntries.push(entry);
    }
  });

  propsFormEntries = nextEntries;
}

function togglePropsRawYaml() {
  if (propsRawYamlVisible) {
    propsFormEntries = parsePropsYaml(propsInputNode.value || "");
    propsRawYamlVisible = false;
    propsInputNode.classList.add("hidden");
    propsYamlToggleBtn.textContent = "Показать YAML";
    renderPropsForm();
    return;
  }

  readPropsFormIntoEntries();
  syncYamlFromPropsForm();
  propsRawYamlVisible = true;
  propsInputNode.classList.remove("hidden");
  propsYamlToggleBtn.textContent = "Скрыть YAML";
}

function splitFrontmatter(raw = "") {
  const text = String(raw).replace(/^\uFEFF/, "");
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
  if (!match) return { frontmatter: "", body: text };
  return {
    frontmatter: match[1],
    body: match[2].replace(/^\r?\n?/, "")
  };
}

function joinFrontmatter(frontmatter, body) {
  const fm = String(frontmatter ?? "").trim();
  const mdBody = String(body ?? "");
  if (!fm) return mdBody;
  if (!mdBody) return `---\n${fm}\n---\n`;
  return `---\n${fm}\n---\n\n${mdBody}`;
}

function applyNodeManifestBody(rawContent) {
  const { body } = splitFrontmatter(rawContent || "");
  fileContentInputNode.value = body;
}

function buildNodeManifestContent() {
  readPropsFormIntoEntries();
  if (!propsRawYamlVisible) {
    syncYamlFromPropsForm();
  }
  return joinFrontmatter(propsInputNode.value, fileContentInputNode.value);
}

function applyExternalFileContentUi(rawContent) {
  const { frontmatter, body } = splitFrontmatter(rawContent);
  setPropsYamlContent(frontmatter);
  fileContentInputNode.value = body;
}

function buildExternalFileContent() {
  readPropsFormIntoEntries();
  if (!propsRawYamlVisible) {
    syncYamlFromPropsForm();
  }
  return joinFrontmatter(propsInputNode.value, fileContentInputNode.value);
}

function updateYamlPanelLabel() {
  if (!yamlPanelLabelNode) return;
  if (isExternalFileEditing()) {
    yamlPanelLabelNode.textContent = "Свойства md-файла";
    propsInputNode.placeholder = "title: Заметка\ntags:\n  - пример\nstatus: draft";
  } else {
    yamlPanelLabelNode.textContent = "Frontmatter";
    propsInputNode.placeholder = "title: Название\ntags:\n  - пример\nstatus: active";
  }
}

function enableExternalFileEditor(filePath, content) {
  activeExternalFilePath = filePath;
  updateBreadcrumbsForActiveMode();
  titleEditorBlockNode.classList.remove("hidden");
  titleInputNode.value = (filePath.split("/").pop() || filePath).replace(/\.md$/i, "");
  applyExternalFileContentUi(content || "");
  updateYamlPanelLabel();
  editorViewMode = "source";
  applyModeUi();
  setEditorViewMode("source");
}

async function openExternalFile(filePath) {
  if (!activePath) return;
  try {
    const response = await fetch(
      buildApiUrl("/api/external/file", { path: activePath, file: filePath })
    );
    if (!response.ok) throw new Error(`Request failed with ${response.status}`);
    const data = await response.json();
    enableExternalFileEditor(data.file, data.content || "");
  } catch (error) {
    showToast("Ошибка открытия файла _Content", "error");
  }
}

async function createExternalMemory() {
  if (!activePath || activeContentMode !== "external" || activeExternalFilePath) return;

  createExternalMemoryBtn.disabled = true;
  createExternalMemoryBtn.textContent = "Создаю...";

  try {
    const response = await fetch(buildApiUrl("/api/external/file/create"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: activePath, title: "Воспоминание" })
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const reason = errorData.error || `Request failed with ${response.status}`;
      const details = errorData.details ? `: ${errorData.details}` : "";
      throw new Error(`${reason}${details}`);
    }

    const data = await response.json();
    await loadContentByMode();
    await openExternalFile(data.file);
    showToast("Воспоминание создано", "success");
  } catch (error) {
    showToast("Ошибка создания воспоминания", "error");
  } finally {
    createExternalMemoryBtn.disabled = false;
    createExternalMemoryBtn.textContent = "Создать воспоминание";
  }
}

function openCreateSectionModal() {
  if (!activePath || activeContentMode !== "external" || activeExternalFilePath) return;
  createSectionNameInputNode.value = "";
  createSectionModalNode.classList.remove("hidden");
  createSectionNameInputNode.focus();
}

function closeCreateSectionModal() {
  createSectionModalNode.classList.add("hidden");
  createSectionNameInputNode.value = "";
}

async function createExternalSection() {
  if (!activePath || activeContentMode !== "external" || activeExternalFilePath) return;
  const title = createSectionNameInputNode.value.trim();
  if (!title) {
    showToast("Введите название раздела", "error");
    return;
  }

  createSectionOkBtn.disabled = true;
  createSectionOkBtn.textContent = "Создаю...";

  try {
    const response = await fetch(buildApiUrl("/api/external/section/create"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: activePath, title })
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const reason = errorData.error || `Request failed with ${response.status}`;
      const details = errorData.details ? `: ${errorData.details}` : "";
      throw new Error(`${reason}${details}`);
    }

    closeCreateSectionModal();
    await loadContentByMode();
    showToast("Раздел создан", "success");
  } catch (error) {
    showToast("Ошибка создания раздела", "error");
  } finally {
    createSectionOkBtn.disabled = false;
    createSectionOkBtn.textContent = "Создать";
  }
}

function setSaveButtonsState(disabled, text = "💾") {
  for (const btn of [saveContentBtn, saveSystemFileBtn]) {
    if (!btn) continue;
    btn.disabled = disabled;
    btn.textContent = text;
  }
}

function applySystemFileUi() {
  appRootNode.classList.add("system-file-view");
  workspacePathHeaderNode?.classList.add("is-service-file");
  titleEditorBlockNode.classList.add("hidden");
  setTitleLockedDisplay(activeSystemFile || "");
  editorViewToggleNode?.classList.remove("hidden");
  editorViewMode = "source";
  listViewBlockNode.classList.add("hidden");
  yamlPanelNode.classList.add("hidden");
  externalViewSelectNode?.classList.add("hidden");
  mediaViewSelectNode?.classList.add("hidden");
  createExternalMemoryBtn.classList.add("hidden");
  createExternalSectionBtn.classList.add("hidden");
  previewUploadBlockNode?.classList.add("hidden");
  graphViewBlockNode?.classList.add("hidden");
  editorSurfaceNode?.classList.remove("hidden");
  workspacePathToolbarNode?.classList.remove("hidden");
  nodeWorkspaceNavControlsNode?.classList.add("hidden");
  nodeSettingsPathControlsNode?.classList.add("hidden");
  nodeMemoryPathControlsNode?.classList.add("hidden");
  docActionsNode?.classList.remove("hidden");
  saveContentBtn?.classList.remove("hidden");
  saveSystemFileBtn?.classList.add("hidden");
  setSaveButtonsState(false);
  fileContentInputNode.readOnly = false;
  fileContentInputNode.disabled = false;
  editorViewSourceBtn.disabled = false;
  syncEditorViewButtonsAvailability(false, false);
  applyEditorViewMode();
}

function clearSystemFileViewUi() {
  appRootNode.classList.remove("system-file-view");
  workspacePathHeaderNode?.classList.remove("is-service-file");
  if (!isMediaSidecarEditing()) {
    resetTitleInputState();
  }
  saveSystemFileBtn?.classList.add("hidden");
  saveContentBtn?.classList.remove("hidden");
}

function getPropsEntryValueByKey(entries, key) {
  const entry = entries.find((item) => item.key === key);
  if (!entry) return "";
  if (entry.kind === "array") return (entry.value || []).join(", ");
  if (entry.kind === "bool") return entry.value ? "да" : "нет";
  if (entry.kind === "null") return "";
  return String(entry.value ?? "").trim();
}

function getOverviewTitleFromProps(entries) {
  return (
    getPropsEntryValueByKey(entries, "AWN-TITLE") ||
    getPropsEntryValueByKey(entries, "title") ||
    activeLabel ||
    getLabelFromPath(activePath)
  );
}

function getYamlScalarFromFrontmatter(frontmatter, key) {
  const text = String(frontmatter || "");
  const match = text.match(new RegExp(`^${key}:\\s*(.+)$`, "im"));
  if (!match) return "";
  return match[1].trim().replace(/^["']|["']$/g, "");
}

function extractAwnDescFromBody(body) {
  const text = String(body || "");
  const multiline = text.match(/^>\s*\[!AWN-DESC\][^\n]*\n(?:>\s?[^\n]*(?:\n|$))*/im);
  if (multiline) {
    const parts = multiline[0]
      .split(/\r?\n/)
      .map((line) => line.replace(/^>\s?/, "").trim())
      .filter(Boolean)
      .map((line, index) => (index === 0 ? line.replace(/^\[!AWN-DESC\]\s*/i, "") : line));
    return parts.join(" ").trim();
  }
  const singleLine = text.match(/^>\s*\[!AWN-DESC\]\s*(.+)$/im);
  if (singleLine) return singleLine[1].trim();
  return "";
}

function stripAwnDescCallouts(body) {
  return String(body || "")
    .replace(/^>\s*\[!AWN-DESC\][^\n]*\n(?:>\s?[^\n]*(?:\n|$))*/gim, "")
    .replace(/^>\s*\[!AWN-DESC\]\s*.+$/gim, "");
}

function getOverviewDescription(rawManifest, entries) {
  const fromEntries =
    getPropsEntryValueByKey(entries, "AWN-DESC") ||
    getPropsEntryValueByKey(entries, "summary");
  if (fromEntries) return fromEntries;

  const { frontmatter, body } = splitFrontmatter(rawManifest);
  if (frontmatter.trim()) {
    const fromFrontmatter =
      getYamlScalarFromFrontmatter(frontmatter, "AWN-DESC") ||
      getYamlScalarFromFrontmatter(frontmatter, "summary") ||
      getPropsEntryValueByKey(parsePropsYaml(frontmatter), "AWN-DESC") ||
      getPropsEntryValueByKey(parsePropsYaml(frontmatter), "summary");
    if (fromFrontmatter) return fromFrontmatter;
  }

  return extractAwnDescFromBody(body);
}

function getOverviewMarkdownBeforeDivider(rawManifest = "") {
  const { body } = splitFrontmatter(rawManifest);
  const text = String(body || "");
  if (!text.trim()) return "";

  const dividerMatch = text.match(/^[\t ]*-{3,}[\t ]*$(?:\r?\n|$)/m);
  if (!dividerMatch) return text.trim();
  return text.slice(0, dividerMatch.index).trim();
}

const MEMORY_DRIVER_MODES = new Set(["internal", "external", "tabular"]);

async function fetchMemorySummary(nodePath = activePath) {
  if (!nodePath) return null;
  try {
    const response = await fetch(buildApiUrl("/api/memory/summary", { path: nodePath }));
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

function createEmptyMemorySummary() {
  return {
    enabledDrivers: ["internal", "external", "tabular"],
    existingDrivers: [],
    drivers: {
      internal: { exists: false, path: null, charCount: 0, excerpt: "" },
      external: { exists: false, count: 0, path: null, recent: [] },
      tabular: { exists: false, path: null, rowCount: 0, columnCount: 0, columns: [], previewRows: [] }
    }
  };
}

function shouldShowMemoryDriverBlock(driverId, summary) {
  if (!summary || !MEMORY_DRIVER_MODES.has(driverId)) return false;
  return true;
}

function syncNodeMemoryDriverOptions(summary = activeMemorySummary) {
  if (!nodeMemoryModeSelectNode) return;
  for (const option of nodeMemoryModeSelectNode.querySelectorAll("option[data-memory-driver]")) {
    option.hidden = false;
    option.disabled = false;
  }
}

async function pickDefaultMemoryMode(nodePath = activePath) {
  const summary = await fetchMemorySummary(nodePath);
  activeMemorySummary = summary;
  syncNodeMemoryDriverOptions(summary);
  if (summary?.existingDrivers?.includes("external")) return "external";
  if (summary?.existingDrivers?.includes("internal")) return "internal";
  if (summary?.existingDrivers?.includes("tabular")) return "tabular";
  return "internal";
}

function openMemoryModeFromOverview(modeId, externalFile = null) {
  nodeMemoryViewActive = true;
  nodeSettingsViewActive = false;
  syncNodeMemoryModeSelect();
  applyNodeWorkspaceViewUi();
  setContentMode(modeId);
  if (modeId === "external" && externalFile) {
    void openExternalFile(externalFile);
  }
}

function openTodoFromOverview() {
  nodeSettingsViewActive = true;
  nodeMemoryViewActive = false;
  syncNodeSettingsModeSelect();
  applyNodeWorkspaceViewUi();
  setContentMode("todo");
}

function openDescriptionFromOverview() {
  nodeSettingsViewActive = true;
  nodeMemoryViewActive = false;
  syncNodeSettingsModeSelect();
  applyNodeWorkspaceViewUi();
  setContentMode("description");
}

function getRevealFolderLabel() {
  const platform = window.desktopApp?.platform;
  if (platform === "darwin") return "Открыть папку в Finder";
  if (platform === "win32") return "Открыть папку в Проводнике";
  return "Открыть папку темы";
}

function createOverviewActionIcon(svgMarkup) {
  const icon = document.createElement("span");
  icon.className = "node-overview-action-btn-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.innerHTML = svgMarkup;
  return icon;
}

function createOverviewEditManifestIcon() {
  return createOverviewActionIcon(
    '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>'
  );
}

function createOverviewRevealFolderIcon() {
  return createOverviewActionIcon(
    '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M3 7h18"/></svg>'
  );
}

function getRevealFolderShortLabel() {
  const platform = window.desktopApp?.platform;
  if (platform === "darwin") return "Finder";
  if (platform === "win32") return "Проводник";
  return "Папка";
}

async function revealNodeFolderInExplorer() {
  if (!activePath) return;
  const resolvedPath = getResolvedNodePath(activePath);
  try {
    if (window.desktopApp?.revealFolder) {
      await window.desktopApp.revealFolder(resolvedPath, activeAgentId);
      return;
    }

    const response = await fetch(buildApiUrl("/api/reveal"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: resolvedPath })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.details || data.error || `HTTP ${response.status}`);
    }
  } catch (error) {
    showToast(`Не удалось открыть папку: ${error.message}`, "error");
  }
}

let overviewPreviewUploadWrap = null;
let overviewPreviewFileInputNode = null;

function createOverviewThumbEditIcon() {
  const icon = document.createElement("span");
  icon.className = "node-overview-thumb-edit-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.innerHTML =
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>';
  return icon;
}

function createOverviewThumbRemoveIcon() {
  const icon = document.createElement("span");
  icon.className = "node-overview-thumb-edit-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.innerHTML =
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>';
  return icon;
}

function createOverviewThumbPasteIcon() {
  const icon = document.createElement("span");
  icon.className = "node-overview-thumb-edit-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.innerHTML =
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 14l2 2 4-4"/></svg>';
  return icon;
}

function clipboardItemToPreviewFile(type, blob) {
  const normalizedType = String(type || "").toLowerCase();
  const ext =
    normalizedType === "image/png"
      ? "png"
      : normalizedType === "image/gif"
        ? "gif"
        : normalizedType === "image/jpeg" || normalizedType === "image/jpg"
          ? "jpg"
          : null;
  if (!ext) return null;
  return new File([blob], `pasted-preview.${ext}`, { type: normalizedType });
}

async function readPreviewFileFromClipboard() {
  if (!navigator.clipboard?.read) {
    throw new Error("Браузер не поддерживает вставку из буфера");
  }

  const items = await navigator.clipboard.read();
  for (const item of items) {
    const imageType = item.types.find((type) => String(type).toLowerCase().startsWith("image/"));
    if (!imageType) continue;
    const blob = await item.getType(imageType);
    const file = clipboardItemToPreviewFile(imageType, blob);
    if (file) return file;
  }

  return null;
}

async function pastePreviewFromClipboard({ overviewThumbWrap = null } = {}) {
  if (!activePath) return;

  try {
    const file = await readPreviewFileFromClipboard();
    if (!file) {
      showToast("В буфере нет изображения", "error");
      return;
    }
    await uploadPreviewFile(file, { overviewThumbWrap });
  } catch (error) {
    const message =
      error?.name === "NotAllowedError"
        ? "Нет доступа к буферу обмена. Разрешите доступ в браузере."
        : error?.message || "Не удалось вставить изображение";
    showToast(message, "error");
  }
}

async function pasteOverviewPreviewFromClipboard(thumbWrap) {
  await pastePreviewFromClipboard({ overviewThumbWrap: thumbWrap });
}

function ensureOverviewPreviewFileInput() {
  if (overviewPreviewFileInputNode) return overviewPreviewFileInputNode;
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".jpg,.jpeg,.png,.gif,image/jpeg,image/png,image/gif";
  input.hidden = true;
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (file) {
      void uploadPreviewFile(file, { overviewThumbWrap: overviewPreviewUploadWrap });
    }
    overviewPreviewUploadWrap = null;
    input.value = "";
  });
  document.body.appendChild(input);
  overviewPreviewFileInputNode = input;
  return input;
}

function openOverviewPreviewFilePicker(thumbWrap) {
  overviewPreviewUploadWrap = thumbWrap;
  ensureOverviewPreviewFileInput().click();
}

async function removeOverviewPreviewInline(thumbWrap) {
  const confirmed = await askConfirm("Удалить превью?", { okLabel: "Удалить" });
  if (!confirmed) return;
  overviewPreviewUploadWrap = thumbWrap;
  await removePreviewImage();
  overviewPreviewUploadWrap = null;
}

function getNodeCoverIconKind(nodePath) {
  const resolved = getResolvedNodePath(nodePath);
  if (isAgentRootIndexPath(resolved)) return "agent-root";
  if (isPartNodePath(resolved)) return "file";
  if (isNodeManifestPath(resolved)) return "folder";
  return "file";
}

function createNodeCoverIconElement(nodePath) {
  const icon = document.createElement("span");
  icon.className = `node-cover-icon node-cover-icon--${getNodeCoverIconKind(nodePath)}`;
  icon.setAttribute("aria-hidden", "true");
  return icon;
}

function populateOverviewThumbWrap(thumbWrap, preview, title, nodePath = activePath) {
  thumbWrap.replaceChildren();
  thumbWrap.dataset.overviewTitle = title;
  thumbWrap.dataset.hasPreview = preview?.imageUrl ? "1" : "0";

  if (preview?.imageUrl) {
    const img = document.createElement("img");
    img.className = "node-overview-thumb";
    img.alt = `Превью: ${title}`;
    img.src = appendCacheBuster(appendAgentToApiUrl(preview.imageUrl));
    img.draggable = false;
    thumbWrap.appendChild(img);
  } else {
    const placeholder = createNodeCoverIconElement(nodePath);
    placeholder.classList.add("node-overview-thumb-placeholder");
    thumbWrap.appendChild(placeholder);
  }

  const actions = document.createElement("div");
  actions.className = "node-overview-thumb-actions";

  const replaceBtn = document.createElement("button");
  replaceBtn.type = "button";
  replaceBtn.className = "node-overview-thumb-action";
  replaceBtn.setAttribute("aria-label", preview?.imageUrl ? "Заменить превью" : "Загрузить превью");
  replaceBtn.appendChild(createOverviewThumbEditIcon());
  replaceBtn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    openOverviewPreviewFilePicker(thumbWrap);
  });
  actions.appendChild(replaceBtn);

  const pasteBtn = document.createElement("button");
  pasteBtn.type = "button";
  pasteBtn.className = "node-overview-thumb-action";
  pasteBtn.setAttribute("aria-label", "Вставить изображение из буфера");
  pasteBtn.title = "Вставить из буфера";
  pasteBtn.appendChild(createOverviewThumbPasteIcon());
  pasteBtn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    void pasteOverviewPreviewFromClipboard(thumbWrap);
  });
  actions.appendChild(pasteBtn);

  if (preview?.imageUrl) {
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "node-overview-thumb-action node-overview-thumb-action--remove";
    removeBtn.setAttribute("aria-label", "Удалить превью");
    removeBtn.appendChild(createOverviewThumbRemoveIcon());
    removeBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      void removeOverviewPreviewInline(thumbWrap);
    });
    actions.appendChild(removeBtn);
  }

  thumbWrap.appendChild(actions);
}

function createOverviewThumbWrap(preview, title, nodePath = activePath) {
  const thumbWrap = document.createElement("div");
  thumbWrap.className = "node-overview-thumb-wrap";
  thumbWrap.tabIndex = 0;
  thumbWrap.setAttribute("role", "button");
  thumbWrap.setAttribute(
    "aria-label",
    preview?.imageUrl ? "Редактировать превью" : "Загрузить превью"
  );
  populateOverviewThumbWrap(thumbWrap, preview, title, nodePath);

  thumbWrap.addEventListener("click", () => {
    if (thumbWrap.dataset.hasPreview === "1") return;
    openOverviewPreviewFilePicker(thumbWrap);
  });
  thumbWrap.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    if (thumbWrap.dataset.hasPreview === "1") return;
    openOverviewPreviewFilePicker(thumbWrap);
  });

  return thumbWrap;
}

async function refreshOverviewThumbInPlace() {
  const thumbWrap = nodeOverviewContentNode?.querySelector(".node-overview-thumb-wrap");
  if (!thumbWrap || activeContentMode !== NODE_OVERVIEW_MODE) return;
  const preview = await fetchNodeOverviewPreview();
  const title = thumbWrap.dataset.overviewTitle || "Превью";
  populateOverviewThumbWrap(thumbWrap, preview, title, activePath);
  thumbWrap.setAttribute(
    "aria-label",
    preview?.imageUrl ? "Редактировать превью" : "Загрузить превью"
  );
}

async function fetchTodoForOverview(nodePath = activePath) {
  if (!nodePath) return null;
  try {
    const response = await fetch(buildApiUrl("/api/todo", { path: nodePath }));
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

function getOverviewMemoryStoragePath(nodePath, driverId, summary) {
  const resolvedPath = getResolvedNodePath(nodePath);
  const driver = summary?.drivers?.[driverId] || {};
  if (driver.path && isFullWorkspaceRelPath(driver.path)) return driver.path;
  switch (driverId) {
    case "internal":
      return getInternalMemoryBreadcrumbPath(resolvedPath);
    case "external":
      return getNodeStorageSubfolderPath(resolvedPath, "_Content");
    case "tabular":
      return getTabularBreadcrumbPath(resolvedPath);
    default:
      return "";
  }
}

function loadOverviewAccordionState() {
  try {
    const raw = readStorageItem(OVERVIEW_ACCORDION_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveOverviewAccordionOpenState(groupId, isOpen) {
  const state = loadOverviewAccordionState();
  state[groupId] = Boolean(isOpen);
  try {
    localStorage.setItem(OVERVIEW_ACCORDION_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota / private mode
  }
}

function createOverviewAccordionSection(groupId, title, contentNode, { defaultOpen = true } = {}) {
  const details = document.createElement("details");
  details.className = "node-overview-fold";

  const accordionState = loadOverviewAccordionState();
  details.open = accordionState[groupId] !== undefined ? Boolean(accordionState[groupId]) : defaultOpen;

  const summary = document.createElement("summary");
  summary.className = "node-overview-fold-head";

  const titleSpan = document.createElement("span");
  titleSpan.className = "node-overview-fold-title";
  titleSpan.textContent = title;

  const chevron = document.createElement("span");
  chevron.className = "node-overview-fold-chevron";
  chevron.setAttribute("aria-hidden", "true");

  summary.append(titleSpan, chevron);

  const body = document.createElement("div");
  body.className = "node-overview-fold-body";
  body.appendChild(contentNode);

  details.append(summary, body);
  details.addEventListener("toggle", () => {
    saveOverviewAccordionOpenState(groupId, details.open);
  });

  return details;
}

function renderOverviewTodoBlock(todoData, nodePath = activePath) {
  const section = document.createElement("section");
  section.className = "node-overview-todo";

  const actions = document.createElement("div");
  actions.className = "node-overview-todo-actions";

  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.className = "node-overview-action-btn node-overview-edit-btn node-overview-todo-edit-btn";
  editBtn.append(createOverviewEditManifestIcon(), document.createTextNode("Редактировать"));
  editBtn.addEventListener("click", openTodoFromOverview);

  actions.appendChild(editBtn);

  const body = document.createElement("div");
  body.className = "node-overview-todo-body";
  const content = String(todoData?.content || "").trim();
  const storagePath = getTodoBreadcrumbPath(nodePath);

  if (!content) {
    body.classList.add("node-overview-todo-body--empty");
    body.textContent = "Файл TODO ещё не создан. Нажмите «Редактировать», чтобы добавить пункты.";
  } else {
    const pre = document.createElement("pre");
    pre.className = "node-overview-todo-content";
    pre.textContent = content.length > 1600 ? `${content.slice(0, 1600).trim()}…` : content;
    body.appendChild(pre);
  }

  const path = document.createElement("span");
  path.className = "node-overview-todo-path";
  path.textContent = storagePath;

  section.append(actions, body, path);
  return section;
}

function bindOverviewMemoryLink(link, modeId, { externalFile = null } = {}) {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    openMemoryModeFromOverview(modeId, externalFile);
  });
}

function renderOverviewMemoryBlock(summary, nodePath = activePath) {
  const section = document.createElement("section");
  section.className = "node-overview-memory";

  const list = document.createElement("div");
  list.className = "node-overview-memory-minimal node-overview-branch-list";

  const specs = [
    {
      id: "external",
      icon: "📁",
      title: "Многофайловая",
      desc: "Книги, коллекции и данные с произвольной структурой в папках"
    },
    {
      id: "internal",
      icon: "📝",
      title: "Однофайловая",
      desc: "Произвольное содержимое в одном файле — загружается в контекст агента за один раз"
    },
    {
      id: "tabular",
      icon: "📊",
      title: "Табличная",
      desc: "Таблица с данными (как Excel) — подходит для ведения данных, которые нужно загружать в контекст за один раз (пример: счётчик изучения английских слов)"
    }
  ];

  for (const spec of specs) {
    const driver = summary.drivers?.[spec.id] || {};
    const storagePath = getOverviewMemoryStoragePath(nodePath, spec.id, summary);

    const link = document.createElement("button");
    link.type = "button";
    link.className = `node-overview-memory-link node-overview-memory-link--${spec.id}`;
    if (!driver.exists) {
      link.classList.add("node-overview-memory-link--empty");
    }
    bindOverviewMemoryLink(link, spec.id, { externalFile: null });

    const body = document.createElement("span");
    body.className = "node-overview-memory-link-body";

    const linkTitle = document.createElement("span");
    linkTitle.className = "node-overview-memory-link-title";
    linkTitle.textContent = `${spec.icon} ${spec.title}`;

    const linkDesc = document.createElement("span");
    linkDesc.className = "node-overview-memory-link-desc";
    linkDesc.textContent = spec.desc;

    const linkPath = document.createElement("span");
    linkPath.className = "node-overview-memory-link-path";
    linkPath.textContent = storagePath;

    body.append(linkTitle, linkDesc, linkPath);

    const badge = document.createElement("span");
    badge.className = "node-overview-memory-badge";
    badge.textContent = spec.id === "internal"
      ? driver?.exists ? String(driver.charCount || 0) : "—"
      : spec.id === "external"
        ? driver?.exists ? String(driver.count || 0) : "—"
        : driver?.exists
          ? `${driver.rowCount || 0}×${driver.columnCount || 0}`
          : "—";

    link.append(body, badge);
    list.appendChild(link);
  }

  if (!list.children.length) return null;
  section.appendChild(list);
  return section;
}

async function fetchMediaOverview(nodePath = activePath) {
  if (!nodePath) return null;
  try {
    const response = await fetch(buildApiUrl("/api/media", { path: nodePath }));
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

const MEDIA_OVERVIEW_GROUP_ICONS = {
  Images: "🖼",
  Videos: "🎬",
  Audio: "🎵",
  Documents: "📄",
  Archives: "🗜",
  Other: "📎",
  Folders: "📁"
};

function renderOverviewMediaLink(mediaData, nodePath = activePath) {
  const exists = Boolean(mediaData?.exists);
  const fileCount = Number(mediaData?.files) || 0;
  const storagePath = getNodeStorageSubfolderPath(nodePath, "_Assets");

  const link = document.createElement("button");
  link.type = "button";
  link.className = "node-overview-media-link";
  if (!exists || fileCount === 0) {
    link.classList.add("node-overview-media-link--empty");
  }
  link.addEventListener("click", () => setContentMode("media"));

  const visuals = document.createElement("span");
  visuals.className = "node-overview-media-link-visual";
  visuals.setAttribute("aria-hidden", "true");
  for (const [icon, modifier] of [
    ["🖼", ""],
    ["📄", " node-overview-media-link-visual-icon--b"],
    ["🎵", " node-overview-media-link-visual-icon--c"]
  ]) {
    const iconNode = document.createElement("span");
    iconNode.className = `node-overview-media-link-visual-icon${modifier}`;
    iconNode.textContent = icon;
    visuals.appendChild(iconNode);
  }

  const body = document.createElement("span");
  body.className = "node-overview-media-link-body";

  const linkTitle = document.createElement("span");
  linkTitle.className = "node-overview-media-link-title";
  linkTitle.textContent = "Медиа и документы";

  const linkDesc = document.createElement("span");
  linkDesc.className = "node-overview-media-link-desc";
  linkDesc.textContent =
    "Изображения, видео, PDF и sidecar-заметки — всё, что прикреплено к теме как файлы.";

  const linkPath = document.createElement("span");
  linkPath.className = "node-overview-media-link-path";
  linkPath.textContent = storagePath;

  body.append(linkTitle, linkDesc, linkPath);

  const groups = mediaData?.groups && typeof mediaData.groups === "object" ? mediaData.groups : {};
  const chipEntries = Object.entries(groups)
    .filter(([, items]) => Array.isArray(items) && items.length > 0)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 4);

  if (chipEntries.length) {
    const chips = document.createElement("span");
    chips.className = "node-overview-media-link-chips";
    for (const [groupName, items] of chipEntries) {
      const chip = document.createElement("span");
      chip.className = "node-overview-media-link-chip";
      const icon = MEDIA_OVERVIEW_GROUP_ICONS[groupName] || "📎";
      chip.textContent = `${icon} ${items.length}`;
      chip.title = groupName;
      chips.appendChild(chip);
    }
    body.appendChild(chips);
  }

  const badge = document.createElement("span");
  badge.className = "node-overview-media-badge";
  badge.textContent = exists && fileCount > 0 ? String(fileCount) : "—";

  link.append(visuals, body, badge);
  return link;
}

function renderTabularTableView(container) {
  container.innerHTML = "";
  const { columns, rows, rowCount } = tabularDataCache;
  if (!columns.length && !rows.length) {
    const empty = document.createElement("div");
    empty.className = "list-empty";
    empty.textContent = "CSV пуст или не создан. Откройте исходник, чтобы добавить данные.";
    container.appendChild(empty);
    return;
  }

  const meta = document.createElement("p");
  meta.className = "tabular-meta";
  meta.textContent = `${rowCount} строк · ${columns.length} колонок`;
  container.appendChild(meta);

  const wrap = document.createElement("div");
  wrap.className = "tabular-table-wrap";
  const table = document.createElement("table");
  table.className = "tabular-table";
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  for (const col of columns) {
    const th = document.createElement("th");
    th.textContent = col;
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  for (const row of rows.slice(0, 200)) {
    const tr = document.createElement("tr");
    for (let i = 0; i < columns.length; i += 1) {
      const td = document.createElement("td");
      td.textContent = row[i] ?? "";
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  wrap.appendChild(table);
  container.appendChild(wrap);

  if (rows.length > 200) {
    const note = document.createElement("p");
    note.className = "tabular-meta tabular-meta--muted";
    note.textContent = `Показаны первые 200 из ${rowCount} строк.`;
    container.appendChild(note);
  }
}

function closeTabularSourceEditor() {
  setEditorViewMode("preview");
  updateBreadcrumbsForActiveMode();
}

async function fetchNodeOverviewPreview() {
  if (!activePath) return null;
  try {
    const response = await fetch(buildApiUrl("/api/preview", { path: getActiveNodeApiPath() }));
    if (!response.ok) return null;
    const data = await response.json();
    return data?.exists && data?.imageUrl ? data : null;
  } catch {
    return null;
  }
}

function createNavigationSubsectionsBlock(bodyNode) {
  const block = document.createElement("section");
  block.className = "node-navigation-block node-navigation-block--subsections";
  block.appendChild(bodyNode);
  return block;
}

function openNavigationPanelMode(modeId, externalFile = null) {
  if (modeId === "media") {
    nodeMemoryViewActive = false;
    nodeSettingsViewActive = false;
    applyNodeWorkspaceViewUi();
    setContentMode("media");
    return;
  }
  if (modeId === "description") {
    openDescriptionFromOverview();
    return;
  }
  if (modeId === "todo") {
    openTodoFromOverview();
    return;
  }
  openMemoryModeFromOverview(modeId, externalFile);
}

function createNavigationSectionHead(title, options = {}) {
  const variant = [1, 2, 3].includes(options.titleVariant) ? options.titleVariant : 1;
  const head = document.createElement("div");
  head.className = `node-navigation-memory-head node-navigation-memory-head--title-v${variant}`;

  const titleNode = document.createElement("span");
  titleNode.className = "node-navigation-memory-title";
  titleNode.textContent = title;

  const rule = document.createElement("span");
  rule.className = "node-navigation-memory-rule";
  rule.setAttribute("aria-hidden", "true");

  head.append(titleNode, rule);

  const viewModeId = options.viewModeId;
  if (viewModeId) {
    const viewBtn = document.createElement("button");
    viewBtn.type = "button";
    viewBtn.className = "node-navigation-memory-view-btn node-overview-action-btn";
    viewBtn.textContent = "Просмотр";
    viewBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      openNavigationPanelMode(viewModeId, options.externalFile ?? null);
    });
    head.appendChild(viewBtn);
  } else if (options.demoViewButton) {
    const viewBtn = document.createElement("button");
    viewBtn.type = "button";
    viewBtn.className = "node-navigation-memory-view-btn node-overview-action-btn";
    viewBtn.textContent = "Просмотр";
    viewBtn.disabled = true;
    viewBtn.tabIndex = -1;
    head.appendChild(viewBtn);
  }

  return head;
}

function renderNavigationTitleVariant3Template() {
  const block = document.createElement("section");
  block.className = "node-navigation-title-template";
  block.setAttribute("aria-label", "Шаблон варианта 3");

  const label = document.createElement("p");
  label.className = "node-navigation-title-template-label";
  label.textContent = "Шаблон варианта 3";

  block.append(
    label,
    createNavigationSectionHead("Заголовок секции", { titleVariant: 3, demoViewButton: true })
  );
  return block;
}

function renderNavigationTitleVariant2Template() {
  const block = document.createElement("section");
  block.className = "node-navigation-title-template";
  block.setAttribute("aria-label", "Шаблон варианта 2");

  const label = document.createElement("p");
  label.className = "node-navigation-title-template-label";
  label.textContent = "Шаблон варианта 2";

  block.append(
    label,
    createNavigationSectionHead("Заголовок секции", { titleVariant: 2, demoViewButton: true })
  );
  return block;
}

function createNavigationMemoryPanel(modeId, title, contentNode) {
  const card = document.createElement("section");
  card.className = `node-navigation-memory-card node-navigation-memory-card--${modeId}`;

  const body = document.createElement("div");
  body.className = "node-navigation-memory-body";
  body.appendChild(contentNode);

  card.append(createNavigationSectionHead(title, { viewModeId: modeId }), body);
  return card;
}

function compareNavigationPathsNatural(aPath, bPath) {
  const collator = new Intl.Collator("ru", { sensitivity: "base", numeric: true });
  const aParts = aPath.split("/").filter(Boolean);
  const bParts = bPath.split("/").filter(Boolean);
  const len = Math.min(aParts.length, bParts.length);
  for (let i = 0; i < len; i += 1) {
    const cmp = collator.compare(aParts[i], bParts[i]);
    if (cmp !== 0) return cmp;
  }
  return aParts.length - bParts.length;
}

async function fetchExternalFilesForNavigation(nodePath) {
  if (!nodePath) return { exists: false, files: [] };
  try {
    const response = await fetch(buildApiUrl("/api/external/files", { path: nodePath }));
    if (!response.ok) return { exists: false, files: [] };
    const data = await response.json();
    return {
      exists: Boolean(data.exists),
      files: Array.isArray(data.files) ? data.files : []
    };
  } catch {
    return { exists: false, files: [] };
  }
}

async function fetchInternalMemoryForNavigation(nodePath) {
  if (!nodePath) return { exists: false, content: "", path: null };
  try {
    const response = await fetch(buildApiUrl("/api/memory/internal", { path: nodePath }));
    if (!response.ok) return { exists: false, content: "", path: null };
    const data = await response.json();
    return {
      exists: Boolean(data.exists),
      content: typeof data.content === "string" ? data.content : "",
      path: data.path || null
    };
  } catch {
    return { exists: false, content: "", path: null };
  }
}

async function fetchTabularMemoryForNavigation(nodePath) {
  if (!nodePath) return { exists: false, columns: [], rows: [], rowCount: 0, path: null };
  try {
    const response = await fetch(buildApiUrl("/api/memory/tabular", { path: nodePath }));
    if (!response.ok) return { exists: false, columns: [], rows: [], rowCount: 0, path: null };
    const data = await response.json();
    return {
      exists: Boolean(data.exists),
      columns: Array.isArray(data.columns) ? data.columns : [],
      rows: Array.isArray(data.rows) ? data.rows : [],
      rowCount: Number(data.rowCount) || 0,
      path: data.path || null
    };
  } catch {
    return { exists: false, columns: [], rows: [], rowCount: 0, path: null };
  }
}

function renderNavigationSubsectionsBlock(childEntries) {
  if (!childEntries.length) return null;

  const body = document.createElement("div");
  body.className = "node-navigation-subsections";
  body.appendChild(createNavigationSectionHead("Разделы"));

  const grid = document.createElement("div");
  grid.className = "node-overview-children-grid";
  for (const entry of childEntries) {
    grid.appendChild(createMenuCard(entry, { gallery: true }));
  }
  body.appendChild(grid);
  return createNavigationSubsectionsBlock(body);
}

function createNavigationEmptyPlaceholder() {
  const empty = document.createElement("p");
  empty.className = "node-navigation-empty-placeholder";
  empty.textContent = "—";
  empty.setAttribute("aria-label", "Нет данных");
  return empty;
}

function renderNavigationInternalPart(internalData) {
  const body = document.createElement("div");
  body.className = "node-navigation-internal";
  const content = String(internalData.content || "").trim();

  if (!content) {
    body.appendChild(createNavigationEmptyPlaceholder());
    return createNavigationMemoryPanel("internal", "Однофайловая память", body);
  }

  const previewLimit = 2400;
  const previewSource = content.length > previewLimit ? `${content.slice(0, previewLimit).trim()}…` : content;
  const preview = document.createElement("div");
  preview.className = "node-navigation-preview file-content-preview";
  setMarkdownPreviewHtml(preview, previewSource, { nodePath: getResolvedNodePath(activePath) });
  body.appendChild(preview);

  if (content.length > previewLimit) {
    const note = document.createElement("p");
    note.className = "node-navigation-preview-note";
    note.textContent = `Показано ${previewLimit.toLocaleString("ru-RU")} из ${content.length.toLocaleString("ru-RU")} символов.`;
    body.appendChild(note);
  }

  return createNavigationMemoryPanel("internal", "Однофайловая память", body);
}

function buildNavigationPathTree(items) {
  const root = { label: "", folders: new Map(), files: [] };
  for (const item of items) {
    const segments = String(item.path || "").split("/").filter(Boolean);
    if (!segments.length) continue;
    const pathSegments = [...segments];
    pathSegments.pop();
    let cursor = root;
    for (const segment of pathSegments) {
      if (!cursor.folders.has(segment)) {
        cursor.folders.set(segment, { label: segment, folders: new Map(), files: [] });
      }
      cursor = cursor.folders.get(segment);
    }
    cursor.files.push(item);
  }
  return root;
}

function appendNavigationBookTocList(parentList, node, depth = 0) {
  const folderEntries = Array.from(node.folders.entries()).sort((a, b) =>
    compareNavigationPathsNatural(a[0], b[0])
  );
  const fileEntries = [...node.files].sort((a, b) => compareNavigationPathsNatural(a.path, b.path));

  for (const [, folderNode] of folderEntries) {
    const folderItem = document.createElement("li");
    folderItem.className = "nav-book-toc-folder";
    folderItem.style.setProperty("--toc-depth", String(depth));

    const folderLabel = document.createElement("span");
    folderLabel.className = "nav-book-toc-folder-label";
    folderLabel.textContent = folderNode.label;
    folderItem.appendChild(folderLabel);

    const subList = document.createElement("ul");
    subList.className = "nav-book-toc-list";
    appendNavigationBookTocList(subList, folderNode, depth + 1);
    folderItem.appendChild(subList);
    parentList.appendChild(folderItem);
  }

  for (const item of fileEntries) {
    const entry = document.createElement("li");
    entry.className = "nav-book-toc-entry";
    entry.style.setProperty("--toc-depth", String(depth));

    const link = document.createElement("button");
    link.type = "button";
    link.className = "nav-book-toc-link";
    link.title = item.path;

    const text = document.createElement("span");
    text.className = "nav-book-toc-link-text";
    text.textContent = item.title;

    const leaders = document.createElement("span");
    leaders.className = "nav-book-toc-leaders";
    leaders.setAttribute("aria-hidden", "true");

    link.append(text, leaders);
    link.addEventListener("click", (event) => {
      event.stopPropagation();
      openMemoryModeFromOverview("external", item.path);
    });

    entry.appendChild(link);
    parentList.appendChild(entry);
  }
}

function renderNavigationExternalBookToc(items) {
  const nav = document.createElement("nav");
  nav.className = "node-navigation-book-toc";
  nav.setAttribute("aria-label", "Оглавление многофайловой памяти");

  const list = document.createElement("ul");
  list.className = "nav-book-toc-list nav-book-toc-list--root";
  appendNavigationBookTocList(list, buildNavigationPathTree(items), 0);
  nav.appendChild(list);
  return nav;
}

function renderNavigationExternalPart(externalData) {
  const mdItems = (externalData.files || [])
    .map((item) => ({
      path: item.relativePath,
      name: item.name,
      parent: item.parent,
      title: String(item.name || "").replace(/\.md$/i, "")
    }))
    .sort((a, b) => compareNavigationPathsNatural(a.path, b.path));

  const body = document.createElement("div");
  body.className = "node-navigation-external";

  if (!mdItems.length) {
    body.appendChild(createNavigationEmptyPlaceholder());
    return createNavigationMemoryPanel("external", "Многофайловая память", body);
  }

  body.appendChild(renderNavigationExternalBookToc(mdItems));
  return createNavigationMemoryPanel("external", "Многофайловая память", body);
}

function renderNavigationTabularPart(tabularData) {
  const columns = tabularData.columns || [];
  const rows = tabularData.rows || [];

  const body = document.createElement("div");
  body.className = "node-navigation-tabular";

  if (!columns.length && !rows.length) {
    body.appendChild(createNavigationEmptyPlaceholder());
    return createNavigationMemoryPanel("tabular", "Табличная память", body);
  }

  const wrap = document.createElement("div");
  wrap.className = "tabular-table-wrap";
  const table = document.createElement("table");
  table.className = "tabular-table";
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  for (const col of columns) {
    const th = document.createElement("th");
    th.textContent = col;
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  for (const row of rows) {
    const tr = document.createElement("tr");
    for (let i = 0; i < columns.length; i += 1) {
      const td = document.createElement("td");
      td.textContent = row[i] ?? "";
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  wrap.appendChild(table);
  body.appendChild(wrap);

  return createNavigationMemoryPanel("tabular", "Табличная память", body);
}

const NAVIGATION_MEDIA_GROUP_LABELS = {
  Images: "Изображения",
  Videos: "Видео",
  Audio: "Аудио",
  Documents: "Документы",
  Archives: "Архивы",
  Other: "Прочее",
  Folders: "Папки"
};

const NAVIGATION_MEDIA_GROUP_ICONS = {
  Images: "🖼",
  Videos: "🎬",
  Audio: "🎵",
  Documents: "📄",
  Archives: "🗜",
  Other: "📎",
  Folders: "📁"
};

function renderNavigationMediaPart(mediaData) {
  const groups = mediaData?.groups && typeof mediaData.groups === "object" ? mediaData.groups : {};
  const groupOrder = ["Images", "Videos", "Audio", "Documents", "Archives", "Other", "Folders"];
  const entries = groupOrder
    .map((groupName) => [groupName, groups[groupName] || []])
    .filter(([, items]) => Array.isArray(items) && items.length > 0);

  const body = document.createElement("div");
  body.className = "node-navigation-media";

  if (!entries.length) {
    body.appendChild(createNavigationEmptyPlaceholder());
    return createNavigationMemoryPanel("media", "Медиа и документы", body);
  }

  const root = document.createElement("div");
  root.className = "node-navigation-media-groups";

  for (const [groupName, items] of entries) {
    const group = document.createElement("section");
    group.className = "node-navigation-media-group";

    const label = document.createElement("div");
    label.className = "node-navigation-media-group-label";
    label.textContent = `${NAVIGATION_MEDIA_GROUP_ICONS[groupName] || "📎"} ${NAVIGATION_MEDIA_GROUP_LABELS[groupName] || groupName}`;

    const list = document.createElement("ul");
    list.className = "nav-book-toc-list nav-book-toc-list--media";

    const sortedItems = [...items].sort((a, b) =>
      compareNavigationPathsNatural(a.path || a.name || "", b.path || b.name || "")
    );

    for (const item of sortedItems) {
      const entry = document.createElement("li");
      entry.className = "nav-book-toc-entry nav-book-toc-entry--media";

      const link = document.createElement("button");
      link.type = "button";
      link.className = "nav-book-toc-link nav-book-toc-link--media";
      link.title = item.path || "";

      const text = document.createElement("span");
      text.className = "nav-book-toc-link-text";
      text.textContent = item.name || item.path || "—";

      const leaders = document.createElement("span");
      leaders.className = "nav-book-toc-leaders";
      leaders.setAttribute("aria-hidden", "true");

      link.append(text, leaders);
      link.addEventListener("click", (event) => {
        event.stopPropagation();
        openNavigationPanelMode("media");
      });

      entry.appendChild(link);
      list.appendChild(entry);
    }

    group.append(label, list);
    root.appendChild(group);
  }

  body.appendChild(root);
  return createNavigationMemoryPanel("media", "Медиа и документы", body);
}

function splitNavigationManifestAtHorizontalRule(content) {
  const text = String(content || "").trim();
  if (!text) return { previewText: "", fullText: "", isTruncated: false };

  const lines = text.split(/\r?\n/);
  const hrIndex = lines.findIndex((line) => /^\s*---\s*$/.test(line));
  if (hrIndex === -1) {
    return { previewText: text, fullText: text, isTruncated: false };
  }

  const previewText = lines.slice(0, hrIndex).join("\n").trim();
  const afterText = lines.slice(hrIndex + 1).join("\n").trim();
  if (!afterText) {
    return { previewText: text, fullText: text, isTruncated: false };
  }

  return {
    previewText,
    fullText: text,
    isTruncated: true
  };
}

function renderNavigationManifestPart(manifestRaw = "") {
  const { body } = splitFrontmatter(manifestRaw);
  const content = stripAwnDescCallouts(body).trim();

  const wrap = document.createElement("div");
  wrap.className = "node-navigation-manifest";

  if (!content) {
    const empty = document.createElement("p");
    empty.className = "node-navigation-empty-note";
    empty.textContent = "Описание, инструкции, правила отсутствуют";
    wrap.appendChild(empty);
    return createNavigationMemoryPanel("description", "Назначение", wrap);
  }

  const { previewText, fullText, isTruncated } = splitNavigationManifestAtHorizontalRule(content);
  const nodePath = getResolvedNodePath(activePath);

  const preview = document.createElement("div");
  preview.className = "node-navigation-preview file-content-preview";
  setMarkdownPreviewHtml(preview, previewText, { nodePath });
  wrap.appendChild(preview);

  if (isTruncated) {
    const actions = document.createElement("div");
    actions.className = "node-navigation-manifest-actions";

    const expandBtn = document.createElement("button");
    expandBtn.type = "button";
    expandBtn.className = "node-navigation-expand-btn node-overview-action-btn";
    expandBtn.textContent = "Читать все";
    expandBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      setMarkdownPreviewHtml(preview, fullText, { nodePath });
      actions.remove();
    });

    actions.appendChild(expandBtn);
    wrap.appendChild(actions);
  }

  return createNavigationMemoryPanel("description", "Назначение", wrap);
}

function renderNavigationTodoPart(todoData) {
  const wrap = document.createElement("div");
  wrap.className = "node-navigation-todo";
  const content = String(todoData?.content || "").trim();
  const previewLimit = 2400;

  if (!content) {
    wrap.appendChild(createNavigationEmptyPlaceholder());
  } else {
    const pre = document.createElement("pre");
    pre.className = "node-navigation-todo-content";
    pre.textContent =
      content.length > previewLimit ? `${content.slice(0, previewLimit).trim()}…` : content;
    wrap.appendChild(pre);

    if (content.length > previewLimit) {
      const note = document.createElement("p");
      note.className = "node-navigation-preview-note";
      note.textContent = `Показано ${previewLimit.toLocaleString("ru-RU")} из ${content.length.toLocaleString("ru-RU")} символов.`;
      wrap.appendChild(note);
    }
  }

  return createNavigationMemoryPanel("todo", "TODO", wrap);
}

async function renderNodeNavigation() {
  if (!nodeOverviewContentNode || !activePath) return;

  const renderSeq = ++nodeOverviewRenderSeq;
  const isStale = () =>
    renderSeq !== nodeOverviewRenderSeq ||
    activeContentMode !== NODE_NAVIGATION_MODE ||
    !nodeOverviewContentNode;

  nodeOverviewContentNode.replaceChildren();
  if (isStale()) return;

  const nodePath = getResolvedNodePath(activePath);
  const childEntries = getNavigationSubsectionEntries();
  const isArea = isAreaNodePath(nodePath);

  const emptyInternal = { exists: false, content: "", path: null };
  const emptyExternal = { exists: false, files: [] };
  const emptyTabular = { exists: false, columns: [], rows: [], rowCount: 0, path: null };

  const [internalData, externalData, tabularData, mediaData, todoData] = await Promise.all(
    isArea
      ? [emptyInternal, emptyExternal, emptyTabular, fetchMediaOverview(nodePath), fetchTodoForOverview(nodePath)]
      : [
          fetchInternalMemoryForNavigation(nodePath),
          fetchExternalFilesForNavigation(nodePath),
          fetchTabularMemoryForNavigation(nodePath),
          fetchMediaOverview(nodePath),
          fetchTodoForOverview(nodePath)
        ]
  );
  if (isStale()) return;

  const hub = document.createElement("div");
  hub.className = "node-navigation-hub";

  const manifestPanel = renderNavigationManifestPart(modeContentCache.description || "");
  if (manifestPanel) hub.appendChild(manifestPanel);

  const subsectionsBlock = renderNavigationSubsectionsBlock(childEntries);
  if (subsectionsBlock) hub.appendChild(subsectionsBlock);

  const panelsWrap = document.createElement("div");
  panelsWrap.className = "node-navigation-panels";

  const panels = (
    isArea
      ? [renderNavigationMediaPart(mediaData)]
      : [
          renderNavigationExternalPart(externalData),
          renderNavigationInternalPart(internalData),
          renderNavigationTabularPart(tabularData),
          renderNavigationMediaPart(mediaData)
        ]
  ).filter(Boolean);

  for (const panel of panels) {
    panelsWrap.appendChild(panel);
  }

  panelsWrap.appendChild(renderNavigationTodoPart(todoData));

  if (panelsWrap.children.length) {
    hub.appendChild(panelsWrap);
  }

  hub.appendChild(renderNavigationTitleVariant3Template());
  hub.appendChild(renderNavigationTitleVariant2Template());

  if (isStale()) return;
  if (!hub.children.length) {
    const empty = document.createElement("p");
    empty.className = "node-navigation-empty";
    empty.textContent = "Нет данных для отображения";
    hub.appendChild(empty);
  }
  nodeOverviewContentNode.appendChild(hub);
}

async function renderNodeOverview() {
  if (!nodeOverviewContentNode || !activePath) return;

  const renderSeq = ++nodeOverviewRenderSeq;
  const isStale = () =>
    renderSeq !== nodeOverviewRenderSeq ||
    activeContentMode !== NODE_OVERVIEW_MODE ||
    !nodeOverviewContentNode;

  if (activePath && !propsFormEntries.length && !String(propsInputNode.value || "").trim()) {
    await loadPropertiesForActivePath();
    if (isStale()) return;
  }

  const entries = propsFormEntries.length
    ? propsFormEntries
    : parsePropsYaml(propsInputNode.value || "");
  const manifestRaw = modeContentCache.description || "";
  const title = getOverviewTitleFromProps(entries);
  const desc = getOverviewDescription(manifestRaw, entries);
  const typeLabel = getPropsEntryValueByKey(entries, "AWN-TYPE");
  const excerpt = getOverviewMarkdownBeforeDivider(manifestRaw);
  const preview = await fetchNodeOverviewPreview();
  if (isStale()) return;

  const fragment = document.createDocumentFragment();

  const hero = document.createElement("div");
  hero.className = "node-overview-hero";

  const thumbWrap = createOverviewThumbWrap(preview, title, activePath);

  const head = document.createElement("div");
  head.className = "node-overview-head";

  const headTop = document.createElement("div");
  headTop.className = "node-overview-head-top";

  const titleNode = document.createElement("h2");
  titleNode.className = "node-overview-title";
  titleNode.textContent = title;

  const editManifestBtn = document.createElement("button");
  editManifestBtn.type = "button";
  editManifestBtn.className = "node-overview-action-btn node-overview-edit-btn";
  editManifestBtn.append(createOverviewEditManifestIcon(), document.createTextNode("Редактировать"));
  editManifestBtn.addEventListener("click", openDescriptionFromOverview);

  const revealFolderBtn = document.createElement("button");
  revealFolderBtn.type = "button";
  revealFolderBtn.className = "node-overview-action-btn";
  revealFolderBtn.title = getRevealFolderLabel();
  revealFolderBtn.setAttribute("aria-label", getRevealFolderLabel());
  revealFolderBtn.append(createOverviewRevealFolderIcon(), document.createTextNode(getRevealFolderShortLabel()));
  revealFolderBtn.addEventListener("click", () => {
    void revealNodeFolderInExplorer();
  });

  const headActions = document.createElement("div");
  headActions.className = "node-overview-head-actions";
  headActions.append(editManifestBtn, revealFolderBtn);

  headTop.append(titleNode, headActions);
  head.appendChild(headTop);
  if (typeLabel) {
    const typeNode = document.createElement("span");
    typeNode.className = "node-overview-type";
    typeNode.textContent = typeLabel;
    head.appendChild(typeNode);
  }
  if (desc) {
    const descNode = document.createElement("p");
    descNode.className = "node-overview-desc";
    descNode.textContent = desc;
    head.appendChild(descNode);
  }

  hero.append(thumbWrap, head);
  fragment.appendChild(hero);

  const metaKeysUsed = new Set([...OVERVIEW_HERO_PROP_KEYS]);
  const metaItems = [];
  for (const key of OVERVIEW_META_PROP_KEYS) {
    const value = getPropsEntryValueByKey(entries, key);
    if (value) {
      metaItems.push({ key, value });
      metaKeysUsed.add(key);
    }
  }
  for (const entry of entries) {
    if (!entry.key || metaKeysUsed.has(entry.key)) continue;
    if (OVERVIEW_HERO_PROP_KEYS.has(entry.key)) continue;
    const value = getPropsEntryDisplayValue(entry);
    if (!value) continue;
    metaItems.push({ key: entry.key, value });
    if (metaItems.length >= 12) break;
  }

  if (metaItems.length) {
    const metaSection = document.createElement("section");
    metaSection.className = "node-overview-props";
    const metaTable = document.createElement("table");
    metaTable.className = "node-overview-meta-table";
    const tbody = document.createElement("tbody");
    for (const item of metaItems) {
      const row = document.createElement("tr");
      const keyCell = document.createElement("th");
      keyCell.scope = "row";
      keyCell.textContent = item.key;
      const valCell = document.createElement("td");
      valCell.textContent = item.value;
      row.append(keyCell, valCell);
      tbody.appendChild(row);
    }
    metaTable.appendChild(tbody);
    metaSection.appendChild(metaTable);
    fragment.appendChild(
      createOverviewAccordionSection("properties", "📋 Свойства", metaSection, { defaultOpen: true })
    );
  }

  if (excerpt) {
    const excerptBlock = document.createElement("section");
    excerptBlock.className = "node-overview-excerpt";
    const excerptHead = document.createElement("div");
    excerptHead.className = "node-overview-excerpt-head";
    const excerptLabel = document.createElement("span");
    excerptLabel.className = "node-overview-excerpt-label";
    excerptLabel.textContent = desc ? "📖 Подробнее" : "📖 Описание";
    const excerptBody = document.createElement("div");
    excerptBody.className = "node-overview-excerpt-body";
    const excerptText = document.createElement("div");
    excerptText.className = "node-overview-excerpt-text file-content-preview";
    setMarkdownPreviewHtml(excerptText, excerpt, { nodePath: getResolvedNodePath(activePath) });
    excerptHead.appendChild(excerptLabel);
    excerptBody.appendChild(excerptText);
    excerptBlock.append(excerptHead, excerptBody);
    fragment.appendChild(excerptBlock);
  }

  if (isContainerNodePath(activePath) && currentMenuData) {
    const baseTree = { title: getAgentTreeTitle(), ...currentMenuData };
    const menuNode = findOverviewChildrenSourceNode(baseTree, activePath);
    const activeResolvedPath = normalizeMenuNodePath(getResolvedNodePath(activePath));
    const childEntries = collectDirectChildNodeEntries(menuNode).filter(
      (entry) => normalizeMenuNodePath(entry.path) !== activeResolvedPath
    );
    if (childEntries.length) {
      const childrenSection = document.createElement("section");
      childrenSection.className = "node-overview-children";
      const grid = document.createElement("div");
      grid.className = "node-overview-children-grid";
      for (const entry of childEntries) {
        grid.appendChild(createMenuCard(entry, { gallery: true }));
      }
      childrenSection.appendChild(grid);
      fragment.appendChild(
        createOverviewAccordionSection("children", "🗂️ Подразделы", childrenSection, { defaultOpen: true })
      );
    }
  }

  if (!isAreaNodePath(activePath)) {
    const memorySummary =
      (await fetchMemorySummary(getResolvedNodePath(activePath))) ?? createEmptyMemorySummary();
    if (isStale()) return;
    activeMemorySummary = memorySummary;
    syncNodeMemoryDriverOptions(memorySummary);
    const memoryBlock = renderOverviewMemoryBlock(memorySummary, getResolvedNodePath(activePath));
    if (memoryBlock) {
      fragment.appendChild(
        createOverviewAccordionSection("memory", "🧠 Память", memoryBlock, { defaultOpen: true })
      );
    }
  } else if (isStale()) {
    return;
  }

  const mediaOverview = await fetchMediaOverview(getResolvedNodePath(activePath));
  if (isStale()) return;

  const sectionsWrap = document.createElement("div");
  sectionsWrap.className = "node-overview-sections";
  for (const group of getOverviewModeGroups()) {
    if (group.id === "memory") continue;

    const modes = (group.modes || []).filter((mode) => !mode.disabled && mode.id !== NODE_OVERVIEW_MODE);
    if (!modes.length) continue;

    const section = document.createElement("section");
    section.className = "node-overview-section";
    const isAccordionGroup = OVERVIEW_ACCORDION_GROUP_IDS.has(group.id);
    if (!isAccordionGroup && (group.id === "main" || group.id === "files")) {
      section.classList.add("node-overview-divider");
    }

    const links = document.createElement("div");
    links.className = "node-overview-links node-overview-branch-list";
    for (const mode of modes) {
      if (group.id === "memory" && MEMORY_DRIVER_MODES.has(mode.id) && memorySummary) {
        if (!shouldShowMemoryDriverBlock(mode.id, memorySummary)) continue;
      }
      if (group.id === "main" && (mode.id === "todo" || mode.id === "description")) continue;
      if (mode.id === "media") {
        links.appendChild(renderOverviewMediaLink(mediaOverview, getResolvedNodePath(activePath)));
        continue;
      }
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "node-overview-link";
      const icon = document.createElement("span");
      icon.className = "node-overview-link-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = group.icon || "→";
      const label = document.createElement("span");
      label.className = "node-overview-link-label";
      label.textContent = mode.label;
      btn.append(icon, label);
      btn.addEventListener("click", () => {
        if (group.id === "memory" && MEMORY_DRIVER_MODES.has(mode.id)) {
          openMemoryModeFromOverview(mode.id);
          return;
        }
        setContentMode(mode.id);
      });
      links.appendChild(btn);
    }
    if (!links.children.length) continue;
    section.appendChild(links);

    if (isAccordionGroup) {
      sectionsWrap.appendChild(
        createOverviewAccordionSection(
          group.id,
          `${group.icon || ""} ${group.title}`.trim(),
          section,
          { defaultOpen: group.id !== "main" }
        )
      );
      continue;
    }

    const sectionTitle = document.createElement("h3");
    sectionTitle.className = "node-overview-section-title";
    sectionTitle.textContent = `${group.icon || ""} ${group.title}`.trim();
    section.prepend(sectionTitle);
    sectionsWrap.appendChild(section);
  }
  if (sectionsWrap.children.length) {
    fragment.appendChild(sectionsWrap);
  }

  const todoData = await fetchTodoForOverview(getResolvedNodePath(activePath));
  if (isStale()) return;
  const todoBlock = renderOverviewTodoBlock(todoData, getResolvedNodePath(activePath));
  const todoHasContent = Boolean(String(todoData?.content || "").trim());
  fragment.appendChild(
    createOverviewAccordionSection("todo", "✅ TODO", todoBlock, { defaultOpen: todoHasContent })
  );

  if (isStale()) return;
  nodeOverviewContentNode.replaceChildren(fragment);
}

function applyModeUi() {
  if (appRootNode.classList.contains("home-view")) {
    return;
  }
  if (activeSystemFile) {
    applySystemFileUi();
    updateBreadcrumbsForActiveMode();
    return;
  }
  clearSystemFileViewUi();

  const listTemplate = isCurrentModeListTemplate();
  const graphMode = isGraphModeActive();
  const listViewWithSourceToggle = isListViewWithSourceToggleMode();
  const showListView = listTemplate && !(listViewWithSourceToggle && editorViewMode === "source");
  const previewMode = activeContentMode === "node-preview";
  const overviewMode = activeContentMode === NODE_OVERVIEW_MODE;
  const navigationMode = activeContentMode === NODE_NAVIGATION_MODE;
  const overviewLikeMode = overviewMode || navigationMode;
  const titleVisible = isCurrentModeTitleEditable();
  const forceEditOnly = activeContentMode === "env";
  const externalEditing = activeContentMode === "external" && Boolean(activeExternalFilePath);
  const mediaSidecarEditing = isMediaSidecarEditing();
  if (mediaSidecarEditing) {
    applyMediaSidecarTitleUi();
  } else if (isAgentRootIndexPath(activePath) && activeContentMode === "description") {
    setTitleLockedDisplay(getActiveAgentLabel() || getAgentTreeTitle());
  } else if (titleVisible || mediaSidecarEditing) {
    showTitleEditableInput();
    titleInputNode.disabled = false;
  }
  const hideContentEditor = isCurrentModeWithoutContentEditor();
  const showExternalControls = activeContentMode === "external" && !externalEditing;
  const showMediaControls = activeContentMode === "media" && !mediaSidecarEditing;
  const showTabularControls = activeContentMode === "tabular" && !isTabularSourceEditing();
  const showWorkspaceRefresh = isWorkspaceRefreshAvailable();
  const hideSaveDeleteInToolbar =
    graphMode ||
    overviewLikeMode ||
    showExternalControls ||
    showMediaControls ||
    showTabularControls ||
    activeContentMode === "inbox" ||
    activeContentMode === "references" ||
    activeContentMode === "scripts" ||
    previewMode;
  const hideDocActions =
    previewMode ||
    graphMode ||
    (!activePath && !activeSystemFile) ||
    (overviewLikeMode && !showWorkspaceRefresh) ||
    (hideSaveDeleteInToolbar &&
      !showExternalControls &&
      !showMediaControls &&
      !showTabularControls &&
      !mediaSidecarEditing &&
      !externalEditing &&
      !showWorkspaceRefresh);
  const hideToolbar = hideDocActions;
  const showYamlPanel = activeContentMode === "description" || externalEditing;
  titleEditorBlockNode.classList.toggle("hidden", (!titleVisible && !mediaSidecarEditing) || previewMode || overviewLikeMode);
  nodeDescriptionHintNode?.classList.toggle(
    "hidden",
    activeContentMode !== "description" || previewMode || overviewLikeMode || activeSystemFile
  );
  const hideEditorViewToggle =
    forceEditOnly ||
    activeContentMode === "tabular" ||
    (listTemplate && !listViewWithSourceToggle) ||
    previewMode ||
    overviewLikeMode ||
    graphMode ||
    (hideContentEditor && !graphMode && !listViewWithSourceToggle);
  editorViewToggleNode?.classList.toggle("hidden", hideEditorViewToggle);
  const showTabularSourceEditor = activeContentMode === "tabular" && isTabularSourceEditing();
  editorLineNumbersBtn?.classList.toggle("hidden", hideEditorViewToggle && !showTabularSourceEditor);
  editorSurfaceNode?.classList.toggle("hidden", previewMode || graphMode || overviewLikeMode || showListView);
  previewUploadBlockNode?.classList.toggle("hidden", !previewMode);
  graphViewBlockNode?.classList.toggle("hidden", !graphMode);
  nodeOverviewBlockNode?.classList.toggle("hidden", !overviewLikeMode);
  nodeOverviewBlockNode?.classList.toggle("is-node-navigation", navigationMode);
  const containerOverview =
    overviewMode && isContainerNodePath(getResolvedNodePath(activePath));
  applyNodeWorkspaceViewUi();
  nodeOverviewBlockNode?.classList.toggle("is-container-node", containerOverview);
  if (!graphMode && graphViewContentNode) {
    graphViewContentNode.innerHTML = "";
  }
  listViewBlockNode.classList.toggle("hidden", !showListView);
  listViewBlockNode.classList.toggle(
    "list-view--no-head",
    showExternalControls ||
      showMediaControls ||
      showTabularControls ||
      activeContentMode === "scripts" ||
      activeContentMode === "inbox" ||
      activeContentMode === "references"
  );
  docActionsNode?.classList.toggle("hidden", hideToolbar);
  workspacePathToolbarNode?.classList.toggle(
    "hidden",
    graphMode || (!activePath && !activeSystemFile)
  );
  saveContentBtn?.classList.toggle("hidden", hideSaveDeleteInToolbar);
  saveSystemFileBtn?.classList.toggle("hidden", hideSaveDeleteInToolbar || !activeSystemFile);
  yamlPanelNode.classList.toggle("hidden", !showYamlPanel || previewMode || overviewMode);
  updateYamlPanelLabel();
  externalViewSelectNode?.classList.toggle("hidden", !showExternalControls);
  mediaViewSelectNode?.classList.toggle("hidden", !showMediaControls);
  mediaUploadBtnNode?.classList.toggle("hidden", !showMediaControls || mediaSidecarEditing);
  createExternalMemoryBtn.classList.toggle("hidden", !showExternalControls);
  createExternalSectionBtn.classList.toggle("hidden", !showExternalControls);
  if (showExternalControls) {
    if (externalViewSelectNode) externalViewSelectNode.value = externalViewMode;
  }
  if (showMediaControls) {
    if (mediaViewSelectNode) mediaViewSelectNode.value = mediaViewMode;
  }
  syncWorkspaceCloseButtonsVisibility();
  mediaSidecarBackBtn?.classList.toggle("hidden", !mediaSidecarEditing);
  externalMemoryBackBtn?.classList.toggle("hidden", !externalEditing);
  tabularSourceBtn?.classList.toggle("hidden", !showTabularControls);
  tabularTableBackBtn?.classList.toggle("hidden", !showTabularSourceEditor);
  workspaceRefreshBtn?.classList.toggle("hidden", !showWorkspaceRefresh);
  syncWorkspaceRevealFolderButton();
  if (graphMode) {
    renderNodeGraphView();
  } else if (overviewMode) {
    void renderNodeOverview();
    return;
  } else if (navigationMode) {
    void renderNodeNavigation();
    return;
  } else if (listTemplate) {
    listViewTitleNode.textContent = getListViewTitleByMode();
    renderListViewContent();
  }
  const readOnly = isCurrentModeReadOnly();
  setSaveButtonsState(readOnly);
  fileContentInputNode.readOnly = readOnly;
  syncEditorViewButtonsAvailability(readOnly, forceEditOnly);
  if (forceEditOnly) {
    destroyWysiwygEditor();
    editorViewMode = "source";
    setEditorViewMode("source");
    return;
  }
  if (editorViewMode === "wysiwyg" && !isWysiwygEditorEnabled()) {
    setEditorViewMode("source");
    return;
  }
  if (
    readOnly &&
    editorViewMode !== "preview" &&
    !previewMode &&
    !overviewMode &&
    !listViewWithSourceToggle
  ) {
    setEditorViewMode("preview");
    return;
  }
  if (!readOnly && !forceEditOnly) {
    syncEditorViewButtonsAvailability(false, false);
  } else if (listViewWithSourceToggle) {
    syncEditorViewButtonsAvailability(false, forceEditOnly);
  }
  applyEditorViewMode();
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

let markdownItInstance = null;

function getMarkdownIt() {
  if (markdownItInstance) return markdownItInstance;
  if (typeof window.markdownit !== "function") return null;

  markdownItInstance = window.markdownit({
    html: false,
    linkify: true,
    breaks: true,
    typographer: false
  });

  if (typeof window.markdownItGitHubAlerts === "function") {
    markdownItInstance.use(window.markdownItGitHubAlerts, { markers: "*" });
  }

  const defaultLinkOpen =
    markdownItInstance.renderer.rules.link_open ||
    function renderLinkOpen(tokens, idx, options, env, self) {
      return self.renderToken(tokens, idx, options);
    };

  markdownItInstance.renderer.rules.link_open = function renderExternalLinkOpen(tokens, idx, options, env, self) {
    tokens[idx].attrSet("target", "_blank");
    tokens[idx].attrSet("rel", "noopener noreferrer");
    return defaultLinkOpen(tokens, idx, options, env, self);
  };

  const defaultFence =
    markdownItInstance.renderer.rules.fence ||
    function renderDefaultFence(tokens, idx, options, env, self) {
      return self.renderToken(tokens, idx, options);
    };

  markdownItInstance.renderer.rules.fence = function renderFence(tokens, idx, options, env, self) {
    const token = tokens[idx];
    const language = (token.info || "").trim().split(/\s+/g)[0];
    if (language === "mermaid") {
      return `<pre class="mermaid">${token.content.trimEnd()}</pre>\n`;
    }
    return defaultFence(tokens, idx, options, env, self);
  };

  const defaultImage =
    markdownItInstance.renderer.rules.image ||
    function renderDefaultImage(tokens, idx, options, env, self) {
      return self.renderToken(tokens, idx, options);
    };

  markdownItInstance.renderer.rules.image = function renderMarkdownImage(tokens, idx, options, env, self) {
    const token = tokens[idx];
    const srcIndex = token.attrIndex("src");
    if (srcIndex >= 0) {
      token.attrs[srcIndex][1] = resolveMarkdownAssetSrc(token.attrs[srcIndex][1], env?.nodePath);
    }
    return defaultImage(tokens, idx, options, env, self);
  };

  return markdownItInstance;
}

function renderMarkdownToHtml(markdown, { nodePath } = {}) {
  const md = getMarkdownIt();
  const source = String(markdown || "");

  if (!md) {
    return `<pre>${escapeHtml(source)}</pre>`;
  }

  try {
    return md.render(source, { nodePath: nodePath || getActiveNodeApiPath() });
  } catch (error) {
    return `<pre>${escapeHtml(source)}</pre>`;
  }
}

let mermaidInitialized = false;
let mermaidTypesetSeq = 0;

function initMermaid() {
  if (mermaidInitialized) return typeof window.mermaid !== "undefined";
  if (typeof window.mermaid?.initialize !== "function") return false;
  window.mermaid.initialize({
    startOnLoad: false,
    securityLevel: "loose",
    theme: "neutral",
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  });
  mermaidInitialized = true;
  return true;
}

async function typesetMarkdownDiagrams(rootNode) {
  const root = rootNode instanceof Element ? rootNode : null;
  if (!root) return;
  const blocks = root.querySelectorAll("pre.mermaid");
  if (!blocks.length) return;
  if (!initMermaid()) return;

  const seq = ++mermaidTypesetSeq;
  try {
    await window.mermaid.run({ nodes: [...blocks] });
  } catch (error) {
    if (seq !== mermaidTypesetSeq) return;
    console.warn("Mermaid render failed:", error);
  }
}

function setMarkdownPreviewHtml(element, markdown, { nodePath } = {}) {
  if (!element) return;
  element.innerHTML = renderMarkdownToHtml(markdown, { nodePath });
  void typesetMarkdownDiagrams(element);
}

function renderPreviewFromEditor() {
  setMarkdownPreviewHtml(fileContentPreviewNode, fileContentInputNode.value);
}

function refreshEditorViewContent() {
  if (editorViewMode === "preview") {
    renderPreviewFromEditor();
    return;
  }
  if (editorViewMode === "wysiwyg") {
    destroyWysiwygEditor();
    initWysiwygEditor();
    return;
  }
  syncEditorLineNumbers();
}

function appendCacheBuster(url) {
  if (!url) return url;
  return `${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`;
}

function renderPreviewUploadUi(data) {
  const exists = Boolean(data?.exists && data?.imageUrl);
  previewImageNode?.classList.toggle("hidden", !exists);
  previewUploadPlaceholderNode?.classList.toggle("hidden", exists);
  previewUploadActionsNode?.classList.toggle("hidden", !exists);
  previewUploadZoneNode?.classList.toggle("has-image", exists);

  if (exists && previewImageNode) {
    previewImageNode.onerror = () => {
      showToast("Не удалось загрузить изображение превью", "error");
      renderPreviewUploadUi({ exists: false });
    };
    previewImageNode.onload = () => {
      previewImageNode.onerror = null;
    };
    previewImageNode.src = appendCacheBuster(appendAgentToApiUrl(data.imageUrl));
    if (activePath) {
      updateBreadcrumbsForActiveMode({ previewFile: data.file || null });
    }
  } else {
    previewImageNode.removeAttribute("src");
    if (activePath) {
      updateBreadcrumbsForActiveMode();
    }
  }
}

async function loadNodePreview() {
  if (!activePath) {
    renderPreviewUploadUi({ exists: false });
    return;
  }

  try {
    const response = await fetch(buildApiUrl("/api/preview", { path: getActiveNodeApiPath() }));
    if (!response.ok) throw new Error(`Request failed with ${response.status}`);
    const data = await response.json();
    renderPreviewUploadUi(data);
  } catch (error) {
    showToast(`Ошибка загрузки превью: ${error.message}`, "error");
    renderPreviewUploadUi({ exists: false });
  }
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const commaIndex = result.indexOf(",");
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
    };
    reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function isAllowedPreviewFile(file) {
  if (!file) return false;
  const mime = String(file.type || "").toLowerCase();
  const name = String(file.name || "").toLowerCase();
  const extOk = /\.(jpe?g|png|gif)$/.test(name);
  if (!extOk) return false;
  if (!mime) return true;
  return mime === "image/jpeg" || mime === "image/png" || mime === "image/gif";
}

async function uploadPreviewFile(file, { overviewThumbWrap = null } = {}) {
  if (!activePath || !file) return;
  if (!isAllowedPreviewFile(file)) {
    showToast(`Допустимы только JPG, PNG и GIF (${PREVIEW_FILE_BASENAME}.jpg / .png / .gif в _Storage)`, "error");
    return;
  }

  previewUploadZoneNode?.classList.add("is-uploading");
  overviewThumbWrap?.classList.add("is-uploading");

  try {
    const data = await readFileAsBase64(file);
    const response = await fetch(buildApiUrl("/api/preview"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: getActiveNodeApiPath(),
        data,
        fileName: file.name,
        mimeType: file.type
      })
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const details = errorData.details ? `: ${errorData.details}` : "";
      throw new Error(`${errorData.error || `Request failed with ${response.status}`}${details}`);
    }
    const payload = await response.json();
    renderPreviewUploadUi(payload);
    showToast("Превью сохранено", "success");
    if (isAgentRootIndexPath(activePath)) {
      syncAgentPreview({
        hasPreview: true,
        previewUrl: payload.imageUrl
      });
    }
    if (menuViewMode === "cards") await refreshMenu();
    if (activeContentMode === NODE_OVERVIEW_MODE) {
      await refreshOverviewThumbInPlace();
    }
  } catch (error) {
    showToast(`Ошибка загрузки: ${error.message}`, "error");
  } finally {
    previewUploadZoneNode?.classList.remove("is-uploading");
    overviewThumbWrap?.classList.remove("is-uploading");
    if (previewFileInputNode) previewFileInputNode.value = "";
  }
}

async function removePreviewImage() {
  if (!activePath) return;

  try {
    const response = await fetch(buildApiUrl("/api/preview", { path: getActiveNodeApiPath() }), {
      method: "DELETE"
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Request failed with ${response.status}`);
    }
    renderPreviewUploadUi({ exists: false });
    showToast("Превью удалено", "success");
    if (isAgentRootIndexPath(activePath)) {
      syncAgentPreview({ hasPreview: false, previewUrl: null });
    }
    if (menuViewMode === "cards") await refreshMenu();
    if (activeContentMode === NODE_OVERVIEW_MODE) {
      await refreshOverviewThumbInPlace();
    }
  } catch (error) {
    showToast(`Ошибка удаления: ${error.message}`, "error");
  }
}

function applyEditorLineNumbersUi() {
  editorCodeWrapNode?.classList.toggle("line-numbers-on", editorLineNumbersEnabled);
  editorLineNumbersBtn?.classList.toggle("active", editorLineNumbersEnabled);
  editorLineNumbersBtn?.setAttribute("aria-pressed", editorLineNumbersEnabled ? "true" : "false");
  syncEditorLineNumbers();
  applySourceEditorAutoHeightUi();
}

function syncEditorLineNumbers() {
  if (!editorLineNumbersNode || !editorLineNumbersEnabled) return;
  const lineCount = Math.max(1, fileContentInputNode.value.split("\n").length);
  editorLineNumbersNode.textContent = Array.from({ length: lineCount }, (_, index) => index + 1).join("\n");
}

function syncEditorLineNumbersScroll() {
  if (!editorLineNumbersEnabled || !editorLineNumbersNode) return;
  if (appRootNode?.classList.contains("editor-autoheight")) return;
  editorLineNumbersNode.scrollTop = fileContentInputNode.scrollTop;
}

function toggleEditorLineNumbers() {
  editorLineNumbersEnabled = !editorLineNumbersEnabled;
  localStorage.setItem(EDITOR_LINE_NUMBERS_STORAGE_KEY, editorLineNumbersEnabled ? "1" : "0");
  applyEditorLineNumbersUi();
}

function shouldAutoSizeSourceEditor() {
  return editorViewMode === "source";
}

function shouldUseEditorAutoHeight() {
  if (editorViewMode === "source") return true;
  return editorViewMode === "wysiwyg" && isWysiwygEditorEnabled();
}

function applyEditorAutoHeightUi() {
  if (!appRootNode) return;
  appRootNode.classList.toggle("editor-autoheight", shouldUseEditorAutoHeight());
}

function applySourceEditorAutoHeightUi() {
  if (!appRootNode) return;
  const enabled = shouldAutoSizeSourceEditor();
  if (!enabled) {
    fileContentInputNode.style.height = "";
    if (editorLineNumbersNode) editorLineNumbersNode.style.height = "";
    return;
  }
  // Defer to allow layout settle (mode switch, font load, etc.).
  requestAnimationFrame(() => {
    try {
      fileContentInputNode.style.height = "auto";
      const next = Math.max(24, fileContentInputNode.scrollHeight || 0);
      fileContentInputNode.style.height = `${next}px`;
      if (editorLineNumbersEnabled && editorLineNumbersNode) {
        editorLineNumbersNode.style.height = `${next}px`;
      }
    } catch {
      // ignore sizing errors
    }
  });
}

function isWysiwygEditorEnabled() {
  return WYSIWYG_EDITOR_ENABLED;
}

function syncEditorViewButtonsAvailability(readOnly, forceEditOnly) {
  const wysiwygBlocked = !isWysiwygEditorEnabled();
  const readOnlyBlocksToggle = readOnly && !isListViewWithSourceToggleMode();
  editorViewSourceBtn.disabled = readOnlyBlocksToggle || forceEditOnly;
  editorViewWysiwygBtn.disabled = readOnlyBlocksToggle || forceEditOnly || wysiwygBlocked;
  editorViewPreviewBtn.disabled = readOnlyBlocksToggle || forceEditOnly;
  if (wysiwygBlocked) {
    editorViewWysiwygBtn.title = "WYSIWYG-редактор временно отключён";
  } else {
    editorViewWysiwygBtn.removeAttribute("title");
  }
}

function getToastUiEditorClass() {
  if (typeof window.toastui?.Editor === "function") {
    return window.toastui.Editor;
  }
  if (typeof window.Editor === "function") {
    return window.Editor;
  }
  return null;
}

function destroyWysiwygEditor() {
  wysiwygEditorResizeObserver?.disconnect();
  wysiwygEditorResizeObserver = null;
  if (wysiwygEditorInstance) {
    wysiwygEditorInstance.destroy();
    wysiwygEditorInstance = null;
  }
  if (editorWysiwygWrapNode) {
    editorWysiwygWrapNode.innerHTML = "";
  }
}

function normalizeWysiwygExportedMarkdown(markdown) {
  // Toast UI Editor escapes markdown-significant chars in plain text (no option to disable).
  let normalized = String(markdown || "").replace(/\\([\\`*_~\-])/g, "$1");
  normalized = normalized.replace(
    /!\[([^\]]*)\]\((\/api\/media\/file[^)]+)\)/g,
    (match, alt, url) => {
      try {
        const parsed = new URL(url, window.location.origin);
        const relFile = decodeURIComponent(parsed.searchParams.get("file") || "");
        const ref = buildMarkdownAttachmentRef(relFile);
        return ref ? `![${alt}](${ref})` : match;
      } catch {
        return match;
      }
    }
  );
  return normalized;
}

function syncSourceFromWysiwygEditor() {
  if (!wysiwygEditorInstance) return;
  fileContentInputNode.value = normalizeWysiwygExportedMarkdown(wysiwygEditorInstance.getMarkdown());
  syncEditorLineNumbers();
}

function initWysiwygEditor() {
  if (!editorWysiwygWrapNode) return;
  const EditorClass = getToastUiEditorClass();
  if (!EditorClass) {
    showToast("WYSIWYG-редактор не загружен", "error");
    return;
  }

  destroyWysiwygEditor();
  editorWysiwygWrapNode.innerHTML = "";

  try {
    wysiwygEditorInstance = new EditorClass({
      el: editorWysiwygWrapNode,
      height: "auto",
      initialEditType: "wysiwyg",
      previewStyle: "vertical",
      hideModeSwitch: true,
      usageStatistics: false,
      toolbarItems: [
        ["heading", "bold", "italic", "strike"],
        ["hr", "quote"],
        ["ul", "ol", "task"],
        ["table", "link", "image"],
        ["code", "codeblock"]
      ],
      initialValue: fileContentInputNode.value || ""
    });
  } catch (error) {
    destroyWysiwygEditor();
    showToast(`WYSIWYG-редактор: ${error.message}`, "error");
    return;
  }

  wysiwygEditorInstance.addHook("beforeConvertWysiwygToMarkdown", (markdown) =>
    normalizeWysiwygExportedMarkdown(markdown)
  );

  wysiwygEditorInstance.addHook("addImageBlobHook", (blob, callback) => {
    const file = new File([blob], buildPastedAttachmentFileName({ type: blob.type }), {
      type: blob.type || "image/png"
    });
    void normalizeImageAttachmentFile(file)
      .then((normalizedFile) =>
        uploadMediaAttachment(normalizedFile).then((payload) => ({ payload, normalizedFile }))
      )
      .then(({ payload, normalizedFile }) => {
        const relativeFile = payload?.file;
        if (!relativeFile) throw new Error("Upload response missing file path");
        callback(buildMediaAssetUrl(relativeFile), getAttachmentAltText(normalizedFile.name || file.name));
        syncSourceFromWysiwygEditor();
        showToast("Изображение сохранено в _Assets", "success");
        void refreshMediaListIfVisible();
      })
      .catch((error) => {
        showToast(`Ошибка загрузки: ${error.message}`, "error");
      });
  });

  wysiwygEditorInstance.on("change", () => {
    if (editorViewMode !== "wysiwyg") return;
    syncSourceFromWysiwygEditor();
  });
}

function getEditorContentValue() {
  if (editorViewMode === "wysiwyg" && wysiwygEditorInstance) {
    return normalizeWysiwygExportedMarkdown(wysiwygEditorInstance.getMarkdown());
  }
  return fileContentInputNode.value;
}

function updateEditorViewButtonsState() {
  const isPreview = editorViewMode === "preview";
  const isWysiwyg = editorViewMode === "wysiwyg";
  const isSource = editorViewMode === "source";
  editorViewPreviewBtn?.classList.toggle("active", isPreview);
  editorViewWysiwygBtn?.classList.toggle("active", isWysiwyg);
  editorViewSourceBtn?.classList.toggle("active", isSource);
}

function applyEditorViewMode() {
  if (
    (activeContentMode === "node-preview" ||
      activeContentMode === "graph" ||
      activeContentMode === NODE_OVERVIEW_MODE) &&
    !activeSystemFile
  ) {
    return;
  }

  if (!activeSystemFile && isListViewWithSourceToggleMode()) {
    if (isFlatStorageListSourceToggleMode() && !activeStorageFolderExists) {
      fileContentInputNode.value = getStorageFolderMissingMessage();
    }
    const isSource = editorViewMode === "source";
    editorCodeWrapNode?.classList.toggle("hidden", !isSource);
    editorWysiwygWrapNode?.classList.add("hidden");
    fileContentPreviewNode.classList.add("hidden");
    destroyWysiwygEditor();
    updateEditorViewButtonsState();
    if (isSource) {
      syncEditorLineNumbers();
      applySourceEditorAutoHeightUi();
    }
    applyEditorAutoHeightUi();
    return;
  }

  if (!activeSystemFile && isCurrentModeListTemplate()) {
    editorCodeWrapNode?.classList.add("hidden");
    editorWysiwygWrapNode?.classList.add("hidden");
    fileContentPreviewNode.classList.add("hidden");
    destroyWysiwygEditor();
    applySourceEditorAutoHeightUi();
    applyEditorAutoHeightUi();
    return;
  }

  const isPreview = editorViewMode === "preview";
  const isWysiwyg = editorViewMode === "wysiwyg";
  const isSource = editorViewMode === "source";

  editorCodeWrapNode?.classList.toggle("hidden", !isSource);
  editorWysiwygWrapNode?.classList.toggle("hidden", !isWysiwyg);
  fileContentPreviewNode.classList.toggle("hidden", !isPreview);
  updateEditorViewButtonsState();
  applyEditorAutoHeightUi();

  if (isPreview) {
    if (wysiwygEditorInstance) {
      syncSourceFromWysiwygEditor();
      destroyWysiwygEditor();
    }
    renderPreviewFromEditor();
    return;
  }

  if (isWysiwyg) {
    initWysiwygEditor();
    return;
  }

  if (isSource) {
    destroyWysiwygEditor();
    syncEditorLineNumbers();
    applySourceEditorAutoHeightUi();
  }
}

function setEditorViewMode(mode) {
  if (mode !== "preview" && mode !== "wysiwyg" && mode !== "source") return;
  if (mode === "wysiwyg" && !isWysiwygEditorEnabled()) return;
  if (editorViewMode === "wysiwyg" && mode !== "wysiwyg") {
    syncSourceFromWysiwygEditor();
    destroyWysiwygEditor();
  }
  editorViewMode = mode;
  try { localStorage.setItem(EDITOR_VIEW_MODE_STORAGE_KEY, mode); } catch {}
  applyEditorViewMode();
  if (isListViewWithSourceToggleMode() || activeContentMode === "tabular") {
    applyModeUi();
  }
}

function stripNodeManifestFromPath(normalizedPath) {
  const parts = String(normalizedPath || "").replace(/\\/g, "/").split("/").filter(Boolean);
  if (parts.length && isNodeManifestFileName(parts[parts.length - 1])) {
    parts.pop();
    return parts.join("/");
  }
  return String(normalizedPath || "").replace(/\\/g, "/");
}

function getLabelFromPath(filePath) {
  if (isAgentRootIndexPath(filePath)) {
    return getActiveAgentLabel() || getAgentTreeTitle();
  }
  const parts = String(filePath || "").split("/");
  const fileName = parts[parts.length - 1] || "";
  if (isNodeManifestFileName(fileName)) {
    return parts[parts.length - 2] || getAgentTreeTitle();
  }
  return fileName.replace(/\.node\.md$/, "");
}

function getNodeDisplayPath(nodePath) {
  const normalized = getResolvedNodePath(nodePath).replace(/\\/g, "/");
  if (!normalized) return "";

  const filePartMatch = normalized.match(/^(.*)\/_Parts\/([^/]+)\.node\.md$/i);
  if (filePartMatch) {
    const parentPath = filePartMatch[1];
    const partName = filePartMatch[2];
    return stripAgentContentPrefixFromRelPath(parentPath ? `${parentPath}/${partName}` : partName);
  }

  if (isPartNodePath(normalized)) {
    const withoutManifest = stripNodeManifestFromPath(normalized);
    const partsMatch = withoutManifest.match(/^(.*)\/_Parts\/([^/]+)$/i);
    if (partsMatch) {
      const parentPath = partsMatch[1];
      const partName = partsMatch[2];
      return stripAgentContentPrefixFromRelPath(parentPath ? `${parentPath}/${partName}` : partName);
    }
  }

  if (isNodeManifestPath(normalized)) {
    if (isAgentRootIndexPath(normalized)) {
      return getActiveAgentLabel() || getAgentTreeTitle();
    }
    const folderPath = getFolderPathFromManifest(normalized);
    return stripAgentContentPrefixFromRelPath(folderPath || getAgentTreeTitle());
  }

  return stripAgentContentPrefixFromRelPath(normalized.replace(/\.node\.md$/i, ""));
}

function normalizeBreadcrumbPath(nodePath) {
  const normalized = String(nodePath || "").replace(/\\/g, "/").trim();
  if (!normalized) return "";
  if (isNodeManifestPath(normalized) || isPartNodePath(normalized)) {
    return getNodeDisplayPath(normalized);
  }
  return stripNodeManifestFromPath(normalized);
}

function resolveMenuEntryByDisplayPath(displayPath) {
  const normalized = stripVaultPrefixFromRelPath(String(displayPath || "").replace(/\\/g, "/").trim());
  if (!normalized || !currentMenuData) return null;
  const baseTree = { title: getAgentTreeTitle(), ...currentMenuData };
  const entries = collectFlatMenuEntries(baseTree);
  const exact = entries.find(
    (entry) => stripVaultPrefixFromRelPath(entry.displayPath || "") === normalized
  );
  if (exact) return exact;
  if (baseTree.indexPath) {
    const rootDisplay = stripVaultPrefixFromRelPath(getNodeDisplayPath(baseTree.indexPath));
    if (rootDisplay === normalized) {
      return {
        path: baseTree.indexPath,
        label: getLabelFromPath(baseTree.indexPath),
        displayPath: rootDisplay
      };
    }
  }
  return null;
}

function getParentNodeManifestPath(manifestPath) {
  const resolved = normalizeMenuNodePath(String(manifestPath || "").replace(/\\/g, "/"));
  if (!resolved || isAgentRootIndexPath(resolved)) return null;

  if (isNodeManifestPath(resolved)) {
    const folderPath = getFolderPathFromManifest(resolved);
    const parentFolderParts = folderPath.split("/").filter(Boolean);
    parentFolderParts.pop();
    const parentFolder = parentFolderParts.join("/");
    return parentFolder ? `${parentFolder}/${AREA_MANIFEST_FILE}` : AREA_MANIFEST_FILE;
  }

  const folderPath = getFolderPathFromManifest(resolved);
  if (!folderPath) return AREA_MANIFEST_FILE;
  const parentFolderParts = folderPath.split("/").filter(Boolean);
  parentFolderParts.pop();
  const parentFolder = parentFolderParts.join("/");
  return parentFolder ? `${parentFolder}/${AREA_MANIFEST_FILE}` : AREA_MANIFEST_FILE;
}

function getBreadcrumbDisplayParts(filePath = null) {
  const sourcePath =
    filePath ??
    (isNodeWorkspaceBreadcrumbDomain() ? getNodeDisplayPath(activePath) : getBreadcrumbPathForActiveMode());
  return normalizeBreadcrumbPath(sourcePath).split("/").filter(Boolean);
}

function getBreadcrumbManifestPathForSegmentIndex(segmentIndex, displayParts) {
  if (!activePath || segmentIndex < 0 || segmentIndex >= displayParts.length - 1) return null;

  const expectedDisplay = displayParts.slice(0, segmentIndex + 1).join("/");
  const entry = resolveMenuEntryByDisplayPath(expectedDisplay);
  if (entry?.path) return normalizeMenuNodePath(entry.path);

  let manifestPath = normalizeMenuNodePath(getResolvedNodePath(activePath));
  const stepsUp = displayParts.length - 1 - segmentIndex;
  for (let step = 0; step < stepsUp && manifestPath; step += 1) {
    manifestPath = getParentNodeManifestPath(manifestPath);
  }
  if (
    manifestPath &&
    normalizeBreadcrumbPath(getNodeDisplayPath(manifestPath)) === expectedDisplay
  ) {
    return manifestPath;
  }
  return null;
}

async function navigateBreadcrumbToNode(manifestPath) {
  if (!manifestPath || !activePath) return;
  const targetPath = normalizeMenuNodePath(manifestPath);
  const currentPath = normalizeMenuNodePath(getResolvedNodePath(activePath));
  if (targetPath === currentPath) return;
  await openNodeFromMenu(getLabelFromPath(manifestPath), manifestPath);
}

function appendBreadcrumbSeparator() {
  const sepNode = document.createElement("span");
  sepNode.className = "breadcrumb-sep";
  sepNode.textContent = "/";
  filePathNode.appendChild(sepNode);
}

function appendBreadcrumbCrumb(label, { className = "", isCurrent = false, onClick = null, title = "" } = {}) {
  const clickable = Boolean(onClick) && !isCurrent;
  const crumbNode = clickable ? document.createElement("button") : document.createElement("span");
  if (clickable) {
    crumbNode.type = "button";
    crumbNode.addEventListener("click", (event) => {
      event.preventDefault();
      void onClick();
    });
  }
  crumbNode.className = ["breadcrumb", className, isCurrent ? "current" : "", clickable ? "is-link" : ""]
    .filter(Boolean)
    .join(" ");
  crumbNode.textContent = label;
  if (title) crumbNode.title = title;
  if (clickable && !title) crumbNode.title = `Перейти: ${label}`;
  filePathNode.appendChild(crumbNode);
}

function renderBreadcrumbs(filePath) {
  if (activeSystemFile) {
    const parts = String(filePath || activeSystemFile || "")
      .split("/")
      .filter(Boolean);
    const prefixParts = parts.length > 1 ? parts.slice(0, -1) : [];

    clearFilePathNode();
    filePathNode.classList.toggle("is-empty", false);

    prefixParts.forEach((part, index) => {
      if (index > 0) appendBreadcrumbSeparator();
      appendBreadcrumbCrumb(part);
    });

    if (prefixParts.length > 0) appendBreadcrumbSeparator();

    setTitleLockedDisplay(activeSystemFile);
    return;
  }

  placeTitleFixedInTitleRow();
  titleFixedValueNode?.classList.add("hidden");

  const parts = normalizeBreadcrumbPath(filePath).split("/").filter(Boolean);
  clearFilePathNode();
  filePathNode.classList.toggle("is-empty", parts.length === 0);

  parts.forEach((part, index) => {
    const isLast = index === parts.length - 1;
    const manifestPath = !isLast ? getBreadcrumbManifestPathForSegmentIndex(index, parts) : null;
    appendBreadcrumbCrumb(part, {
      isCurrent: isLast,
      onClick: manifestPath ? () => navigateBreadcrumbToNode(manifestPath) : null
    });
    if (!isLast) appendBreadcrumbSeparator();
  });
}

function createSectionNode(title, depth = 0) {
  const sectionNode = document.createElement("div");
  sectionNode.className = "menu-section";
  if (depth > 0) sectionNode.classList.add("menu-section-nested");
  return sectionNode;
}

function nodeMatchesQuery(value, queryLower) {
  if (!queryLower) return true;
  return String(value || "").toLowerCase().includes(queryLower);
}

function filterMenuTree(node, queryLower, agentId = activeAgentId) {
  if (!queryLower) return node;

  const filteredSections = [];
  for (const section of node.sections || []) {
    const filteredSection = filterMenuTree(section, queryLower, agentId);
    if (filteredSection) filteredSections.push(filteredSection);
  }

  const filteredItems = (node.items || []).filter((item) => nodeMatchesQuery(item.label, queryLower));
  const selfMatch = nodeMatchesQuery(node.title, queryLower);
  const keepEmptyFolder = node.empty && getMenuTreeSettings(agentId).showEmptyFolders;

  if (selfMatch || keepEmptyFolder || filteredSections.length > 0 || filteredItems.length > 0) {
    if (!shouldShowMenuTreeFolder(node, agentId) && !selfMatch) return null;
    return {
      ...node,
      sections: filteredSections,
      items: filteredItems
    };
  }

  return null;
}

function compareMenuPathsNatural(aPath, bPath) {
  const collator = new Intl.Collator("ru", { sensitivity: "base", numeric: true });
  const aParts = String(aPath || "").split("/").filter(Boolean);
  const bParts = String(bPath || "").split("/").filter(Boolean);
  const len = Math.min(aParts.length, bParts.length);
  for (let i = 0; i < len; i += 1) {
    const cmp = collator.compare(aParts[i], bParts[i]);
    if (cmp !== 0) return cmp;
  }
  return aParts.length - bParts.length;
}

function getOrderedMenuChildren(node) {
  const sections = node.sections || [];
  const items = node.items || [];
  const order = Array.isArray(node.menuOrder) ? node.menuOrder : null;
  const sectionMap = new Map(sections.map((entry) => [entry.title, entry]));
  const itemMap = new Map(items.map((entry) => [entry.label, entry]));
  const orderedFolders = [];
  const orderedItems = [];
  const usedSections = new Set();
  const usedItems = new Set();

  if (order?.length) {
    for (const name of order) {
      if (sectionMap.has(name) && !usedSections.has(name)) {
        orderedFolders.push({ kind: "folder", entry: sectionMap.get(name) });
        usedSections.add(name);
      } else if (itemMap.has(name) && !usedItems.has(name)) {
        orderedItems.push({ kind: "item", entry: itemMap.get(name) });
        usedItems.add(name);
      }
    }
  }

  const remainingSections = sections
    .filter((entry) => !usedSections.has(entry.title))
    .sort((a, b) => a.title.localeCompare(b.title, "ru"));
  const remainingItems = items
    .filter((entry) => !usedItems.has(entry.label))
    .sort((a, b) => a.label.localeCompare(b.label, "ru"));

  // Области (папки) всегда выше тем (файлов), даже если в awn-sort.json порядок смешан.
  return [
    ...orderedFolders,
    ...remainingSections.map((entry) => ({ kind: "folder", entry })),
    ...orderedItems,
    ...remainingItems.map((entry) => ({ kind: "item", entry }))
  ];
}

function normalizeMenuNodePath(nodePath) {
  const normalized = String(nodePath || "").replace(/\\/g, "/");
  const base = normalized.includes("/")
    ? normalized.slice(normalized.lastIndexOf("/") + 1)
    : normalized;
  if (isAreaManifestFileName(base) && base !== AREA_MANIFEST_FILE) {
    const dir = normalized.includes("/") ? normalized.slice(0, normalized.lastIndexOf("/")) : "";
    return dir ? `${dir}/${AREA_MANIFEST_FILE}` : AREA_MANIFEST_FILE;
  }
  return normalized;
}

function findMenuNodeByPath(node, targetPath) {
  const normalized = normalizeMenuNodePath(targetPath);
  if (!node || !normalized) return null;
  if (normalizeMenuNodePath(node.indexPath) === normalized) return node;

  for (const item of node.items || []) {
    if (normalizeMenuNodePath(item.path) === normalized) {
      return {
        indexPath: item.path,
        title: item.label,
        items: [],
        sections: [],
        color: item.color || null,
        hasPreview: Boolean(item.hasPreview),
        previewUrl: item.previewUrl || null
      };
    }
  }

  for (const section of node.sections || []) {
    const found = findMenuNodeByPath(section, normalized);
    if (found) return found;
  }
  return null;
}

function menuNodeHasChildren(node) {
  return getOrderedMenuChildren(node).length > 0;
}

function findMenuSectionByFolderPath(node, folderPath, parentSectionPath = "", depth = 0) {
  if (!node) return null;
  const targetFolder = normalizeMenuNodePath(folderPath);
  const sectionFolderPath = normalizeMenuNodePath(resolveSectionFolderPath(node, parentSectionPath, depth));
  const indexFolder = node.indexPath
    ? normalizeMenuNodePath(getFolderPathFromManifest(node.indexPath))
    : "";

  if (menuNodeHasChildren(node) && indexFolder === targetFolder) {
    return node;
  }
  if (menuNodeHasChildren(node) && depth > 0 && sectionFolderPath === targetFolder) {
    return node;
  }

  for (const section of node.sections || []) {
    const found = findMenuSectionByFolderPath(
      section,
      folderPath,
      resolveSectionFolderPath(node, parentSectionPath, depth),
      depth + 1
    );
    if (found) return found;
  }
  return null;
}

function findOverviewChildrenSourceNode(menuRoot, nodePath) {
  const normalized = normalizeMenuNodePath(getResolvedNodePath(nodePath));
  const direct = findMenuNodeByPath(menuRoot, normalized);
  if (direct && menuNodeHasChildren(direct)) {
    return direct;
  }

  const folderRel = normalizeMenuNodePath(getFolderPathFromManifest(normalized));
  const folderSection = findMenuSectionByFolderPath(menuRoot, folderRel);
  if (folderSection) return folderSection;

  return direct;
}

function collectDirectChildNodeEntries(menuNode) {
  if (!menuNode) return [];
  const entries = [];
  const seenPaths = new Set();

  function pushEntry(entry) {
    const key = String(entry?.path || "");
    if (!key || seenPaths.has(key)) return;
    seenPaths.add(key);
    entries.push(entry);
  }

  function entryFromSection(section) {
    if (!section?.indexPath || section.empty) return null;
    return {
      path: section.indexPath,
      label: getLabelFromPath(section.indexPath),
      displayPath: getNodeDisplayPath(section.indexPath),
      color: section.color || null,
      hasPreview: Boolean(section.hasPreview),
      previewUrl: section.previewUrl || null,
      isFolder: true
    };
  }

  function entryFromItem(item) {
    if (!item?.path) return null;
    return {
      path: item.path,
      label: getLabelFromPath(item.path),
      displayPath: getNodeDisplayPath(item.path),
      color: item.color || null,
      hasPreview: Boolean(item.hasPreview),
      previewUrl: item.previewUrl || null,
      isFolder: isNodeManifestPath(item.path) && !isPartNodePath(item.path)
    };
  }

  function walkNode(node) {
    for (const child of getOrderedMenuChildren(node)) {
      if (child.kind === "folder") {
        const section = child.entry;
        if (section?.empty) continue;
        const folderEntry = entryFromSection(section);
        if (folderEntry) {
          pushEntry(folderEntry);
          continue;
        }
        walkNode(section);
        continue;
      }

      const itemEntry = entryFromItem(child.entry);
      if (itemEntry) pushEntry(itemEntry);
    }
  }

  walkNode(menuNode);
  return entries;
}

function collectFlatMenuEntries(node, acc = []) {
  if (node.indexPath) {
    acc.push({
      path: node.indexPath,
      label: getLabelFromPath(node.indexPath),
      displayPath: getNodeDisplayPath(node.indexPath),
      color: node.color || null,
      hasPreview: Boolean(node.hasPreview),
      previewUrl: node.previewUrl || null,
      tags: Array.isArray(node.tags) ? node.tags : [],
      category: node.category || null,
      isFolder: true,
      hasGit: Boolean(node.hasGitSelf ?? node.hasGit),
      hasObsidian: Boolean(node.hasObsidianSelf ?? node.hasObsidian),
      hasGitSelf: Boolean(node.hasGitSelf ?? node.hasGit),
      hasObsidianSelf: Boolean(node.hasObsidianSelf ?? node.hasObsidian)
    });
  }

  for (const child of getOrderedMenuChildren(node)) {
    if (child.kind === "folder") {
      collectFlatMenuEntries(child.entry, acc);
    } else {
      acc.push({
        path: child.entry.path,
        label: getLabelFromPath(child.entry.path),
        displayPath: getNodeDisplayPath(child.entry.path),
        color: child.entry.color || null,
        hasPreview: Boolean(child.entry.hasPreview),
        previewUrl: child.entry.previewUrl || null,
        tags: Array.isArray(child.entry.tags) ? child.entry.tags : [],
        category: child.entry.category || null,
        isFolder: false
      });
    }
  }

  return acc;
}

function collectSystemFileMenuEntries(files) {
  return (Array.isArray(files) ? files : []).map((file) => ({
    path: null,
    systemFile: file.name,
    label: file.name,
    displayPath: file.name,
    color: "slate",
    hasPreview: false,
    previewUrl: null,
    exists: file.exists,
    empty: Boolean(file.empty ?? !file.exists),
    isSystemFile: true
  }));
}

function buildSystemFileItemClassName(file) {
  const empty = Boolean(file?.empty ?? !file?.exists);
  return ["menu-item", "system-file-item", empty ? "empty" : file?.exists ? "exists" : ""]
    .filter(Boolean)
    .join(" ");
}

function entryMatchesMenuQuery(entry, queryLower) {
  if (!queryLower) return true;
  return nodeMatchesQuery(entry.label, queryLower) || nodeMatchesQuery(entry.displayPath, queryLower);
}

function filterMenuEntriesByQuery(entries, queryLower) {
  if (!queryLower) return entries;
  return entries.filter((entry) => entryMatchesMenuQuery(entry, queryLower));
}

function menuSearchHasResults(menu) {
  const queryLower = menuSearchQuery.trim().toLowerCase();
  if (!queryLower) return true;
  const baseTree = { title: getAgentTreeTitle(), ...menu };
  if (filterMenuTree(baseTree, queryLower)) return true;
  if (menu.serviceTree && filterMenuTree({ title: "Служебное", ...menu.serviceTree }, queryLower)) {
    return true;
  }
  const entries = [
    ...collectFlatMenuEntries(baseTree),
    ...(menu.serviceTree ? collectFlatMenuEntries({ title: "", ...menu.serviceTree }) : []),
    ...collectSystemFileMenuEntries(systemFilesCache)
  ];
  return filterMenuEntriesByQuery(entries, queryLower).length > 0;
}

function isServiceTreeCollapsed() {
  return localStorage.getItem("agentcms.serviceTree.collapsed.v1") === "1";
}

function toggleServiceTreeCollapsed() {
  localStorage.setItem("agentcms.serviceTree.collapsed.v1", isServiceTreeCollapsed() ? "0" : "1");
  if (currentMenuData) renderMenu(currentMenuData);
}

function renderServiceSection(serviceTree, parentEl, agentId = activeAgentId) {
  const serviceFolder = getActiveAgentServiceFolder(agentId);
  if (!serviceFolder || !serviceTree || !parentEl) return;

  parentEl.querySelectorAll(".menu-service-section").forEach((node) => node.remove());

  const queryLower = menuSearchQuery.trim().toLowerCase();
  let treeToRender = serviceTree;
  if (queryLower) {
    treeToRender = filterMenuTree({ title: "Служебное", ...serviceTree }, queryLower);
    if (!treeToRender) return;
  }

  const section = document.createElement("div");
  section.className = "menu-service-section";

  const headRow = document.createElement("div");
  headRow.className = "menu-service-head";

  const visibleChildren = getVisibleMenuChildren(treeToRender);
  const hasContent = visibleChildren.length > 0 || Boolean(treeToRender.indexPath);
  const collapsed = queryLower ? false : isServiceTreeCollapsed();

  headRow.appendChild(createFolderToggleButton(hasContent, collapsed, toggleServiceTreeCollapsed));

  const title = document.createElement("h3");
  title.className = "menu-service-title";
  title.textContent = "🔧 Служебное";
  title.title = hasContent ? (collapsed ? "Раскрыть" : "Скрыть") : "";
  if (hasContent) {
    title.addEventListener("click", toggleServiceTreeCollapsed);
  }
  headRow.appendChild(title);

  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "add-node-btn";
  addBtn.textContent = "+";
  addBtn.title = "Создать справочник, папку или part";
  addBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    openCreateNodeModal(serviceFolder, { agentId });
  });
  headRow.appendChild(addBtn);

  section.appendChild(headRow);

  if (!collapsed) {
    const body = document.createElement("div");
    body.className = "tree-children menu-service-body";
    renderTree({ title: "", ...treeToRender }, body, 0, serviceFolder, null, agentId);
    section.appendChild(body);
  }

  parentEl.insertBefore(section, parentEl.firstChild);
}

function appendMenuSearchEmptyState(target = getMenuQueryRoot()) {
  const sectionNode = document.createElement("div");
  sectionNode.className = "menu-section";
  const emptyNode = document.createElement("div");
  emptyNode.className = "menu-cards-empty";
  emptyNode.textContent = "Ничего не найдено.";
  sectionNode.appendChild(emptyNode);
  target.appendChild(sectionNode);
}

const NODE_COLOR_PALETTE = {
  default: { bg: "#eef2ff", text: "#1e3a8a" },
  yellow: { bg: "#fef9c3", text: "#854d0e" },
  amber: { bg: "#fef3c7", text: "#92400e" },
  orange: { bg: "#ffedd5", text: "#9a3412" },
  red: { bg: "#fee2e2", text: "#991b1b" },
  rose: { bg: "#ffe4e6", text: "#9f1239" },
  pink: { bg: "#fce7f3", text: "#9d174d" },
  purple: { bg: "#f3e8ff", text: "#6b21a8" },
  violet: { bg: "#ede9fe", text: "#5b21b6" },
  blue: { bg: "#dbeafe", text: "#1e3a8a" },
  cyan: { bg: "#cffafe", text: "#155e75" },
  teal: { bg: "#ccfbf1", text: "#115e59" },
  green: { bg: "#dcfce7", text: "#166534" },
  lime: { bg: "#ecfccb", text: "#3f6212" },
  gray: { bg: "#f3f4f6", text: "#374151" },
  slate: { bg: "#f1f5f9", text: "#475569" }
};

function resolveNodeColorStyle(color) {
  if (!color) return NODE_COLOR_PALETTE.default;
  const key = String(color).trim().toLowerCase();
  if (NODE_COLOR_PALETTE[key]) return NODE_COLOR_PALETTE[key];
  if (/^#[0-9a-f]{3,8}$/i.test(key)) {
    return { bg: key, text: "#1f2937" };
  }
  return NODE_COLOR_PALETTE.default;
}

function applyNodeColorVars(element, color, { isFolder = false } = {}) {
  if (!element) return;
  const palette = resolveNodeColorStyle(color || (isFolder ? "yellow" : null));
  element.style.setProperty("--node-color-bg", palette.bg);
  element.style.setProperty("--node-color-text", palette.text);
  element.classList.add("has-node-color");
}

function createMenuCard(entry, { systemFile = false, exists = true, empty = false, gallery = false } = {}) {
  const card = document.createElement("article");
  card.className = "menu-card";
  if (gallery) card.classList.add("menu-card--gallery");
  if (systemFile) card.classList.add("menu-card-system");
  if (systemFile && !exists) card.classList.add("menu-card-missing");
  if (systemFile && empty) card.classList.add("menu-card-system-empty");
  if (systemFile && exists && !empty) card.classList.add("menu-card-system-filled");

  if (!systemFile) {
    applyNodeColorVars(card, entry.color, { isFolder: Boolean(entry.isFolder) });
  } else {
    applyNodeColorVars(card, empty || !exists ? "slate" : "green");
  }

  if (!systemFile) {
    const cardActions = document.createElement("div");
    cardActions.className = "menu-card-actions";
    if (isNodeSettingsTargetPath(entry.path)) {
      cardActions.appendChild(createNodeSettingsButton(entry.path));
    }
    cardActions.appendChild(createBookmarkButton(entry.path));
    card.appendChild(cardActions);
  }

  const openBtn = document.createElement("button");
  openBtn.type = "button";
  openBtn.className = "menu-card-body";
  if (entry.isFolder) card.classList.add("menu-card--folder");

  const titleNode = document.createElement("div");
  titleNode.className = "menu-card-title";
  titleNode.textContent = entry.label;

  if (gallery) {
    const cover = document.createElement("div");
    cover.className = "menu-card-cover";
    if (!systemFile && entry.hasPreview && entry.previewUrl) {
      const previewNode = document.createElement("img");
      previewNode.className = "menu-card-cover-img";
      previewNode.alt = "";
      previewNode.loading = "lazy";
      previewNode.draggable = false;
      previewNode.src = appendAgentToApiUrl(entry.previewUrl);
      cover.appendChild(previewNode);
    } else if (!systemFile) {
      const icon = createNodeCoverIconElement(entry.path);
      icon.classList.add("menu-card-cover-icon");
      cover.appendChild(icon);
    }
    openBtn.appendChild(cover);

    const foot = document.createElement("div");
    foot.className = "menu-card-foot";
    foot.appendChild(titleNode);
    openBtn.appendChild(foot);
  } else {
    openBtn.appendChild(titleNode);

    if (!systemFile && entry.hasPreview && entry.previewUrl) {
      const previewNode = document.createElement("img");
      previewNode.className = "menu-card-preview";
      previewNode.alt = "";
      previewNode.loading = "lazy";
      previewNode.draggable = false;
      previewNode.src = appendAgentToApiUrl(entry.previewUrl);
      openBtn.appendChild(previewNode);
    }

    const pathNode = document.createElement("div");
    pathNode.className = "menu-card-path";
    pathNode.textContent = entry.displayPath || entry.label;
    openBtn.appendChild(pathNode);
  }

  if (systemFile) {
    card.dataset.systemFile = entry.label;
    openBtn.addEventListener("click", () => selectSystemFile(entry.label));
  } else {
    openBtn.dataset.path = entry.path;
    openBtn.addEventListener("click", () => openNodeFromMenu(getLabelFromPath(entry.path), entry.path));
  }

  card.appendChild(openBtn);

  return card;
}

function setMenuViewMode(mode) {
  if (mode !== "tree" && mode !== "flat" && mode !== "bookmarks" && mode !== "cards") return;
  menuViewMode = mode;
  menuViewTreeBtn.classList.toggle("active", mode === "tree");
  menuViewFlatBtn.classList.toggle("active", mode === "flat");
  menuViewBookmarksBtn.classList.toggle("active", mode === "bookmarks");
  menuViewCardsBtn?.classList.toggle("active", mode === "cards");
  if (currentMenuData) {
    renderMenu(currentMenuData);
    updateActiveButton();
  }
}

function renderBookmarksMenu(menu, target = getMenuQueryRoot(), agentId = activeAgentId) {
  const baseTree = { title: getAgentTreeTitle(agentId), ...menu };
  const queryLower = menuSearchQuery.trim().toLowerCase();
  const allEntries = collectFlatMenuEntries(baseTree);
  let entries = allEntries.filter((entry) => isBookmarked(entry.path));

  if (queryLower) {
    entries = entries.filter((entry) => entryMatchesMenuQuery(entry, queryLower));
  }

  entries.sort((a, b) => compareMenuPathsNatural(a.displayPath, b.displayPath));

  const sectionNode = document.createElement("div");
  sectionNode.className = "menu-section";

  const listNode = document.createElement("div");
  listNode.className = "menu-flat-list";

  if (entries.length === 0) {
    const emptyNode = document.createElement("div");
    emptyNode.className = "menu-bookmarks-empty";
    emptyNode.textContent = "Нет закладок. Добавьте тему через ☆ в дереве.";
    listNode.appendChild(emptyNode);
  }

  for (const entry of entries) {
    const itemRow = document.createElement("div");
    itemRow.className = "menu-item-row menu-flat-item";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      isNodeManifestPath(entry.path) && !isPartNodePath(entry.path) ? "menu-folder" : "menu-item";
    btn.dataset.path = entry.path;
    applyNodeColorVars(
      btn,
      entry.color,
      { isFolder: isNodeManifestPath(entry.path) && !isPartNodePath(entry.path) }
    );
    setMenuLabelWithMarkers(btn, entry.displayPath || entry.label, entry, "menu-item-name");
    btn.addEventListener("click", (event) => {
      const pathFromNode = event.currentTarget?.dataset?.path || "";
      openNodeFromMenu(getLabelFromPath(pathFromNode), pathFromNode);
    });

    itemRow.appendChild(btn);
    if (isNodeSettingsTargetPath(entry.path)) {
      itemRow.appendChild(createNodeSettingsButton(entry.path));
    }
    itemRow.appendChild(createBookmarkButton(entry.path));
    listNode.appendChild(itemRow);
  }

  sectionNode.appendChild(listNode);
  target.appendChild(sectionNode);
}

function renderFlatMenu(menu, target = getMenuQueryRoot(), agentId = activeAgentId) {
  const baseTree = { title: getAgentTreeTitle(agentId), ...menu };
  const queryLower = menuSearchQuery.trim().toLowerCase();
  let entries = [
    ...collectFlatMenuEntries(baseTree),
    ...collectSystemFileMenuEntries(systemFilesCache)
  ];
  entries = filterMenuEntriesByQuery(entries, queryLower);
  entries.sort((a, b) => compareMenuPathsNatural(a.displayPath, b.displayPath));

  const sectionNode = document.createElement("div");
  sectionNode.className = "menu-section";

  const listNode = document.createElement("div");
  listNode.className = "menu-flat-list";

  if (entries.length === 0) {
    const emptyNode = document.createElement("div");
    emptyNode.className = "menu-cards-empty";
    emptyNode.textContent = queryLower ? "Ничего не найдено." : "Нет тем для отображения.";
    listNode.appendChild(emptyNode);
  }

  for (const entry of entries) {
    const itemRow = document.createElement("div");
    itemRow.className = "menu-item-row menu-flat-item";

    const btn = document.createElement("button");
    btn.type = "button";
    if (entry.isSystemFile) {
      btn.className = buildSystemFileItemClassName(entry);
      btn.textContent = entry.label;
      btn.dataset.systemFile = entry.systemFile;
      btn.addEventListener("click", () => selectSystemFile(entry.systemFile));
    } else {
      btn.className =
        isNodeManifestPath(entry.path) && !isPartNodePath(entry.path) ? "menu-folder" : "menu-item";
      btn.dataset.path = entry.path;
      applyNodeColorVars(
        btn,
        entry.color,
        { isFolder: isNodeManifestPath(entry.path) && !isPartNodePath(entry.path) }
      );
      setMenuLabelWithMarkers(btn, entry.displayPath || entry.label, entry, "menu-item-name");
      btn.addEventListener("click", (event) => {
        const pathFromNode = event.currentTarget?.dataset?.path || "";
        openNodeFromMenu(getLabelFromPath(pathFromNode), pathFromNode);
      });
    }

    itemRow.appendChild(btn);
    if (!entry.isSystemFile && isNodeSettingsTargetPath(entry.path)) {
      itemRow.appendChild(createNodeSettingsButton(entry.path));
    }
    listNode.appendChild(itemRow);
  }

  sectionNode.appendChild(listNode);
  target.appendChild(sectionNode);
}

function renderCardsMenu(menu, target = getMenuQueryRoot(), agentId = activeAgentId) {
  const baseTree = { title: getAgentTreeTitle(agentId), ...menu };
  const queryLower = menuSearchQuery.trim().toLowerCase();
  let entries = [
    ...collectFlatMenuEntries(baseTree),
    ...collectSystemFileMenuEntries(systemFilesCache)
  ];
  entries = filterMenuEntriesByQuery(entries, queryLower);

  if (menuCardsPreviewOnly) {
    entries = entries.filter((entry) => !entry.isSystemFile && entry.hasPreview);
  }

  entries.sort((a, b) => compareMenuPathsNatural(a.displayPath, b.displayPath));

  const sectionNode = document.createElement("div");
  sectionNode.className = "menu-section";

  const gridNode = document.createElement("div");
  gridNode.className = "menu-cards-grid";

  if (entries.length === 0) {
    const emptyNode = document.createElement("div");
    emptyNode.className = "menu-cards-empty";
    emptyNode.textContent = menuCardsPreviewOnly
      ? "Нет тем с превью."
      : queryLower
        ? "Ничего не найдено."
        : "Нет тем для отображения.";
    gridNode.appendChild(emptyNode);
  }

  for (const entry of entries) {
    if (entry.isSystemFile) {
      gridNode.appendChild(
        createMenuCard(
          { label: entry.label, displayPath: getAgentTreeTitle(), color: "slate" },
          { systemFile: true, exists: entry.exists, empty: entry.empty }
        )
      );
    } else {
      gridNode.appendChild(createMenuCard(entry));
    }
  }

  sectionNode.appendChild(gridNode);
  target.appendChild(sectionNode);
}

function renderTree(node, parentEl, depth = 0, parentSectionPath = "", parentMenuNode = null, agentId = activeAgentId) {
  const searchActive = menuSearchQuery.trim().length > 0;
  const sectionNode = createSectionNode(node.title, depth);
  const sectionFolderPath = resolveSectionFolderPath(node, parentSectionPath, depth);
  const toggleSectionCollapsed = () => toggleFolderCollapsed(sectionFolderPath, agentId);
  const visibleChildren = getVisibleMenuChildren(node);

  if (node.title) {
    const hasContent = visibleChildren.length > 0;
    const isCollapsedEffective = searchActive ? false : isFolderCollapsed(sectionFolderPath, agentId);

    if (node.indexPath) {
      const folderRow = document.createElement("div");
      folderRow.className = "menu-folder-row";

      folderRow.appendChild(createFolderToggleButton(hasContent, isCollapsedEffective, toggleSectionCollapsed));

      const folderButton = document.createElement("button");
      folderButton.type = "button";
      folderButton.className = isAgentRootTreeNode(depth, sectionFolderPath)
        ? "menu-folder menu-folder-agent-root"
        : "menu-folder";
      folderButton.dataset.path = normalizeMenuNodePath(node.indexPath);
      applyNodeColorVars(folderButton, node.color, { isFolder: true });
      const folderSortKey = getMenuTreeFolderSortKey(node);
      const folderDisplayLabel = getLabelFromPath(node.indexPath);
      setMenuLabelWithMarkers(
        folderButton,
        formatMenuTreeSortLabel(folderSortKey, parentMenuNode, folderDisplayLabel),
        node
      );
      folderButton.addEventListener("click", (event) => {
        const pathFromNode = event.currentTarget?.dataset?.path || "";
        openNodeFromMenu(getLabelFromPath(pathFromNode), pathFromNode);
      });
      const addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.className = "add-node-btn";
      addBtn.textContent = "+";
      addBtn.title = "Создать";
      addBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        openCreateNodeModal(sectionFolderPath || ".", { agentId });
      });

      folderRow.appendChild(folderButton);
      folderRow.appendChild(addBtn);
      folderRow.appendChild(createNodeSettingsButton(node.indexPath));
      folderRow.appendChild(createBookmarkButton(node.indexPath));
      if (parentEl.classList.contains("tree-children")) {
        folderRow.dataset.sortName = node.title || getLabelFromPath(node.indexPath);
      }
      sectionNode.appendChild(folderRow);
    } else {
      const sectionRow = document.createElement("div");
      const isEmptyFolder = Boolean(node.empty);
      sectionRow.className = isEmptyFolder
        ? "menu-section-row menu-section-row--empty"
        : "menu-section-row";

      sectionRow.appendChild(createFolderToggleButton(hasContent, isCollapsedEffective, toggleSectionCollapsed));

      const titleNode = document.createElement("h3");
      titleNode.className = depth === 0
        ? "menu-section-title menu-section-title-agent"
        : isEmptyFolder
          ? "menu-section-title menu-section-title--empty"
          : "menu-section-title";
      setMenuLabelWithMarkers(
        titleNode,
        formatMenuTreeSortLabel(node.title, parentMenuNode, node.title),
        node,
        "menu-section-name"
      );
      titleNode.title = isEmptyFolder
        ? "Папка на диске без темы"
        : hasContent
          ? (isCollapsedEffective ? "Раскрыть" : "Скрыть")
          : "";
      if (!isEmptyFolder) {
        titleNode.addEventListener("click", () => {
          if (hasContent) toggleSectionCollapsed();
        });
      }

      sectionRow.appendChild(titleNode);
      if (isEmptyFolder) {
        const addBtn = document.createElement("button");
        addBtn.type = "button";
        addBtn.className = "add-node-btn add-node-btn--muted";
        addBtn.textContent = "+";
        addBtn.title = "Создать тему в папке";
        addBtn.addEventListener("click", (event) => {
          event.stopPropagation();
          openCreateNodeModal(sectionFolderPath || ".", { emptyFolder: true, agentId });
        });
        sectionRow.appendChild(addBtn);
      }
      if (parentEl.classList.contains("tree-children")) {
        sectionRow.dataset.sortName = node.title;
        const actionSpacerCount = isEmptyFolder ? 2 : 3;
        for (let i = 0; i < actionSpacerCount; i += 1) {
          const spacer = document.createElement("span");
          spacer.className = "menu-row-action-spacer";
          spacer.setAttribute("aria-hidden", "true");
          sectionRow.appendChild(spacer);
        }
      }
      sectionNode.appendChild(sectionRow);
    }
  }

  const isCollapsed = searchActive ? false : isFolderCollapsed(sectionFolderPath, agentId);

  if (!isCollapsed && visibleChildren.length > 0) {
    const childrenNode = document.createElement("div");
    childrenNode.className = "tree-children";
    childrenNode.dataset.sortFolder = sectionFolderPath || ".";

    for (const child of visibleChildren) {
      if (child.kind === "folder") {
        renderTree(child.entry, childrenNode, depth + 1, sectionFolderPath, node, agentId);
      } else {
        const item = child.entry;
        const itemRow = document.createElement("div");
        itemRow.className = "menu-item-row";
        itemRow.dataset.sortName = item.label;

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "menu-item";
        btn.textContent = formatMenuTreeItemLabel(item, node);
        const itemPath = normalizeMenuNodePath(item.path);
        btn.dataset.path = itemPath;
        applyNodeColorVars(btn, item.color);
        btn.addEventListener("click", (event) => {
          const pathFromNode = event.currentTarget?.dataset?.path || "";
          openNodeFromMenu(getLabelFromPath(pathFromNode), pathFromNode);
        });

        itemRow.appendChild(btn);
        if (isNodeSettingsTargetPath(itemPath)) {
          itemRow.appendChild(createNodeSettingsButton(itemPath));
        }
        itemRow.appendChild(createBookmarkButton(itemPath));
        childrenNode.appendChild(itemRow);
      }
    }

    sectionNode.appendChild(childrenNode);
  }

  parentEl.appendChild(sectionNode);
}

function canSortMenu() {
  return menuViewMode === "tree" && !menuSearchQuery.trim();
}

let menuSortDragRow = null;

function applyMenuSortRow(row, kind, options = {}) {
  const disabled = Boolean(options.disabled);
  if (!disabled && !row.dataset.sortName) return;
  row.classList.add("menu-sort-row");
  if (disabled) row.classList.add("menu-sort-row--disabled");
  row.dataset.sortKind = kind;
  row.draggable = !disabled;
  if (row.querySelector(".menu-sort-handle")) return;
  const handle = document.createElement("button");
  handle.type = "button";
  handle.className = "menu-sort-handle";
  if (disabled) {
    handle.classList.add("menu-sort-handle--disabled");
    handle.disabled = true;
    handle.title = "Сортировка недоступна для группирующих папок";
    handle.setAttribute("aria-label", "Сортировка недоступна");
  } else {
    handle.title = "Перетащить";
    handle.setAttribute("aria-label", "Перетащить");
  }
  handle.textContent = "⠿";
  handle.addEventListener("mousedown", (event) => event.stopPropagation());
  row.insertBefore(handle, row.firstChild);
}

function decorateMenuSortRows(root = getMenuQueryRoot()) {
  if (!canSortMenu()) return;
  root.querySelectorAll(".tree-children[data-sort-folder]").forEach((container) => {
    container.querySelectorAll(":scope > .menu-section > .menu-folder-row").forEach((row) => {
      applyMenuSortRow(row, "folder");
    });
    container.querySelectorAll(":scope > .menu-section > .menu-section-row").forEach((row) => {
      applyMenuSortRow(row, "folder", { disabled: true });
    });
    container.querySelectorAll(":scope > .menu-item-row").forEach((row) => {
      applyMenuSortRow(row, "item");
    });
  });
}

function getMenuSortContainer(row) {
  return row?.closest(".tree-children[data-sort-folder]") || null;
}

function getMenuSortBlock(row) {
  return row.classList.contains("menu-item-row") ? row : row.closest(".menu-section");
}

function collectMenuSortOrder(container) {
  return Array.from(container.children).flatMap((child) => {
    if (child.classList.contains("menu-item-row")) {
      return child.dataset.sortName ? [child.dataset.sortName] : [];
    }
    if (child.classList.contains("menu-section")) {
      const row =
        child.querySelector(":scope > .menu-folder-row") ||
        child.querySelector(":scope > .menu-section-row");
      return row?.dataset.sortName ? [row.dataset.sortName] : [];
    }
    return [];
  });
}

async function persistMenuSortOrder(container, folderPath) {
  const order = collectMenuSortOrder(container);
  if (order.length === 0) {
    showToast("Не удалось определить порядок элементов", "error");
    await refreshMenu();
    return;
  }

  let saved = false;
  try {
    const response = await fetch(buildApiUrl("/api/menu/sort"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folderPath: folderPath || ".", order })
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const details = errorData.details ? `: ${errorData.details}` : "";
      throw new Error(`${errorData.error || `HTTP ${response.status}`}${details}`);
    }
    saved = true;
  } catch (error) {
    showToast(`Не удалось сохранить порядок: ${error.message}`, "error");
  }

  try {
    await refreshMenu();
  } catch (error) {
    if (saved) {
      showToast(`Порядок сохранён, но меню не обновилось: ${error.message}`, "error");
    }
  }
}

function setupMenuSortDragDrop() {
  if (!menuNode || menuNode.dataset.sortBound === "1") return;
  menuNode.dataset.sortBound = "1";

  menuNode.addEventListener("dragstart", (event) => {
    if (!canSortMenu()) {
      event.preventDefault();
      return;
    }
    const row = event.target.closest(".menu-sort-row");
    if (!row || row.classList.contains("menu-sort-row--disabled")) {
      event.preventDefault();
      return;
    }
    menuSortDragRow = row;
    row.classList.add("is-dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", row.dataset.sortName || "");
  });

  menuNode.addEventListener("dragover", (event) => {
    if (!menuSortDragRow) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const targetRow = event.target.closest(".menu-sort-row");
    if (!targetRow || targetRow === menuSortDragRow) return;

    const dragContainer = getMenuSortContainer(menuSortDragRow);
    const targetContainer = getMenuSortContainer(targetRow);
    if (!dragContainer || dragContainer !== targetContainer) return;

    const dragBlock = getMenuSortBlock(menuSortDragRow);
    const targetBlock = getMenuSortBlock(targetRow);
    if (!dragBlock || !targetBlock) return;

    const rect = targetBlock.getBoundingClientRect();
    const insertBefore = event.clientY < rect.top + rect.height / 2;
    if (insertBefore) dragContainer.insertBefore(dragBlock, targetBlock);
    else dragContainer.insertBefore(dragBlock, targetBlock.nextSibling);
  });

  menuNode.addEventListener("drop", async (event) => {
    event.preventDefault();
    if (!menuSortDragRow) return;
    const container = getMenuSortContainer(menuSortDragRow);
    const folderPath = container?.dataset.sortFolder || ".";
    menuSortDragRow.classList.remove("is-dragging");
    menuSortDragRow = null;
    if (!container) {
      showToast("Не удалось определить папку для сортировки", "error");
      return;
    }
    await persistMenuSortOrder(container, folderPath);
  });

  menuNode.addEventListener("dragend", () => {
    if (menuSortDragRow) {
      menuSortDragRow.classList.remove("is-dragging");
      menuSortDragRow = null;
    }
  });
}

function renderMenu(menu, agentId = activeAgentId) {
  const target = ensureMenuAgentPane(agentId);
  menuCacheByAgent.set(agentId, menu);
  if (agentId === activeAgentId) {
    currentMenuData = menu;
    activateMenuAgentPane(agentId);
  }

  const agentTitle = getAgentTreeTitle(agentId);
  const baseTree = { title: agentTitle, ...menu };
  const filteredTree = filterMenuTree(baseTree, menuSearchQuery.trim().toLowerCase());
  const treeToRender = filteredTree || { title: agentTitle, sections: [], items: [], indexPath: null };

  if (agentId === activeAgentId) {
    sanitizeCollapsedFolderPaths(agentId);
    const allPaths = new Set(
      collectFlatMenuEntries(baseTree).map((entry) => nodeStorageKey(agentId, entry.path))
    );
    pruneBookmarks(allPaths);
    pruneNodeConfigCache(allPaths);
    applyMenuCardsFilterUi();
  }

  target.innerHTML = "";
  if (menuViewMode === "flat") {
    renderFlatMenu(menu, target, agentId);
  } else if (menuViewMode === "bookmarks") {
    renderBookmarksMenu(menu, target, agentId);
  } else if (menuViewMode === "cards") {
    renderCardsMenu(menu, target, agentId);
  } else if (menuSearchQuery.trim() && !menuSearchHasResults(menu)) {
    appendMenuSearchEmptyState(target);
  } else {
    renderTree(treeToRender, target, 0, ".", null, agentId);
    const childrenContainer = getWorkspacesTreeChildren(agentId);
    if (childrenContainer && menu.serviceTree) {
      renderServiceSection(menu.serviceTree, childrenContainer, agentId);
    }
    renderSystemFiles(systemFilesCache);
    decorateMenuSortRows(target);
  }

  if (agentId === activeAgentId) {
    syncAgentPreview({
      hasPreview: menu.hasPreview,
      previewUrl: menu.previewUrl
    });
    syncMenuCollapseAllButton();
    if (activeContentMode === NODE_NAVIGATION_MODE) {
      void renderNodeNavigation();
    }
  }
}

function getWorkspacesTreeChildren(agentId = activeAgentId) {
  const rootHost = menuAgentPanes.get(agentId) || getMenuQueryRoot();
  const rootSection = rootHost?.querySelector(".menu-section");
  if (!rootSection) return null;

  const containerClass =
    menuViewMode === "flat" || menuViewMode === "bookmarks"
      ? "menu-flat-list"
      : menuViewMode === "cards"
        ? "menu-cards-grid"
        : "tree-children";
  let childrenNode = rootSection.querySelector(`:scope > .${containerClass}`);
  if (!childrenNode) {
    childrenNode = document.createElement("div");
    childrenNode.className = containerClass;
    rootSection.appendChild(childrenNode);
  }
  return childrenNode;
}

function renderSystemFiles(files) {
  const container = getWorkspacesTreeChildren();
  if (!container) return;

  container.querySelectorAll(".system-file-row").forEach((node) => node.remove());

  const queryLower = menuSearchQuery.trim().toLowerCase();
  const visibleFiles = filterMenuEntriesByQuery(collectSystemFileMenuEntries(files), queryLower);

  for (const file of visibleFiles) {
    const row = document.createElement("div");
    row.className = "menu-item-row system-file-row";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = buildSystemFileItemClassName(file);
    btn.textContent = file.label;
    btn.dataset.systemFile = file.systemFile;
    btn.addEventListener("click", () => selectSystemFile(file.systemFile));

    row.appendChild(btn);
    container.appendChild(row);
  }
}

async function loadSystemFiles() {
  try {
    const response = await fetch(buildApiUrl("/api/system-files"));
    if (!response.ok) throw new Error(`Request failed with ${response.status}`);
    const data = await response.json();
    systemFilesCache = Array.isArray(data.files) ? data.files : [];
  } catch {
    systemFilesCache = [
      { name: "AGENTS.md", exists: false, empty: true },
      { name: "README.md", exists: false, empty: true },
      { name: "TODO.md", exists: false, empty: true },
      { name: "docker-compose.yml", exists: false, empty: true },
      { name: ".env", exists: false, empty: true },
      { name: ".gitignore", exists: false, empty: true },
      { name: "awn.dependencies.json", exists: false, empty: true },
      { name: "awn.registry.json", exists: false, empty: true }
    ];
  }
  if (currentMenuData) {
    renderMenu(currentMenuData);
    updateActiveButton();
  } else {
    renderSystemFiles(systemFilesCache);
  }
}

function updateActiveButton() {
  const root = getMenuQueryRoot();
  const resolvedActive = normalizeMenuNodePath(activePath || "");
  const items = root.querySelectorAll(".menu-item, .menu-folder");
  for (const item of items) {
    const isActive =
      !activeSystemFile && normalizeMenuNodePath(item.dataset.path || "") === resolvedActive;
    item.classList.toggle("active", isActive);
  }
  for (const item of root.querySelectorAll(".system-file-item")) {
    const name = item.dataset.systemFile || "";
    item.classList.toggle("active", Boolean(activeSystemFile) && name === activeSystemFile);
  }
  for (const card of (appRootNode || document).querySelectorAll(".menu-card-body[data-path]")) {
    const isActive =
      !activeSystemFile && normalizeMenuNodePath(card.dataset.path || "") === resolvedActive;
    card.classList.toggle("active", isActive);
    card.closest(".menu-card")?.classList.toggle("active", isActive);
  }
  for (const card of (appRootNode || document).querySelectorAll(".menu-card[data-system-file]")) {
    const name = card.dataset.systemFile || "";
    card.classList.toggle("active", Boolean(activeSystemFile) && name === activeSystemFile);
  }
}

async function selectSystemFile(name) {
  if (!name) return;
  hideHomeView();
  nodeSettingsViewActive = false;
  nodeMemoryViewActive = false;
  applyNodeWorkspaceViewUi();
  activeSystemFile = name;
  activePath = null;
  activeLabel = null;
  activeExternalFilePath = null;
  clearMediaSidecarEditor();
  updateActiveButton();
  setLoading("Загрузка файла...");

  try {
    const response = await fetch(buildApiUrl("/api/system-file", { name }));
    if (!response.ok) throw new Error(`Request failed with ${response.status}`);
    const data = await response.json();
    fileContentInputNode.value = data.content || "";
    setPropsYamlContent("");
    applySystemFileUi();
    updateBreadcrumbsForActiveMode();
    editorCodeWrapNode?.classList.remove("hidden");
    refreshEditorViewContent();
  } catch (error) {
    fileContentInputNode.value = `Ошибка чтения файла: ${error.message}`;
    applySystemFileUi();
    updateBreadcrumbsForActiveMode();
    editorCodeWrapNode?.classList.remove("hidden");
  }
}

async function selectFile(label, filePath) {
  if (!filePath) {
    fileContentInputNode.value = "Ошибка чтения файла: пустой путь";
    return;
  }

  hideHomeView();
  activeSystemFile = null;
  if (!isNodeSettingsTargetPath(filePath)) {
    nodeSettingsViewActive = false;
    nodeMemoryViewActive = false;
  }
  activePath = getResolvedNodePath(filePath);
  activeLabel = label;
  activeExternalFilePath = null;
  clearMediaSidecarEditor();
  updateActiveButton();
  titleInputNode.value = label;
  setLoading("Загрузка файла...");

  try {
    const response = await fetch(buildApiUrl("/api/file", { path: activePath }));
    if (!response.ok) throw new Error(`Request failed with ${response.status}`);
    const data = await response.json();
    modeContentCache.description = data.content;
    modeContentCache.internal = "";
    modeContentCache.external = "";
    modeContentCache.inbox = "";
    modeContentCache.references = "";
    modeContentCache.media = "";
    modeContentCache.configs = "";
    modeContentCache.env = "";
    modeContentCache.scripts = "";
    modeContentCache.todo = "";
    await loadPropertiesForActivePath();
    if (isNodeMdPath(activePath)) {
      try {
        await loadNodeConfig(activePath);
      } catch {
        invalidateNodeConfigCache(activePath);
      }
    }
    applyNodeManifestBody(modeContentCache.description || "");
    await loadContentByMode();
    titleInputNode.value = getLabelFromPath(activePath);
    applyNodeWorkspaceViewUi();
  } catch (error) {
    fileContentInputNode.value = `Ошибка чтения файла: ${error.message}`;
  }
}

async function loadContentByMode() {
  if (!activePath) return;

  try {
  if (activeContentMode !== "external") {
    activeExternalFilePath = null;
  }

  if (activeContentMode === NODE_OVERVIEW_MODE) {
    await loadPropertiesForActivePath();
    applyNodeManifestBody(modeContentCache.description || "");
    fileContentInputNode.value = "";
    applyModeUi();
    updateBreadcrumbsForActiveMode();
    return;
  }

  if (activeContentMode === NODE_NAVIGATION_MODE) {
    fileContentInputNode.value = "";
    applyModeUi();
    updateBreadcrumbsForActiveMode();
    return;
  }

  if (activeContentMode === "description") {
    await loadPropertiesForActivePath();
    applyNodeManifestBody(modeContentCache.description || "");
    applyModeUi();
    refreshEditorViewContent();
    updateBreadcrumbsForActiveMode();
    return;
  }

  if (activeContentMode === "internal") {
    try {
      const response = await fetch(buildApiUrl("/api/memory/internal", { path: getActiveNodeApiPath() }));
      if (!response.ok) throw new Error(`Request failed with ${response.status}`);
      const data = await response.json();
      modeContentCache.internal = data.content || "";
      fileContentInputNode.value = modeContentCache.internal;
      applyModeUi();
      refreshEditorViewContent();
    } catch (error) {
      fileContentInputNode.value = `Ошибка чтения краткой памяти: ${error.message}`;
      fileContentInputNode.readOnly = true;
    }
    updateBreadcrumbsForActiveMode();
    return;
  }

  if (activeContentMode === "tabular") {
    try {
      const response = await fetch(buildApiUrl("/api/memory/tabular", { path: getActiveNodeApiPath() }));
      if (!response.ok) throw new Error(`Request failed with ${response.status}`);
      const data = await response.json();
      modeContentCache.tabular = data.content || "";
      tabularDataCache = {
        columns: Array.isArray(data.columns) ? data.columns : [],
        rows: Array.isArray(data.rows) ? data.rows : [],
        rowCount: data.rowCount || 0
      };
      fileContentInputNode.value = data.content || "";
      editorViewMode = "preview";
      applyModeUi();
      renderListViewContent();
    } catch (error) {
      fileContentInputNode.value = `Ошибка чтения табличной памяти: ${error.message}`;
      fileContentInputNode.readOnly = true;
    }
    updateBreadcrumbsForActiveMode();
    return;
  }

  if (activeContentMode === "external") {
    try {
      const response = await fetch(buildApiUrl("/api/external/files", { path: activePath }));
      if (!response.ok) throw new Error(`Request failed with ${response.status}`);
      const data = await response.json();
      externalFilesCache = Array.isArray(data.files) ? data.files : [];
      modeContentCache.external = externalFilesCache.map((file) => file.relativePath).join("\n");
      fileContentInputNode.value = data.exists ? modeContentCache.external : "Папка не найдена";
      activeExternalFilePath = null;
      applyModeUi();
      renderListViewContent();
      renderPreviewFromEditor();
    } catch (error) {
      fileContentInputNode.value = `Ошибка чтения произвольной памяти: ${error.message}`;
      fileContentInputNode.readOnly = true;
    }
    updateBreadcrumbsForActiveMode();
    return;
  }

  if (activeContentMode === "inbox") {
    try {
      const response = await fetch(buildApiUrl("/api/folder/view", { path: activePath, folder: "_Inbox" }));
      if (!response.ok) throw new Error(`Request failed with ${response.status}`);
      const data = await response.json();
      applyFlatStorageFolderLoadState("inbox", data);
      applyModeUi();
      renderListViewContent();
      renderPreviewFromEditor();
    } catch (error) {
      fileContentInputNode.value = `Ошибка чтения входящих: ${error.message}`;
      renderListViewContent();
      fileContentInputNode.readOnly = true;
    }
    updateBreadcrumbsForActiveMode();
    return;
  }

  if (activeContentMode === "references") {
    try {
      const response = await fetch(buildApiUrl("/api/folder/view", { path: activePath, folder: "_Referenses" }));
      if (!response.ok) throw new Error(`Request failed with ${response.status}`);
      const data = await response.json();
      applyFlatStorageFolderLoadState("references", data);
      applyModeUi();
      renderListViewContent();
      renderPreviewFromEditor();
    } catch (error) {
      fileContentInputNode.value = `Ошибка чтения источников: ${error.message}`;
      renderListViewContent();
      fileContentInputNode.readOnly = true;
    }
    updateBreadcrumbsForActiveMode();
    return;
  }

  if (activeContentMode === "media") {
    clearMediaSidecarEditor();
    fileContentInputNode.value = "";
    try {
      const response = await fetch(buildApiUrl("/api/media", { path: activePath }));
      if (!response.ok) throw new Error(`Request failed with ${response.status}`);
      const data = await response.json();
      mediaAssetsExists = Boolean(data.exists);
      modeContentCache.media = data.content || "";
      syncMediaFilesCache(data.content, data.groups);
      applyModeUi();
      renderListViewContent();
    } catch (error) {
      mediaAssetsExists = true;
      modeContentCache.media = "";
      syncMediaFilesCache("", {});
      applyModeUi();
      listViewContentNode.innerHTML = "";
      renderMediaEmpty(listViewContentNode, `Ошибка чтения медиа: ${error.message}`);
      showToast(`Ошибка чтения медиа: ${error.message}`, "error");
    }
    updateBreadcrumbsForActiveMode();
    return;
  }

  if (activeContentMode === "graph") {
    fileContentInputNode.value = "";
    applyModeUi();
    updateBreadcrumbsForActiveMode();
    return;
  }

  if (activeContentMode === "node-preview") {
    fileContentInputNode.value = "";
    applyModeUi();
    await loadNodePreview();
    return;
  }

  if (activeContentMode === "configs") {
    try {
      const data = await loadNodeConfig(activePath, { force: true });
      modeContentCache.configs = data.content || "";
      fileContentInputNode.value = modeContentCache.configs;
      applyModeUi();
      refreshEditorViewContent();
    } catch (error) {
      fileContentInputNode.value = `Ошибка чтения ${BUNDLE_CONFIG_FILE}: ${error.message}`;
      fileContentInputNode.readOnly = true;
    }
    updateBreadcrumbsForActiveMode();
    return;
  }

  if (activeContentMode === "env") {
    try {
      const response = await fetch(buildApiUrl("/api/env", { path: activePath }));
      if (!response.ok) throw new Error(`Request failed with ${response.status}`);
      const data = await response.json();
      modeContentCache.env = data.content || "";
      fileContentInputNode.value = modeContentCache.env;
      applyModeUi();
    } catch (error) {
      fileContentInputNode.value = `Ошибка чтения .env: ${error.message}`;
      fileContentInputNode.readOnly = true;
    }
    updateBreadcrumbsForActiveMode();
    return;
  }

  if (activeContentMode === "todo") {
    try {
      const response = await fetch(buildApiUrl("/api/todo", { path: getActiveNodeApiPath() }));
      if (!response.ok) throw new Error(`Request failed with ${response.status}`);
      const data = await response.json();
      modeContentCache.todo = data.content || "";
      fileContentInputNode.value = modeContentCache.todo;
      applyModeUi();
      refreshEditorViewContent();
    } catch (error) {
      fileContentInputNode.value = `Ошибка чтения TODO: ${error.message}`;
      fileContentInputNode.readOnly = true;
    }
    updateBreadcrumbsForActiveMode();
    return;
  }

  if (activeContentMode === "scripts") {
    try {
      const response = await fetch(buildApiUrl("/api/folder/view", { path: activePath, folder: "_Scripts" }));
      if (!response.ok) throw new Error(`Request failed with ${response.status}`);
      const data = await response.json();
      applyFlatStorageFolderLoadState("scripts", data);
      applyModeUi();
      renderListViewContent();
      renderPreviewFromEditor();
    } catch (error) {
      fileContentInputNode.value = `Ошибка чтения скриптов: ${error.message}`;
      fileContentInputNode.readOnly = true;
    }
    updateBreadcrumbsForActiveMode();
  }
  } finally {
    syncEditorLineNumbers();
  }
}

function replaceActiveMenuLabel(newLabel) {
  const items = getMenuQueryRoot().querySelectorAll(".menu-item, .menu-folder");
  for (const item of items) {
    if (item.dataset.path === activePath) {
      item.textContent = newLabel;
      break;
    }
  }
}

function patchTreePaths(oldPath, newPath) {
  const oldPrefix = `${oldPath.replace(/\/+$/, "")}/`;
  const newPrefix = `${newPath.replace(/\/+$/, "")}/`;
  const nodes = getMenuQueryRoot().querySelectorAll("[data-path]");
  for (const node of nodes) {
    const currentPath = node.dataset.path || "";
    if (currentPath === oldPath || currentPath.startsWith(oldPrefix)) {
      node.dataset.path = currentPath === oldPath ? newPath : `${newPrefix}${currentPath.slice(oldPrefix.length)}`;
    }
  }
}

async function saveContent() {
  if (editorViewMode === "wysiwyg") {
    syncSourceFromWysiwygEditor();
  }
  const content = isExternalFileEditing()
    ? buildExternalFileContent()
    : activeContentMode === "description"
      ? buildNodeManifestContent()
      : getEditorContentValue();

  if (activeSystemFile) {
    setSaveButtonsState(true, "Сохраняю...");
    try {
      const response = await fetch(buildApiUrl("/api/system-file"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: activeSystemFile, content })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const reason = errorData.error || `Request failed with ${response.status}`;
        const details = errorData.details ? `: ${errorData.details}` : "";
        throw new Error(`${reason}${details}`);
      }
      await loadSystemFiles();
      showToast("Сохранено", "success");
    } catch (error) {
      showToast(`Ошибка сохранения: ${error.message}`, "error");
    } finally {
      setSaveButtonsState(false);
    }
    return;
  }

  if (!activePath) return;
  const nextTitle = titleInputNode.value.trim();
  const currentTitle = getLabelFromPath(activePath);
  const currentExternalTitle = activeExternalFilePath
    ? (activeExternalFilePath.split("/").pop() || activeExternalFilePath).replace(/\.md$/i, "")
    : "";
  const currentMediaTitleBase = getMediaSidecarTitleBase();
  const shouldRenameDescription =
    activeContentMode === "description" &&
    nextTitle &&
    nextTitle !== currentTitle &&
    !isAgentRootIndexPath(activePath) &&
    !isPartNodePath(activePath);
  const shouldRenameExternal = activeContentMode === "external" && activeExternalFilePath && nextTitle && nextTitle !== currentExternalTitle;
  const shouldRenameMediaSidecar =
    activeContentMode === "media" &&
    activeMediaSidecarPath &&
    nextTitle &&
    nextTitle !== currentMediaTitleBase;

  setSaveButtonsState(true, "Сохраняю...");

  try {
    if (shouldRenameDescription) {
      const renameResponse = await fetch(buildApiUrl("/api/file/title"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: activePath, title: nextTitle })
      });

      if (!renameResponse.ok) {
        const errorData = await renameResponse.json().catch(() => ({}));
        const reason = errorData.error || `Request failed with ${renameResponse.status}`;
        const details = errorData.details ? `: ${errorData.details}` : "";
        throw new Error(`Ошибка переименования: ${reason}${details}`);
      }

      const renameData = await renameResponse.json();
      if (activeContentMode === "description" && typeof renameData.content === "string") {
        modeContentCache.description = renameData.content;
        applyNodeManifestBody(renameData.content);
      }
      const oldPath = activePath;
      activePath = renameData.path;
      activeLabel = nextTitle;
      updateBreadcrumbsForActiveMode();
      titleInputNode.value = getLabelFromPath(renameData.path);

      const currentNode = getMenuQueryRoot().querySelector(`[data-path="${CSS.escape(oldPath)}"]`);
      if (currentNode) currentNode.dataset.path = renameData.path;

      if (isNodeManifestPath(oldPath) && isNodeManifestPath(renameData.path) && !isPartNodePath(oldPath)) {
        const oldFolderPath = getFolderPathFromManifest(oldPath);
        const newFolderPath = getFolderPathFromManifest(renameData.path);
        patchTreePaths(oldFolderPath, newFolderPath);
      }

      replaceActiveMenuLabel(getLabelFromPath(renameData.path));
      updateActiveButton();
      showToast("Переименовано", "success");
    }

    if (shouldRenameExternal) {
      const renameResponse = await fetch(buildApiUrl("/api/external/file/rename"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: activePath, file: activeExternalFilePath, title: nextTitle })
      });
      if (!renameResponse.ok) {
        const errorData = await renameResponse.json().catch(() => ({}));
        const reason = errorData.error || `Request failed with ${renameResponse.status}`;
        const details = errorData.details ? `: ${errorData.details}` : "";
        throw new Error(`Ошибка переименования файла _Content: ${reason}${details}`);
      }
      const renameData = await renameResponse.json();
      activeExternalFilePath = renameData.file;
      updateBreadcrumbsForActiveMode();
      titleInputNode.value = nextTitle;
      applyExternalFileContentUi(renameData.content || "");
      showToast("Переименовано", "success");
    }

    if (shouldRenameMediaSidecar) {
      const renameResponse = await fetch(buildApiUrl("/api/media/file/rename"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: activePath,
          file: activeMediaSidecarSourcePath,
          title: nextTitle
        })
      });
      if (!renameResponse.ok) {
        const errorData = await renameResponse.json().catch(() => ({}));
        const reason = errorData.error || `Request failed with ${renameResponse.status}`;
        const details = errorData.details ? `: ${errorData.details}` : "";
        throw new Error(`Ошибка переименования медиафайла: ${reason}${details}`);
      }
      const renameData = await renameResponse.json();
      activeMediaSidecarSourcePath = renameData.file;
      activeMediaSidecarPath = renameData.sidecar || getMediaSidecarPath(renameData.file);
      updateBreadcrumbsForActiveMode();
      applyMediaSidecarTitleUi();
      if (typeof renameData.content === "string") {
        fileContentInputNode.value = renameData.content;
      }
      await refreshMediaCache();
      showToast("Файл переименован", "success");
    }

    const saveUrl = buildApiUrl(
      activeContentMode === "external" && activeExternalFilePath
        ? "/api/external/file"
        : activeContentMode === "internal"
          ? "/api/memory/internal"
          : activeContentMode === "tabular"
            ? "/api/memory/tabular"
          : activeContentMode === "todo"
            ? "/api/todo"
            : activeContentMode === "configs"
              ? "/api/file/node-config"
              : activeContentMode === "env"
                ? "/api/env"
                : "/api/file/content"
    );
    if (
      (activeContentMode === "external" && !activeExternalFilePath) ||
      (activeContentMode === "media" && !isMediaSidecarEditing()) ||
      (activeContentMode === "tabular" && !isTabularSourceEditing()) ||
      activeContentMode === "scripts" ||
      activeContentMode === "node-preview" ||
      activeContentMode === "graph"
    ) {
      throw new Error("Этот режим доступен только для чтения");
    }

    if (activeContentMode === "media" && activeMediaSidecarPath) {
      const response = await fetch(buildApiUrl("/api/media/sidecar"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: activePath,
          file: activeMediaSidecarSourcePath,
          content
        })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const reason = errorData.error || `Request failed with ${response.status}`;
        const details = errorData.details ? `: ${errorData.details}` : "";
        throw new Error(`${reason}${details}`);
      }
      const data = await response.json();
      fileContentInputNode.value = data.content || "";
      refreshEditorViewContent();
      showToast("Sidecar сохранён", "success");
      return;
    }

    const response = await fetch(saveUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        activeContentMode === "external" && activeExternalFilePath
          ? { path: getActiveNodeApiPath(), file: activeExternalFilePath, content }
          : { path: getActiveNodeApiPath(), content }
      )
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const reason = errorData.error || `Request failed with ${response.status}`;
      const details = errorData.details ? `: ${errorData.details}` : "";
      throw new Error(`${reason}${details}`);
    }

    const data = await response.json();
    if (activeContentMode === "description") {
      modeContentCache.description = data.content || "";
      applyNodeManifestBody(modeContentCache.description);
      refreshEditorViewContent();
      showToast("Сохранено", "success");
      return;
    }
    if (activeContentMode === "internal") modeContentCache.internal = data.content || "";
    if (activeContentMode === "tabular") {
      modeContentCache.tabular = data.content || "";
      tabularDataCache = {
        columns: Array.isArray(data.columns) ? data.columns : [],
        rows: Array.isArray(data.rows) ? data.rows : [],
        rowCount: data.rowCount || 0
      };
      setEditorViewMode("preview");
      renderListViewContent();
      showToast("CSV сохранён", "success");
      return;
    }
    if (activeContentMode === "todo") modeContentCache.todo = data.content || "";
    if (activeContentMode === "configs") {
      modeContentCache.configs = data.content || "";
      setCachedNodeConfig(activePath, {
        path: data.path || "",
        content: data.content || "",
        exists: Boolean(data.exists),
        defaultLandingMode: data.defaultLandingMode || parseNodeConfigContent(data.content || "").defaultLandingMode
      });
      syncNodeDefaultLandingBtn();
      showToast(`${BUNDLE_CONFIG_FILE} сохранён`, "success");
      refreshEditorViewContent();
      return;
    }
    if (activeContentMode === "env") modeContentCache.env = data.content || "";
    if (activeContentMode === "external" && activeExternalFilePath) {
      applyExternalFileContentUi(data.content || "");
      showToast("Файл _Content сохранен", "success");
      return;
    }
    fileContentInputNode.value = data.content;
    refreshEditorViewContent();
    showToast("Сохранено", "success");
  } catch (error) {
    showToast(`Ошибка сохранения: ${error.message}`, "error");
  } finally {
    setSaveButtonsState(false);
  }
}

async function loadPropertiesForActivePath() {
  if (!activePath) {
    setPropsYamlContent("");
    return;
  }
  try {
    const response = await fetch(buildApiUrl("/api/file/properties", { path: activePath }));
    if (!response.ok) throw new Error(`Request failed with ${response.status}`);
    const data = await response.json();
    setPropsYamlContent(data.content || "");
  } catch (error) {
    setPropsYamlContent(`# Ошибка чтения YAML-свойств: ${error.message}`);
    propsRawYamlVisible = true;
    propsInputNode.classList.remove("hidden");
    propsYamlToggleBtn.textContent = "Скрыть YAML";
  }
}

async function saveProperties({ showToastOnSuccess = true } = {}) {
  if (!activePath) return;
  readPropsFormIntoEntries();
  if (!propsRawYamlVisible) {
    syncYamlFromPropsForm();
  }
  const content = propsInputNode.value;
  try {
    const response = await fetch(buildApiUrl("/api/file/properties"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: activePath, content })
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const reason = errorData.error || `Request failed with ${response.status}`;
      const details = errorData.details ? `: ${errorData.details}` : "";
      throw new Error(`${reason}${details}`);
    }
    const data = await response.json();
    setPropsYamlContent(data.content || "", { preserveRawMode: propsRawYamlVisible });
    if (activeContentMode === "description") {
      const { body } = splitFrontmatter(modeContentCache.description || "");
      modeContentCache.description = joinFrontmatter(data.content || "", body);
    }
    if (showToastOnSuccess) {
      showToast("YAML сохранен", "success");
    }
  } catch (error) {
    showToast("Ошибка YAML", "error");
    throw error;
  }
}

function loadAgentWorkspaceView() {
  try {
    const saved = localStorage.getItem(AGENT_WORKSPACE_VIEW_STORAGE_KEY);
    if (
      saved === "dashboard" ||
      saved === "map" ||
      saved === "map2" ||
      saved === "schema" ||
      saved === "vault" ||
      saved === "graph"
    ) {
      return saved;
    }
  } catch {
    // ignore
  }
  return "dashboard";
}

function saveAgentWorkspaceView(view) {
  try {
    localStorage.setItem(AGENT_WORKSPACE_VIEW_STORAGE_KEY, view);
  } catch {
    // ignore
  }
}

function syncAgentWorkspaceViewButtons() {
  for (const btn of [
    agentViewDashboardBtn,
    agentViewMapBtn,
    agentViewMap2Btn,
    agentViewRegistryBtn,
    agentViewSchemaBtn,
    agentViewVaultBtn,
    agentViewGraphBtn
  ]) {
    if (!btn) continue;
    const view = btn.dataset.agentView;
    const active = view === agentWorkspaceView;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-selected", active ? "true" : "false");
  }
}

function isAgentWorkspaceCanvasVisible() {
  return appRootNode.classList.contains("home-view");
}

function applyAgentWorkspaceCanvasUi() {
  syncAgentWorkspaceViewButtons();
  const showCanvas = isAgentWorkspaceCanvasVisible();
  homePaneNode?.classList.toggle("hidden", !showCanvas || agentWorkspaceView !== "dashboard");
  agentMapPaneNode?.classList.toggle("hidden", !showCanvas || agentWorkspaceView !== "map");
  agentMap2PaneNode?.classList.toggle("hidden", !showCanvas || agentWorkspaceView !== "map2");
  agentSchemaPaneNode?.classList.toggle("hidden", !showCanvas || agentWorkspaceView !== "schema");
  agentVaultPaneNode?.classList.toggle("hidden", !showCanvas || agentWorkspaceView !== "vault");
  agentGraphPaneNode?.classList.toggle("hidden", !showCanvas || agentWorkspaceView !== "graph");

  if (!showCanvas) return;

  if (agentWorkspaceView === "dashboard") {
    renderAgentDashboardView();
  } else if (agentWorkspaceView === "map") {
    renderAgentMapView();
  } else if (agentWorkspaceView === "map2") {
    renderAgentMap2View();
  } else if (agentWorkspaceView === "schema") {
    renderAgentSchemaView();
  } else if (agentWorkspaceView === "vault") {
    renderAgentVaultView();
  } else if (agentWorkspaceView === "graph") {
    renderAgentGraphView();
  }
}

function setAgentWorkspaceView(view) {
  if (
    view !== "dashboard" &&
    view !== "map" &&
    view !== "map2" &&
    view !== "schema" &&
    view !== "vault" &&
    view !== "graph"
  ) {
    return;
  }
  agentWorkspaceView = view;
  saveAgentWorkspaceView(view);

  if (activePath || activeSystemFile) {
    showHomeView();
    return;
  }

  if (!isAgentWorkspaceCanvasVisible()) {
    showHomeView();
    return;
  }

  applyAgentWorkspaceCanvasUi();
}

function countAgentMenuNodes(menu) {
  if (!menu) return { total: 0, folders: 0, leaves: 0 };
  const entries = collectFlatMenuEntries({ title: getAgentTreeTitle(), ...menu });
  const folders = entries.filter((entry) => entry.isFolder).length;
  return {
    total: entries.length,
    folders,
    leaves: entries.length - folders
  };
}

const AGENT_MAP_ZONE_SPECS = [
  { id: "core", title: "Core", icon: "⚙️", className: "agent-map-zone--core" },
  { id: "memory", title: "Memory", icon: "🧠", className: "agent-map-zone--memory" },
  { id: "projects", title: "Projects", icon: "📁", className: "agent-map-zone--projects" },
  { id: "registry", title: "Registry", icon: "🗂️", className: "agent-map-zone--registry" },
  { id: "nodes", title: "nodes", icon: "📄", className: "agent-map-zone--nodes" }
];

function buildAgentMapZoneData(menu) {
  const baseTree = menu ? { title: getAgentTreeTitle(), ...menu } : null;
  const rootPath = baseTree?.indexPath || null;

  const core = [];
  if (rootPath) {
    core.push({
      label: getLabelFromPath(rootPath),
      sub: "_.x.md",
      path: rootPath,
      action: "node"
    });
  }
  core.push({
    label: "AGENTS.md",
    sub: "системный файл",
    systemFile: "AGENTS.md",
    action: "system"
  });

  const memory = [
    {
      label: "Однофайловая",
      sub: `_Storage/_/${BUNDLE_CONTENT_FILE}`,
      mode: "internal",
      path: rootPath,
      action: "memory"
    },
    {
      label: "Многофайловая",
      sub: "_Content/",
      mode: "external",
      path: rootPath,
      action: "memory"
    },
    {
      label: "Табличная",
      sub: `_Storage/_/${BUNDLE_TABULAR_FILE}`,
      mode: "tabular",
      path: rootPath,
      action: "memory"
    }
  ];

  const projects = [];
  if (baseTree) {
    for (const child of getOrderedMenuChildren(baseTree).slice(0, 5)) {
      if (child.kind === "folder") {
        const path = child.entry.indexPath;
        if (!path) continue;
        projects.push({
          label: child.entry.title || getLabelFromPath(path),
          sub: getNodeDisplayPath(path),
          path,
          action: "node"
        });
      } else {
        projects.push({
          label: child.entry.label || getLabelFromPath(child.entry.path),
          sub: getNodeDisplayPath(child.entry.path),
          path: child.entry.path,
          action: "node"
        });
      }
    }
  }

  const registry = getSelectableAgents()
    .slice(0, 6)
    .map((agent) => ({
      label: agent.name || agent.id,
      sub: agent.path || agent.id,
      agentId: agent.id,
      action: "agent",
      active: agent.id === activeAgentId
    }));

  const nodes = baseTree
    ? collectFlatMenuEntries(baseTree)
        .filter((entry) => entry.path && entry.path !== rootPath)
        .slice(0, 6)
        .map((entry) => ({
          label: entry.label || getLabelFromPath(entry.path),
          sub: entry.displayPath || getNodeDisplayPath(entry.path),
          path: entry.path,
          action: "node"
        }))
    : [];

  return { core, memory, projects, registry, nodes, rootPath };
}

function handleAgentMapItemClick(item) {
  if (!item) return;
  if (item.action === "system" && item.systemFile) {
    void selectSystemFile(item.systemFile);
    return;
  }
  if (item.action === "agent" && item.agentId) {
    selectAgentOption(item.agentId);
    return;
  }
  if (item.action === "memory" && item.path && item.mode) {
    void openNodeMemoryWorkspace(getLabelFromPath(item.path), item.path).then(() => {
      setContentMode(item.mode);
    });
    return;
  }
  if (item.action === "node" && item.path) {
    void openNodeFromMenu(getLabelFromPath(item.path), item.path);
  }
}

function createAgentMapTile(item) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "agent-map-tile";
  if (item.active) btn.classList.add("is-active");

  const label = document.createElement("span");
  label.className = "agent-map-tile-label";
  label.textContent = item.label;

  const sub = document.createElement("span");
  sub.className = "agent-map-tile-sub";
  sub.textContent = item.sub;

  btn.append(label, sub);
  btn.addEventListener("click", () => handleAgentMapItemClick(item));
  return btn;
}

function createAgentMapZone(spec, items) {
  const zone = document.createElement("section");
  zone.className = `agent-map-zone ${spec.className}`;
  zone.dataset.zoneId = spec.id;

  const head = document.createElement("header");
  head.className = "agent-map-zone-head";
  head.innerHTML = `<span class="agent-map-zone-icon" aria-hidden="true">${spec.icon}</span><span class="agent-map-zone-title">${escapeHtml(spec.title)}</span>`;

  const body = document.createElement("div");
  body.className = "agent-map-zone-body";

  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "agent-map-zone-empty";
    empty.textContent = "Пусто";
    body.appendChild(empty);
  } else {
    for (const item of items) {
      body.appendChild(createAgentMapTile(item));
    }
  }

  zone.append(head, body);
  return zone;
}

function renderAgentMapHub() {
  if (!agentMapHubTitleNode || !agentMapHubSubNode || !agentMapHubAvatarNode) return;
  const agent = getActiveAgentMeta();
  agentMapHubTitleNode.textContent = agent?.name || getActiveAgentLabel() || "Agent";
  agentMapHubSubNode.textContent = activeAgentId || "workspace";

  agentMapHubAvatarNode.innerHTML = "";
  if (agent?.previewUrl) {
    const img = document.createElement("img");
    img.src = agent.previewUrl;
    img.alt = "";
    agentMapHubAvatarNode.appendChild(img);
  } else {
    agentMapHubAvatarNode.textContent = "🤖";
  }
}

function renderAgentMapLinks() {
  if (!agentMapStageNode || !agentMapLinksNode || !agentMapHubNode || !agentMapZonesNode) return;

  const stageRect = agentMapStageNode.getBoundingClientRect();
  if (stageRect.width < 1 || stageRect.height < 1) return;

  agentMapLinksNode.setAttribute("width", String(stageRect.width));
  agentMapLinksNode.setAttribute("height", String(stageRect.height));
  agentMapLinksNode.setAttribute("viewBox", `0 0 ${stageRect.width} ${stageRect.height}`);
  agentMapLinksNode.innerHTML = "";

  const hubRect = agentMapHubNode.getBoundingClientRect();
  const hx = hubRect.left + hubRect.width / 2 - stageRect.left;
  const hy = hubRect.top + hubRect.height / 2 - stageRect.top;

  for (const zoneEl of agentMapZonesNode.querySelectorAll(".agent-map-zone")) {
    const zoneRect = zoneEl.getBoundingClientRect();
    const zx = zoneRect.left + zoneRect.width / 2 - stageRect.left;
    const zy = zoneRect.top + zoneRect.height / 2 - stageRect.top;
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", String(hx));
    line.setAttribute("y1", String(hy));
    line.setAttribute("x2", String(zx));
    line.setAttribute("y2", String(zy));
    line.setAttribute("class", "agent-map-link");
    agentMapLinksNode.appendChild(line);
  }
}

function bindAgentMapLinksObserver() {
  if (!agentMapStageNode || typeof ResizeObserver === "undefined") return;
  if (agentMapLinksResizeObserver) {
    agentMapLinksResizeObserver.disconnect();
  }
  agentMapLinksResizeObserver = new ResizeObserver(() => {
    if (agentWorkspaceView !== "map" || !isAgentWorkspaceCanvasVisible()) return;
    renderAgentMapLinks();
  });
  agentMapLinksResizeObserver.observe(agentMapStageNode);
}

function renderAgentMapView() {
  if (!agentMapZonesNode) return;

  const zoneData = buildAgentMapZoneData(currentMenuData);
  agentMapZonesNode.innerHTML = "";

  for (const spec of AGENT_MAP_ZONE_SPECS) {
    agentMapZonesNode.appendChild(createAgentMapZone(spec, zoneData[spec.id] || []));
  }

  renderAgentMapHub();
  bindAgentMapLinksObserver();
  requestAnimationFrame(() => {
    renderAgentMapLinks();
    requestAnimationFrame(renderAgentMapLinks);
  });
}

const AGENT_MAP2_NODE_WIDTH = 136;
const AGENT_MAP2_NODE_HEIGHT = 52;
const AGENT_MAP2_LEVEL_GAP = 92;
const AGENT_MAP2_SIBLING_GAP = 18;
const AGENT_MAP2_CANVAS_PADDING = 48;
const AGENT_MAP2_MAX_NODES = 140;

function buildAgentMap2Data(menu) {
  const nodes = [];
  const hardEdges = [];
  const softEdges = [];
  const rootId = "map2-root";
  const baseTree = menu ? { title: getAgentTreeTitle(), ...menu } : { title: getAgentTreeTitle(), sections: [], items: [] };

  nodes.push({
    id: rootId,
    label: getAgentTreeTitle(),
    type: "folder",
    kind: "root",
    path: baseTree.indexPath || null,
    sub: baseTree.indexPath ? getNodeDisplayPath(baseTree.indexPath) : "корень workspace",
    hasPreview: Boolean(baseTree.hasPreview),
    previewUrl: baseTree.previewUrl || null
  });

  function pushNode(node, parentId) {
    if (nodes.length >= AGENT_MAP2_MAX_NODES) return false;
    nodes.push(node);
    hardEdges.push({ from: parentId, to: node.id, kind: "hard" });
    return true;
  }

  function walkMenuNode(menuNode, parentId, depth, parentSectionPath) {
    if (nodes.length >= AGENT_MAP2_MAX_NODES || depth > 8) return;
    for (const child of getVisibleMenuChildren(menuNode)) {
      if (nodes.length >= AGENT_MAP2_MAX_NODES) break;
      if (child.kind === "folder") {
        attachFolderNode(child.entry, parentId, depth, parentSectionPath);
      } else {
        attachItemNode(child.entry, parentId);
      }
    }
  }

  function attachFolderNode(section, parentId, depth, parentSectionPath) {
    const folderPath = resolveSectionFolderPath(section, parentSectionPath, depth);
    const hasManifest = Boolean(section.indexPath);
    const id = hasManifest
      ? `map2:${normalizeMenuNodePath(section.indexPath)}`
      : `map2-group:${normalizeMenuNodePath(folderPath)}`;
    if (nodes.some((entry) => entry.id === id)) return;

    const label = section.title || (hasManifest ? getLabelFromPath(section.indexPath) : folderPath);
    const added = pushNode(
      {
        id,
        label,
        type: hasManifest ? "folder" : "group",
        kind: hasManifest ? "folder" : "group",
        path: section.indexPath || null,
        sub: hasManifest ? getNodeDisplayPath(section.indexPath) : "группа папок",
        hasPreview: Boolean(section.hasPreview),
        previewUrl: section.previewUrl || null
      },
      parentId
    );
    if (!added) return;
    walkMenuNode(section, id, depth + 1, folderPath);
  }

  function attachItemNode(item, parentId) {
    const id = `map2:${normalizeMenuNodePath(item.path)}`;
    if (nodes.some((entry) => entry.id === id)) return;
    pushNode(
      {
        id,
        label: item.label || getLabelFromPath(item.path),
        type: "file",
        kind: "file",
        path: item.path,
        sub: getNodeDisplayPath(item.path),
        hasPreview: Boolean(item.hasPreview),
        previewUrl: item.previewUrl || null
      },
      parentId
    );
  }

  walkMenuNode(baseTree, rootId, 0, "");
  return { nodes, hardEdges, softEdges, truncated: nodes.length >= AGENT_MAP2_MAX_NODES };
}

function buildAgentMap2ChildMap(hardEdges) {
  const children = new Map();
  for (const edge of hardEdges) {
    if (!children.has(edge.from)) children.set(edge.from, []);
    children.get(edge.from).push(edge.to);
  }
  return children;
}

function measureAgentMap2SubtreeWidth(nodeId, childrenById, memo = new Map()) {
  if (memo.has(nodeId)) return memo.get(nodeId);
  const children = childrenById.get(nodeId) || [];
  if (!children.length) {
    memo.set(nodeId, AGENT_MAP2_NODE_WIDTH);
    return AGENT_MAP2_NODE_WIDTH;
  }
  const width = children.reduce(
    (sum, childId, index) =>
      sum + measureAgentMap2SubtreeWidth(childId, childrenById, memo) + (index > 0 ? AGENT_MAP2_SIBLING_GAP : 0),
    0
  );
  memo.set(nodeId, width);
  return width;
}

function layoutAgentMap2Nodes(nodes, hardEdges) {
  const nodeById = new Map(nodes.map((node) => [node.id, { ...node }]));
  const childrenById = buildAgentMap2ChildMap(hardEdges);
  const rootId = "map2-root";
  let maxDepth = 0;

  function placeNode(nodeId, left, depth) {
    const node = nodeById.get(nodeId);
    if (!node) return;
    const subtreeWidth = measureAgentMap2SubtreeWidth(nodeId, childrenById);
    node.x = left + subtreeWidth / 2;
    node.y = AGENT_MAP2_CANVAS_PADDING + depth * AGENT_MAP2_LEVEL_GAP;
    maxDepth = Math.max(maxDepth, depth);

    const children = childrenById.get(nodeId) || [];
    let cursor = left;
    for (const childId of children) {
      const childWidth = measureAgentMap2SubtreeWidth(childId, childrenById);
      placeNode(childId, cursor, depth + 1);
      cursor += childWidth + AGENT_MAP2_SIBLING_GAP;
    }
  }

  const totalWidth = measureAgentMap2SubtreeWidth(rootId, childrenById);
  placeNode(rootId, AGENT_MAP2_CANVAS_PADDING, 0);

  const canvasWidth = Math.max(totalWidth + AGENT_MAP2_CANVAS_PADDING * 2, 640);
  const canvasHeight = Math.max(
    AGENT_MAP2_CANVAS_PADDING * 2 + maxDepth * AGENT_MAP2_LEVEL_GAP + AGENT_MAP2_NODE_HEIGHT + 24,
    420
  );

  return {
    nodes: Array.from(nodeById.values()),
    canvasWidth,
    canvasHeight
  };
}

function createAgentMap2NodeButton(node) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.dataset.nodeId = node.id;
  btn.className = `agent-map2-node agent-map2-node--${node.kind || node.type}`;
  btn.style.left = `${node.x - AGENT_MAP2_NODE_WIDTH / 2}px`;
  btn.style.top = `${node.y - AGENT_MAP2_NODE_HEIGHT / 2}px`;

  if (node.hasPreview && node.previewUrl) {
    const preview = document.createElement("img");
    preview.className = "agent-map2-node-preview";
    preview.alt = "";
    preview.src = appendCacheBuster(appendAgentToApiUrl(node.previewUrl));
    btn.appendChild(preview);
  }

  const kind = document.createElement("span");
  kind.className = "agent-map2-node-kind";
  kind.textContent =
    node.kind === "root"
      ? "Агент"
      : node.kind === "folder"
        ? "Папка"
        : node.kind === "group"
          ? "Группа"
          : "Тема";

  const label = document.createElement("span");
  label.className = "agent-map2-node-label";
  label.textContent = node.label;

  const sub = document.createElement("span");
  sub.className = "agent-map2-node-sub";
  sub.textContent = node.sub || "";

  btn.append(kind, label, sub);

  if (node.path) {
    btn.addEventListener("click", () => {
      void openNodeFromMenu(getLabelFromPath(node.path), node.path);
    });
  } else {
    btn.disabled = true;
  }

  return btn;
}

function renderAgentMap2Links(layoutNodes, hardEdges, softEdges) {
  if (!agentMap2CanvasNode || !agentMap2LinksNode) return;

  const canvasRect = agentMap2CanvasNode.getBoundingClientRect();
  if (canvasRect.width < 1 || canvasRect.height < 1) return;

  agentMap2LinksNode.setAttribute("width", String(canvasRect.width));
  agentMap2LinksNode.setAttribute("height", String(canvasRect.height));
  agentMap2LinksNode.setAttribute("viewBox", `0 0 ${canvasRect.width} ${canvasRect.height}`);
  agentMap2LinksNode.innerHTML = "";

  const nodeElements = new Map(
    Array.from(agentMap2NodesNode?.querySelectorAll(".agent-map2-node") || []).map((el) => [
      el.dataset.nodeId,
      el
    ])
  );

  const getAnchor = (nodeId, side) => {
    const el = nodeElements.get(nodeId);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const x = rect.left + rect.width / 2 - canvasRect.left;
    const y = side === "bottom" ? rect.bottom - canvasRect.top : rect.top - canvasRect.top;
    return { x, y };
  };

  const drawHardLink = (edge) => {
    const from = getAnchor(edge.from, "bottom");
    const to = getAnchor(edge.to, "top");
    if (!from || !to) return;
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const midY = (from.y + to.y) / 2;
    path.setAttribute(
      "d",
      `M ${from.x} ${from.y} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${to.y}`
    );
    path.setAttribute("class", "agent-map2-link--hard");
    agentMap2LinksNode.appendChild(path);
  };

  const drawSoftLink = (edge) => {
    const from = getAnchor(edge.from, "bottom");
    const to = getAnchor(edge.to, "top");
    if (!from || !to) return;
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const lift = Math.min(from.y, to.y) - 36;
    path.setAttribute(
      "d",
      `M ${from.x} ${from.y} C ${from.x} ${lift}, ${to.x} ${lift}, ${to.x} ${to.y}`
    );
    path.setAttribute("class", "agent-map2-link--soft");
    agentMap2LinksNode.appendChild(path);
  };

  for (const edge of hardEdges) drawHardLink(edge);
  for (const edge of softEdges) drawSoftLink(edge);
}

function renderAgentMap2Stats(data) {
  if (!agentMap2StatsNode) return;
  agentMap2StatsNode.innerHTML = "";

  const hardStat = document.createElement("span");
  hardStat.className = "agent-map2-stat";
  hardStat.textContent = `Жёстких: ${data.hardEdges.length}`;

  const softStat = document.createElement("span");
  softStat.className = "agent-map2-stat agent-map2-stat--soft";
  softStat.textContent = `Мягких: ${data.softEdges.length}`;

  const nodeStat = document.createElement("span");
  nodeStat.className = "agent-map2-stat";
  nodeStat.textContent = `Тем: ${data.nodes.length}`;

  agentMap2StatsNode.append(hardStat, softStat, nodeStat);

  if (data.truncated) {
    const truncated = document.createElement("span");
    truncated.className = "agent-map2-stat";
    truncated.textContent = `Показаны первые ${AGENT_MAP2_MAX_NODES}`;
    agentMap2StatsNode.appendChild(truncated);
  }
}

function bindAgentMap2LinksObserver(onRefresh) {
  if (!agentMap2ViewportNode || typeof ResizeObserver === "undefined") return;
  if (agentMap2LinksResizeObserver) {
    agentMap2LinksResizeObserver.disconnect();
  }
  agentMap2LinksResizeObserver = new ResizeObserver(() => {
    if (agentWorkspaceView !== "map2" || !isAgentWorkspaceCanvasVisible()) return;
    onRefresh();
  });
  agentMap2LinksResizeObserver.observe(agentMap2ViewportNode);
  agentMap2LinksResizeObserver.observe(agentMap2CanvasNode);
}

function renderAgentMap2View() {
  if (!agentMap2CanvasNode || !agentMap2NodesNode) return;

  if (!currentMenuData) {
    agentMap2CanvasNode.style.width = "";
    agentMap2CanvasNode.style.height = "";
    agentMap2NodesNode.innerHTML = `<div class="agent-map2-empty">Дерево агента ещё не загружено</div>`;
    if (agentMap2LinksNode) agentMap2LinksNode.innerHTML = "";
    if (agentMap2StatsNode) agentMap2StatsNode.innerHTML = "";
    return;
  }

  const mapData = buildAgentMap2Data(currentMenuData);
  if (mapData.nodes.length <= 1) {
    agentMap2CanvasNode.style.width = "";
    agentMap2CanvasNode.style.height = "";
    agentMap2NodesNode.innerHTML = `<div class="agent-map2-empty">В workspace пока нет тем для схемы</div>`;
    if (agentMap2LinksNode) agentMap2LinksNode.innerHTML = "";
    renderAgentMap2Stats(mapData);
    return;
  }

  const layout = layoutAgentMap2Nodes(mapData.nodes, mapData.hardEdges);
  agentMap2CanvasNode.style.width = `${layout.canvasWidth}px`;
  agentMap2CanvasNode.style.height = `${layout.canvasHeight}px`;
  agentMap2NodesNode.innerHTML = "";

  for (const node of layout.nodes) {
    agentMap2NodesNode.appendChild(createAgentMap2NodeButton(node));
  }

  renderAgentMap2Stats(mapData);

  const refreshLinks = () => {
    renderAgentMap2Links(layout.nodes, mapData.hardEdges, mapData.softEdges);
  };

  bindAgentMap2LinksObserver(refreshLinks);
  requestAnimationFrame(() => {
    refreshLinks();
    requestAnimationFrame(refreshLinks);
  });
}

function renderAgentDashboardView() {
  if (!agentDashboardStatsNode) return;
  const agent = agentsCache.find((item) => item.id === activeAgentId);
  const counts = countAgentMenuNodes(currentMenuData);
  agentDashboardStatsNode.innerHTML = "";

  const stats = [
    { value: String(counts.total), label: "Тем в workspace" },
    { value: String(counts.folders), label: "Контейнеров" },
    { value: String(counts.leaves), label: "Листовых тем" }
  ];

  for (const stat of stats) {
    const card = document.createElement("article");
    card.className = "agent-dashboard-stat";
    card.innerHTML = `
      <span class="agent-dashboard-stat-value">${escapeHtml(stat.value)}</span>
      <span class="agent-dashboard-stat-label">${escapeHtml(stat.label)}</span>
    `;
    agentDashboardStatsNode.appendChild(card);
  }

  if (homeHintNode && !homeHintNode.classList.contains("is-alert")) {
    const agentLabel = agent?.name || getActiveAgentLabel() || "агента";
    homeHintNode.textContent = `Агент «${agentLabel}» — выберите тему в дереве или откройте Схему / Каталог / Граф`;
  }
}

function appendAgentSchemaNode(container, entry, depth) {
  const row = document.createElement("button");
  row.type = "button";
  row.className = `agent-schema-node${entry.isFolder ? " is-folder" : ""}`;
  row.style.paddingLeft = `${10 + depth * 16}px`;

  const icon = document.createElement("span");
  icon.className = "agent-schema-node-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = entry.isFolder ? "📁" : "📄";

  const label = document.createElement("span");
  label.className = "agent-schema-node-label";
  label.textContent = entry.label || getLabelFromPath(entry.path);

  const path = document.createElement("span");
  path.className = "agent-schema-node-path";
  path.textContent = entry.displayPath || getNodeDisplayPath(entry.path);

  row.append(icon, label, path);
  row.addEventListener("click", () => {
    if (entry.path) openNodeFromMenu(getLabelFromPath(entry.path), entry.path);
  });
  container.appendChild(row);
}

function walkAgentSchemaMenu(node, container, depth = 0) {
  if (node.indexPath) {
    appendAgentSchemaNode(
      container,
      {
        path: node.indexPath,
        label: getLabelFromPath(node.indexPath),
        displayPath: getNodeDisplayPath(node.indexPath),
        isFolder: true
      },
      depth
    );
  }

  for (const child of getOrderedMenuChildren(node)) {
    if (child.kind === "folder") {
      walkAgentSchemaMenu(child.entry, container, depth + 1);
    } else {
      appendAgentSchemaNode(
        container,
        {
          path: child.entry.path,
          label: child.entry.label || getLabelFromPath(child.entry.path),
          displayPath: getNodeDisplayPath(child.entry.path),
          isFolder: isNodeManifestPath(child.entry.path) && !isPartNodePath(child.entry.path)
        },
        depth + 1
      );
    }
  }
}

function renderAgentSchemaView() {
  if (!agentSchemaContentNode) return;
  agentSchemaContentNode.innerHTML = "";

  if (!currentMenuData) {
    renderListEmptyMessage(agentSchemaContentNode, "Дерево агента ещё не загружено");
    return;
  }

  const entries = collectFlatMenuEntries({ title: getAgentTreeTitle(), ...currentMenuData });
  if (!entries.length) {
    renderListEmptyMessage(agentSchemaContentNode, "В workspace пока нет тем");
    return;
  }

  const tree = document.createElement("div");
  tree.className = "agent-schema-tree";
  walkAgentSchemaMenu({ title: getAgentTreeTitle(), ...currentMenuData }, tree, 0);
  agentSchemaContentNode.appendChild(tree);
}

const AGENT_HOME_HINT_DEFAULT = "Выберите тему в дереве или откройте Схему / Каталог / Граф";

function inferVaultCategoryFromEntry(entry) {
  if (entry?.category) return String(entry.category).trim();
  const parts = stripVaultPrefixFromRelPath(entry?.displayPath || entry?.path || "")
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean);
  if (parts.length <= 1) return "Корень";
  return parts[0];
}

function sortVaultEntries(entries) {
  return entries.sort((a, b) => {
    if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
    return compareMenuPathsNatural(a.displayPath, b.displayPath);
  });
}

function filterVaultEntries(entries) {
  const query = agentVaultSearchQuery.trim().toLowerCase();
  if (!query) return entries;
  return entries.filter((entry) => entryMatchesMenuQuery(entry, query));
}

function createAgentVaultCard(entry) {
  const card = createMenuCard(entry, { gallery: true });
  card.classList.add("agent-vault-card");

  const kind = document.createElement("span");
  kind.className = `agent-vault-kind ${entry.isFolder ? "is-folder" : "is-file"}`;
  kind.textContent = entry.isFolder ? "Папка" : "Тема";
  card.prepend(kind);

  const foot = card.querySelector(".menu-card-foot");
  if (foot) {
    const meta = document.createElement("div");
    meta.className = "agent-vault-card-meta";
    meta.textContent = entry.displayPath || entry.path;
    foot.appendChild(meta);

    const category = inferVaultCategoryFromEntry(entry);
    if (category) {
      const categoryNode = document.createElement("span");
      categoryNode.className = "agent-vault-card-category";
      categoryNode.textContent = category;
      foot.appendChild(categoryNode);
    }

    if (Array.isArray(entry.tags) && entry.tags.length) {
      const tagsNode = document.createElement("div");
      tagsNode.className = "agent-vault-card-tags";
      for (const tag of entry.tags.slice(0, 5)) {
        const chip = document.createElement("span");
        chip.className = "agent-vault-card-tag";
        chip.textContent = tag;
        tagsNode.appendChild(chip);
      }
      foot.appendChild(tagsNode);
    }
  }

  return card;
}

function renderAgentVaultView() {
  if (!agentVaultGridNode) return;

  if (agentVaultSearchNode && agentVaultSearchNode.value !== agentVaultSearchQuery) {
    agentVaultSearchNode.value = agentVaultSearchQuery;
  }

  agentVaultGridNode.innerHTML = "";

  if (!currentMenuData) {
    agentVaultEmptyNode?.classList.remove("hidden");
    if (agentVaultEmptyNode) agentVaultEmptyNode.textContent = "Дерево агента ещё не загружено";
    agentVaultStatsNode && (agentVaultStatsNode.innerHTML = "");
    return;
  }

  const allEntries = sortVaultEntries(
    collectFlatMenuEntries({ title: getAgentTreeTitle(), ...currentMenuData })
  );
  const filtered = filterVaultEntries(allEntries);

  if (agentVaultStatsNode) {
    const folders = filtered.filter((entry) => entry.isFolder).length;
    const files = filtered.length - folders;
    agentVaultStatsNode.innerHTML = `
      <span class="agent-vault-stat"><strong>${filtered.length}</strong> / ${allEntries.length}</span>
      <span class="agent-vault-stat"><strong>${folders}</strong> папок</span>
      <span class="agent-vault-stat"><strong>${files}</strong> тем</span>
    `;
  }

  if (!filtered.length) {
    agentVaultEmptyNode?.classList.remove("hidden");
    if (agentVaultEmptyNode) {
      agentVaultEmptyNode.textContent = allEntries.length
        ? "Ничего не найдено. Измените поиск."
        : "В workspace пока нет тем";
    }
    return;
  }

  agentVaultEmptyNode?.classList.add("hidden");
  for (const entry of filtered) {
    agentVaultGridNode.appendChild(createAgentVaultCard(entry));
  }
}

function buildGraphDataFromAgentMenu(menu) {
  const baseTree = { title: getAgentTreeTitle(), ...menu };
  const previewByDisplayPath = new Map();
  for (const entry of collectFlatMenuEntries(baseTree)) {
    if (!entry.hasPreview || !entry.previewUrl) continue;
    const displayPath = entry.displayPath || getNodeDisplayPath(entry.path);
    previewByDisplayPath.set(displayPath, entry.previewUrl);
  }

  const rootId = "agent-root";
  const nodes = [
    {
      id: rootId,
      label: getAgentTreeTitle(),
      type: "folder",
      depth: 0,
      nodePath: baseTree.indexPath || null,
      previewUrl: baseTree.hasPreview ? baseTree.previewUrl || null : null
    }
  ];
  const edges = [];
  const folderIds = new Map([["", rootId]]);

  for (const entry of collectFlatMenuEntries(baseTree)) {
    const displayPath = entry.displayPath || entry.label || getLabelFromPath(entry.path);
    const parts = String(displayPath).split("/").filter(Boolean);
    let parentId = rootId;
    let built = "";

    for (let i = 0; i < parts.length - 1; i += 1) {
      built = built ? `${built}/${parts[i]}` : parts[i];
      if (!folderIds.has(built)) {
        const folderId = `folder:${built}`;
        nodes.push({
          id: folderId,
          label: parts[i],
          type: "folder",
          depth: i + 1,
          nodePath: null,
          previewUrl: previewByDisplayPath.get(built) || null
        });
        edges.push({ from: parentId, to: folderId });
        folderIds.set(built, folderId);
      }
      parentId = folderIds.get(built);
    }

    const nodeId = `node:${normalizeMenuNodePath(entry.path)}`;
    nodes.push({
      id: nodeId,
      label: parts[parts.length - 1] || entry.label,
      type: entry.isFolder ? "folder" : "file",
      depth: Math.max(parts.length, 1),
      nodePath: entry.path,
      previewUrl: entry.previewUrl || null
    });
    edges.push({ from: parentId, to: nodeId });
  }

  return { nodes, edges };
}

function renderAgentGraphView() {
  if (!agentGraphContentNode) return;
  agentGraphContentNode.innerHTML = "";
  applyAgentGraphSettingsUi();

  if (!currentMenuData) {
    renderListEmptyMessage(agentGraphContentNode, "Дерево агента ещё не загружено");
    return;
  }

  const graph = buildGraphDataFromAgentMenu(currentMenuData);
  if (graph.nodes.length <= 1) {
    renderListEmptyMessage(agentGraphContentNode, "В workspace пока нет тем для графа");
    return;
  }

  const showPreviews = getAgentGraphSettings().showPreviews;
  const render = () => {
    renderGraphCanvas(agentGraphContentNode, graph, {
      ariaLabel: "Граф workspace агента",
      fullViewport: true,
      showPreviews,
      isNodeClickable: (node) => Boolean(node.nodePath),
      onNodeClick: (node) => {
        if (!node.nodePath) return;
        openNodeFromMenu(getLabelFromPath(node.nodePath), node.nodePath);
      }
    });
  };
  requestAnimationFrame(render);
}

function syncAppHomeButton() {
  appHomeLink?.classList.toggle("active", appRootNode.classList.contains("home-view"));
}

function showHomeView(hint = AGENT_HOME_HINT_DEFAULT) {
  nodeSettingsViewActive = false;
  nodeMemoryViewActive = false;
  applyNodeWorkspaceViewUi();
  activePath = null;
  activeLabel = null;
  activeSystemFile = null;
  activeExternalFilePath = null;
  clearMediaSidecarEditor();
  appRootNode.classList.add("home-view");
  appRootNode.classList.remove("system-file-view");
  clearSystemFileViewUi();
  if (homeHintNode) {
    homeHintNode.textContent = hint;
    homeHintNode.classList.toggle("is-alert", hint !== AGENT_HOME_HINT_DEFAULT);
  }
  titleInputNode.value = "";
  fileContentInputNode.value = "";
  setPropsYamlContent("");
  fileContentInputNode.readOnly = false;
  updateActiveButton();
  syncAppHomeButton();
  updateBreadcrumbsForActiveMode();
  applyAgentWorkspaceCanvasUi();
}

function hideHomeView() {
  appRootNode.classList.remove("home-view");
  homePaneNode?.classList.add("hidden");
  agentMapPaneNode?.classList.add("hidden");
  agentMap2PaneNode?.classList.add("hidden");
  agentSchemaPaneNode?.classList.add("hidden");
  agentVaultPaneNode?.classList.add("hidden");
  agentGraphPaneNode?.classList.add("hidden");
  syncAppHomeButton();
}

function clearEditorState(message = "") {
  showHomeView(message || AGENT_HOME_HINT_DEFAULT);
  modeContentCache.description = "";
  modeContentCache.internal = "";
  modeContentCache.external = "";
  modeContentCache.inbox = "";
  modeContentCache.references = "";
  modeContentCache.media = "";
  modeContentCache.configs = "";
  modeContentCache.env = "";
  modeContentCache.scripts = "";
  modeContentCache.todo = "";
  setPropsYamlContent("");
  fileContentInputNode.readOnly = false;
  fileContentPreviewNode.innerHTML = "";
}

function getParentManifestPath(manifestPath) {
  const resolved = normalizeMenuNodePath(getResolvedNodePath(manifestPath));
  const folder = getFolderPathFromManifest(resolved);
  if (!folder) return null;
  const parts = folder.split("/").filter(Boolean);
  parts.pop();
  if (parts.length === 0) return AREA_MANIFEST_FILE;
  return `${parts.join("/")}/${AREA_MANIFEST_FILE}`;
}

function findPreferredNodeAfterDelete(menu, deletedPath, menuBeforeDelete = currentMenuData) {
  const deleted = normalizeMenuNodePath(getResolvedNodePath(deletedPath));
  const previousBase = menuBeforeDelete
    ? { title: getAgentTreeTitle(), ...menuBeforeDelete }
    : { title: getAgentTreeTitle(), ...menu };
  const prevEntries = collectFlatMenuEntries(previousBase);
  const newEntries = collectFlatMenuEntries({ title: getAgentTreeTitle(), ...menu });
  const newPathSet = new Set(newEntries.map((entry) => normalizeMenuNodePath(entry.path)));

  const idx = prevEntries.findIndex((entry) => normalizeMenuNodePath(entry.path) === deleted);
  const candidates = [];

  if (idx >= 0 && idx + 1 < prevEntries.length) candidates.push(prevEntries[idx + 1]);
  if (idx > 0) candidates.push(prevEntries[idx - 1]);

  const parentManifest = getParentManifestPath(deleted);
  if (parentManifest) {
    const parentEntry = prevEntries.find(
      (entry) => normalizeMenuNodePath(entry.path) === normalizeMenuNodePath(parentManifest)
    );
    if (parentEntry) candidates.push(parentEntry);
  }

  const first = findFirstNode(menu);
  if (first) candidates.push(first);

  for (const candidate of candidates) {
    const path = normalizeMenuNodePath(candidate.path);
    if (path && path !== deleted && newPathSet.has(path)) {
      return candidate;
    }
  }
  return null;
}

function findFirstNode(menu) {
  const stack = [{
    sections: menu.sections || [],
    items: menu.items || [],
    indexPath: menu.indexPath || null,
    title: getAgentTreeTitle()
  }];
  let first = stack[0].indexPath
    ? { label: stack[0].title, path: stack[0].indexPath }
    : stack[0].items[0] || null;
  while (!first && stack.length > 0) {
    const current = stack.shift();
    for (const section of current.sections || []) {
      if (section.indexPath) {
        first = { label: section.title, path: section.indexPath };
        break;
      }
      if (section.items && section.items.length > 0) {
        first = section.items[0];
        break;
      }
      stack.push(section);
    }
  }
  return first;
}

async function refreshMenu(options = {}) {
  const agentId = options.agentId || activeAgentId;
  const response = await fetch(buildApiUrl("/api/menu", {}, agentId));
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.details || errorData.error || `Request failed with ${response.status}`);
  }
  const menu = await response.json();
  renderMenu(menu, agentId);
  if (agentId === activeAgentId) {
    updateActiveButton();
    if (isAgentWorkspaceCanvasVisible()) {
      applyAgentWorkspaceCanvasUi();
    }
  }
  return menu;
}

let menuRefreshInFlight = false;

async function refreshMenuTree() {
  if (menuRefreshInFlight) return;
  menuRefreshInFlight = true;
  menuRefreshBtn?.classList.add("is-spinning");
  menuRefreshBtn?.setAttribute("disabled", "disabled");
  try {
    await refreshMenu({ agentId: activeAgentId });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showToast(`Ошибка обновления дерева: ${message}`, "error");
  } finally {
    menuRefreshInFlight = false;
    menuRefreshBtn?.classList.remove("is-spinning");
    if (!menuLoadingNode || menuLoadingNode.classList.contains("hidden")) {
      menuRefreshBtn?.removeAttribute("disabled");
    }
  }
}

async function refreshMenuAndSelect() {
  const menu = await refreshMenu();
  const first = findFirstNode(menu);
  if (first) {
    await openNodeFromMenu(first.label, first.path);
  } else {
    clearEditorState(`В ${getAgentTreeTitle()} нет файлов с суффиксом .x.md`);
  }
}

async function createNode(type, options = {}) {
  const agentId = getCreateModalAgentId();
  if (!agentId || agentId !== activeAgentId) {
    showToast("Агент изменился — откройте «Создать» снова", "error");
    closeCreateNodeModal();
    return;
  }

  const name = createNameInputNode.value.trim();
  const folderLabel = formatCreateParentLabel(createModalBaseParentPath);
  if (!name && type !== "manifest" && type !== "catalog") {
    showToast("Введите название папки", "error");
    return;
  }

  try {
    const payload = {
      parentPath: type === "manifest" ? createModalBaseParentPath : createTargetParentPath,
      type,
      name: name || folderLabel
    };
    if (type === "catalog") {
      payload.preset = options.preset || name;
      payload.parentPath = getActiveAgentServiceFolder(agentId) || createTargetParentPath;
    }

    const response = await fetch(buildApiUrl("/api/node/create", {}, agentId), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const reason = errorData.error || `Request failed with ${response.status}`;
      const details = errorData.details ? `: ${errorData.details}` : "";
      throw new Error(`${reason}${details}`);
    }

    const data = await response.json();
    closeCreateNodeModal();
    invalidateMenuAgentCache(agentId);
    await refreshMenu({ agentId });
    const createdLabel =
      type === "catalog"
        ? `Справочник «${SERVICE_CATALOG_PRESET_LABELS[data.preset] || data.preset || "catalog"}» создан`
        : type === "manifest"
          ? "Область создана (_.x.md)"
          : type === "folder"
            ? "Папка-область создана"
            : "Файл (тема) создан";
    if (data.createdPath) {
      try {
        await openNodeFromMenu(getLabelFromPath(data.createdPath), data.createdPath);
      } catch (selectError) {
        const selectMessage = selectError instanceof Error ? selectError.message : String(selectError);
        showToast(`${createdLabel} (не удалось открыть: ${selectMessage})`, "success");
        return;
      }
    }
    showToast(createdLabel, "success");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/Failed to fetch|NetworkError|Load failed/i.test(message)) {
      showToast("Ошибка соединения — проверьте, что сервер запущен (npm start)", "error");
      return;
    }
    const toastMessage = formatCreateNodeErrorMessage(message);
    showToast(toastMessage, "error");
  }
}

function formatCreateNodeErrorMessage(message) {
  const text = String(message || "");
  if (/Parent folder not found/i.test(text)) {
    return "Родительская папка не найдена";
  }
  if (/No permission to write|EPERM|EACCES/i.test(text)) {
    return "Нет прав на запись в workspace агента";
  }
  if (/Node manifest already exists/i.test(text)) {
    return "В этой папке уже есть _.x.md";
  }
  if (/Failed to create node/i.test(text) && /ENOENT/i.test(text)) {
    return "Папка _System ещё не создана — обновите меню (F5) и повторите";
  }
  if (/Catalog node already exists/i.test(text)) {
    return "Такой справочник уже существует";
  }
  if (/Folder already exists|Part already exists|Topic already exists|already exists/i.test(text)) {
    return "Область или тема с таким именем уже существует";
  }
  if (/Invalid folder name|Invalid part name|Invalid topic name/i.test(text)) {
    return "Недопустимое имя";
  }
  return text ? `Ошибка создания: ${text}` : "Ошибка создания папки";
}

async function deleteNode() {
  if (!isNodeDeleteAvailable()) return;
  const targetPath = getActiveNodeApiPath();
  if (!targetPath) return;

  const menuBeforeDelete = currentMenuData;
  const isContainerNode = isNodeManifestPath(targetPath) && !isPartNodePath(targetPath);
  const targetLabel = getLabelFromPath(targetPath);
  const question = isContainerNode
    ? `Удалить папку "${targetLabel}" целиком?`
    : isPartNodePath(targetPath)
      ? `Удалить тему «${targetLabel}» целиком?`
      : `Удалить файл «${targetLabel}»?`;

  const confirmed = await askConfirm(question);
  if (!confirmed) return;

  try {
    const response = await fetch(buildApiUrl("/api/file", { path: targetPath }), { method: "DELETE" });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const reason = errorData.error || `Request failed with ${response.status}`;
      const details = errorData.details ? `: ${errorData.details}` : "";
      throw new Error(`${reason}${details}`);
    }

    invalidateMenuAgentCache(activeAgentId);
    const menu = await refreshMenu();
    const next = findPreferredNodeAfterDelete(menu, targetPath, menuBeforeDelete);
    if (next) {
      await openNodeFromMenu(next.label, next.path);
    } else {
      clearEditorState(`В ${getAgentTreeTitle()} нет файлов с суффиксом .x.md`);
    }
    showToast("Удалено", "success");
  } catch (error) {
    showToast(`Ошибка удаления: ${error.message}`, "error");
  }
}

async function init() {
  const splashStartedAt = Date.now();
  try {
    if (location.hash === "#graph") {
      history.replaceState(null, "", `${location.pathname}${location.search}`);
    }
    await loadAgents();
    migrateAllAgentCollapsedFolderKeys();
    applyMenuTreeSettingsUi();
    applyAgentGraphSettingsUi();
    await loadSystemFiles();
    await refreshMenu();
    showHomeView();
  } catch (error) {
    showHomeView(`Ошибка загрузки: ${error.message}`);
  } finally {
    const elapsed = Date.now() - splashStartedAt;
    const wait = Math.max(0, APP_SPLASH_MIN_MS - elapsed);
    window.setTimeout(hideAppSplash, wait);
  }
}

function hideAppSplash() {
  if (!appSplashNode) return;
  document.body.classList.remove("app-booting");
  appSplashNode.classList.add("app-splash--hide");
  window.setTimeout(() => {
    appSplashNode.remove();
  }, APP_SPLASH_HIDE_MS);
}

agentSelectNode?.addEventListener("change", () => {
  const nextAgentId = agentSelectNode.value;
  if (!nextAgentId || nextAgentId === activeAgentId) return;
  switchActiveAgent(nextAgentId).catch((error) => {
    showHomeView(`Ошибка переключения агента: ${error.message}`);
    renderAgentSelect();
  });
});

agentsManageBtn?.addEventListener("click", openAgentsRegistryModal);

function createApiDocsEndpointNode(endpoint) {
  const node = document.createElement("article");
  node.className = "api-docs-endpoint";

  const headNode = document.createElement("div");
  headNode.className = "api-docs-endpoint-head";

  const method = String(endpoint.method || "GET").toUpperCase();
  const methodNode = document.createElement("span");
  methodNode.className = `api-docs-method api-docs-method-${method.toLowerCase()}`;
  methodNode.textContent = method;

  const pathNode = document.createElement("code");
  pathNode.className = "api-docs-path";
  pathNode.textContent = endpoint.path || "";

  headNode.append(methodNode, pathNode);

  const descNode = document.createElement("p");
  descNode.className = "api-docs-desc";
  descNode.textContent = endpoint.description || "";

  const metaNode = document.createElement("div");
  metaNode.className = "api-docs-meta";

  if (endpoint.agentScope !== false) {
    const row = document.createElement("div");
    row.innerHTML = "<strong>Agent:</strong> ";
    const code = document.createElement("code");
    code.textContent = "?agent=<id>";
    row.appendChild(code);
    metaNode.appendChild(row);
  }

  const queryRow = document.createElement("div");
  queryRow.innerHTML = "<strong>Query:</strong> ";
  const queryCode = document.createElement("code");
  queryCode.textContent = endpoint.query?.length ? endpoint.query.join(", ") : "—";
  queryRow.appendChild(queryCode);
  metaNode.appendChild(queryRow);

  if (endpoint.body) {
    const bodyRow = document.createElement("div");
    bodyRow.innerHTML = "<strong>Body:</strong> ";
    const bodyCode = document.createElement("code");
    bodyCode.textContent = endpoint.body;
    bodyRow.appendChild(bodyCode);
    metaNode.appendChild(bodyRow);
  }

  if (endpoint.response) {
    const responseRow = document.createElement("div");
    responseRow.innerHTML = "<strong>Response:</strong> ";
    const responseCode = document.createElement("code");
    responseCode.textContent = endpoint.response;
    responseRow.appendChild(responseCode);
    metaNode.appendChild(responseRow);
  }

  node.append(headNode, descNode, metaNode);
  return node;
}

function renderApiDocsModal(data) {
  if (apiDocsTitleNode) apiDocsTitleNode.textContent = data.title || "HTTP API";
  if (apiDocsSubtitleNode) {
    apiDocsSubtitleNode.textContent = `${data.baseUrl || "/api"} · ${(data.groups || []).length} разделов`;
  }
  if (apiDocsNotesNode) {
    apiDocsNotesNode.innerHTML = (data.notes || []).map((note) => `<p>${escapeHtml(note)}</p>`).join("");
  }
  if (!apiDocsContentNode) return;
  apiDocsContentNode.innerHTML = "";
  for (const group of data.groups || []) {
    const groupNode = document.createElement("section");
    groupNode.className = "api-docs-group";
    const titleNode = document.createElement("h3");
    titleNode.className = "api-docs-group-title";
    titleNode.textContent = group.title;
    groupNode.appendChild(titleNode);
    for (const endpoint of group.endpoints || []) {
      groupNode.appendChild(createApiDocsEndpointNode(endpoint));
    }
    apiDocsContentNode.appendChild(groupNode);
  }
}

async function openApiDocsModal() {
  if (!apiDocsModalNode) return;
  try {
    if (!apiDocsCache) {
      const response = await fetch("/api/docs");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      apiDocsCache = await response.json();
    }
    renderApiDocsModal(apiDocsCache);
    apiDocsModalNode.classList.remove("hidden");
  } catch (error) {
    showToast(`Не удалось загрузить API docs: ${error.message}`, "error");
  }
}

function closeApiDocsModal() {
  apiDocsModalNode?.classList.add("hidden");
}

function createMcpDocsToolNode(tool) {
  const node = document.createElement("article");
  node.className = "api-docs-endpoint mcp-docs-tool";

  const headNode = document.createElement("div");
  headNode.className = "api-docs-endpoint-head";

  const badgeNode = document.createElement("span");
  badgeNode.className = "api-docs-method api-docs-method-mcp";
  badgeNode.textContent = "TOOL";

  const nameNode = document.createElement("code");
  nameNode.className = "api-docs-path";
  nameNode.textContent = tool.name || "";

  headNode.append(badgeNode, nameNode);

  const descNode = document.createElement("p");
  descNode.className = "api-docs-desc";
  descNode.textContent = tool.description || "";

  const metaNode = document.createElement("div");
  metaNode.className = "api-docs-meta";

  const paramsRow = document.createElement("div");
  paramsRow.innerHTML = "<strong>Parameters:</strong> ";
  const paramsCode = document.createElement("code");
  paramsCode.textContent = tool.parameters || "—";
  paramsRow.appendChild(paramsCode);
  metaNode.appendChild(paramsRow);

  if (tool.http) {
    const httpRow = document.createElement("div");
    httpRow.innerHTML = "<strong>HTTP:</strong> ";
    const httpCode = document.createElement("code");
    httpCode.textContent = tool.http;
    httpRow.appendChild(httpCode);
    metaNode.appendChild(httpRow);
  }

  node.append(headNode, descNode, metaNode);
  return node;
}

function renderMcpDocsModal(data) {
  if (mcpDocsTitleNode) mcpDocsTitleNode.textContent = data.title || "MCP Server";
  if (mcpDocsSubtitleNode) {
    const parts = [data.subtitle, data.packagePath].filter(Boolean);
    mcpDocsSubtitleNode.textContent = parts.join(" · ");
  }
  if (mcpDocsNotesNode) {
    mcpDocsNotesNode.innerHTML = (data.notes || []).map((note) => `<p>${escapeHtml(note)}</p>`).join("");
  }
  if (mcpDocsConfigNode && data.cursorConfig) {
    const example = {
      mcpServers: {
        "agent-cms": data.cursorConfig
      }
    };
    mcpDocsConfigNode.textContent = JSON.stringify(example, null, 2);
    mcpDocsConfigNode.classList.remove("hidden");
  }
  if (!mcpDocsContentNode) return;
  mcpDocsContentNode.innerHTML = "";
  for (const group of data.groups || []) {
    const groupNode = document.createElement("section");
    groupNode.className = "api-docs-group";
    const titleNode = document.createElement("h3");
    titleNode.className = "api-docs-group-title";
    titleNode.textContent = group.title;
    groupNode.appendChild(titleNode);
    for (const tool of group.tools || []) {
      groupNode.appendChild(createMcpDocsToolNode(tool));
    }
    mcpDocsContentNode.appendChild(groupNode);
  }
}

async function openMcpDocsModal() {
  if (!mcpDocsModalNode) return;
  try {
    if (!mcpDocsCache) {
      const response = await fetch("/api/mcp-docs");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      mcpDocsCache = await response.json();
    }
    renderMcpDocsModal(mcpDocsCache);
    mcpDocsModalNode.classList.remove("hidden");
  } catch (error) {
    showToast(`Не удалось загрузить MCP docs: ${error.message}`, "error");
  }
}

function closeMcpDocsModal() {
  mcpDocsModalNode?.classList.add("hidden");
}

async function openMdShowcaseModal() {
  if (!mdShowcaseModalNode || !mdShowcaseContentNode) return;
  try {
    if (!mdShowcaseCache) {
      const response = await fetch("/_storage/markdown-showcase.md");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      mdShowcaseCache = await response.text();
    }
    setMarkdownPreviewHtml(mdShowcaseContentNode, mdShowcaseCache);
    mdShowcaseModalNode.classList.remove("hidden");
  } catch (error) {
    showToast(`Не удалось загрузить Markdown showcase: ${error.message}`, "error");
  }
}

function closeMdShowcaseModal() {
  mdShowcaseModalNode?.classList.add("hidden");
}

function appendComponentsIdeasGallery(container, images) {
  if (!container) return;
  container.querySelector(".components-ideas-gallery")?.remove();

  const gallery = document.createElement("div");
  gallery.className = "components-ideas-gallery";
  gallery.setAttribute("aria-label", "Изображения из public/_storage/images");

  if (!images.length) {
    const empty = document.createElement("p");
    empty.className = "components-ideas-gallery-empty";
    empty.textContent = "Папка /_storage/images пуста — положите сюда .png, .jpg, .webp …";
    gallery.appendChild(empty);
    container.appendChild(gallery);
    return;
  }

  for (const image of images) {
    const img = document.createElement("img");
    img.src = appendCacheBuster(image.url);
    img.alt = image.name || "";
    img.loading = "lazy";
    img.decoding = "async";
    gallery.appendChild(img);
  }

  container.appendChild(gallery);
}

async function openComponentsIdeasModal() {
  if (!componentsIdeasModalNode || !componentsIdeasContentNode) return;
  try {
    if (!componentsIdeasCache) {
      const response = await fetch("/_storage/components-ideas.md");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      componentsIdeasCache = await response.text();
    }
    setMarkdownPreviewHtml(componentsIdeasContentNode, componentsIdeasCache);

    const imagesResponse = await fetch("/api/public/images");
    if (!imagesResponse.ok) throw new Error(`HTTP ${imagesResponse.status}`);
    const imagesPayload = await imagesResponse.json();
    const images = Array.isArray(imagesPayload?.images) ? imagesPayload.images : [];
    appendComponentsIdeasGallery(componentsIdeasContentNode, images);

    componentsIdeasModalNode.classList.remove("hidden");
  } catch (error) {
    showToast(`Не удалось загрузить идеи: ${error.message}`, "error");
  }
}

function closeComponentsIdeasModal() {
  componentsIdeasModalNode?.classList.add("hidden");
}

async function openUserDocsModal() {
  if (!userDocsModalNode || !userDocsContentNode) return;
  try {
    if (!userDocsCache) {
      const response = await fetch("/_storage/user-docs.md");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      userDocsCache = await response.text();
    }
    setMarkdownPreviewHtml(userDocsContentNode, userDocsCache);
    userDocsModalNode.classList.remove("hidden");
  } catch (error) {
    showToast(`Не удалось загрузить документацию: ${error.message}`, "error");
  }
}

function closeUserDocsModal() {
  userDocsModalNode?.classList.add("hidden");
}

async function openBestPracticesModal() {
  if (!bestPracticesModalNode || !bestPracticesContentNode) return;
  try {
    if (!bestPracticesCache) {
      const response = await fetch("/_storage/agent-best-practices.md");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      bestPracticesCache = await response.text();
    }
    setMarkdownPreviewHtml(bestPracticesContentNode, bestPracticesCache);
    bestPracticesModalNode.classList.remove("hidden");
  } catch (error) {
    showToast(`Не удалось загрузить Best Practices: ${error.message}`, "error");
  }
}

function closeBestPracticesModal() {
  bestPracticesModalNode?.classList.add("hidden");
}

mdShowcaseBtn?.addEventListener("click", () => {
  void openMdShowcaseModal();
});
mdShowcaseCloseBtn?.addEventListener("click", closeMdShowcaseModal);
mdShowcaseModalNode?.addEventListener("click", (event) => {
  if (event.target === mdShowcaseModalNode) closeMdShowcaseModal();
});

componentsIdeasBtn?.addEventListener("click", () => {
  void openComponentsIdeasModal();
});
componentsIdeasCloseBtn?.addEventListener("click", closeComponentsIdeasModal);
componentsIdeasModalNode?.addEventListener("click", (event) => {
  if (event.target === componentsIdeasModalNode) closeComponentsIdeasModal();
});

userDocsBtn?.addEventListener("click", () => {
  void openUserDocsModal();
});
userDocsCloseBtn?.addEventListener("click", closeUserDocsModal);
userDocsModalNode?.addEventListener("click", (event) => {
  if (event.target === userDocsModalNode) closeUserDocsModal();
});

bestPracticesBtn?.addEventListener("click", () => {
  void openBestPracticesModal();
});
bestPracticesCloseBtn?.addEventListener("click", closeBestPracticesModal);
bestPracticesModalNode?.addEventListener("click", (event) => {
  if (event.target === bestPracticesModalNode) closeBestPracticesModal();
});

apiDocsBtn?.addEventListener("click", () => {
  void openApiDocsModal();
});
apiDocsCloseBtn?.addEventListener("click", closeApiDocsModal);
apiDocsModalNode?.addEventListener("click", (event) => {
  if (event.target === apiDocsModalNode) closeApiDocsModal();
});

mcpDocsBtn?.addEventListener("click", () => {
  void openMcpDocsModal();
});
mcpDocsCloseBtn?.addEventListener("click", closeMcpDocsModal);
mcpDocsModalNode?.addEventListener("click", (event) => {
  if (event.target === mcpDocsModalNode) closeMcpDocsModal();
});

agentsRegistryModalNode?.addEventListener("click", (event) => {
  const sortBtn = event.target.closest(".agents-registry-sort-btn");
  if (sortBtn?.dataset.sort) {
    sortAgentsRegistryDraft(sortBtn.dataset.sort);
    return;
  }
  if (event.target === agentsRegistryModalNode) closeAgentsRegistryModal();
});
agentsRegistryAddBtn?.addEventListener("click", addAgentsRegistryDraftRow);
agentsRegistryCreateBtn?.addEventListener("click", openAgentsRegistryCreateModal);
agentsRegistryCreateCancelBtn?.addEventListener("click", closeAgentsRegistryCreateModal);
agentsRegistryCreateSubmitBtn?.addEventListener("click", () => {
  void submitAgentsRegistryCreate();
});
agentsRegistryCreatePathInputNode?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    void submitAgentsRegistryCreate();
  }
});
agentsRegistryCreateModalNode?.addEventListener("click", (event) => {
  if (event.target === agentsRegistryCreateModalNode) closeAgentsRegistryCreateModal();
});
agentsRegistryDiscoverCloseBtn?.addEventListener("click", closeAgentDiscoverModal);
agentsRegistryDiscoverScanBtn?.addEventListener("click", () => {
  void loadAgentDiscoverResults();
});
agentsRegistryDiscoverModalNode?.addEventListener("click", (event) => {
  if (event.target === agentsRegistryDiscoverModalNode) closeAgentDiscoverModal();
});
agentsRegistryCancelBtn?.addEventListener("click", closeAgentsRegistryModal);
agentsRegistrySaveBtn?.addEventListener("click", () => {
  void saveAgentsRegistryDraft();
});

setupMenuSortDragDrop();
init();
updateContentSearchPlaceholder();

appHomeLink?.addEventListener("click", (event) => {
  event.preventDefault();
  showHomeView();
});

agentViewDashboardBtn?.addEventListener("click", () => setAgentWorkspaceView("dashboard"));
agentViewMapBtn?.addEventListener("click", () => setAgentWorkspaceView("map"));
agentViewMap2Btn?.addEventListener("click", () => setAgentWorkspaceView("map2"));
agentViewSchemaBtn?.addEventListener("click", () => setAgentWorkspaceView("schema"));
agentViewVaultBtn?.addEventListener("click", () => setAgentWorkspaceView("vault"));
agentViewGraphBtn?.addEventListener("click", () => setAgentWorkspaceView("graph"));

agentVaultSearchNode?.addEventListener("input", () => {
  agentVaultSearchQuery = agentVaultSearchNode.value;
  if (agentWorkspaceView === "vault") {
    renderAgentVaultView();
  }
});

fileContentInputNode.addEventListener("paste", (event) => {
  if (!canPasteMarkdownAttachment() || editorViewMode !== "source") return;
  const file = extractImageFileFromDataTransfer(event.clipboardData);
  if (!file) return;
  event.preventDefault();
  void insertUploadedAttachmentIntoEditor(file);
});

fileContentInputNode.addEventListener("dragover", (event) => {
  if (!canPasteMarkdownAttachment() || editorViewMode !== "source") return;
  if (!dataTransferHasImage(event.dataTransfer)) return;
  event.preventDefault();
});

fileContentInputNode.addEventListener("drop", (event) => {
  if (!canPasteMarkdownAttachment() || editorViewMode !== "source") return;
  const file = extractImageFileFromDataTransfer(event.dataTransfer);
  if (!file) return;
  event.preventDefault();
  void insertUploadedAttachmentIntoEditor(file);
});

fileContentInputNode.addEventListener("input", () => {
  syncEditorLineNumbers();
  if (editorViewMode === "preview") {
    renderPreviewFromEditor();
  }
  applySourceEditorAutoHeightUi();
});

fileContentInputNode.addEventListener("scroll", syncEditorLineNumbersScroll);

editorLineNumbersBtn?.addEventListener("click", toggleEditorLineNumbers);
applyEditorLineNumbersUi();

editorViewPreviewBtn.addEventListener("click", () => setEditorViewMode("preview"));
editorViewWysiwygBtn?.addEventListener("click", () => setEditorViewMode("wysiwyg"));
editorViewSourceBtn?.addEventListener("click", () => setEditorViewMode("source"));
applyEditorViewMode();

saveContentBtn.addEventListener("click", saveContent);
saveSystemFileBtn?.addEventListener("click", saveContent);
propsYamlToggleBtn?.addEventListener("click", togglePropsRawYaml);
propsAddFieldBtn?.addEventListener("click", () => {
  readPropsFormIntoEntries();
  propsFormEntries.push({ key: "", kind: "string", value: "" });
  syncYamlFromPropsForm();
  renderPropsForm();
  const lastInput = propsFormFieldsNode?.querySelector(".props-form-row:last-child .props-form-key-input");
  lastInput?.focus();
});
propsFormFieldsNode?.addEventListener("input", () => {
  readPropsFormIntoEntries();
  syncYamlFromPropsForm();
});
propsInputNode?.addEventListener("input", () => {
  if (!propsRawYamlVisible) return;
  propsFormEntries = parsePropsYaml(propsInputNode.value || "");
});
document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "s") {
    event.preventDefault();
    if (activeSystemFile || activePath) {
      saveContent();
    }
  }
});
nodeWorkspaceCloseBtn?.addEventListener("click", returnToNodeNavigation);
confirmCancelBtn.addEventListener("click", () => closeConfirm(false));
confirmOkBtn.addEventListener("click", () => closeConfirm(true));
createManifestBtn?.addEventListener("click", () => createNode("manifest"));
createFolderBtn.addEventListener("click", () => createNode("folder"));
createFileBtn.addEventListener("click", () => createNode("file"));
createNodeCatalogActionsNode?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-catalog-preset]");
  if (!button) return;
  const preset = button.getAttribute("data-catalog-preset");
  if (!preset) return;
  void createNode("catalog", { preset });
});
createNodeVaultOptionNode?.addEventListener("change", applyCreateNodeTargetPath);
createNodeCancelBtn?.addEventListener("click", closeCreateNodeModal);
nodeSettingsModeSelectNode?.addEventListener("change", () => {
  const mode = nodeSettingsModeSelectNode.value;
  if (isNodeSettingsSelectMode(mode)) {
    setContentMode(mode);
  }
});
nodeWorkspaceDomainSelectNode?.addEventListener("change", () => {
  applyNodeWorkspaceDomainChange(nodeWorkspaceDomainSelectNode.value);
});
nodeDefaultLandingBtn?.addEventListener("click", () => {
  void toggleNodeDefaultLanding();
});
nodeMemoryModeSelectNode?.addEventListener("change", () => {
  const mode = nodeMemoryModeSelectNode.value;
  if (isNodeMemorySelectMode(mode)) {
    setContentMode(mode);
  }
});
createNameInputNode?.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeCreateNodeModal();
  if (event.key === "Enter") {
    event.preventDefault();
    createNode("folder");
  }
});
createNodeModalNode?.addEventListener("click", (event) => {
  if (event.target === createNodeModalNode) closeCreateNodeModal();
});
menuSearchInputNode.addEventListener("input", (event) => {
  menuSearchQuery = event.target.value || "";
  if (currentMenuData) {
    renderMenu(currentMenuData);
    updateActiveButton();
  }
});
menuCardsPreviewOnlyNode?.addEventListener("change", () => {
  menuCardsPreviewOnly = Boolean(menuCardsPreviewOnlyNode.checked);
  saveCardsPreviewOnly(menuCardsPreviewOnly);
  if (currentMenuData) {
    renderMenu(currentMenuData);
    updateActiveButton();
  }
});
menuViewTreeBtn.addEventListener("click", () => setMenuViewMode("tree"));
menuViewFlatBtn.addEventListener("click", () => setMenuViewMode("flat"));
menuViewBookmarksBtn.addEventListener("click", () => setMenuViewMode("bookmarks"));
menuViewCardsBtn?.addEventListener("click", () => setMenuViewMode("cards"));
menuRefreshBtn?.addEventListener("click", () => {
  void refreshMenuTree();
});
menuCollapseAllBtn?.addEventListener("click", () => {
  toggleCollapseAllMenuTreeBranches();
});

menuSettingsBtn?.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleMenuSettingsPopover();
});

window.addEventListener("resize", () => {
  if (menuSettingsPopoverNode?.classList.contains("hidden")) return;
  positionMenuSettingsPopover();
});

document.getElementById("menu")?.addEventListener(
  "scroll",
  () => {
    if (menuSettingsPopoverNode?.classList.contains("hidden")) return;
    closeMenuSettingsPopover();
  },
  { passive: true }
);

menuTreeShowEmptyFoldersNode?.addEventListener("change", () => {
  saveMenuTreeSettings(activeAgentId, {
    showEmptyFolders: Boolean(menuTreeShowEmptyFoldersNode.checked)
  });
  if (currentMenuData) {
    renderMenu(currentMenuData);
    updateActiveButton();
  }
});

menuTreePadSortIndexesNode?.addEventListener("change", () => {
  saveMenuTreeSettings(activeAgentId, {
    padSortIndexes: Boolean(menuTreePadSortIndexesNode.checked)
  });
  if (currentMenuData && menuViewMode === "tree") {
    renderMenu(currentMenuData);
    updateActiveButton();
  }
});

agentGraphShowPreviewsNode?.addEventListener("change", () => {
  saveAgentGraphSettings(activeAgentId, {
    showPreviews: Boolean(agentGraphShowPreviewsNode.checked)
  });
  if (agentWorkspaceView === "graph") {
    renderAgentGraphView();
  }
});

document.addEventListener("click", (event) => {
  if (menuSettingsPopoverNode?.classList.contains("hidden")) return;
  if (event.target.closest("#menu-settings-wrap")) return;
  closeMenuSettingsPopover();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeMenuSettingsPopover();
});
sidebarWidthDecreaseBtn?.addEventListener("click", () => changeSidebarWidth(-SIDEBAR_WIDTH_STEP));
sidebarWidthIncreaseBtn?.addEventListener("click", () => changeSidebarWidth(SIDEBAR_WIDTH_STEP));
externalViewSelectNode?.addEventListener("change", () => {
  externalViewMode = externalViewSelectNode?.value || "table";
  if (activeContentMode === "external") renderListViewContent();
});
mediaViewSelectNode?.addEventListener("change", () => {
  mediaViewMode = mediaViewSelectNode?.value || "all";
  if (activeContentMode === "media") renderListViewContent();
});

mediaUploadBtnNode?.addEventListener("click", () => {
  mediaUploadInputNode?.click();
});

mediaUploadInputNode?.addEventListener("change", () => {
  const file = mediaUploadInputNode.files?.[0];
  if (file) void uploadMediaFileFromPicker(file);
});

mediaSidecarBackBtn?.addEventListener("click", () => closeMediaSidecarEditor());
externalMemoryBackBtn?.addEventListener("click", () => closeExternalFileEditor());
tabularSourceBtn?.addEventListener("click", () => {
  setEditorViewMode("source");
  refreshEditorViewContent();
  updateBreadcrumbsForActiveMode();
});
tabularTableBackBtn?.addEventListener("click", () => closeTabularSourceEditor());
workspaceRefreshBtn?.addEventListener("click", () => {
  void refreshWorkspaceContent();
});
workspaceRevealFolderBtn?.addEventListener("click", () => {
  void revealNodeFolderInExplorer();
});
createExternalMemoryBtn.addEventListener("click", createExternalMemory);
createExternalSectionBtn.addEventListener("click", openCreateSectionModal);
createSectionCancelBtn.addEventListener("click", closeCreateSectionModal);
createSectionOkBtn.addEventListener("click", createExternalSection);
createSectionNameInputNode.addEventListener("keydown", (event) => {
  if (event.key === "Enter") createExternalSection();
});

function bindPreviewPasteButton(button) {
  button?.addEventListener("click", (event) => {
    event.stopPropagation();
    event.preventDefault();
    void pastePreviewFromClipboard();
  });
}

bindPreviewPasteButton(previewPasteBtn);
bindPreviewPasteButton(previewPasteActionsBtn);

previewUploadZoneNode?.addEventListener("click", (event) => {
  if (activeContentMode !== "node-preview") return;
  if (event.target.closest(".preview-action-paste")) return;
  previewFileInputNode?.click();
});

previewUploadZoneNode?.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    previewFileInputNode?.click();
  }
});

previewUploadZoneNode?.addEventListener("dragover", (event) => {
  event.preventDefault();
  previewUploadZoneNode.classList.add("drag-over");
});

previewUploadZoneNode?.addEventListener("dragleave", () => {
  previewUploadZoneNode.classList.remove("drag-over");
});

previewUploadZoneNode?.addEventListener("drop", (event) => {
  event.preventDefault();
  previewUploadZoneNode.classList.remove("drag-over");
  const file = event.dataTransfer?.files?.[0];
  if (file) uploadPreviewFile(file);
});

previewFileInputNode?.addEventListener("change", () => {
  const file = previewFileInputNode.files?.[0];
  if (file) uploadPreviewFile(file);
});

previewReplaceBtn?.addEventListener("click", (event) => {
  event.stopPropagation();
  previewFileInputNode?.click();
});

previewRemoveBtn?.addEventListener("click", (event) => {
  event.stopPropagation();
  removePreviewImage();
});

document.addEventListener("click", (event) => {
  if (contentSearchInputNode && contentSearchResultsNode) {
    const searchBar = document.querySelector(".content-search-bar");
    const insideSearch =
      searchBar?.contains(event.target) || contentSearchResultsNode.contains(event.target);
    if (!insideSearch) hideContentSearchResults();
  }
});

contentSearchScopeNode?.addEventListener("change", () => {
  updateContentSearchPlaceholder();
  scheduleContentSearch();
});
contentSearchInputNode?.addEventListener("input", scheduleContentSearch);
contentSearchInputNode?.addEventListener("focus", () => {
  if (contentSearchInputNode.value.trim()) scheduleContentSearch();
});
contentSearchInputNode?.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    hideContentSearchResults();
    contentSearchInputNode.blur();
  }
});
