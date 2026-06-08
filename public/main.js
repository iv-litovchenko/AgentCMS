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
const home2PaneNode = document.getElementById("home-pane-2");
const home2ContentNode = document.getElementById("home2-content");
const homeHintNode = document.getElementById("home-hint");
const appLandingPaneNode = document.getElementById("app-landing-pane");
const appLandingAgentsNode = document.getElementById("app-landing-agents");
const appLandingHintNode = document.getElementById("app-landing-hint");
const appLandingManageBtn = document.getElementById("app-landing-manage-btn");
const appLandingViewGridBtn = document.getElementById("app-landing-view-grid-btn");
const appLandingViewOrbitBtn = document.getElementById("app-landing-view-orbit-btn");
const appLandingOrbitNode = document.getElementById("app-landing-orbit");
const appLandingOrbitBubblesNode = document.getElementById("app-landing-orbit-bubbles");
const appLandingOrbitLinksNode = document.getElementById("app-landing-orbit-links");
const appLandingOrbitCreateBtn = document.getElementById("app-landing-orbit-create-btn");
const appLandingSearchInputNode = document.getElementById("app-landing-search-input");
const appLandingSearchScopeNode = document.getElementById("app-landing-search-scope");
const appLandingSearchResultsNode = document.getElementById("app-landing-search-results");
const appLandingSearchAgentsNode = document.getElementById("app-landing-search-agents");
const appLandingSearchAgentsAllBtn = document.getElementById("app-landing-search-agents-all");
const appLandingSearchAgentsNoneBtn = document.getElementById("app-landing-search-agents-none");
const appLandingSearchAgentsActiveBtn = document.getElementById("app-landing-search-agents-active");
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
const menuPinBranchBtn = document.getElementById("menu-pin-branch-btn");
const menuPinnedBannerNode = document.getElementById("menu-pinned-banner");
const menuPinnedBannerPathNode = document.getElementById("menu-pinned-banner-path");
const menuPinnedBannerUnpinBtn = document.getElementById("menu-pinned-banner-unpin");
const menuPinCurrentBtn = document.getElementById("menu-pin-current-btn");
const menuUnpinBranchBtn = document.getElementById("menu-unpin-branch-btn");
const menuPinnedStatusNode = document.getElementById("menu-pinned-status");
const menuSettingsBtn = document.getElementById("menu-settings-btn");
const menuSettingsPopoverNode = document.getElementById("menu-settings-popover");
const menuTreeShowEmptyFoldersNode = document.getElementById("menu-tree-show-empty-folders");
const menuTreePadSortIndexesNode = document.getElementById("menu-tree-pad-sort-indexes");
const agentViewSelect = document.getElementById("agent-view-select");
const agentMap3PaneNode = document.getElementById("agent-map3-pane");
const agentMap3StatsNode = document.getElementById("agent-map3-stats");
const agentMap3ViewportNode = document.getElementById("agent-map3-viewport");
const agentMap3BoardNode = document.getElementById("agent-map3-board");
const agentPreviewPlaceholderNode = document.getElementById("agent-preview-placeholder");
const agentTablePaneNode = document.getElementById("agent-table-pane");
const agentTableContentNode = document.getElementById("agent-table-content");
const agentTableStatsNode = document.getElementById("agent-table-stats");
const agentTableSearchNode = document.getElementById("agent-table-search");
const agentStoragePaneNode = document.getElementById("agent-storage-pane");
const agentStorageContentNode = document.getElementById("agent-storage-content");
const agentStorageStatsNode = document.getElementById("agent-storage-stats");
const agentTimelinePaneNode = document.getElementById("agent-timeline-pane");
const agentTimelineContentNode = document.getElementById("agent-timeline-content");
const agentTimelineStatsNode = document.getElementById("agent-timeline-stats");
const agentTimelineAxisPaneNode = document.getElementById("agent-timeline-axis-pane");
const agentTimelineAxisContentNode = document.getElementById("agent-timeline-axis-content");
const agentTimelineAxisStatsNode = document.getElementById("agent-timeline-axis-stats");
const agentTimelineVerticalPaneNode = document.getElementById("agent-timeline-vertical-pane");
const agentTimelineVerticalContentNode = document.getElementById("agent-timeline-vertical-content");
const agentTimelineVerticalStatsNode = document.getElementById("agent-timeline-vertical-stats");
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
const agentGraphControlsNode = document.getElementById("agent-graph-controls");
const filePathNode = document.getElementById("file-path");
const workspaceShareLinkBtn = document.getElementById("workspace-share-link-btn");
const workspaceShareBtn = document.getElementById("workspace-share-btn");
const workspaceGdriveSyncBtn = document.getElementById("workspace-gdrive-sync-btn");
const workspacePathHeaderNode = document.getElementById("workspace-path-header");
const fileContentInputNode = document.getElementById("file-content-input");
const fileContentPreviewNode = document.getElementById("file-content-preview");
const titleEditorBlockNode = document.getElementById("title-editor-block");
const docBodyGridNode = document.getElementById("doc-body-grid");
const nodeDescriptionHintNode = document.getElementById("node-description-hint");
const titleRowNode = titleEditorBlockNode?.querySelector(".title-row");
const editorViewClusterNode = document.querySelector(".editor-view-cluster");
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
const mindmapViewBarNode = document.getElementById("mindmap-view-bar");
const nodeNavigationSubsectionSelectNode = document.getElementById("node-navigation-subsection-select");
const editorSurfaceNode = document.querySelector(".editor-surface");
const listViewTitleNode = document.getElementById("list-view-title");
const listViewContentNode = document.getElementById("list-view-content");
const nodeOverviewBlockNode = document.getElementById("node-overview-block");
const nodeOverviewContentNode = document.getElementById("node-overview-content");
const docSlabMainNode = document.querySelector(".doc-slab-main");
const workspaceBodyNode = document.querySelector(".workspace-body");
const workspacePaneNode = document.querySelector(".workspace-pane");
const contentLoadingNode = document.getElementById("content-loading");
const contentLoadingTextNode = document.getElementById("content-loading-text");
const externalViewSelectNode = document.getElementById("external-view-select");
const mediaViewSelectNode = document.getElementById("media-view-select");
const mediaUploadInputNode = document.getElementById("media-upload-input");
const mediaUploadBtnNode = document.getElementById("media-upload-btn");
const createExternalMemoryBtn = document.getElementById("create-external-memory-btn");
const createExternalSectionBtn = document.getElementById("create-external-section-btn");
const createMediaSectionBtn = document.getElementById("create-media-section-btn");
const storageSectionsPanelToggleWrapNode = document.getElementById("storage-sections-panel-toggle-wrap");
const storageSectionsPanelToggleNode = document.getElementById("storage-sections-panel-toggle");
const createSectionModalNode = document.getElementById("create-section-modal");
const createSectionNameInputNode = document.getElementById("create-section-name-input");
const createSectionCancelBtn = document.getElementById("create-section-cancel-btn");
const createSectionOkBtn = document.getElementById("create-section-ok-btn");
const CREATE_MEMORY_MAX_COUNT = 5;
const CREATE_MEMORY_AFTER_KEY = "acms.createMemory.after";
const createMemoryModalNode = document.getElementById("create-memory-modal");
const createMemoryNamesListNode = document.getElementById("create-memory-names-list");
const createMemoryNameInputNodes = createMemoryNamesListNode
  ? [...createMemoryNamesListNode.querySelectorAll(".create-memory-name-input")]
  : [];
const createMemoryAfterListRadio = document.getElementById("create-memory-after-list");
const createMemoryAfterEditRadio = document.getElementById("create-memory-after-edit");
const createMemoryAfterRadios = [createMemoryAfterListRadio, createMemoryAfterEditRadio].filter(Boolean);
const createMemoryCancelBtn = document.getElementById("create-memory-cancel-btn");
const createMemoryOkBtn = document.getElementById("create-memory-ok-btn");
const editorViewPreviewBtn = document.getElementById("editor-view-preview-btn");
const editorViewWysiwygBtn = document.getElementById("editor-view-wysiwyg-btn");
const editorViewSourceBtn = document.getElementById("editor-view-source-btn");
const editorWysiwygWrapNode = document.getElementById("editor-wysiwyg-wrap");
const editorLineNumbersBtn = document.getElementById("editor-line-numbers-btn");
const editorCodeWrapNode = document.getElementById("editor-code-wrap");
const editorLineNumbersNode = document.getElementById("editor-line-numbers");
const tabularSourceBtn = document.getElementById("tabular-source-btn");
const tabularTableBackBtn = document.getElementById("tabular-table-back-btn");
const titleInputNode = document.getElementById("title-input");
const titleMediaExtNode = document.getElementById("title-media-ext");
const titleFixedValueNode = document.getElementById("title-fixed-value");
const titleFixedTextNode = document.getElementById("title-fixed-text");
const saveContentBtn = document.getElementById("save-content-btn");
const saveSystemFileBtn = document.getElementById("save-system-file-btn");
const fileHistoryBtn = document.getElementById("file-history-btn");
const fileHistoryModalNode = document.getElementById("file-history-modal");
const fileHistoryTitleNode = document.getElementById("file-history-title");
const fileHistorySubtitleNode = document.getElementById("file-history-subtitle");
const fileHistoryListNode = document.getElementById("file-history-list");
const fileHistoryPreviewWrapNode = document.getElementById("file-history-preview-wrap");
const fileHistoryPreviewTitleNode = document.getElementById("file-history-preview-title");
const fileHistoryPreviewContentNode = document.getElementById("file-history-preview-content");
const fileHistoryCloseBtn = document.getElementById("file-history-close-btn");
const fileHistoryPreviewCloseBtn = document.getElementById("file-history-preview-close-btn");
const yamlPanelNode = document.getElementById("yaml-form-panel");

function removeYamlPanelLabel() {
  if (!yamlPanelNode) return;
  yamlPanelNode.querySelector("#yaml-panel-label")?.remove();
  yamlPanelNode.querySelector(":scope > .doc-slab-label")?.remove();
}

removeYamlPanelLabel();
const propsFormFieldsNode = document.getElementById("props-form-fields");
const propsYamlToggleBtn = document.getElementById("props-yaml-toggle");
const propsAddFieldBtn = document.getElementById("props-add-field-btn");
const propsInputNode = document.getElementById("props-input");
const docAsideTabPropsBtn = document.getElementById("doc-aside-tab-props");
const docAsideTabOutlineBtn = document.getElementById("doc-aside-tab-outline");
const docAsideTabBlocksBtn = document.getElementById("doc-aside-tab-blocks");
const docAsidePanelPropsNode = document.getElementById("doc-aside-panel-props");
const docAsidePanelOutlineNode = document.getElementById("doc-aside-panel-outline");
const docAsidePanelBlocksNode = document.getElementById("doc-aside-panel-blocks");
const docBlocksContentNode = document.getElementById("doc-blocks-content");
const docOutlineContentNode = document.getElementById("doc-outline-content");
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
const createNodeServiceDocsWrapNode = document.getElementById("create-node-service-docs-wrap");
const createNodeServiceDocsActionsNode = document.getElementById("create-node-service-docs-actions");
const createNodeStructureLabelNode = document.getElementById("create-node-structure-label");
const createNodeDividerNode = document.getElementById("create-node-divider");
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
const agentsPickerBtn = document.getElementById("agents-picker-btn");
const agentsPickerPopoverNode = document.getElementById("agents-picker-popover");
const agentsPickerPopoverCloseBtn = document.getElementById("agents-picker-popover-close");
const agentsPickerStageNode = document.getElementById("agents-picker-stage");
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
const componentsIdeasSubtitleNode = document.getElementById("components-ideas-subtitle");
const componentsIdeasDraftNavNode = document.getElementById("components-ideas-draft-nav");
const componentsIdeasContentNode = document.getElementById("components-ideas-content");
const COMPONENTS_IDEAS_SOURCES = [
  {
    id: "main",
    label: "Компоненты",
    fetchPath: "/_storage/components-ideas.md",
    subtitle: "My Graph ORM · черновик онтологии",
    withExtras: true
  },
  {
    id: "draft-1",
    label: "Черновик 1",
    fetchPath: "/_storage/drafts/draft-1.md",
    subtitle: "Форум · темы · поля манифеста",
    withExtras: false
  },
  {
    id: "draft-2",
    label: "Черновик 2",
    fetchPath: "/_storage/drafts/draft-2.md",
    subtitle: "Топик · content · resources · relations",
    withExtras: false
  },
  {
    id: "draft-3",
    label: "Черновик 3",
    fetchPath: "/_storage/drafts/draft-3.md",
    subtitle: "AWN registry · _awn-agent-system · layout",
    withExtras: false
  }
];
const componentsIdeasCacheBySource = Object.create(null);
let componentsIdeasActiveSourceId = "main";
const userDocsBtn = document.getElementById("user-docs-btn");
const userDocsModalNode = document.getElementById("user-docs-modal");
const userDocsCloseBtn = document.getElementById("user-docs-close-btn");
const userDocsContentNode = document.getElementById("user-docs-content");
const userDocsVersionSelectNode = document.getElementById("user-docs-version-select");
const userDocsSubtitleNode = document.getElementById("user-docs-subtitle");
const DEFAULT_DOC_VERSION = "0.0.1";
const DOC_VERSION_STORAGE_KEY = "yamlcms.docVersion";
const userDocsCacheByVersion = Object.create(null);
let userDocsVersion = DEFAULT_DOC_VERSION;
let docsMetaCache = null;
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
const apiDocsVersionSelectNode = document.getElementById("api-docs-version-select");
const apiDocsCacheByVersion = Object.create(null);
let apiDocsVersion = DEFAULT_DOC_VERSION;
const mcpDocsBtn = document.getElementById("mcp-docs-btn");
const mcpDocsModalNode = document.getElementById("mcp-docs-modal");
const mcpDocsCloseBtn = document.getElementById("mcp-docs-close-btn");
const mcpDocsContentNode = document.getElementById("mcp-docs-content");
const mcpDocsNotesNode = document.getElementById("mcp-docs-notes");
const mcpDocsConfigNode = document.getElementById("mcp-docs-config");
const mcpDocsTitleNode = document.getElementById("mcp-docs-title");
const mcpDocsSubtitleNode = document.getElementById("mcp-docs-subtitle");
const mcpDocsVersionSelectNode = document.getElementById("mcp-docs-version-select");
const mcpDocsCacheByVersion = Object.create(null);
let mcpDocsVersion = DEFAULT_DOC_VERSION;

function readStorageItem(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

const ACTIVE_AGENT_STORAGE_KEY = "agentcms.activeAgent.v1";
const AGENT_WORKSPACE_VIEW_STORAGE_KEY = "agentcms.agentWorkspaceView.v1";
const AREA_MANIFEST_FILE = "README.x.md";
const SLOT_STORAGE_PREFIX = "_s.";
const TOPIC_MANIFEST_RE = /^[^./\\]+\.md$/i;
const MANIFEST_MD_RE = TOPIC_MANIFEST_RE;
const MENU_EXCLUDED_TOPIC_MD = new Set(["readme.x.md", "agents.md", "todo.md"]);
const STORAGE_FOLDER_NAME = "_s";
const STORAGE_FOLDER_REGEX = "_s\\.[^/]+";
const BUNDLE_CONTENT_FILE = "Content.md";
const BUNDLE_TABULAR_FILE = "Content.csv";
const BUNDLE_CONFIG_FILE = "Config.yml";
const BUNDLE_TODO_FILE = "Todo.md";
const PREVIEW_FILE_BASENAME = "Preview";
const VAULT_FOLDER_DEFAULT = "_awn-vault";
const AGENT_SYSTEM_FOLDER_DEFAULT = "_awn-agent-system";
/** Универсальный заголовок служебной секции в дереве (не имя агента). */
const SERVICE_AREA_NAME = "Служебное";
const SERVICE_SECTION_LABEL = "Служебные компоненты";
const SERVICE_SECTION_HINT = "";
const SERVICE_SECTION_TITLE = SERVICE_SECTION_LABEL;
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

/** Режимы, допустимые в сегменте /v/{mode} ЧПУ. */
const MEDIA_ROUTE_LIST_VIEWS = new Set([
  "dashboard",
  "all",
  "images",
  "audio",
  "video",
  "documents",
  "archives",
  "other"
]);

const APP_ROUTE_VIEW_IDS = new Set([
  "navigation",
  "overview",
  "description",
  "internal",
  "external",
  "tabular",
  "media",
  "temp",
  "todo",
  "configs",
  "env",
  "scripts",
  "artefacts",
  "inbox",
  "references",
  "node-preview",
  "graph",
  "mindmap"
]);

let appRouteSyncSuspended = 0;

function suspendAppRouteSync() {
  appRouteSyncSuspended += 1;
}

function resumeAppRouteSync() {
  appRouteSyncSuspended = Math.max(0, appRouteSyncSuspended - 1);
}

function parseViewRouteTail(tail, view) {
  const result = {
    resourcePath: null,
    subView: null,
    mediaSectionPath: null,
    mediaListView: null
  };
  if (!Array.isArray(tail) || tail.length === 0) return result;

  if (tail[0] === "source" && tail.length === 1) {
    result.subView = "source";
    return result;
  }

  if (view === "media" || view === "external" || FLAT_STORAGE_SECTION_MODES.has(view)) {
    let index = 0;
    while (index < tail.length) {
      const marker = tail[index];
      if (marker === "f" && index + 1 < tail.length) {
        result.resourcePath = tail.slice(index + 1).join("/");
        break;
      }
      if (marker === "s" && index + 1 < tail.length) {
        const parts = [];
        index += 1;
        while (index < tail.length && tail[index] !== "m" && tail[index] !== "f") {
          parts.push(tail[index]);
          index += 1;
        }
        result.mediaSectionPath = parts.join("/");
        continue;
      }
      if (view === "media" && marker === "m" && index + 1 < tail.length) {
        result.mediaListView = tail[index + 1];
        index += 2;
        continue;
      }
      break;
    }
    return result;
  }

  if (tail[0] === "f" && tail.length > 1) {
    result.resourcePath = tail.slice(1).join("/");
  }
  return result;
}

function parseAppRoute(pathname = location.pathname) {
  const normalized = String(pathname || "/").replace(/\/+$/, "") || "/";
  if (normalized === "/" || normalized === "/index.html") {
    return { type: "root" };
  }

  const parts = normalized.split("/").filter(Boolean);
  if (parts[0] !== "a" || !parts[1]) {
    return { type: "legacy" };
  }

  const agentId = decodeURIComponent(parts[1]);
  let rest = parts.slice(2).map((segment) => decodeURIComponent(segment));

  if (rest[0] === "sys") {
    const systemFile = rest.slice(1).join("/");
    if (!systemFile) {
      return { type: "agentHome", agentId };
    }
    return { type: "systemFile", agentId, systemFile };
  }

  let view = null;
  let resourcePath = null;
  let subView = null;
  let mediaSectionPath = null;
  let mediaListView = null;
  const vIndex = rest.lastIndexOf("v");
  if (vIndex >= 0 && vIndex < rest.length - 1) {
    const mode = rest[vIndex + 1];
    if (APP_ROUTE_VIEW_IDS.has(mode)) {
      view = mode;
      const tail = rest.slice(vIndex + 2);
      rest = rest.slice(0, vIndex);
      const parsedTail = parseViewRouteTail(tail, mode);
      resourcePath = parsedTail.resourcePath;
      subView = parsedTail.subView;
      mediaSectionPath = parsedTail.mediaSectionPath;
      mediaListView = parsedTail.mediaListView;
    }
  }

  const displayPath = rest.join("/");
  if (!displayPath) {
    return { type: "agentHome", agentId, view, resourcePath, subView, mediaSectionPath, mediaListView };
  }

  return { type: "node", agentId, displayPath, view, resourcePath, subView, mediaSectionPath, mediaListView };
}

function getAgentIdFromAppLocation() {
  const route = parseAppRoute(location.pathname);
  if (route.agentId) return route.agentId;
  return getAgentIdFromUrl();
}

function buildAppPathFromState() {
  if (appRootNode?.classList.contains("app-landing-view")) {
    return "/";
  }

  const agentId = activeAgentId;
  if (!agentId) {
    return "/";
  }

  if (appRootNode?.classList.contains("home-view") && !activePath && !activeSystemFile) {
    return `/a/${encodeURIComponent(agentId)}`;
  }

  if (activeSystemFile) {
    return `/a/${encodeURIComponent(agentId)}/sys/${encodeURIComponent(activeSystemFile)}`;
  }

  if (!activePath) {
    return `/a/${encodeURIComponent(agentId)}`;
  }

  const displayPath = normalizeBreadcrumbPath(
    getNodeDisplayPath(getResolvedNodePath(activePath))
  );
  const segments = displayPath
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment));

  let path = `/a/${encodeURIComponent(agentId)}`;
  if (segments.length) {
    path += `/${segments.join("/")}`;
  }

  if (activeContentMode && APP_ROUTE_VIEW_IDS.has(activeContentMode)) {
    path += `/v/${encodeURIComponent(activeContentMode)}`;
    if (activeContentMode === "external" && activeExternalFilePath) {
      const fileSegments = String(activeExternalFilePath)
        .split("/")
        .filter(Boolean)
        .map((segment) => encodeURIComponent(segment));
      if (fileSegments.length) {
        path += `/f/${fileSegments.join("/")}`;
      }
    } else if (activeContentMode === "external" && activeExternalSectionFolder && isStorageSectionsPanelVisible()) {
      const sectionSegments = String(activeExternalSectionFolder)
        .split("/")
        .filter(Boolean)
        .map((segment) => encodeURIComponent(segment));
      if (sectionSegments.length) {
        path += `/s/${sectionSegments.join("/")}`;
      }
    } else if (isFlatStorageSectionMode() && getActiveFlatStorageSectionFolder() && isStorageSectionsPanelVisible()) {
      const sectionSegments = String(getActiveFlatStorageSectionFolder())
        .split("/")
        .filter(Boolean)
        .map((segment) => encodeURIComponent(segment));
      if (sectionSegments.length) {
        path += `/s/${sectionSegments.join("/")}`;
      }
    } else if (activeContentMode === "media" && (activeMediaSidecarSourcePath || activeMediaMarkdownPath)) {
      const fileSegments = String(activeMediaSidecarSourcePath || activeMediaMarkdownPath)
        .split("/")
        .filter(Boolean)
        .map((segment) => encodeURIComponent(segment));
      if (fileSegments.length) {
        path += `/f/${fileSegments.join("/")}`;
      }
    } else if (activeContentMode === "media") {
      const viewForUrl = mediaViewMode || "dashboard";
      if (activeMediaSectionFolder && isStorageSectionsPanelVisible()) {
        const sectionSegments = String(activeMediaSectionFolder)
          .split("/")
          .filter(Boolean)
          .map((segment) => encodeURIComponent(segment));
        if (sectionSegments.length) {
          path += `/s/${sectionSegments.join("/")}`;
        }
      }
      const omitDefaultView = activeMediaSectionFolder && isStorageSectionsPanelVisible()
        ? viewForUrl === "all"
        : viewForUrl === "dashboard";
      if (!omitDefaultView && MEDIA_ROUTE_LIST_VIEWS.has(viewForUrl)) {
        path += `/m/${encodeURIComponent(viewForUrl)}`;
      }
    } else if (
      (activeContentMode === "tabular" && isTabularSourceEditing()) ||
      (isFlatStorageListSourceToggleMode() && editorViewMode === "source")
    ) {
      path += "/source";
    }
  }

  return path;
}

function syncAppRouteToUrl({ push = false, replace = !push } = {}) {
  if (appRouteSyncSuspended > 0) return;

  const url = new URL(location.href);
  url.pathname = buildAppPathFromState();
  url.searchParams.delete("agent");

  const next = `${url.pathname}${url.search}${url.hash}`;
  const current = `${location.pathname}${location.search}${location.hash}`;
  if (next === current) return;

  const state = { appRoute: true };
  if (push) {
    history.pushState(state, "", next);
  } else if (replace) {
    history.replaceState(state, "", next);
  } else {
    history.pushState(state, "", next);
  }
  updateWorkspaceShareLinkButton();
}

function updateWorkspaceShareLinkButton() {
  const hasAgent = Boolean(activeAgentId && agentsCache.some((agent) => agent.id === activeAgentId));
  const inWorkspace =
    hasAgent &&
    !appRootNode?.classList.contains("home-view") &&
    Boolean(activePath || activeSystemFile);
  const canNativeShare = typeof navigator.share === "function";

  if (workspaceShareLinkBtn) {
    workspaceShareLinkBtn.classList.toggle("hidden", !inWorkspace);
    workspaceShareLinkBtn.disabled = !inWorkspace;
  }

  if (workspaceShareBtn) {
    workspaceShareBtn.classList.toggle("hidden", !inWorkspace || !canNativeShare);
    workspaceShareBtn.disabled = !inWorkspace || !canNativeShare;
  }
}

function getWorkspaceSharePayload() {
  syncAppRouteToUrl({ replace: true });
  const url = location.href;
  const label = String(activeLabel || titleInputNode?.value || "").trim();
  const title = formatDocumentTitle(label);
  return { title, text: label || title, url };
}

async function copyWorkspaceShareLink() {
  const { url } = getWorkspaceSharePayload();
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      showToast("Ссылка скопирована", "success");
      return;
    }
  } catch {
    // fallback below
  }

  window.prompt("Скопируйте ссылку:", url);
}

async function shareWorkspaceLink() {
  const payload = getWorkspaceSharePayload();
  if (typeof navigator.share !== "function") {
    await copyWorkspaceShareLink();
    return;
  }

  try {
    await navigator.share(payload);
  } catch (error) {
    if (error?.name === "AbortError") return;
    await copyWorkspaceShareLink();
  }
}

async function applyAppRouteFromUrl() {
  const route = parseAppRoute(location.pathname);
  if (route.type === "root" || route.type === "legacy") {
    activeAgentId = null;
    renderAgentSelect();
    showAppLandingView();
    showMenuNoAgentPlaceholder();
    updateWorkspaceShareLinkButton();
    return true;
  }

  const selectable = getSelectableAgents();
  if (!selectable.some((agent) => agent.id === route.agentId)) {
    showToast(`Агент «${route.agentId}» не найден`, "error");
    return false;
  }

  if (route.agentId !== activeAgentId) {
    await switchActiveAgent(route.agentId);
  }

  if (route.type === "systemFile") {
    hideHomeView();
    await selectSystemFile(route.systemFile, { skipRouteSync: true });
    syncAppRouteToUrl({ replace: true });
    return true;
  }

  if (route.type === "agentHome") {
    showHomeView();
    if (route.view && APP_ROUTE_VIEW_IDS.has(route.view)) {
      showToast("Выберите тему в дереве, чтобы открыть раздел из ссылки", "info");
    }
    return true;
  }

  if (route.type !== "node") return false;

  const entry = resolveMenuEntryByDisplayPath(route.displayPath);
  if (!entry?.path) {
    showToast(`Тема «${route.displayPath}» не найдена в workspace`, "error");
    showHomeView();
    return true;
  }

  const label = entry.label || getLabelFromPath(entry.path);
  if (route.view && APP_ROUTE_VIEW_IDS.has(route.view)) {
    const memoryModes = new Set(["internal", "external", "tabular", "media"]);
    const landingMode =
      isContainerNodePath(entry.path) && memoryModes.has(route.view) ? "navigation" : route.view;
    await selectNodeManifest(label, entry.path, landingMode, { skipRouteSync: true });
    await applyAppRouteResourceFromUrl(route);
  } else {
    await openNodeFromMenu(label, entry.path, { skipRouteSync: true });
  }
  syncAppRouteToUrl({ replace: true });
  return true;
}

async function applyMediaRouteStateFromUrl(route) {
  activeMediaSectionFolder =
    isStorageSectionsPanelVisible() && route.mediaSectionPath ? route.mediaSectionPath : null;
  if (route.mediaListView && MEDIA_ROUTE_LIST_VIEWS.has(route.mediaListView)) {
    mediaViewMode = route.mediaListView;
  } else if (activeMediaSectionFolder) {
    mediaViewMode = "all";
  } else {
    mediaViewMode = "dashboard";
  }
  pruneActiveMediaSectionFolder();
  if (mediaViewSelectNode) mediaViewSelectNode.value = mediaViewMode;
  applyModeUi();
  renderListViewContent();
}

async function applyExternalRouteStateFromUrl(route) {
  activeExternalSectionFolder =
    isStorageSectionsPanelVisible() && route.mediaSectionPath ? route.mediaSectionPath : null;
  pruneActiveExternalSectionFolder();
  applyModeUi();
  renderListViewContent();
}

async function applyFlatStorageRouteStateFromUrl(route) {
  if (!isFlatStorageSectionMode(route.view)) return;
  activeFlatStorageSectionFolder[route.view] =
    isStorageSectionsPanelVisible() && route.mediaSectionPath ? route.mediaSectionPath : null;
  pruneActiveFlatStorageSectionFolder(route.view);
  applyModeUi();
  renderListViewContent();
}

async function applyAppRouteResourceFromUrl(route) {
  if (!route?.view) return;

  if (route.resourcePath) {
    if (route.view === "external") {
      await openExternalFile(route.resourcePath, { skipRouteSync: true });
      return;
    }
    if (route.view === "media") {
      if (isSectionReadmePath(route.resourcePath)) {
        await openMediaMarkdownFile(route.resourcePath, { skipRouteSync: true });
      } else {
        await openMediaSidecar(route.resourcePath, { skipRouteSync: true });
      }
      return;
    }
  }

  if (route.view === "media") {
    await applyMediaRouteStateFromUrl(route);
    return;
  }

  if (route.view === "external") {
    await applyExternalRouteStateFromUrl(route);
    return;
  }

  if (FLAT_STORAGE_SECTION_MODES.has(route.view)) {
    await applyFlatStorageRouteStateFromUrl(route);
    return;
  }

  if (route.subView === "source") {
    if (route.view === "tabular" || route.view === "scripts") {
      setEditorViewMode("source", { skipRouteSync: true });
      refreshEditorViewContent();
      updateBreadcrumbsForActiveMode();
      applyModeUi();
    }
  }
}

/** @deprecated use syncAppRouteToUrl */
function syncAgentToUrl(agentId) {
  if (agentId && agentId !== activeAgentId) return;
  syncAppRouteToUrl({ replace: true });
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
  const route = parseAppRoute(location.pathname);
  const isAppLandingRoute = route.type === "root" || route.type === "legacy";
  const urlAgentId = getAgentIdFromAppLocation();
  if (urlAgentId && selectableAgents.some((agent) => agent.id === urlAgentId)) {
    activeAgentId = urlAgentId;
    localStorage.setItem(ACTIVE_AGENT_STORAGE_KEY, activeAgentId);
  } else if (isAppLandingRoute) {
    activeAgentId = null;
  } else if (!selectableAgents.some((agent) => agent.id === activeAgentId)) {
    activeAgentId = data.defaultAgentId || selectableAgents[0]?.id || agentsCache[0]?.id || "main";
    localStorage.setItem(ACTIVE_AGENT_STORAGE_KEY, activeAgentId);
  }
  const deferRouteSync = route.type === "node" || route.type === "systemFile";
  if (!deferRouteSync && !isAppLandingRoute) {
    syncAppRouteToUrl({ replace: true });
  }
  renderAgentSelect();
  updateWorkspaceShareLinkButton();
}

function stripTopicPrefix(name) {
  let raw = String(name || "").trim();
  if (raw.toLowerCase().endsWith(".md")) raw = raw.slice(0, -3);
  return raw.trim();
}

function stripStoragePrefix(name) {
  let raw = String(name || "").trim();
  if (raw.startsWith(SLOT_STORAGE_PREFIX)) raw = raw.slice(SLOT_STORAGE_PREFIX.length);
  return raw.trim();
}

function isAreaManifestFileName(fileName) {
  return String(fileName || "").toLowerCase() === AREA_MANIFEST_FILE.toLowerCase();
}

function isExcludedMenuTopicMd(fileName, options = {}) {
  const base = String(fileName || "");
  const lower = base.toLowerCase();
  if (isAreaManifestFileName(base)) return true;
  if (lower.endsWith(".sidecar.md")) return true;
  if (MENU_EXCLUDED_TOPIC_MD.has(lower)) return true;
  if (lower === "readme.md" && options.isAgentRoot) return true;
  return false;
}

function isNodeManifestFileName(fileName) {
  return isAreaManifestFileName(fileName);
}

function isNodeManifestPath(nodePath) {
  const fileName = String(nodePath || "").split("/").filter(Boolean).pop() || "";
  return isAreaManifestFileName(fileName);
}

function isTopicManifestFileName(fileName, options = {}) {
  const base = String(fileName || "");
  return TOPIC_MANIFEST_RE.test(base) && !isExcludedMenuTopicMd(base, options);
}

function isTopicManifestPath(nodePath) {
  const fileName = String(nodePath || "").split("/").filter(Boolean).pop() || "";
  return isTopicManifestFileName(fileName);
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
  if (!agent) return null;
  const vault = agent.vaultFolder;
  if (vault === null || vault === false) return null;
  return vault || VAULT_FOLDER_DEFAULT;
}

function getActiveAgentSystemFolder(agentId = activeAgentId) {
  const agent = getAgentMeta(agentId);
  if (!agent) return null;
  if (agent.agentSystemFolder === null) return null;
  const configured = String(agent.agentSystemFolder || "").trim();
  return configured || AGENT_SYSTEM_FOLDER_DEFAULT;
}

function getCreateModalAgentId() {
  return createModalAgentId || activeAgentId;
}

function isVaultFolderEntryName(name) {
  return String(name || "").toLowerCase() === VAULT_FOLDER_DEFAULT.toLowerCase();
}

function stripVaultPrefixFromRelPath(relPath) {
  const normalized = String(relPath || "").replace(/\\/g, "/");
  if (!getActiveAgentVaultFolder()) return normalized;
  const prefixes = [VAULT_FOLDER_DEFAULT];
  for (const prefix of prefixes) {
    const withSlash = `${prefix}/`;
    if (normalized === prefix) return "";
    if (normalized.startsWith(withSlash)) return normalized.slice(withSlash.length);
  }
  return normalized;
}

function stripServicePrefixFromRelPath(relPath) {
  const serviceFolder = getActiveAgentSystemFolder();
  const normalized = String(relPath || "").replace(/\\/g, "/");
  if (!serviceFolder) return normalized;
  const prefixes = [serviceFolder].filter(Boolean);
  for (const prefix of prefixes) {
    const withSlash = `${prefix}/`;
    if (normalized === prefix) return "";
    if (normalized.startsWith(withSlash)) return normalized.slice(withSlash.length);
  }
  return normalized;
}

function stripAgentContentPrefixFromRelPath(relPath) {
  return stripVaultPrefixFromRelPath(stripServicePrefixFromRelPath(relPath));
}

function getServiceRootManifestPath() {
  const serviceFolder = getActiveAgentSystemFolder();
  return serviceFolder ? `${serviceFolder}/${AREA_MANIFEST_FILE}` : null;
}

function isAgentSystemRootIndexPath(nodePath) {
  const normalized = normalizeMenuNodePath(String(nodePath || "").replace(/\\/g, "/"));
  if (!isNodeManifestPath(normalized)) return false;
  const serviceRoot = getServiceRootManifestPath();
  if (!serviceRoot) return false;
  return normalized === normalizeMenuNodePath(serviceRoot);
}

function isServiceNodePath(nodePath) {
  if (!getActiveAgentSystemFolder() || !nodePath) return false;
  const normalized = String(nodePath || "").replace(/\\/g, "/");
  const prefixes = [getActiveAgentSystemFolder()].filter(Boolean);
  return prefixes.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`)
  );
}

function isFilePartNodePath(nodePath) {
  return Boolean(parsePartFolderManifestRel(nodePath));
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

function resolveManifestPathForNodeApi(nodePath) {
  const normalized = String(nodePath || "").replace(/\\/g, "/").trim();
  if (!normalized) return normalized;
  if (isNodeMdPath(normalized)) return normalized;
  if (/\.x\.todo\.md$/i.test(normalized)) {
    return normalized.replace(/\.x\.todo\.md$/i, ".md");
  }
  if (/\.node\.todo\.md$/i.test(normalized)) {
    return normalized.replace(/\.node\.todo\.md$/i, ".md");
  }
  if (/\.todo\.md$/i.test(normalized) && !/\/todo\.md$/i.test(normalized)) {
    return normalized.replace(/\.todo\.md$/i, ".md");
  }
  const bundleMatch = normalized.match(new RegExp(`^(.*)/${STORAGE_FOLDER_REGEX}/Todo\\.md$`, "i"));
  if (bundleMatch) {
    const prefix = bundleMatch[1];
    const parts = normalized.split("/").filter(Boolean);
    const key = stripStoragePrefix(parts[parts.length - 2] || "");
    const topicRel = `${key}.md`;
    return prefix ? `${prefix}/${topicRel}` : topicRel;
  }
  return normalized;
}

function getActiveNodeApiPath() {
  return resolveManifestPathForNodeApi(getResolvedNodePath(activePath));
}

function getOverviewNodeApiPath(nodePath = activePath) {
  return resolveManifestPathForNodeApi(getResolvedNodePath(nodePath));
}

const NODE_OVERVIEW_SLOT_MEMORY_SPECS = [
  { id: "external", label: "Многофайловая", modeId: "external" },
  { id: "internal", label: "Однофайловая", modeId: "internal" },
  { id: "tabular", label: "Табличная", modeId: "tabular" },
  { id: "media", label: "Медиа", modeId: "media" }
];

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
  if (getActiveAgentVaultFolder()) {
    const rawLower = raw.toLowerCase();
    const vaultPrefixes = [VAULT_FOLDER_DEFAULT];
    if (vaultPrefixes.some((prefix) => rawLower === prefix.toLowerCase() || rawLower.startsWith(`${prefix.toLowerCase()}/`))) {
      return raw;
    }
  }
  return raw;
}

function isAgentRootIndexPath(nodePath) {
  const normalized = normalizeMenuNodePath(String(nodePath || "").replace(/\\/g, "/"));
  if (!isNodeManifestPath(normalized)) return false;
  if (isServiceNodePath(normalized)) return false;
  const serviceRoot = getServiceRootManifestPath();
  if (serviceRoot && normalized === normalizeMenuNodePath(serviceRoot)) return false;
  const rootIndex = currentMenuData?.indexPath;
  if (rootIndex) {
    return normalized === normalizeMenuNodePath(rootIndex);
  }
  const agentName = getActiveAgentMeta()?.name || getAgentTreeTitle();
  const rootFolder = agentName;
  const folderPath = stripAgentContentPrefixFromRelPath(getFolderPathFromManifest(normalized) || "");
  if (normalized === AREA_MANIFEST_FILE) return true;
  return folderPath === rootFolder;
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

function syncNodeDescriptionHintUi() {
  if (!nodeDescriptionHintNode) return;
  const titleNode = nodeDescriptionHintNode.querySelector(".doc-slab-hint-title");
  const textNode = nodeDescriptionHintNode.querySelector(".doc-slab-hint-text");
  if (!titleNode || !textNode) return;

  const resolvedPath = getActiveNodeApiPath();
  if (isAgentRootIndexPath(resolvedPath)) {
    titleNode.textContent = "Workspace агента — описание проекта";
    textNode.innerHTML =
      "Корневая область контента: контекст проекта, правила и документация для работы в этом workspace. " +
      "Превью на вкладке «Превью» — аватар агента в сайдбаре (<code>_s.README.x/Preview.*</code>). " +
      "Строка <code>---</code> ограничивает краткий фрагмент в обзоре.";
    return;
  }
  if (isAgentSystemRootIndexPath(resolvedPath)) {
    titleNode.textContent = "Служебные компоненты — назначение области";
    textNode.innerHTML =
      "Системная область агента: Agent.md, User.md, справочники и другие служебные файлы. " +
      "Превью здесь относится только к этой служебной области, не к аватару агента. " +
      "Строка <code>---</code> ограничивает краткий фрагмент в обзоре.";
    return;
  }

  titleNode.textContent = "Описание, инструкции, правила, документация";
  textNode.innerHTML =
    "Основной текст для агента: контекст и роль, пошаговые инструкции и правила работы в этой части дерева. " +
    "Отдельная строка <code>---</code> ограничивает превью в обзоре: выше разделителя — краткий фрагмент, " +
    "ниже — полный текст (кнопка «Читать все»).";
}

function syncAgentPreviewPlaceholder() {
  if (!agentPreviewPlaceholderNode) return;
  const agent = getActiveAgentMeta();
  const label = String(agent?.name || agent?.id || "").trim();
  agentPreviewPlaceholderNode.title = label
    ? `Превью не задано — ${label}`
    : "Превью не задано";
}

function syncAgentPreview(previewMeta = null) {
  if (!agentPreviewThumbNode || !agentPreviewWrapNode) return;

  const agent = getActiveAgentMeta();
  syncAgentPreviewPlaceholder();
  const hasPreview = previewMeta ? Boolean(previewMeta.hasPreview) : Boolean(agent?.hasPreview);
  const previewUrl = previewMeta?.previewUrl ?? agent?.previewUrl ?? null;

  if (previewMeta) {
    updateAgentPreviewCache(previewMeta);
  }

  if (hasPreview && previewUrl) {
    const nextSrc = appendCacheBuster(appendAgentToApiUrl(previewUrl));
    const currentSrc = agentPreviewThumbNode.getAttribute("src") || "";
    const srcChanged = currentSrc !== nextSrc;
    const alreadyLoaded = !srcChanged && agentPreviewThumbNode.complete;

    agentPreviewWrapNode.classList.remove("hidden");
    if (srcChanged) {
      agentPreviewWrapNode.classList.remove("is-revealed");
    }
    agentPreviewThumbNode.onerror = () => {
      agentPreviewWrapNode.classList.add("hidden");
      agentPreviewWrapNode.classList.remove("is-revealed");
      agentPreviewThumbNode.removeAttribute("src");
    };
    agentPreviewThumbNode.onload = () => {
      agentPreviewThumbNode.onerror = null;
      agentPreviewWrapNode.classList.add("is-revealed");
    };
    if (srcChanged) {
      agentPreviewThumbNode.src = nextSrc;
    } else if (alreadyLoaded && !agentPreviewWrapNode.classList.contains("is-revealed")) {
      agentPreviewWrapNode.classList.add("is-revealed");
    }
    return;
  }

  agentPreviewWrapNode.classList.add("hidden");
  agentPreviewWrapNode.classList.remove("is-revealed");
  agentPreviewThumbNode.removeAttribute("src");
}

let fileHistoryModalContext = null;

function isFileHistoryAvailable() {
  if (activeSystemFile) return true;
  return isEditorSaveTrackingActive();
}

function getFileHistoryRequestContext() {
  if (activeSystemFile) {
    return { mode: "system", path: "", file: null, name: activeSystemFile };
  }
  if (!activePath || !isFileHistoryAvailable()) return null;
  const context = {
    mode: activeContentMode === "description" ? "description" : activeContentMode,
    path: getActiveNodeApiPath(),
    file: null,
    name: null
  };
  if (activeContentMode === "external" && activeExternalFilePath) {
    context.file = activeExternalFilePath;
  }
  if (activeContentMode === "media" && activeMediaSidecarSourcePath) {
    context.file = activeMediaSidecarSourcePath;
  }
  return context;
}

function buildFileHistoryApiParams(context) {
  const params = { mode: context.mode };
  if (context.path) params.path = context.path;
  if (context.file) params.file = context.file;
  if (context.name) params.name = context.name;
  return params;
}

function syncFileHistoryButtonVisibility() {
  if (!fileHistoryBtn) return;
  const saveVisible = !saveContentBtn?.classList.contains("hidden") || !saveSystemFileBtn?.classList.contains("hidden");
  fileHistoryBtn.classList.toggle("hidden", !saveVisible || !isFileHistoryAvailable());
}

function closeFileHistoryModal() {
  fileHistoryModalNode?.classList.add("hidden");
  fileHistoryModalContext = null;
  fileHistoryPreviewWrapNode?.classList.add("hidden");
  if (fileHistoryPreviewContentNode) fileHistoryPreviewContentNode.textContent = "";
}

async function openFileHistoryModal() {
  const context = getFileHistoryRequestContext();
  if (!context || !fileHistoryModalNode) return;
  fileHistoryModalContext = context;
  fileHistoryPreviewWrapNode?.classList.add("hidden");
  if (fileHistoryTitleNode) fileHistoryTitleNode.textContent = "История версий";
  if (fileHistorySubtitleNode) {
    fileHistorySubtitleNode.textContent = context.name || context.file || context.path || "";
  }
  fileHistoryModalNode.classList.remove("hidden");
  await refreshFileHistoryList();
}

async function refreshFileHistoryList() {
  if (!fileHistoryModalContext || !fileHistoryListNode) return;
  fileHistoryListNode.textContent = "Загрузка…";
  try {
    const response = await fetch(
      buildApiUrl("/api/file/history", buildFileHistoryApiParams(fileHistoryModalContext))
    );
    if (!response.ok) throw new Error(`Request failed with ${response.status}`);
    const data = await response.json();
    renderFileHistoryList(data);
  } catch (error) {
    fileHistoryListNode.textContent = `Ошибка: ${error.message}`;
  }
}

function renderFileHistoryList(data) {
  if (!fileHistoryListNode) return;
  fileHistoryListNode.replaceChildren();
  if (data.target && fileHistorySubtitleNode) {
    fileHistorySubtitleNode.textContent = data.target;
  }
  const versions = Array.isArray(data.versions) ? data.versions : [];
  if (versions.length === 0) {
    const empty = document.createElement("p");
    empty.className = "file-history-empty";
    empty.textContent =
      "Пока нет сохранённых версий. Они появятся после первого изменения и сохранения файла.";
    fileHistoryListNode.appendChild(empty);
    return;
  }

  for (const entry of versions) {
    const row = document.createElement("div");
    row.className = "file-history-row";

    const meta = document.createElement("div");
    meta.className = "file-history-row-meta";
    const title = document.createElement("div");
    title.className = "file-history-row-title";
    title.textContent = entry.label || entry.version;
    const size = document.createElement("div");
    size.className = "file-history-row-size";
    size.textContent = entry.size ? `${entry.size} B` : entry.version;
    meta.appendChild(title);
    meta.appendChild(size);

    const actions = document.createElement("div");
    actions.className = "file-history-row-actions";

    const previewBtn = document.createElement("button");
    previewBtn.type = "button";
    previewBtn.className = "save-btn file-history-action-btn";
    previewBtn.textContent = "Просмотр";
    previewBtn.addEventListener("click", () => {
      void previewFileHistoryVersion(entry.version, entry.label || entry.version);
    });

    const restoreBtn = document.createElement("button");
    restoreBtn.type = "button";
    restoreBtn.className = "save-btn file-history-action-btn";
    restoreBtn.textContent = "Восстановить";
    restoreBtn.addEventListener("click", () => {
      void restoreFileHistoryVersion(entry.version, entry.label || entry.version);
    });

    actions.appendChild(previewBtn);
    actions.appendChild(restoreBtn);
    row.appendChild(meta);
    row.appendChild(actions);
    fileHistoryListNode.appendChild(row);
  }
}

async function previewFileHistoryVersion(version, label) {
  if (!fileHistoryModalContext) return;
  try {
    const response = await fetch(
      buildApiUrl("/api/file/history/content", {
        ...buildFileHistoryApiParams(fileHistoryModalContext),
        version
      })
    );
    if (!response.ok) throw new Error(`Request failed with ${response.status}`);
    const data = await response.json();
    if (fileHistoryPreviewTitleNode) fileHistoryPreviewTitleNode.textContent = label || data.label || version;
    if (fileHistoryPreviewContentNode) fileHistoryPreviewContentNode.textContent = data.content || "";
    fileHistoryPreviewWrapNode?.classList.remove("hidden");
  } catch (error) {
    showToast(`Ошибка просмотра версии: ${error.message}`, "error");
  }
}

function applyRestoredHistoryContent(content) {
  const mode = fileHistoryModalContext?.mode;
  if (mode === "system") {
    fileContentInputNode.value = content;
    refreshEditorViewContent();
    commitEditorSaveBaseline();
    return;
  }

  switch (mode) {
    case "description":
      modeContentCache.description = content;
      applyExternalFileContentUi(content);
      break;
    case "internal":
      modeContentCache.internal = content;
      fileContentInputNode.value = content;
      break;
    case "tabular":
      modeContentCache.tabular = content;
      fileContentInputNode.value = content;
      break;
    case "todo":
      modeContentCache.todo = content;
      fileContentInputNode.value = content;
      break;
    case "configs":
      modeContentCache.configs = content;
      fileContentInputNode.value = content;
      break;
    case "env":
      modeContentCache.env = content;
      fileContentInputNode.value = content;
      break;
    case "external":
      applyExternalFileContentUi(content);
      break;
    case "media":
      applyMediaSidecarContentUi(content);
      break;
    default:
      fileContentInputNode.value = content;
      break;
  }
  refreshEditorViewContent();
  commitEditorSaveBaseline();
}

async function restoreFileHistoryVersion(version, label) {
  if (!fileHistoryModalContext) return;
  const confirmed = await askConfirm(`Восстановить версию ${label}? Текущее содержимое будет сохранено в историю.`, {
    okLabel: "Восстановить"
  });
  if (!confirmed) return;

  try {
    const response = await fetch(buildApiUrl("/api/file/history/restore"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...fileHistoryModalContext,
        version
      })
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Request failed with ${response.status}`);
    }
    const data = await response.json();
    applyRestoredHistoryContent(data.content || "");
    showToast("Версия восстановлена", "success");
    await refreshFileHistoryList();
  } catch (error) {
    showToast(`Ошибка восстановления: ${error.message}`, "error");
  }
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

let agentsPickerIsOpen = false;

function getAgentPickerInitials(agent) {
  const name = String(agent?.name || agent?.id || "?").trim();
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function isAgentRegistryActive(agent) {
  return agent?.active !== false;
}

function getAgentsForLandingGrid() {
  return [...agentsCache].sort((a, b) =>
    String(a.name || a.id).localeCompare(String(b.name || b.id), "ru")
  );
}

function getAgentsForPickerGrid() {
  return [...agentsCache].sort((a, b) => {
    const aOn = isAgentRegistryActive(a) ? 1 : 0;
    const bOn = isAgentRegistryActive(b) ? 1 : 0;
    if (aOn !== bOn) return bOn - aOn;
    return String(a.name || a.id).localeCompare(String(b.name || b.id), "ru");
  });
}

function createAgentPickerAgentButton(agent, avatarSize = 42) {
  const btn = document.createElement("button");
  btn.type = "button";
  const registryActive = isAgentRegistryActive(agent);
  const isCurrent = agent.id === activeAgentId;
  btn.className = "agents-picker-agent-btn";
  if (isCurrent) btn.classList.add("is-active");
  if (!registryActive) btn.classList.add("is-registry-off");

  const statusLabel = registryActive ? "вкл" : "выкл";
  const titleParts = [agent.name || agent.id, registryActive ? "активен в реестре" : "выключен в реестре"];
  if (isCurrent) titleParts.push("текущий");
  btn.title = titleParts.join(" · ");
  btn.setAttribute(
    "aria-label",
    `${agent.name || agent.id}, ${registryActive ? "активен" : "неактивен"}${isCurrent ? ", текущий" : ""}`
  );
  btn.style.setProperty("--picker-avatar-size", `${avatarSize}px`);

  const previewUrl = getRegistryAgentPreviewUrl(agent);
  if (previewUrl) {
    const img = document.createElement("img");
    img.className = "agents-picker-avatar";
    img.alt = "";
    img.draggable = false;
    img.onerror = () => {
      img.replaceWith(createAgentPickerFallback(agent, avatarSize));
    };
    img.src = previewUrl;
    btn.appendChild(img);
  } else {
    btn.appendChild(createAgentPickerFallback(agent, avatarSize));
  }

  const nameNode = document.createElement("span");
  nameNode.className = "agents-picker-name";
  nameNode.textContent = agent.name || agent.id;
  btn.appendChild(nameNode);

  const statusNode = document.createElement("span");
  statusNode.className = `agents-picker-registry-status ${
    registryActive ? "agents-picker-registry-status--on" : "agents-picker-registry-status--off"
  }`;
  statusNode.textContent = `${registryActive ? "●" : "○"} ${statusLabel}`;
  btn.appendChild(statusNode);

  if (agent.default) {
    const badge = document.createElement("span");
    badge.className = "agents-picker-default-badge";
    badge.title = "Агент по умолчанию";
    badge.setAttribute("aria-hidden", "true");
    btn.appendChild(badge);
  }

  btn.addEventListener("click", () => {
    if (!registryActive) {
      showToast("Агент выключен — включите в реестре (⚙)", "error");
      return;
    }
    selectAgentOption(agent.id);
    closeAgentsPickerPopover();
  });

  return btn;
}

function createAgentPickerFallback(agent, avatarSize) {
  const fallback = document.createElement("span");
  fallback.className = "agents-picker-avatar-fallback";
  fallback.style.setProperty("--picker-avatar-size", `${avatarSize}px`);
  fallback.textContent = getAgentPickerInitials(agent);
  return fallback;
}

function renderAgentsPickerGrid() {
  if (!agentsPickerStageNode) return;

  agentsPickerStageNode.className = "agents-picker-stage agents-picker-stage--grid";
  agentsPickerStageNode.replaceChildren();

  const agents = getAgentsForPickerGrid();
  if (agents.length === 0) {
    const empty = document.createElement("p");
    empty.className = "agents-picker-empty";
    empty.textContent = "Нет агентов в реестре";
    agentsPickerStageNode.appendChild(empty);
    return;
  }

  const grid = document.createElement("div");
  grid.className = "agents-picker-grid";
  for (const agent of agents) {
    grid.appendChild(createAgentPickerAgentButton(agent));
  }
  agentsPickerStageNode.appendChild(grid);
}

function syncAgentsPickerButtonState() {
  if (!agentsPickerBtn) return;
  agentsPickerBtn.classList.toggle("is-active", agentsPickerIsOpen);
  agentsPickerBtn.setAttribute("aria-expanded", agentsPickerIsOpen ? "true" : "false");
}

function resetAgentsPickerPopoverPosition() {
  if (!agentsPickerPopoverNode) return;
  for (const prop of ["top", "left", "width", "maxHeight"]) {
    agentsPickerPopoverNode.style.removeProperty(prop);
  }
}

function positionAgentsPickerPopover() {
  const popover = agentsPickerPopoverNode;
  const anchor = document.querySelector(".sidebar-agent-controls");
  if (!popover || !anchor || popover.classList.contains("hidden")) return;

  const rect = anchor.getBoundingClientRect();
  const width = Math.min(300, Math.max(Math.round(rect.width), 240));
  const left = Math.max(12, Math.round(rect.left));
  const top = Math.round(rect.bottom + 6);
  const maxHeight = Math.max(160, window.innerHeight - top - 12);

  popover.style.top = `${top}px`;
  popover.style.left = `${left}px`;
  popover.style.width = `${width}px`;
  popover.style.maxHeight = `${maxHeight}px`;
}

function closeAgentsPickerPopover() {
  agentsPickerPopoverNode?.classList.add("hidden");
  agentsPickerIsOpen = false;
  syncAgentsPickerButtonState();
  resetAgentsPickerPopoverPosition();
}

function openAgentsPickerPopover() {
  if (!agentsPickerPopoverNode) return;
  if (agentsPickerIsOpen) {
    closeAgentsPickerPopover();
    return;
  }
  closeMenuSettingsPopover();
  agentsPickerIsOpen = true;
  renderAgentsPickerGrid();
  agentsPickerPopoverNode.classList.remove("hidden");
  syncAgentsPickerButtonState();
  positionAgentsPickerPopover();
}

function refreshAgentsPickerIfOpen() {
  if (!agentsPickerIsOpen) return;
  renderAgentsPickerGrid();
}

function getActiveAgentLabel() {
  return getActiveAgentMeta()?.name || "";
}

function renderAgentSelect() {
  if (!agentSelectNode) return;

  const agents = getSelectableAgents();
  const previousValue = agentSelectNode.value;
  agentSelectNode.innerHTML = "";

  const placeholderOption = document.createElement("option");
  placeholderOption.value = "";
  placeholderOption.textContent = "— агент —";
  agentSelectNode.appendChild(placeholderOption);

  if (agents.length === 0) {
    placeholderOption.textContent = "Нет агентов";
    placeholderOption.disabled = true;
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
  const nextValue =
    activeAgentId && agents.some((agent) => agent.id === activeAgentId)
      ? activeAgentId
      : previousValue && agents.some((agent) => agent.id === previousValue)
        ? previousValue
        : "";
  agentSelectNode.value = nextValue;
  syncAgentPreview();
  refreshAgentsPickerIfOpen();
}

function showMenuNoAgentPlaceholder() {
  for (const pane of menuAgentPanes.values()) {
    pane.classList.add("hidden");
  }
  if (!menuNode) return;

  let placeholder = document.getElementById("menu-no-agent-placeholder");
  if (!placeholder) {
    placeholder = document.createElement("div");
    placeholder.id = "menu-no-agent-placeholder";
    placeholder.className = "menu-no-agent-placeholder";
    menuNode.appendChild(placeholder);
  }
  placeholder.textContent = "Выберите агента на главной";
  placeholder.classList.remove("hidden");
}

function hideMenuNoAgentPlaceholder() {
  document.getElementById("menu-no-agent-placeholder")?.classList.add("hidden");
}

function openCreateAgentFromLanding() {
  openAgentsRegistryModal();
  openAgentsRegistryCreateModal();
}

function createAppLandingCreateAgentCard() {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "app-landing-agent-card app-landing-agent-card--create";
  btn.title = "Создать нового агента";
  btn.setAttribute("aria-label", "Создать агента");

  const media = document.createElement("div");
  media.className = "app-landing-agent-card-media";
  const icon = document.createElement("span");
  icon.className = "app-landing-agent-card-create-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = "+";
  media.appendChild(icon);

  const body = document.createElement("div");
  body.className = "app-landing-agent-card-body";

  const nameNode = document.createElement("span");
  nameNode.className = "app-landing-agent-card-name";
  nameNode.textContent = "Создать агента";

  const idNode = document.createElement("span");
  idNode.className = "app-landing-agent-card-id app-landing-agent-card-create-sub";
  idNode.textContent = "Новый workspace";

  body.append(nameNode, idNode);
  btn.append(media, body);
  btn.addEventListener("click", openCreateAgentFromLanding);
  return btn;
}

function createAppLandingAgentCard(agent) {
  const registryActive = isAgentRegistryActive(agent);
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "app-landing-agent-card";
  if (!registryActive) btn.classList.add("is-registry-off");
  const label = agent.name || agent.id;
  btn.title = registryActive
    ? `Открыть ${label}`
    : `${label} — неактивен, включите в реестре`;
  btn.setAttribute(
    "aria-label",
    registryActive ? `Открыть агента ${label}` : `Агент ${label} неактивен`
  );

  const media = document.createElement("div");
  media.className = "app-landing-agent-card-media";

  const previewUrl = getRegistryAgentPreviewUrl(agent);
  if (previewUrl) {
    const img = document.createElement("img");
    img.alt = "";
    img.draggable = false;
    img.onerror = () => {
      media.replaceChildren();
      const fallback = document.createElement("span");
      fallback.className = "app-landing-agent-card-fallback";
      fallback.textContent = getAgentPickerInitials(agent);
      media.appendChild(fallback);
    };
    img.src = previewUrl;
    media.appendChild(img);
  } else {
    const fallback = document.createElement("span");
    fallback.className = "app-landing-agent-card-fallback";
    fallback.textContent = getAgentPickerInitials(agent);
    media.appendChild(fallback);
  }

  const body = document.createElement("div");
  body.className = "app-landing-agent-card-body";

  const nameRow = document.createElement("div");
  nameRow.className = "app-landing-agent-card-name-row";

  const statusDot = document.createElement("span");
  statusDot.className = `app-landing-agent-dot ${registryActive ? "is-active" : "is-inactive"}`;
  statusDot.setAttribute("aria-label", registryActive ? "активен" : "неактивен");

  const nameNode = document.createElement("span");
  nameNode.className = "app-landing-agent-card-name";
  nameNode.textContent = label;
  nameRow.append(statusDot, nameNode);

  const idNode = document.createElement("span");
  idNode.className = "app-landing-agent-card-id";
  idNode.textContent = agent.id;

  const pathNode = document.createElement("span");
  pathNode.className = "app-landing-agent-card-path";
  pathNode.textContent = agent.path || "";

  body.append(nameRow, idNode, pathNode);
  btn.append(media, body);
  btn.addEventListener("click", () => {
    if (!registryActive) {
      showToast("Агент выключен — включите в реестре (⚙)", "error");
      return;
    }
    selectAgentOption(agent.id);
  });
  return btn;
}

function hashAgentIdForOrbit(id) {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function getLandingAgentsView() {
  try {
    const saved = localStorage.getItem(LANDING_AGENTS_VIEW_KEY);
    if (saved === "orbit" || saved === "grid") return saved;
  } catch {
    // ignore
  }
  return "grid";
}

function setLandingAgentsView(view) {
  const next = view === "orbit" ? "orbit" : "grid";
  localStorage.setItem(LANDING_AGENTS_VIEW_KEY, next);
  syncLandingAgentsViewUi();
}

function getOrbitBubbleLayout(index, total, agentId) {
  const hash = hashAgentIdForOrbit(String(agentId || index));
  const golden = 2.399963229728653;
  const t = index + 1;
  const radius = 24 + (t / Math.max(total, 1)) * 24 + (hash % 12);
  const angle = t * golden + (hash % 360) * (Math.PI / 180) * 0.08;
  const x = 50 + Math.cos(angle) * radius * (0.92 + (hash % 7) * 0.015);
  const y = 48 + Math.sin(angle) * radius * 0.72;
  return {
    x: Math.min(90, Math.max(8, x)),
    y: Math.min(88, Math.max(10, y)),
    size: 58 + (hash % 28),
    duration: 7 + (hash % 6),
    delay: ((hash % 50) / 10).toFixed(1),
    floatX: 10 + (hash % 18),
    floatY: 12 + (hash % 16)
  };
}

function syncLandingAgentsViewUi() {
  const view = getLandingAgentsView();
  const isOrbit = view === "orbit";

  appLandingPaneNode?.classList.toggle("is-screensaver", isOrbit);
  appLandingAgentsNode?.classList.toggle("hidden", isOrbit);
  appLandingOrbitNode?.classList.toggle("hidden", !isOrbit);
  appLandingOrbitNode?.setAttribute("aria-hidden", isOrbit ? "false" : "true");

  appLandingViewGridBtn?.classList.toggle("is-active", !isOrbit);
  appLandingViewOrbitBtn?.classList.toggle("is-active", isOrbit);
  appLandingViewGridBtn?.setAttribute("aria-selected", isOrbit ? "false" : "true");
  appLandingViewOrbitBtn?.setAttribute("aria-selected", isOrbit ? "true" : "false");

  const subNode = document.querySelector(".app-landing-sub");
  if (subNode) {
    subNode.textContent = isOrbit
      ? "Кружки в воздухе — наведите, чтобы увидеть имя"
      : "Каждый агент — отдельный workspace с темами, памятью и файлами";
  }

}

function createAppLandingOrbitBubble(agent, index, total) {
  const registryActive = isAgentRegistryActive(agent);
  const label = agent.name || agent.id;
  const layout = getOrbitBubbleLayout(index, total, agent.id);

  const item = document.createElement("div");
  item.className = "app-landing-orbit-item";
  item.setAttribute("role", "listitem");
  item.style.setProperty("--orbit-x", `${layout.x}%`);
  item.style.setProperty("--orbit-y", `${layout.y}%`);
  item.style.setProperty("--orbit-size", `${layout.size}px`);
  item.style.setProperty("--orbit-duration", `${layout.duration}s`);
  item.style.setProperty("--orbit-delay", `${layout.delay}s`);
  item.style.setProperty("--orbit-float-x", `${layout.floatX}px`);
  item.style.setProperty("--orbit-float-y", `${layout.floatY}px`);

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `app-landing-orbit-bubble${registryActive ? " is-active" : " is-inactive"}`;
  btn.title = registryActive ? `Открыть ${label}` : `${label} — неактивен`;
  btn.setAttribute("aria-label", registryActive ? `Открыть агента ${label}` : `Агент ${label} неактивен`);

  const avatar = document.createElement("span");
  avatar.className = "app-landing-orbit-bubble-avatar";

  const previewUrl = getRegistryAgentPreviewUrl(agent);
  if (previewUrl) {
    const img = document.createElement("img");
    img.alt = "";
    img.draggable = false;
    img.onerror = () => {
      avatar.replaceChildren();
      avatar.textContent = getAgentPickerInitials(agent);
    };
    img.src = previewUrl;
    avatar.appendChild(img);
  } else {
    avatar.textContent = getAgentPickerInitials(agent);
  }

  const nameNode = document.createElement("span");
  nameNode.className = "app-landing-orbit-bubble-label";
  nameNode.textContent = label;

  btn.append(avatar, nameNode);
  btn.addEventListener("click", () => {
    if (!registryActive) {
      showToast("Агент выключен — включите в реестре (⚙)", "error");
      return;
    }
    selectAgentOption(agent.id);
  });

  item.appendChild(btn);
  return item;
}

const ORBIT_LINK_CENTER = { x: 50, y: 48 };

function renderAppLandingOrbitLinks(agents) {
  if (!appLandingOrbitLinksNode) return;
  appLandingOrbitLinksNode.replaceChildren();

  if (!Array.isArray(agents) || agents.length === 0) return;

  const svgNs = "http://www.w3.org/2000/svg";
  for (let index = 0; index < agents.length; index += 1) {
    const agent = agents[index];
    const layout = getOrbitBubbleLayout(index, agents.length, agent.id);
    const registryActive = isAgentRegistryActive(agent);

    const line = document.createElementNS(svgNs, "line");
    line.setAttribute("x1", String(ORBIT_LINK_CENTER.x));
    line.setAttribute("y1", String(ORBIT_LINK_CENTER.y));
    line.setAttribute("x2", String(layout.x));
    line.setAttribute("y2", String(layout.y));
    line.classList.add("app-landing-orbit-link");
    if (registryActive) line.classList.add("is-active");
    line.style.animationDelay = `${layout.delay}s`;
    appLandingOrbitLinksNode.appendChild(line);
  }
}

function renderAppLandingOrbit() {
  if (!appLandingOrbitBubblesNode) return;
  appLandingOrbitBubblesNode.replaceChildren();

  const agents = getAgentsForLandingGrid();
  if (agents.length === 0) {
    const empty = document.createElement("p");
    empty.className = "app-landing-orbit-empty";
    empty.textContent = "Нет агентов. Нажмите «+» или откройте реестр.";
    appLandingOrbitBubblesNode.appendChild(empty);
    return;
  }

  agents.forEach((agent, index) => {
    appLandingOrbitBubblesNode.appendChild(createAppLandingOrbitBubble(agent, index, agents.length));
  });

  renderAppLandingOrbitLinks(agents);
}

function renderAppLandingAgents() {
  if (!appLandingAgentsNode) return;
  appLandingAgentsNode.replaceChildren();

  const agents = getAgentsForLandingGrid();
  if (agents.length === 0) {
    const empty = document.createElement("p");
    empty.className = "app-landing-empty";
    empty.textContent = "Нет агентов. Нажмите «Реестр» и добавьте workspace.";
    appLandingAgentsNode.appendChild(empty);
  } else {
    for (const agent of agents) {
      const item = document.createElement("div");
      item.className = "app-landing-agent-item";
      item.setAttribute("role", "listitem");
      item.appendChild(createAppLandingAgentCard(agent));
      appLandingAgentsNode.appendChild(item);
    }
  }

  const createItem = document.createElement("div");
  createItem.className = "app-landing-agent-item";
  createItem.setAttribute("role", "listitem");
  createItem.appendChild(createAppLandingCreateAgentCard());
  appLandingAgentsNode.appendChild(createItem);

  renderAppLandingOrbit();
  syncLandingAgentsViewUi();
}

function setAppLandingHint(message = "", { alert = false } = {}) {
  if (!appLandingHintNode) return;
  const text = String(message || "").trim();
  appLandingHintNode.textContent = text;
  appLandingHintNode.classList.toggle("hidden", !text);
  appLandingHintNode.classList.toggle("is-alert", Boolean(text && alert));
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
    localStorage.setItem(ACTIVE_AGENT_STORAGE_KEY, activeAgentId);
    hideAppLandingView();
    hideMenuNoAgentPlaceholder();
    syncAppRouteToUrl({ replace: true });
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
  if (agentsPickerBtn) agentsPickerBtn.disabled = isLoading;
  if (isLoading) closeAgentsPickerPopover();
  syncMenuRefreshButtonState();
  if (menuCollapseAllBtn) menuCollapseAllBtn.disabled = isLoading;
  if (menuPinBranchBtn) menuPinBranchBtn.disabled = isLoading;
  if (menuSettingsBtn) menuSettingsBtn.disabled = isLoading;
}

function syncMenuRefreshButtonState() {
  if (!menuRefreshBtn) return;
  const menuBusy = Boolean(menuLoadingNode && !menuLoadingNode.classList.contains("hidden"));
  menuRefreshBtn.disabled = menuBusy || menuRefreshInFlight;
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
    vaultFolder: agent.vaultFolder === null ? null : VAULT_FOLDER_DEFAULT,
    agentSystemFolder:
      agent.agentSystemFolder === null ? null : agent.agentSystemFolder || AGENT_SYSTEM_FOLDER_DEFAULT,
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
    node.title = result.absolute ? `awn-agent.json найден:\n${result.absolute}` : "awn-agent.json найден";
    syncRegistryRowActions(node.closest(".agents-registry-row"), "manifest");
    return;
  }
  if (result.exists) {
    node.dataset.state = "missing";
    node.title = result.absolute
      ? `Папка есть, но нет awn-agent.json:\n${result.absolute}`
      : "Папка есть, но нет awn-agent.json";
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
    manifest.vaultFolder === null || manifest.vaultFolder === false ? null : VAULT_FOLDER_DEFAULT;
  agentsRegistryDraft[index].agentSystemFolder =
    manifest.agentSystemFolder === null || manifest.agentSystemFolder === false
      ? null
      : manifest.agentSystemFolder || AGENT_SYSTEM_FOLDER_DEFAULT;
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
    const pathNode = row.querySelector("[data-agent-path]");
    if (nameNode && nameNode.value !== (agent.name || "")) {
      nameNode.value = agent.name || "";
    }
    if (commentNode && commentNode.value !== (agent.comment || "")) {
      commentNode.value = agent.comment || "";
    }
    const vaultUseNode = row.querySelector("[data-agent-vault-use]");
    const vaultNameNode = row.querySelector("[data-agent-vault-name]");
    if (vaultUseNode) {
      const vaultEnabled = agent.vaultFolder !== null;
      vaultUseNode.checked = vaultEnabled;
      vaultUseNode.disabled = !agent.manifestFound;
      if (vaultNameNode) vaultNameNode.hidden = !vaultEnabled;
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
    nameInput.placeholder = "Сохраняется в awn-agent.json";
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
    pathStatusNode.setAttribute("aria-label", "Статус awn-agent.json");
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
    commentInput.placeholder = "Сохраняется в awn-agent.json";
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

    const vaultUseLabel = document.createElement("label");
    vaultUseLabel.className = "agents-registry-vault-use";
    const vaultUseInput = document.createElement("input");
    vaultUseInput.type = "checkbox";
    vaultUseInput.dataset.agentVaultUse = "1";
    vaultUseInput.checked = agent.vaultFolder !== null;
    vaultUseInput.disabled = !agent.manifestFound;
    vaultUseInput.title = `Использовать скрытую папку ${VAULT_FOLDER_DEFAULT} в workspace`;
    const vaultUseText = document.createElement("span");
    vaultUseText.textContent = "Использовать папку";
    vaultUseLabel.append(vaultUseInput, vaultUseText);

    const vaultNameNode = document.createElement("span");
    vaultNameNode.className = "agents-registry-vault-name";
    vaultNameNode.dataset.agentVaultName = "1";
    vaultNameNode.textContent = VAULT_FOLDER_DEFAULT;
    vaultNameNode.title = "Имя папки фиксировано";
    vaultNameNode.hidden = agent.vaultFolder === null;

    vaultUseInput.addEventListener("change", () => {
      agentsRegistryDraft[index].vaultFolder = vaultUseInput.checked ? VAULT_FOLDER_DEFAULT : null;
      vaultNameNode.hidden = !vaultUseInput.checked;
    });

    vaultControls.append(vaultUseLabel, vaultNameNode);

    const vaultHintText = "Скрыта в дереве, содержимое у корня.";

    const vaultField = document.createElement("div");
    vaultField.className = "agents-registry-field agents-registry-vault-field";

    const vaultLabelRow = document.createElement("div");
    vaultLabelRow.className = "agents-registry-vault-label-row";
    const vaultLabel = document.createElement("span");
    vaultLabel.className = "agents-registry-field-label";
    vaultLabel.textContent = "Vault";
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
      discovered.vaultFolder === null || discovered.vaultFolder === false
        ? null
        : VAULT_FOLDER_DEFAULT,
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
  agentsRegistryDiscoverListNode.innerHTML = `<div class="agents-registry-discover-status">Сканирование awn-agent.json…</div>`;
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
    agentsRegistryDiscoverListNode.innerHTML = `<div class="agents-registry-discover-status">awn-agent.json не найден</div>`;
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
          vaultFolder: vaultFolder === null ? null : VAULT_FOLDER_DEFAULT
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
    const wasOnLanding = appRootNode?.classList.contains("app-landing-view");
    const previousAgentId = activeAgentId;
    if (
      !wasOnLanding &&
      activeAgentId &&
      (!agentsCache.some((agent) => agent.id === activeAgentId) ||
        !getSelectableAgents().some((agent) => agent.id === activeAgentId))
    ) {
      activeAgentId = data.defaultAgentId || getSelectableAgents()[0]?.id || agentsCache[0]?.id || "main";
      localStorage.setItem(ACTIVE_AGENT_STORAGE_KEY, activeAgentId);
      syncAgentToUrl(activeAgentId);
    }
    renderAgentSelect();
    syncAgentPreview();
    closeAgentsRegistryModal();

    if (wasOnLanding) {
      renderAppLandingAgents();
      renderLandingSearchAgents();
    } else if (previousAgentId !== activeAgentId) {
      activePath = null;
      activeLabel = null;
      activeSystemFile = null;
      clearMediaSidecarEditor();
      showAgentHomeView();
      await loadSystemFiles();
    }
    if (!wasOnLanding && activeAgentId) {
      await refreshMenu();
    }
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
    { id: "mindmap", label: "Карта тем" },
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
    { id: "env", label: ".env" },
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
      { id: "external", label: "Многофайловая" },
      { id: "internal", label: "Однофайловая" },
      { id: "tabular", label: "Табличная" },
      { id: "inbox", label: "Входящие" },
      { id: "repository", label: "Репозиторий", disabled: true },
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
      { id: "media", label: "Медиа и документы" },
      { id: "temp", label: "Временные файлы" }
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
const NODE_MINDMAP_MODE = "mindmap";

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
  temp: "browser",
  scripts: "browser",
  artefacts: "browser",
  "node-preview": "asset",
  graph: "canvas",
  mindmap: "canvas"
};

function getNodeViewSurface(mode = activeContentMode) {
  return NODE_VIEW_SURFACE[mode] || "document";
}

const OVERVIEW_HERO_PROP_KEYS = new Set(["title", "awn-description", "summary", "awn-type"]);
const OVERVIEW_META_PROP_KEYS = [
  "awn-status",
  "awn-priority",
  "awn-load",
  "awn-memory",
  "awn-category",
  "awn-version",
  "awn-update",
  "awn-triggers",
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
let createModalAdoptFolder = false;
let currentMenuData = null;
let menuSearchQuery = "";
let menuViewMode = "tree";
let menuRefreshInFlight = false;
let agentWorkspaceView = loadAgentWorkspaceView();
let agentVaultSearchQuery = "";
let agentMapLinksResizeObserver = null;
let agentMap2LinksResizeObserver = null;
const menuCacheByAgent = new Map();
const menuAgentPanes = new Map();
const COLLAPSED_FOLDERS_STORAGE_KEY = "agentcms.collapsedFolders.v2";
const BOOKMARKS_STORAGE_KEY = "agentcms.bookmarks.v1";
const NODE_DEFAULT_VIEW_STORAGE_KEY = "agentcms.nodeDefaultView.v1";
const NODE_CONFIG_HEADER = "# Agent CMS — конфигурация\n";
const NODE_CONFIG_DEFAULT_LANDING_KEY = "default_landing_mode";
const CARDS_PREVIEW_ONLY_STORAGE_KEY = "agentcms.cardsPreviewOnly.v1";
const MENU_TREE_SETTINGS_STORAGE_KEY = "agentcms.menuTreeSettings.v1";
const PINNED_MENU_FOLDER_STORAGE_KEY = "agentcms.pinnedMenuFolder.v1";
const AGENT_GRAPH_SETTINGS_STORAGE_KEY = "agentcms.agentGraphSettings.v1";
const SIDEBAR_WIDTH_STORAGE_KEY = "agentcms.sidebarWidth.v1";
const SIDEBAR_WIDTH_DEFAULT = 280;
const SIDEBAR_WIDTH_MIN = 200;
const SIDEBAR_WIDTH_MAX = 520;
const SIDEBAR_WIDTH_STEP = 20;
const OVERVIEW_ACCORDION_STORAGE_KEY = "agentcms.overviewAccordions.v1";
const NODE_LAST_VIEWED_STORAGE_KEY = "agentcms.nodeLastViewed.v1";
const OVERVIEW_ACCORDION_GROUP_IDS = new Set(["memory", "main", "files", "children"]);
const collapsedFoldersByAgent = loadCollapsedFoldersByAgent();
const pinnedMenuFolderByAgent = loadPinnedMenuFoldersByAgent();
const bookmarkedPaths = loadBookmarks();
const menuTreeSettingsByAgent = loadMenuTreeSettingsByAgent();
const agentGraphSettingsByAgent = loadAgentGraphSettingsByAgent();
let menuCardsPreviewOnly = loadCardsPreviewOnly();
let contentSearchTimer = null;
let contentSearchRequestId = 0;
let landingSearchTimer = null;
let landingSearchRequestId = 0;
const LANDING_SEARCH_AGENTS_KEY = "agentcms.landingSearchAgents.v1";
const LANDING_AGENTS_VIEW_KEY = "agentcms.landingAgentsView.v1";
const NODE_OPEN_MEMORY_MODE = "internal";
const NODE_SETTINGS_MODE_IDS = new Set(["description", "configs", "env", "node-preview"]);
const NODE_SETTINGS_AUTO_MODE_IDS = new Set(["schedule", "heartbeat"]);
const NODE_MEMORY_MODE_IDS = new Set([
  "inbox",
  "artefacts",
  "repository",
  "external",
  "internal",
  "tabular",
  "external-db",
  "references",
  "volume",
  "media",
  "temp"
]);
const NODE_MEMORY_SUB_MODE_IDS = new Set([
  "repository",
  "external",
  "internal",
  "tabular",
  "external-db",
  "volume",
  "media",
  "temp"
]);
const NODE_SETTINGS_CLOSE_MODES = new Set(["description"]);
const NODE_MEMORY_CLOSE_MODES = new Set(["external", "internal", "tabular", "media", "temp"]);
const NODE_WORKSPACE_DOMAIN_OVERVIEW = "overview";
const NODE_WORKSPACE_DOMAIN_SETTINGS = "settings";
const NODE_WORKSPACE_DOMAIN_INBOX = "inbox";
const NODE_WORKSPACE_DOMAIN_MEMORY = "memory";
const NODE_WORKSPACE_DOMAIN_SCRIPTS = "scripts";
const NODE_WORKSPACE_DOMAIN_TODO = "todo";
const NODE_WORKSPACE_DOMAIN_REFERENCES = "references";
const NODE_WORKSPACE_DOMAIN_ARTEFACTS = "artefacts";
const NODE_WORKSPACE_DOMAIN_NAVIGATION = "navigation";

const NODE_WORKSPACE_DOMAIN_BRANCH_PREFIX = "|- ";
const NODE_WORKSPACE_DOMAIN_SPECS = [
  { value: "navigation", label: "Навигация" },
  { value: "settings", label: "Настройки", branch: true },
  { value: "inbox", label: "Входящие", branch: true },
  { value: "references", label: "Источники", branch: true },
  { value: "artefacts", label: "Артефакты", branch: true },
  { value: "memory", label: "Память (данные)", branch: true },
  { value: "scripts", label: "Скрипты", branch: true },
  { value: "todo", label: "TODO", branch: true },
  { value: "overview", label: "Обзор" }
];

const AREA_BLOCKED_CONTENT_MODES = new Set([
  "internal",
  "external",
  "tabular",
  "media",
  "temp",
  "inbox",
  "references",
  "artefacts"
]);

const AREA_BLOCKED_WORKSPACE_DOMAINS = new Set([
  NODE_WORKSPACE_DOMAIN_MEMORY,
  NODE_WORKSPACE_DOMAIN_INBOX,
  NODE_WORKSPACE_DOMAIN_REFERENCES,
  NODE_WORKSPACE_DOMAIN_ARTEFACTS
]);

const AREA_WORKSPACE_DOMAIN_SELECT_VALUES = ["memory", "inbox", "references", "artefacts"];

const nodeConfigCacheByPath = new Map();

function getNodeWorkspaceDomain(mode = activeContentMode) {
  if (mode === NODE_OVERVIEW_MODE) return NODE_WORKSPACE_DOMAIN_OVERVIEW;
  if (mode === NODE_NAVIGATION_MODE || mode === NODE_MINDMAP_MODE) return NODE_WORKSPACE_DOMAIN_NAVIGATION;
  if (isNodeSettingsSelectMode(mode)) return NODE_WORKSPACE_DOMAIN_SETTINGS;
  if (mode === "inbox") return NODE_WORKSPACE_DOMAIN_INBOX;
  if (mode === "scripts") return NODE_WORKSPACE_DOMAIN_SCRIPTS;
  if (mode === "todo") return NODE_WORKSPACE_DOMAIN_TODO;
  if (mode === "references") return NODE_WORKSPACE_DOMAIN_REFERENCES;
  if (mode === "artefacts") return NODE_WORKSPACE_DOMAIN_ARTEFACTS;
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
    domain === NODE_WORKSPACE_DOMAIN_SCRIPTS ||
    domain === NODE_WORKSPACE_DOMAIN_TODO ||
    domain === NODE_WORKSPACE_DOMAIN_REFERENCES ||
    domain === NODE_WORKSPACE_DOMAIN_ARTEFACTS ||
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
let sourceEditorResizeObserver = null;
let sourceEditorViewportResizeBound = false;
const EDITOR_LINE_NUMBERS_STORAGE_KEY = "agentcms.editorLineNumbers";
let editorLineNumbersEnabled = readStorageItem(EDITOR_LINE_NUMBERS_STORAGE_KEY) === "1";
const EDITOR_VIEW_MODE_STORAGE_KEY = "agentcms.editorViewMode";
const STORAGE_SECTIONS_PANEL_VISIBLE_KEY = "agentcms.storageSectionsPanelVisible";
const DOC_ASIDE_TAB_STORAGE_KEY = "agentcms.docAside.tab.v1";

const DOC_CONTENT_BLOCK_GROUPS = [
  {
    id: "structure",
    title: "Структура",
    blocks: [
      {
        id: "h2",
        label: "Заголовок H2",
        description: "Раздел второго уровня",
        text: "\n## Заголовок\n\nТекст раздела.\n\n"
      },
      {
        id: "h3",
        label: "Заголовок H3",
        description: "Подраздел",
        text: "\n### Подраздел\n\nТекст подраздела.\n\n"
      },
      {
        id: "hr",
        label: "Разделитель",
        description: "Горизонтальная линия",
        text: "\n---\n\n"
      }
    ]
  },
  {
    id: "text",
    title: "Текст",
    blocks: [
      {
        id: "paragraph",
        label: "Абзац",
        description: "Пустой блок для текста",
        text: "\n\nТекст...\n\n"
      },
      {
        id: "quote",
        label: "Цитата",
        description: "Выделенная цитата",
        text: "\n> Цитата\n\n"
      },
      {
        id: "note",
        label: "Примечание",
        description: "Короткое выделение",
        text: "\n> **Примечание:** текст\n\n"
      }
    ]
  },
  {
    id: "lists",
    title: "Списки",
    blocks: [
      {
        id: "ul",
        label: "Маркированный список",
        description: "Пункты с буллетами",
        text: "\n- пункт 1\n- пункт 2\n- пункт 3\n\n"
      },
      {
        id: "ol",
        label: "Нумерованный список",
        description: "Шаги или порядок",
        text: "\n1. пункт 1\n2. пункт 2\n3. пункт 3\n\n"
      },
      {
        id: "tasks",
        label: "Чеклист",
        description: "Задачи с галочками",
        text: "\n- [ ] Задача 1\n- [ ] Задача 2\n\n"
      }
    ]
  },
  {
    id: "code",
    title: "Код и таблицы",
    blocks: [
      {
        id: "codeblock",
        label: "Блок кода",
        description: "Многострочный код",
        text: "\n```\nкод\n```\n\n"
      },
      {
        id: "table",
        label: "Таблица",
        description: "2 колонки, шапка",
        text: "\n| Колонка | Колонка |\n| --- | --- |\n| ячейка | ячейка |\n\n"
      }
    ]
  },
  {
    id: "awn",
    title: "AWN",
    blocks: [
      {
        id: "awn-desc",
        label: "Краткое описание",
        description: "Превью + полный текст",
        text: "\n> [!AWN-DESC] Краткое описание для превью.\n\n---\n\nПолный текст ниже.\n\n"
      }
    ]
  }
];
const _savedEditorViewMode = readStorageItem(EDITOR_VIEW_MODE_STORAGE_KEY);
let editorViewMode = (_savedEditorViewMode === "preview" || _savedEditorViewMode === "source") ? _savedEditorViewMode : "source";
let externalViewMode = "table";
let mediaViewMode = "dashboard";
let activeMediaSectionFolder = null;
let activeExternalSectionFolder = null;
const FLAT_STORAGE_SECTION_MODES = new Set(["scripts", "inbox", "artefacts"]);
const activeFlatStorageSectionFolder = {
  scripts: null,
  inbox: null,
  artefacts: null
};

function loadStorageSectionsPanelVisible() {
  const raw = readStorageItem(STORAGE_SECTIONS_PANEL_VISIBLE_KEY);
  if (raw === "0" || raw === "false") return false;
  return true;
}

let storageSectionsPanelVisible = loadStorageSectionsPanelVisible();

function isStorageSectionsPanelVisible() {
  return storageSectionsPanelVisible;
}

function isFlatStorageSectionMode(mode = activeContentMode) {
  return FLAT_STORAGE_SECTION_MODES.has(mode);
}

function getActiveFlatStorageSectionFolder(mode = activeContentMode) {
  return isFlatStorageSectionMode(mode) ? activeFlatStorageSectionFolder[mode] : null;
}

function isStorageSectionFilterActive() {
  if (!isStorageSectionsPanelVisible()) return false;
  if (activeExternalSectionFolder || activeMediaSectionFolder) return true;
  return isFlatStorageSectionMode() && Boolean(getActiveFlatStorageSectionFolder());
}

function syncStorageSectionsPanelUi() {
  const visible = isStorageSectionsPanelVisible();
  if (storageSectionsPanelToggleNode) {
    storageSectionsPanelToggleNode.checked = visible;
  }
  for (const wrap of listViewContentNode.querySelectorAll(".media-list-view-wrap")) {
    wrap.classList.toggle("is-sections-panel-hidden", !visible);
  }
}

function setStorageSectionsPanelVisible(visible, { rerender = true, skipRouteSync = false } = {}) {
  const next = Boolean(visible);
  if (next === storageSectionsPanelVisible) {
    syncStorageSectionsPanelUi();
    return;
  }
  storageSectionsPanelVisible = next;
  try {
    localStorage.setItem(STORAGE_SECTIONS_PANEL_VISIBLE_KEY, next ? "1" : "0");
  } catch {
    // ignore quota / private mode
  }
  if (!next) {
    activeMediaSectionFolder = null;
    activeExternalSectionFolder = null;
    for (const mode of FLAT_STORAGE_SECTION_MODES) {
      activeFlatStorageSectionFolder[mode] = null;
    }
  }
  syncStorageSectionsPanelUi();
  if (rerender) {
    if (activeContentMode === "media" && !isMediaAssetEditing()) {
      rerenderMediaListViewBody();
    } else if (activeContentMode === "external" && !isExternalFileEditing()) {
      rerenderExternalListViewBody();
    } else if (isFlatStorageSectionMode() && isFlatStorageListMode()) {
      rerenderFlatStorageListViewBody(activeContentMode);
    } else {
      renderListViewContent();
    }
  }
  if (!skipRouteSync) {
    syncAppRouteToUrl({ replace: true });
  }
}
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
let activeMediaMarkdownPath = null;
let systemFilesCache = [];
const modeContentCache = {
  description: "",
  internal: "",
  external: "",
  tabular: "",
  inbox: "",
  references: "",
  artefacts: "",
  media: "",
  configs: "",
  env: "",
  scripts: "",
  temp: "",
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
    // ignore malformed storage
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

function loadPinnedMenuFoldersByAgent() {
  const byAgent = {};
  try {
    const raw = readStorageItem(PINNED_MENU_FOLDER_STORAGE_KEY);
    if (!raw) return byAgent;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return byAgent;
    for (const [agentId, folderPath] of Object.entries(parsed)) {
      if (typeof folderPath !== "string" || !folderPath.trim()) continue;
      byAgent[agentId] = normalizeFolderPath(folderPath);
    }
  } catch {
    return byAgent;
  }
  return byAgent;
}

function savePinnedMenuFoldersByAgent() {
  try {
    const payload = {};
    for (const [agentId, folderPath] of Object.entries(pinnedMenuFolderByAgent)) {
      if (!folderPath) continue;
      payload[agentId] = folderPath;
    }
    localStorage.setItem(PINNED_MENU_FOLDER_STORAGE_KEY, JSON.stringify(payload));
    const maxAge = 60 * 60 * 24 * 400;
    document.cookie = `agentcms_pinned_branch=${encodeURIComponent(JSON.stringify(payload))}; path=/; max-age=${maxAge}; SameSite=Lax`;
  } catch {
    // Ignore storage write issues
  }
}

function getPinnedMenuFolder(agentId = activeAgentId) {
  return pinnedMenuFolderByAgent[agentId] || null;
}

function setPinnedMenuFolder(folderPath, agentId = activeAgentId) {
  const normalized = folderPath ? normalizeFolderPath(folderPath) : null;
  if (normalized) pinnedMenuFolderByAgent[agentId] = normalized;
  else delete pinnedMenuFolderByAgent[agentId];
  savePinnedMenuFoldersByAgent();
}

function isFolderInPinnedBranch(folderPath, pinnedPath) {
  const folder = normalizeFolderPath(folderPath || ".");
  const pinned = normalizeFolderPath(pinnedPath || ".");
  if (pinned === ".") return true;
  // Корень агента всегда развёрнут — иначе вся закреплённая ветка скрыта.
  if (folder === ".") return true;
  if (folder === pinned) return true;
  if (folder.startsWith(`${pinned}/`)) return true;
  if (pinned.startsWith(`${folder}/`)) return true;
  return false;
}

function getPinnedMenuFolderForTree(agentId = activeAgentId) {
  if (menuSearchQuery.trim()) return null;
  return getPinnedMenuFolder(agentId);
}

function isMenuItemInPinnedBranch(itemPath, pinnedPath) {
  const pinned = normalizeFolderPath(pinnedPath || ".");
  if (pinned === ".") return true;
  const normalizedPath = normalizeMenuNodePath(itemPath);
  const folder = normalizeFolderPath(getFolderPathFromManifest(normalizedPath) || ".");
  if (folder === pinned || folder.startsWith(`${pinned}/`)) return true;
  return false;
}

function expandPinnedFolderPathChain(folderPath, agentId = activeAgentId) {
  const collapsed = getAgentCollapsedFolders(agentId);
  const normalized = normalizeFolderPath(folderPath || ".");
  collapsed.delete(".");
  if (normalized === ".") return;
  const parts = normalized.split("/").filter(Boolean);
  let acc = "";
  for (const part of parts) {
    acc = acc ? `${acc}/${part}` : part;
    collapsed.delete(acc);
  }
}

function getActiveMenuFolderPath(agentId = activeAgentId) {
  if (!activePath || agentId !== activeAgentId) return null;
  const normalized = normalizeMenuNodePath(activePath);
  if (isNodeManifestPath(normalized)) {
    return normalizeFolderPath(getFolderPathFromManifest(normalized) || ".");
  }
  const parts = normalized.split("/").filter(Boolean);
  parts.pop();
  return normalizeFolderPath(parts.join("/") || ".");
}

function formatPinnedBranchLabel(folderPath, agentId = activeAgentId) {
  const normalized = normalizeFolderPath(folderPath || ".");
  if (normalized === ".") return getAgentTreeTitle(agentId);
  return formatCreateParentLabel(normalized);
}

function applyPinnedBranchCollapse(agentId = activeAgentId) {
  const pinned = getPinnedMenuFolder(agentId);
  if (!pinned || menuSearchQuery.trim()) return;

  const collapsed = getAgentCollapsedFolders(agentId);
  const folderPaths = getMenuTreeFolderPaths(agentId);
  const paths = new Set([".", ...folderPaths]);
  const serviceFolder = getActiveAgentSystemFolder(agentId);
  const pinInService = serviceFolder && isPinnedInsideServiceFolder(agentId);

  expandPinnedFolderPathChain(pinned, agentId);

  for (const path of paths) {
    if (isFolderInPinnedBranch(path, pinned)) {
      collapsed.delete(path);
    } else {
      collapsed.add(path);
    }
  }

  for (const path of Array.from(collapsed)) {
    if (isFolderInPinnedBranch(path, pinned)) {
      collapsed.delete(path);
    }
  }

  if (serviceFolder) {
    localStorage.setItem("agentcms.serviceTree.collapsed.v1", pinInService ? "0" : "1");
  }

  saveCollapsedFoldersByAgent();
}

function pinMenuBranch(folderPath, agentId = activeAgentId) {
  const normalized = normalizeFolderPath(folderPath || ".");
  setPinnedMenuFolder(normalized, agentId);
  applyPinnedBranchCollapse(agentId);
  const menu = menuCacheByAgent.get(agentId) || (agentId === activeAgentId ? currentMenuData : null);
  if (menu) {
    renderMenu(menu, agentId, { menuOnly: true });
    if (agentId === activeAgentId) updateActiveButton();
  }
  syncMenuPinBranchUi(agentId);
  if (agentId === activeAgentId) scrollPinnedFolderIntoView(agentId);
  showToast(`Ветка «${formatPinnedBranchLabel(normalized, agentId)}» закреплена`, "success");
}

function unpinMenuBranch(agentId = activeAgentId) {
  if (!getPinnedMenuFolder(agentId)) return;
  setPinnedMenuFolder(null, agentId);
  syncMenuPinBranchUi(agentId);
  const menu = menuCacheByAgent.get(agentId) || (agentId === activeAgentId ? currentMenuData : null);
  if (menu && agentId === activeAgentId) {
    renderMenu(menu, agentId, { menuOnly: true });
    updateActiveButton();
  }
  showToast("Ветка откреплена", "success");
}

function togglePinMenuBranch(folderPath, agentId = activeAgentId) {
  const normalized = normalizeFolderPath(folderPath || ".");
  if (getPinnedMenuFolder(agentId) === normalized) unpinMenuBranch(agentId);
  else pinMenuBranch(normalized, agentId);
}

function scrollPinnedFolderIntoView(agentId = activeAgentId) {
  const pinned = getPinnedMenuFolder(agentId);
  if (!pinned || !menuNode) return;
  requestAnimationFrame(() => {
    const selector = `.menu-section[data-menu-folder="${CSS.escape(pinned)}"]`;
    const section = menuNode.querySelector(selector);
    section?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  });
}

function syncMenuPinBranchUi(agentId = activeAgentId) {
  const pinned = getPinnedMenuFolder(agentId);
  const canPin =
    agentId === activeAgentId &&
    menuViewMode === "tree" &&
    !menuSearchQuery.trim() &&
    Boolean(currentMenuData);
  const activeFolder = getActiveMenuFolderPath(agentId);
  const pinnedLabel = pinned ? formatPinnedBranchLabel(pinned, agentId) : "";

  if (menuPinBranchBtn) {
    menuPinBranchBtn.disabled = !canPin;
    menuPinBranchBtn.setAttribute("aria-pressed", pinned ? "true" : "false");
    menuPinBranchBtn.classList.toggle("is-active", Boolean(pinned));
    menuPinBranchBtn.textContent = pinned ? "📌" : "📍";
    menuPinBranchBtn.title = pinned
      ? `Открепить: ${pinnedLabel}`
      : activeFolder
        ? `Закрепить ветку «${formatPinnedBranchLabel(activeFolder, agentId)}»`
        : "Закрепить ветку (откройте тему в дереве)";
  }

  if (menuPinnedBannerNode) {
    menuPinnedBannerNode.classList.toggle("hidden", !pinned || agentId !== activeAgentId);
  }
  if (menuPinnedBannerPathNode) {
    menuPinnedBannerPathNode.textContent = pinnedLabel;
  }

  if (menuPinnedStatusNode) {
    menuPinnedStatusNode.textContent = pinned
      ? `Закреплено: ${pinnedLabel}`
      : "Ветка не закреплена";
  }
  if (menuPinCurrentBtn) {
    menuPinCurrentBtn.disabled = !canPin || !activeFolder;
  }
  if (menuUnpinBranchBtn) {
    menuUnpinBranchBtn.hidden = !pinned;
  }

  if (menuNode) {
    menuNode.classList.toggle("menu-has-pinned-branch", Boolean(pinned && agentId === activeAgentId));
  }
}

function createMenuPinBranchButton(folderPath, agentId = activeAgentId) {
  const normalized = normalizeFolderPath(folderPath || ".");
  const pinned = getPinnedMenuFolder(agentId);
  const isPinned = pinned === normalized;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "menu-pin-branch-btn";
  if (isPinned) btn.classList.add("is-active");
  btn.textContent = isPinned ? "📌" : "📍";
  btn.title = isPinned ? "Открепить ветку" : "Закрепить ветку";
  btn.setAttribute("aria-label", isPinned ? "Открепить ветку" : "Закрепить ветку");
  btn.setAttribute("aria-pressed", isPinned ? "true" : "false");
  btn.addEventListener("click", (event) => {
    event.stopPropagation();
    togglePinMenuBranch(normalized, agentId);
  });
  return btn;
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

function isValidNodeDefaultLandingMode(mode, nodePath = null) {
  if (!mode || mode === "graph") return false;
  if (isAreaContentModeBlocked(mode, nodePath ?? getResolvedNodePath(activePath))) return false;
  if (mode === NODE_OVERVIEW_MODE || mode === NODE_NAVIGATION_MODE || mode === NODE_MINDMAP_MODE) return true;
  if (mode === "inbox" || mode === "references" || mode === "artefacts" || mode === "scripts" || mode === "todo") {
    return true;
  }
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
  if (mode === NODE_MINDMAP_MODE) return "Карта тем";
  for (const group of getAllModeGroups()) {
    const match = (group.modes || []).find((item) => item.id === mode);
    if (match) return match.label;
  }
  if (mode === "inbox") return "Входящие";
  if (mode === "scripts") return "Скрипты";
  if (mode === "todo") return "TODO";
  if (mode === "references") return "Источники";
  if (mode === "artefacts") return "Артефакты";
  return mode;
}

function getNodeDefaultLandingDomainLabel(mode) {
  const domain = getNodeWorkspaceDomain(mode);
  const domainLabel = getWorkspaceDomainLabelById(domain);
  const modeLabel = getContentModeLabel(mode);
  if (domain === NODE_WORKSPACE_DOMAIN_OVERVIEW || domain === NODE_WORKSPACE_DOMAIN_NAVIGATION) return domainLabel;
  if (
    domain === NODE_WORKSPACE_DOMAIN_INBOX ||
    domain === NODE_WORKSPACE_DOMAIN_SCRIPTS ||
    domain === NODE_WORKSPACE_DOMAIN_TODO ||
    domain === NODE_WORKSPACE_DOMAIN_REFERENCES ||
    domain === NODE_WORKSPACE_DOMAIN_ARTEFACTS
  ) {
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
    btn.title = `Стартовая страница в ${BUNDLE_CONFIG_FILE} (${STORAGE_FOLDER_NAME}): ${getNodeDefaultLandingDomainLabel(saved.mode)}. Нажмите, чтобы сбросить (открывать обзор).`;
  } else if (hasCustom) {
    btn.title = `В конфиге: ${getNodeDefaultLandingDomainLabel(saved.mode)}. Нажмите, чтобы сохранить текущий раздел (${getNodeDefaultLandingDomainLabel(currentMode)}).`;
  } else {
    btn.title = `Закрепить в ${BUNDLE_CONFIG_FILE} (${STORAGE_FOLDER_NAME}): ${getNodeDefaultLandingDomainLabel(currentMode)}`;
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
    syncMenuPinBranchUi();
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

function markMenuSectionSortRow(sectionNode, node) {
  if (!sectionNode || !node) return;
  const folderRow = sectionNode.querySelector(":scope > .menu-folder-row");
  if (folderRow) {
    folderRow.dataset.sortName = getMenuTreeFolderSortKey(node);
  }
  const sectionRow = sectionNode.querySelector(":scope > .menu-section-row");
  if (sectionRow) {
    sectionRow.dataset.sortName = node.title || "";
  }
}

function appendAdoptFolderRowPinSpacer(row) {
  if (!row) return;
  const pinSpacer = document.createElement("span");
  pinSpacer.className = "menu-row-action-spacer menu-row-action-spacer--pin";
  pinSpacer.setAttribute("aria-hidden", "true");
  row.appendChild(pinSpacer);
}

function appendAdoptFolderRowTrailingActionSpacers(row, { showPinSlot = false } = {}) {
  if (!row) return;
  if (showPinSlot) {
    appendAdoptFolderRowPinSpacer(row);
  }
  for (let i = 0; i < 2; i += 1) {
    const spacer = document.createElement("span");
    spacer.className = "menu-row-action-spacer";
    spacer.setAttribute("aria-hidden", "true");
    row.appendChild(spacer);
  }
}

function prepareMenuSectionForSortContainer(sectionNode, node) {
  if (!sectionNode || !node) return;
  markMenuSectionSortRow(sectionNode, node);
  const adoptRow = sectionNode.querySelector(":scope > .menu-folder-row--adopt");
  if (adoptRow) return;
  const sectionRow = sectionNode.querySelector(":scope > .menu-section-row");
  if (!sectionRow || sectionRow.querySelector(".menu-row-action-spacer")) return;
  const actionSpacerCount = shouldOfferAreaAdopt(node) ? 2 : 3;
  for (let i = 0; i < actionSpacerCount; i += 1) {
    const spacer = document.createElement("span");
    spacer.className = "menu-row-action-spacer";
    spacer.setAttribute("aria-hidden", "true");
    sectionRow.appendChild(spacer);
  }
}

function shouldShowMenuTreeFolder(node, agentId = activeAgentId) {
  if (!node) return false;
  if (getMenuTreeSettings(agentId).showEmptyFolders) return true;
  if (node.empty) return false;
  if (node.indexPath || (node.items?.length > 0)) return true;
  return getOrderedMenuChildren(node).some((child) => {
    if (child.kind === "item") return true;
    if (child.kind === "folder") return child.entry && shouldShowMenuTreeFolder(child.entry, agentId);
    return true;
  });
}

function getVisibleMenuChildren(node, agentId = activeAgentId, parentSectionPath = ".", depth = 0) {
  const pinnedPath = getPinnedMenuFolderForTree(agentId);
  return getOrderedMenuChildren(node).filter((child) => {
    if (!child?.entry) return false;
    if (child.kind === "folder") {
      if (!shouldShowMenuTreeFolder(child.entry, agentId)) return false;
      if (pinnedPath) {
        const childFolderPath = resolveSectionFolderPath(child.entry, parentSectionPath, depth + 1);
        return isFolderInPinnedBranch(childFolderPath, pinnedPath);
      }
      return true;
    }
    if (pinnedPath) {
      return isMenuItemInPinnedBranch(child.entry.path, pinnedPath);
    }
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
    renderMenu(currentMenuData, activeAgentId, { menuOnly: true });
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

/** Область (Space): папка {Name}/README.x.md — без драйверов памяти. */
function isAreaNodePath(nodePath = getResolvedNodePath(activePath)) {
  return isContainerNodePath(nodePath);
}

function isAreaContentModeBlocked(mode, nodePath = getResolvedNodePath(activePath)) {
  return isAreaNodePath(nodePath) && AREA_BLOCKED_CONTENT_MODES.has(mode);
}

function isMemoryDriverModeBlockedForActivePath(mode) {
  return isAreaContentModeBlocked(mode);
}

function isNodeSettingsTargetPath(nodePath) {
  return isNodeMdPath(nodePath);
}

async function selectNodeManifest(label, filePath, contentMode, options = {}) {
  if (contentMode) {
    applyContentModeState(contentMode);
  }
  await selectFile(label, filePath);
  if (contentMode && !options.skipRouteSync) {
    syncAppRouteToUrl({ replace: true });
  }
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

async function openNodeFromMenu(label, filePath, options = {}) {
  try {
    await loadNodeConfig(filePath);
  } catch {
    // ignore config read errors — fallback to navigation
  }
  const forcedMode = options.contentMode;
  if (forcedMode && isValidNodeDefaultLandingMode(forcedMode, filePath)) {
    await selectNodeManifest(label, filePath, forcedMode);
  } else {
    const defaultView = getNodeDefaultView(filePath);
    if (defaultView?.mode && isValidNodeDefaultLandingMode(defaultView.mode, filePath)) {
      const landingMode =
        isContainerNodePath(filePath) && isAreaContentModeBlocked(defaultView.mode, filePath)
          ? NODE_NAVIGATION_MODE
          : defaultView.mode;
      await selectNodeManifest(label, filePath, landingMode);
    } else {
      await openNodeNavigation(label, filePath);
    }
  }
  if (!options.skipRouteSync) {
    syncAppRouteToUrl({ push: true });
  }
}

async function openNodeMemory(label, filePath) {
  await openNodeMemoryWorkspace(label, filePath);
}

async function openNodeMemoryWorkspace(label, filePath) {
  if (isAreaNodePath(filePath)) {
    await openNodeNavigation(label, filePath);
    return;
  }
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

function syncNodeNavigationSubsectionSelect() {
  if (!nodeNavigationSubsectionSelectNode) return;
  nodeNavigationSubsectionSelectNode.value = isMindmapModeActive() ? NODE_MINDMAP_MODE : "subsections";
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

function getWorkspaceDomainDisplayLabel(label, branch = false) {
  return branch ? `${NODE_WORKSPACE_DOMAIN_BRANCH_PREFIX}${label}` : label;
}

function getWorkspaceDomainLabelById(domain) {
  const spec = NODE_WORKSPACE_DOMAIN_SPECS.find((item) => item.value === domain);
  if (!spec) return domain;
  return getWorkspaceDomainDisplayLabel(spec.label, spec.branch);
}

function initNodeWorkspaceDomainSelect() {
  if (!nodeWorkspaceDomainSelectNode) return;
  nodeWorkspaceDomainSelectNode.replaceChildren(
    ...NODE_WORKSPACE_DOMAIN_SPECS.map(({ value, label, branch }) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = getWorkspaceDomainDisplayLabel(label, branch);
      return option;
    })
  );
}

function syncNodeWorkspaceDomainSelect() {
  if (!nodeWorkspaceDomainSelectNode) return;
  const isArea = isAreaNodePath();
  for (const value of AREA_WORKSPACE_DOMAIN_SELECT_VALUES) {
    const option = nodeWorkspaceDomainSelectNode.querySelector(`option[value="${value}"]`);
    if (option) option.disabled = isArea;
  }
  const domain = getNodeWorkspaceDomain(activeContentMode);
  if (isArea && AREA_BLOCKED_WORKSPACE_DOMAINS.has(domain)) {
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
  if (isAreaNodePath() && AREA_BLOCKED_WORKSPACE_DOMAINS.has(domain)) {
    returnToNodeNavigation();
    return;
  }
  if (domain === NODE_WORKSPACE_DOMAIN_INBOX) {
    nodeMemoryViewActive = true;
    nodeSettingsViewActive = false;
    setContentMode("inbox");
    return;
  }
  if (domain === NODE_WORKSPACE_DOMAIN_SCRIPTS) {
    nodeMemoryViewActive = false;
    nodeSettingsViewActive = false;
    setContentMode("scripts");
    return;
  }
  if (domain === NODE_WORKSPACE_DOMAIN_TODO) {
    nodeMemoryViewActive = false;
    nodeSettingsViewActive = false;
    setContentMode("todo");
    return;
  }
  if (domain === NODE_WORKSPACE_DOMAIN_MEMORY) {
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
  if (domain === NODE_WORKSPACE_DOMAIN_ARTEFACTS) {
    nodeMemoryViewActive = true;
    nodeSettingsViewActive = false;
    setContentMode("artefacts");
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
  const scriptsDomain = workspaceDomain === NODE_WORKSPACE_DOMAIN_SCRIPTS;
  const todoDomain = workspaceDomain === NODE_WORKSPACE_DOMAIN_TODO;
  const referencesDomain = workspaceDomain === NODE_WORKSPACE_DOMAIN_REFERENCES;
  const artefactsDomain = workspaceDomain === NODE_WORKSPACE_DOMAIN_ARTEFACTS;
  const navigationDomain = workspaceDomain === NODE_WORKSPACE_DOMAIN_NAVIGATION;
  const inboxDomain = workspaceDomain === NODE_WORKSPACE_DOMAIN_INBOX;
  const showWorkspaceDomainControls = isNodeWorkspaceToolbarDomainActive();
  nodeSettingsViewActive = settingsDomain;
  nodeMemoryViewActive = memoryDomain || referencesDomain || artefactsDomain || inboxDomain;
  workspacePathHeaderNode?.classList.toggle("is-node-settings", settingsDomain);
  workspacePathHeaderNode?.classList.toggle("is-node-memory", memoryDomain || inboxDomain);
  workspacePathHeaderNode?.classList.toggle("is-node-scripts", scriptsDomain);
  workspacePathHeaderNode?.classList.toggle("is-node-todo", todoDomain);
  workspacePathHeaderNode?.classList.toggle("is-node-references", referencesDomain);
  workspacePathHeaderNode?.classList.toggle("is-node-artefacts", artefactsDomain);
  workspacePathHeaderNode?.classList.toggle("is-node-navigation", navigationDomain);
  workspacePathHeaderNode?.classList.toggle("is-node-overview", overviewDomain);
  nodeWorkspaceNavControlsNode?.classList.toggle("hidden", !showWorkspaceDomainControls);
  nodeNavigationPathControlsNode?.classList.toggle("hidden", !showWorkspaceDomainControls || !navigationDomain);
  syncNodeNavigationSubsectionSelect();
  nodeSettingsPathControlsNode?.classList.toggle("hidden", !showWorkspaceDomainControls || !settingsDomain);
  nodeMemoryPathControlsNode?.classList.toggle("hidden", !showWorkspaceDomainControls || !memoryDomain);
  syncNodeWorkspaceDomainSelect();
  if (
    isAreaNodePath() &&
    (AREA_BLOCKED_WORKSPACE_DOMAINS.has(getNodeWorkspaceDomain()) ||
      isAreaContentModeBlocked(activeContentMode))
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

function handleWorkspaceCloseClick() {
  if (isMediaAssetEditing()) {
    closeMediaSidecarEditor();
    return;
  }
  if (isExternalFileEditing()) {
    closeExternalFileEditor();
    return;
  }
  returnToNodeNavigation();
}

function syncWorkspaceCloseButtonsVisibility() {
  const settingsDomain = getNodeWorkspaceDomain() === NODE_WORKSPACE_DOMAIN_SETTINGS;
  const memoryDomain = getNodeWorkspaceDomain() === NODE_WORKSPACE_DOMAIN_MEMORY;
  const scriptsDomain = getNodeWorkspaceDomain() === NODE_WORKSPACE_DOMAIN_SCRIPTS;
  const todoDomain = getNodeWorkspaceDomain() === NODE_WORKSPACE_DOMAIN_TODO;
  const mediaSidecarEditing = isMediaAssetEditing();
  const externalEditing = isExternalFileEditing();
  const showClose =
    mediaSidecarEditing ||
    externalEditing ||
    (settingsDomain && NODE_SETTINGS_CLOSE_MODES.has(activeContentMode)) ||
    (memoryDomain && NODE_MEMORY_CLOSE_MODES.has(activeContentMode)) ||
    (scriptsDomain && activeContentMode === "scripts") ||
    (todoDomain && activeContentMode === "todo");
  nodeWorkspaceCloseBtn?.classList.toggle("hidden", !showClose);

  const backToList = mediaSidecarEditing || externalEditing;
  const labelNode = nodeWorkspaceCloseBtn?.querySelector(".workspace-toolbar-btn-label");
  if (labelNode) {
    labelNode.textContent = backToList ? "К списку" : "Закрыть";
  }
  if (nodeWorkspaceCloseBtn) {
    nodeWorkspaceCloseBtn.title = backToList
      ? "Вернуться к списку"
      : "Закрыть — вернуться к навигации";
    nodeWorkspaceCloseBtn.setAttribute("aria-label", backToList ? "К списку" : "Закрыть");
  }
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

function createSkillMarkerSvg() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("class", "menu-marker-svg");
  svg.setAttribute("aria-hidden", "true");

  const doc = document.createElementNS("http://www.w3.org/2000/svg", "path");
  doc.setAttribute(
    "d",
    "M8 3h7l4 4v14H8V3z"
  );
  doc.setAttribute("fill", "none");
  doc.setAttribute("stroke", "currentColor");
  doc.setAttribute("stroke-width", "2");
  doc.setAttribute("stroke-linejoin", "round");

  const fold = document.createElementNS("http://www.w3.org/2000/svg", "path");
  fold.setAttribute("d", "M15 3v4h4");
  fold.setAttribute("fill", "none");
  fold.setAttribute("stroke", "currentColor");
  fold.setAttribute("stroke-width", "2");
  fold.setAttribute("stroke-linejoin", "round");

  const spark = document.createElementNS("http://www.w3.org/2000/svg", "path");
  spark.setAttribute(
    "d",
    "M11.5 12.5 13 9l1.5 3.5L18 14l-3.5 1.5L13 19l-1.5-3.5L8 14z"
  );
  spark.setAttribute("fill", "currentColor");
  spark.setAttribute("opacity", "0.92");

  svg.append(doc, fold, spark);
  return svg;
}

function createAgentMarkerIcon() {
  const icon = document.createElement("span");
  icon.className = "menu-marker-emoji menu-marker-emoji-agent";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = "🤖";
  return icon;
}

function createFolderMarkers(source, { skipAgent = false } = {}) {
  const hasGit = Boolean(source?.hasGitSelf ?? source?.hasGit);
  const hasObsidian = Boolean(source?.hasObsidianSelf ?? source?.hasObsidian);
  const hasAgent = !skipAgent && Boolean(source?.hasAgentSelf ?? source?.hasAgent);
  const hasSkill = Boolean(source?.hasSkillSelf ?? source?.hasSkill);
  if (!hasAgent && !hasGit && !hasObsidian && !hasSkill) return null;

  const wrap = document.createElement("span");
  wrap.className = "menu-folder-markers";

  if (hasAgent) {
    const agent = document.createElement("span");
    agent.className = "menu-marker menu-marker-agent";
    agent.title = "AWN-агент (awn-agent.json в этой папке)";
    agent.setAttribute("aria-label", "Agent");
    agent.appendChild(createAgentMarkerIcon());
    wrap.appendChild(agent);
  }
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
  if (hasSkill) {
    const skill = document.createElement("span");
    skill.className = "menu-marker menu-marker-skill";
    skill.title = "Cursor Skill (SKILL.md в этой папке)";
    skill.setAttribute("aria-label", "Skill");
    skill.appendChild(createSkillMarkerSvg());
    wrap.appendChild(skill);
  }

  return wrap;
}

function setMenuLabelWithMarkers(host, labelText, source, nameClass = "menu-folder-name", options = {}) {
  host.replaceChildren();
  const labelWrap = document.createElement("span");
  labelWrap.className = "menu-folder-label";
  const markers = createFolderMarkers(source, { skipAgent: Boolean(options.skipAgentMarker) });
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

function isAsyncOverviewRenderMode(mode = activeContentMode) {
  return mode === NODE_NAVIGATION_MODE || mode === NODE_OVERVIEW_MODE;
}

function contentLoadingVariantForMode(mode = activeContentMode) {
  if (isAsyncOverviewRenderMode(mode)) return "navigation";
  if (
    mode === "description" ||
    mode === "internal" ||
    mode === "configs" ||
    mode === "env" ||
    mode === "scripts" ||
    mode === "todo"
  ) {
    return "editor";
  }
  return "default";
}

function showContentLoading() {
  // Центральный оверлей загрузки отключён — контент обновляется без анимации.
}

function hideContentLoading() {
  if (!contentLoadingNode) return;
  contentLoadingNode.classList.add("hidden");
  contentLoadingNode.setAttribute("aria-busy", "false");
  docSlabMainNode?.classList.remove("is-content-loading");
}

function setLoading(message) {
  showContentLoading({
    variant: contentLoadingVariantForMode(),
    message: message || "Загрузка…"
  });
  fileContentInputNode.value = "";
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

async function openContentSearchResult(result, { agentId = null } = {}) {
  if (!result) return;

  if (agentId && agentId !== activeAgentId) {
    await switchActiveAgent(agentId);
  }

  hideContentSearchResults();
  hideLandingSearchResults();
  contentSearchInputNode?.blur();
  appLandingSearchInputNode?.blur();

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

function getLandingSearchScope() {
  const scope = appLandingSearchScopeNode?.value || "content";
  return scope === "filename" ? "filename" : "content";
}

function getLandingSearchMinLength(scope = getLandingSearchScope()) {
  return scope === "filename" ? 1 : 2;
}

function updateLandingSearchPlaceholder() {
  if (!appLandingSearchInputNode) return;
  const scope = getLandingSearchScope();
  appLandingSearchInputNode.placeholder =
    scope === "filename" ? "Поиск по названию файла..." : "Поиск по содержимому...";
}

function hideLandingSearchResults() {
  appLandingSearchResultsNode?.classList.add("hidden");
  appLandingSearchInputNode?.setAttribute("aria-expanded", "false");
}

function readLandingSearchSelectedAgentIdsFromStorage(allIds) {
  try {
    const raw = localStorage.getItem(LANDING_SEARCH_AGENTS_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (!Array.isArray(saved)) return null;
    return allIds.filter((id) => saved.includes(id));
  } catch {
    return null;
  }
}

function getLandingSearchSelectedAgentIds() {
  const agents = getAgentsForLandingGrid();
  const allIds = agents.map((agent) => agent.id);
  const fromStorage = readLandingSearchSelectedAgentIdsFromStorage(allIds);
  if (fromStorage !== null) return fromStorage;
  return agents.filter(isAgentRegistryActive).map((agent) => agent.id);
}

function saveLandingSearchSelectedAgentIds(ids) {
  localStorage.setItem(LANDING_SEARCH_AGENTS_KEY, JSON.stringify(ids));
}

function setLandingSearchAgentSelection(ids) {
  saveLandingSearchSelectedAgentIds(ids);
  renderLandingSearchAgents();
  scheduleLandingSearch();
}

function renderLandingSearchAgents() {
  if (!appLandingSearchAgentsNode) return;
  appLandingSearchAgentsNode.replaceChildren();

  const agents = getAgentsForLandingGrid();
  if (agents.length === 0) {
    const empty = document.createElement("p");
    empty.className = "app-landing-search-empty-agents";
    empty.textContent = "Нет агентов в реестре";
    appLandingSearchAgentsNode.appendChild(empty);
    return;
  }

  const selected = new Set(getLandingSearchSelectedAgentIds());

  for (const agent of agents) {
    const registryActive = isAgentRegistryActive(agent);
    const label = document.createElement("label");
    label.className = `app-landing-search-agent${registryActive ? "" : " is-inactive"}`;
    label.title = registryActive ? agent.path || agent.id : "Агент выключен в реестре";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = selected.has(agent.id);
    checkbox.addEventListener("change", () => {
      const next = new Set(getLandingSearchSelectedAgentIds());
      if (checkbox.checked) next.add(agent.id);
      else next.delete(agent.id);
      saveLandingSearchSelectedAgentIds([...next]);
      scheduleLandingSearch();
    });

    const nameNode = document.createElement("span");
    nameNode.className = "app-landing-search-agent-name";
    nameNode.textContent = agent.name || agent.id;

    label.appendChild(checkbox);
    label.appendChild(nameNode);

    if (agent.id !== (agent.name || "")) {
      const idNode = document.createElement("span");
      idNode.className = "app-landing-search-agent-id";
      idNode.textContent = agent.id;
      label.appendChild(idNode);
    }

    appLandingSearchAgentsNode.appendChild(label);
  }
}

function renderLandingSearchResults(data) {
  if (!appLandingSearchResultsNode) return;
  const query = data?.query || "";
  const scope = data?.scope || getLandingSearchScope();
  const results = Array.isArray(data?.results) ? data.results : [];
  const minLength = getLandingSearchMinLength(scope);
  const selectedCount = getLandingSearchSelectedAgentIds().length;

  appLandingSearchResultsNode.innerHTML = "";

  if (selectedCount === 0) {
    appLandingSearchResultsNode.innerHTML =
      `<div class="content-search-hint">Отметьте хотя бы одного агента</div>`;
    appLandingSearchResultsNode.classList.remove("hidden");
    appLandingSearchInputNode?.setAttribute("aria-expanded", "true");
    return;
  }

  if (query.length < minLength) {
    const hint =
      minLength === 1 ? "Введите текст для поиска" : "Введите минимум 2 символа";
    appLandingSearchResultsNode.innerHTML = `<div class="content-search-hint">${hint}</div>`;
    appLandingSearchResultsNode.classList.remove("hidden");
    appLandingSearchInputNode?.setAttribute("aria-expanded", "true");
    return;
  }

  if (results.length === 0) {
    appLandingSearchResultsNode.innerHTML = `<div class="content-search-empty">Ничего не найдено</div>`;
    appLandingSearchResultsNode.classList.remove("hidden");
    appLandingSearchInputNode?.setAttribute("aria-expanded", "true");
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

    if (item.agentName || item.agentId) {
      const agentBadge = document.createElement("span");
      agentBadge.className = "content-search-item-badge content-search-item-badge--agent";
      agentBadge.textContent = item.agentName || item.agentId;
      titleRow.appendChild(agentBadge);
    }

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
      void openContentSearchResult(item, { agentId: item.agentId });
    });
    appLandingSearchResultsNode.appendChild(btn);
  }

  appLandingSearchResultsNode.classList.remove("hidden");
  appLandingSearchInputNode?.setAttribute("aria-expanded", "true");
}

async function fetchLandingGlobalSearch(query, scope = getLandingSearchScope()) {
  const agentIds = getLandingSearchSelectedAgentIds();
  const params = { q: query, scope, limit: 50 };
  if (agentIds.length) params.agents = agentIds.join(",");
  const response = await fetch(buildApiUrl("/api/search/global", params));
  if (!response.ok) throw new Error(`Request failed with ${response.status}`);
  return response.json();
}

function scheduleLandingSearch() {
  if (!appLandingSearchInputNode) return;
  const query = appLandingSearchInputNode.value.trim();
  const scope = getLandingSearchScope();
  const minLength = getLandingSearchMinLength(scope);
  clearTimeout(landingSearchTimer);
  const requestId = ++landingSearchRequestId;

  if (!query) {
    hideLandingSearchResults();
    return;
  }

  landingSearchTimer = setTimeout(async () => {
    if (query.length < minLength || getLandingSearchSelectedAgentIds().length === 0) {
      renderLandingSearchResults({ query, scope, results: [] });
      return;
    }

    try {
      const data = await fetchLandingGlobalSearch(query, scope);
      if (requestId !== landingSearchRequestId) return;
      renderLandingSearchResults(data);
    } catch {
      if (requestId !== landingSearchRequestId) return;
      appLandingSearchResultsNode.innerHTML = `<div class="content-search-empty">Ошибка поиска</div>`;
      appLandingSearchResultsNode.classList.remove("hidden");
    }
  }, 280);
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
  if (isServiceNodePath(normalized)) return normalized;

  const vaultFolder = getActiveAgentVaultFolder(agentId);
  if (!useVault || !vaultFolder) return normalized;

  const vaultLower = vaultFolder.toLowerCase();
  const normalizedLower = normalized.toLowerCase();
  if (normalizedLower === vaultLower || normalizedLower.startsWith(`${vaultLower}/`)) {
    return normalized;
  }
  if (isInsideGitRepoVaultPath(normalized, agentId)) return normalized;

  if (isGitRepoMenuFolder(normalized, agentId)) {
    return normalized === "." ? vaultFolder : `${normalized}/${vaultFolder}`;
  }

  if (normalized === ".") return vaultFolder;
  return `${vaultFolder}/${normalized}`;
}

function isMenuRenderInServiceTree(parentEl) {
  return Boolean(parentEl?.closest?.(".menu-service-section"));
}

function resolveServiceTreeFolderPath(folderPath, agentId = activeAgentId) {
  const raw = String(folderPath || "").replace(/\\/g, "/").trim();
  if (!raw || raw === ".") return ".";
  if (isServiceNodePath(raw)) return raw;
  const serviceFolder = getActiveAgentSystemFolder(agentId);
  if (!serviceFolder) return raw;
  return `${serviceFolder}/${raw}`.replace(/\/+/g, "/");
}

function shouldOfferAreaAdopt(node) {
  if (!node || node.indexPath) return false;
  return Boolean(String(node.folderPath || "").trim());
}

function resolveCreateModalParentPath(parentPath, options = {}) {
  const agentId = options.agentId || getCreateModalAgentId();
  const raw = String(options.folderPath || parentPath || ".").trim();
  if (options.inServiceTree || isMenuRenderInServiceTree(options.menuParentEl)) {
    return normalizeCreateParentPath(resolveServiceTreeFolderPath(raw, agentId));
  }
  return normalizeCreateParentPath(raw);
}

function getMenuTreeNodeByFolderPath(folderPath, agentId = getCreateModalAgentId()) {
  const menu = menuCacheByAgent.get(agentId) || (agentId === activeAgentId ? currentMenuData : null);
  if (!menu) return null;
  const normalized = normalizeCreateParentPath(folderPath || ".");
  if (normalized === ".") {
    return { hasGitSelf: Boolean(menu.hasGitSelf) };
  }
  const hit = findMenuTreeNodeByFolderPath({ title: getAgentTreeTitle(agentId), ...menu }, normalized, ".", 0);
  return hit?.node || null;
}

function isGitRepoMenuFolder(folderPath, agentId = getCreateModalAgentId()) {
  return Boolean(getMenuTreeNodeByFolderPath(folderPath, agentId)?.hasGitSelf);
}

function isInsideGitRepoVaultPath(folderPath, agentId = getCreateModalAgentId()) {
  const vaultFolder = getActiveAgentVaultFolder(agentId);
  if (!vaultFolder) return false;
  const normalized = normalizeCreateParentPath(folderPath || ".");
  const parts = normalized.split("/").filter(Boolean);
  for (let len = parts.length; len >= 0; len -= 1) {
    const prefix = len === 0 ? "." : parts.slice(0, len).join("/");
    if (!isGitRepoMenuFolder(prefix, agentId)) continue;
    const rest = len === 0 ? normalized : parts.slice(len).join("/");
    if (!rest) return false;
    if (rest === vaultFolder || rest.startsWith(`${vaultFolder}/`)) return true;
    return true;
  }
  return false;
}

function syncCreateNodeVaultOptionUi() {
  const vaultFolder = getActiveAgentVaultFolder(getCreateModalAgentId());
  const agentId = getCreateModalAgentId();
  const isAgentRoot = createModalBaseParentPath === ".";
  const isGitRepo = isGitRepoMenuFolder(createModalBaseParentPath, agentId);
  const inGitVault = isInsideGitRepoVaultPath(createModalBaseParentPath, agentId);
  const showVaultOption = (isAgentRoot || isGitRepo) && Boolean(vaultFolder) && !inGitVault;
  createNodeVaultOptionWrapNode?.classList.toggle("hidden", !showVaultOption);
  createNodeVaultOptionWrapNode?.classList.toggle("is-disabled", showVaultOption);
  if (createNodeVaultOptionLabelNode && vaultFolder) {
    createNodeVaultOptionLabelNode.textContent = `Создать в папке ${vaultFolder}`;
  }
  if (createNodeVaultOptionNode) {
    if (showVaultOption) {
      createNodeVaultOptionNode.checked = true;
      createNodeVaultOptionNode.disabled = true;
    } else {
      createNodeVaultOptionNode.disabled = false;
      if (isServiceNodePath(createModalBaseParentPath)) {
        createNodeVaultOptionNode.checked = false;
      }
    }
  }
  applyCreateNodeTargetPath();
}

const SERVICE_CATALOG_FOLDER = "Catalog";
const SERVICE_CATALOG_PRESET_FILES = {
  categories: "Categories",
  tags: "Tags",
  schemas: "Schemas"
};
const SERVICE_CATALOG_PRESET_LABELS = {
  categories: "Категории",
  tags: "Теги",
  schemas: "Схемы"
};
const SERVICE_DOC_PRESET_FILES = {
  agent: "Agent",
  user: "User",
  users: "Users",
  "agent-rules": "Agent.Rules",
  "agent-voice-tts": "Agent.Voice.Tts",
  "agent-voice-stt": "Agent.Voice.STT"
};
const SERVICE_DOC_PRESET_LABELS = {
  agent: "Агент",
  user: "Пользователь",
  users: "Пользователи",
  "agent-rules": "Правила агента",
  "agent-voice-tts": "Голос · TTS",
  "agent-voice-stt": "Голос · STT"
};

function getCreateModalMenuData(agentId = getCreateModalAgentId()) {
  if (!agentId) return null;
  return menuCacheByAgent.get(agentId) || (agentId === activeAgentId ? currentMenuData : null);
}

function collectServicePathLookupVariants(agentId, relPath) {
  const raw = String(relPath || "").replace(/\\/g, "/").trim();
  if (!raw) return [];
  const serviceFolder = getActiveAgentSystemFolder(agentId);
  const variants = new Set([raw.toLowerCase()]);
  if (!serviceFolder) return [...variants];

  const stripped = stripServicePrefixFromRelPath(raw);
  variants.add(stripped.toLowerCase());
  if (stripped) {
    variants.add(`${serviceFolder}/${stripped}`.replace(/\/+/g, "/").toLowerCase());
  }
  if (!raw.toLowerCase().startsWith(`${serviceFolder.toLowerCase()}/`)) {
    variants.add(`${serviceFolder}/${raw}`.replace(/\/+/g, "/").toLowerCase());
  }
  return [...variants];
}

function buildServiceMenuPathsSet(agentId, menu) {
  const paths = new Set();
  if (!menu?.serviceTree) return paths;
  for (const entry of collectFlatMenuEntries({ title: "", ...menu.serviceTree })) {
    for (const variant of collectServicePathLookupVariants(agentId, entry.path)) {
      paths.add(variant);
    }
  }
  return paths;
}

function isServiceManifestCandidatePresent(agentId, candidatePaths) {
  const menu = getCreateModalMenuData(agentId);
  if (!menu?.serviceTree) return false;
  const paths = buildServiceMenuPathsSet(agentId, menu);
  return candidatePaths.some((candidate) =>
    collectServicePathLookupVariants(agentId, candidate).some((variant) => paths.has(variant))
  );
}

function getCatalogPresetManifestCandidates(serviceFolder, preset) {
  const fileName = SERVICE_CATALOG_PRESET_FILES[preset];
  if (!serviceFolder || !fileName) return [];
  const stems = [fileName, String(preset || "").trim()];
  const folders = [SERVICE_CATALOG_FOLDER, ""];
  const paths = [];
  for (const folder of folders) {
    for (const stem of stems) {
      if (!stem) continue;
      const rel = folder ? `${folder}/${stem}.md` : `${stem}.md`;
      paths.push(`${serviceFolder}/${rel}`.replace(/\/+/g, "/"));
    }
  }
  return paths;
}

function isCatalogPresetPresent(agentId, preset) {
  const serviceFolder = getActiveAgentSystemFolder(agentId);
  if (!serviceFolder) return false;
  return isServiceManifestCandidatePresent(
    agentId,
    getCatalogPresetManifestCandidates(serviceFolder, preset)
  );
}

function getServiceDocManifestCandidates(serviceFolder, preset) {
  const fileName = SERVICE_DOC_PRESET_FILES[preset];
  if (!serviceFolder || !fileName) return [];
  return [`${serviceFolder}/${fileName}.md`.replace(/\/+/g, "/")];
}

function isServiceDocPresetPresent(agentId, preset) {
  const serviceFolder = getActiveAgentSystemFolder(agentId);
  if (!serviceFolder) return false;
  return isServiceManifestCandidatePresent(
    agentId,
    getServiceDocManifestCandidates(serviceFolder, preset)
  );
}

function syncCreateNodeCatalogButtonsUi() {
  if (!createNodeCatalogActionsNode) return;
  const agentId = getCreateModalAgentId();
  const buttons = createNodeCatalogActionsNode.querySelectorAll("[data-catalog-preset]");
  for (const button of buttons) {
    const preset = button.getAttribute("data-catalog-preset");
    if (!preset) continue;
    const exists = isCatalogPresetPresent(agentId, preset);
    const label = SERVICE_CATALOG_PRESET_LABELS[preset] || preset;
    button.disabled = exists;
    button.setAttribute("aria-disabled", exists ? "true" : "false");
    if (exists) {
      button.title = `Справочник «${label}» уже создан`;
    } else if (preset === "tags") {
      button.title = "Список #tag, как в Obsidian";
    } else {
      button.removeAttribute("title");
    }
  }
}

function syncCreateNodeServiceDocButtonsUi() {
  if (!createNodeServiceDocsActionsNode) return;
  const agentId = getCreateModalAgentId();
  const buttons = createNodeServiceDocsActionsNode.querySelectorAll("[data-service-doc-preset]");
  for (const button of buttons) {
    const preset = button.getAttribute("data-service-doc-preset");
    if (!preset) continue;
    const exists = isServiceDocPresetPresent(agentId, preset);
    const label = SERVICE_DOC_PRESET_LABELS[preset] || preset;
    const fileName = SERVICE_DOC_PRESET_FILES[preset] || preset;
    button.disabled = exists;
    button.setAttribute("aria-disabled", exists ? "true" : "false");
    button.title = exists ? `«${label}» (${fileName}.md) уже создан` : `${fileName}.md`;
  }
}

function syncCreateNodeServicePresetsUi() {
  syncCreateNodeCatalogButtonsUi();
  syncCreateNodeServiceDocButtonsUi();
}

function isServiceRootCreateParent(parentPath) {
  const serviceFolder = getActiveAgentSystemFolder(getCreateModalAgentId());
  if (!serviceFolder) return false;
  return normalizeCreateParentPath(parentPath || ".") === serviceFolder;
}

function isServiceSubfolderCreateParent(parentPath) {
  const serviceFolder = getActiveAgentSystemFolder(getCreateModalAgentId());
  if (!serviceFolder) return false;
  const normalized = normalizeCreateParentPath(parentPath || ".");
  if (!normalized || normalized === serviceFolder) return false;
  return isServiceNodePath(normalized);
}

function syncCreateNodeActionsUi() {
  const showManifestOption = createModalAdoptFolder && createModalBaseParentPath !== ".";
  const serviceRoot = isServiceRootCreateParent(createModalBaseParentPath);
  const serviceSubfolder = isServiceSubfolderCreateParent(createModalBaseParentPath);
  const inServiceTree = serviceRoot || serviceSubfolder;

  createManifestBtn?.classList.toggle("hidden", !showManifestOption);
  createFolderBtn?.classList.toggle("hidden", showManifestOption);
  createNodeActionsNode?.classList.toggle("has-manifest-option", showManifestOption);
  createNodeCatalogWrapNode?.classList.toggle("hidden", !serviceRoot);
  createNodeServiceDocsWrapNode?.classList.toggle("hidden", !serviceRoot);
  createNodeDividerNode?.classList.toggle("hidden", !serviceRoot);
  createNodeStructureLabelNode?.classList.toggle("hidden", !inServiceTree);
  createNodeActionsNode?.classList.toggle("create-node-actions--service", inServiceTree);

  if (createNameInputNode) {
    createNameInputNode.placeholder = inServiceTree ? "Например: statuses" : "Например: Плавание";
  }
  syncCreateNodeServicePresetsUi();
}

function applyCreateNodeTargetPath() {
  const useVault =
    Boolean(createNodeVaultOptionNode?.checked) && !isServiceNodePath(createModalBaseParentPath);
  createTargetParentPath = resolveCreateTargetParentPath(createModalBaseParentPath, useVault);
  updateCreateNodeModalContext(createTargetParentPath);
}

function updateCreateNodeModalContext(parentPath) {
  const label = formatCreateParentLabel(parentPath);
  if (createNodeModalTitleNode) {
    if (createModalAdoptFolder && createModalBaseParentPath !== ".") {
      createNodeModalTitleNode.textContent = `Папка «${label}» — без области`;
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
  createModalAdoptFolder = false;
  if (createNameInputNode) createNameInputNode.value = "";
  createNodeVaultOptionWrapNode?.classList.add("hidden");
  createNodeVaultOptionWrapNode?.classList.remove("is-disabled");
  if (createNodeVaultOptionNode) {
    createNodeVaultOptionNode.checked = true;
    createNodeVaultOptionNode.disabled = false;
  }
  syncCreateNodeActionsUi();
}

function openCreateNodeModal(parentPath, options = {}) {
  createModalAgentId = options.agentId || activeAgentId;
  createModalBaseParentPath = resolveCreateModalParentPath(parentPath, options);
  createModalEmptyFolder = Boolean(options.emptyFolder);
  createModalAdoptFolder = Boolean(options.adoptFolder ?? options.emptyFolder);
  syncCreateNodeVaultOptionUi();
  syncCreateNodeActionsUi();
  createNodeModalNode?.classList.remove("hidden");
  if (createNameInputNode) {
    if (createModalAdoptFolder && createModalBaseParentPath !== ".") {
      createNameInputNode.value = formatCreateParentLabel(createModalBaseParentPath);
    } else {
      createNameInputNode.value = "";
    }
    createNameInputNode.focus();
  }
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
  const patched = menu
    ? withPreservedMenuScroll(() => patchFolderCollapsedState(normalizedPath, agentId))
    : false;
  if (!patched && menu) {
    withPreservedMenuScroll(() => renderMenu(menu, agentId, { menuOnly: true }));
  }
  if (agentId === activeAgentId) {
    updateActiveButton();
    syncMenuCollapseAllButton();
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
  const patched = withPreservedMenuScroll(() => refreshAllFolderCollapsedPatches(agentId));
  if (!patched) {
    withPreservedMenuScroll(() => renderMenu(currentMenuData, agentId, { menuOnly: true }));
  }
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
  const patched = withPreservedMenuScroll(() => refreshAllFolderCollapsedPatches(agentId));
  if (!patched) {
    withPreservedMenuScroll(() => renderMenu(currentMenuData, agentId, { menuOnly: true }));
  }
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

function isMindmapModeActive() {
  return activeContentMode === NODE_MINDMAP_MODE && Boolean(activePath) && !activeSystemFile;
}

function isNodeCanvasViewMode() {
  return isGraphModeActive() || isMindmapModeActive();
}

function applyContentModeState(mode) {
  if (mode === "graph") return false;
  const group = findModeGroup(mode);
  const modeDef = group?.modes.find((item) => item.id === mode);
  if (modeDef?.disabled) return false;
  if (mode === "graph" && !activePath) {
    showToast("Выберите тему в дереве слева", "info");
    return false;
  }
  if (isMemoryDriverModeBlockedForActivePath(mode)) {
    mode = NODE_NAVIGATION_MODE;
  }

  activeContentMode = mode;
  if (mode !== "media") {
    clearMediaSidecarEditor();
    setMediaBulkUploadPanelOpen(false);
  }
  if (mode !== "external") {
    activeExternalFilePath = null;
    activeExternalSectionFolder = null;
  }
  for (const flatMode of FLAT_STORAGE_SECTION_MODES) {
    if (mode !== flatMode) activeFlatStorageSectionFolder[flatMode] = null;
  }
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
  return true;
}

function setContentMode(mode) {
  if (!applyContentModeState(mode)) return;
  syncAppRouteToUrl({ replace: true });
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
    (activeContentMode === "media" && !isMediaAssetEditing())
  );
}

function getListViewRawContent() {
  if (activeContentMode === "media" && !isMediaAssetEditing()) {
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
  const mediaSidecarEditing = isMediaAssetEditing();
  return (
    (activeContentMode === "external" && !externalEditing) ||
    (activeContentMode === "tabular" && !isTabularSourceEditing()) ||
    activeContentMode === "inbox" ||
    activeContentMode === "references" ||
    activeContentMode === "artefacts" ||
    activeContentMode === "temp" ||
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
  const mediaSidecarEditing = isMediaAssetEditing();
  return activeContentMode === "description" || externalEditing || mediaSidecarEditing;
}

function isNodeDeleteAvailable() {
  if (!activePath || activeSystemFile) return false;
  if (activeContentMode !== "description") return false;
  if (isAgentRootIndexPath(getActiveNodeApiPath())) return false;
  if (isAgentSystemRootIndexPath(getActiveNodeApiPath())) return false;
  return true;
}

function isCurrentModeListTemplate() {
  if (activeSystemFile) return false;
  const externalEditing = activeContentMode === "external" && Boolean(activeExternalFilePath);
  const mediaSidecarEditing = isMediaAssetEditing();
  return (
    (activeContentMode === "external" && !externalEditing) ||
    (activeContentMode === "tabular" && !isTabularSourceEditing()) ||
    activeContentMode === "inbox" ||
    activeContentMode === "references" ||
    (activeContentMode === "media" && !mediaSidecarEditing) ||
    activeContentMode === "temp" ||
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
  return getNamedStorageSlotDirRel(getResolvedNodePath(nodePath));
}

function getNodeStorageSubfolderPath(nodePath, subfolderOrMode) {
  const folder =
    getStorageSubfolderForMode(subfolderOrMode) || String(subfolderOrMode || "").trim();
  const resolvedPath = getResolvedNodePath(nodePath);
  const slotDir = getNamedStorageSlotDirRel(resolvedPath);
  return slotDir ? `${slotDir}/${folder}` : `${getNodeStoragePrefix(resolvedPath)}/${folder}`;
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

function getManifestContainerDirRel(relPath) {
  const normalized = String(relPath || "").replace(/\\/g, "/");
  const slash = normalized.lastIndexOf("/");
  if (slash < 0) return "";
  return normalized.slice(0, slash);
}

function getWorkspaceFolderStorageKey() {
  const agent = getActiveAgentMeta();
  const agentPath = String(agent?.path || "").trim();
  if (!agentPath) return "";
  const parts = agentPath.replace(/\\/g, "/").split("/").filter(Boolean);
  return parts[parts.length - 1] || "";
}

function getManifestStorageKey(relPath) {
  return getManifestNamedSlotKey(relPath);
}

function getManifestNamedSlotKey(relPath) {
  const normalized = String(relPath || "").replace(/\\/g, "/");
  const base = normalized.slice(normalized.lastIndexOf("/") + 1);
  if (isAreaManifestFileName(base)) {
    return stripTopicPrefix(base);
  }
  if (MANIFEST_MD_RE.test(base) && !isExcludedMenuTopicMd(base)) {
    return stripTopicPrefix(base);
  }
  return "";
}

function getNamedStorageSlotDirRel(relPath) {
  const containerDir = getManifestContainerDirRel(relPath);
  const slotKey = getManifestNamedSlotKey(relPath);
  const storageFolder = `${SLOT_STORAGE_PREFIX}${slotKey}`;
  if (!containerDir) return storageFolder;
  return `${containerDir}/${storageFolder}`;
}

function getNamedStorageBundleDirRel(relPath) {
  return getNamedStorageSlotDirRel(relPath);
}

function getNamedStorageBundleRel(relPath, bundleFileName) {
  return `${getNamedStorageBundleDirRel(relPath)}/${bundleFileName}`;
}

const STORAGE_SUBFOLDER_CONTENT = "Content";
const STORAGE_SUBFOLDER_INBOX = "Inbox";
const STORAGE_SUBFOLDER_REFERENCES = "Referenses";
const STORAGE_SUBFOLDER_ASSETS = "Assets";
const STORAGE_SUBFOLDER_SCRIPTS = "Scripts";
const STORAGE_SUBFOLDER_ARTEFACTS = "Artefacts";
const STORAGE_SUBFOLDER_PREVIEW = "Preview";
const STORAGE_SUBFOLDER_TEMP = "Temp";

const STORAGE_SUBFOLDER_BY_MODE = {
  external: STORAGE_SUBFOLDER_CONTENT,
  inbox: STORAGE_SUBFOLDER_INBOX,
  references: STORAGE_SUBFOLDER_REFERENCES,
  media: STORAGE_SUBFOLDER_ASSETS,
  scripts: STORAGE_SUBFOLDER_SCRIPTS,
  artefacts: STORAGE_SUBFOLDER_ARTEFACTS,
  temp: STORAGE_SUBFOLDER_TEMP
};

function getStorageSubfolderForMode(mode) {
  return STORAGE_SUBFOLDER_BY_MODE[String(mode || "").trim()] || null;
}

function getFlatStorageSectionFolderName(mode) {
  return getStorageSubfolderForMode(mode);
}

const AGENT_MAP3_LAYER_KEYS = [
  { key: BUNDLE_CONTENT_FILE, label: "Память" },
  { key: BUNDLE_CONFIG_FILE, label: "Конфиг" },
  { key: STORAGE_SUBFOLDER_ASSETS, label: "Файлы" },
  { key: STORAGE_SUBFOLDER_CONTENT, label: "Контент" }
];

let agentMap3RequestId = 0;

const AGENT_STORAGE_LAYER_ORDER = [
  BUNDLE_CONTENT_FILE,
  BUNDLE_TABULAR_FILE,
  BUNDLE_CONFIG_FILE,
  BUNDLE_TODO_FILE,
  ".env",
  `${PREVIEW_FILE_BASENAME}.png`,
  `${PREVIEW_FILE_BASENAME}.jpg`,
  STORAGE_SUBFOLDER_CONTENT,
  STORAGE_SUBFOLDER_INBOX,
  STORAGE_SUBFOLDER_REFERENCES,
  STORAGE_SUBFOLDER_ASSETS,
  STORAGE_SUBFOLDER_SCRIPTS,
  STORAGE_SUBFOLDER_ARTEFACTS,
  STORAGE_SUBFOLDER_TEMP,
  STORAGE_SUBFOLDER_PREVIEW
];

let agentStorageLayoutCache = null;
let agentStorageLayoutRequestId = 0;
let agentWorkspaceTableCache = null;
let agentTimelineCache = null;
let agentTableRequestId = 0;
let agentTimelineRequestId = 0;
let agentTimelineAxisRequestId = 0;
let agentTimelineVerticalRequestId = 0;
let agentTableSearchQuery = "";
let agentTableSortKey = "displayPath";
let agentTableSortDir = "asc";

function manifestRelToXSidecar(relPath, sidecarSuffix) {
  const normalized = String(relPath || "").replace(/\\/g, "/");
  const dot = sidecarSuffix.startsWith(".") ? sidecarSuffix : `.${sidecarSuffix}`;
  if (isAreaManifestFileName(normalized.split("/").pop() || "") || isTopicManifestPath(normalized)) {
    return normalized.replace(/\.md$/i, `${dot}.md`);
  }
  return normalized;
}

function toTodoSidecarRelPath(nodePath) {
  const resolved = String(getResolvedNodePath(nodePath) || "");
  const partBase = resolvePartFolderSidecarBaseRel(resolved);
  if (partBase) return `${partBase}.todo.md`;
  return manifestRelToXSidecar(resolved, ".todo.md");
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

const AGENT_WORKSPACE_VIEW_TITLE_LABELS = {
  dashboard2: "Дашборд 2",
  map: "Карта",
  map2: "Карта 2",
  map3: "Карта 3",
  schema: "Схема",
  vault: "Каталог",
  graph: "Граф",
  table: "Таблица",
  storage: "Хранилище",
  timeline: "Лента",
  "timeline-axis": "Timeline",
  "timeline-vertical": "Timeline ↓"
};

const CONTENT_MODE_TITLE_LABELS = {
  internal: "Память",
  external: "Content",
  tabular: "Таблица",
  inbox: "Входящие",
  references: "Источники",
  media: "Медиа",
  scripts: "Скрипты",
  artefacts: "Артефакты",
  temp: "Временные",
  configs: "Конфигурации",
  env: "Env",
  todo: "Todo",
  "node-preview": "Превью",
  graph: "Граф"
};

function formatDocumentTitle(pageLabel) {
  const label = String(pageLabel || "").trim();
  return label ? `Agent CMS: ${label}` : "Agent CMS";
}

function getDocumentTitleContentModeLabel(mode) {
  if (!mode) return "";
  if (mode === NODE_MINDMAP_MODE) return "Карта тем";
  return CONTENT_MODE_TITLE_LABELS[mode] || "";
}

function getDocumentTitlePageLabel() {
  if (appRootNode?.classList.contains("app-landing-view")) {
    return "Главная";
  }

  if (!activeAgentId) {
    return "";
  }

  const agentLabel = getActiveAgentLabel() || getAgentTreeTitle() || activeAgentId;

  if (activeSystemFile) {
    return `${agentLabel} — ${activeSystemFile}`;
  }

  if (activePath) {
    const topicLabel = String(
      activeLabel || titleInputNode?.value || getLabelFromPath(activePath) || ""
    ).trim();
    if (
      activeContentMode === NODE_OVERVIEW_MODE ||
      activeContentMode === NODE_NAVIGATION_MODE ||
      activeContentMode === "description"
    ) {
      return topicLabel;
    }
    if (isGraphModeActive()) {
      return `${topicLabel} — Граф`;
    }
    const domain = getNodeWorkspaceDomain(activeContentMode);
    if (
      domain &&
      domain !== NODE_WORKSPACE_DOMAIN_NAVIGATION &&
      domain !== NODE_WORKSPACE_DOMAIN_OVERVIEW
    ) {
      const domainLabel = getWorkspaceDomainLabelById(domain);
      if (domainLabel) return `${topicLabel} — ${domainLabel}`;
    }
    const modeLabel = getDocumentTitleContentModeLabel(activeContentMode);
    return modeLabel ? `${topicLabel} — ${modeLabel}` : topicLabel;
  }

  if (appRootNode?.classList.contains("home-view")) {
    const viewLabel = AGENT_WORKSPACE_VIEW_TITLE_LABELS[agentWorkspaceView] || "";
    return viewLabel ? `${agentLabel} — ${viewLabel}` : agentLabel;
  }

  return agentLabel;
}

function updateDocumentTitle() {
  document.title = formatDocumentTitle(getDocumentTitlePageLabel());
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
    case NODE_MINDMAP_MODE:
    case "description":
      return getNodeDisplayPath(activePath);
    case "internal":
      return getInternalMemoryBreadcrumbPath(activePath);
    case "tabular":
      return getTabularBreadcrumbPath(activePath);
    case "external": {
      const base = getNodeStorageSubfolderPath(activePath, "external");
      return externalFile ? `${base}/${externalFile}` : base;
    }
    case "inbox":
      return getNodeStorageSubfolderPath(activePath, "inbox");
    case "references":
      return getNodeStorageSubfolderPath(activePath, "references");
    case "media": {
      const base = getNodeStorageSubfolderPath(activePath, "media");
      return mediaFile ? `${base}/${mediaFile}` : base;
    }
    case "scripts":
      return getNodeStorageSubfolderPath(activePath, "scripts");
    case "artefacts":
      return getNodeStorageSubfolderPath(activePath, "artefacts");
    case "temp":
      return getNodeStorageSubfolderPath(activePath, "temp");
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
  syncTitleLockForActivePath();
  updateWorkspaceShareLinkButton();
  updateDocumentTitle();
}

function getListViewTitleByMode() {
  if (activeContentMode === "graph") {
    return `Пространство: ${activeLabel || getLabelFromPath(activePath) || "тема"}`;
  }
  if (activeContentMode === NODE_MINDMAP_MODE) {
    return `Карта тем: ${activeLabel || getLabelFromPath(activePath) || "нода"}`;
  }
  if (activeContentMode === "external") return `Многофайловая (${STORAGE_SUBFOLDER_CONTENT})`;
  if (activeContentMode === "tabular") {
    return isTabularSourceEditing() ? "Табличная — исходник CSV" : "Табличная (CSV)";
  }
  if (activeContentMode === "inbox") return `Входящие (${STORAGE_SUBFOLDER_INBOX})`;
  if (activeContentMode === "references") return `Источники (${STORAGE_SUBFOLDER_REFERENCES})`;
  if (activeContentMode === "media") return `Медиа и документы (${STORAGE_SUBFOLDER_ASSETS})`;
  if (activeContentMode === "scripts") return `Скрипты (${STORAGE_SUBFOLDER_SCRIPTS})`;
  if (activeContentMode === "artefacts") return `Артефакты (${STORAGE_SUBFOLDER_ARTEFACTS})`;
  if (activeContentMode === "temp") return "Временные файлы";
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

function attachGraphControlHandlers(controlsHost, getViewportContext) {
  if (!controlsHost) return () => {};

  if (controlsHost._graphControlHandler) {
    controlsHost.removeEventListener("click", controlsHost._graphControlHandler);
    controlsHost._graphControlHandler = null;
  }

  const handler = (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const ctx = getViewportContext();
    if (!ctx?.wrap?.isConnected) return;

    const { svg, state, fitToView, applyTransform } = ctx;
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
  };

  controlsHost._graphControlHandler = handler;
  controlsHost.addEventListener("click", handler);
  return () => {
    controlsHost.removeEventListener("click", handler);
    if (controlsHost._graphControlHandler === handler) {
      controlsHost._graphControlHandler = null;
    }
  };
}

function attachObsidianGraphViewport(
  wrap,
  svg,
  viewport,
  sim,
  nodeElements,
  linkElements,
  degrees,
  showPreviews = false,
  controlsHost = null
) {
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

  const getViewportContext = () =>
    wrap.isConnected ? { wrap, svg, state, fitToView, applyTransform } : null;

  const detachControls = attachGraphControlHandlers(controlsHost, getViewportContext);

  if (!controlsHost) {
    const controls = document.createElement("div");
    controls.className = "external-graph-controls";
    controls.innerHTML = `
      <button type="button" class="external-graph-control-btn" data-action="zoom-in" title="Приблизить">+</button>
      <button type="button" class="external-graph-control-btn" data-action="zoom-out" title="Отдалить">−</button>
      <button type="button" class="external-graph-control-btn" data-action="reset" title="Сбросить вид">⟲</button>
    `;
    attachGraphControlHandlers(controls, getViewportContext);
    wrap.appendChild(controls);
  }

  const observer = new MutationObserver(() => {
    if (!wrap.isConnected) {
      detachControls();
      observer.disconnect();
    }
  });
  observer.observe(wrap.parentElement || document.body, { childList: true });
}

function buildGraphDataFromExternalFiles(items) {
  const nodes = [
    { id: "root", label: STORAGE_SUBFOLDER_CONTENT, filePath: null, type: "folder", depth: 0 }
  ];
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
    controlsHost = null,
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
    showPreviews,
    controlsHost
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

const mindmapCollapsedIds = new Set();
const externalMindmapCollapsedIds = new Set();
const MINDMAP_LAYOUT_LEVEL_GAP = 210;
const MINDMAP_LAYOUT_ROW_GAP = 42;
const MINDMAP_MAX_DEPTH = 6;
const MINDMAP_CANVAS_PAD = { top: 52, right: 300, bottom: 80, left: 168 };
const MINDMAP_CANVAS_PAD_VERTICAL = { top: 80, right: 320, bottom: 100, left: 120 };
const MINDMAP_NODE_LINK_HALF = 72;
const MINDMAP_LAYOUT_STORAGE_KEY = "yamlcms.mindmapLayoutDirection";

function readMindmapLayoutDirection() {
  try {
    const stored = localStorage.getItem(MINDMAP_LAYOUT_STORAGE_KEY);
    return stored === "vertical" ? "vertical" : "horizontal";
  } catch {
    return "horizontal";
  }
}

let mindmapLayoutDirection = readMindmapLayoutDirection();

function getMindmapLayoutDirection() {
  return mindmapLayoutDirection === "vertical" ? "vertical" : "horizontal";
}

function setMindmapLayoutDirection(value) {
  mindmapLayoutDirection = value === "vertical" ? "vertical" : "horizontal";
  try {
    localStorage.setItem(MINDMAP_LAYOUT_STORAGE_KEY, mindmapLayoutDirection);
  } catch {
    /* ignore quota */
  }
}

function syncMindmapLayoutUi(root = document) {
  const direction = getMindmapLayoutDirection();
  for (const btn of root.querySelectorAll(".mindmap-layout-btn[data-mindmap-layout]")) {
    const active = btn.dataset.mindmapLayout === direction;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  }
}

function applyMindmapLayout(direction) {
  setMindmapLayoutDirection(direction);
  syncMindmapLayoutUi();
  if (isMindmapModeActive()) renderNodeMindmapView();
  if (activeContentMode === "external" && externalViewMode === "mindmap") rerenderExternalListViewBody();
}

function createMindmapLayoutBarElement() {
  const bar = document.createElement("div");
  bar.className = "mindmap-view-bar mindmap-view-bar--embedded";

  const toggle = document.createElement("div");
  toggle.className = "mindmap-layout-toggle";
  toggle.setAttribute("role", "group");
  toggle.setAttribute("aria-label", "Раскладка карты");

  for (const { layout, label, title } of [
    { layout: "horizontal", label: "→", title: "Горизонтально — корень слева" },
    { layout: "vertical", label: "↓", title: "Вертикально — корень сверху" }
  ]) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "mindmap-layout-btn";
    btn.dataset.mindmapLayout = layout;
    btn.title = title;
    btn.textContent = label;
    btn.addEventListener("click", () => applyMindmapLayout(layout));
    toggle.appendChild(btn);
  }

  bar.appendChild(toggle);
  syncMindmapLayoutUi(bar);
  return bar;
}

function getMindmapCanvasPad(direction) {
  return direction === "vertical" ? MINDMAP_CANVAS_PAD_VERTICAL : MINDMAP_CANVAS_PAD;
}

function buildMindmapLinkPath(a, b, direction) {
  if (direction === "vertical") {
    const my = (a.y + b.y) / 2;
    return `M ${a.x} ${a.y + MINDMAP_NODE_LINK_HALF} C ${a.x} ${my}, ${b.x} ${my}, ${b.x} ${b.y - MINDMAP_NODE_LINK_HALF}`;
  }
  const mx = (a.x + b.x) / 2;
  return `M ${a.x + MINDMAP_NODE_LINK_HALF} ${a.y} C ${mx} ${a.y}, ${mx} ${b.y}, ${b.x - MINDMAP_NODE_LINK_HALF} ${b.y}`;
}
function getMindmapNodeKind(entry, depth) {
  if (depth === 0 && isAreaNodePath(entry.path)) return "root";
  if (entry.isFolder) return "topic";
  return "leaf";
}

function countMindmapVisibleLeaves(node, collapsedIds) {
  if (collapsedIds.has(node.id)) return 1;
  if (!node.children?.length) return 1;
  return node.children.reduce((sum, child) => sum + countMindmapVisibleLeaves(child, collapsedIds), 0);
}

function layoutMindmapTreeHorizontal(node, depth, yStart, collapsedIds) {
  const rows = countMindmapVisibleLeaves(node, collapsedIds);
  const yCenter = yStart + (rows * MINDMAP_LAYOUT_ROW_GAP) / 2 - MINDMAP_LAYOUT_ROW_GAP / 2;
  const x = 72 + depth * MINDMAP_LAYOUT_LEVEL_GAP;
  const positioned = [{ node, x, y: yCenter, depth }];

  if (!collapsedIds.has(node.id) && node.children?.length) {
    let cursor = yStart;
    for (const child of node.children) {
      const childRows = countMindmapVisibleLeaves(child, collapsedIds);
      positioned.push(...layoutMindmapTreeHorizontal(child, depth + 1, cursor, collapsedIds));
      cursor += childRows * MINDMAP_LAYOUT_ROW_GAP;
    }
  }
  return positioned;
}

function layoutMindmapTreeVertical(node, depth, xStart, collapsedIds) {
  const cols = countMindmapVisibleLeaves(node, collapsedIds);
  const xCenter = xStart + (cols * MINDMAP_LAYOUT_ROW_GAP) / 2 - MINDMAP_LAYOUT_ROW_GAP / 2;
  const y = 72 + depth * MINDMAP_LAYOUT_LEVEL_GAP;
  const positioned = [{ node, x: xCenter, y, depth }];

  if (!collapsedIds.has(node.id) && node.children?.length) {
    let cursor = xStart;
    for (const child of node.children) {
      const childCols = countMindmapVisibleLeaves(child, collapsedIds);
      positioned.push(...layoutMindmapTreeVertical(child, depth + 1, cursor, collapsedIds));
      cursor += childCols * MINDMAP_LAYOUT_ROW_GAP;
    }
  }
  return positioned;
}

function layoutMindmapTree(node, depth, start, collapsedIds, direction = "horizontal") {
  if (direction === "vertical") {
    return layoutMindmapTreeVertical(node, depth, start, collapsedIds);
  }
  return layoutMindmapTreeHorizontal(node, depth, start, collapsedIds);
}

function collectMindmapEdges(node, parent, collapsedIds) {
  const edges = [];
  if (parent && !collapsedIds.has(parent.id)) {
    edges.push({ from: parent.id, to: node.id });
  }
  if (!collapsedIds.has(node.id) && node.children?.length) {
    for (const child of node.children) edges.push(...collectMindmapEdges(child, node, collapsedIds));
  }
  return edges;
}

function renderMindmapTreeCanvas(container, tree, options = {}) {
  const {
    collapsedIds,
    activeTarget = null,
    onNodeClick = null,
    onRerender = null,
    layoutDirection = getMindmapLayoutDirection()
  } = options;
  if (!container || !tree) return;

  const direction = layoutDirection === "vertical" ? "vertical" : "horizontal";
  const canvasPad = getMindmapCanvasPad(direction);

  container.replaceChildren();

  const wrap = document.createElement("div");
  wrap.className = `node-mindmap-wrap node-mindmap-wrap--${direction}`;

  const viewport = document.createElement("div");
  viewport.className = "node-mindmap-viewport";

  const canvas = document.createElement("div");
  canvas.className = "node-mindmap-canvas";

  const linksSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  linksSvg.setAttribute("class", "node-mindmap-links");
  linksSvg.setAttribute("aria-hidden", "true");

  const items = layoutMindmapTree(tree, 0, 0, collapsedIds, direction);
  const posById = new Map();
  let maxY = 0;
  let maxX = 0;

  for (const { node, x, y } of items) {
    const px = x + canvasPad.left;
    const py = y + canvasPad.top;
    maxY = Math.max(maxY, py);
    maxX = Math.max(maxX, px);
    posById.set(node.id, { x: px, y: py });

    const el = document.createElement("button");
    el.type = "button";
    el.className = `node-mindmap-node node-mindmap-node--${node.kind}`;
    el.style.left = `${px}px`;
    el.style.top = `${py}px`;
    el.title = node.targetPath || node.label;

    const isActive = activeTarget && node.targetPath && activeTarget === node.targetPath;
    if (isActive) el.classList.add("is-active");

    if (node.children?.length) {
      const toggle = document.createElement("span");
      toggle.className = "node-mindmap-toggle";
      toggle.setAttribute("aria-hidden", "true");
      toggle.textContent = collapsedIds.has(node.id) ? "+" : "−";
      toggle.addEventListener("click", (event) => {
        event.stopPropagation();
        if (collapsedIds.has(node.id)) collapsedIds.delete(node.id);
        else collapsedIds.add(node.id);
        onRerender?.();
      });
      el.appendChild(toggle);
    }

    const label = document.createElement("span");
    label.className = "node-mindmap-label";
    label.textContent = node.label;
    el.appendChild(label);

    if (node.targetPath && !isActive && onNodeClick) {
      el.addEventListener("click", () => onNodeClick(node));
    }

    canvas.appendChild(el);
  }

  const canvasWidth = maxX + canvasPad.right;
  const canvasHeight = maxY + canvasPad.bottom;
  canvas.style.width = `${canvasWidth}px`;
  canvas.style.height = `${canvasHeight}px`;
  canvas.style.minWidth = `${canvasWidth}px`;
  canvas.style.minHeight = `${canvasHeight}px`;
  linksSvg.setAttribute("width", String(canvasWidth));
  linksSvg.setAttribute("height", String(canvasHeight));
  linksSvg.setAttribute("viewBox", `0 0 ${canvasWidth} ${canvasHeight}`);

  for (const { from, to } of collectMindmapEdges(tree, null, collapsedIds)) {
    const a = posById.get(from);
    const b = posById.get(to);
    if (!a || !b) continue;
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", buildMindmapLinkPath(a, b, direction));
    path.setAttribute("class", "node-mindmap-link");
    linksSvg.appendChild(path);
  }

  canvas.insertBefore(linksSvg, canvas.firstChild);
  viewport.appendChild(canvas);
  wrap.appendChild(viewport);
  container.appendChild(wrap);

  let panning = false;
  let startX = 0;
  let startY = 0;
  let scrollLeft = 0;
  let scrollTop = 0;
  const endPan = () => {
    panning = false;
  };
  viewport.addEventListener("mousedown", (event) => {
    if (event.target.closest(".node-mindmap-node")) return;
    panning = true;
    startX = event.clientX;
    startY = event.clientY;
    scrollLeft = viewport.scrollLeft;
    scrollTop = viewport.scrollTop;
  });
  viewport.addEventListener("mousemove", (event) => {
    if (!panning) return;
    viewport.scrollLeft = scrollLeft - (event.clientX - startX);
    viewport.scrollTop = scrollTop - (event.clientY - startY);
  });
  viewport.addEventListener("mouseup", endPan);
  viewport.addEventListener("mouseleave", endPan);

  requestAnimationFrame(() => {
    const activeEl = canvas.querySelector(".node-mindmap-node.is-active");
    const targetEl = activeEl || canvas.querySelector(".node-mindmap-node");
    if (!targetEl) return;
    const vr = viewport.getBoundingClientRect();
    const tr = targetEl.getBoundingClientRect();
    const nextLeft =
      viewport.scrollLeft + (tr.left + tr.width / 2 - vr.left - vr.width / 2);
    const nextTop =
      viewport.scrollTop + (tr.top + tr.height / 2 - vr.top - vr.height / 2);
    viewport.scrollLeft = Math.max(0, nextLeft);
    viewport.scrollTop = Math.max(0, nextTop);
  });
}

function buildMindmapNodeFromEntry(entry, menuRoot, depth) {
  const id = normalizeMenuNodePath(entry.path);
  const node = {
    id,
    label: entry.label || getLabelFromPath(entry.path),
    kind: getMindmapNodeKind(entry, depth),
    targetPath: entry.path,
    children: []
  };
  if (depth >= MINDMAP_MAX_DEPTH || !entry.isFolder) return node;

  const menuNode = findOverviewChildrenSourceNode(menuRoot, entry.path);
  if (!menuNode) return node;

  for (const child of collectDirectChildNodeEntries(menuNode)) {
    if (normalizeMenuNodePath(child.path) === id) continue;
    node.children.push(buildMindmapNodeFromEntry(child, menuRoot, depth + 1));
  }
  return node;
}

function buildMindmapTreeForActiveNode() {
  if (!activePath || !currentMenuData) return null;
  const baseTree = { title: getAgentTreeTitle(), ...currentMenuData };
  const rootEntry = {
    path: getActiveNodeApiPath(),
    label: activeLabel || getLabelFromPath(activePath),
    isFolder: isContainerNodePath(activePath)
  };
  return buildMindmapNodeFromEntry(rootEntry, baseTree, 0);
}

function buildExternalMindmapTreeFromItems(mdItems, rootLabel = STORAGE_SUBFOLDER_CONTENT) {
  const root = {
    id: "external-root",
    label: rootLabel,
    kind: "root",
    targetPath: null,
    children: []
  };
  const folderNodes = new Map([["", root]]);

  for (const item of mdItems) {
    const segments = String(item.path || "").split("/").filter(Boolean);
    if (!segments.length) continue;
    segments.pop();
    let parent = root;
    let built = "";
    for (const segment of segments) {
      built = built ? `${built}/${segment}` : segment;
      if (!folderNodes.has(built)) {
        const folderNode = {
          id: `folder:${built}`,
          label: segment,
          kind: "topic",
          targetPath: null,
          children: []
        };
        folderNodes.set(built, folderNode);
        parent.children.push(folderNode);
      }
      parent = folderNodes.get(built);
    }
    parent.children.push({
      id: `file:${item.path}`,
      label: item.title,
      kind: "leaf",
      targetPath: item.path,
      children: []
    });
  }
  return root;
}

function renderExternalMindmapCanvas(container, mdItems) {
  const rootLabel = activeLabel || getLabelFromPath(activePath) || STORAGE_SUBFOLDER_CONTENT;
  const tree = buildExternalMindmapTreeFromItems(mdItems, rootLabel);
  const rerender = () => renderExternalMindmapCanvas(container, mdItems);

  container.replaceChildren();
  const shell = document.createElement("div");
  shell.className = "external-mindmap-shell";
  shell.appendChild(createMindmapLayoutBarElement());
  const mapHost = document.createElement("div");
  mapHost.className = "external-mindmap-host";
  shell.appendChild(mapHost);
  container.appendChild(shell);

  renderMindmapTreeCanvas(mapHost, tree, {
    collapsedIds: externalMindmapCollapsedIds,
    activeTarget: activeExternalFilePath,
    onNodeClick: (node) => openExternalFile(node.targetPath),
    onRerender: rerender
  });
}

function buildExternalCheatsheetMeta(pathValue, index) {
  const fileName = pathValue.split("/").pop() || pathValue;
  const pathParts = pathValue.split("/").filter(Boolean);
  const tags = index % 2 === 0 ? "agent, note" : "task, draft";
  const parent = pathParts.length > 1 ? pathParts[pathParts.length - 2] : "—";
  const baseDay = (index % 26) + 1;
  return {
    title: fileName.replace(/\.md$/i, ""),
    created: `2026-05-${String(baseDay).padStart(2, "0")}`,
    updated: `2026-06-${String(((baseDay + 5) % 28) + 1).padStart(2, "0")}`,
    done: index % 3 === 0,
    tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
    parent
  };
}

function renderExternalCheatsheetView(container, mdItems) {
  container.replaceChildren();

  const sheet = document.createElement("div");
  sheet.className = "external-cheatsheet";

  const intro = document.createElement("p");
  intro.className = "external-cheatsheet-intro";
  intro.textContent =
    "Шпаргалка (cheat sheet): сжатый обзор элементов — заголовок, метки, путь. Клик открывает файл.";
  sheet.appendChild(intro);

  const grid = document.createElement("div");
  grid.className = "external-cheatsheet-grid";

  for (const [index, item] of mdItems.entries()) {
    const meta = buildExternalCheatsheetMeta(item.path, index);
    const card = document.createElement("article");
    card.className = "external-cheatsheet-card";
    if (item.path === activeExternalFilePath) card.classList.add("is-active");

    const head = document.createElement("header");
    head.className = "external-cheatsheet-card-head";
    const title = document.createElement("h3");
    title.className = "external-cheatsheet-card-title";
    title.textContent = meta.title;
    head.appendChild(title);
    if (meta.done) {
      const badge = document.createElement("span");
      badge.className = "external-cheatsheet-badge";
      badge.textContent = "✓";
      head.appendChild(badge);
    }
    card.appendChild(head);

    const facts = document.createElement("ul");
    facts.className = "external-cheatsheet-facts";
    for (const fact of [
      `Папка: ${meta.parent}`,
      `Создан: ${item.createdAt?.slice(0, 10) || meta.created}`,
      `Обновлён: ${item.updatedAt?.slice(0, 10) || meta.updated}`,
      ...meta.tags.map((tag) => `#${tag}`)
    ]) {
      const li = document.createElement("li");
      li.textContent = fact;
      facts.appendChild(li);
    }
    card.appendChild(facts);

    const path = document.createElement("div");
    path.className = "external-cheatsheet-path";
    path.textContent = item.path;
    path.title = item.path;
    card.appendChild(path);

    card.addEventListener("click", () => openExternalFile(item.path));
    grid.appendChild(card);
  }

  sheet.appendChild(grid);
  container.appendChild(sheet);
}

function renderNodeMindmapView() {
  if (!graphViewContentNode) return;

  const tree = buildMindmapTreeForActiveNode();
  if (!tree) {
    graphViewContentNode.replaceChildren();
    renderListEmptyMessage(graphViewContentNode, "Дерево тем ещё не загружено");
    return;
  }

  const activeResolved = normalizeMenuNodePath(getResolvedNodePath(activePath));
  renderMindmapTreeCanvas(graphViewContentNode, tree, {
    collapsedIds: mindmapCollapsedIds,
    activeTarget: activeResolved,
    onNodeClick: (node) => {
      void openNodeFromMenu(getLabelFromPath(node.targetPath), node.targetPath, {
        contentMode: NODE_MINDMAP_MODE
      });
    },
    onRerender: renderNodeMindmapView
  });
}

function renderExternalGraphCanvas(container, items) {
  const graph = buildGraphDataFromExternalFiles(items);
  renderGraphCanvas(container, graph, {
    ariaLabel: `Граф файлов ${STORAGE_SUBFOLDER_CONTENT}`,
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

const MEDIA_VIEW_SELECT_NODES = [
  { id: "dashboard", label: "Обзор использования", icon: "📊" },
  { id: "all", label: "Все файлы", icon: "📋" },
  { id: "images", label: "Изображения", icon: "🖼", group: "Images" },
  { id: "audio", label: "Аудио", icon: "🎵", group: "Audio" },
  { id: "video", label: "Видео", icon: "🎬", group: "Videos" },
  { id: "documents", label: "Документы", icon: "📄", group: "Documents" },
  { id: "archives", label: "Архивы", icon: "🗜", group: "Archives" },
  { id: "other", label: "Прочее", icon: "📎", group: "Other" }
];

function buildMediaAssetUrl(filePath, nodePath = activePath) {
  if (!nodePath || !filePath) return "";
  return buildApiUrl("/api/media/file", { path: getResolvedNodePath(nodePath), file: filePath });
}

function stripAssetsPathPrefix(relPath) {
  let rel = String(relPath || "").replace(/\\/g, "/");
  const prefixes = [
    `${STORAGE_FOLDER_NAME}/${STORAGE_SUBFOLDER_ASSETS}/`,
    `${STORAGE_FOLDER_NAME}/_Assets/`,
    `${STORAGE_SUBFOLDER_ASSETS}/`,
    "_Assets/"
  ];
  for (const prefix of prefixes) {
    if (rel.startsWith(prefix)) return rel.slice(prefix.length);
    const lower = prefix.toLowerCase();
    if (rel.toLowerCase().startsWith(lower)) return rel.slice(prefix.length);
  }
  return rel;
}

function buildMarkdownAttachmentRef(relativeAssetsPath) {
  const normalized = String(relativeAssetsPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("..")) return "";
  return `${STORAGE_SUBFOLDER_ASSETS}/${normalized}`;
}

function resolveMarkdownAssetSrc(src, nodePath) {
  const raw = String(src || "").trim();
  if (!raw) return raw;
  if (/^https?:\/\//i.test(raw) || /^data:/i.test(raw)) return raw;
  if (raw.startsWith("/api/")) return appendAgentToApiUrl(raw);

  let relFile = raw.replace(/\\/g, "/");
  const serviceFolder = getActiveAgentSystemFolder();
  const servicePrefix = serviceFolder ? `${serviceFolder}/` : "";

  if (serviceFolder && relFile.toLowerCase().startsWith(servicePrefix.toLowerCase())) {
    const tail = relFile.slice(servicePrefix.length);
    let serviceAsset = tail;
    serviceAsset = stripAssetsPathPrefix(serviceAsset);
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

  relFile = stripAssetsPathPrefix(relFile);
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

function canInsertDocContentBlocks() {
  if (!activePath || activeSystemFile) return false;
  if (isCurrentModeReadOnly()) return false;
  if (isCurrentModeListTemplate()) return false;
  if (editorViewMode === "preview") return false;
  if (editorSurfaceNode?.classList.contains("hidden")) return false;
  return true;
}

function insertMarkdownAtEditorCursor(text) {
  const snippet = String(text || "");
  if (!snippet) return false;
  if (!canInsertDocContentBlocks()) {
    showToast("Вставка доступна только в режиме редактирования", "error");
    return false;
  }

  if (editorViewMode === "wysiwyg" && wysiwygEditorInstance) {
    try {
      wysiwygEditorInstance.insertText(snippet);
      syncSourceFromWysiwygEditor();
      syncSaveButtonLamp();
      if (getDocAsideTab() === "outline") renderDocOutline();
      return true;
    } catch {
      showToast("Не удалось вставить блок в WYSIWYG", "error");
      return false;
    }
  }

  insertTextAtEditorCursor(snippet);
  if (getDocAsideTab() === "outline") renderDocOutline();
  return true;
}

async function uploadMediaAttachment(file, { nodePath = getActiveNodeApiPath(), subdir = null } = {}) {
  if (!file) return null;
  if (!nodePath) {
    throw new Error("Сначала откройте тему");
  }
  const effectiveSubdir =
    subdir ??
    (activeContentMode === "media"
      ? activeMediaSectionFolder || getActiveMediaSectionParentForCreate()
      : null);
  const normalizedFile = await normalizeImageAttachmentFile(file);
  const data = await readFileAsBase64(normalizedFile);
  const response = await fetch(buildApiUrl("/api/media/file"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      path: resolveManifestPathForNodeApi(getResolvedNodePath(nodePath)),
      data,
      fileName: normalizedFile.name || buildPastedAttachmentFileName(normalizedFile),
      mimeType: normalizedFile.type,
      subdir: effectiveSubdir || undefined
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
  if (activeContentMode !== "media" || isMediaAssetEditing()) return;
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

    showToast(`Изображение сохранено в ${STORAGE_SUBFOLDER_ASSETS}`, "success");
    await refreshMediaListIfVisible();
  } catch (error) {
    showToast(`Ошибка загрузки: ${error.message}`, "error");
  }
}

async function uploadMediaFileFromPicker(file) {
  if (!file || !activePath) return;
  try {
    await uploadMediaAttachment(file);
    showToast(`Файл сохранён в ${STORAGE_SUBFOLDER_ASSETS}`, "success");
    await refreshMediaListIfVisible();
  } catch (error) {
    showToast(`Ошибка загрузки: ${error.message}`, "error");
  } finally {
    if (mediaUploadInputNode) mediaUploadInputNode.value = "";
  }
}

let mediaBulkUploadState = { active: false, done: 0, total: 0, failed: 0, label: "" };
let mediaBulkUploadPanelOpen = false;

function setMediaBulkUploadPanelOpen(open) {
  mediaBulkUploadPanelOpen = Boolean(open);
  syncMediaBulkUploadPanelUi();
}

function syncMediaBulkUploadPanelUi() {
  const host = listViewContentNode.querySelector(".media-bulk-upload-host");
  if (host) host.classList.toggle("is-open", mediaBulkUploadPanelOpen);
  mediaUploadBtnNode?.classList.toggle("is-active", mediaBulkUploadPanelOpen);
  mediaUploadBtnNode?.setAttribute("aria-expanded", mediaBulkUploadPanelOpen ? "true" : "false");
}

function getMediaGroupFileCount(groupName) {
  const items = Array.isArray(mediaFilesCache[groupName]) ? mediaFilesCache[groupName] : [];
  return items.filter((item) => !item.isFolder).length;
}

function getMediaSectionTreeTotalCount() {
  let total = 0;
  for (const groupName of Object.values(MEDIA_VIEW_GROUPS)) {
    total += getMediaGroupFileCount(groupName);
  }
  return total;
}

function getMediaViewOptionCount(mode) {
  if (mode === "dashboard" || mode === "all") return getMediaSectionTreeTotalCount();
  const groupName = MEDIA_VIEW_GROUPS[mode];
  if (!groupName) return null;
  return getMediaGroupFileCount(groupName);
}

function getMediaViewSelectNodeMeta(mode) {
  return MEDIA_VIEW_SELECT_NODES.find((entry) => entry.id === mode) || null;
}

function getMediaUserSections() {
  const folders = Array.isArray(mediaFilesCache.Folders) ? mediaFilesCache.Folders : [];
  const collator = new Intl.Collator("ru", { sensitivity: "base", numeric: true });
  return folders
    .filter((item) => item.isFolder)
    .map((item) => {
      const folderPath = String(item.path || "").replace(/\/$/, "");
      const segments = folderPath.split("/").filter(Boolean);
      return {
        folderPath,
        label: item.name || segments[segments.length - 1] || folderPath,
        depth: Math.max(0, segments.length - 1)
      };
    })
    .filter((item) => item.folderPath)
    .sort((a, b) => collator.compare(a.folderPath, b.folderPath));
}

function hasMediaUserSections() {
  return getMediaUserSections().length > 0;
}

function hasExternalUserSections() {
  return getExternalUserSections().length > 0;
}

function isSectionReadmePath(filePath) {
  const base = String(filePath || "").split("/").pop() || "";
  return base.toLowerCase() === AREA_MANIFEST_FILE.toLowerCase();
}

function getSectionReadmeRelPath(sectionFolder) {
  const folder = String(sectionFolder || "").replace(/\\/g, "/").replace(/\/$/, "");
  return folder ? `${folder}/${AREA_MANIFEST_FILE}` : AREA_MANIFEST_FILE;
}

function buildSectionReadmeContent(title) {
  const safeTitle = String(title || "Раздел").trim() || "Раздел";
  return `---\ntitle: ${safeTitle}\n---\n\n# ${safeTitle}\n\n> Описание раздела.\n`;
}

function externalSectionReadmeExists(sectionFolder) {
  const readmePath = getSectionReadmeRelPath(sectionFolder);
  return externalFilesCache.some((file) => file.relativePath === readmePath);
}

function mediaSectionReadmeExists(sectionFolder) {
  const readmePath = getSectionReadmeRelPath(sectionFolder);
  for (const groupItems of Object.values(mediaFilesCache)) {
    if (!Array.isArray(groupItems)) continue;
    if (groupItems.some((item) => !item.isFolder && item.path === readmePath)) return true;
  }
  return false;
}

function splitSectionReadmeItems(items, sectionFolder) {
  const readmePath = getSectionReadmeRelPath(sectionFolder);
  return {
    readmePath,
    readmeItem: items.find((item) => item.path === readmePath) || null,
    items: items.filter((item) => item.path !== readmePath)
  };
}

function appendSectionReadmeCard(container, sectionFolder, { exists, onEdit }) {
  const card = document.createElement("article");
  card.className = "section-readme-card";

  const title = document.createElement("h5");
  title.className = "section-readme-card-title";
  title.textContent = "Описание раздела";

  const hint = document.createElement("p");
  hint.className = "section-readme-card-hint";
  hint.textContent = exists
    ? `${AREA_MANIFEST_FILE} — необязательное описание каталога`
    : `${AREA_MANIFEST_FILE} ещё не создан`;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "section-readme-card-btn";
  btn.textContent = exists ? "Редактировать" : "Создать описание";
  btn.addEventListener("click", () => onEdit(getSectionReadmeRelPath(sectionFolder)));

  card.append(title, hint, btn);
  container.appendChild(card);
}

function countMediaFilesInSection(sectionFolder) {
  if (!sectionFolder) return 0;
  const prefix = `${sectionFolder}/`;
  let count = 0;
  for (const groupItems of Object.values(mediaFilesCache)) {
    if (!Array.isArray(groupItems)) continue;
    for (const item of groupItems) {
      if (item.isFolder) continue;
      if (isSectionReadmePath(item.path)) continue;
      if (!String(item.path || "").startsWith(prefix)) continue;
      count += 1;
    }
  }
  return count;
}

function pruneActiveMediaSectionFolder() {
  if (!activeMediaSectionFolder) return;
  const folders = Array.isArray(mediaFilesCache.Folders) ? mediaFilesCache.Folders : [];
  if (!folders.length) return;
  const exists = getMediaUserSections().some((section) => section.folderPath === activeMediaSectionFolder);
  if (!exists) activeMediaSectionFolder = null;
}

function getMediaItemsForSection(sectionFolder, viewMode = mediaViewMode) {
  if (!sectionFolder) return [];
  const prefix = `${sectionFolder}/`;
  const groupName = MEDIA_VIEW_GROUPS[viewMode];
  const collator = new Intl.Collator("ru", { sensitivity: "base", numeric: true });
  const items = [];

  for (const groupItems of Object.values(mediaFilesCache)) {
    if (!Array.isArray(groupItems)) continue;
    for (const item of groupItems) {
      if (item.isFolder) continue;
      if (isSectionReadmePath(item.path)) continue;
      if (!String(item.path || "").startsWith(prefix)) continue;
      if (groupName && item.group !== groupName) continue;
      items.push(item);
    }
  }

  return items.sort((a, b) => collator.compare(a.path || a.name || "", b.path || b.name || ""));
}

function formatMediaViewSelectLabel(mode) {
  const node = getMediaViewSelectNodeMeta(mode);
  if (!node?.label) return "";
  const prefix = node.icon ? `${node.icon} ` : "";
  const count = getMediaViewOptionCount(mode);
  const label = `${prefix}${node.label}`;
  return count === null ? label : `${label} (${count})`;
}

function syncMediaViewSelectOptions() {
  if (!mediaViewSelectNode) return;
  const currentValue = mediaViewMode;
  for (const option of mediaViewSelectNode.options) {
    if (option.disabled || option.value === "sep") continue;
    const label = formatMediaViewSelectLabel(option.value);
    if (label) option.textContent = label;
  }
  mediaViewSelectNode.value = currentValue;
}

function rerenderMediaListViewBody() {
  if (activeContentMode !== "media" || isMediaAssetEditing()) return;
  const body = listViewContentNode.querySelector(".media-list-view-body");
  if (body) {
    body.innerHTML = "";
    renderMediaListViewBody(body);
    return;
  }
  renderListViewContent();
}

function setActiveMediaSectionFolder(folderName, { rerender = true, skipRouteSync = false } = {}) {
  const next = folderName ? String(folderName).replace(/\\/g, "/").replace(/\/$/, "").trim() : null;
  if (next === activeMediaSectionFolder) {
    syncMediaSectionTreeActiveState();
    return;
  }
  activeMediaSectionFolder = next;
  if (next) {
    mediaViewMode = "all";
    if (mediaViewSelectNode) mediaViewSelectNode.value = "all";
  }
  syncMediaSectionTreeActiveState();
  if (rerender) rerenderMediaListViewBody();
  if (!skipRouteSync) syncAppRouteToUrl({ push: true });
}

function setMediaViewMode(mode, { rerender = true, skipRouteSync = false } = {}) {
  if (!mode || mode === "sep") return;

  const clearsSection = mode === "dashboard" || mode === "all";
  const unchanged =
    mode === mediaViewMode && (!clearsSection || !activeMediaSectionFolder);
  if (unchanged) {
    syncMediaSectionTreeActiveState();
    return;
  }

  mediaViewMode = mode;
  if (clearsSection) activeMediaSectionFolder = null;
  if (mediaViewSelectNode) mediaViewSelectNode.value = mode;
  syncMediaSectionTreeActiveState();
  if (rerender) rerenderMediaListViewBody();
  if (!skipRouteSync) syncAppRouteToUrl({ push: true });
}

function syncMediaSectionTreeActiveState() {
  const tree = listViewContentNode.querySelector(".media-section-tree");
  if (!tree) return;
  for (const btn of tree.querySelectorAll(".media-section-tree-item[data-media-view]")) {
    const view = btn.dataset.mediaView;
    if (view === "dashboard") {
      btn.classList.toggle("is-active", mediaViewMode === "dashboard" && !activeMediaSectionFolder);
      continue;
    }
    if (view === "all") {
      btn.classList.toggle("is-active", mediaViewMode === "all" && !activeMediaSectionFolder);
    }
  }
  for (const btn of tree.querySelectorAll(".media-section-tree-item[data-media-section]")) {
    btn.classList.toggle("is-active", btn.dataset.mediaSection === activeMediaSectionFolder);
  }
}

function appendMediaSectionTreeItem(
  list,
  { icon, label, count = null, isActive = false, isEmpty = false, depth = 0, onClick }
) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "media-section-tree-item";
  btn.setAttribute("role", "treeitem");
  btn.title = label;
  btn.classList.toggle("is-active", isActive);
  btn.classList.toggle("is-empty", isEmpty);
  if (depth > 0) {
    btn.classList.add("is-nested");
    btn.style.paddingLeft = `${8 + depth * 14}px`;
  }

  const iconNode = document.createElement("span");
  iconNode.className = "media-section-tree-icon";
  iconNode.setAttribute("aria-hidden", "true");
  iconNode.textContent = icon;

  const labelNode = document.createElement("span");
  labelNode.className = "media-section-tree-label";
  labelNode.textContent = label;

  btn.append(iconNode, labelNode);

  if (count !== null) {
    const badge = document.createElement("span");
    badge.className = "media-section-tree-count";
    badge.textContent = String(count);
    btn.appendChild(badge);
  }

  btn.addEventListener("click", onClick);
  list.appendChild(btn);
  return btn;
}

function renderMediaSectionTree(container) {
  if (!container) return;
  container.replaceChildren();

  const list = document.createElement("div");
  list.className = "media-section-tree-list";
  list.setAttribute("role", "tree");
  container.appendChild(list);

  const dashboardBtn = appendMediaSectionTreeItem(list, {
    icon: "📊",
    label: "Обзор использования",
    isActive: mediaViewMode === "dashboard" && !activeMediaSectionFolder,
    onClick: () => setMediaViewMode("dashboard")
  });
  dashboardBtn.dataset.mediaView = "dashboard";

  const allBtn = appendMediaSectionTreeItem(list, {
    icon: "📋",
    label: "Все файлы",
    count: getMediaSectionTreeTotalCount(),
    isActive: mediaViewMode === "all" && !activeMediaSectionFolder,
    onClick: () => setMediaViewMode("all")
  });
  allBtn.dataset.mediaView = "all";

  const divider = document.createElement("div");
  divider.className = "media-section-tree-divider";
  divider.setAttribute("role", "presentation");
  list.appendChild(divider);

  const userSections = getMediaUserSections();
  if (userSections.length === 0) {
    const empty = document.createElement("div");
    empty.className = "media-section-tree-empty";
    empty.textContent = "Нет разделов. Создайте раздел через «+ Раздел».";
    list.appendChild(empty);
  } else {
    for (const section of userSections) {
      const count = countMediaFilesInSection(section.folderPath);
      const btn = appendMediaSectionTreeItem(list, {
        icon: "📁",
        label: section.label,
        count,
        depth: section.depth,
        isActive: activeMediaSectionFolder === section.folderPath,
        isEmpty: count === 0,
        onClick: () => setActiveMediaSectionFolder(section.folderPath)
      });
      btn.dataset.mediaSection = section.folderPath;
    }
  }
}

function ensureMediaListViewLayout() {
  let wrap = listViewContentNode.querySelector(".media-list-view-wrap");
  if (!wrap) {
    listViewContentNode.innerHTML = "";
    mountMediaListViewLayout(listViewContentNode);
    wrap = listViewContentNode.querySelector(".media-list-view-wrap");
  }
  renderMediaSectionTree(wrap.querySelector(".media-section-tree"));
  syncStorageSectionsPanelUi();
  return wrap.querySelector(".media-list-view-body");
}

function renderMediaAllFilesSections(container) {
  const raw = getListViewRawContent();
  const sections = parseMediaSections(raw);
  const naturalCollator = new Intl.Collator("ru", { sensitivity: "base", numeric: true });

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
    renderListEmptyMessage(container, getStorageFolderEmptyMessage("media"));
    return;
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

    const headerNode = document.createElement("div");
    headerNode.className = "list-section-header";
    headerNode.textContent = section.title;
    sectionNode.appendChild(headerNode);

    const listNode = document.createElement("ul");
    listNode.className = "list-items";

    for (const normalized of normalizedItems) {
      const li = document.createElement("li");
      li.className = "list-item";

      const icon = document.createElement("span");
      icon.className = "list-item-icon";
      icon.textContent = normalized.isFolder ? "📁" : "📄";

      const pathNode = document.createElement("span");
      pathNode.className = "list-item-path";
      pathNode.textContent = normalized.path;

      li.appendChild(icon);
      li.appendChild(pathNode);

      if (!normalized.isFolder) {
        li.classList.add("list-item-with-actions");
        const actions = document.createElement("div");
        actions.className = "list-item-actions";
        appendMediaItemActionButtons(actions, { path: normalized.path });
        li.appendChild(actions);
      }

      listNode.appendChild(li);
    }

    sectionNode.appendChild(listNode);
    container.appendChild(sectionNode);
  }
}

function renderMediaListViewBody(container) {
  if (!mediaAssetsExists) {
    renderListEmptyMessage(container, getStorageFolderMissingMessage("media"));
    return;
  }
  if (!Object.values(mediaFilesCache).some((items) => Array.isArray(items) && items.length > 0)) {
    syncMediaFilesCache(modeContentCache.media, mediaFilesCache);
  }
  pruneActiveMediaSectionFolder();
  syncMediaViewSelectOptions();
  renderMediaSectionTree(listViewContentNode.querySelector(".media-section-tree"));
  syncStorageSectionsPanelUi();
  if (mediaViewMode === "dashboard" && (!activeMediaSectionFolder || !isStorageSectionsPanelVisible())) {
    renderMediaUsageDashboard(container);
    return;
  }
  if (isStorageSectionsPanelVisible() && activeMediaSectionFolder) {
    if (mediaViewMode === "all") {
      renderMediaSectionFolderView(container, activeMediaSectionFolder);
      return;
    }
    renderMediaFilteredView(container);
    return;
  }
  if (mediaViewMode !== "all") {
    renderMediaFilteredView(container);
    return;
  }
  renderMediaAllFilesSections(container);
}

function mountMediaListViewLayout(root) {
  const wrap = document.createElement("div");
  wrap.className = "media-list-view-wrap";

  const uploadHost = document.createElement("div");
  uploadHost.className = "media-bulk-upload-host";
  wrap.appendChild(uploadHost);
  mountMediaBulkUploadZone(uploadHost);
  syncMediaBulkUploadPanelUi();

  const split = document.createElement("div");
  split.className = "media-list-view-split";

  const treeHost = document.createElement("nav");
  treeHost.className = "media-section-tree";
  treeHost.setAttribute("aria-label", "Разделы медиа");
  split.appendChild(treeHost);

  const body = document.createElement("div");
  body.className = "media-list-view-body";
  split.appendChild(body);

  wrap.appendChild(split);
  root.appendChild(wrap);
  renderMediaSectionTree(treeHost);
  syncStorageSectionsPanelUi();
  return body;
}

function compareExternalPathsNatural(aPath, bPath) {
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

function getExternalUserSections() {
  const collator = new Intl.Collator("ru", { sensitivity: "base", numeric: true });
  const folderPaths = new Set();

  for (const raw of parseFlatListItems(modeContentCache.external)) {
    const normalized = normalizeListItem(raw);
    if (!normalized.isFolder) continue;
    const folderPath = String(normalized.path || "").replace(/\/$/, "");
    if (folderPath) folderPaths.add(folderPath);
  }

  for (const file of externalFilesCache) {
    const parent = String(file.parent || "").replace(/\\/g, "/");
    if (!parent || parent === ".") continue;
    const parts = parent.split("/").filter(Boolean);
    let built = "";
    for (const part of parts) {
      built = built ? `${built}/${part}` : part;
      folderPaths.add(built);
    }
  }

  return Array.from(folderPaths)
    .map((folderPath) => {
      const segments = folderPath.split("/").filter(Boolean);
      return {
        folderPath,
        label: segments[segments.length - 1] || folderPath,
        depth: Math.max(0, segments.length - 1)
      };
    })
    .sort((a, b) => collator.compare(a.folderPath, b.folderPath));
}

function countExternalFilesInSection(sectionFolder) {
  if (!sectionFolder) return externalFilesCache.length;
  const prefix = `${sectionFolder}/`;
  let count = 0;
  for (const file of externalFilesCache) {
    const path = String(file.relativePath || "");
    if (isSectionReadmePath(path)) continue;
    const parent = String(file.parent || "").replace(/\\/g, "/");
    if (path.startsWith(prefix) || parent === sectionFolder) count += 1;
  }
  return count;
}

function pruneActiveExternalSectionFolder() {
  if (!activeExternalSectionFolder) return;
  const exists = getExternalUserSections().some(
    (section) => section.folderPath === activeExternalSectionFolder
  );
  if (!exists) activeExternalSectionFolder = null;
}

function getExternalMdItems() {
  return externalFilesCache
    .map((item) => ({
      path: item.relativePath,
      name: item.name,
      parent: item.parent,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      title: item.name.replace(/\.md$/i, "")
    }))
    .sort((a, b) => compareExternalPathsNatural(a.path, b.path));
}

function filterExternalMdItems(items, sectionFolder) {
  if (!sectionFolder) return items;
  const prefix = `${sectionFolder}/`;
  return items.filter((item) => {
    const path = String(item.path || "");
    const parent = String(item.parent || "").replace(/\\/g, "/");
    return path.startsWith(prefix) || parent === sectionFolder;
  });
}

function getExternalChildSections(sectionFolder) {
  const prefix = sectionFolder ? `${sectionFolder}/` : "";
  const collator = new Intl.Collator("ru", { sensitivity: "base", numeric: true });
  return getExternalUserSections()
    .filter((section) => {
      const folderPath = section.folderPath;
      if (!folderPath.startsWith(prefix) || folderPath === sectionFolder) return false;
      const remainder = folderPath.slice(prefix.length);
      return remainder && !remainder.includes("/");
    })
    .sort((a, b) => collator.compare(a.label, b.label));
}

function getActiveExternalSectionParentForCreate() {
  if (!isStorageSectionsPanelVisible()) return null;
  if (activeExternalSectionFolder) return activeExternalSectionFolder;
  const route = parseAppRoute(location.pathname);
  if (route.view === "external" && route.mediaSectionPath) {
    return route.mediaSectionPath;
  }
  return null;
}

function setActiveExternalSectionFolder(folderName, { rerender = true, skipRouteSync = false } = {}) {
  const next = folderName ? String(folderName).replace(/\\/g, "/").replace(/\/$/, "").trim() : null;
  if (next === activeExternalSectionFolder) {
    syncExternalSectionTreeActiveState();
    return;
  }
  activeExternalSectionFolder = next;
  syncExternalSectionTreeActiveState();
  if (rerender) rerenderExternalListViewBody();
  if (!skipRouteSync) syncAppRouteToUrl({ push: true });
}

function syncExternalSectionTreeActiveState() {
  const tree = listViewContentNode.querySelector(".external-section-tree");
  if (!tree) return;
  for (const btn of tree.querySelectorAll(".media-section-tree-item[data-external-view]")) {
    btn.classList.toggle("is-active", btn.dataset.externalView === "all" && !activeExternalSectionFolder);
  }
  for (const btn of tree.querySelectorAll(".media-section-tree-item[data-external-section]")) {
    btn.classList.toggle("is-active", btn.dataset.externalSection === activeExternalSectionFolder);
  }
}

function renderExternalSectionTree(container) {
  if (!container) return;
  container.replaceChildren();

  const list = document.createElement("div");
  list.className = "media-section-tree-list";
  list.setAttribute("role", "tree");
  container.appendChild(list);

  const allBtn = appendMediaSectionTreeItem(list, {
    icon: "📋",
    label: "Все элементы",
    count: externalFilesCache.length,
    isActive: !activeExternalSectionFolder,
    onClick: () => setActiveExternalSectionFolder(null)
  });
  allBtn.dataset.externalView = "all";

  const divider = document.createElement("div");
  divider.className = "media-section-tree-divider";
  divider.setAttribute("role", "presentation");
  list.appendChild(divider);

  const userSections = getExternalUserSections();
  if (userSections.length === 0) {
    const empty = document.createElement("div");
    empty.className = "media-section-tree-empty";
    empty.textContent = "Нет разделов. Создайте раздел через «+ Раздел».";
    list.appendChild(empty);
  } else {
    for (const section of userSections) {
      const count = countExternalFilesInSection(section.folderPath);
      const btn = appendMediaSectionTreeItem(list, {
        icon: "📁",
        label: section.label,
        count,
        depth: section.depth,
        isActive: activeExternalSectionFolder === section.folderPath,
        isEmpty: count === 0,
        onClick: () => setActiveExternalSectionFolder(section.folderPath)
      });
      btn.dataset.externalSection = section.folderPath;
    }
  }
}

function mountExternalListViewLayout(root) {
  const wrap = document.createElement("div");
  wrap.className = "media-list-view-wrap external-list-view-wrap";

  const split = document.createElement("div");
  split.className = "media-list-view-split external-list-view-split";

  const treeHost = document.createElement("nav");
  treeHost.className = "media-section-tree external-section-tree";
  treeHost.setAttribute("aria-label", "Разделы многофайловой памяти");
  split.appendChild(treeHost);

  const body = document.createElement("div");
  body.className = "media-list-view-body external-list-view-body";
  split.appendChild(body);

  wrap.appendChild(split);
  root.appendChild(wrap);
  renderExternalSectionTree(treeHost);
  syncStorageSectionsPanelUi();
  return body;
}

function ensureExternalListViewLayout() {
  let wrap = listViewContentNode.querySelector(".external-list-view-wrap");
  if (!wrap) {
    listViewContentNode.innerHTML = "";
    mountExternalListViewLayout(listViewContentNode);
    wrap = listViewContentNode.querySelector(".external-list-view-wrap");
  }
  renderExternalSectionTree(wrap.querySelector(".external-section-tree"));
  syncStorageSectionsPanelUi();
  return wrap.querySelector(".external-list-view-body");
}

function rerenderExternalListViewBody() {
  if (activeContentMode !== "external" || isExternalFileEditing()) return;
  const body = listViewContentNode.querySelector(".external-list-view-body");
  if (body) {
    body.innerHTML = "";
    renderExternalListViewBody(body);
    return;
  }
  renderListViewContent();
}

function renderExternalSectionFolderView(container, sectionFolder, items) {
  const childSections = getExternalChildSections(sectionFolder);
  const { items: contentItems } = splitSectionReadmeItems(items, sectionFolder);
  const readmeExists = externalSectionReadmeExists(sectionFolder);

  if (childSections.length === 0 && contentItems.length === 0 && !readmeExists) {
    renderListEmptyMessage(container, `В разделе «${sectionFolder}» пока нет элементов`);
    return;
  }

  const head = document.createElement("div");
  head.className = "media-section-folder-head";
  const title = document.createElement("h4");
  title.className = "media-section-folder-title";
  title.textContent = `📁 ${sectionFolder}`;
  head.appendChild(title);
  container.appendChild(head);

  appendSectionReadmeCard(container, sectionFolder, {
    exists: readmeExists,
    onEdit: (readmePath) => void openExternalSectionReadme(readmePath, sectionFolder)
  });

  if (childSections.length > 0) {
    const subList = document.createElement("ul");
    subList.className = "media-section-subfolder-list";
    for (const child of childSections) {
      const li = document.createElement("li");
      li.className = "media-section-subfolder-item";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "media-section-subfolder-btn";
      btn.textContent = `📁 ${child.label}`;
      btn.title = child.folderPath;
      btn.addEventListener("click", () => setActiveExternalSectionFolder(child.folderPath));
      li.appendChild(btn);
      subList.appendChild(li);
    }
    container.appendChild(subList);
  }

  if (contentItems.length > 0) {
    renderExternalViewContent(container, contentItems);
  }
}

function renderExternalViewContent(container, mdItems) {
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

  function formatExternalItemSection(item) {
    const parent = String(item.parent || "").replace(/\\/g, "/").trim();
    if (!parent || parent === ".") return "Корень";
    return parent;
  }

  if (mdItems.length === 0) {
    renderListEmptyMessage(container, "Markdown-файлы не найдены");
    return;
  }

  if (externalViewMode === "table") {
    const table = document.createElement("table");
    table.className = "external-table";
    table.innerHTML = `
      <thead>
        <tr>
          <th>Раздел</th>
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
        <td>${escapeHtml(formatExternalItemSection(item))}</td>
        <td>${escapeHtml(item.title)}</td>
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
    container.appendChild(table);
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
      card.style.cursor = "pointer";
      card.addEventListener("click", () => openExternalFile(item.path));
      grid.appendChild(card);
    }
    container.appendChild(grid);
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
    container.appendChild(calendar);
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
      compareExternalPathsNatural(a[0], b[0])
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
      container.appendChild(sectionNode);
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

    for (const [topic, items] of Array.from(groups.entries()).sort((a, b) =>
      naturalCollator.compare(a[0], b[0])
    )) {
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

    container.appendChild(grid);
    return;
  }

  if (externalViewMode === "mindmap") {
    renderExternalMindmapCanvas(container, mdItems);
    return;
  }

  if (externalViewMode === "cheatsheet") {
    renderExternalCheatsheetView(container, mdItems);
    return;
  }

  if (externalViewMode === "graph") {
    renderExternalGraphCanvas(container, mdItems);
    return;
  }

  const listNode = document.createElement("ul");
  listNode.className = "list-items";
  for (const item of mdItems) {
    const li = document.createElement("li");
    li.className = "list-item";
    li.style.cursor = "pointer";
    li.addEventListener("click", () => openExternalFile(item.path));

    const icon = document.createElement("span");
    icon.className = "list-item-icon";
    icon.textContent = "📄";

    const pathNode = document.createElement("span");
    pathNode.className = "list-item-path";
    pathNode.textContent = item.path;

    li.appendChild(icon);
    li.appendChild(pathNode);
    listNode.appendChild(li);
  }
  container.appendChild(listNode);
}

function renderExternalListViewBody(container) {
  pruneActiveExternalSectionFolder();
  renderExternalSectionTree(listViewContentNode.querySelector(".external-section-tree"));
  syncStorageSectionsPanelUi();

  const allItems = getExternalMdItems();
  if (allItems.length === 0 && getExternalUserSections().length === 0) {
    renderListEmptyMessage(container, "Markdown-файлы не найдены");
    return;
  }

  if (isStorageSectionsPanelVisible() && activeExternalSectionFolder) {
    const items = filterExternalMdItems(allItems, activeExternalSectionFolder);
    renderExternalSectionFolderView(container, activeExternalSectionFolder, items);
    return;
  }

  renderExternalViewContent(container, allItems);
}

function getFlatStorageSectionTreeLabel(mode) {
  if (mode === "scripts") return "Разделы скриптов";
  if (mode === "inbox") return "Разделы входящих";
  if (mode === "artefacts") return "Разделы артефактов";
  return "Разделы";
}

function getFlatStorageNormalizedItems(mode) {
  return parseFlatListItems(modeContentCache[mode] || "")
    .map((raw) => normalizeListItem(raw))
    .filter((item) => item.path);
}

function getFlatStorageUserSections(mode) {
  const collator = new Intl.Collator("ru", { sensitivity: "base", numeric: true });
  const folderPaths = new Set();

  for (const item of getFlatStorageNormalizedItems(mode)) {
    if (item.isFolder) {
      const folderPath = String(item.path || "").replace(/\/$/, "");
      if (folderPath) folderPaths.add(folderPath);
      continue;
    }
    const parts = String(item.path || "").split("/").filter(Boolean);
    if (parts.length <= 1) continue;
    let built = "";
    for (let i = 0; i < parts.length - 1; i += 1) {
      built = built ? `${built}/${parts[i]}` : parts[i];
      folderPaths.add(built);
    }
  }

  return Array.from(folderPaths)
    .map((folderPath) => {
      const segments = folderPath.split("/").filter(Boolean);
      return {
        folderPath,
        label: segments[segments.length - 1] || folderPath,
        depth: Math.max(0, segments.length - 1)
      };
    })
    .sort((a, b) => collator.compare(a.folderPath, b.folderPath));
}

function countFlatStorageItemsInSection(mode, sectionFolder) {
  return filterFlatStorageSectionItems(getFlatStorageNormalizedItems(mode), sectionFolder).length;
}

function filterFlatStorageSectionItems(items, sectionFolder) {
  if (!sectionFolder) {
    return items.filter((item) => !item.isFolder && !isSectionReadmePath(item.path));
  }
  const prefix = `${sectionFolder}/`;
  return items.filter((item) => {
    if (item.isFolder) return false;
    if (isSectionReadmePath(item.path)) return false;
    const path = String(item.path || "");
    if (!path.startsWith(prefix)) return false;
    return !path.slice(prefix.length).includes("/");
  });
}

function flatStorageSectionReadmeExists(mode, sectionFolder) {
  const readmePath = getSectionReadmeRelPath(sectionFolder);
  return getFlatStorageNormalizedItems(mode).some(
    (item) => !item.isFolder && item.path === readmePath
  );
}

function getFlatStorageChildSections(mode, sectionFolder) {
  const prefix = sectionFolder ? `${sectionFolder}/` : "";
  const collator = new Intl.Collator("ru", { sensitivity: "base", numeric: true });
  return getFlatStorageUserSections(mode)
    .filter((section) => {
      const folderPath = section.folderPath;
      if (!folderPath.startsWith(prefix) || folderPath === sectionFolder) return false;
      const remainder = folderPath.slice(prefix.length);
      return remainder && !remainder.includes("/");
    })
    .sort((a, b) => collator.compare(a.label, b.label));
}

function pruneActiveFlatStorageSectionFolder(mode = activeContentMode) {
  if (!isFlatStorageSectionMode(mode) || !activeFlatStorageSectionFolder[mode]) return;
  const exists = getFlatStorageUserSections(mode).some(
    (section) => section.folderPath === activeFlatStorageSectionFolder[mode]
  );
  if (!exists) activeFlatStorageSectionFolder[mode] = null;
}

function getActiveFlatStorageSectionParentForCreate(mode = activeContentMode) {
  if (!isFlatStorageSectionMode(mode) || !isStorageSectionsPanelVisible()) return null;
  if (activeFlatStorageSectionFolder[mode]) return activeFlatStorageSectionFolder[mode];
  const route = parseAppRoute(location.pathname);
  if (route.view === mode && route.mediaSectionPath) return route.mediaSectionPath;
  return null;
}

function setActiveFlatStorageSectionFolder(mode, folderName, { rerender = true, skipRouteSync = false } = {}) {
  if (!isFlatStorageSectionMode(mode)) return;
  const next = folderName ? String(folderName).replace(/\\/g, "/").replace(/\/$/, "").trim() : null;
  if (next === activeFlatStorageSectionFolder[mode]) {
    syncFlatStorageSectionTreeActiveState(mode);
    return;
  }
  activeFlatStorageSectionFolder[mode] = next;
  syncFlatStorageSectionTreeActiveState(mode);
  if (rerender) rerenderFlatStorageListViewBody(mode);
  if (!skipRouteSync) syncAppRouteToUrl({ push: true });
}

function syncFlatStorageSectionTreeActiveState(mode) {
  const tree = listViewContentNode.querySelector(`.flat-storage-section-tree[data-mode="${mode}"]`);
  if (!tree) return;
  for (const btn of tree.querySelectorAll(".media-section-tree-item[data-flat-storage-view]")) {
    btn.classList.toggle("is-active", btn.dataset.flatStorageView === "all" && !activeFlatStorageSectionFolder[mode]);
  }
  for (const btn of tree.querySelectorAll(".media-section-tree-item[data-flat-storage-section]")) {
    btn.classList.toggle("is-active", btn.dataset.flatStorageSection === activeFlatStorageSectionFolder[mode]);
  }
}

function renderFlatStorageSectionTree(container, mode) {
  if (!container) return;
  container.replaceChildren();

  const list = document.createElement("div");
  list.className = "media-section-tree-list";
  list.setAttribute("role", "tree");
  container.appendChild(list);

  const allCount = filterFlatStorageSectionItems(getFlatStorageNormalizedItems(mode), null).length;
  const allBtn = appendMediaSectionTreeItem(list, {
    icon: "📋",
    label: "Все элементы",
    count: allCount,
    isActive: !activeFlatStorageSectionFolder[mode],
    onClick: () => setActiveFlatStorageSectionFolder(mode, null)
  });
  allBtn.dataset.flatStorageView = "all";

  const divider = document.createElement("div");
  divider.className = "media-section-tree-divider";
  divider.setAttribute("role", "presentation");
  list.appendChild(divider);

  const userSections = getFlatStorageUserSections(mode);
  if (userSections.length === 0) {
    const empty = document.createElement("div");
    empty.className = "media-section-tree-empty";
    empty.textContent = "Нет разделов. Создайте раздел через «+ Раздел».";
    list.appendChild(empty);
  } else {
    for (const section of userSections) {
      const count = countFlatStorageItemsInSection(mode, section.folderPath);
      const btn = appendMediaSectionTreeItem(list, {
        icon: "📁",
        label: section.label,
        count,
        depth: section.depth,
        isActive: activeFlatStorageSectionFolder[mode] === section.folderPath,
        isEmpty: count === 0,
        onClick: () => setActiveFlatStorageSectionFolder(mode, section.folderPath)
      });
      btn.dataset.flatStorageSection = section.folderPath;
    }
  }
}

function mountFlatStorageListViewLayout(root, mode) {
  const wrap = document.createElement("div");
  wrap.className = `media-list-view-wrap flat-storage-list-view-wrap flat-storage-list-view-wrap--${mode}`;

  const split = document.createElement("div");
  split.className = "media-list-view-split flat-storage-list-view-split";

  const treeHost = document.createElement("nav");
  treeHost.className = "media-section-tree flat-storage-section-tree";
  treeHost.dataset.mode = mode;
  treeHost.setAttribute("aria-label", getFlatStorageSectionTreeLabel(mode));
  split.appendChild(treeHost);

  const body = document.createElement("div");
  body.className = "media-list-view-body flat-storage-list-view-body";
  split.appendChild(body);

  wrap.appendChild(split);
  root.appendChild(wrap);
  renderFlatStorageSectionTree(treeHost, mode);
  syncStorageSectionsPanelUi();
  return body;
}

function ensureFlatStorageListViewLayout(mode) {
  let wrap = listViewContentNode.querySelector(`.flat-storage-list-view-wrap--${mode}`);
  if (!wrap) {
    return mountFlatStorageListViewLayout(listViewContentNode, mode);
  }
  renderFlatStorageSectionTree(wrap.querySelector(".flat-storage-section-tree"));
  syncStorageSectionsPanelUi();
  return wrap.querySelector(".flat-storage-list-view-body");
}

function rerenderFlatStorageListViewBody(mode = activeContentMode) {
  const body = listViewContentNode.querySelector(`.flat-storage-list-view-wrap--${mode} .flat-storage-list-view-body`);
  if (!body) {
    renderListViewContent();
    return;
  }
  body.innerHTML = "";
  renderFlatStorageListViewBody(body, mode);
}

function renderFlatStorageListItems(container, items) {
  if (items.length === 0) {
    renderListEmptyMessage(container, getStorageFolderEmptyMessage());
    return;
  }

  const naturalCollator = new Intl.Collator("ru", { sensitivity: "base", numeric: true });
  const normalizedItems = items
    .slice()
    .sort((a, b) => naturalCollator.compare(String(a.path || ""), String(b.path || "")));

  const listNode = document.createElement("ul");
  listNode.className = "list-items";
  for (const normalized of normalizedItems) {
    const li = document.createElement("li");
    li.className = "list-item";
    const icon = document.createElement("span");
    icon.className = "list-item-icon";
    icon.textContent = "📄";
    const pathNode = document.createElement("span");
    pathNode.className = "list-item-path";
    pathNode.textContent = normalized.path;
    li.append(icon, pathNode);
    listNode.appendChild(li);
  }
  container.appendChild(listNode);
}

function renderFlatStorageSectionFolderView(container, mode, sectionFolder) {
  const childSections = getFlatStorageChildSections(mode, sectionFolder);
  const items = filterFlatStorageSectionItems(getFlatStorageNormalizedItems(mode), sectionFolder);
  const readmeExists = flatStorageSectionReadmeExists(mode, sectionFolder);

  if (childSections.length === 0 && items.length === 0 && !readmeExists) {
    renderListEmptyMessage(container, `В разделе «${sectionFolder}» пока нет элементов`);
    return;
  }

  const head = document.createElement("div");
  head.className = "media-section-folder-head";
  const title = document.createElement("h4");
  title.className = "media-section-folder-title";
  title.textContent = `📁 ${sectionFolder}`;
  head.appendChild(title);
  container.appendChild(head);

  appendSectionReadmeCard(container, sectionFolder, {
    exists: readmeExists,
    onEdit: (readmePath) => void openFlatStorageSectionReadme(mode, readmePath, sectionFolder)
  });

  if (childSections.length > 0) {
    const subList = document.createElement("ul");
    subList.className = "media-section-subfolder-list";
    for (const child of childSections) {
      const li = document.createElement("li");
      li.className = "media-section-subfolder-item";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "media-section-subfolder-btn";
      btn.textContent = `📁 ${child.label}`;
      btn.title = child.folderPath;
      btn.addEventListener("click", () => setActiveFlatStorageSectionFolder(mode, child.folderPath));
      li.appendChild(btn);
      subList.appendChild(li);
    }
    container.appendChild(subList);
  }

  if (items.length > 0) {
    renderFlatStorageListItems(container, items);
  }
}

function renderFlatStorageAllItemsView(container, mode) {
  const items = filterFlatStorageSectionItems(getFlatStorageNormalizedItems(mode), null);
  if (items.length === 0 && getFlatStorageUserSections(mode).length === 0) {
    renderListEmptyMessage(container, getStorageFolderEmptyMessage(mode));
    return;
  }
  renderFlatStorageListItems(container, items);
}

function renderFlatStorageListViewBody(container, mode) {
  pruneActiveFlatStorageSectionFolder(mode);
  renderFlatStorageSectionTree(
    listViewContentNode.querySelector(`.flat-storage-section-tree[data-mode="${mode}"]`),
    mode
  );
  syncStorageSectionsPanelUi();

  if (isStorageSectionsPanelVisible() && activeFlatStorageSectionFolder[mode]) {
    renderFlatStorageSectionFolderView(container, mode, activeFlatStorageSectionFolder[mode]);
    return;
  }

  renderFlatStorageAllItemsView(container, mode);
}

function updateMediaBulkUploadProgressUI() {
  const zone = listViewContentNode.querySelector(".media-bulk-upload-zone");
  if (zone) syncMediaBulkUploadZoneUi(zone);
}

function syncMediaBulkUploadZoneUi(zone) {
  const idle = zone.querySelector(".media-bulk-upload-idle");
  const progress = zone.querySelector(".media-bulk-upload-progress");
  const fill = zone.querySelector(".media-bulk-upload-progress-fill");
  const label = zone.querySelector(".media-bulk-upload-progress-label");
  const percent = zone.querySelector(".media-bulk-upload-progress-percent");

  const { active, done, total, label: statusLabel } = mediaBulkUploadState;
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;

  zone.classList.toggle("is-uploading", active);
  zone.classList.toggle("is-dragover", false);
  idle?.classList.toggle("hidden", active);
  progress?.classList.toggle("hidden", !active);
  if (fill) fill.style.width = `${pct}%`;
  if (percent) percent.textContent = `${pct}%`;
  if (label) {
    label.textContent =
      statusLabel || (active ? `Загружено ${done} из ${total}` : "");
  }
}

function mountMediaBulkUploadZone(host) {
  host.innerHTML = "";

  const panel = document.createElement("div");
  panel.className = "media-bulk-upload-panel";

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "media-bulk-upload-close modal-close-btn";
  closeBtn.setAttribute("aria-label", "Закрыть");
  closeBtn.textContent = "×";
  closeBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    if (mediaBulkUploadState.active) return;
    setMediaBulkUploadPanelOpen(false);
  });

  const zone = document.createElement("div");
  zone.className = "media-bulk-upload-zone";
  zone.tabIndex = 0;
  zone.setAttribute("role", "button");
  zone.setAttribute("aria-label", "Массовая загрузка файлов в Assets");

  const idle = document.createElement("div");
  idle.className = "media-bulk-upload-idle";
  const icon = document.createElement("div");
  icon.className = "media-bulk-upload-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = "📤";
  const title = document.createElement("p");
  title.className = "media-bulk-upload-title";
  title.textContent = "Перетащите файлы сюда";
  const hint = document.createElement("p");
  hint.className = "media-bulk-upload-hint";
  hint.textContent = "или нажмите для выбора · можно несколько файлов";
  idle.append(icon, title, hint);

  const progress = document.createElement("div");
  progress.className = "media-bulk-upload-progress hidden";
  const percent = document.createElement("div");
  percent.className = "media-bulk-upload-progress-percent";
  percent.textContent = "0%";
  const track = document.createElement("div");
  track.className = "media-bulk-upload-progress-track";
  track.setAttribute("aria-hidden", "true");
  const fill = document.createElement("div");
  fill.className = "media-bulk-upload-progress-fill";
  track.appendChild(fill);
  const progressLabel = document.createElement("p");
  progressLabel.className = "media-bulk-upload-progress-label";
  progressLabel.textContent = "Загрузка…";
  progress.append(percent, track, progressLabel);

  const input = document.createElement("input");
  input.type = "file";
  input.multiple = true;
  input.hidden = true;
  input.className = "media-bulk-upload-input";
  if (mediaUploadInputNode?.accept) input.accept = mediaUploadInputNode.accept;

  zone.append(idle, progress);
  panel.append(closeBtn, zone);
  host.append(panel, input);

  wireMediaBulkUploadZone(zone, input);
  syncMediaBulkUploadZoneUi(zone);
}

function wireMediaBulkUploadZone(zone, input) {
  const pickFiles = () => {
    if (mediaBulkUploadState.active) return;
    input.click();
  };

  zone.addEventListener("click", () => {
    if (mediaBulkUploadState.active) return;
    pickFiles();
  });

  zone.addEventListener("keydown", (event) => {
    if (mediaBulkUploadState.active) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      pickFiles();
    }
  });

  input.addEventListener("change", () => {
    const files = input.files ? [...input.files] : [];
    input.value = "";
    if (files.length) void uploadMediaFilesBulk(files);
  });

  zone.addEventListener("dragover", (event) => {
    if (mediaBulkUploadState.active) return;
    event.preventDefault();
    zone.classList.add("is-dragover");
  });

  zone.addEventListener("dragleave", () => {
    zone.classList.remove("is-dragover");
  });

  zone.addEventListener("drop", (event) => {
    if (mediaBulkUploadState.active) return;
    event.preventDefault();
    zone.classList.remove("is-dragover");
    const files = event.dataTransfer?.files ? [...event.dataTransfer.files] : [];
    if (files.length) void uploadMediaFilesBulk(files);
  });
}

async function uploadMediaFilesBulk(files) {
  const list = [...files].filter((file) => file instanceof File);
  if (!list.length) return;
  if (!activePath) {
    showToast("Сначала откройте тему", "error");
    return;
  }

  mediaBulkUploadState = {
    active: true,
    done: 0,
    total: list.length,
    failed: 0,
    label: "Подготовка…"
  };
  updateMediaBulkUploadProgressUI();

  let succeeded = 0;
  for (let i = 0; i < list.length; i += 1) {
    const file = list[i];
    mediaBulkUploadState.label = `${file.name} · ${i + 1} из ${list.length}`;
    updateMediaBulkUploadProgressUI();
    try {
      await uploadMediaAttachment(file);
      succeeded += 1;
    } catch (error) {
      mediaBulkUploadState.failed += 1;
      showToast(`${file.name}: ${error.message}`, "error");
    }
    mediaBulkUploadState.done = i + 1;
    updateMediaBulkUploadProgressUI();
  }

  mediaBulkUploadState.active = false;
  mediaBulkUploadState.label = "";
  updateMediaBulkUploadProgressUI();
  await refreshMediaListIfVisible();

  if (succeeded > 0) {
    const failed = mediaBulkUploadState.failed;
    showToast(
      failed
        ? `Загружено ${succeeded} из ${list.length} (${failed} с ошибкой)`
        : `Загружено файлов: ${succeeded}`,
      failed ? "info" : "success"
    );
  } else if (mediaBulkUploadState.failed > 0) {
    showToast("Не удалось загрузить файлы", "error");
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

const MEDIA_ACTION_ICON_EDIT =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>';
const MEDIA_ACTION_ICON_OPEN =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';
const MEDIA_ACTION_ICON_FINDER =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M3 7h18"/></svg>';

let mediaSidecarOpenInFlight = null;
let mediaAssetOpenLockedUntil = 0;

function createMediaActionIcon(svgMarkup) {
  const icon = document.createElement("span");
  icon.className = "media-action-btn-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.innerHTML = svgMarkup;
  return icon;
}

function guardMediaActionClick(event, action) {
  event.preventDefault();
  event.stopPropagation();
  if (typeof event.stopImmediatePropagation === "function") {
    event.stopImmediatePropagation();
  }
  const btn = event.currentTarget;
  if (btn?.dataset?.actionLocked === "1") return false;
  if (btn) btn.dataset.actionLocked = "1";
  window.setTimeout(() => {
    if (btn) delete btn.dataset.actionLocked;
  }, 500);
  action();
  return true;
}

function openMediaAssetExternal(filePath) {
  const now = Date.now();
  if (now < mediaAssetOpenLockedUntil) return;
  mediaAssetOpenLockedUntil = now + 500;
  const url = buildMediaAssetUrl(filePath);
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
}

function getRevealMediaFileLabel() {
  const platform = window.desktopApp?.platform;
  if (platform === "darwin") return "Показать в Finder";
  if (platform === "win32") return "Показать в проводнике";
  return "Показать в папке";
}

async function revealMediaFileInExplorer(mediaFilePath) {
  if (!activePath || !mediaFilePath) return;
  try {
    if (window.desktopApp?.revealFile) {
      await window.desktopApp.revealFile(getResolvedNodePath(activePath), mediaFilePath, activeAgentId);
      return;
    }

    const response = await fetch(buildApiUrl("/api/reveal"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: getActiveNodeApiPath(),
        file: mediaFilePath
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.details || data.error || `HTTP ${response.status}`);
    }
  } catch (error) {
    showToast(`Не удалось показать файл: ${error.message}`, "error");
  }
}

function appendMediaItemActionButtons(target, item) {
  target.append(
    createMediaSidecarEditButton(item),
    createMediaOpenButton(item),
    createMediaRevealInFinderButton(item)
  );
}

function createMediaSidecarEditButton(item) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "media-action-btn media-action-btn-icon-only";
  btn.title = "Редактировать sidecar";
  btn.setAttribute("aria-label", "Редактировать sidecar");
  btn.appendChild(createMediaActionIcon(MEDIA_ACTION_ICON_EDIT));
  btn.addEventListener("click", (event) => {
    guardMediaActionClick(event, () => {
      void openMediaSidecar(item.path);
    });
  });
  return btn;
}

function createMediaOpenButton(item) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "media-action-btn media-action-btn-icon-only";
  btn.title = "Открыть файл";
  btn.setAttribute("aria-label", "Открыть файл");
  btn.appendChild(createMediaActionIcon(MEDIA_ACTION_ICON_OPEN));
  btn.addEventListener("click", (event) => {
    guardMediaActionClick(event, () => {
      openMediaAssetExternal(item.path);
    });
  });
  return btn;
}

function createMediaRevealInFinderButton(item) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "media-action-btn media-action-btn-icon-only";
  btn.title = getRevealMediaFileLabel();
  btn.setAttribute("aria-label", getRevealMediaFileLabel());
  btn.appendChild(createMediaActionIcon(MEDIA_ACTION_ICON_FINDER));
  btn.addEventListener("click", (event) => {
    guardMediaActionClick(event, () => {
      void revealMediaFileInExplorer(item.path);
    });
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
  if (activeMediaSectionFolder) {
    return getMediaItemsForSection(activeMediaSectionFolder, viewMode);
  }
  const groupName = MEDIA_VIEW_GROUPS[viewMode];
  if (!groupName) return [];
  const items = Array.isArray(mediaFilesCache[groupName]) ? mediaFilesCache[groupName] : [];
  return items.filter((item) => !item.isFolder);
}

function getMediaIconForItem(item) {
  if (item?.group && NAVIGATION_MEDIA_GROUP_ICONS[item.group]) {
    return NAVIGATION_MEDIA_GROUP_ICONS[item.group];
  }
  return getDocumentIcon(item?.ext);
}

function getMediaChildSections(sectionFolder) {
  const prefix = sectionFolder ? `${sectionFolder}/` : "";
  const folders = Array.isArray(mediaFilesCache.Folders) ? mediaFilesCache.Folders : [];
  const collator = new Intl.Collator("ru", { sensitivity: "base", numeric: true });
  return folders
    .filter((item) => {
      if (!item.isFolder) return false;
      const folderPath = String(item.path || "").replace(/\/$/, "");
      if (!folderPath.startsWith(prefix) || folderPath === sectionFolder) return false;
      const remainder = folderPath.slice(prefix.length);
      return remainder && !remainder.includes("/");
    })
    .map((item) => {
      const folderPath = String(item.path || "").replace(/\/$/, "");
      return {
        folderPath,
        label: item.name || folderPath.split("/").pop() || folderPath
      };
    })
    .sort((a, b) => collator.compare(a.label, b.label));
}

function renderMediaSectionFolderView(container, sectionFolder) {
  const childSections = getMediaChildSections(sectionFolder);
  const allItems = getMediaItemsForSection(sectionFolder, "all");
  const { items } = splitSectionReadmeItems(allItems, sectionFolder);
  const readmeExists = mediaSectionReadmeExists(sectionFolder);

  if (childSections.length === 0 && items.length === 0 && !readmeExists) {
    renderMediaEmpty(container, `В разделе «${sectionFolder}» пока нет файлов и подразделов`);
    return;
  }

  const head = document.createElement("div");
  head.className = "media-section-folder-head";
  const title = document.createElement("h4");
  title.className = "media-section-folder-title";
  title.textContent = `📁 ${sectionFolder}`;
  head.appendChild(title);
  container.appendChild(head);

  appendSectionReadmeCard(container, sectionFolder, {
    exists: readmeExists,
    onEdit: (readmePath) => void openMediaSectionReadme(readmePath, sectionFolder)
  });

  if (childSections.length > 0) {
    const subList = document.createElement("ul");
    subList.className = "media-section-subfolder-list";
    for (const child of childSections) {
      const li = document.createElement("li");
      li.className = "media-section-subfolder-item";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "media-section-subfolder-btn";
      btn.textContent = `📁 ${child.label}`;
      btn.title = child.folderPath;
      btn.addEventListener("click", () => setActiveMediaSectionFolder(child.folderPath));
      li.appendChild(btn);
      subList.appendChild(li);
    }
    container.appendChild(subList);
  }

  if (items.length === 0) return;

  renderMediaFileRows(container, items, { icon: "📄", showSize: true });
  for (const [index, row] of Array.from(container.querySelectorAll(".media-file-item")).entries()) {
    const item = items[index];
    if (!item) continue;
    const iconNode = row.querySelector(".media-file-icon");
    if (iconNode) iconNode.textContent = getMediaIconForItem(item);
  }
}

const MEDIA_GROUP_LABELS = {
  Images: "Изображения",
  Videos: "Видео",
  Audio: "Аудио",
  Documents: "Документы",
  Archives: "Архивы",
  Other: "Прочее"
};

const MEDIA_DASHBOARD_SORT_DEFAULT = { key: "name", dir: "asc" };
let mediaDashboardSort = { ...MEDIA_DASHBOARD_SORT_DEFAULT };
let mediaDashboardFilters = { type: "all", usage: "all" };

function getAllMediaFileItems() {
  const items = [];
  for (const groupItems of Object.values(mediaFilesCache)) {
    if (!Array.isArray(groupItems)) continue;
    for (const item of groupItems) {
      if (!item.isFolder) items.push(item);
    }
  }
  return items;
}

function buildMediaReferenceCorpus() {
  return [
    modeContentCache.description,
    modeContentCache.internal,
    modeContentCache.todo,
    modeContentCache.configs,
    modeContentCache.env,
    modeContentCache.tabular,
    modeContentCache.external,
    fileContentInputNode?.value || ""
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
}

function countMediaFileUsage(item, corpus) {
  if (!corpus) return 0;
  const path = String(item.path || "").toLowerCase();
  const name = String(item.name || "").toLowerCase();
  const assetRef = buildMarkdownAttachmentRef(item.path).toLowerCase();
  const base = name.includes(".") ? name.slice(0, name.lastIndexOf(".")) : name;
  let count = 0;
  const bump = (token) => {
    if (!token || token.length < 2) return;
    if (corpus.includes(token)) count += 1;
  };
  bump(path);
  bump(name);
  bump(assetRef);
  bump(base);
  return count;
}

function getMediaFileDirectory(item) {
  const normalized = String(item.path || "").replace(/\\/g, "/");
  const idx = normalized.lastIndexOf("/");
  if (idx <= 0) return "/";
  return `/${normalized.slice(0, idx)}`;
}

function getMediaDashboardGroupLabel(group) {
  return MEDIA_GROUP_LABELS[group] || group || "Прочее";
}

function getMediaDashboardTypeIcon(item) {
  if (item.group === "Images") return "🖼";
  if (item.group === "Videos") return "🎬";
  if (item.group === "Audio") return "🎵";
  if (item.group === "Documents") return getDocumentIcon(item.ext);
  if (item.group === "Archives") return "📦";
  return "📎";
}

function enrichMediaDashboardItems(items) {
  const corpus = buildMediaReferenceCorpus();
  return items.map((item) => ({
    ...item,
    directory: getMediaFileDirectory(item),
    usage: countMediaFileUsage(item, corpus),
    typeLabel: getMediaDashboardGroupLabel(item.group)
  }));
}

function filterMediaDashboardItems(items) {
  return items.filter((item) => {
    if (mediaDashboardFilters.type !== "all" && item.group !== mediaDashboardFilters.type) return false;
    if (mediaDashboardFilters.usage === "used" && item.usage <= 0) return false;
    if (mediaDashboardFilters.usage === "unused" && item.usage > 0) return false;
    return true;
  });
}

function sortMediaDashboardItems(items) {
  const collator = new Intl.Collator("ru", { sensitivity: "base", numeric: true });
  const dir = mediaDashboardSort.dir === "desc" ? -1 : 1;
  const key = mediaDashboardSort.key;
  return [...items].sort((a, b) => {
    let cmp = 0;
    if (key === "usage") cmp = (a.usage || 0) - (b.usage || 0);
    else if (key === "directory") cmp = collator.compare(a.directory || "", b.directory || "");
    else cmp = collator.compare(a.name || "", b.name || "");
    return cmp * dir;
  });
}

function createMediaDashboardStatCard({ icon, iconClass, label, value }) {
  const card = document.createElement("article");
  card.className = "media-dashboard-stat-card";

  const iconWrap = document.createElement("div");
  iconWrap.className = `media-dashboard-stat-icon ${iconClass}`;
  iconWrap.setAttribute("aria-hidden", "true");
  iconWrap.textContent = icon;

  const body = document.createElement("div");
  body.className = "media-dashboard-stat-body";

  const valueNode = document.createElement("div");
  valueNode.className = "media-dashboard-stat-value";
  valueNode.textContent = String(value);

  const labelNode = document.createElement("div");
  labelNode.className = "media-dashboard-stat-label";
  labelNode.textContent = label;

  body.append(valueNode, labelNode);
  card.append(iconWrap, body);
  return card;
}

function createMediaDashboardSortButton(label, sortKey) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "media-dashboard-sort-btn";
  const active = mediaDashboardSort.key === sortKey;
  btn.classList.toggle("is-active", active);
  btn.textContent = active
    ? `${label} ${mediaDashboardSort.dir === "asc" ? "↑" : "↓"}`
    : label;
  btn.addEventListener("click", () => {
    if (mediaDashboardSort.key === sortKey) {
      mediaDashboardSort.dir = mediaDashboardSort.dir === "asc" ? "desc" : "asc";
    } else {
      mediaDashboardSort.key = sortKey;
      mediaDashboardSort.dir = "asc";
    }
    renderListViewContent();
  });
  return btn;
}

function renderMediaUsageDashboard(container) {
  container.innerHTML = "";

  if (!Object.values(mediaFilesCache).some((items) => Array.isArray(items) && items.length > 0)) {
    syncMediaFilesCache(modeContentCache.media, mediaFilesCache);
  }

  const allItems = enrichMediaDashboardItems(getAllMediaFileItems());
  const filteredItems = sortMediaDashboardItems(filterMediaDashboardItems(allItems));
  const usedCount = allItems.filter((item) => item.usage > 0).length;
  const unusedCount = Math.max(0, allItems.length - usedCount);

  const dashboard = document.createElement("div");
  dashboard.className = "media-usage-dashboard";

  const stats = document.createElement("div");
  stats.className = "media-dashboard-stats";
  stats.append(
    createMediaDashboardStatCard({
      icon: "🗄",
      iconClass: "is-total",
      label: "Всего файлов",
      value: allItems.length
    }),
    createMediaDashboardStatCard({
      icon: "✓",
      iconClass: "is-used",
      label: "Используются",
      value: usedCount
    }),
    createMediaDashboardStatCard({
      icon: "⊘",
      iconClass: "is-unused",
      label: "Не используются",
      value: unusedCount
    })
  );
  dashboard.appendChild(stats);

  const inventory = document.createElement("section");
  inventory.className = "media-dashboard-inventory";

  const inventoryHead = document.createElement("div");
  inventoryHead.className = "media-dashboard-inventory-head";

  const inventoryTitle = document.createElement("h4");
  inventoryTitle.className = "media-dashboard-inventory-title";
  inventoryTitle.textContent = "Каталог медиа";

  const inventoryMeta = document.createElement("div");
  inventoryMeta.className = "media-dashboard-inventory-meta";
  const results = document.createElement("span");
  results.className = "media-dashboard-results";
  results.textContent = `${filteredItems.length} результатов`;

  const filters = document.createElement("div");
  filters.className = "media-dashboard-filters";

  const typeSelect = document.createElement("select");
  typeSelect.className = "media-dashboard-filter-select";
  typeSelect.setAttribute("aria-label", "Тип файла");
  typeSelect.innerHTML = `
    <option value="all">Все типы</option>
    <option value="Images">Изображения</option>
    <option value="Videos">Видео</option>
    <option value="Audio">Аудио</option>
    <option value="Documents">Документы</option>
    <option value="Archives">Архивы</option>
    <option value="Other">Прочее</option>
  `;
  typeSelect.value = mediaDashboardFilters.type;
  typeSelect.addEventListener("change", () => {
    mediaDashboardFilters.type = typeSelect.value;
    renderListViewContent();
  });

  const usageSelect = document.createElement("select");
  usageSelect.className = "media-dashboard-filter-select";
  usageSelect.setAttribute("aria-label", "Использование");
  usageSelect.innerHTML = `
    <option value="all">Все</option>
    <option value="used">Используются</option>
    <option value="unused">Не используются</option>
  `;
  usageSelect.value = mediaDashboardFilters.usage;
  usageSelect.addEventListener("change", () => {
    mediaDashboardFilters.usage = usageSelect.value;
    renderListViewContent();
  });

  filters.append(typeSelect, usageSelect);
  inventoryMeta.append(results, filters);
  inventoryHead.append(inventoryTitle, inventoryMeta);
  inventory.appendChild(inventoryHead);

  if (filteredItems.length === 0) {
    const empty = document.createElement("div");
    empty.className = "media-dashboard-empty";
    empty.textContent = allItems.length ? "Нет файлов по выбранным фильтрам" : getStorageFolderEmptyMessage("media");
    inventory.appendChild(empty);
    dashboard.appendChild(inventory);
    container.appendChild(dashboard);
    return;
  }

  const tableWrap = document.createElement("div");
  tableWrap.className = "media-dashboard-table-wrap";

  const table = document.createElement("table");
  table.className = "media-dashboard-table";

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  const thPreview = document.createElement("th");
  thPreview.textContent = "Превью";
  const thName = document.createElement("th");
  thName.appendChild(createMediaDashboardSortButton("Имя файла", "name"));
  const thDir = document.createElement("th");
  thDir.appendChild(createMediaDashboardSortButton("Папка", "directory"));
  const thUsage = document.createElement("th");
  thUsage.appendChild(createMediaDashboardSortButton("Использование", "usage"));
  const thActions = document.createElement("th");
  thActions.textContent = "Действия";
  headRow.append(thPreview, thName, thDir, thUsage, thActions);
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  for (const item of filteredItems) {
    const row = document.createElement("tr");
    row.className = "media-dashboard-row";

    const previewCell = document.createElement("td");
    previewCell.className = "media-dashboard-cell-preview";
    const preview = document.createElement("div");
    preview.className = "media-dashboard-preview";
    if (item.group === "Images") {
      const img = document.createElement("img");
      img.alt = item.name;
      img.loading = "lazy";
      img.src = buildMediaAssetUrl(item.path);
      img.addEventListener("error", () => {
        preview.classList.add("is-fallback");
        img.remove();
        preview.textContent = getMediaDashboardTypeIcon(item);
      });
      preview.appendChild(img);
    } else {
      preview.classList.add("is-fallback");
      preview.textContent = getMediaDashboardTypeIcon(item);
    }
    previewCell.appendChild(preview);

    const nameCell = document.createElement("td");
    nameCell.className = "media-dashboard-cell-name";
    const nameMain = document.createElement("div");
    nameMain.className = "media-dashboard-filename";
    nameMain.textContent = item.name;
    const nameMeta = document.createElement("div");
    nameMeta.className = "media-dashboard-filemeta";
    nameMeta.textContent = `${item.typeLabel}${item.size ? ` · ${formatFileSize(item.size)}` : ""}`;
    nameCell.append(nameMain, nameMeta);

    const dirCell = document.createElement("td");
    dirCell.className = "media-dashboard-cell-directory";
    dirCell.textContent = item.directory;

    const usageCell = document.createElement("td");
    usageCell.className = "media-dashboard-cell-usage";
    const usageBadge = document.createElement("span");
    usageBadge.className = `media-dashboard-usage-badge ${item.usage > 0 ? "is-used" : "is-unused"}`;
    usageBadge.textContent = String(item.usage);
    usageCell.appendChild(usageBadge);

    const actionsCell = document.createElement("td");
    actionsCell.className = "media-dashboard-cell-actions";
    appendMediaItemActionButtons(actionsCell, item);

    row.append(previewCell, nameCell, dirCell, usageCell, actionsCell);
    tbody.appendChild(row);
  }

  table.appendChild(tbody);
  tableWrap.appendChild(table);
  inventory.appendChild(tableWrap);
  dashboard.appendChild(inventory);
  container.appendChild(dashboard);
}

function renderMediaEmpty(container, message = "Файлы не найдены") {
  renderListEmptyMessage(container, message);
}

const STORAGE_FOLDER_LABELS = {
  inbox: STORAGE_SUBFOLDER_INBOX,
  references: STORAGE_SUBFOLDER_REFERENCES,
  scripts: STORAGE_SUBFOLDER_SCRIPTS,
  artefacts: STORAGE_SUBFOLDER_ARTEFACTS,
  media: STORAGE_SUBFOLDER_ASSETS,
  temp: STORAGE_SUBFOLDER_TEMP,
  external: STORAGE_SUBFOLDER_CONTENT
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
  return mode === "inbox" || mode === "references" || mode === "scripts" || mode === "artefacts" || mode === "temp";
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
  if (activeContentMode === "media" && !isMediaAssetEditing()) return true;
  if (activeContentMode === "temp") return true;
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
    appendMediaItemActionButtons(actions, item);

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
    imgWrap.addEventListener("click", (event) => {
      guardMediaActionClick(event, () => {
        openMediaAssetExternal(item.path);
      });
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

    appendMediaItemActionButtons(actions, item);

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
    appendMediaItemActionButtons(actions, item);
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
    appendMediaItemActionButtons(actions, item);
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
  const isMediaListView = activeContentMode === "media" && !isMediaAssetEditing();
  const isExternalListView = activeContentMode === "external" && !isExternalFileEditing();
  const isFlatStorageSectionListView = isFlatStorageSectionMode() && isFlatStorageListMode();

  if (activeContentMode === "tabular" && !isTabularSourceEditing()) {
    listViewContentNode.innerHTML = "";
    renderTabularTableView(listViewContentNode);
    return;
  }

  let listTarget = listViewContentNode;
  if (isMediaListView) {
    listTarget = ensureMediaListViewLayout();
    listTarget.innerHTML = "";
    renderMediaListViewBody(listTarget);
    return;
  }
  if (isExternalListView) {
    listTarget = ensureExternalListViewLayout();
    listTarget.innerHTML = "";
    renderExternalListViewBody(listTarget);
    return;
  }
  if (isFlatStorageSectionListView) {
    listTarget = ensureFlatStorageListViewLayout(activeContentMode);
    listTarget.innerHTML = "";
    renderFlatStorageListViewBody(listTarget, activeContentMode);
    return;
  }

  listViewContentNode.innerHTML = "";

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
    const empty = document.createElement("div");
    empty.className = "list-empty";
    if (activeContentMode === "media" && !isMediaAssetEditing()) {
      empty.textContent = getStorageFolderEmptyMessage("media");
    } else {
      empty.textContent = "Список пуст";
    }
    listTarget.appendChild(empty);
    return;
  }

  const sections = activeContentMode === "media"
    ? parseMediaSections(raw)
    : [{ title: "Файлы", items: parseFlatListItems(raw) }];

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
        appendMediaItemActionButtons(actions, { path: normalized.path });
        li.appendChild(actions);
      }

      listNode.appendChild(li);
    }

    sectionNode.appendChild(listNode);
    listTarget.appendChild(sectionNode);
  }
}

function clearMediaSidecarEditor() {
  activeMediaSidecarSourcePath = null;
  activeMediaSidecarPath = null;
  activeMediaMarkdownPath = null;
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

function isTitleLockedNodePath(nodePath = getActiveNodeApiPath()) {
  return isAgentRootIndexPath(nodePath) || isAgentSystemRootIndexPath(nodePath);
}

function setTitleLockedInput(label) {
  titleInputNode.classList.remove("hidden");
  titleInputNode.value = label || "";
  titleInputNode.readOnly = true;
  titleInputNode.disabled = true;
  titleMediaExtNode?.classList.add("hidden");
  titleFixedValueNode.classList.add("hidden");
  if (titleFixedTextNode) titleFixedTextNode.textContent = "";
  placeTitleFixedInTitleRow();
}

function syncTitleLockForActivePath() {
  if (activeSystemFile || activeContentMode !== "description") return;
  if (isAgentSystemRootIndexPath(activePath)) {
    setTitleLockedInput(SERVICE_SECTION_LABEL);
    return;
  }
  if (isAgentRootIndexPath(activePath)) {
    setTitleLockedInput(getActiveAgentLabel() || getAgentTreeTitle());
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
    const response = await fetch(buildApiUrl("/api/media", { path: getActiveNodeApiPath() }));
    if (!response.ok) return;
    const data = await response.json();
    mediaAssetsExists = Boolean(data.exists);
    modeContentCache.media = data.content || "";
    syncMediaFilesCache(data.content, data.groups);
    syncMediaViewSelectOptions();
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
  syncAppRouteToUrl({ replace: true });
}

async function refreshExternalMemoryCaches() {
  const [filesResponse, listingResponse] = await Promise.all([
    fetch(buildApiUrl("/api/external/files", { path: getActiveNodeApiPath() })),
    fetch(buildApiUrl("/api/external", { path: getActiveNodeApiPath() }))
  ]);

  if (filesResponse.ok) {
    const data = await filesResponse.json();
    externalFilesCache = Array.isArray(data.files) ? data.files : [];
  } else {
    throw new Error(`Request failed with ${filesResponse.status}`);
  }

  if (listingResponse.ok) {
    const listingData = await listingResponse.json();
    modeContentCache.external =
      listingData.content || externalFilesCache.map((file) => file.relativePath).join("\n");
    return Boolean(listingData.exists);
  }

  modeContentCache.external = externalFilesCache.map((file) => file.relativePath).join("\n");
  return externalFilesCache.length > 0;
}

function closeExternalFileEditor() {
  void refreshExternalFileListView();
}

async function refreshExternalFileListView({ reloadFromServer = true } = {}) {
  if (!activePath || activeContentMode !== "external") return;

  activeExternalFilePath = null;
  setPropsYamlContent("");
  titleInputNode.value = "";
  syncPropsInputPlaceholder();
  editorViewMode = "preview";

  syncAppRouteToUrl({ replace: true });

  if (reloadFromServer) {
    try {
      const exists = await refreshExternalMemoryCaches();
      fileContentInputNode.value = exists ? modeContentCache.external : "Папка не найдена";
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

function enableMediaSidecarEditor(sourceFilePath, sidecarPath, content, options = {}) {
  activeMediaMarkdownPath = null;
  activeMediaSidecarSourcePath = sourceFilePath;
  activeMediaSidecarPath = sidecarPath;
  updateBreadcrumbsForActiveMode();
  titleEditorBlockNode.classList.remove("hidden");
  applyMediaSidecarTitleUi();
  applyMediaSidecarContentUi(content || "");
  syncPropsInputPlaceholder();
  editorViewMode = "source";
  applyModeUi();
  setEditorViewMode("source", { skipRouteSync: true });
  if (!options.skipRouteSync) {
    syncAppRouteToUrl({ push: true });
  }
}

async function openMediaSidecar(mediaFilePath, options = {}) {
  if (!activePath || activeContentMode !== "media" || !mediaFilePath) return;
  const normalizedPath = String(mediaFilePath || "").replace(/\\/g, "/");
  if (mediaSidecarOpenInFlight === normalizedPath) return;
  mediaSidecarOpenInFlight = normalizedPath;
  try {
    const response = await fetch(
      buildApiUrl("/api/media/sidecar", { path: getActiveNodeApiPath(), file: mediaFilePath })
    );
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Request failed with ${response.status}`);
    }
    const data = await response.json();
    enableMediaSidecarEditor(data.sourceFile, data.sidecar, data.content || "", options);
    if (data.created) showToast("Sidecar-файл создан", "success");
  } catch (error) {
    showToast("Ошибка открытия sidecar", "error");
  } finally {
    if (mediaSidecarOpenInFlight === normalizedPath) {
      mediaSidecarOpenInFlight = null;
    }
  }
}

function isExternalFileEditing() {
  return activeContentMode === "external" && Boolean(activeExternalFilePath);
}

let propsFormEntries = [];
let propsFormHiddenEntries = [];
let propsRawYamlVisible = false;

const STANDARD_PROPS_FIELD_KEYS = [
  "awn-create",
  "awn-update",
  "awn-description",
  "awn-version",
  "awn-sort"
];

const PROPS_FIELD_META = {
  "awn-create": {
    label: "Создан",
    hint: "Дата и время создания документа"
  },
  "awn-update": {
    label: "Изменён",
    hint: "Дата последнего изменения"
  },
  "awn-description": {
    label: "Описание",
    hint: "Краткое назначение темы для агента"
  },
  "awn-version": {
    label: "Версия",
    hint: "Номер или метка версии"
  },
  "awn-sort": {
    label: "Сортировка",
    hint: "Порядок в списках и дереве"
  },
  tags: {
    label: "Теги",
    hint: "Через запятую, как в Obsidian (#tag)"
  },
  title: {
    label: "Заголовок",
    hint: "Отображаемое название"
  }
};

const PROPS_KEY_CANONICAL_ALIASES = {
  "awn-title": "title",
  "awn-desc": "awn-description",
  "awn-created": "awn-create",
  "awn-updated": "awn-update"
};

function normalizePropsKey(key) {
  const raw = String(key || "").trim();
  if (!raw) return raw;

  let normalized = raw;
  const upperLegacy = raw.match(/^AWN-([A-Z0-9_-]+)$/);
  if (upperLegacy) {
    normalized = `awn-${upperLegacy[1].toLowerCase().replace(/_/g, "-")}`;
  } else if (/^awn-/i.test(raw)) {
    normalized = raw.toLowerCase();
  }

  return PROPS_KEY_CANONICAL_ALIASES[normalized] || normalized;
}

function getPropsFieldMeta(key) {
  const normalized = normalizePropsKey(key);
  if (!normalized) {
    return { label: "Свойство", hint: "" };
  }
  if (PROPS_FIELD_META[normalized]) {
    return PROPS_FIELD_META[normalized];
  }
  return { label: normalized, hint: "" };
}

function isStandardPropsFieldKey(key) {
  const normalized = normalizePropsKey(key);
  return Boolean(normalized && STANDARD_PROPS_FIELD_KEYS.includes(normalized));
}

function normalizePropsEntries(entries) {
  const map = new Map();
  for (const entry of entries) {
    if (!entry?.key) continue;
    const key = normalizePropsKey(entry.key);
    map.set(key, { ...entry, key });
  }
  return [...map.values()];
}

const HIDDEN_PROPS_FIELD_KEYS = new Set(["title"]);

function absorbPropsYamlEntries(entries) {
  const normalized = normalizePropsEntries(entries);
  const hidden = [];
  const visible = [];
  for (const entry of normalized) {
    if (entry?.key && HIDDEN_PROPS_FIELD_KEYS.has(entry.key)) hidden.push(entry);
    else visible.push(entry);
  }
  propsFormHiddenEntries = hidden;
  propsFormEntries = ensureStandardPropsEntries(visible);
}

function mergePropsFormEntries() {
  return [...propsFormHiddenEntries, ...propsFormEntries];
}

function ensureStandardPropsEntries(entries) {
  const map = new Map();
  for (const entry of normalizePropsEntries(entries)) {
    if (entry?.key) map.set(entry.key, entry);
  }
  const result = [];
  for (const key of STANDARD_PROPS_FIELD_KEYS) {
    result.push(map.get(key) || { key, kind: "string", value: "" });
  }
  for (const entry of entries) {
    if (!entry?.key || STANDARD_PROPS_FIELD_KEYS.includes(entry.key)) continue;
    if (HIDDEN_PROPS_FIELD_KEYS.has(entry.key)) continue;
    result.push(entry);
  }
  return result;
}

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

    const key = normalizePropsKey(match[2].trim());
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
  propsInputNode.value = stringifyPropsYaml(mergePropsFormEntries());
}

function isPropsFormReadOnly() {
  return editorViewMode === "preview";
}

function getDocAsideTab() {
  const saved = readStorageItem(DOC_ASIDE_TAB_STORAGE_KEY);
  if (saved === "outline" || saved === "blocks" || saved === "props") return saved;
  return "props";
}

function resolveDocAsideTab(tab, { propsAvailable = true, blocksAvailable = true } = {}) {
  const order = ["props", "outline", "blocks"];
  const preferred = order.includes(tab) ? tab : "props";
  const availability = {
    props: propsAvailable,
    outline: true,
    blocks: blocksAvailable
  };
  if (availability[preferred]) return preferred;
  return order.find((id) => availability[id]) || "outline";
}

function setDocAsideTab(tab) {
  const propsAvailable = !docAsideTabPropsBtn?.classList.contains("hidden");
  const blocksAvailable = !docAsideTabBlocksBtn?.classList.contains("hidden");
  const next = resolveDocAsideTab(tab, { propsAvailable, blocksAvailable });
  localStorage.setItem(DOC_ASIDE_TAB_STORAGE_KEY, next);
  syncDocAsideUi({ propsPanelAvailable: propsAvailable, blocksPanelAvailable: blocksAvailable });
}

function slugifyHeadingText(text) {
  const base = String(text || "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return base || "section";
}

function parseMarkdownHeadings(markdown) {
  const lines = String(markdown || "").split(/\r?\n/);
  const headings = [];
  const slugCounts = new Map();
  let inFence = false;
  let fenceChar = "";

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const fenceMatch = line.match(/^(`{3,}|~{3,})/);
    if (fenceMatch) {
      const ch = fenceMatch[1][0];
      if (!inFence) {
        inFence = true;
        fenceChar = ch;
      } else if (ch === fenceChar) {
        inFence = false;
      }
      continue;
    }
    if (inFence) continue;

    const match = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (!match) continue;

    const level = match[1].length;
    const text = match[2]
      .replace(/!\[[^\]]*]\([^)]+\)/g, "")
      .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\*\*|__|\*|_|~~/g, "")
      .trim();
    if (!text) continue;

    const baseSlug = slugifyHeadingText(text);
    const seen = slugCounts.get(baseSlug) || 0;
    slugCounts.set(baseSlug, seen + 1);
    const slug = seen ? `${baseSlug}-${seen + 1}` : baseSlug;

    headings.push({
      level,
      text,
      line: i + 1,
      slug,
      index: headings.length
    });
  }

  return headings;
}

function getDocOutlineMarkdownSource() {
  if (editorViewMode === "wysiwyg" && wysiwygEditorInstance) {
    return normalizeWysiwygExportedMarkdown(wysiwygEditorInstance.getMarkdown());
  }
  return fileContentInputNode?.value || "";
}

function scrollEditorToLine(lineIndexZeroBased) {
  const ta = fileContentInputNode;
  if (!ta || lineIndexZeroBased < 0) return;
  const lines = ta.value.split("\n");
  let pos = 0;
  for (let i = 0; i < lineIndexZeroBased && i < lines.length; i += 1) {
    pos += lines[i].length + 1;
  }
  ta.focus({ preventScroll: true });
  ta.setSelectionRange(pos, pos);
  const styles = getComputedStyle(ta);
  const lineHeight = Number.parseFloat(styles.lineHeight) || 22;
  ta.scrollTop = Math.max(0, lineIndexZeroBased * lineHeight - ta.clientHeight / 3);
  syncEditorLineNumbersScroll();
}

function scrollToDocHeading(heading) {
  if (!heading) return;
  if (editorViewMode === "preview") {
    const target =
      fileContentPreviewNode?.querySelector(`#${CSS.escape(heading.slug)}`) ||
      fileContentPreviewNode?.querySelectorAll("h1,h2,h3,h4,h5,h6")?.[heading.index];
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  if (editorViewMode === "source") {
    scrollEditorToLine(heading.line - 1);
    return;
  }
  if (editorViewMode === "wysiwyg" && wysiwygEditorInstance) {
    scrollEditorToLine(heading.line - 1);
  }
}

function renderDocOutline() {
  if (!docOutlineContentNode) return;
  const headings = parseMarkdownHeadings(getDocOutlineMarkdownSource());
  docOutlineContentNode.innerHTML = "";

  if (!headings.length) {
    const empty = document.createElement("p");
    empty.className = "doc-outline-empty";
    empty.textContent = "Заголовков H1–H6 пока нет";
    docOutlineContentNode.appendChild(empty);
    return;
  }

  const nav = document.createElement("nav");
  nav.className = "doc-outline-nav";
  nav.setAttribute("aria-label", "Оглавление документа");
  const list = document.createElement("ul");
  list.className = "doc-outline-list";

  for (const heading of headings) {
    const item = document.createElement("li");
    item.className = `doc-outline-item doc-outline-h${heading.level}`;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "doc-outline-link";
    btn.title = `${heading.text} (H${heading.level})`;
    btn.dataset.level = String(heading.level);
    btn.textContent = heading.text;
    btn.addEventListener("click", () => scrollToDocHeading(heading));
    item.appendChild(btn);
    list.appendChild(item);
  }

  nav.appendChild(list);
  docOutlineContentNode.appendChild(nav);
}

function renderDocContentBlocks() {
  if (!docBlocksContentNode) return;
  docBlocksContentNode.replaceChildren();

  if (!canInsertDocContentBlocks()) {
    const empty = document.createElement("p");
    empty.className = "doc-blocks-empty";
    empty.textContent = "Блоки доступны в режиме редактирования Markdown.";
    docBlocksContentNode.appendChild(empty);
    return;
  }

  for (const group of DOC_CONTENT_BLOCK_GROUPS) {
    const section = document.createElement("section");
    section.className = "doc-blocks-group";
    section.setAttribute("aria-label", group.title);

    const title = document.createElement("h3");
    title.className = "doc-blocks-group-title";
    title.textContent = group.title;
    section.appendChild(title);

    const list = document.createElement("ul");
    list.className = "doc-blocks-list";

    for (const block of group.blocks) {
      const item = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "doc-block-btn";
      btn.title = block.description || block.label;

      const label = document.createElement("span");
      label.className = "doc-block-btn-label";
      label.textContent = block.label;

      const desc = document.createElement("span");
      desc.className = "doc-block-btn-desc";
      desc.textContent = block.description || "";

      btn.append(label, desc);
      btn.addEventListener("click", () => {
        if (insertMarkdownAtEditorCursor(block.text)) {
          showToast(`Вставлено: ${block.label}`, "success");
        }
      });

      item.appendChild(btn);
      list.appendChild(item);
    }

    section.appendChild(list);
    docBlocksContentNode.appendChild(section);
  }
}

function syncDocAsideUi({
  propsPanelAvailable = true,
  blocksPanelAvailable = canInsertDocContentBlocks()
} = {}) {
  const asideEnabled = yamlPanelNode && !yamlPanelNode.classList.contains("hidden");
  const propsAvailable = Boolean(propsPanelAvailable);
  const blocksAvailable = Boolean(blocksPanelAvailable);
  const effectiveTab = resolveDocAsideTab(getDocAsideTab(), { propsAvailable, blocksAvailable });

  docAsideTabPropsBtn?.classList.toggle("hidden", !propsAvailable);
  docAsideTabBlocksBtn?.classList.toggle("hidden", !blocksAvailable);

  for (const [tabId, btn] of [
    ["props", docAsideTabPropsBtn],
    ["outline", docAsideTabOutlineBtn],
    ["blocks", docAsideTabBlocksBtn]
  ]) {
    btn?.classList.toggle("active", effectiveTab === tabId);
    btn?.setAttribute("aria-selected", effectiveTab === tabId ? "true" : "false");
  }

  docAsidePanelPropsNode?.classList.toggle("hidden", effectiveTab !== "props");
  docAsidePanelOutlineNode?.classList.toggle("hidden", effectiveTab !== "outline");
  docAsidePanelBlocksNode?.classList.toggle("hidden", effectiveTab !== "blocks");

  yamlPanelNode?.classList.remove("is-collapsed");

  if (effectiveTab === "outline") {
    renderDocOutline();
  } else if (effectiveTab === "blocks") {
    renderDocContentBlocks();
  } else if (effectiveTab === "props" && asideEnabled) {
    renderPropsForm();
  }
}

function applyPropsFormViewMode() {
  if (!yamlPanelNode || yamlPanelNode.classList.contains("hidden")) return;
  const readOnly = isPropsFormReadOnly();
  if (readOnly) {
    if (propsRawYamlVisible) {
      absorbPropsYamlEntries(parsePropsYaml(propsInputNode.value || ""));
      propsRawYamlVisible = false;
      propsInputNode.classList.add("hidden");
      if (propsYamlToggleBtn) propsYamlToggleBtn.textContent = "Показать YAML";
    } else if (propsFormFieldsNode?.querySelector('input[data-field="value"]')) {
      readPropsFormIntoEntries();
    }
  }
  yamlPanelNode.classList.toggle("is-props-preview", readOnly);
  propsInputNode.readOnly = readOnly;
  renderPropsForm();
}

function syncDocAsideTabAvailability() {
  if (!yamlPanelNode || yamlPanelNode.classList.contains("hidden")) return;
  syncDocAsideUi({
    propsPanelAvailable: !docAsideTabPropsBtn?.classList.contains("hidden"),
    blocksPanelAvailable: canInsertDocContentBlocks()
  });
}

function renderPropsForm() {
  if (!propsFormFieldsNode) return;
  propsFormEntries = ensureStandardPropsEntries(propsFormEntries);
  propsFormFieldsNode.innerHTML = "";
  const readOnly = isPropsFormReadOnly();
  propsFormFieldsNode.classList.toggle("is-readonly", readOnly);

  if (!propsFormEntries.length) {
    const empty = document.createElement("p");
    empty.className = "props-form-empty";
    empty.textContent = readOnly
      ? "Свойств пока нет."
      : "Свойств пока нет — добавьте поле или откройте YAML.";
    propsFormFieldsNode.appendChild(empty);
    return;
  }

  if (readOnly) {
    const list = document.createElement("div");
    list.className = "props-preview-list";

    for (let index = 0; index < propsFormEntries.length; index += 1) {
      const entry = propsFormEntries[index];
      const meta = getPropsFieldMeta(entry.key);
      const displayValue = getPropsEntryDisplayValue(entry);

      const field = document.createElement("div");
      field.className = "props-preview-field";
      field.dataset.index = String(index);

      const head = document.createElement("div");
      head.className = "props-preview-field-head";

      const label = document.createElement("span");
      label.className = "props-preview-label";
      label.textContent = meta.label || entry.key || "—";

      head.appendChild(label);

      if (entry.key && meta.label !== entry.key) {
        const keyCode = document.createElement("code");
        keyCode.className = "props-preview-key";
        keyCode.textContent = entry.key;
        keyCode.title = entry.key;
        head.appendChild(keyCode);
      }

      const value = document.createElement("div");
      value.className = "props-preview-value";
      value.textContent = displayValue.trim() ? displayValue : "—";
      value.classList.toggle("is-empty", !displayValue.trim());

      field.append(head, value);
      list.appendChild(field);
    }
    propsFormFieldsNode.appendChild(list);
    return;
  }

  const standardEntries = [];
  const customEntries = [];
  for (let index = 0; index < propsFormEntries.length; index += 1) {
    const entry = propsFormEntries[index];
    if (entry?.key && isStandardPropsFieldKey(entry.key)) {
      standardEntries.push({ entry, index });
    } else {
      customEntries.push({ entry, index });
    }
  }

  const appendPropsFieldGroup = (title, items) => {
    if (!items.length) return;

    const group = document.createElement("section");
    group.className = "props-form-group";

    if (title) {
      const groupTitle = document.createElement("h4");
      groupTitle.className = "props-form-group-title";
      groupTitle.textContent = title;
      group.appendChild(groupTitle);
    }

    const groupBody = document.createElement("div");
    groupBody.className = "props-form-group-body";

    for (const { entry, index } of items) {
      groupBody.appendChild(createPropsFormFieldRow(entry, index));
    }

    group.appendChild(groupBody);
    propsFormFieldsNode.appendChild(group);
  };

  appendPropsFieldGroup(null, standardEntries);
  appendPropsFieldGroup("Дополнительные свойства", customEntries);
}

function createPropsFormFieldRow(entry, index) {
  const meta = getPropsFieldMeta(entry.key);
  const row = document.createElement("div");
  row.className = "props-form-row props-form-field";
  row.dataset.index = String(index);
  if (entry.key) row.dataset.propKey = entry.key;

  const head = document.createElement("div");
  head.className = "props-form-field-head";

  if (entry.key) {
    const label = document.createElement("label");
    label.className = "props-form-field-label";
    label.textContent = meta.label || entry.key;

    head.appendChild(label);

    if (meta.label !== entry.key) {
      const keyCode = document.createElement("code");
      keyCode.className = "props-form-field-key";
      keyCode.textContent = entry.key;
      keyCode.title = entry.key;
      head.appendChild(keyCode);
    }
  } else {
    const keyInput = document.createElement("input");
    keyInput.type = "text";
    keyInput.className = "props-form-key-input";
    keyInput.placeholder = "ключ свойства";
    keyInput.value = "";
    keyInput.dataset.field = "key";
    head.appendChild(keyInput);
  }

  const displayValue = getPropsEntryDisplayValue(entry);
  const valueNode = document.createElement("input");
  valueNode.className = "props-form-value";
  valueNode.type = "text";
  valueNode.dataset.field = "value";
  valueNode.value = displayValue;
  valueNode.placeholder = entry.kind === "array" ? "значение1, значение2" : "значение";

  row.append(head, valueNode);

  if (meta.hint) {
    const hint = document.createElement("p");
    hint.className = "props-form-field-hint";
    hint.textContent = meta.hint;
    row.appendChild(hint);
  }

  return row;
}

function setPropsYamlContent(content, { preserveRawMode = false } = {}) {
  propsInputNode.value = content || "";
  absorbPropsYamlEntries(parsePropsYaml(content || ""));
  if (!preserveRawMode) {
    syncYamlFromPropsForm();
    propsRawYamlVisible = false;
    propsInputNode.classList.add("hidden");
    propsYamlToggleBtn.textContent = "Показать YAML";
  }
  renderPropsForm();
}

function readPropsFormIntoEntries() {
  if (!propsFormFieldsNode) return;
  const rows = [...propsFormFieldsNode.querySelectorAll(".props-form-row")].sort(
    (a, b) => Number(a.dataset.index) - Number(b.dataset.index)
  );
  const nextEntries = [];

  rows.forEach((row) => {
    const index = Number(row.dataset.index);
    const keyInput = row.querySelector('[data-field="key"]');
    const valueInput = row.querySelector('[data-field="value"]');
    const keyCode = row.querySelector(".props-form-field-key");
    const base = propsFormEntries[index] || { kind: "string", value: "" };
    const key = normalizePropsKey(
      keyInput
        ? keyInput.value.trim()
        : (row.dataset.propKey || keyCode?.textContent || base.key || "").trim()
    );
    let entry = { ...base, key };
    if (valueInput) {
      entry = applyFormValueToEntry(entry, valueInput.value);
      entry.key = key;
    }
    if (key || getPropsEntryDisplayValue(entry).trim()) {
      nextEntries.push(entry);
    }
  });

  propsFormEntries = ensureStandardPropsEntries(nextEntries);
}

function togglePropsRawYaml() {
  if (isPropsFormReadOnly()) return;
  if (propsRawYamlVisible) {
    absorbPropsYamlEntries(parsePropsYaml(propsInputNode.value || ""));
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

function applyMediaSidecarContentUi(rawContent) {
  const { frontmatter, body } = splitFrontmatter(rawContent);
  setPropsYamlContent(frontmatter);
  fileContentInputNode.value = body;
}

function buildMediaSidecarContent() {
  readPropsFormIntoEntries();
  if (!propsRawYamlVisible) {
    syncYamlFromPropsForm();
  }
  return joinFrontmatter(propsInputNode.value, fileContentInputNode.value);
}

function isMediaMarkdownEditing() {
  return activeContentMode === "media" && Boolean(activeMediaMarkdownPath);
}

function isMediaAssetEditing() {
  return isMediaSidecarEditing() || isMediaMarkdownEditing();
}

function buildMediaMarkdownContent() {
  return buildMediaSidecarContent();
}

function enableMediaMarkdownEditor(filePath, content, options = {}) {
  activeMediaMarkdownPath = filePath;
  activeMediaSidecarSourcePath = null;
  activeMediaSidecarPath = null;
  updateBreadcrumbsForActiveMode();
  titleEditorBlockNode.classList.remove("hidden");
  titleInputNode.value = AREA_MANIFEST_FILE.replace(/\.md$/i, "");
  titleInputNode.readOnly = true;
  applyMediaSidecarContentUi(content || "");
  syncPropsInputPlaceholder();
  editorViewMode = "source";
  applyModeUi();
  setEditorViewMode("source", { skipRouteSync: true });
  if (!options.skipRouteSync) {
    syncAppRouteToUrl({ push: true });
  }
}

async function openMediaMarkdownFile(filePath, options = {}) {
  if (!activePath || activeContentMode !== "media" || !filePath) return;
  try {
    const response = await fetch(
      buildApiUrl("/api/media/markdown", { path: getActiveNodeApiPath(), file: filePath })
    );
    if (!response.ok) throw new Error(`Request failed with ${response.status}`);
    const data = await response.json();
    enableMediaMarkdownEditor(data.file, data.content || "", options);
  } catch {
    showToast("Ошибка открытия markdown-файла", "error");
  }
}

async function ensureExternalSectionReadme(readmePath, sectionFolder) {
  const sectionLabel = String(sectionFolder || "").split("/").filter(Boolean).pop() || "Раздел";
  const response = await fetch(buildApiUrl("/api/external/file"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      path: getActiveNodeApiPath(),
      file: readmePath,
      content: buildSectionReadmeContent(sectionLabel)
    })
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Request failed with ${response.status}`);
  }
  await refreshExternalMemoryCaches();
}

async function openExternalSectionReadme(readmePath, sectionFolder) {
  if (!externalSectionReadmeExists(sectionFolder)) {
    try {
      await ensureExternalSectionReadme(readmePath, sectionFolder);
    } catch (error) {
      showToast(`Не удалось создать ${AREA_MANIFEST_FILE}: ${error.message}`, "error");
      return;
    }
  }
  await openExternalFile(readmePath);
}

async function ensureMediaSectionReadme(readmePath, sectionFolder) {
  const sectionLabel = String(sectionFolder || "").split("/").filter(Boolean).pop() || "Раздел";
  const response = await fetch(buildApiUrl("/api/media/markdown"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      path: getActiveNodeApiPath(),
      file: readmePath,
      content: buildSectionReadmeContent(sectionLabel)
    })
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Request failed with ${response.status}`);
  }
  await refreshMediaCache();
}

async function openMediaSectionReadme(readmePath, sectionFolder) {
  if (!mediaSectionReadmeExists(sectionFolder)) {
    try {
      await ensureMediaSectionReadme(readmePath, sectionFolder);
    } catch (error) {
      showToast(`Не удалось создать ${AREA_MANIFEST_FILE}: ${error.message}`, "error");
      return;
    }
  }
  await openMediaMarkdownFile(readmePath);
}

async function reloadFlatStorageFolderMode(mode) {
  const folder = getFlatStorageSectionFolderName(mode);
  if (!folder) return;
  const response = await fetch(
    buildApiUrl("/api/folder/view", { path: getActiveNodeApiPath(), folder })
  );
  if (!response.ok) throw new Error(`Request failed with ${response.status}`);
  const data = await response.json();
  applyFlatStorageFolderLoadState(mode, data);
}

async function ensureFlatStorageSectionReadme(mode, readmePath, sectionFolder) {
  const sectionLabel = String(sectionFolder || "").split("/").filter(Boolean).pop() || "Раздел";
  const response = await fetch(buildApiUrl("/api/storage/markdown"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      path: getActiveNodeApiPath(),
      folder: getFlatStorageSectionFolderName(mode),
      file: readmePath,
      content: buildSectionReadmeContent(sectionLabel)
    })
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Request failed with ${response.status}`);
  }
  await reloadFlatStorageFolderMode(mode);
}

async function openFlatStorageSectionReadme(mode, readmePath, sectionFolder) {
  if (!flatStorageSectionReadmeExists(mode, sectionFolder)) {
    try {
      await ensureFlatStorageSectionReadme(mode, readmePath, sectionFolder);
    } catch (error) {
      showToast(`Не удалось создать ${AREA_MANIFEST_FILE}: ${error.message}`, "error");
      return;
    }
  }
  showToast(`Описание раздела: ${readmePath}`, "info");
}

function syncPropsInputPlaceholder() {
  if (isExternalFileEditing() || isMediaAssetEditing()) {
    propsInputNode.placeholder = "title: Заметка\ntags:\n  - пример\nstatus: draft";
  } else {
    propsInputNode.placeholder = "title: Название\ntags:\n  - пример\nstatus: active";
  }
}

function enableExternalFileEditor(filePath, content, options = {}) {
  activeExternalFilePath = filePath;
  updateBreadcrumbsForActiveMode();
  titleEditorBlockNode.classList.remove("hidden");
  titleInputNode.value = (filePath.split("/").pop() || filePath).replace(/\.md$/i, "");
  applyExternalFileContentUi(content || "");
  syncPropsInputPlaceholder();
  editorViewMode = "source";
  applyModeUi();
  setEditorViewMode("source", { skipRouteSync: true });
  if (!options.skipRouteSync) {
    syncAppRouteToUrl({ push: true });
  }
}

async function openExternalFile(filePath, options = {}) {
  if (!activePath) return;
  try {
    const response = await fetch(
      buildApiUrl("/api/external/file", { path: getActiveNodeApiPath(), file: filePath })
    );
    if (!response.ok) throw new Error(`Request failed with ${response.status}`);
    const data = await response.json();
    enableExternalFileEditor(data.file, data.content || "", options);
  } catch (error) {
    showToast(`Ошибка открытия файла ${STORAGE_SUBFOLDER_CONTENT}`, "error");
  }
}

function resetCreateMemoryNameInputs() {
  for (const input of createMemoryNameInputNodes) input.value = "";
}

function getCreateMemoryTitles() {
  return createMemoryNameInputNodes
    .map((input) => input.value.trim())
    .filter(Boolean)
    .slice(0, CREATE_MEMORY_MAX_COUNT);
}

function shouldOpenCreatedMemoryForEdit() {
  return createMemoryAfterEditRadio?.checked ?? true;
}

function syncCreateMemoryAfterRadiosFromStorage() {
  const saved = localStorage.getItem(CREATE_MEMORY_AFTER_KEY);
  const gotoEdit = saved !== "list";
  if (createMemoryAfterEditRadio) createMemoryAfterEditRadio.checked = gotoEdit;
  if (createMemoryAfterListRadio) createMemoryAfterListRadio.checked = !gotoEdit;
}

function persistCreateMemoryAfterChoice() {
  const mode = shouldOpenCreatedMemoryForEdit() ? "edit" : "list";
  try {
    localStorage.setItem(CREATE_MEMORY_AFTER_KEY, mode);
  } catch {
    // ignore quota / private mode
  }
}

function setCreateMemoryModalBusy(busy) {
  createMemoryOkBtn.disabled = busy;
  createMemoryCancelBtn.disabled = busy;
  for (const input of createMemoryNameInputNodes) input.disabled = busy;
  for (const radio of createMemoryAfterRadios) radio.disabled = busy;
}

function openCreateMemoryModal() {
  if (!activePath || activeContentMode !== "external" || activeExternalFilePath) return;
  resetCreateMemoryNameInputs();
  syncCreateMemoryAfterRadiosFromStorage();
  setCreateMemoryModalBusy(false);
  createMemoryOkBtn.textContent = "Создать";
  createMemoryModalNode.classList.remove("hidden");
  createMemoryNameInputNodes[0]?.focus();
}

function closeCreateMemoryModal() {
  createMemoryModalNode.classList.add("hidden");
  resetCreateMemoryNameInputs();
  setCreateMemoryModalBusy(false);
  createMemoryOkBtn.textContent = "Создать";
}

async function createExternalMemoryFile(title) {
  const parentFolder = getActiveExternalSectionParentForCreate();
  const requestBody = { path: getActiveNodeApiPath(), title };
  if (parentFolder) requestBody.parent = parentFolder;
  const response = await fetch(buildApiUrl("/api/external/file/create"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody)
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const reason = errorData.error || `Request failed with ${response.status}`;
    const details = errorData.details ? `: ${errorData.details}` : "";
    throw new Error(`${reason}${details}`);
  }
  return response.json();
}

async function createExternalMemory() {
  if (!activePath || activeContentMode !== "external" || activeExternalFilePath) return;
  const titles = getCreateMemoryTitles();
  if (!titles.length) {
    showToast("Введите хотя бы одно название", "error");
    return;
  }

  setCreateMemoryModalBusy(true);
  let created = 0;
  let lastFile = null;

  try {
    for (let index = 0; index < titles.length; index += 1) {
      const title = titles[index];
      createMemoryOkBtn.textContent =
        titles.length === 1 ? "Создаю..." : `Создаю ${index + 1} из ${titles.length}...`;
      try {
        const data = await createExternalMemoryFile(title);
        created += 1;
        lastFile = data.file;
      } catch {
        // continue with remaining titles
      }
    }

    if (created > 0) {
      persistCreateMemoryAfterChoice();
      closeCreateMemoryModal();
      await loadContentByMode();
      if (lastFile && shouldOpenCreatedMemoryForEdit()) {
        await openExternalFile(lastFile);
      }
    }

    if (created === titles.length) {
      showToast(
        created === 1 ? "Элемент создан" : `Создано элементов: ${created}`,
        "success"
      );
    } else if (created > 0) {
      showToast(`Создано ${created} из ${titles.length}`, "error");
    } else {
      showToast("Ошибка создания элементов", "error");
    }
  } finally {
    setCreateMemoryModalBusy(false);
    createMemoryOkBtn.textContent = "Создать";
  }
}

let createSectionTargetMode = "external";
let createSectionParentFolder = null;

function getActiveMediaSectionParentForCreate() {
  if (!isStorageSectionsPanelVisible()) return null;
  if (activeMediaSectionFolder) return activeMediaSectionFolder;
  const route = parseAppRoute(location.pathname);
  if (route.view === "media" && route.mediaSectionPath) {
    return route.mediaSectionPath;
  }
  return null;
}

function buildCreatedMediaSectionPath(parentFolder, sectionName, sectionPathFromApi = "") {
  const apiPath = String(sectionPathFromApi || "").trim().replace(/\\/g, "/").replace(/\/$/, "");
  if (apiPath) return apiPath;
  const section = String(sectionName || "").trim().replace(/\\/g, "/").replace(/\/$/, "");
  if (!section) return "";
  const parent = String(parentFolder || "").trim().replace(/\\/g, "/").replace(/\/$/, "");
  return parent ? `${parent}/${section}` : section;
}

function openCreateSectionModal(targetMode = "external") {
  if (!activePath) return;
  if (targetMode === "external") {
    if (activeContentMode !== "external" || activeExternalFilePath) return;
  } else if (targetMode === "media") {
    if (activeContentMode !== "media" || isMediaAssetEditing()) return;
  } else if (FLAT_STORAGE_SECTION_MODES.has(targetMode)) {
    if (activeContentMode !== targetMode) return;
  } else {
    return;
  }
  createSectionTargetMode = targetMode;
  createSectionParentFolder =
    targetMode === "media"
      ? getActiveMediaSectionParentForCreate()
      : targetMode === "external"
        ? getActiveExternalSectionParentForCreate()
        : FLAT_STORAGE_SECTION_MODES.has(targetMode)
          ? getActiveFlatStorageSectionParentForCreate(targetMode)
          : null;
  const modalMessage = createSectionModalNode?.querySelector(".modal-message");
  if (modalMessage) {
    modalMessage.textContent =
      createSectionParentFolder
        ? `Создать подраздел в «${createSectionParentFolder}»`
        : "Создать раздел";
  }
  createSectionNameInputNode.value = "";
  createSectionModalNode.classList.remove("hidden");
  createSectionNameInputNode.focus();
}

function closeCreateSectionModal() {
  createSectionModalNode.classList.add("hidden");
  createSectionNameInputNode.value = "";
  createSectionParentFolder = null;
  const modalMessage = createSectionModalNode?.querySelector(".modal-message");
  if (modalMessage) modalMessage.textContent = "Создать раздел";
}

async function createWorkspaceSection() {
  if (!activePath) return;
  if (createSectionTargetMode === "external") {
    if (activeContentMode !== "external" || activeExternalFilePath) return;
  } else if (createSectionTargetMode === "media") {
    if (activeContentMode !== "media" || isMediaAssetEditing()) return;
  } else if (FLAT_STORAGE_SECTION_MODES.has(createSectionTargetMode)) {
    if (activeContentMode !== createSectionTargetMode) return;
  } else {
    return;
  }
  const title = createSectionNameInputNode.value.trim();
  if (!title) {
    showToast("Введите название раздела", "error");
    return;
  }

  createSectionOkBtn.disabled = true;
  createSectionOkBtn.textContent = "Создаю...";

  const isFlatStorageTarget = FLAT_STORAGE_SECTION_MODES.has(createSectionTargetMode);
  const apiPath = isFlatStorageTarget
    ? "/api/storage/section/create"
    : createSectionTargetMode === "media"
      ? "/api/media/section/create"
      : "/api/external/section/create";

  try {
    const mediaParentFolder =
      createSectionTargetMode === "media"
        ? createSectionParentFolder || getActiveMediaSectionParentForCreate()
        : null;
    const externalParentFolder =
      createSectionTargetMode === "external"
        ? createSectionParentFolder || getActiveExternalSectionParentForCreate()
        : null;
    const flatStorageParentFolder = isFlatStorageTarget
      ? createSectionParentFolder || getActiveFlatStorageSectionParentForCreate(createSectionTargetMode)
      : null;
    const requestBody = { path: getActiveNodeApiPath(), title };
    if (createSectionTargetMode === "media" && mediaParentFolder) {
      requestBody.parent = mediaParentFolder;
    }
    if (createSectionTargetMode === "external" && externalParentFolder) {
      requestBody.parent = externalParentFolder;
    }
    if (isFlatStorageTarget) {
      requestBody.folder = getFlatStorageSectionFolderName(createSectionTargetMode);
      if (flatStorageParentFolder) requestBody.parent = flatStorageParentFolder;
    }
    const response = await fetch(buildApiUrl(apiPath), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const reason = data.error || `Request failed with ${response.status}`;
      const details = data.details ? `: ${data.details}` : "";
      throw new Error(`${reason}${details}`);
    }

    closeCreateSectionModal();
    const createdMediaSectionPath =
      createSectionTargetMode === "media"
        ? buildCreatedMediaSectionPath(mediaParentFolder, data.section, data.sectionPath)
        : "";
    const createdExternalSectionPath =
      createSectionTargetMode === "external"
        ? buildCreatedMediaSectionPath(externalParentFolder, data.section, data.sectionPath)
        : "";
    const createdFlatStorageSectionPath = isFlatStorageTarget
      ? buildCreatedMediaSectionPath(flatStorageParentFolder, data.section, data.sectionPath)
      : "";
    await loadContentByMode({
      preserveMediaSectionFolder: createdMediaSectionPath || mediaParentFolder,
      preserveExternalSectionFolder: createdExternalSectionPath || externalParentFolder,
      preserveFlatStorageSectionFolder: createdFlatStorageSectionPath || flatStorageParentFolder
    });
    if (createdMediaSectionPath) {
      activeMediaSectionFolder = createdMediaSectionPath;
      mediaViewMode = "all";
      if (mediaViewSelectNode) mediaViewSelectNode.value = "all";
      rerenderMediaListViewBody();
      syncAppRouteToUrl({ push: true });
    }
    if (createdExternalSectionPath) {
      activeExternalSectionFolder = createdExternalSectionPath;
      rerenderExternalListViewBody();
      syncAppRouteToUrl({ push: true });
    }
    if (createdFlatStorageSectionPath && isFlatStorageTarget) {
      activeFlatStorageSectionFolder[createSectionTargetMode] = createdFlatStorageSectionPath;
      rerenderFlatStorageListViewBody(createSectionTargetMode);
      syncAppRouteToUrl({ push: true });
    }
    showToast("Раздел создан", "success");
  } catch (error) {
    showToast(`Ошибка создания раздела: ${error.message}`, "error");
  } finally {
    createSectionOkBtn.disabled = false;
    createSectionOkBtn.textContent = "Создать";
  }
}

const SAVE_BUTTON_LABEL_DEFAULT = "Сохранить";

function setWorkspaceToolbarButtonLabel(btn, label) {
  if (!btn) return;
  const labelNode = btn.querySelector(".workspace-toolbar-btn-label");
  if (labelNode) labelNode.textContent = label;
  else btn.textContent = label;
}

function setSaveButtonsState(disabled, label = SAVE_BUTTON_LABEL_DEFAULT) {
  for (const btn of [saveContentBtn, saveSystemFileBtn]) {
    if (!btn) continue;
    btn.disabled = disabled;
    setWorkspaceToolbarButtonLabel(btn, label);
  }
}

let savedEditorSnapshot = null;

function isEditorSaveTrackingActive() {
  if (activeSystemFile) return true;
  if (!activePath) return false;
  if (
    isNodeCanvasViewMode() ||
    activeContentMode === NODE_OVERVIEW_MODE ||
    activeContentMode === NODE_NAVIGATION_MODE ||
    activeContentMode === "node-preview" ||
    activeContentMode === "graph" ||
    activeContentMode === "scripts" ||
    activeContentMode === "inbox" ||
    activeContentMode === "references" ||
    activeContentMode === "artefacts" ||
    activeContentMode === "temp"
  ) {
    return false;
  }
  if (activeContentMode === "external" && !activeExternalFilePath) return false;
  if (activeContentMode === "media" && !isMediaAssetEditing()) return false;
  if (activeContentMode === "temp") return false;
  if (activeContentMode === "tabular" && !isTabularSourceEditing()) return false;
  return true;
}

function getEditorSavePayload() {
  if (editorViewMode === "wysiwyg") {
    syncSourceFromWysiwygEditor();
  }
  const rawContent = isExternalFileEditing()
    ? buildExternalFileContent()
    : isMediaMarkdownEditing()
      ? buildMediaMarkdownContent()
      : isMediaSidecarEditing()
        ? buildMediaSidecarContent()
        : activeContentMode === "description"
          ? buildNodeManifestContent()
          : getEditorContentValue();
  return JSON.stringify({
    content: typeof rawContent === "string" ? rawContent : String(rawContent ?? ""),
    title: titleInputNode?.value?.trim() ?? ""
  });
}

function syncSaveButtonLamp() {
  const buttons = [saveContentBtn, saveSystemFileBtn].filter(Boolean);
  const trackingActive = isEditorSaveTrackingActive();
  const dirty =
    trackingActive && savedEditorSnapshot !== null && getEditorSavePayload() !== savedEditorSnapshot;

  for (const btn of buttons) {
    btn.classList.remove("is-dirty", "is-saved");
    if (!trackingActive || btn.classList.contains("hidden")) continue;
    if (savedEditorSnapshot === null) continue;
    btn.classList.toggle("is-dirty", dirty);
    btn.classList.toggle("is-saved", !dirty);
  }
}

function commitEditorSaveBaseline() {
  if (!isEditorSaveTrackingActive()) {
    savedEditorSnapshot = null;
    syncSaveButtonLamp();
    return;
  }
  savedEditorSnapshot = getEditorSavePayload();
  syncSaveButtonLamp();
}

function applySystemFileUi() {
  appRootNode.classList.add("system-file-view");
  workspacePathHeaderNode?.classList.add("is-service-file");
  nodeOverviewBlockNode?.classList.add("hidden");
  nodeOverviewBlockNode?.classList.remove("is-node-navigation", "is-container-node");
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
  createMediaSectionBtn?.classList.add("hidden");
  previewUploadBlockNode?.classList.add("hidden");
  graphViewBlockNode?.classList.add("hidden");
  editorSurfaceNode?.classList.remove("hidden");
  editorCodeWrapNode?.classList.remove("hidden");
  workspacePathToolbarNode?.classList.remove("hidden");
  workspaceGdriveSyncBtn?.classList.add("hidden");
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
  syncSaveButtonLamp();
}

function clearSystemFileViewUi() {
  appRootNode.classList.remove("system-file-view");
  workspacePathHeaderNode?.classList.remove("is-service-file");
  workspaceGdriveSyncBtn?.classList.remove("hidden");
  if (!isMediaAssetEditing()) {
    resetTitleInputState();
  }
  saveSystemFileBtn?.classList.add("hidden");
  saveContentBtn?.classList.remove("hidden");
}

function getPropsEntryValueByKey(entries, key) {
  const normalizedKey = normalizePropsKey(key);
  const entry = entries.find((item) => normalizePropsKey(item.key) === normalizedKey);
  if (!entry) return "";
  if (entry.kind === "array") return (entry.value || []).join(", ");
  if (entry.kind === "bool") return entry.value ? "да" : "нет";
  if (entry.kind === "null") return "";
  return String(entry.value ?? "").trim();
}

function getOverviewTitleFromProps(entries) {
  return (
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
    getPropsEntryValueByKey(entries, "awn-description") ||
    getPropsEntryValueByKey(entries, "summary");
  if (fromEntries) return fromEntries;

  const { frontmatter, body } = splitFrontmatter(rawManifest);
  if (frontmatter.trim()) {
    const fromFrontmatter =
      getYamlScalarFromFrontmatter(frontmatter, "awn-description") ||
      getYamlScalarFromFrontmatter(frontmatter, "AWN-DESC") ||
      getYamlScalarFromFrontmatter(frontmatter, "summary") ||
      getPropsEntryValueByKey(parsePropsYaml(frontmatter), "awn-description") ||
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
  const apiPath = getOverviewNodeApiPath(nodePath);
  if (!apiPath) return null;
  try {
    const response = await fetch(buildApiUrl("/api/memory/summary", { path: apiPath }));
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
  if (isAreaContentModeBlocked(modeId)) return;
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

async function refreshNodeCoverThumbInPlace() {
  const thumbWrap = nodeOverviewContentNode?.querySelector(".node-overview-thumb-wrap");
  if (
    !thumbWrap ||
    (activeContentMode !== NODE_OVERVIEW_MODE && activeContentMode !== NODE_NAVIGATION_MODE)
  ) {
    return;
  }
  const preview = await fetchNodeOverviewPreview();
  const title = thumbWrap.dataset.overviewTitle || "Превью";
  populateOverviewThumbWrap(thumbWrap, preview, title, activePath);
  thumbWrap.setAttribute(
    "aria-label",
    preview?.imageUrl ? "Редактировать превью" : "Загрузить превью"
  );
}

function createNavigationHero(preview, title, nodePath = activePath, options = {}) {
  const hero = document.createElement("div");
  hero.className = "node-navigation-hero";

  const metaPanel = buildNavigationHeroMetaPanel(options.meta, nodePath);

  const body = document.createElement("div");
  body.className = "node-navigation-hero-body";

  const thumbWrap = createOverviewThumbWrap(preview, title, nodePath);

  const head = document.createElement("div");
  head.className = "node-navigation-hero-head";

  const titleNode = document.createElement("h2");
  titleNode.className = "node-navigation-hero-title";
  titleNode.textContent = title;

  const pathNode = document.createElement("p");
  pathNode.className = "node-navigation-hero-path";
  pathNode.textContent = getLabelFromPath(nodePath) || activeLabel || "—";

  head.append(titleNode, pathNode);
  body.append(thumbWrap, head);
  hero.append(body, metaPanel);
  return hero;
}

async function fetchTodoForOverview(nodePath = activePath) {
  const apiPath = getOverviewNodeApiPath(nodePath);
  if (!apiPath) return null;
  try {
    const response = await fetch(buildApiUrl("/api/todo", { path: apiPath }));
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
      return getNodeStorageSubfolderPath(resolvedPath, "external");
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
    const previewLimit = 1600;
    const previewSource =
      content.length > previewLimit ? `${content.slice(0, previewLimit).trim()}…` : content;
    const preview = document.createElement("div");
    preview.className = "node-overview-todo-content file-content-preview";
    setMarkdownPreviewHtml(preview, previewSource, { nodePath });
    body.appendChild(preview);
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
  const apiPath = getOverviewNodeApiPath(nodePath);
  if (!apiPath) return null;
  try {
    const response = await fetch(buildApiUrl("/api/media", { path: apiPath }));
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
  const storagePath = getNodeStorageSubfolderPath(nodePath, "media");

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

function formatNodeMetaDateTime(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return "—";
  }
}

async function fetchNodeNavigationMeta(nodePath = getActiveNodeApiPath()) {
  if (!nodePath) return null;
  try {
    const response = await fetch(buildApiUrl("/api/node/meta", { path: nodePath }));
    if (!response.ok) return { error: response.status === 404 ? "not_found" : "unavailable" };
    return await response.json();
  } catch {
    return { error: "unavailable" };
  }
}

function readNodeLastViewedStore() {
  try {
    const raw = readStorageItem(NODE_LAST_VIEWED_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeNodeLastViewedStore(store) {
  try {
    localStorage.setItem(NODE_LAST_VIEWED_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore quota / private mode
  }
}

function getNodeLastViewedStorageKey(nodePath) {
  const normalized = normalizeMenuNodePath(getResolvedNodePath(nodePath) || nodePath);
  if (!normalized || !activeAgentId) return null;
  return `${activeAgentId}:${normalized}`;
}

function recordNodeLastViewed(nodePath) {
  const key = getNodeLastViewedStorageKey(nodePath);
  if (!key) return;
  const store = readNodeLastViewedStore();
  store[key] = new Date().toISOString();
  writeNodeLastViewedStore(store);
}

function getNodeLastViewedIso(nodePath) {
  const key = getNodeLastViewedStorageKey(nodePath);
  if (!key) return null;
  return readNodeLastViewedStore()[key] || null;
}

function pickLatestIso(...values) {
  let latest = null;
  for (const value of values) {
    if (!value) continue;
    if (!latest || new Date(value) > new Date(latest)) latest = value;
  }
  return latest;
}

function getNodeDescriptionHasContent(raw = "") {
  const { body } = splitFrontmatter(raw);
  return Boolean(stripAwnDescCallouts(body).trim());
}

function buildNodeSlotStatuses({
  isArea = false,
  descriptionRaw = "",
  internalData = null,
  externalData = null,
  tabularData = null,
  mediaData = null,
  todoData = null,
  memorySummary = null
} = {}) {
  const drivers = memorySummary?.drivers || {};
  const hasDescription = getNodeDescriptionHasContent(descriptionRaw);
  const hasInternal =
    Boolean(String(internalData?.content || "").trim()) ||
    Boolean(drivers.internal?.exists && Number(drivers.internal.charCount) > 0);
  const externalFiles = externalData?.files || [];
  const hasExternal =
    externalFiles.length > 0 ||
    Boolean(drivers.external?.exists && Number(drivers.external.count) > 0);
  const tabularRows = Math.max(
    Number(tabularData?.rowCount) || 0,
    Number(drivers.tabular?.rowCount) || 0
  );
  const hasTabular = tabularRows > 0;
  const hasMedia = Boolean(mediaData?.exists && Number(mediaData.files) > 0);
  const hasTodo = Boolean(String(todoData?.content || "").trim());

  const filledById = {
    external: hasExternal,
    internal: hasInternal,
    tabular: hasTabular,
    media: hasMedia
  };
  const memorySlots = isArea
    ? []
    : NODE_OVERVIEW_SLOT_MEMORY_SPECS.map((spec) => ({
        ...spec,
        filled: Boolean(filledById[spec.id])
      }));

  return [
    { id: "description", label: "Назначение", filled: hasDescription, modeId: "description" },
    ...memorySlots,
    { id: "todo", label: "TODO", filled: hasTodo, modeId: "todo" }
  ];
}

function renderNodeSlotStrip(slotStatuses = []) {
  if (!slotStatuses.length) return null;

  const wrap = document.createElement("div");
  wrap.className = "node-slot-strip";
  wrap.setAttribute("aria-label", "Заполненность слотов хранилища");

  const row = document.createElement("div");
  row.className = "node-slot-strip-row";

  const heading = document.createElement("span");
  heading.className = "node-slot-strip-title";
  heading.textContent = "Слоты:";

  const list = document.createElement("ul");
  list.className = "node-slot-strip-list";

  for (const slot of slotStatuses) {
    const item = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `node-slot-chip${slot.filled ? " is-filled" : " is-empty"}`;
    btn.title = slot.filled ? `${slot.label}: есть данные` : `${slot.label}: пусто`;

    const lamp = document.createElement("span");
    lamp.className = "node-slot-lamp";
    lamp.setAttribute("aria-hidden", "true");

    const label = document.createElement("span");
    label.className = "node-slot-label";
    label.textContent = slot.label;

    btn.append(lamp, label);
    btn.addEventListener("click", () => {
      if (slot.modeId === "description") {
        openDescriptionFromOverview();
        return;
      }
      if (slot.modeId === "todo") {
        openTodoFromOverview();
        return;
      }
      if (slot.modeId === "media") {
        openNavigationPanelMode("media");
        return;
      }
      if (isAreaContentModeBlocked(slot.modeId)) return;
      openMemoryModeFromOverview(slot.modeId);
    });

    item.appendChild(btn);
    list.appendChild(item);
  }

  row.append(heading, list);
  wrap.appendChild(row);
  return wrap;
}

function appendNavigationHeroMetaRow(panel, label, value) {
  const dt = document.createElement("dt");
  dt.className = "node-navigation-hero-meta-label";
  dt.textContent = label;
  const dd = document.createElement("dd");
  dd.className = "node-navigation-hero-meta-value";
  const text = String(value ?? "").trim();
  dd.textContent = text || "—";
  panel.append(dt, dd);
}

function getFolderWorkspaceMarkersForNode(nodePath, agentId = activeAgentId) {
  const menu = menuCacheByAgent.get(agentId) || (agentId === activeAgentId ? currentMenuData : null);
  if (!menu) return { hasGit: false, hasObsidian: false, hasAgent: false, hasSkill: false };

  const baseTree = { title: getAgentTreeTitle(agentId), ...menu };
  const normalized = normalizeMenuNodePath(getResolvedNodePath(nodePath));
  const folderRel = normalizeFolderPath(getFolderPathFromManifest(normalized) || ".");
  const section = findMenuSectionByFolderPath(baseTree, folderRel);
  const source = section || findMenuNodeByPath(baseTree, normalized);

  return {
    hasGit: Boolean(source?.hasGitSelf ?? source?.hasGit),
    hasObsidian: Boolean(source?.hasObsidianSelf ?? source?.hasObsidian),
    hasAgent: Boolean(source?.hasAgentSelf ?? source?.hasAgent),
    hasSkill: Boolean(source?.hasSkillSelf ?? source?.hasSkill)
  };
}

function createNavigationHeroMarkerSlot({ id, caption, active, createSvg, titleActive, titleInactive }) {
  const slot = document.createElement("span");
  slot.className = `node-slot-chip node-navigation-marker-slot node-navigation-marker-slot--${id}${
    active ? " is-active" : " is-inactive"
  }`;
  slot.title = active
    ? titleActive || `${caption}: есть в этой папке`
    : titleInactive || `${caption}: нет в этой папке`;
  slot.setAttribute("role", "img");
  slot.setAttribute("aria-label", `${caption}: ${active ? "есть" : "нет"}`);

  const icon = document.createElement("span");
  icon.className = "node-navigation-marker-slot-icon menu-marker";
  icon.setAttribute("aria-hidden", "true");
  icon.appendChild(createSvg());

  const text = document.createElement("span");
  text.className = "node-slot-label";
  text.textContent = caption;

  slot.append(icon, text);
  return slot;
}

function appendNavigationHeroWorkspaceMarkerSlots(panel, nodePath) {
  const markers = getFolderWorkspaceMarkersForNode(nodePath);

  const dd = document.createElement("dd");
  dd.className = "node-navigation-hero-meta-value node-navigation-hero-meta-markers";

  const wrap = document.createElement("div");
  wrap.className = "node-navigation-hero-marker-slots";
  wrap.setAttribute("aria-label", "Agent, Git, Obsidian и Skill в папке области");
  wrap.append(
    createNavigationHeroMarkerSlot({
      id: "agent",
      caption: "Agent",
      active: markers.hasAgent,
      createSvg: createAgentMarkerIcon,
      titleActive: "awn-agent.json: есть в этой папке",
      titleInactive: "awn-agent.json: нет в этой папке"
    }),
    createNavigationHeroMarkerSlot({
      id: "git",
      caption: "Git",
      active: markers.hasGit,
      createSvg: createGitMarkerSvg
    }),
    createNavigationHeroMarkerSlot({
      id: "obsidian",
      caption: "Obsidian",
      active: markers.hasObsidian,
      createSvg: createObsidianMarkerSvg
    }),
    createNavigationHeroMarkerSlot({
      id: "skill",
      caption: "Skill",
      active: markers.hasSkill,
      createSvg: createSkillMarkerSvg,
      titleActive: "SKILL.md: есть в этой папке — это скилл",
      titleInactive: "SKILL.md: нет в этой папке"
    })
  );

  dd.appendChild(wrap);
  panel.appendChild(dd);
}

function buildNavigationHeroMetaPanel(meta, nodePath = activePath) {
  recordNodeLastViewed(nodePath);

  const createdIso = meta?.manifest?.createdAt || meta?.folder?.createdAt;
  const modifiedIso = pickLatestIso(
    meta?.manifest?.updatedAt,
    meta?.folder?.updatedAt,
    meta?.props?.updatedAt
  );
  const lastViewedIso = getNodeLastViewedIso(nodePath);

  const rows = [
    ["Создан", createdIso ? formatNodeMetaDateTime(createdIso) : null],
    ["Изменён", modifiedIso ? formatNodeMetaDateTime(modifiedIso) : null],
    ["Последний просмотр", lastViewedIso ? formatNodeMetaDateTime(lastViewedIso) : null]
  ];

  const panel = document.createElement("dl");
  panel.className = "node-navigation-hero-meta";
  for (const [label, value] of rows) {
    appendNavigationHeroMetaRow(panel, label, value);
  }
  appendNavigationHeroWorkspaceMarkerSlots(panel, nodePath);
  return panel;
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
  const apiPath = getOverviewNodeApiPath(nodePath);
  if (!apiPath) return { exists: false, files: [] };
  try {
    const response = await fetch(buildApiUrl("/api/external/files", { path: apiPath }));
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
  const apiPath = getOverviewNodeApiPath(nodePath);
  if (!apiPath) return { exists: false, content: "", path: null };
  try {
    const response = await fetch(buildApiUrl("/api/memory/internal", { path: apiPath }));
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
  const apiPath = getOverviewNodeApiPath(nodePath);
  if (!apiPath) return { exists: false, columns: [], rows: [], rowCount: 0, path: null };
  try {
    const response = await fetch(buildApiUrl("/api/memory/tabular", { path: apiPath }));
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

  const folders = childEntries.filter((entry) => entry.isFolder);
  const topics = childEntries.filter((entry) => !entry.isFolder);

  const body = document.createElement("div");
  body.className = "node-navigation-subsections";

  if (folders.length) {
    body.appendChild(createNavigationSectionHead("Подразделы"));
    const folderGrid = document.createElement("div");
    folderGrid.className = "node-overview-children-grid";
    for (const entry of folders) {
      folderGrid.appendChild(createMenuCard(entry, { gallery: true }));
    }
    body.appendChild(folderGrid);
  }

  if (topics.length) {
    body.appendChild(createNavigationSectionHead("Темы"));
    const topicGrid = document.createElement("div");
    topicGrid.className = "node-overview-children-grid";
    for (const entry of topics) {
      topicGrid.appendChild(createMenuCard(entry, { gallery: true }));
    }
    body.appendChild(topicGrid);
  }

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
    return null;
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
    return null;
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
    return null;
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

const NAVIGATION_MEDIA_IMAGE_THUMB_LIMIT = 12;

function createNavigationMediaImageThumb(item, nodePath) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "node-navigation-media-thumb";
  btn.title = item.path || item.name || "";

  const img = document.createElement("img");
  img.alt = item.name || "";
  img.loading = "lazy";
  img.decoding = "async";
  img.src = appendCacheBuster(buildMediaAssetUrl(item.path, nodePath));
  img.addEventListener("error", () => {
    btn.classList.add("node-navigation-media-thumb--error");
    img.remove();
    const fallback = document.createElement("span");
    fallback.className = "node-navigation-media-thumb-fallback";
    fallback.textContent = "🖼";
    btn.appendChild(fallback);
  });
  btn.appendChild(img);
  btn.addEventListener("click", (event) => {
    event.stopPropagation();
    openNavigationPanelMode("media");
  });
  return btn;
}

function appendNavigationMediaImageStrip(parent, items, nodePath) {
  const images = items.filter((item) => !item.isFolder);
  if (!images.length) return;

  const strip = document.createElement("div");
  strip.className = "node-navigation-media-thumbs";
  strip.setAttribute("role", "list");
  strip.setAttribute("aria-label", "Превью изображений");

  const visible = images.slice(0, NAVIGATION_MEDIA_IMAGE_THUMB_LIMIT);
  for (const item of visible) {
    strip.appendChild(createNavigationMediaImageThumb(item, nodePath));
  }

  if (images.length > NAVIGATION_MEDIA_IMAGE_THUMB_LIMIT) {
    const moreBtn = document.createElement("button");
    moreBtn.type = "button";
    moreBtn.className = "node-navigation-media-thumbs-more";
    moreBtn.textContent = `+${images.length - NAVIGATION_MEDIA_IMAGE_THUMB_LIMIT}`;
    moreBtn.title = "Открыть все изображения";
    moreBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      openNavigationPanelMode("media");
    });
    strip.appendChild(moreBtn);
  }

  parent.appendChild(strip);
}

function renderNavigationMediaPart(mediaData) {
  const groups = mediaData?.groups && typeof mediaData.groups === "object" ? mediaData.groups : {};
  const groupOrder = ["Images", "Videos", "Audio", "Documents", "Archives", "Other", "Folders"];
  const entries = groupOrder
    .map((groupName) => [groupName, groups[groupName] || []])
    .filter(([, items]) => Array.isArray(items) && items.length > 0);

  const body = document.createElement("div");
  body.className = "node-navigation-media";

  if (!entries.length) {
    return null;
  }

  const root = document.createElement("div");
  root.className = "node-navigation-media-groups";
  const nodePath = getResolvedNodePath(activePath);

  for (const [groupName, items] of entries) {
    const group = document.createElement("section");
    group.className = "node-navigation-media-group";

    const label = document.createElement("div");
    label.className = "node-navigation-media-group-label";
    const sortedItems = [...items].sort((a, b) =>
      compareNavigationPathsNatural(a.path || a.name || "", b.path || b.name || "")
    );
    const fileItems = sortedItems.filter((item) => !item.isFolder);
    label.textContent = `${NAVIGATION_MEDIA_GROUP_ICONS[groupName] || "📎"} ${NAVIGATION_MEDIA_GROUP_LABELS[groupName] || groupName}${fileItems.length ? ` · ${fileItems.length}` : ""}`;

    group.appendChild(label);

    if (groupName === "Images" && fileItems.length) {
      appendNavigationMediaImageStrip(group, sortedItems, nodePath);
      root.appendChild(group);
      continue;
    }

    const list = document.createElement("ul");
    list.className = "nav-book-toc-list nav-book-toc-list--media";

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

    group.appendChild(list);
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
    return null;
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
    return null;
  }

  const previewSource =
    content.length > previewLimit ? `${content.slice(0, previewLimit).trim()}…` : content;
  const preview = document.createElement("div");
  preview.className = "node-navigation-todo-content file-content-preview";
  setMarkdownPreviewHtml(preview, previewSource, { nodePath: getResolvedNodePath(activePath) });
  wrap.appendChild(preview);

  if (content.length > previewLimit) {
    const note = document.createElement("p");
    note.className = "node-navigation-preview-note";
    note.textContent = `Показано ${previewLimit.toLocaleString("ru-RU")} из ${content.length.toLocaleString("ru-RU")} символов.`;
    wrap.appendChild(note);
  }

  return createNavigationMemoryPanel("todo", "TODO", wrap);
}

const NODE_COMMENTS_PLACEHOLDER_SAMPLES = [
  {
    author: "ivan_dev",
    initials: "ID",
    tone: "blue",
    time: "2 часа назад",
    body: "Добавил заметку про PDO — удобно держать примеры прямо в теме, а не в чате с агентом."
  },
  {
    author: "maria_p",
    initials: "MP",
    tone: "violet",
    time: "вчера",
    body: "Раздел про безопасность стоит расширить: XSS и CSRF лучше вынести в отдельные подтемы."
  },
  {
    author: "team_lead",
    initials: "TL",
    tone: "slate",
    time: "3 дня назад",
    body: "Согласовано: эту тему используем как базу для онбординга новых разработчиков."
  }
];

function createNodeCommentAvatar(initials, tone = "slate") {
  const avatar = document.createElement("span");
  avatar.className = `node-comment-avatar node-comment-avatar--${tone}`;
  avatar.setAttribute("aria-hidden", "true");
  avatar.textContent = initials;
  return avatar;
}

function renderNodeCommentsPlaceholderBlock(options = {}) {
  const nodeTitle = String(options.nodeTitle || "этой теме").trim() || "этой теме";
  const samples = Array.isArray(options.samples) ? options.samples : NODE_COMMENTS_PLACEHOLDER_SAMPLES;

  const section = document.createElement("section");
  section.className = "node-comments";
  section.setAttribute("aria-label", "Комментарии");

  const head = createNavigationSectionHead("Комментарии");

  const count = document.createElement("span");
  count.className = "node-comments-count";
  count.textContent = String(samples.length);

  const badge = document.createElement("span");
  badge.className = "node-comments-badge";
  badge.textContent = "заглушка";

  head.append(count, badge);

  const composer = document.createElement("div");
  composer.className = "node-comments-composer";
  composer.setAttribute("aria-disabled", "true");

  const composerAvatar = createNodeCommentAvatar("Вы", "green");

  const composerMain = document.createElement("div");
  composerMain.className = "node-comments-composer-main";

  const composerBox = document.createElement("div");
  composerBox.className = "node-comments-composer-box";

  const composerField = document.createElement("textarea");
  composerField.className = "node-comments-input";
  composerField.rows = 3;
  composerField.readOnly = true;
  composerField.placeholder = `Комментарий к «${nodeTitle}»…`;
  composerField.setAttribute("aria-label", "Новый комментарий");

  const composerActions = document.createElement("div");
  composerActions.className = "node-comments-composer-actions";

  const composerHint = document.createElement("span");
  composerHint.className = "node-comments-composer-hint";
  composerHint.textContent = "Markdown · @упоминания · скоро";

  const composerSubmit = document.createElement("button");
  composerSubmit.type = "button";
  composerSubmit.className = "node-comments-submit";
  composerSubmit.disabled = true;
  composerSubmit.title = "Комментарии пока только для демо";
  composerSubmit.textContent = "Комментировать";

  composerActions.append(composerHint, composerSubmit);
  composerBox.append(composerField, composerActions);
  composerMain.appendChild(composerBox);
  composer.append(composerAvatar, composerMain);

  const thread = document.createElement("ol");
  thread.className = "node-comments-thread";

  for (const sample of samples) {
    const item = document.createElement("li");
    item.className = "node-comment";

    const avatar = createNodeCommentAvatar(sample.initials, sample.tone);

    const main = document.createElement("article");
    main.className = "node-comment-main";

    const commentHead = document.createElement("header");
    commentHead.className = "node-comment-head";

    const author = document.createElement("strong");
    author.className = "node-comment-author";
    author.textContent = sample.author;

    const time = document.createElement("time");
    time.className = "node-comment-time";
    time.textContent = sample.time;
    time.dateTime = sample.time;

    commentHead.append(author, time);

    const body = document.createElement("div");
    body.className = "node-comment-body";
    body.textContent = sample.body;

    const foot = document.createElement("footer");
    foot.className = "node-comment-foot";

    const replyBtn = document.createElement("button");
    replyBtn.type = "button";
    replyBtn.className = "node-comment-action";
    replyBtn.disabled = true;
    replyBtn.title = "Скоро";
    replyBtn.textContent = "Ответить";

    const reactBtn = document.createElement("button");
    reactBtn.type = "button";
    reactBtn.className = "node-comment-action";
    reactBtn.disabled = true;
    reactBtn.title = "Скоро";
    reactBtn.textContent = "👍 1";

    foot.append(replyBtn, reactBtn);
    main.append(commentHead, body, foot);
    item.append(avatar, main);
    thread.appendChild(item);
  }

  section.append(head, composer, thread);
  return section;
}

async function renderNodeNavigation() {
  if (!nodeOverviewContentNode || !activePath) return;

  const renderSeq = ++nodeOverviewRenderSeq;
  const isStale = () =>
    renderSeq !== nodeOverviewRenderSeq ||
    activeContentMode !== NODE_NAVIGATION_MODE ||
    !nodeOverviewContentNode;

  if (isStale()) return;

  if (activePath && !propsFormEntries.length && !String(propsInputNode.value || "").trim()) {
    await loadPropertiesForActivePath();
    if (isStale()) return;
  }

  const nodePath = getResolvedNodePath(activePath);
  const childEntries = getNavigationSubsectionEntries();
  const isArea = isAreaNodePath(nodePath);
  const entries = propsFormEntries.length
    ? propsFormEntries
    : parsePropsYaml(propsInputNode.value || "");
  const heroTitle = getOverviewTitleFromProps(entries);

  const emptyInternal = { exists: false, content: "", path: null };
  const emptyExternal = { exists: false, files: [] };
  const emptyTabular = { exists: false, columns: [], rows: [], rowCount: 0, path: null };

  const [internalData, externalData, tabularData, todoData, preview, nodeMeta] = await Promise.all(
    isArea
      ? [
          emptyInternal,
          emptyExternal,
          emptyTabular,
          fetchTodoForOverview(nodePath),
          fetchNodeOverviewPreview(),
          fetchNodeNavigationMeta(nodePath)
        ]
      : [
          fetchInternalMemoryForNavigation(nodePath),
          fetchExternalFilesForNavigation(nodePath),
          fetchTabularMemoryForNavigation(nodePath),
          fetchTodoForOverview(nodePath),
          fetchNodeOverviewPreview(),
          fetchNodeNavigationMeta(nodePath)
        ]
  );
  const mediaData = isArea ? null : await fetchMediaOverview(nodePath);
  if (isStale()) return;

  const slotStatuses = buildNodeSlotStatuses({
    isArea,
    descriptionRaw: modeContentCache.description || "",
    internalData,
    externalData,
    tabularData,
    mediaData,
    todoData
  });

  const hub = document.createElement("div");
  hub.className = "node-navigation-hub";

  hub.appendChild(
    createNavigationHero(preview, heroTitle, nodePath, {
      meta: nodeMeta,
      propEntries: entries
    })
  );

  const slotStrip = renderNodeSlotStrip(slotStatuses);
  if (slotStrip) hub.appendChild(slotStrip);

  const manifestPanel = renderNavigationManifestPart(modeContentCache.description || "");
  if (manifestPanel) hub.appendChild(manifestPanel);

  const subsectionsBlock = renderNavigationSubsectionsBlock(childEntries);
  if (subsectionsBlock) hub.appendChild(subsectionsBlock);

  const panelsWrap = document.createElement("div");
  panelsWrap.className = "node-navigation-panels";

  if (!isArea) {
    const panels = [
      renderNavigationExternalPart(externalData),
      renderNavigationInternalPart(internalData),
      renderNavigationTabularPart(tabularData),
      renderNavigationMediaPart(mediaData)
    ].filter(Boolean);
    for (const panel of panels) {
      panelsWrap.appendChild(panel);
    }
  }

  const todoPanel = renderNavigationTodoPart(todoData);
  if (todoPanel) panelsWrap.appendChild(todoPanel);

  if (panelsWrap.children.length) {
    hub.appendChild(panelsWrap);
  }

  hub.appendChild(renderNodeCommentsPlaceholderBlock({ nodeTitle: heroTitle }));

  if (isStale()) return;
  if (!hub.children.length) {
    const empty = document.createElement("p");
    empty.className = "node-navigation-empty";
    empty.textContent = "Нет данных для отображения";
    hub.appendChild(empty);
  }
  nodeOverviewContentNode.replaceChildren(hub);
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
  const typeLabel = getPropsEntryValueByKey(entries, "awn-type");
  const excerpt = getOverviewMarkdownBeforeDivider(manifestRaw);
  const isOverviewArea = isAreaNodePath(activePath);
  const nodePathResolved = getResolvedNodePath(activePath);
  const [preview, memorySummaryForSlots, mediaOverviewForSlots, todoDataForSlots] = await Promise.all([
    fetchNodeOverviewPreview(),
    isOverviewArea ? null : fetchMemorySummary(nodePathResolved),
    isOverviewArea ? null : fetchMediaOverview(nodePathResolved),
    fetchTodoForOverview(nodePathResolved)
  ]);
  if (isStale()) return;

  const slotStatuses = buildNodeSlotStatuses({
    isArea: isOverviewArea,
    descriptionRaw: manifestRaw,
    memorySummary: memorySummaryForSlots,
    mediaData: mediaOverviewForSlots,
    todoData: todoDataForSlots
  });

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

  const slotStrip = renderNodeSlotStrip(slotStatuses);
  if (slotStrip) head.appendChild(slotStrip);

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

  if (!isOverviewArea) {
    const memorySummary =
      memorySummaryForSlots ?? (await fetchMemorySummary(nodePathResolved)) ?? createEmptyMemorySummary();
    if (isStale()) return;
    activeMemorySummary = memorySummary;
    syncNodeMemoryDriverOptions(memorySummary);
    const memoryBlock = renderOverviewMemoryBlock(memorySummary, nodePathResolved);
    if (memoryBlock) {
      fragment.appendChild(
        createOverviewAccordionSection("memory", "🧠 Память", memoryBlock, { defaultOpen: true })
      );
    }
  } else if (isStale()) {
    return;
  }

  const mediaOverview = isOverviewArea ? null : mediaOverviewForSlots ?? (await fetchMediaOverview(nodePathResolved));
  if (isStale()) return;

  const sectionsWrap = document.createElement("div");
  sectionsWrap.className = "node-overview-sections";
  for (const group of getOverviewModeGroups()) {
    if (group.id === "memory") continue;
    if (isOverviewArea && group.id === "files") continue;

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
      if (group.id === "main" && mode.id === "description") continue;
      if (mode.id === "media") {
        if (!isOverviewArea) {
          links.appendChild(renderOverviewMediaLink(mediaOverview, getResolvedNodePath(activePath)));
        }
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
        if (isOverviewArea && AREA_BLOCKED_CONTENT_MODES.has(mode.id)) return;
        if (NODE_MEMORY_SUB_MODE_IDS.has(mode.id)) {
          openMemoryModeFromOverview(mode.id);
          return;
        }
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

  const todoData = todoDataForSlots ?? (await fetchTodoForOverview(nodePathResolved));
  if (isStale()) return;
  const todoBlock = renderOverviewTodoBlock(todoData, getResolvedNodePath(activePath));
  const todoHasContent = Boolean(String(todoData?.content || "").trim());
  fragment.appendChild(
    createOverviewAccordionSection("todo", "✅ TODO", todoBlock, { defaultOpen: todoHasContent })
  );

  fragment.appendChild(renderNodeCommentsPlaceholderBlock({ nodeTitle: title }));

  if (isStale()) return;
  nodeOverviewContentNode.replaceChildren(fragment);
}

function applyModeUi() {
  if (appRootNode.classList.contains("home-view")) {
    return;
  }
  if (activeSystemFile) {
    nodeOverviewRenderSeq += 1;
    applySystemFileUi();
    updateBreadcrumbsForActiveMode();
    syncWorkspaceRevealFolderButton();
    return;
  }
  clearSystemFileViewUi();

  const listTemplate = isCurrentModeListTemplate();
  const graphMode = isGraphModeActive();
  const mindmapMode = isMindmapModeActive();
  const canvasMode = isNodeCanvasViewMode();
  const listViewWithSourceToggle = isListViewWithSourceToggleMode();
  const showListView = listTemplate && !(listViewWithSourceToggle && editorViewMode === "source");
  const previewMode = activeContentMode === "node-preview";
  const overviewMode = activeContentMode === NODE_OVERVIEW_MODE;
  const navigationMode = activeContentMode === NODE_NAVIGATION_MODE;
  const overviewLikeMode = overviewMode || navigationMode;
  const titleVisible = isCurrentModeTitleEditable();
  const forceEditOnly = activeContentMode === "env";
  const externalEditing = activeContentMode === "external" && Boolean(activeExternalFilePath);
  const mediaSidecarEditing = isMediaAssetEditing();
  if (mediaSidecarEditing) {
    applyMediaSidecarTitleUi();
  } else if (isAgentSystemRootIndexPath(activePath) && activeContentMode === "description") {
    setTitleLockedInput(SERVICE_SECTION_LABEL);
  } else if (isAgentRootIndexPath(activePath) && activeContentMode === "description") {
    setTitleLockedInput(getActiveAgentLabel() || getAgentTreeTitle());
  } else if (titleVisible || mediaSidecarEditing) {
    showTitleEditableInput();
    titleInputNode.disabled = false;
  }
  const hideContentEditor = isCurrentModeWithoutContentEditor();
  const showExternalControls = activeContentMode === "external" && !externalEditing;
  const showMediaControls = activeContentMode === "media" && !mediaSidecarEditing;
  const showFlatStorageSectionControls = isFlatStorageSectionMode() && isFlatStorageListMode();
  const showTabularControls = activeContentMode === "tabular" && !isTabularSourceEditing();
  const showWorkspaceRefresh = isWorkspaceRefreshAvailable();
  const showMindmapLayout =
    mindmapMode || (showExternalControls && externalViewMode === "mindmap");
  const hideSaveDeleteInToolbar =
    canvasMode ||
    overviewLikeMode ||
    showExternalControls ||
    showMediaControls ||
    showTabularControls ||
    activeContentMode === "inbox" ||
    activeContentMode === "references" ||
    activeContentMode === "artefacts" ||
    activeContentMode === "temp" ||
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
      !showWorkspaceRefresh &&
      !showMindmapLayout);
  const hideToolbar = hideDocActions;
  const showYamlPanel =
    activeContentMode === "description" || externalEditing || mediaSidecarEditing;
  const showDocAside = isEditorSaveTrackingActive() && !activeSystemFile;
  const titleBlockVisible =
    showDocAside &&
    (titleVisible || mediaSidecarEditing) &&
    !previewMode &&
    !overviewLikeMode;
  titleEditorBlockNode?.classList.toggle("hidden", !titleBlockVisible);
  nodeDescriptionHintNode?.classList.toggle(
    "hidden",
    activeContentMode !== "description" || previewMode || overviewLikeMode || activeSystemFile
  );
  syncNodeDescriptionHintUi();
  document.querySelector(".doc-head-block")?.classList.toggle(
    "hidden",
    titleEditorBlockNode?.classList.contains("hidden") &&
      nodeDescriptionHintNode?.classList.contains("hidden")
  );
  const hideEditorViewToggle =
    forceEditOnly ||
    activeContentMode === "tabular" ||
    (listTemplate && !listViewWithSourceToggle) ||
    previewMode ||
    overviewLikeMode ||
    canvasMode ||
    (hideContentEditor && !canvasMode && !listViewWithSourceToggle);
  const showTabularSourceEditor = activeContentMode === "tabular" && isTabularSourceEditing();
  const hideEditorViewCluster = hideEditorViewToggle && !showTabularSourceEditor;
  editorViewClusterNode?.classList.toggle("hidden", hideEditorViewCluster);
  editorViewToggleNode?.classList.toggle("hidden", hideEditorViewToggle);
  editorLineNumbersBtn?.classList.toggle("hidden", hideEditorViewToggle && !showTabularSourceEditor);
  editorViewClusterNode?.classList.toggle(
    "is-line-numbers-only",
    hideEditorViewToggle && showTabularSourceEditor
  );
  editorSurfaceNode?.classList.toggle("hidden", previewMode || canvasMode || overviewLikeMode || showListView);
  previewUploadBlockNode?.classList.toggle("hidden", !previewMode);
  graphViewBlockNode?.classList.toggle("hidden", !canvasMode);
  graphViewBlockNode?.classList.toggle("is-mindmap", mindmapMode);
  mindmapViewBarNode?.classList.toggle("hidden", !mindmapMode);
  if (mindmapMode) syncMindmapLayoutUi(mindmapViewBarNode || document);
  nodeOverviewBlockNode?.classList.toggle("hidden", !overviewLikeMode);
  nodeOverviewBlockNode?.classList.toggle("is-node-navigation", navigationMode);
  const containerOverview =
    overviewMode && isContainerNodePath(getResolvedNodePath(activePath));
  applyNodeWorkspaceViewUi();
  nodeOverviewBlockNode?.classList.toggle("is-container-node", containerOverview);
  if (!canvasMode && graphViewContentNode) {
    graphViewContentNode.innerHTML = "";
  }
  listViewBlockNode.classList.toggle("hidden", !showListView);
  listViewBlockNode.classList.toggle(
    "list-view--no-head",
    showExternalControls ||
      showMediaControls ||
      showTabularControls ||
      activeContentMode === "scripts" ||
      activeContentMode === "temp" ||
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
  syncFileHistoryButtonVisibility();
  yamlPanelNode.classList.toggle("hidden", !showDocAside);
  docBodyGridNode?.classList.toggle("has-props-aside", showDocAside);
  syncDocAsideUi({
    propsPanelAvailable: showYamlPanel,
    blocksPanelAvailable: canInsertDocContentBlocks()
  });
  removeYamlPanelLabel();
  syncPropsInputPlaceholder();
  externalViewSelectNode?.classList.toggle("hidden", !showExternalControls);
  mediaViewSelectNode?.classList.toggle("hidden", !showMediaControls);
  mediaUploadBtnNode?.classList.toggle("hidden", !showMediaControls || mediaSidecarEditing);
  createMediaSectionBtn?.classList.toggle("hidden", !showMediaControls || mediaSidecarEditing);
  createExternalMemoryBtn.classList.toggle("hidden", !showExternalControls);
  createExternalSectionBtn.classList.toggle(
    "hidden",
    !(showExternalControls || showFlatStorageSectionControls)
  );
  storageSectionsPanelToggleWrapNode?.classList.toggle(
    "hidden",
    !showExternalControls && !showMediaControls && !showFlatStorageSectionControls
  );
  if (showExternalControls) {
    if (externalViewSelectNode) externalViewSelectNode.value = externalViewMode;
  }
  if (showMediaControls) {
    syncMediaViewSelectOptions();
    if (mediaViewSelectNode) mediaViewSelectNode.value = mediaViewMode;
  }
  syncStorageSectionsPanelUi();
  syncWorkspaceCloseButtonsVisibility();
  tabularSourceBtn?.classList.toggle("hidden", !showTabularControls);
  tabularTableBackBtn?.classList.toggle("hidden", !showTabularSourceEditor);
  workspaceRefreshBtn?.classList.toggle("hidden", !showWorkspaceRefresh);
  syncWorkspaceRevealFolderButton();
  if (graphMode) {
    renderNodeGraphView();
  } else if (mindmapMode) {
    renderNodeMindmapView();
  } else if (overviewMode) {
    void renderNodeOverview();
    syncSaveButtonLamp();
    return;
  } else if (navigationMode) {
    void renderNodeNavigation();
    syncSaveButtonLamp();
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
    syncSaveButtonLamp();
    return;
  }
  if (editorViewMode === "wysiwyg" && !isWysiwygEditorEnabled()) {
    setEditorViewMode("source");
    syncSaveButtonLamp();
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
    syncSaveButtonLamp();
    return;
  }
  if (!readOnly && !forceEditOnly) {
    syncEditorViewButtonsAvailability(false, false);
  } else if (listViewWithSourceToggle) {
    syncEditorViewButtonsAvailability(false, forceEditOnly);
  }
  applyEditorViewMode();
  syncSaveButtonLamp();
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

  const defaultHeadingOpen =
    markdownItInstance.renderer.rules.heading_open ||
    function renderHeadingOpen(tokens, idx, options, env, self) {
      return self.renderToken(tokens, idx, options);
    };

  markdownItInstance.renderer.rules.heading_open = function renderHeadingWithId(tokens, idx, options, env, self) {
    const token = tokens[idx];
    const inline = tokens[idx + 1];
    const text = inline?.content || "";
    if (token.tag && /^h[1-6]$/.test(token.tag)) {
      if (!env.headingSlugCounts) env.headingSlugCounts = new Map();
      const baseSlug = slugifyHeadingText(text);
      const seen = env.headingSlugCounts.get(baseSlug) || 0;
      env.headingSlugCounts.set(baseSlug, seen + 1);
      const slug = seen ? `${baseSlug}-${seen + 1}` : baseSlug;
      token.attrSet("id", slug);
    }
    return defaultHeadingOpen(tokens, idx, options, env, self);
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
    return md.render(source, {
      nodePath: nodePath || getActiveNodeApiPath(),
      headingSlugCounts: new Map()
    });
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
  if (getDocAsideTab() === "outline") {
    renderDocOutline();
  }
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
  applySourceEditorAutoHeightUi();
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
    showToast(`Допустимы только JPG, PNG и GIF (${PREVIEW_FILE_BASENAME}.jpg / .png / .gif в ${STORAGE_FOLDER_NAME})`, "error");
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
    if (activeContentMode === NODE_OVERVIEW_MODE || activeContentMode === NODE_NAVIGATION_MODE) {
      await refreshNodeCoverThumbInPlace();
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
    if (activeContentMode === NODE_OVERVIEW_MODE || activeContentMode === NODE_NAVIGATION_MODE) {
      await refreshNodeCoverThumbInPlace();
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
  editorLineNumbersNode.scrollTop = fileContentInputNode.scrollTop;
}

function toggleEditorLineNumbers() {
  editorLineNumbersEnabled = !editorLineNumbersEnabled;
  localStorage.setItem(EDITOR_LINE_NUMBERS_STORAGE_KEY, editorLineNumbersEnabled ? "1" : "0");
  applyEditorLineNumbersUi();
}

function shouldUseEditorAutoHeight() {
  return editorViewMode === "wysiwyg" && isWysiwygEditorEnabled();
}

function getEditorFillMinHeightPx() {
  const surface = editorSurfaceNode || editorCodeWrapNode;
  if (!surface) return 280;

  const surfaceRect = surface.getBoundingClientRect();
  const paddingBottom = 16;
  const available = Math.floor(window.innerHeight - surfaceRect.top - paddingBottom);
  if (!Number.isFinite(available) || available < 120) return 280;
  return available;
}

function syncEditorFillMinHeightCssVar() {
  const host = editorSurfaceNode || docSlabMainNode;
  if (!host) return;
  host.style.setProperty("--editor-fill-min-height", `${getEditorFillMinHeightPx()}px`);
}

function ensureSourceEditorResizeObserver() {
  if (typeof ResizeObserver === "undefined") return;
  const target = workspacePaneNode || workspaceBodyNode || docSlabMainNode;
  if (!target) return;
  sourceEditorResizeObserver?.disconnect();
  sourceEditorResizeObserver = new ResizeObserver(() => {
    if (!shouldUseEditorAutoHeight()) return;
    syncEditorFillMinHeightCssVar();
  });
  sourceEditorResizeObserver.observe(target);
  if (!sourceEditorViewportResizeBound) {
    window.addEventListener("resize", handleSourceEditorViewportResize);
    sourceEditorViewportResizeBound = true;
  }
}

function handleSourceEditorViewportResize() {
  if (!shouldUseEditorAutoHeight()) return;
  syncEditorFillMinHeightCssVar();
}

function applyEditorAutoHeightUi() {
  if (!appRootNode) return;
  appRootNode.classList.toggle("editor-autoheight", shouldUseEditorAutoHeight());
  syncEditorFillMinHeightCssVar();
}

function applySourceEditorAutoHeightUi() {
  if (!fileContentInputNode) return;
  fileContentInputNode.style.height = "";
  fileContentInputNode.style.minHeight = "";
  if (editorLineNumbersNode) {
    editorLineNumbersNode.style.height = "";
    editorLineNumbersNode.style.minHeight = "";
  }
  if (editorCodeWrapNode) editorCodeWrapNode.style.minHeight = "";
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
        showToast(`Изображение сохранено в ${STORAGE_SUBFOLDER_ASSETS}`, "success");
        void refreshMediaListIfVisible();
      })
      .catch((error) => {
        showToast(`Ошибка загрузки: ${error.message}`, "error");
      });
  });

  wysiwygEditorInstance.on("change", () => {
    if (editorViewMode !== "wysiwyg") return;
    syncSourceFromWysiwygEditor();
    syncSaveButtonLamp();
  });

  syncSaveButtonLamp();
  requestAnimationFrame(() => syncEditorFillMinHeightCssVar());
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
    applyPropsFormViewMode();
    syncDocAsideTabAvailability();
    return;
  }

  applyPropsFormViewMode();
  syncDocAsideTabAvailability();

  if (isWysiwyg) {
    syncEditorFillMinHeightCssVar();
    initWysiwygEditor();
    return;
  }

  if (isSource) {
    destroyWysiwygEditor();
    syncEditorLineNumbers();
    applySourceEditorAutoHeightUi();
  }
}

function setEditorViewMode(mode, options = {}) {
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
  if (
    !options.skipRouteSync &&
    (activeContentMode === "tabular" || isFlatStorageListSourceToggleMode())
  ) {
    syncAppRouteToUrl({ replace: true });
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
  if (isAgentSystemRootIndexPath(filePath)) {
    return SERVICE_SECTION_LABEL;
  }
  if (isAgentRootIndexPath(filePath)) {
    return getActiveAgentLabel() || getAgentTreeTitle();
  }
  const parts = String(filePath || "").split("/").filter(Boolean);
  const fileName = parts[parts.length - 1] || "";
  if (isAreaManifestFileName(fileName)) {
    const folderName = parts[parts.length - 2] || "";
    if (folderName.startsWith(SLOT_STORAGE_PREFIX)) {
      return stripStoragePrefix(folderName) || getAgentTreeTitle();
    }
    return stripTopicPrefix(folderName) || getAgentTreeTitle();
  }
  if (isTopicManifestFileName(fileName)) {
    return stripTopicPrefix(fileName);
  }
  return stripTopicPrefix(fileName);
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
    if (isAgentSystemRootIndexPath(normalized)) {
      return SERVICE_SECTION_LABEL;
    }
    if (isAgentRootIndexPath(normalized)) {
      return getActiveAgentLabel() || getAgentTreeTitle();
    }
    const folderPath = getFolderPathFromManifest(normalized);
    return stripAgentContentPrefixFromRelPath(folderPath || getAgentTreeTitle());
  }

  if (isTopicManifestPath(normalized)) {
    const folderPath = getFolderPathFromManifest(normalized);
    const label = getLabelFromPath(normalized);
    const displayFolder = stripAgentContentPrefixFromRelPath(folderPath || "");
    return displayFolder ? `${displayFolder}/${label}` : label;
  }

  return stripAgentContentPrefixFromRelPath(normalized.replace(MANIFEST_MD_RE, ""));
}

function normalizeBreadcrumbPath(nodePath) {
  const normalized = String(nodePath || "").replace(/\\/g, "/").trim();
  if (!normalized) return "";
  if (isNodeManifestPath(normalized) || isTopicManifestPath(normalized) || isPartNodePath(normalized)) {
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

function getBreadcrumbSegmentKindClass(manifestPath) {
  if (!manifestPath) return "";
  if (isAreaNodePath(manifestPath)) return "is-area";
  if (isTopicManifestPath(manifestPath)) return "is-topic";
  return "is-file";
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
  crumbNode.className = [
    "breadcrumb",
    "is-pill",
    className,
    isCurrent ? "current" : "",
    clickable ? "is-link" : "is-static"
  ]
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
    const manifestPath = isLast
      ? getResolvedNodePath(activePath)
      : getBreadcrumbManifestPathForSegmentIndex(index, parts);
    appendBreadcrumbCrumb(part, {
      isCurrent: isLast,
      className: getBreadcrumbSegmentKindClass(manifestPath),
      onClick: !isLast && manifestPath ? () => navigateBreadcrumbToNode(manifestPath) : null
    });
    if (!isLast) appendBreadcrumbSeparator();
  });
  updateWorkspaceShareLinkButton();
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
  if (!node) return [];
  const sections = (node.sections || []).filter(Boolean);
  const items = (node.items || []).filter(Boolean);
  const order = Array.isArray(node.menuOrder) ? node.menuOrder : null;
  const sectionMap = new Map(
    sections.filter((entry) => entry.title).map((entry) => [entry.title, entry])
  );
  const itemMap = new Map(
    items.filter((entry) => entry.label).map((entry) => [entry.label, entry])
  );
  const orderedFolders = [];
  const orderedItems = [];
  const usedSections = new Set();
  const usedItems = new Set();

  if (order?.length) {
    for (const name of order) {
      if (sectionMap.has(name) && !usedSections.has(name)) {
        const entry = sectionMap.get(name);
        if (entry) {
          orderedFolders.push({ kind: "folder", entry });
          usedSections.add(name);
        }
      } else if (itemMap.has(name) && !usedItems.has(name)) {
        const entry = itemMap.get(name);
        if (entry) {
          orderedItems.push({ kind: "item", entry });
          usedItems.add(name);
        }
      }
    }
  }

  const remainingSections = sections
    .filter((entry) => entry.title && !usedSections.has(entry.title))
    .sort((a, b) => String(a.title).localeCompare(String(b.title), "ru"));
  const remainingItems = items
    .filter((entry) => entry.label && !usedItems.has(entry.label))
    .sort((a, b) => String(a.label).localeCompare(String(b.label), "ru"));

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

function findMenuNodeInAgentMenu(menuRoot, targetPath) {
  const normalized = normalizeMenuNodePath(getResolvedNodePath(targetPath));
  if (!menuRoot || !normalized) return null;

  const mainMatch = findMenuNodeByPath(menuRoot, normalized);
  if (mainMatch) return mainMatch;

  const serviceTree = menuRoot?.serviceTree;
  if (!serviceTree) return null;
  return findMenuNodeByPath({ title: "", ...serviceTree }, normalized);
}

function findMenuSectionInAgentMenu(menuRoot, folderPath) {
  if (!menuRoot) return null;
  const folderSection = findMenuSectionByFolderPath(menuRoot, folderPath);
  if (folderSection) return folderSection;
  const serviceTree = menuRoot?.serviceTree;
  if (!serviceTree) return null;
  return findMenuSectionByFolderPath({ title: "", ...serviceTree }, folderPath);
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
  const direct = findMenuNodeInAgentMenu(menuRoot, normalized);
  if (direct && menuNodeHasChildren(direct)) {
    return direct;
  }

  const folderRel = normalizeMenuNodePath(getFolderPathFromManifest(normalized));
  const folderSection = findMenuSectionInAgentMenu(menuRoot, folderRel);
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
      hasAgent: Boolean(node.hasAgentSelf ?? node.hasAgent),
      hasSkill: Boolean(node.hasSkillSelf ?? node.hasSkill),
      hasGitSelf: Boolean(node.hasGitSelf ?? node.hasGit),
      hasObsidianSelf: Boolean(node.hasObsidianSelf ?? node.hasObsidian),
      hasAgentSelf: Boolean(node.hasAgentSelf ?? node.hasAgent),
      hasSkillSelf: Boolean(node.hasSkillSelf ?? node.hasSkill)
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
  if (menu.serviceTree && filterMenuTree({ title: SERVICE_SECTION_TITLE, ...menu.serviceTree }, queryLower)) {
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
  if (currentMenuData) renderMenu(currentMenuData, activeAgentId, { menuOnly: true });
}

function isPinnedInsideServiceFolder(agentId = activeAgentId) {
  const serviceFolder = getActiveAgentSystemFolder(agentId);
  const pinnedPath = getPinnedMenuFolderForTree(agentId);
  if (!serviceFolder || !pinnedPath) return false;
  const service = normalizeFolderPath(serviceFolder);
  const pinned = normalizeFolderPath(pinnedPath);
  if (pinned === ".") return false;
  return pinned === service || pinned.startsWith(`${service}/`);
}

function shouldShowServiceSectionInMenu(agentId = activeAgentId) {
  const serviceFolder = getActiveAgentSystemFolder(agentId);
  if (!serviceFolder) return false;
  if (menuSearchQuery.trim()) return true;
  const pinnedPath = getPinnedMenuFolderForTree(agentId);
  if (!pinnedPath) return true;
  return isPinnedInsideServiceFolder(agentId);
}

function clearMenuServiceSection(parentEl) {
  parentEl?.querySelectorAll(".menu-service-section").forEach((node) => node.remove());
}

function renderServiceTreeBody(serviceTree, body, agentId = activeAgentId) {
  const parentNode = { title: "", ...serviceTree };
  const visibleChildren = getVisibleMenuChildren(parentNode, agentId, ".", 0);
  for (const child of visibleChildren) {
    renderMenuTreeChildInto(child, body, 1, ".", parentNode, agentId);
  }
}

function renderServiceSection(serviceTree, parentEl, agentId = activeAgentId) {
  const serviceFolder = getActiveAgentSystemFolder(agentId);
  if (!serviceFolder || !serviceTree || !parentEl) return;
  if (!shouldShowServiceSectionInMenu(agentId)) {
    clearMenuServiceSection(parentEl);
    return;
  }

  clearMenuServiceSection(parentEl);

  const queryLower = menuSearchQuery.trim().toLowerCase();
  let treeToRender = serviceTree;
  if (queryLower) {
    treeToRender = filterMenuTree({ title: SERVICE_SECTION_TITLE, ...serviceTree }, queryLower);
    if (!treeToRender) return;
  }

  const section = document.createElement("div");
  section.className = "menu-service-section";

  const headRow = document.createElement("div");
  headRow.className = "menu-folder-row menu-service-head";

  const visibleChildren = getVisibleMenuChildren(treeToRender);
  const hasContent = visibleChildren.length > 0 || Boolean(treeToRender.indexPath);
  const collapsed = queryLower ? false : isServiceTreeCollapsed();
  const serviceManifestPath = treeToRender.indexPath || getServiceRootManifestPath();

  headRow.appendChild(createFolderToggleButton(hasContent, collapsed, toggleServiceTreeCollapsed));

  if (serviceManifestPath) {
    const folderButton = document.createElement("button");
    folderButton.type = "button";
    folderButton.className = "menu-folder menu-folder-service-root";
    folderButton.dataset.path = normalizeMenuNodePath(serviceManifestPath);
    applyNodeColorVars(folderButton, treeToRender.color, { isFolder: true });
    setMenuLabelWithMarkers(
      folderButton,
      SERVICE_SECTION_LABEL,
      treeToRender,
      "menu-folder-name",
      { skipAgentMarker: true }
    );
    folderButton.addEventListener("click", (event) => {
      const pathFromNode = event.currentTarget?.dataset?.path || "";
      openNodeFromMenu(SERVICE_SECTION_LABEL, pathFromNode);
    });
    headRow.appendChild(folderButton);
    if (isNodeSettingsTargetPath(serviceManifestPath)) {
      headRow.appendChild(createNodeSettingsButton(serviceManifestPath));
    }
    headRow.appendChild(createBookmarkButton(serviceManifestPath));
  } else {
    const title = document.createElement("h3");
    title.className = "menu-service-title";
    title.textContent = SERVICE_SECTION_LABEL;
    title.title = hasContent ? (collapsed ? "Раскрыть" : "Скрыть") : "";
    if (hasContent) {
      title.addEventListener("click", toggleServiceTreeCollapsed);
    }
    headRow.appendChild(title);
  }

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
    renderServiceTreeBody(treeToRender, body, agentId);
    section.appendChild(body);
  }

  parentEl.insertBefore(section, parentEl.firstChild);
  refreshMenuSortDecorations(agentId);
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
    renderMenu(currentMenuData, activeAgentId, { menuOnly: true });
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
  if (!node || !parentEl) return;
  const searchActive = menuSearchQuery.trim().length > 0;
  const sectionNode = createSectionNode(node.title, depth);
  const sectionFolderPath = resolveSectionFolderPath(node, parentSectionPath, depth);
  sectionNode.dataset.menuFolder = sectionFolderPath || ".";
  const pinnedPath = searchActive ? null : getPinnedMenuFolder(agentId);
  if (pinnedPath) {
    const onBranch = isFolderInPinnedBranch(sectionFolderPath, pinnedPath);
    sectionNode.classList.toggle("is-on-pinned-branch", onBranch);
    sectionNode.classList.toggle(
      "is-pinned-folder",
      normalizeFolderPath(sectionFolderPath) === normalizeFolderPath(pinnedPath)
    );
    sectionNode.classList.toggle("is-off-pinned-branch", !onBranch);
  }
  const toggleSectionCollapsed = () => toggleFolderCollapsed(sectionFolderPath, agentId);
  if (pinnedPath && !isFolderInPinnedBranch(sectionFolderPath, pinnedPath)) {
    return;
  }
  const visibleChildren = getVisibleMenuChildren(node, agentId, parentSectionPath, depth);

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
      const folderBaseLabel = node.title || getLabelFromPath(node.indexPath) || getAgentTreeTitle(agentId);
      const folderDisplayLabel = isAgentRootTreeNode(depth, sectionFolderPath)
        ? `Root: ${folderBaseLabel}`
        : folderBaseLabel;
      setMenuLabelWithMarkers(
        folderButton,
        formatMenuTreeSortLabel(folderSortKey, parentMenuNode, folderDisplayLabel),
        node,
        "menu-folder-name",
        { skipAgentMarker: isAgentRootTreeNode(depth, sectionFolderPath) }
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
      if (!searchActive && menuViewMode === "tree") {
        folderRow.appendChild(createMenuPinBranchButton(sectionFolderPath, agentId));
      }
      folderRow.appendChild(addBtn);
      folderRow.appendChild(createNodeSettingsButton(node.indexPath));
      folderRow.appendChild(createBookmarkButton(node.indexPath));
      sectionNode.appendChild(folderRow);
    } else {
      const sectionRow = document.createElement("div");
      const isEmptyFolder = Boolean(node.empty);
      const canAdoptArea = shouldOfferAreaAdopt(node);

      if (canAdoptArea) {
        sectionRow.className = "menu-folder-row menu-folder-row--adopt";

        sectionRow.appendChild(createFolderToggleButton(hasContent, isCollapsedEffective, toggleSectionCollapsed));

        const folderLabel = document.createElement("span");
        folderLabel.className = "menu-folder menu-folder--adopt";
        folderLabel.title = isEmptyFolder
          ? "Папка на диске без области — нажмите +, чтобы подхватить"
          : "Папка без README.x.md — нажмите +, чтобы подхватить как область";
        setMenuLabelWithMarkers(
          folderLabel,
          formatMenuTreeSortLabel(node.title, parentMenuNode, node.title),
          node,
          "menu-folder-name"
        );
        sectionRow.appendChild(folderLabel);

        appendAdoptFolderRowTrailingActionSpacers(sectionRow, {
          showPinSlot: !searchActive && menuViewMode === "tree"
        });

        const addBtn = document.createElement("button");
        addBtn.type = "button";
        addBtn.className = "add-node-btn";
        addBtn.textContent = "+";
        addBtn.title = "Подхватить папку как область";
        addBtn.addEventListener("click", (event) => {
          event.stopPropagation();
          const adoptPath = node.folderPath || sectionFolderPath || ".";
          openCreateNodeModal(adoptPath, {
            adoptFolder: true,
            emptyFolder: isEmptyFolder,
            folderPath: adoptPath,
            agentId,
            menuParentEl: parentEl
          });
        });
        sectionRow.appendChild(addBtn);
        sectionNode.appendChild(sectionRow);
      } else {
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
        titleNode.title = hasContent
          ? (isCollapsedEffective ? "Раскрыть" : "Скрыть")
          : "";
        titleNode.addEventListener("click", () => {
          if (hasContent) toggleSectionCollapsed();
        });

        sectionRow.appendChild(titleNode);
        sectionNode.appendChild(sectionRow);
      }
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

  if (parentEl.classList.contains("tree-children")) {
    prepareMenuSectionForSortContainer(sectionNode, node);
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
  if (!canSortMenu() || !root) return;
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

function refreshMenuSortDecorations(agentId = activeAgentId) {
  const pane = menuAgentPanes.get(agentId) || getMenuQueryRoot();
  decorateMenuSortRows(pane);
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

function renderMenu(menu, agentId = activeAgentId, options = {}) {
  const menuOnly = Boolean(options.menuOnly);
  if (agentId === activeAgentId && activeAgentId) {
    hideMenuNoAgentPlaceholder();
  }
  const target = ensureMenuAgentPane(agentId);
  menuCacheByAgent.set(agentId, menu);
  if (agentId === activeAgentId) {
    currentMenuData = menu;
    if (!menuOnly) {
      invalidateAgentStorageLayoutCache();
    }
    activateMenuAgentPane(agentId);
  }

  const agentTitle = getAgentTreeTitle(agentId);
  const baseTree = { title: agentTitle, ...menu };
  const filteredTree = filterMenuTree(baseTree, menuSearchQuery.trim().toLowerCase());
  const treeToRender = filteredTree || { title: agentTitle, sections: [], items: [], indexPath: null };

  if (agentId === activeAgentId && !menuOnly) {
    sanitizeCollapsedFolderPaths(agentId);
    const allPaths = new Set(
      collectFlatMenuEntries(baseTree).map((entry) => nodeStorageKey(agentId, entry.path))
    );
    pruneBookmarks(allPaths);
    pruneNodeConfigCache(allPaths);
    applyMenuCardsFilterUi();
  }

  if (menuViewMode === "tree" && !menuSearchQuery.trim() && getPinnedMenuFolder(agentId)) {
    applyPinnedBranchCollapse(agentId);
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
    if (childrenContainer) {
      if (menu.serviceTree && shouldShowServiceSectionInMenu(agentId)) {
        renderServiceSection(menu.serviceTree, childrenContainer, agentId);
      } else {
        clearMenuServiceSection(childrenContainer);
      }
    }
    renderSystemFiles(systemFilesCache);
    decorateMenuSortRows(target);
  }

  if (agentId === activeAgentId) {
    if (!menuOnly) {
      syncAgentPreview({
        hasPreview: menu.hasPreview,
        previewUrl: menu.previewUrl
      });
    }
    syncMenuCollapseAllButton();
    syncMenuPinBranchUi(agentId);
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

function sortSystemFilesByName(files) {
  return [...(Array.isArray(files) ? files : [])].sort((a, b) =>
    String(a?.name || "").localeCompare(String(b?.name || ""), "en")
  );
}

function renderSystemFiles(files) {
  const container = getWorkspacesTreeChildren();
  if (!container) return;

  container.querySelectorAll(".system-file-row").forEach((node) => node.remove());

  const queryLower = menuSearchQuery.trim().toLowerCase();
  const visibleFiles = filterMenuEntriesByQuery(
    collectSystemFileMenuEntries(sortSystemFilesByName(files)),
    queryLower
  );

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
    systemFilesCache = sortSystemFilesByName(Array.isArray(data.files) ? data.files : []);
  } catch {
    systemFilesCache = sortSystemFilesByName([
      { name: ".env", exists: false, empty: true },
      { name: ".gitignore", exists: false, empty: true },
      { name: "AGENTS.md", exists: false, empty: true },
      { name: "awn-autoincrement-id.json", exists: false, empty: true },
      { name: "awn-dependencies.json", exists: false, empty: true },
      { name: "awn-map.json", exists: false, empty: true },
      { name: "docker-compose.yml", exists: false, empty: true },
      { name: "README.md", exists: false, empty: true },
      { name: "TODO.md", exists: false, empty: true }
    ]);
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
  syncMenuPinBranchUi();
}

async function selectSystemFile(name, options = {}) {
  if (!name) return;
  hideHomeView();
  nodeOverviewRenderSeq += 1;
  activeSystemFile = name;
  activePath = null;
  activeLabel = null;
  activeExternalFilePath = null;
  nodeSettingsViewActive = false;
  nodeMemoryViewActive = false;
  clearMediaSidecarEditor();
  updateActiveButton();
  setLoading("Загрузка файла...");

  try {
    const response = await fetch(buildApiUrl("/api/system-file", { name }));
    if (!response.ok) throw new Error(`Request failed with ${response.status}`);
    const data = await response.json();
    fileContentInputNode.value = data.content || "";
    setPropsYamlContent("");
    applyModeUi();
    refreshEditorViewContent();
    commitEditorSaveBaseline();
  } catch (error) {
    fileContentInputNode.value = `Ошибка чтения файла: ${error.message}`;
    applyModeUi();
    commitEditorSaveBaseline();
  } finally {
    hideContentLoading({ force: true });
    if (!options.skipRouteSync) {
      syncAppRouteToUrl({ replace: true });
    }
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
  activeExternalSectionFolder = null;
  activeMediaSectionFolder = null;
  for (const mode of FLAT_STORAGE_SECTION_MODES) {
    activeFlatStorageSectionFolder[mode] = null;
  }
  nodeOverviewRenderSeq += 1;
  clearMediaSidecarEditor();
  updateActiveButton();
  titleInputNode.value = label;
  const showFileLoadingOverlay = !isAsyncOverviewRenderMode();
  if (showFileLoadingOverlay) {
    showContentLoading({ variant: "default", message: "Загрузка файла…" });
  }
  fileContentInputNode.value = "";
  refreshEditorViewContent();

  try {
    const response = await fetch(buildApiUrl("/api/file", { path: getActiveNodeApiPath() }));
    if (!response.ok) throw new Error(`Request failed with ${response.status}`);
    const data = await response.json();
    modeContentCache.description = data.content;
    modeContentCache.internal = "";
    modeContentCache.external = "";
    modeContentCache.inbox = "";
    modeContentCache.references = "";
    modeContentCache.artefacts = "";
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
    hideContentLoading({ force: true });
  } finally {
    if (showFileLoadingOverlay) {
      hideContentLoading();
    }
  }
}

async function loadFlatStorageSectionContent(mode, preserveSectionFolder = null) {
  const folder = getFlatStorageSectionFolderName(mode);
  if (!folder) return;
  const response = await fetch(
    buildApiUrl("/api/folder/view", { path: getActiveNodeApiPath(), folder })
  );
  if (!response.ok) throw new Error(`Request failed with ${response.status}`);
  const data = await response.json();
  applyFlatStorageFolderLoadState(mode, data);
  const sectionToRestore =
    preserveSectionFolder ||
    activeFlatStorageSectionFolder[mode] ||
    getActiveFlatStorageSectionParentForCreate(mode);
  if (sectionToRestore) {
    activeFlatStorageSectionFolder[mode] = String(sectionToRestore).replace(/\\/g, "/").replace(/\/$/, "");
    pruneActiveFlatStorageSectionFolder(mode);
  }
  applyModeUi();
  renderListViewContent();
  renderPreviewFromEditor();
}

async function loadContentByMode(options = {}) {
  if (!activePath) return;
  const preserveMediaSectionFolder = options.preserveMediaSectionFolder || null;
  const preserveExternalSectionFolder = options.preserveExternalSectionFolder || null;
  const preserveFlatStorageSectionFolder = options.preserveFlatStorageSectionFolder || null;

  const deferLoadingEnd = isAsyncOverviewRenderMode();
  if (!deferLoadingEnd) {
    showContentLoading({
      variant: contentLoadingVariantForMode(),
      message: "Загрузка…"
    });
  }

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

  if (activeContentMode === NODE_MINDMAP_MODE) {
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
      const exists = await refreshExternalMemoryCaches();
      fileContentInputNode.value = exists ? modeContentCache.external : "Папка не найдена";
      activeExternalFilePath = null;
      const sectionToRestore =
        preserveExternalSectionFolder ||
        activeExternalSectionFolder ||
        getActiveExternalSectionParentForCreate();
      if (sectionToRestore) {
        activeExternalSectionFolder = String(sectionToRestore).replace(/\\/g, "/").replace(/\/$/, "");
        pruneActiveExternalSectionFolder();
      }
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
      await loadFlatStorageSectionContent(
        "inbox",
        activeContentMode === "inbox" ? preserveFlatStorageSectionFolder : null
      );
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
      const response = await fetch(
        buildApiUrl("/api/folder/view", { path: getActiveNodeApiPath(), folder: STORAGE_SUBFOLDER_REFERENCES })
      );
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
    const sectionToRestore =
      preserveMediaSectionFolder || activeMediaSectionFolder || getActiveMediaSectionParentForCreate();
    try {
      const response = await fetch(buildApiUrl("/api/media", { path: getActiveNodeApiPath() }));
      if (!response.ok) throw new Error(`Request failed with ${response.status}`);
      const data = await response.json();
      mediaAssetsExists = Boolean(data.exists);
      modeContentCache.media = data.content || "";
      syncMediaFilesCache(data.content, data.groups);
      if (sectionToRestore) {
        activeMediaSectionFolder = String(sectionToRestore).replace(/\\/g, "/").replace(/\/$/, "");
        pruneActiveMediaSectionFolder();
      }
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
      const response = await fetch(buildApiUrl("/api/env", { path: getActiveNodeApiPath() }));
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

  if (activeContentMode === "artefacts") {
    try {
      await loadFlatStorageSectionContent(
        "artefacts",
        activeContentMode === "artefacts" ? preserveFlatStorageSectionFolder : null
      );
    } catch (error) {
      fileContentInputNode.value = `Ошибка чтения артефактов: ${error.message}`;
      renderListViewContent();
      fileContentInputNode.readOnly = true;
    }
    updateBreadcrumbsForActiveMode();
    return;
  }

  if (activeContentMode === "scripts") {
    try {
      await loadFlatStorageSectionContent(
        "scripts",
        activeContentMode === "scripts" ? preserveFlatStorageSectionFolder : null
      );
    } catch (error) {
      fileContentInputNode.value = `Ошибка чтения скриптов: ${error.message}`;
      fileContentInputNode.readOnly = true;
    }
    updateBreadcrumbsForActiveMode();
    return;
  }

  if (activeContentMode === "temp") {
    try {
      const response = await fetch(
        buildApiUrl("/api/folder/view", { path: getActiveNodeApiPath(), folder: STORAGE_SUBFOLDER_TEMP })
      );
      if (!response.ok) throw new Error(`Request failed with ${response.status}`);
      const data = await response.json();
      applyFlatStorageFolderLoadState("temp", data);
      applyModeUi();
      renderListViewContent();
      renderPreviewFromEditor();
    } catch (error) {
      fileContentInputNode.value = `Ошибка чтения временных файлов: ${error.message}`;
      renderListViewContent();
      fileContentInputNode.readOnly = true;
    }
    updateBreadcrumbsForActiveMode();
    return;
  }
  } finally {
    if (!deferLoadingEnd) {
      hideContentLoading();
    }
    syncEditorLineNumbers();
    commitEditorSaveBaseline();
  }
}

function replaceActiveMenuLabel(newLabel, pathHint = activePath) {
  const items = getMenuQueryRoot().querySelectorAll(".menu-item, .menu-folder");
  for (const item of items) {
    if (item.dataset.path === pathHint) {
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
  const rawContent = isExternalFileEditing()
    ? buildExternalFileContent()
    : isMediaMarkdownEditing()
      ? buildMediaMarkdownContent()
      : isMediaSidecarEditing()
        ? buildMediaSidecarContent()
        : activeContentMode === "description"
          ? buildNodeManifestContent()
          : getEditorContentValue();
  const content = typeof rawContent === "string" ? rawContent : String(rawContent ?? "");

  if (activeSystemFile) {
    setSaveButtonsState(true, "Сохраняю...");
    let saveSucceeded = false;
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
      saveSucceeded = true;
      showToast("Сохранено", "success");
    } catch (error) {
      showToast(`Ошибка сохранения: ${error.message}`, "error");
    } finally {
      setSaveButtonsState(false);
      if (saveSucceeded) commitEditorSaveBaseline();
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
    !isAgentSystemRootIndexPath(activePath) &&
    !isPartNodePath(activePath);
  const shouldRenameExternal = activeContentMode === "external" && activeExternalFilePath && nextTitle && nextTitle !== currentExternalTitle;
  const shouldRenameMediaSidecar =
    activeContentMode === "media" &&
    activeMediaSidecarPath &&
    nextTitle &&
    nextTitle !== currentMediaTitleBase;

  setSaveButtonsState(true, "Сохраняю...");
  let saveSucceeded = false;

  try {
    if (shouldRenameDescription) {
      const renameResponse = await fetch(buildApiUrl("/api/file/title"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: getActiveNodeApiPath(), title: nextTitle })
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
      } else if (isTopicManifestPath(oldPath)) {
        patchTreePaths(oldPath, renameData.path);
      }

      replaceActiveMenuLabel(getLabelFromPath(renameData.path), renameData.path);
      try {
        await refreshMenu({ agentId: activeAgentId });
      } catch {
        // rename already applied on disk; menu will resync on next open
      }
      updateActiveButton();
      showToast("Переименовано", "success");
    }

    if (shouldRenameExternal) {
      const renameResponse = await fetch(buildApiUrl("/api/external/file/rename"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: getActiveNodeApiPath(), file: activeExternalFilePath, title: nextTitle })
      });
      if (!renameResponse.ok) {
        const errorData = await renameResponse.json().catch(() => ({}));
        const reason = errorData.error || `Request failed with ${renameResponse.status}`;
        const details = errorData.details ? `: ${errorData.details}` : "";
        throw new Error(`Ошибка переименования файла ${STORAGE_SUBFOLDER_CONTENT}: ${reason}${details}`);
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
          path: getActiveNodeApiPath(),
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
        applyMediaSidecarContentUi(renameData.content);
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
      (activeContentMode === "media" && !isMediaAssetEditing()) ||
      (activeContentMode === "tabular" && !isTabularSourceEditing()) ||
      activeContentMode === "scripts" ||
      activeContentMode === "node-preview" ||
      activeContentMode === "graph"
    ) {
      throw new Error("Этот режим доступен только для чтения");
    }

    if (activeContentMode === "media" && activeMediaMarkdownPath) {
      const response = await fetch(buildApiUrl("/api/media/markdown"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: getActiveNodeApiPath(),
          file: activeMediaMarkdownPath,
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
      applyMediaSidecarContentUi(data.content || "");
      await refreshMediaCache();
      refreshEditorViewContent();
      saveSucceeded = true;
      showToast(`${AREA_MANIFEST_FILE} сохранён`, "success");
      return;
    }

    if (activeContentMode === "media" && activeMediaSidecarPath) {
      const response = await fetch(buildApiUrl("/api/media/sidecar"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: getActiveNodeApiPath(),
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
      applyMediaSidecarContentUi(data.content || "");
      refreshEditorViewContent();
      saveSucceeded = true;
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
      saveSucceeded = true;
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
      saveSucceeded = true;
      showToast("CSV сохранён", "success");
      return;
    }
    if (activeContentMode === "todo") {
      modeContentCache.todo = data.content || "";
      saveSucceeded = true;
      showToast("TODO сохранён", "success");
      refreshEditorViewContent();
      return;
    }
    if (activeContentMode === "configs") {
      modeContentCache.configs = data.content || "";
      setCachedNodeConfig(activePath, {
        path: data.path || "",
        content: data.content || "",
        exists: Boolean(data.exists),
        defaultLandingMode: data.defaultLandingMode || parseNodeConfigContent(data.content || "").defaultLandingMode
      });
      syncNodeDefaultLandingBtn();
      saveSucceeded = true;
      showToast(`${BUNDLE_CONFIG_FILE} сохранён`, "success");
      refreshEditorViewContent();
      return;
    }
    if (activeContentMode === "env") modeContentCache.env = data.content || "";
    if (activeContentMode === "external" && activeExternalFilePath) {
      applyExternalFileContentUi(data.content || "");
      saveSucceeded = true;
      showToast(`Файл ${STORAGE_SUBFOLDER_CONTENT} сохранен`, "success");
      return;
    }
    fileContentInputNode.value = data.content;
    refreshEditorViewContent();
    saveSucceeded = true;
    showToast("Сохранено", "success");
  } catch (error) {
    showToast(`Ошибка сохранения: ${error.message}`, "error");
  } finally {
    setSaveButtonsState(false);
    if (saveSucceeded) commitEditorSaveBaseline();
  }
}

async function loadPropertiesForActivePath() {
  if (!activePath) {
    setPropsYamlContent("");
    return;
  }
  try {
    const response = await fetch(buildApiUrl("/api/file/properties", { path: getActiveNodeApiPath() }));
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
      body: JSON.stringify({ path: getActiveNodeApiPath(), content })
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
      saved === "dashboard2" ||
      saved === "map" ||
      saved === "map2" ||
      saved === "map3" ||
      saved === "schema" ||
      saved === "vault" ||
      saved === "graph" ||
      saved === "storage" ||
      saved === "table" ||
      saved === "timeline" ||
      saved === "timeline-axis" ||
      saved === "timeline-vertical" ||
      saved === "timeline-horizontal"
    ) {
      return saved === "timeline-horizontal" ? "timeline-vertical" : saved;
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
  if (!agentViewSelect) return;
  const option = agentViewSelect.querySelector(`option[value="${agentWorkspaceView}"]`);
  if (option && !option.disabled) {
    agentViewSelect.value = agentWorkspaceView;
  }
}

function isAgentWorkspaceCanvasVisible() {
  return Boolean(appRootNode?.classList.contains("home-view"));
}

function applyAgentWorkspaceCanvasUi() {
  syncAgentWorkspaceViewButtons();
  const showCanvas = isAgentWorkspaceCanvasVisible();
  homePaneNode?.classList.toggle("hidden", !showCanvas || agentWorkspaceView !== "dashboard");
  home2PaneNode?.classList.toggle("hidden", !showCanvas || agentWorkspaceView !== "dashboard2");
  agentMapPaneNode?.classList.toggle("hidden", !showCanvas || agentWorkspaceView !== "map");
  agentMap2PaneNode?.classList.toggle("hidden", !showCanvas || agentWorkspaceView !== "map2");
  agentMap3PaneNode?.classList.toggle("hidden", !showCanvas || agentWorkspaceView !== "map3");
  agentSchemaPaneNode?.classList.toggle("hidden", !showCanvas || agentWorkspaceView !== "schema");
  agentVaultPaneNode?.classList.toggle("hidden", !showCanvas || agentWorkspaceView !== "vault");
  agentGraphPaneNode?.classList.toggle("hidden", !showCanvas || agentWorkspaceView !== "graph");
  agentTablePaneNode?.classList.toggle("hidden", !showCanvas || agentWorkspaceView !== "table");
  agentStoragePaneNode?.classList.toggle("hidden", !showCanvas || agentWorkspaceView !== "storage");
  agentTimelinePaneNode?.classList.toggle("hidden", !showCanvas || agentWorkspaceView !== "timeline");
  agentTimelineAxisPaneNode?.classList.toggle("hidden", !showCanvas || agentWorkspaceView !== "timeline-axis");
  agentTimelineVerticalPaneNode?.classList.toggle(
    "hidden",
    !showCanvas || agentWorkspaceView !== "timeline-vertical"
  );

  if (!showCanvas) return;

  if (agentWorkspaceView === "dashboard") {
    renderAgentDashboardView();
  } else if (agentWorkspaceView === "dashboard2") {
    renderAgentDashboard2View();
  } else if (agentWorkspaceView === "map") {
    renderAgentMapView();
  } else if (agentWorkspaceView === "map2") {
    renderAgentMap2View();
  } else if (agentWorkspaceView === "map3") {
    void renderAgentMap3View();
  } else if (agentWorkspaceView === "schema") {
    renderAgentSchemaView();
  } else if (agentWorkspaceView === "vault") {
    renderAgentVaultView();
  } else if (agentWorkspaceView === "graph") {
    renderAgentGraphView();
  } else if (agentWorkspaceView === "storage") {
    void renderAgentStorageView();
  } else if (agentWorkspaceView === "table") {
    void renderAgentTableView();
  } else if (agentWorkspaceView === "timeline") {
    void renderAgentTimelineView();
  } else if (agentWorkspaceView === "timeline-axis") {
    void renderAgentTimelineAxisView();
  } else if (agentWorkspaceView === "timeline-vertical") {
    void renderAgentTimelineVerticalView();
  }

  updateDocumentTitle();
}

function setAgentWorkspaceView(view) {
  if (
    view !== "dashboard" &&
    view !== "dashboard2" &&
    view !== "map" &&
    view !== "map2" &&
    view !== "map3" &&
    view !== "schema" &&
    view !== "vault" &&
    view !== "graph" &&
    view !== "storage" &&
    view !== "table" &&
    view !== "timeline" &&
    view !== "timeline-axis" &&
    view !== "timeline-vertical"
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
      sub: "README.x.md",
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
      sub: `${getNamedStorageBundleRel(rootPath || AREA_MANIFEST_FILE, BUNDLE_CONTENT_FILE)}`,
      mode: "internal",
      path: rootPath,
      action: "memory"
    },
    {
      label: "Многофайловая",
      sub: `${STORAGE_SUBFOLDER_CONTENT}/`,
      mode: "external",
      path: rootPath,
      action: "memory"
    },
    {
      label: "Табличная",
      sub: `${getNamedStorageBundleRel(rootPath || AREA_MANIFEST_FILE, BUNDLE_TABULAR_FILE)}`,
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
    for (const child of getVisibleMenuChildren(menuNode, activeAgentId, parentSectionPath, depth)) {
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

function countAgentMap3SlotLayers(slot) {
  if (!slot?.layers) return 0;
  return AGENT_MAP3_LAYER_KEYS.reduce((sum, spec) => sum + (slot.layers[spec.key]?.exists ? 1 : 0), 0);
}

function createAgentMap3LayerDots(slot) {
  const wrap = document.createElement("div");
  wrap.className = "agent-map3-layer-dots";
  wrap.setAttribute("aria-label", `Слои ${STORAGE_FOLDER_NAME}`);

  for (const spec of AGENT_MAP3_LAYER_KEYS) {
    const dot = document.createElement("span");
    dot.className = "agent-map3-layer-dot";
    dot.title = spec.label;
    if (slot.layers?.[spec.key]?.exists) dot.classList.add("is-on");
    wrap.appendChild(dot);
  }

  return wrap;
}

function createAgentMap3SlotNode(slot) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `agent-map3-slot${slot.kind === "area" ? " is-area" : " is-topic"}${slot.exists ? "" : " is-empty"}`;
  btn.dataset.manifestPath = slot.manifestPath || "";

  const kind = document.createElement("span");
  kind.className = "agent-map3-slot-kind";
  kind.textContent = slot.kind === "area" ? "Область" : "Тема";

  const title = document.createElement("span");
  title.className = "agent-map3-slot-title";
  title.textContent = slot.label || slot.slotKey;

  const path = document.createElement("span");
  path.className = "agent-map3-slot-path";
  path.textContent = slot.slotKey === "_" ? "_/" : `${slot.slotKey}/`;

  const meta = document.createElement("span");
  meta.className = "agent-map3-slot-meta";
  const layerCount = countAgentMap3SlotLayers(slot);
  meta.textContent = slot.exists ? `${layerCount}/${AGENT_MAP3_LAYER_KEYS.length} слоёв` : "слот не создан";

  btn.append(kind, title, path, createAgentMap3LayerDots(slot), meta);
  btn.addEventListener("click", () => {
    if (slot.manifestPath) openNodeFromMenu(slot.label || slot.slotKey, slot.manifestPath);
  });
  return btn;
}

function createAgentMap3ContainerLane(containerData) {
  const lane = document.createElement("section");
  lane.className = "agent-map3-lane";

  const head = document.createElement("header");
  head.className = "agent-map3-lane-head";
  const title = document.createElement("h3");
  title.className = "agent-map3-lane-title";
  title.textContent = containerData.containerDir || getActiveAgentLabel() || "Корень workspace";
  const storagePath = document.createElement("span");
  storagePath.className = "agent-map3-lane-storage";
  storagePath.textContent = containerData.storageRoot;
  head.append(title, storagePath);
  lane.appendChild(head);

  if (containerData.rootHasContent) {
    const warn = document.createElement("p");
    warn.className = "agent-map3-lane-warn";
    warn.textContent = `В корне ${STORAGE_FOLDER_NAME} есть файлы вне слотов (legacy) — см. вид «Хранилище».`;
    lane.appendChild(warn);
  }

  const track = document.createElement("div");
  track.className = "agent-map3-track";

  const areaSlot = (containerData.slots || []).find((slot) => slot.kind === "area");
  const topicSlots = (containerData.slots || []).filter((slot) => slot.kind === "topic");

  if (areaSlot) {
    const hub = document.createElement("div");
    hub.className = "agent-map3-hub";
    hub.appendChild(createAgentMap3SlotNode(areaSlot));
    track.appendChild(hub);
  }

  if (topicSlots.length) {
    const topics = document.createElement("div");
    topics.className = "agent-map3-topics";
    topics.setAttribute("role", "list");
    for (const slot of topicSlots) {
      const item = document.createElement("div");
      item.className = "agent-map3-topic-wrap";
      item.setAttribute("role", "listitem");
      item.appendChild(createAgentMap3SlotNode(slot));
      topics.appendChild(item);
    }
    track.appendChild(topics);
  } else if (!areaSlot) {
    const empty = document.createElement("p");
    empty.className = "agent-map3-lane-empty";
    empty.textContent = "Нет манифестов в этом контейнере";
    track.appendChild(empty);
  }

  if (areaSlot && topicSlots.length) {
    track.classList.add("has-topics");
  }

  lane.appendChild(track);

  if (containerData.orphanSlots?.length) {
    const orphans = document.createElement("div");
    orphans.className = "agent-map3-orphans";
    orphans.innerHTML =
      "Слоты без манифеста: " +
      containerData.orphanSlots.map((name) => `<code>${escapeHtml(name)}</code>`).join(" · ");
    lane.appendChild(orphans);
  }

  return lane;
}

function renderAgentMap3Stats(layout) {
  if (!agentMap3StatsNode) return;
  const slotCount = (layout.containers || []).reduce((sum, c) => sum + (c.slots?.length || 0), 0);
  const filledSlots = (layout.containers || []).reduce(
    (sum, c) => sum + (c.slots || []).filter((s) => s.exists && countAgentMap3SlotLayers(s) > 0).length,
    0
  );

  agentMap3StatsNode.innerHTML = `
    <span class="agent-map3-stat"><strong>${layout.containers?.length || 0}</strong> контейнеров</span>
    <span class="agent-map3-stat"><strong>${slotCount}</strong> слотов</span>
    <span class="agent-map3-stat agent-map3-stat--ok"><strong>${filledSlots}</strong> с данными</span>
  `;
}

async function renderAgentMap3View() {
  if (!agentMap3BoardNode) return;

  const requestId = ++agentMap3RequestId;
  agentMap3BoardNode.innerHTML = `<div class="agent-map3-empty">Загрузка карты ${STORAGE_FOLDER_NAME}…</div>`;
  if (agentMap3StatsNode) agentMap3StatsNode.innerHTML = "";

  try {
    const layout = await fetchAgentStorageLayout();
    if (requestId !== agentMap3RequestId) return;

    agentMap3BoardNode.innerHTML = "";
    renderAgentMap3Stats(layout);

    if (!layout.containers?.length) {
      agentMap3BoardNode.innerHTML = `<div class="agent-map3-empty">В workspace пока нет манифестов для карты ${STORAGE_FOLDER_NAME}</div>`;
      return;
    }

    for (const container of layout.containers) {
      agentMap3BoardNode.appendChild(createAgentMap3ContainerLane(container));
    }
  } catch {
    if (requestId !== agentMap3RequestId) return;
    agentMap3BoardNode.innerHTML = `<div class="agent-map3-empty">Не удалось построить карту. Запустите сервер и обновите страницу.</div>`;
    if (agentMap3StatsNode) agentMap3StatsNode.innerHTML = "";
  }
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
    homeHintNode.textContent = AGENT_HOME_HINT_DEFAULT;
  }
}

function createHome2TopicCard(entry) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "home2-topic-card";
  btn.title = entry.displayPath || entry.path || "";

  const media = document.createElement("div");
  media.className = "home2-topic-card-media";

  if (entry.hasPreview && entry.previewUrl) {
    const img = document.createElement("img");
    img.alt = "";
    img.draggable = false;
    img.src = appendCacheBuster(appendAgentToApiUrl(entry.previewUrl));
    img.onerror = () => {
      media.replaceChildren();
      const fallback = document.createElement("span");
      fallback.className = "home2-topic-card-fallback";
      fallback.textContent = getAgentPickerInitials({ name: entry.label });
      media.appendChild(fallback);
    };
    media.appendChild(img);
  } else {
    const fallback = document.createElement("span");
    fallback.className = "home2-topic-card-fallback";
    fallback.textContent = getAgentPickerInitials({ name: entry.label });
    media.appendChild(fallback);
  }

  const body = document.createElement("div");
  body.className = "home2-topic-card-body";

  const title = document.createElement("span");
  title.className = "home2-topic-card-title";
  title.textContent = entry.label || getLabelFromPath(entry.path);

  const path = document.createElement("span");
  path.className = "home2-topic-card-path";
  path.textContent = entry.displayPath || getNodeDisplayPath(entry.path);

  body.append(title, path);
  btn.append(media, body);
  btn.addEventListener("click", () => {
    if (entry.path) openNodeFromMenu(getLabelFromPath(entry.path), entry.path);
  });
  return btn;
}

function renderAgentDashboard2View() {
  if (!home2ContentNode) return;

  const agent = agentsCache.find((item) => item.id === activeAgentId);
  const agentLabel = agent?.name || getActiveAgentLabel() || activeAgentId || "Агент";
  const counts = countAgentMenuNodes(currentMenuData);
  home2ContentNode.replaceChildren();

  const shell = document.createElement("div");
  shell.className = "home2-shell";

  const header = document.createElement("header");
  header.className = "home2-header";

  const identity = document.createElement("div");
  identity.className = "home2-identity";

  const avatarWrap = document.createElement("div");
  avatarWrap.className = "home2-avatar";
  const previewUrl = agent ? getRegistryAgentPreviewUrl(agent) : null;
  if (previewUrl) {
    const img = document.createElement("img");
    img.alt = "";
    img.draggable = false;
    img.src = previewUrl;
    img.onerror = () => {
      avatarWrap.textContent = getAgentPickerInitials(agent);
    };
    avatarWrap.appendChild(img);
  } else {
    avatarWrap.textContent = getAgentPickerInitials(agent || { name: agentLabel });
  }

  const copy = document.createElement("div");
  copy.className = "home2-identity-copy";

  const title = document.createElement("h2");
  title.className = "home2-title";
  title.textContent = agentLabel;

  const meta = document.createElement("p");
  meta.className = "home2-meta";
  meta.textContent = [activeAgentId, agent?.path].filter(Boolean).join(" · ");

  copy.append(title, meta);

  if (agent?.comment) {
    const comment = document.createElement("p");
    comment.className = "home2-comment";
    comment.textContent = agent.comment;
    copy.appendChild(comment);
  }

  identity.append(avatarWrap, copy);
  header.appendChild(identity);

  const stats = document.createElement("div");
  stats.className = "home2-stats";
  for (const stat of [
    { value: String(counts.total), label: "Тем и областей" },
    { value: String(counts.folders), label: "Контейнеров" },
    { value: String(counts.leaves), label: "Тем" }
  ]) {
    const card = document.createElement("article");
    card.className = "home2-stat";
    card.innerHTML = `
      <span class="home2-stat-value">${escapeHtml(stat.value)}</span>
      <span class="home2-stat-label">${escapeHtml(stat.label)}</span>
    `;
    stats.appendChild(card);
  }

  shell.append(header, stats);

  const menuRoot = currentMenuData ? { title: getAgentTreeTitle(), ...currentMenuData } : null;
  let topicEntries = [];
  if (menuRoot) {
    const flat = collectFlatMenuEntries(menuRoot);
    const leaves = flat.filter((entry) => !entry.isFolder);
    topicEntries = (leaves.length ? leaves : flat).slice(0, 12);
  }

  const topicsSection = document.createElement("section");
  topicsSection.className = "home2-section";
  topicsSection.setAttribute("aria-labelledby", "home2-topics-title");

  const topicsTitle = document.createElement("h3");
  topicsTitle.id = "home2-topics-title";
  topicsTitle.className = "home2-section-title";
  topicsTitle.textContent = "Быстрый доступ к темам";

  topicsSection.appendChild(topicsTitle);

  if (topicEntries.length === 0) {
    const empty = document.createElement("p");
    empty.className = "home2-empty";
    empty.textContent = "В workspace пока нет тем — создайте первую в дереве слева.";
    topicsSection.appendChild(empty);
  } else {
    const grid = document.createElement("div");
    grid.className = "home2-topics-grid";
    for (const entry of topicEntries) {
      grid.appendChild(createHome2TopicCard(entry));
    }
    topicsSection.appendChild(grid);
  }

  shell.appendChild(topicsSection);

  const hint = document.createElement("p");
  hint.className = "home2-hint";
  hint.textContent = `Workspace «${agentLabel}» — рабочий дашборд. Дашборд 1 — обзорная главная с описанием продукта.`;
  shell.appendChild(hint);

  home2ContentNode.appendChild(shell);
}

function getAgentSchemaNodeKindLabel(entry) {
  if (entry?.isFolder || isAreaNodePath(entry?.path)) return "Область:";
  if (isTopicManifestPath(entry?.path)) return "Тема:";
  return "Тема:";
}

function appendAgentSchemaNode(container, entry, depth) {
  const row = document.createElement("button");
  row.type = "button";
  const isArea = Boolean(entry.isFolder || isAreaNodePath(entry.path));
  row.className = `agent-schema-node${isArea ? " is-folder is-area" : " is-topic"}`;
  row.style.paddingLeft = `${10 + depth * 16}px`;

  const icon = document.createElement("span");
  icon.className = "agent-schema-node-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = isArea ? "📁" : "📄";

  const kind = document.createElement("span");
  kind.className = "agent-schema-node-kind";
  kind.textContent = getAgentSchemaNodeKindLabel(entry);

  const label = document.createElement("span");
  label.className = "agent-schema-node-label";
  label.textContent = entry.label || getLabelFromPath(entry.path);

  const path = document.createElement("span");
  path.className = "agent-schema-node-path";
  path.textContent = entry.displayPath || getNodeDisplayPath(entry.path);

  row.append(icon, kind, label, path);
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

const AGENT_HOME_HINT_DEFAULT = "Выберите тему в дереве или откройте схему";

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

function getServiceGraphRelativePath(entry) {
  const rawDisplay = entry?.displayPath || (entry?.path ? getNodeDisplayPath(entry.path) : "");
  const stripped = stripServicePrefixFromRelPath(rawDisplay);
  if (stripped) return stripped.replace(/\\/g, "/").trim();
  return stripServicePrefixFromRelPath(entry?.path || "").replace(/\\/g, "/").trim();
}

function buildGraphDataFromAgentMenu(menu) {
  const baseTree = { title: getAgentTreeTitle(), ...menu };
  const workspaceEntries = collectFlatMenuEntries(baseTree);
  const serviceEntries = menu?.serviceTree
    ? collectFlatMenuEntries({ title: "", ...menu.serviceTree })
    : [];

  const previewByDisplayPath = new Map();
  for (const entry of workspaceEntries) {
    if (!entry.hasPreview || !entry.previewUrl) continue;
    const displayPath = entry.displayPath || getNodeDisplayPath(entry.path);
    if (!displayPath) continue;
    previewByDisplayPath.set(displayPath, entry.previewUrl);
  }
  for (const entry of serviceEntries) {
    if (!entry.hasPreview || !entry.previewUrl) continue;
    const displayPath = getServiceGraphRelativePath(entry);
    if (!displayPath) continue;
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
  const nodeIds = new Set([rootId]);
  const skipNormalizedPaths = new Set();
  if (baseTree.indexPath) {
    skipNormalizedPaths.add(normalizeMenuNodePath(baseTree.indexPath));
  }

  let serviceRootId = null;
  if (menu?.serviceTree && getActiveAgentSystemFolder()) {
    serviceRootId = "service-root";
    const serviceManifestPath = menu.serviceTree.indexPath || getServiceRootManifestPath();
    if (serviceManifestPath) {
      skipNormalizedPaths.add(normalizeMenuNodePath(serviceManifestPath));
    }
    nodes.push({
      id: serviceRootId,
      label: SERVICE_SECTION_LABEL,
      type: "folder",
      depth: 1,
      nodePath: serviceManifestPath || null,
      previewUrl: menu.serviceTree.hasPreview ? menu.serviceTree.previewUrl || null : null
    });
    edges.push({ from: rootId, to: serviceRootId });
    folderIds.set("service/", serviceRootId);
    nodeIds.add(serviceRootId);
  }

  // Области (README.x.md) уже есть в меню — не создавать вторую «пустую» folder:path для того же displayPath.
  for (const entry of workspaceEntries) {
    if (!entry.isFolder || !entry.path) continue;
    if (skipNormalizedPaths.has(normalizeMenuNodePath(entry.path))) continue;
    const displayPath = String(entry.displayPath || entry.label || getLabelFromPath(entry.path))
      .replace(/\\/g, "/")
      .trim();
    if (!displayPath) continue;
    folderIds.set(displayPath, `node:${normalizeMenuNodePath(entry.path)}`);
  }
  for (const entry of serviceEntries) {
    if (!entry.isFolder || !entry.path) continue;
    const rel = getServiceGraphRelativePath(entry);
    if (!rel) continue;
    folderIds.set(`service/${rel}`, `node:${normalizeMenuNodePath(entry.path)}`);
  }

  const appendGraphMenuEntries = (entries, { parentRootId, serviceScope }) => {
    for (const entry of entries) {
      const normPath = entry.path ? normalizeMenuNodePath(entry.path) : null;
      if (normPath && skipNormalizedPaths.has(normPath)) continue;

      const displayPath = serviceScope
        ? getServiceGraphRelativePath(entry)
        : String(entry.displayPath || entry.label || getLabelFromPath(entry.path)).replace(/\\/g, "/").trim();
      const parts = String(displayPath).split("/").filter(Boolean);
      let parentId = parentRootId;

      for (let i = 0; i < parts.length - 1; i += 1) {
        const built = serviceScope
          ? `service/${parts.slice(0, i + 1).join("/")}`
          : parts.slice(0, i + 1).join("/");
        if (!folderIds.has(built)) {
          const folderId = `folder:${built}`;
          nodes.push({
            id: folderId,
            label: parts[i],
            type: "folder",
            depth: (serviceScope ? 1 : 0) + i + 1,
            nodePath: null,
            previewUrl: previewByDisplayPath.get(parts.slice(0, i + 1).join("/")) || null
          });
          edges.push({ from: parentId, to: folderId });
          folderIds.set(built, folderId);
          nodeIds.add(folderId);
        }
        parentId = folderIds.get(built);
      }

      const nodeId = `node:${normalizeMenuNodePath(entry.path)}`;
      if (!nodeIds.has(nodeId)) {
        nodes.push({
          id: nodeId,
          label: parts[parts.length - 1] || entry.label,
          type: entry.isFolder ? "folder" : "file",
          depth: Math.max((serviceScope ? 1 : 0) + parts.length, serviceScope ? 2 : 1),
          nodePath: entry.path,
          previewUrl: entry.previewUrl || null
        });
        nodeIds.add(nodeId);
      }
      edges.push({ from: parentId, to: nodeId });
    }
  };

  appendGraphMenuEntries(workspaceEntries, { parentRootId: rootId, serviceScope: false });
  if (serviceRootId) {
    appendGraphMenuEntries(serviceEntries, { parentRootId: serviceRootId, serviceScope: true });
  }

  return { nodes, edges };
}

async function fetchAgentStorageLayout(force = false) {
  if (!force && agentStorageLayoutCache) return agentStorageLayoutCache;
  const response = await fetch(buildApiUrl("/api/agent/storage-layout"));
  if (!response.ok) throw new Error(`storage-layout:${response.status}`);
  const data = await response.json();
  agentStorageLayoutCache = data;
  return data;
}

function invalidateAgentStorageLayoutCache() {
  agentStorageLayoutCache = null;
  agentWorkspaceTableCache = null;
  agentTimelineCache = null;
}

async function fetchAgentWorkspaceTable(force = false) {
  if (!force && agentWorkspaceTableCache) return agentWorkspaceTableCache;
  const response = await fetch(buildApiUrl("/api/agent/workspace-table"));
  if (!response.ok) throw new Error(`workspace-table:${response.status}`);
  const data = await response.json();
  agentWorkspaceTableCache = data;
  return data;
}

async function fetchAgentTimeline(force = false) {
  if (!force && agentTimelineCache) return agentTimelineCache;
  const response = await fetch(buildApiUrl("/api/agent/timeline", { limit: 150 }));
  if (!response.ok) throw new Error(`timeline:${response.status}`);
  const data = await response.json();
  agentTimelineCache = data;
  return data;
}

const AGENT_TABLE_SORT_KEYS = new Set([
  "displayPath",
  "label",
  "kind",
  "layerPresent",
  "slotDir",
  "manifestUpdatedAt"
]);

function agentTableRowMatchesQuery(row, query) {
  if (!query) return true;
  const haystack = [
    row.label,
    row.displayPath,
    row.slotKey,
    row.slotDir,
    row.category,
    ...(Array.isArray(row.tags) ? row.tags : [])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

function sortAgentTableRows(rows) {
  const key = AGENT_TABLE_SORT_KEYS.has(agentTableSortKey) ? agentTableSortKey : "displayPath";
  const dir = agentTableSortDir === "desc" ? -1 : 1;
  return [...rows].sort((a, b) => {
    if (key === "layerPresent") {
      return (a.layerPresent - b.layerPresent) * dir || a.displayPath.localeCompare(b.displayPath, "ru");
    }
    if (key === "manifestUpdatedAt") {
      const aTime = a.manifestUpdatedAt ? Date.parse(a.manifestUpdatedAt) : 0;
      const bTime = b.manifestUpdatedAt ? Date.parse(b.manifestUpdatedAt) : 0;
      return (aTime - bTime) * dir || a.displayPath.localeCompare(b.displayPath, "ru");
    }
    const aVal = String(a[key] ?? "");
    const bVal = String(b[key] ?? "");
    if (key === "kind") {
      if (aVal !== bVal) return (aVal === "area" ? -1 : 1) * dir;
      return a.displayPath.localeCompare(b.displayPath, "ru");
    }
    return aVal.localeCompare(bVal, "ru") * dir;
  });
}

function formatAgentTableKind(kind) {
  return kind === "area" ? "Область" : "Тема";
}

function formatAgentTimelineFileKind(fileKind) {
  const labels = {
    manifest: "Манифест",
    content: "Content",
    tabular: "Tabular",
    config: "Config",
    todo: "Todo",
    env: ".env",
    preview: "Превью",
    media: "Медиа"
  };
  return labels[fileKind] || fileKind;
}

function getTimelineDayKey(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    });
  } catch {
    return "—";
  }
}

function groupTimelineEventsByDay(events) {
  const groups = new Map();
  for (const event of events) {
    const dayKey = getTimelineDayKey(event.updatedAt);
    if (!groups.has(dayKey)) groups.set(dayKey, []);
    groups.get(dayKey).push(event);
  }
  return groups;
}

function computeTimelineAxisRange(events) {
  const times = events.map((event) => Date.parse(event.updatedAt)).filter(Number.isFinite);
  if (!times.length) {
    const now = Date.now();
    return { min: now - 86400000, max: now };
  }
  const min = Math.min(...times);
  const max = Math.max(...times);
  const span = Math.max(max - min, 60000);
  const pad = Math.max(span * 0.06, 300000);
  return { min: min - pad, max: max + pad };
}

function getTimelineAxisPositionPercent(updatedAt, range) {
  const t = Date.parse(updatedAt);
  if (!Number.isFinite(t) || range.max <= range.min) return 50;
  return Math.min(100, Math.max(0, ((t - range.min) / (range.max - range.min)) * 100));
}

function buildTimelineAxisTicks(range, count = 7) {
  const ticks = [];
  const span = range.max - range.min;
  if (span <= 0) {
    return [{ percent: 0, label: formatNodeMetaDateTime(new Date(range.min).toISOString()) }];
  }
  for (let i = 0; i < count; i += 1) {
    const ratio = count === 1 ? 0 : i / (count - 1);
    const at = range.min + span * ratio;
    ticks.push({
      percent: ratio * 100,
      label: formatNodeMetaDateTime(new Date(at).toISOString())
    });
  }
  return ticks;
}

function assignTimelineAxisLanes(events, range) {
  const sorted = [...events].sort(
    (a, b) => Date.parse(a.updatedAt) - Date.parse(b.updatedAt)
  );
  const laneEnds = [];
  const withLane = [];
  for (const event of sorted) {
    const pos = getTimelineAxisPositionPercent(event.updatedAt, range);
    let lane = 0;
    while (lane < laneEnds.length && pos - laneEnds[lane] < 4.5) lane += 1;
    laneEnds[lane] = pos;
    withLane.push({ event, pos, lane });
  }
  return withLane;
}

function sortTimelineEventsChronological(events) {
  return [...events].sort((a, b) => Date.parse(a.updatedAt) - Date.parse(b.updatedAt));
}

function createTimelineVerticalRow(event) {
  const row = document.createElement("article");
  row.className = "agent-timeline-v-row";
  row.setAttribute("role", "listitem");

  const time = document.createElement("time");
  time.className = "agent-timeline-v-time";
  time.dateTime = event.updatedAt || "";
  time.textContent = formatNodeMetaDateTime(event.updatedAt);
  row.appendChild(time);

  const axis = document.createElement("div");
  axis.className = "agent-timeline-v-axis";
  const dot = document.createElement("span");
  dot.className = `agent-timeline-v-dot is-${event.fileKind || "other"}`;
  dot.setAttribute("aria-hidden", "true");
  axis.appendChild(dot);
  row.appendChild(axis);

  const card = document.createElement("button");
  card.type = "button";
  card.className = "agent-timeline-v-card";
  card.title = `${formatNodeMetaDateTime(event.updatedAt)} — ${event.displayPath || event.label}`;

  const kind = document.createElement("span");
  kind.className = `agent-timeline-v-kind is-${event.fileKind || "other"}`;
  kind.textContent = formatAgentTimelineFileKind(event.fileKind);
  card.appendChild(kind);

  const fileLabel = document.createElement("span");
  fileLabel.className = "agent-timeline-v-file";
  fileLabel.textContent = event.fileLabel || "Файл";
  card.appendChild(fileLabel);

  const title = document.createElement("span");
  title.className = "agent-timeline-v-title";
  title.textContent = event.displayPath || event.label || "—";
  card.appendChild(title);

  card.addEventListener("click", () => {
    openNodeFromMenu(event.label || getLabelFromPath(event.manifestPath), event.manifestPath);
  });
  row.appendChild(card);

  return row;
}

function createAgentStorageLayerChip(layerName, layerMeta) {
  const chip = document.createElement("span");
  chip.className = "agent-storage-layer";
  if (layerMeta?.exists) chip.classList.add("is-present");

  const label = document.createElement("span");
  label.textContent = layerName;
  chip.appendChild(label);

  if (layerMeta?.kind === "folder" && layerMeta.exists && layerMeta.entryCount > 0) {
    const count = document.createElement("span");
    count.className = "agent-storage-layer-count";
    count.textContent = String(layerMeta.entryCount);
    chip.appendChild(count);
  }

  return chip;
}

function appendAgentStorageSlotLayers(container, layers) {
  const wrap = document.createElement("div");
  wrap.className = "agent-storage-layers";
  const seen = new Set();

  for (const layerName of AGENT_STORAGE_LAYER_ORDER) {
    const meta = layers?.[layerName];
    if (!meta) continue;
    seen.add(layerName);
    wrap.appendChild(createAgentStorageLayerChip(layerName, meta));
  }

  for (const [layerName, meta] of Object.entries(layers || {})) {
    if (seen.has(layerName) || layerName === "__looseFiles") continue;
    wrap.appendChild(createAgentStorageLayerChip(layerName, meta));
  }

  container.appendChild(wrap);
}

function buildAgentStorageContainerSection(containerData) {
  const section = document.createElement("section");
  section.className = "agent-storage-container";

  const head = document.createElement("div");
  head.className = "agent-storage-container-head";
  const title = document.createElement("h3");
  title.className = "agent-storage-container-title";
  title.textContent = containerData.containerDir
    ? containerData.containerDir
    : getActiveAgentLabel() || "Корень workspace";
  const path = document.createElement("span");
  path.className = "agent-storage-container-path";
  path.textContent = containerData.storageRoot;
  head.append(title, path);
  section.appendChild(head);

  if (containerData.rootHasContent) {
    const note = document.createElement("p");
    note.className = "agent-storage-root-note";
    note.innerHTML = `В корне <code>${escapeHtml(containerData.storageRoot)}</code> есть файлы вне слотов — legacy/канон. Рекомендуется перенос в <code>${STORAGE_FOLDER_NAME}/&lt;ключ&gt;/</code>.`;
    section.appendChild(note);
  }

  const list = document.createElement("div");
  list.className = "agent-storage-slot-list";

  for (const slot of containerData.slots || []) {
    const row = document.createElement("article");
    row.className = "agent-storage-slot";

    const slotHead = document.createElement("div");
    slotHead.className = "agent-storage-slot-head";

    const kind = document.createElement("span");
    kind.className = `agent-storage-slot-kind${slot.kind === "area" ? " is-area" : ""}`;
    kind.textContent = slot.kind === "area" ? "Область" : "Тема";

    const slotTitle = document.createElement("h4");
    slotTitle.className = "agent-storage-slot-title";
    slotTitle.textContent = slot.label || slot.slotKey;

    const openBtn = document.createElement("button");
    openBtn.type = "button";
    openBtn.className = "agent-storage-slot-open";
    openBtn.textContent = "Открыть";
    openBtn.addEventListener("click", () => {
      if (slot.manifestPath) openNodeFromMenu(slot.label || slot.slotKey, slot.manifestPath);
    });

    slotHead.append(kind, slotTitle, openBtn);
    row.appendChild(slotHead);

    const slotPath = document.createElement("div");
    slotPath.className = "agent-storage-slot-path";
    slotPath.textContent = slot.slotDir;
    row.appendChild(slotPath);

    if (!slot.exists) {
      const missing = document.createElement("p");
      missing.className = "agent-storage-slot-missing";
      missing.textContent = "Слот ещё не создан на диске — слои появятся после первого сохранения.";
      row.appendChild(missing);
    }

    appendAgentStorageSlotLayers(row, slot.layers);
    list.appendChild(row);
  }

  section.appendChild(list);

  if (containerData.orphanSlots?.length) {
    const orphans = document.createElement("div");
    orphans.className = "agent-storage-orphans";
    orphans.innerHTML =
      "Слоты без манифеста: " +
      containerData.orphanSlots.map((name) => `<code>${escapeHtml(name)}</code>`).join(", ");
    section.appendChild(orphans);
  }

  return section;
}

async function renderAgentStorageView() {
  if (!agentStorageContentNode) return;

  const requestId = ++agentStorageLayoutRequestId;
  agentStorageContentNode.innerHTML = "";
  renderListEmptyMessage(agentStorageContentNode, `Загрузка раскладки ${STORAGE_FOLDER_NAME}…`);

  try {
    const layout = await fetchAgentStorageLayout();
    if (requestId !== agentStorageLayoutRequestId) return;

    agentStorageContentNode.innerHTML = "";

    if (agentStorageStatsNode) {
      const slotCount = (layout.containers || []).reduce(
        (sum, container) => sum + (container.slots?.length || 0),
        0
      );
      agentStorageStatsNode.innerHTML = `
        <span class="agent-storage-stat"><strong>${layout.manifestCount || 0}</strong> манифестов</span>
        <span class="agent-storage-stat"><strong>${layout.containers?.length || 0}</strong> контейнеров</span>
        <span class="agent-storage-stat"><strong>${slotCount}</strong> слотов</span>
      `;
    }

    if (!layout.containers?.length) {
      renderListEmptyMessage(agentStorageContentNode, `В workspace пока нет манифестов для раскладки ${STORAGE_FOLDER_NAME}`);
      return;
    }

    for (const container of layout.containers) {
      agentStorageContentNode.appendChild(buildAgentStorageContainerSection(container));
    }
  } catch {
    if (requestId !== agentStorageLayoutRequestId) return;
    agentStorageContentNode.innerHTML = "";
    renderListEmptyMessage(
      agentStorageContentNode,
      `Не удалось загрузить раскладку ${STORAGE_FOLDER_NAME}. Проверьте, что сервер запущен.`
    );
    if (agentStorageStatsNode) agentStorageStatsNode.innerHTML = "";
  }
}

async function renderAgentTableView() {
  if (!agentTableContentNode) return;

  if (agentTableSearchNode && agentTableSearchNode.value !== agentTableSearchQuery) {
    agentTableSearchNode.value = agentTableSearchQuery;
  }

  const requestId = ++agentTableRequestId;
  agentTableContentNode.innerHTML = "";
  renderListEmptyMessage(agentTableContentNode, "Загрузка таблицы…");

  try {
    const data = await fetchAgentWorkspaceTable();
    if (requestId !== agentTableRequestId) return;

    const query = agentTableSearchQuery.trim().toLowerCase();
    const allRows = Array.isArray(data.rows) ? data.rows : [];
    const filtered = allRows.filter((row) => agentTableRowMatchesQuery(row, query));
    const rows = sortAgentTableRows(filtered);

    if (agentTableStatsNode) {
      agentTableStatsNode.innerHTML = `
        <span class="agent-table-stat"><strong>${rows.length}</strong> / ${allRows.length}</span>
        <span class="agent-table-stat"><strong>${data.manifestCount || allRows.length}</strong> манифестов</span>
      `;
    }

    agentTableContentNode.innerHTML = "";
    if (!allRows.length) {
      renderListEmptyMessage(agentTableContentNode, "В workspace пока нет манифестов для таблицы");
      return;
    }
    if (!rows.length) {
      renderListEmptyMessage(agentTableContentNode, "Ничего не найдено. Измените поиск.");
      return;
    }

    const wrap = document.createElement("div");
    wrap.className = "agent-table-wrap";

    const table = document.createElement("table");
    table.className = "agent-table";
    table.setAttribute("aria-label", "Таблица манифестов workspace");

    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    const columns = [
      { key: "label", label: "Тема" },
      { key: "displayPath", label: "Путь" },
      { key: "kind", label: "Тип" },
      { key: "slotDir", label: `Слот ${STORAGE_FOLDER_NAME}` },
      { key: "layerPresent", label: "Слои" },
      { key: null, label: "Превью" },
      { key: null, label: "Категория" },
      { key: null, label: "Теги" },
      { key: "manifestUpdatedAt", label: "Манифест" }
    ];

    for (const col of columns) {
      const th = document.createElement("th");
      th.scope = "col";
      if (col.key && AGENT_TABLE_SORT_KEYS.has(col.key)) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "agent-table-sort";
        const active = agentTableSortKey === col.key;
        const arrow = active ? (agentTableSortDir === "desc" ? " ↓" : " ↑") : "";
        btn.textContent = `${col.label}${arrow}`;
        btn.addEventListener("click", () => {
          if (agentTableSortKey === col.key) {
            agentTableSortDir = agentTableSortDir === "asc" ? "desc" : "asc";
          } else {
            agentTableSortKey = col.key;
            agentTableSortDir = col.key === "manifestUpdatedAt" ? "desc" : "asc";
          }
          void renderAgentTableView();
        });
        th.appendChild(btn);
      } else {
        th.textContent = col.label;
      }
      headRow.appendChild(th);
    }
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    for (const row of rows) {
      const tr = document.createElement("tr");
      tr.className = "agent-table-row";
      tr.tabIndex = 0;
      tr.setAttribute("role", "button");
      tr.title = "Открыть тему";

      const openRow = () => openNodeFromMenu(row.label || getLabelFromPath(row.manifestPath), row.manifestPath);
      tr.addEventListener("click", openRow);
      tr.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openRow();
        }
      });

      const titleCell = document.createElement("td");
      titleCell.className = "agent-table-cell agent-table-cell--title";
      const titleInner = document.createElement("div");
      titleInner.className = "agent-table-title-inner";
      if (row.hasPreview && row.previewUrl) {
        const thumb = document.createElement("img");
        thumb.className = "agent-table-thumb";
        thumb.src = row.previewUrl;
        thumb.alt = "";
        thumb.loading = "lazy";
        titleInner.appendChild(thumb);
      } else {
        const placeholder = document.createElement("span");
        placeholder.className = "agent-table-thumb agent-table-thumb--empty";
        placeholder.textContent = row.kind === "area" ? "◎" : "◇";
        titleInner.appendChild(placeholder);
      }
      const titleText = document.createElement("span");
      titleText.className = "agent-table-label";
      if (row.color) titleText.style.color = row.color;
      titleText.textContent = row.label || getLabelFromPath(row.manifestPath);
      titleInner.appendChild(titleText);
      titleCell.appendChild(titleInner);
      tr.appendChild(titleCell);

      const pathCell = document.createElement("td");
      pathCell.className = "agent-table-cell agent-table-cell--path";
      pathCell.textContent = row.displayPath || "—";
      tr.appendChild(pathCell);

      const kindCell = document.createElement("td");
      kindCell.className = "agent-table-cell";
      const kindBadge = document.createElement("span");
      kindBadge.className = `agent-table-kind${row.kind === "area" ? " is-area" : ""}`;
      kindBadge.textContent = formatAgentTableKind(row.kind);
      kindCell.appendChild(kindBadge);
      tr.appendChild(kindCell);

      const slotCell = document.createElement("td");
      slotCell.className = "agent-table-cell agent-table-cell--mono";
      const slotCode = document.createElement("code");
      slotCode.textContent = row.slotDir || "—";
      if (!row.slotExists) slotCode.classList.add("is-missing");
      slotCell.appendChild(slotCode);
      tr.appendChild(slotCell);

      const layersCell = document.createElement("td");
      layersCell.className = "agent-table-cell agent-table-cell--num";
      layersCell.textContent = String(row.layerPresent ?? 0);
      tr.appendChild(layersCell);

      const previewCell = document.createElement("td");
      previewCell.className = "agent-table-cell";
      previewCell.textContent = row.hasPreview ? "Да" : "—";
      tr.appendChild(previewCell);

      const categoryCell = document.createElement("td");
      categoryCell.className = "agent-table-cell";
      categoryCell.textContent = row.category || "—";
      tr.appendChild(categoryCell);

      const tagsCell = document.createElement("td");
      tagsCell.className = "agent-table-cell agent-table-cell--tags";
      const tags = Array.isArray(row.tags) ? row.tags : [];
      if (tags.length) {
        for (const tag of tags.slice(0, 4)) {
          const chip = document.createElement("span");
          chip.className = "agent-table-tag";
          chip.textContent = tag;
          tagsCell.appendChild(chip);
        }
        if (tags.length > 4) {
          const more = document.createElement("span");
          more.className = "agent-table-tag agent-table-tag--more";
          more.textContent = `+${tags.length - 4}`;
          tagsCell.appendChild(more);
        }
      } else {
        tagsCell.textContent = "—";
      }
      tr.appendChild(tagsCell);

      const updatedCell = document.createElement("td");
      updatedCell.className = "agent-table-cell agent-table-cell--date";
      updatedCell.textContent = formatNodeMetaDateTime(row.manifestUpdatedAt);
      tr.appendChild(updatedCell);

      tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    wrap.appendChild(table);
    agentTableContentNode.appendChild(wrap);
  } catch {
    if (requestId !== agentTableRequestId) return;
    agentTableContentNode.innerHTML = "";
    renderListEmptyMessage(
      agentTableContentNode,
      "Не удалось загрузить таблицу. Проверьте, что сервер запущен."
    );
    if (agentTableStatsNode) agentTableStatsNode.innerHTML = "";
  }
}

async function renderAgentTimelineView() {
  if (!agentTimelineContentNode) return;

  const requestId = ++agentTimelineRequestId;
  agentTimelineContentNode.innerHTML = "";
  renderListEmptyMessage(agentTimelineContentNode, "Загрузка ленты…");

  try {
    const data = await fetchAgentTimeline();
    if (requestId !== agentTimelineRequestId) return;

    const events = Array.isArray(data.events) ? data.events : [];
    if (agentTimelineStatsNode) {
      const shown = events.length;
      const total = data.totalMatched ?? shown;
      agentTimelineStatsNode.innerHTML = `
        <span class="agent-timeline-stat"><strong>${shown}</strong> событий</span>
        <span class="agent-timeline-stat">всего <strong>${total}</strong></span>
      `;
    }

    agentTimelineContentNode.innerHTML = "";
    if (!events.length) {
      renderListEmptyMessage(
        agentTimelineContentNode,
        `Пока нет отслеживаемых изменений в манифестах и слотах ${STORAGE_FOLDER_NAME}`
      );
      return;
    }

    const list = document.createElement("div");
    list.className = "agent-timeline-list";

    for (const [dayKey, dayEvents] of groupTimelineEventsByDay(events)) {
      const section = document.createElement("section");
      section.className = "agent-timeline-day";

      const dayHead = document.createElement("h3");
      dayHead.className = "agent-timeline-day-title";
      dayHead.textContent = dayKey;
      section.appendChild(dayHead);

      const dayList = document.createElement("div");
      dayList.className = "agent-timeline-day-events";

      for (const event of dayEvents) {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "agent-timeline-item";

        const time = document.createElement("time");
        time.className = "agent-timeline-time";
        time.dateTime = event.updatedAt || "";
        time.textContent = formatNodeMetaDateTime(event.updatedAt);
        item.appendChild(time);

        const body = document.createElement("div");
        body.className = "agent-timeline-body";

        const top = document.createElement("div");
        top.className = "agent-timeline-top";
        const kindBadge = document.createElement("span");
        kindBadge.className = `agent-timeline-file-kind is-${event.fileKind || "other"}`;
        kindBadge.textContent = formatAgentTimelineFileKind(event.fileKind);
        top.appendChild(kindBadge);

        const fileLabel = document.createElement("span");
        fileLabel.className = "agent-timeline-file-label";
        fileLabel.textContent = event.fileLabel || "Файл";
        top.appendChild(fileLabel);
        body.appendChild(top);

        const title = document.createElement("span");
        title.className = "agent-timeline-node";
        title.textContent = event.displayPath || event.label || event.manifestPath;
        body.appendChild(title);

        const path = document.createElement("code");
        path.className = "agent-timeline-path";
        path.textContent = event.relPath || "";
        body.appendChild(path);

        item.appendChild(body);
        item.addEventListener("click", () => {
          openNodeFromMenu(event.label || getLabelFromPath(event.manifestPath), event.manifestPath);
        });

        dayList.appendChild(item);
      }

      section.appendChild(dayList);
      list.appendChild(section);
    }

    agentTimelineContentNode.appendChild(list);
  } catch {
    if (requestId !== agentTimelineRequestId) return;
    agentTimelineContentNode.innerHTML = "";
    renderListEmptyMessage(
      agentTimelineContentNode,
      "Не удалось загрузить ленту. Проверьте, что сервер запущен."
    );
    if (agentTimelineStatsNode) agentTimelineStatsNode.innerHTML = "";
  }
}

async function renderAgentTimelineAxisView() {
  if (!agentTimelineAxisContentNode) return;

  const requestId = ++agentTimelineAxisRequestId;
  agentTimelineAxisContentNode.innerHTML = "";
  renderListEmptyMessage(agentTimelineAxisContentNode, "Загрузка timeline…");

  try {
    const data = await fetchAgentTimeline();
    if (requestId !== agentTimelineAxisRequestId) return;

    const events = Array.isArray(data.events) ? data.events : [];
    if (agentTimelineAxisStatsNode) {
      const shown = events.length;
      const total = data.totalMatched ?? shown;
      agentTimelineAxisStatsNode.innerHTML = `
        <span class="agent-timeline-axis-stat"><strong>${shown}</strong> на оси</span>
        <span class="agent-timeline-axis-stat">всего <strong>${total}</strong></span>
      `;
    }

    agentTimelineAxisContentNode.innerHTML = "";
    if (!events.length) {
      renderListEmptyMessage(agentTimelineAxisContentNode, "Нет событий для оси времени");
      return;
    }

    const range = computeTimelineAxisRange(events);
    const board = document.createElement("div");
    board.className = "agent-timeline-axis-board";

    const ruler = document.createElement("div");
    ruler.className = "agent-timeline-axis-ruler";
    ruler.setAttribute("aria-hidden", "true");
    for (const tick of buildTimelineAxisTicks(range)) {
      const mark = document.createElement("span");
      mark.className = "agent-timeline-axis-tick";
      mark.style.left = `${tick.percent}%`;
      const label = document.createElement("span");
      label.className = "agent-timeline-axis-tick-label";
      label.textContent = tick.label;
      mark.appendChild(label);
      ruler.appendChild(mark);
    }
    board.appendChild(ruler);

    const trackWrap = document.createElement("div");
    trackWrap.className = "agent-timeline-axis-track-wrap";

    const spine = document.createElement("div");
    spine.className = "agent-timeline-axis-spine";
    spine.setAttribute("aria-hidden", "true");
    trackWrap.appendChild(spine);

    const markers = document.createElement("div");
    markers.className = "agent-timeline-axis-markers";

    const placed = assignTimelineAxisLanes(events, range);
    const laneCount = placed.reduce((max, item) => Math.max(max, item.lane + 1), 1);
    markers.style.minHeight = `${Math.max(120, laneCount * 52 + 24)}px`;

    for (const { event, pos, lane } of placed) {
      const marker = document.createElement("button");
      marker.type = "button";
      marker.className = "agent-timeline-axis-marker";
      marker.style.left = `${pos}%`;
      marker.style.top = `${12 + lane * 52}px`;
      marker.title = `${formatNodeMetaDateTime(event.updatedAt)} — ${event.displayPath || event.label}`;

      const dot = document.createElement("span");
      dot.className = `agent-timeline-axis-dot is-${event.fileKind || "other"}`;
      dot.setAttribute("aria-hidden", "true");
      marker.appendChild(dot);

      const card = document.createElement("span");
      card.className = "agent-timeline-axis-card";
      const kind = document.createElement("span");
      kind.className = `agent-timeline-axis-kind is-${event.fileKind || "other"}`;
      kind.textContent = formatAgentTimelineFileKind(event.fileKind);
      card.appendChild(kind);
      const title = document.createElement("span");
      title.className = "agent-timeline-axis-title";
      title.textContent = event.displayPath || event.label || "—";
      card.appendChild(title);
      const when = document.createElement("time");
      when.className = "agent-timeline-axis-when";
      when.dateTime = event.updatedAt || "";
      when.textContent = formatNodeMetaDateTime(event.updatedAt);
      card.appendChild(when);
      marker.appendChild(card);

      marker.addEventListener("click", () => {
        openNodeFromMenu(event.label || getLabelFromPath(event.manifestPath), event.manifestPath);
      });
      markers.appendChild(marker);
    }

    trackWrap.appendChild(markers);
    board.appendChild(trackWrap);

    const hint = document.createElement("p");
    hint.className = "agent-timeline-axis-hint";
    hint.textContent =
      "Слева — раньше, справа — позже. Прокрутите по горизонтали. Клик по маркеру — открыть тему.";
    board.appendChild(hint);

    agentTimelineAxisContentNode.appendChild(board);
  } catch {
    if (requestId !== agentTimelineAxisRequestId) return;
    agentTimelineAxisContentNode.innerHTML = "";
    renderListEmptyMessage(
      agentTimelineAxisContentNode,
      "Не удалось загрузить timeline. Проверьте, что сервер запущен."
    );
    if (agentTimelineAxisStatsNode) agentTimelineAxisStatsNode.innerHTML = "";
  }
}

async function renderAgentTimelineVerticalView() {
  if (!agentTimelineVerticalContentNode) return;

  const requestId = ++agentTimelineVerticalRequestId;
  agentTimelineVerticalContentNode.innerHTML = "";
  renderListEmptyMessage(agentTimelineVerticalContentNode, "Загрузка timeline…");

  try {
    const data = await fetchAgentTimeline();
    if (requestId !== agentTimelineVerticalRequestId) return;

    const events = Array.isArray(data.events) ? data.events : [];
    if (agentTimelineVerticalStatsNode) {
      const shown = events.length;
      const total = data.totalMatched ?? shown;
      agentTimelineVerticalStatsNode.innerHTML = `
        <span class="agent-timeline-v-stat"><strong>${shown}</strong> событий</span>
        <span class="agent-timeline-v-stat">всего <strong>${total}</strong></span>
      `;
    }

    agentTimelineVerticalContentNode.innerHTML = "";
    if (!events.length) {
      renderListEmptyMessage(agentTimelineVerticalContentNode, "Нет событий для вертикальной оси");
      return;
    }

    const sorted = sortTimelineEventsChronological(events);
    const board = document.createElement("div");
    board.className = "agent-timeline-v-board";

    const track = document.createElement("div");
    track.className = "agent-timeline-v-track";
    track.setAttribute("role", "list");

    const spine = document.createElement("div");
    spine.className = "agent-timeline-v-spine";
    spine.setAttribute("aria-hidden", "true");
    track.appendChild(spine);

    const list = document.createElement("div");
    list.className = "agent-timeline-v-list";

    let lastDayKey = "";
    for (const event of sorted) {
      const dayKey = getTimelineDayKey(event.updatedAt);
      if (dayKey !== lastDayKey) {
        lastDayKey = dayKey;
        const dayHead = document.createElement("h3");
        dayHead.className = "agent-timeline-v-day";
        dayHead.textContent = dayKey;
        list.appendChild(dayHead);
      }
      list.appendChild(createTimelineVerticalRow(event));
    }

    track.appendChild(list);
    board.appendChild(track);

    const hint = document.createElement("p");
    hint.className = "agent-timeline-v-hint";
    hint.textContent = "↑ раньше · ↓ позже — прокрутите вниз. Клик по карточке открывает тему.";
    board.appendChild(hint);

    agentTimelineVerticalContentNode.appendChild(board);
  } catch {
    if (requestId !== agentTimelineVerticalRequestId) return;
    agentTimelineVerticalContentNode.innerHTML = "";
    renderListEmptyMessage(
      agentTimelineVerticalContentNode,
      "Не удалось загрузить timeline. Проверьте, что сервер запущен."
    );
    if (agentTimelineVerticalStatsNode) agentTimelineVerticalStatsNode.innerHTML = "";
  }
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
      controlsHost: agentGraphControlsNode,
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
  appHomeLink?.classList.toggle("active", appRootNode.classList.contains("app-landing-view"));
}

function hideAllAgentCanvasPanes() {
  homePaneNode?.classList.add("hidden");
  home2PaneNode?.classList.add("hidden");
  agentMapPaneNode?.classList.add("hidden");
  agentMap2PaneNode?.classList.add("hidden");
  agentMap3PaneNode?.classList.add("hidden");
  agentSchemaPaneNode?.classList.add("hidden");
  agentVaultPaneNode?.classList.add("hidden");
  agentGraphPaneNode?.classList.add("hidden");
  agentTablePaneNode?.classList.add("hidden");
  agentStoragePaneNode?.classList.add("hidden");
  agentTimelinePaneNode?.classList.add("hidden");
  agentTimelineAxisPaneNode?.classList.add("hidden");
  agentTimelineVerticalPaneNode?.classList.add("hidden");
}

function hideAppLandingView() {
  appRootNode?.classList.remove("app-landing-view");
  appLandingPaneNode?.classList.add("hidden");
  setAppLandingHint("");
}

function showAppLandingView(hint = "") {
  hideContentLoading({ force: true });
  nodeSettingsViewActive = false;
  nodeMemoryViewActive = false;
  applyNodeWorkspaceViewUi();
  activePath = null;
  activeLabel = null;
  activeSystemFile = null;
  activeExternalFilePath = null;
  clearMediaSidecarEditor();
  activeAgentId = null;
  appRootNode.classList.add("app-landing-view");
  appRootNode.classList.remove("home-view", "system-file-view");
  hideContentSearchResults();
  if (contentSearchInputNode) contentSearchInputNode.value = "";
  clearSystemFileViewUi();
  hideAllAgentCanvasPanes();
  appLandingPaneNode?.classList.remove("hidden");
  titleInputNode.value = "";
  fileContentInputNode.value = "";
  setPropsYamlContent("");
  fileContentInputNode.readOnly = false;
  closeAgentsPickerPopover();
  renderAgentSelect();
  renderAppLandingAgents();
  renderLandingSearchAgents();
  syncLandingAgentsViewUi();
  updateLandingSearchPlaceholder();
  showMenuNoAgentPlaceholder();
  syncAgentPreview();
  setAppLandingHint(hint, { alert: Boolean(hint) });
  updateActiveButton();
  syncAppHomeButton();
  updateBreadcrumbsForActiveMode();
  updateWorkspaceShareLinkButton();
  syncAppRouteToUrl({ replace: true });
}

function showAgentHomeView(hint = AGENT_HOME_HINT_DEFAULT) {
  if (!activeAgentId) {
    showAppLandingView(hint !== AGENT_HOME_HINT_DEFAULT ? hint : "");
    return;
  }

  hideAppLandingView();
  hideContentLoading({ force: true });
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
  syncAppRouteToUrl({ replace: true });
}

function showHomeView(hint = AGENT_HOME_HINT_DEFAULT) {
  if (!activeAgentId) {
    showAppLandingView(hint !== AGENT_HOME_HINT_DEFAULT ? hint : "");
    return;
  }
  showAgentHomeView(hint);
}

function hideHomeView() {
  hideAppLandingView();
  appRootNode.classList.remove("home-view");
  hideAllAgentCanvasPanes();
  syncAppHomeButton();
}

function clearEditorState(message = "") {
  showHomeView(message || AGENT_HOME_HINT_DEFAULT);
  modeContentCache.description = "";
  modeContentCache.internal = "";
  modeContentCache.external = "";
  modeContentCache.inbox = "";
  modeContentCache.references = "";
  modeContentCache.artefacts = "";
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

function canIncrementalMenuPatch() {
  return menuViewMode === "tree" && !menuSearchQuery.trim();
}

function getMenuTreeHost(agentId = activeAgentId) {
  return menuAgentPanes.get(agentId) || menuNode;
}

function findMenuSectionByFolderPath(folderPath, agentId = activeAgentId) {
  const target = normalizeMenuPatchFolderPath(folderPath, agentId);
  const host = getMenuTreeHost(agentId);
  if (!host) return null;
  for (const section of host.querySelectorAll(".menu-section[data-menu-folder]")) {
    if (normalizeFolderPath(section.dataset.menuFolder || ".") === target) {
      return section;
    }
  }
  return null;
}

function findMenuTreeNodeByFolderPath(node, folderPath, parentSectionPath = ".", depth = 0) {
  if (!node) return null;
  const sectionFolderPath = resolveSectionFolderPath(node, parentSectionPath, depth);
  const target = normalizeFolderPath(folderPath || ".");
  const current = normalizeFolderPath(sectionFolderPath || ".");
  if (current === target) {
    return { node, depth, parentSectionPath, sectionFolderPath: current };
  }
  for (const child of node.sections || []) {
    const hit = findMenuTreeNodeByFolderPath(child, folderPath, current, depth + 1);
    if (hit) return hit;
  }
  return null;
}

function getMenuParentNodeForFolder(menu, folderPath, agentId = activeAgentId) {
  const normalized = normalizeMenuPatchFolderPath(folderPath || ".", agentId);
  if (normalized === ".") return null;
  const segments = normalized.split("/").filter(Boolean);
  const parentPath = segments.length <= 1 ? "." : segments.slice(0, -1).join("/");
  const parentBranch = getMenuBranchForFolder(menu, parentPath, agentId);
  return parentBranch?.node ?? null;
}

function getMenuBranchForFolder(menu, folderPath, agentId = activeAgentId) {
  const agentTitle = getAgentTreeTitle(agentId);
  const baseTree = { title: agentTitle, ...menu };
  const queryLower = menuSearchQuery.trim().toLowerCase();
  const normalized = normalizeMenuPatchFolderPath(folderPath || ".", agentId);

  if (normalized === ".") {
    const filtered = filterMenuTree(baseTree, queryLower, agentId);
    return {
      node: filtered || baseTree,
      depth: 0,
      parentSectionPath: ".",
      sectionFolderPath: "."
    };
  }

  const hit = findMenuTreeNodeByFolderPath(baseTree, normalized, ".", 0);
  if (!hit) return null;
  const filtered = filterMenuTree(hit.node, queryLower, agentId);
  if (!filtered) return null;
  return { ...hit, node: filtered };
}

function expandMenuFolderPathsForCreate(parentFolder, createdPath, type, agentId = activeAgentId) {
  const collapsed = getAgentCollapsedFolders(agentId);
  let changed = false;
  const expandPath = (folderPath) => {
    const normalized = normalizeFolderPath(folderPath || ".");
    if (!normalized || normalized === ".") return;
    const parts = normalized.split("/").filter(Boolean);
    let acc = "";
    for (const part of parts) {
      acc = acc ? `${acc}/${part}` : part;
      if (collapsed.delete(acc)) changed = true;
    }
  };

  expandPath(parentFolder);
  if (type === "manifest") {
    expandPath(getFolderPathFromManifest(normalizeMenuNodePath(createdPath)));
  }
  if (changed) saveCollapsedFoldersByAgent();
}

function normalizeMenuPatchFolderPath(folderPath, agentId = activeAgentId) {
  const stripped = stripVaultPrefixFromRelPath(String(folderPath || "").replace(/\\/g, "/").trim());
  return normalizeFolderPath(stripped || ".");
}

function getCreateParentFolderForPatch(createdPath, type, agentId = activeAgentId) {
  if (type === "catalog" || type === "service-doc") {
    return getActiveAgentSystemFolder(agentId) || ".";
  }
  const manifestFolder = getFolderPathFromManifest(normalizeMenuNodePath(createdPath)) || ".";
  let parentFolder = ".";
  if (type === "manifest") {
    parentFolder = manifestFolder;
  } else if (type === "folder") {
    const parts = manifestFolder.split("/").filter(Boolean);
    parts.pop();
    parentFolder = parts.length ? parts.join("/") : ".";
  } else {
    parentFolder = manifestFolder;
  }
  return normalizeMenuPatchFolderPath(parentFolder, agentId);
}

function syncMenuCachesAfterFetch(menu, agentId = activeAgentId) {
  menuCacheByAgent.set(agentId, menu);
  if (agentId === activeAgentId) {
    currentMenuData = menu;
    sanitizeCollapsedFolderPaths(agentId);
    const baseTree = { title: getAgentTreeTitle(agentId), ...menu };
    const allPaths = new Set(
      collectFlatMenuEntries(baseTree).map((entry) => nodeStorageKey(agentId, entry.path))
    );
    pruneBookmarks(allPaths);
    pruneNodeConfigCache(allPaths);
    applyMenuCardsFilterUi();
  }
}

function syncFolderToggleUi(sectionEl, isCollapsed, hasContent) {
  const toggleBtn = sectionEl.querySelector(
    ":scope > .menu-folder-row .folder-toggle-btn, :scope > .menu-section-row .folder-toggle-btn"
  );
  if (toggleBtn) {
    toggleBtn.textContent = hasContent ? (isCollapsed ? "▸" : "▾") : "▸";
    toggleBtn.disabled = !hasContent;
    toggleBtn.title = hasContent ? (isCollapsed ? "Раскрыть" : "Скрыть") : "Нет вложенных элементов";
  }
  const titleNode = sectionEl.querySelector(":scope > .menu-section-row .menu-section-title");
  if (titleNode && hasContent) {
    titleNode.title = isCollapsed ? "Раскрыть" : "Скрыть";
  }
}

function refreshRootMenuTreeExtras(agentId = activeAgentId, menu = menuCacheByAgent.get(agentId)) {
  const childrenContainer = getWorkspacesTreeChildren(agentId);
  if (!childrenContainer) return;
  if (menu?.serviceTree && shouldShowServiceSectionInMenu(agentId)) {
    renderServiceSection(menu.serviceTree, childrenContainer, agentId);
  } else {
    clearMenuServiceSection(childrenContainer);
  }
  renderSystemFiles(systemFilesCache);
}

function patchFolderCollapsedState(folderPath, agentId = activeAgentId) {
  if (!canIncrementalMenuPatch()) return false;
  const menu = menuCacheByAgent.get(agentId);
  if (!menu) return false;

  try {
    const branch = getMenuBranchForFolder(menu, folderPath, agentId);
    if (!branch?.node) return false;

    const normalized = normalizeMenuPatchFolderPath(folderPath, agentId);
    const sectionEl =
      normalized === "."
        ? getMenuTreeHost(agentId)?.querySelector(":scope > .menu-section")
        : findMenuSectionByFolderPath(normalized, agentId);
    if (!sectionEl) return false;

    const isCollapsed = isFolderCollapsed(normalized, agentId);
    const visibleChildren = getVisibleMenuChildren(
      branch.node,
      agentId,
      branch.parentSectionPath,
      branch.depth
    );
    const hasContent = visibleChildren.length > 0;

    syncFolderToggleUi(sectionEl, isCollapsed, hasContent);
    sectionEl.querySelector(":scope > .tree-children")?.remove();

    if (!isCollapsed && visibleChildren.length > 0) {
      const wrapper = document.createElement("div");
      const parentMenuNode =
        normalized === "." ? null : getMenuParentNodeForFolder(menu, normalized, agentId);
      renderTree(branch.node, wrapper, branch.depth, branch.parentSectionPath, parentMenuNode, agentId);
      const newChildren = wrapper.firstElementChild?.querySelector(":scope > .tree-children");
      if (newChildren) {
        sectionEl.appendChild(newChildren);
      }
    }

    if (normalized === ".") {
      refreshRootMenuTreeExtras(agentId, menu);
    }

    refreshMenuSortDecorations(agentId);
    return true;
  } catch (error) {
    console.warn("patchFolderCollapsedState failed", folderPath, error);
    return false;
  }
}

function refreshAllFolderCollapsedPatches(agentId = activeAgentId) {
  if (!canIncrementalMenuPatch()) return false;
  const menu = menuCacheByAgent.get(agentId);
  if (!menu) return false;

  try {
    const paths = new Set([".", ...getMenuTreeFolderPaths(agentId)]);
    for (const folderPath of paths) {
      if (!patchFolderCollapsedState(folderPath, agentId)) {
        return false;
      }
    }
    refreshRootMenuTreeExtras(agentId, menu);
    return true;
  } catch (error) {
    console.warn("refreshAllFolderCollapsedPatches failed", error);
    return false;
  }
}

function findCreatedMenuChild(branch, createdPath, agentId = activeAgentId) {
  if (!branch?.node) return null;
  const createdNorm = normalizeMenuNodePath(createdPath);
  const visibleChildren = getVisibleMenuChildren(
    branch.node,
    agentId,
    branch.parentSectionPath,
    branch.depth
  );
  for (const child of visibleChildren) {
    if (child.kind === "item") {
      if (normalizeMenuNodePath(child.entry.path) === createdNorm) return child;
      continue;
    }
    if (child.kind === "folder") {
      const indexPath = child.entry.indexPath
        ? normalizeMenuNodePath(child.entry.indexPath)
        : null;
      if (indexPath && indexPath === createdNorm) return child;
    }
  }
  return null;
}

function menuTreeChildAlreadyRendered(child, parentFolder, agentId = activeAgentId) {
  if (child.kind === "folder") {
    const folderPath = normalizeFolderPath(
      child.entry.folderPath || getFolderPathFromManifest(child.entry.indexPath) || parentFolder
    );
    return Boolean(findMenuSectionByFolderPath(folderPath, agentId));
  }
  const itemPath = normalizeMenuNodePath(child.entry.path);
  const host = getMenuTreeHost(agentId);
  return Boolean(host?.querySelector(`.menu-item[data-path="${CSS.escape(itemPath)}"]`));
}

function menuSortChildrenEqual(a, b) {
  if (!a || !b || a.kind !== b.kind) return false;
  if (a.kind === "item") {
    return normalizeMenuNodePath(a.entry?.path) === normalizeMenuNodePath(b.entry?.path);
  }
  const aPath = normalizeFolderPath(
    a.entry?.folderPath || getFolderPathFromManifest(a.entry?.indexPath) || "."
  );
  const bPath = normalizeFolderPath(
    b.entry?.folderPath || getFolderPathFromManifest(b.entry?.indexPath) || "."
  );
  return aPath === bPath;
}

function getMenuTreeSortableChildren(container) {
  return Array.from(container?.children || []).filter((el) => {
    if (el.classList.contains("menu-service-section")) return false;
    if (el.classList.contains("system-file-row")) return false;
    return el.classList.contains("menu-section") || el.classList.contains("menu-item-row");
  });
}

function getMenuTreeInsertAnchor(container) {
  return container?.querySelector(":scope > .menu-item-row.system-file-row") || null;
}

function findDomNodeForMenuChild(container, child, agentId = activeAgentId) {
  if (!container || !child) return null;
  if (child.kind === "folder") {
    const folderPath = normalizeFolderPath(
      child.entry?.folderPath || getFolderPathFromManifest(child.entry?.indexPath) || "."
    );
    if (folderPath === ".") return null;
    return container.querySelector(
      `:scope > .menu-section[data-menu-folder="${CSS.escape(folderPath)}"]`
    );
  }
  const itemPath = normalizeMenuNodePath(child.entry?.path);
  const itemBtn = container.querySelector(
    `:scope > .menu-item-row .menu-item[data-path="${CSS.escape(itemPath)}"]`
  );
  return itemBtn?.closest(".menu-item-row") || null;
}

function resolveMenuTreeInsertBefore(container, branch, createdChild, agentId = activeAgentId) {
  const visibleChildren = getVisibleMenuChildren(
    branch.node,
    agentId,
    branch.parentSectionPath,
    branch.depth
  );
  const targetIndex = visibleChildren.findIndex((child) => menuSortChildrenEqual(child, createdChild));
  if (targetIndex < 0) return getMenuTreeInsertAnchor(container);

  const nextChild = visibleChildren[targetIndex + 1];
  if (!nextChild) return getMenuTreeInsertAnchor(container);

  return findDomNodeForMenuChild(container, nextChild, agentId) || getMenuTreeInsertAnchor(container);
}

function insertMenuTreeRenderedChild(container, element, insertBefore) {
  if (!container || !element) return;
  const anchor =
    insertBefore && insertBefore.parentElement === container
      ? insertBefore
      : getMenuTreeInsertAnchor(container);
  if (anchor) container.insertBefore(element, anchor);
  else container.appendChild(element);
}

function renderMenuTreeChildInto(
  child,
  parentEl,
  depth,
  parentSectionPath,
  parentMenuNode,
  agentId = activeAgentId,
  insertBefore = null
) {
  if (child.kind === "folder") {
    const wrapper = document.createElement("div");
    renderTree(child.entry, wrapper, depth, parentSectionPath, parentMenuNode, agentId);
    const section = wrapper.firstElementChild;
    if (parentEl.classList.contains("tree-children")) {
      prepareMenuSectionForSortContainer(section, child.entry);
    }
    insertMenuTreeRenderedChild(parentEl, section, insertBefore);
    return section;
  }
  const item = child.entry;
  const itemRow = document.createElement("div");
  itemRow.className = "menu-item-row";
  itemRow.dataset.sortName = item.label;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "menu-item";
  btn.textContent = formatMenuTreeItemLabel(item, parentMenuNode, agentId);
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
  insertMenuTreeRenderedChild(parentEl, itemRow, insertBefore);
  return itemRow;
}

function patchMenuTreeInsertCreatedChild({
  parentFolder,
  createdPath,
  type,
  agentId = activeAgentId
}) {
  if (!canIncrementalMenuPatch()) return false;
  if (type === "manifest" || type === "catalog" || type === "service-doc") return false;

  const menu = menuCacheByAgent.get(agentId);
  if (!menu) return false;

  try {
    const normalized = normalizeMenuPatchFolderPath(parentFolder, agentId);
    const branch = getMenuBranchForFolder(menu, normalized, agentId);
    if (!branch?.node) return false;

    const createdChild = findCreatedMenuChild(branch, createdPath, agentId);
    if (!createdChild) return false;
    if (menuTreeChildAlreadyRendered(createdChild, normalized, agentId)) {
      refreshMenuSortDecorations(agentId);
      return true;
    }

    const parentSection =
      normalized === "."
        ? getMenuTreeHost(agentId)?.querySelector(":scope > .menu-section")
        : findMenuSectionByFolderPath(normalized, agentId);
    if (!parentSection) return false;

    const visibleChildren = getVisibleMenuChildren(
      branch.node,
      agentId,
      branch.parentSectionPath,
      branch.depth
    );
    const isCollapsed = isFolderCollapsed(normalized, agentId);
    let childrenNode = parentSection.querySelector(":scope > .tree-children");
    if (!childrenNode) {
      if (isCollapsed || visibleChildren.length === 0) return false;
      childrenNode = document.createElement("div");
      childrenNode.className = "tree-children";
      childrenNode.dataset.sortFolder = normalized || ".";
      parentSection.appendChild(childrenNode);
      syncFolderToggleUi(parentSection, isCollapsed, true);
    }

    const insertBefore = resolveMenuTreeInsertBefore(childrenNode, branch, createdChild, agentId);
    renderMenuTreeChildInto(
      createdChild,
      childrenNode,
      branch.depth + 1,
      normalized,
      branch.node,
      agentId,
      insertBefore
    );
    refreshMenuSortDecorations(agentId);
    return true;
  } catch (error) {
    console.warn("patchMenuTreeInsertCreatedChild failed", parentFolder, error);
    return false;
  }
}

function patchMenuTreeAtFolder(folderPath, agentId = activeAgentId) {
  if (!canIncrementalMenuPatch()) return false;
  const menu = menuCacheByAgent.get(agentId);
  if (!menu) return false;

  try {
    const branch = getMenuBranchForFolder(menu, folderPath, agentId);
    if (!branch?.node) return false;

    const host = getMenuTreeHost(agentId);
    if (!host) return false;

    const normalized = normalizeMenuPatchFolderPath(folderPath, agentId);
    const parentMenuNode =
      normalized === "." ? null : getMenuParentNodeForFolder(menu, normalized, agentId);
    const wrapper = document.createElement("div");

    if (normalized === ".") {
      const oldSection = host.querySelector(":scope > .menu-section");
      if (!oldSection) return false;
      renderTree(branch.node, wrapper, 0, ".", null, agentId);
      const newSection = wrapper.firstElementChild;
      if (!newSection) return false;
      oldSection.replaceWith(newSection);
      refreshRootMenuTreeExtras(agentId, menu);
      refreshMenuSortDecorations(agentId);
      return true;
    }

    const oldSection = findMenuSectionByFolderPath(normalized, agentId);
    if (!oldSection || !oldSection.parentElement) return false;

    renderTree(branch.node, wrapper, branch.depth, branch.parentSectionPath, parentMenuNode, agentId);
    const newSection = wrapper.firstElementChild;
    if (!newSection) return false;
    if (oldSection.parentElement?.classList.contains("tree-children")) {
      prepareMenuSectionForSortContainer(newSection, branch.node);
    }
    oldSection.replaceWith(newSection);
    refreshMenuSortDecorations(agentId);
    return true;
  } catch (error) {
    console.warn("patchMenuTreeAtFolder failed", folderPath, error);
    return false;
  }
}

function patchServiceMenuAfterCreate(agentId = activeAgentId) {
  if (!canIncrementalMenuPatch()) return false;
  const menu = menuCacheByAgent.get(agentId);
  if (!menu?.serviceTree) return false;
  const childrenContainer = getWorkspacesTreeChildren(agentId);
  if (!childrenContainer) return false;
  if (!shouldShowServiceSectionInMenu(agentId)) {
    clearMenuServiceSection(childrenContainer);
    return true;
  }
  renderServiceSection(menu.serviceTree, childrenContainer, agentId);
  return true;
}

function withPreservedMenuScroll(run) {
  const scrollTop = menuNode?.scrollTop ?? 0;
  const result = run();
  if (menuNode) menuNode.scrollTop = scrollTop;
  return result;
}

async function fetchMenuData(agentId = activeAgentId) {
  const response = await fetch(buildApiUrl("/api/menu", {}, agentId));
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.details || errorData.error || `Request failed with ${response.status}`);
  }
  const menu = await response.json();
  syncMenuCachesAfterFetch(menu, agentId);
  return menu;
}

async function applyMenuUpdateAfterCreate({ createdPath, type, agentId = activeAgentId }) {
  await fetchMenuData(agentId);

  let patched = false;
  try {
    if (canIncrementalMenuPatch()) {
      withPreservedMenuScroll(() => {
        if (type === "catalog" || type === "service-doc") {
          patched = patchServiceMenuAfterCreate(agentId);
        } else {
          const parentFolder = getCreateParentFolderForPatch(createdPath, type, agentId);
          expandMenuFolderPathsForCreate(parentFolder, createdPath, type, agentId);
          patched = patchMenuTreeInsertCreatedChild({ parentFolder, createdPath, type, agentId });
          if (!patched) {
            patched = patchMenuTreeAtFolder(parentFolder, agentId);
          }
          if (patched && type === "manifest") {
            const adoptFolder = normalizeMenuPatchFolderPath(
              getFolderPathFromManifest(normalizeMenuNodePath(createdPath)),
              agentId
            );
            if (adoptFolder && adoptFolder !== parentFolder) {
              patchMenuTreeAtFolder(adoptFolder, agentId);
            }
          }
        }
      });
    }
  } catch (error) {
    console.warn("applyMenuUpdateAfterCreate patch failed", error);
    patched = false;
  }

  if (!patched) {
    withPreservedMenuScroll(() =>
      renderMenu(menuCacheByAgent.get(agentId), agentId, { menuOnly: true })
    );
  } else if (agentId === activeAgentId) {
    refreshMenuSortDecorations(agentId);
    updateActiveButton();
    syncMenuCollapseAllButton();
    syncMenuPinBranchUi(agentId);
    if (isAgentWorkspaceCanvasVisible()) {
      applyAgentWorkspaceCanvasUi();
    }
  }

  if (
    createModalAgentId === agentId &&
    createNodeModalNode &&
    !createNodeModalNode.classList.contains("hidden")
  ) {
    syncCreateNodeServicePresetsUi();
  }
}

async function refreshMenu(options = {}) {
  const agentId = options.agentId || activeAgentId;
  if (!agentId) return null;
  const menu = await fetchMenuData(agentId);
  renderMenu(menu, agentId);
  if (agentId === activeAgentId) {
    updateActiveButton();
    if (isAgentWorkspaceCanvasVisible()) {
      applyAgentWorkspaceCanvasUi();
    }
  }
  if (
    createModalAgentId === agentId &&
    createNodeModalNode &&
    !createNodeModalNode.classList.contains("hidden")
  ) {
    syncCreateNodeServicePresetsUi();
  }
  return menu;
}

async function refreshMenuTree() {
  if (menuRefreshInFlight) return;
  if (!activeAgentId) {
    showToast("Агент не выбран", "error");
    return;
  }

  menuRefreshInFlight = true;
  menuRefreshBtn?.classList.add("is-spinning");
  syncMenuRefreshButtonState();

  try {
    invalidateMenuAgentCache(activeAgentId);
    await loadSystemFiles();
    await refreshMenu({ agentId: activeAgentId });
    syncMenuCollapseAllButton();
    syncMenuPinBranchUi(activeAgentId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showToast(`Ошибка обновления дерева: ${message}`, "error");
  } finally {
    menuRefreshInFlight = false;
    menuRefreshBtn?.classList.remove("is-spinning");
    syncMenuRefreshButtonState();
  }
}

async function refreshMenuAndSelect() {
  const menu = await refreshMenu();
  const first = findFirstNode(menu);
  if (first) {
    await openNodeFromMenu(first.label, first.path);
  } else {
    clearEditorState(`В ${getAgentTreeTitle()} нет markdown-манифестов`);
  }
}

async function createNode(type, options = {}) {
  const agentId = getCreateModalAgentId();
  if (!agentId || agentId !== activeAgentId) {
    showToast("Агент изменился — откройте «Создать» снова", "error");
    closeCreateNodeModal();
    return;
  }

  if (createModalEmptyFolder && type === "folder") {
    type = "manifest";
  }

  const name = createNameInputNode?.value?.trim() ?? "";
  const folderLabel = formatCreateParentLabel(createModalBaseParentPath);
  if (!name && type !== "manifest" && type !== "catalog" && type !== "service-doc") {
    showToast("Введите название папки", "error");
    return;
  }

  try {
    const payload = {
      parentPath: createTargetParentPath,
      type,
      name: type === "manifest" ? folderLabel : name || folderLabel
    };
    if (type === "catalog" || type === "service-doc") {
      payload.preset = options.preset || name;
      payload.parentPath = getActiveAgentSystemFolder(agentId) || createTargetParentPath;
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
    await applyMenuUpdateAfterCreate({ createdPath: data.createdPath, type, agentId });
    const createdLabel =
      type === "catalog"
        ? `Справочник «${SERVICE_CATALOG_PRESET_LABELS[data.preset] || data.preset || "catalog"}» создан`
        : type === "service-doc"
          ? `«${SERVICE_DOC_PRESET_LABELS[data.preset] || data.preset}» создан (${SERVICE_DOC_PRESET_FILES[data.preset] || ""}.md)`
          : type === "manifest"
          ? "Область создана (README.x.md)"
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
    return "В этой папке уже есть README.x.md";
  }
  if (/Failed to create node/i.test(text) && /ENOENT/i.test(text)) {
    return `Папка ${AGENT_SYSTEM_FOLDER_DEFAULT} ещё не создана — обновите меню (F5) и повторите`;
  }
  if (/Catalog node already exists/i.test(text)) {
    return "Такой справочник уже существует";
  }
  if (/Service doc already exists/i.test(text)) {
    return "Этот служебный файл уже создан";
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
      clearEditorState(`В ${getAgentTreeTitle()} нет markdown-манифестов`);
    }
    showToast("Удалено", "success");
  } catch (error) {
    showToast(`Ошибка удаления: ${error.message}`, "error");
  }
}

async function init() {
  if (window.agentAppLock?.whenUnlocked) {
    await window.agentAppLock.whenUnlocked();
  }

  const splashStartedAt = Date.now();
  const finishSplash = () => {
    const elapsed = Date.now() - splashStartedAt;
    const wait = Math.max(0, APP_SPLASH_MIN_MS - elapsed);
    window.setTimeout(hideAppSplash, wait);
  };
  const splashFailsafe = window.setTimeout(() => {
    finishSplash();
    if (document.body.classList.contains("app-booting")) {
      showAppLandingView("Загрузка заняла слишком много времени. Проверьте сервер и обновите страницу.");
      setMenuLoading(false);
    }
  }, 20000);

  try {
    if (location.hash === "#graph") {
      history.replaceState(null, "", `${location.pathname}${location.search}`);
    }
    await loadAgents();
    applyMenuTreeSettingsUi();
    applyAgentGraphSettingsUi();
    finishSplash();

    const bootRoute = parseAppRoute(location.pathname);
    if (bootRoute.type !== "root" && bootRoute.type !== "legacy" && activeAgentId) {
      setMenuLoading(true, "Загрузка дерева…");
      await loadSystemFiles();
      await refreshMenu();
    }

    suspendAppRouteSync();
    try {
      await applyAppRouteFromUrl();
    } finally {
      resumeAppRouteSync();
    }

    syncAppRouteToUrl({ replace: true });
  } catch (error) {
    finishSplash();
    showAppLandingView(`Ошибка загрузки: ${error.message}`);
  } finally {
    window.clearTimeout(splashFailsafe);
    setMenuLoading(false);
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
  if (!nextAgentId) {
    showAppLandingView();
    return;
  }
  if (nextAgentId === activeAgentId) return;
  switchActiveAgent(nextAgentId).catch((error) => {
    showAgentHomeView(`Ошибка переключения агента: ${error.message}`);
    renderAgentSelect();
  });
});

agentsManageBtn?.addEventListener("click", () => {
  closeAgentsPickerPopover();
  openAgentsRegistryModal();
});
agentsPickerBtn?.addEventListener("click", () => openAgentsPickerPopover());
agentsPickerPopoverCloseBtn?.addEventListener("click", closeAgentsPickerPopover);
document.addEventListener("click", (event) => {
  if (!agentsPickerIsOpen || !agentsPickerPopoverNode) return;
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (agentsPickerPopoverNode.contains(target) || target.closest("#agents-picker-btn")) {
    return;
  }
  closeAgentsPickerPopover();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeAgentsPickerPopover();
});
window.addEventListener(
  "resize",
  () => {
    if (agentsPickerIsOpen) positionAgentsPickerPopover();
  },
  { passive: true }
);

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

function getSelectedDocVersion(selectNode, fallback = DEFAULT_DOC_VERSION) {
  const value = String(selectNode?.value || fallback).trim();
  return value === "0.0.0" ? "0.0.0" : DEFAULT_DOC_VERSION;
}

function readStoredDocVersion() {
  try {
    const stored = localStorage.getItem(DOC_VERSION_STORAGE_KEY);
    return stored === "0.0.0" ? "0.0.0" : DEFAULT_DOC_VERSION;
  } catch {
    return DEFAULT_DOC_VERSION;
  }
}

function storeDocVersion(version) {
  try {
    localStorage.setItem(DOC_VERSION_STORAGE_KEY, version === "0.0.0" ? "0.0.0" : DEFAULT_DOC_VERSION);
  } catch {
    /* ignore */
  }
}

async function fetchDocsMeta() {
  if (docsMetaCache) return docsMetaCache;
  const response = await fetch("/api/docs-meta");
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  docsMetaCache = await response.json();
  return docsMetaCache;
}

function fillDocVersionSelect(selectNode, selectedVersion = DEFAULT_DOC_VERSION) {
  if (!selectNode) return;
  const version = selectedVersion === "0.0.0" ? "0.0.0" : DEFAULT_DOC_VERSION;
  const meta = docsMetaCache;
  if (meta?.versions?.length) {
    selectNode.replaceChildren();
    for (const item of meta.versions) {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = item.label;
      if (item.id === version) option.selected = true;
      selectNode.appendChild(option);
    }
    return;
  }
  selectNode.value = version;
}

function syncAllDocVersionSelects(version = readStoredDocVersion()) {
  fillDocVersionSelect(apiDocsVersionSelectNode, version);
  fillDocVersionSelect(mcpDocsVersionSelectNode, version);
  fillDocVersionSelect(userDocsVersionSelectNode, version);
}

async function fetchApiDocs(version, force = false) {
  const v = version === "0.0.0" ? "0.0.0" : DEFAULT_DOC_VERSION;
  if (force) delete apiDocsCacheByVersion[v];
  if (!apiDocsCacheByVersion[v]) {
    const response = await fetch(`/api/docs?version=${encodeURIComponent(v)}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    apiDocsCacheByVersion[v] = await response.json();
  }
  return apiDocsCacheByVersion[v];
}

function renderApiDocsModal(data) {
  if (apiDocsTitleNode) apiDocsTitleNode.textContent = data.title || "HTTP API";
  if (apiDocsSubtitleNode) {
    const ver = data.version || apiDocsVersion;
    const label = data.versionLabel ? ` · ${data.versionLabel}` : "";
    apiDocsSubtitleNode.textContent = `${data.baseUrl || "/api"} · v${ver}${label} · ${(data.groups || []).length} разделов`;
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
    await fetchDocsMeta();
    apiDocsVersion = readStoredDocVersion();
    syncAllDocVersionSelects(apiDocsVersion);
    renderApiDocsModal(await fetchApiDocs(apiDocsVersion));
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
    const ver = data.version || mcpDocsVersion;
    const label = data.versionLabel ? ` · ${data.versionLabel}` : "";
    const parts = [`v${ver}${label}`, data.subtitle, data.packagePath].filter(Boolean);
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

async function fetchMcpDocs(version, force = false) {
  const v = version === "0.0.0" ? "0.0.0" : DEFAULT_DOC_VERSION;
  if (force) delete mcpDocsCacheByVersion[v];
  if (!mcpDocsCacheByVersion[v]) {
    const response = await fetch(`/api/mcp-docs?version=${encodeURIComponent(v)}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    mcpDocsCacheByVersion[v] = await response.json();
  }
  return mcpDocsCacheByVersion[v];
}

async function openMcpDocsModal() {
  if (!mcpDocsModalNode) return;
  try {
    await fetchDocsMeta();
    mcpDocsVersion = readStoredDocVersion();
    syncAllDocVersionSelects(mcpDocsVersion);
    renderMcpDocsModal(await fetchMcpDocs(mcpDocsVersion));
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

function appendComponentsIdeasTitleTemplates(container) {
  if (!container) return;
  container.querySelector(".components-ideas-title-templates")?.remove();

  const wrap = document.createElement("div");
  wrap.className = "components-ideas-title-templates";

  const heading = document.createElement("h3");
  heading.className = "components-ideas-title-templates-heading";
  heading.textContent = "Варианты заголовков секций";

  wrap.append(
    heading,
    renderNavigationTitleVariant3Template(),
    renderNavigationTitleVariant2Template()
  );
  container.appendChild(wrap);
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

function removeComponentsIdeasExtras(container) {
  container?.querySelector(".components-ideas-gallery")?.remove();
  container?.querySelector(".components-ideas-title-templates")?.remove();
}

async function fetchComponentsIdeasSourceMarkdown(source) {
  if (!componentsIdeasCacheBySource[source.id]) {
    const response = await fetch(source.fetchPath);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    componentsIdeasCacheBySource[source.id] = await response.text();
  }
  return componentsIdeasCacheBySource[source.id];
}

function renderComponentsIdeasDraftNav(activeSourceId) {
  if (!componentsIdeasDraftNavNode) return;
  componentsIdeasDraftNavNode.innerHTML = "";

  for (const source of COMPONENTS_IDEAS_SOURCES) {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = `components-ideas-draft-tab${source.id === activeSourceId ? " active" : ""}`;
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-selected", source.id === activeSourceId ? "true" : "false");
    tab.title = source.fetchPath;
    tab.textContent = source.label;
    tab.addEventListener("click", () => {
      void loadComponentsIdeasSource(source.id);
    });
    componentsIdeasDraftNavNode.appendChild(tab);
  }
}

async function loadComponentsIdeasSource(sourceId) {
  if (!componentsIdeasModalNode || !componentsIdeasContentNode) return;
  const source =
    COMPONENTS_IDEAS_SOURCES.find((entry) => entry.id === sourceId) || COMPONENTS_IDEAS_SOURCES[0];
  componentsIdeasActiveSourceId = source.id;

  try {
    const markdown = await fetchComponentsIdeasSourceMarkdown(source);
    setMarkdownPreviewHtml(componentsIdeasContentNode, markdown);
    removeComponentsIdeasExtras(componentsIdeasContentNode);

    if (source.withExtras) {
      const imagesResponse = await fetch("/api/public/images");
      if (!imagesResponse.ok) throw new Error(`HTTP ${imagesResponse.status}`);
      const imagesPayload = await imagesResponse.json();
      const images = Array.isArray(imagesPayload?.images) ? imagesPayload.images : [];
      appendComponentsIdeasGallery(componentsIdeasContentNode, images);
      appendComponentsIdeasTitleTemplates(componentsIdeasContentNode);
    }

    if (componentsIdeasSubtitleNode) {
      componentsIdeasSubtitleNode.textContent = source.subtitle;
    }
    renderComponentsIdeasDraftNav(source.id);
  } catch (error) {
    showToast(`Не удалось загрузить «${source.label}»: ${error.message}`, "error");
  }
}

async function openComponentsIdeasModal() {
  if (!componentsIdeasModalNode || !componentsIdeasContentNode) return;
  try {
    await loadComponentsIdeasSource(componentsIdeasActiveSourceId || "main");
    componentsIdeasModalNode.classList.remove("hidden");
  } catch (error) {
    showToast(`Не удалось загрузить идеи: ${error.message}`, "error");
  }
}

function closeComponentsIdeasModal() {
  componentsIdeasModalNode?.classList.add("hidden");
}

async function fetchUserDocs(version, force = false) {
  const v = version === "0.0.0" ? "0.0.0" : DEFAULT_DOC_VERSION;
  if (force) delete userDocsCacheByVersion[v];
  if (!userDocsCacheByVersion[v]) {
    const response = await fetch(`/api/user-docs?version=${encodeURIComponent(v)}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    userDocsCacheByVersion[v] = await response.text();
  }
  return userDocsCacheByVersion[v];
}

function syncUserDocsSubtitle(version) {
  if (!userDocsSubtitleNode) return;
  const item = docsMetaCache?.versions?.find((entry) => entry.id === version);
  userDocsSubtitleNode.textContent = item
    ? `Agent CMS · ${item.label}`
    : version === "0.0.0"
      ? "Agent CMS · Предыдущая (0.0.0)"
      : "Agent CMS · Актуальная (0.0.1)";
}

async function applyDocVersionChange(version) {
  storeDocVersion(version);
  syncAllDocVersionSelects(version);
  apiDocsVersion = version;
  mcpDocsVersion = version;
  userDocsVersion = version;
}

async function openUserDocsModal() {
  if (!userDocsModalNode || !userDocsContentNode) return;
  try {
    await fetchDocsMeta();
    userDocsVersion = readStoredDocVersion();
    syncAllDocVersionSelects(userDocsVersion);
    syncUserDocsSubtitle(userDocsVersion);
    setMarkdownPreviewHtml(userDocsContentNode, await fetchUserDocs(userDocsVersion));
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
userDocsVersionSelectNode?.addEventListener("change", () => {
  void (async () => {
    try {
      const version = getSelectedDocVersion(userDocsVersionSelectNode);
      await applyDocVersionChange(version);
      syncUserDocsSubtitle(version);
      setMarkdownPreviewHtml(userDocsContentNode, await fetchUserDocs(version, true));
    } catch (error) {
      showToast(`Не удалось загрузить документацию: ${error.message}`, "error");
    }
  })();
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
apiDocsVersionSelectNode?.addEventListener("change", () => {
  void (async () => {
    try {
      const version = getSelectedDocVersion(apiDocsVersionSelectNode);
      await applyDocVersionChange(version);
      renderApiDocsModal(await fetchApiDocs(version, true));
    } catch (error) {
      showToast(`Не удалось загрузить API docs: ${error.message}`, "error");
    }
  })();
});
apiDocsCloseBtn?.addEventListener("click", closeApiDocsModal);
apiDocsModalNode?.addEventListener("click", (event) => {
  if (event.target === apiDocsModalNode) closeApiDocsModal();
});

mcpDocsBtn?.addEventListener("click", () => {
  void openMcpDocsModal();
});
mcpDocsVersionSelectNode?.addEventListener("change", () => {
  void (async () => {
    try {
      const version = getSelectedDocVersion(mcpDocsVersionSelectNode);
      await applyDocVersionChange(version);
      renderMcpDocsModal(await fetchMcpDocs(version, true));
    } catch (error) {
      showToast(`Не удалось загрузить MCP docs: ${error.message}`, "error");
    }
  })();
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
window.addEventListener("popstate", () => {
  suspendAppRouteSync();
  void applyAppRouteFromUrl()
    .then((applied) => {
      if (!applied) {
        const route = parseAppRoute(location.pathname);
        if (route.type === "root" || route.type === "legacy") {
          showAppLandingView();
        } else if (activeAgentId) {
          showAgentHomeView();
        } else {
          showAppLandingView();
        }
      }
    })
    .finally(() => {
      resumeAppRouteSync();
      syncAppRouteToUrl({ replace: true });
    });
});

workspaceShareBtn?.addEventListener("click", () => {
  void shareWorkspaceLink();
});

workspaceShareLinkBtn?.addEventListener("click", () => {
  void copyWorkspaceShareLink();
});

init();
updateContentSearchPlaceholder();

appHomeLink?.addEventListener("click", (event) => {
  event.preventDefault();
  showAppLandingView();
});

appLandingManageBtn?.addEventListener("click", () => {
  openAgentsRegistryModal();
});

agentViewSelect?.addEventListener("change", () => {
  const view = String(agentViewSelect.value || "").trim();
  if (!view) return;
  const option = agentViewSelect.selectedOptions[0];
  if (option?.disabled) {
    syncAgentWorkspaceViewButtons();
    return;
  }
  setAgentWorkspaceView(view);
});

agentVaultSearchNode?.addEventListener("input", () => {
  agentVaultSearchQuery = agentVaultSearchNode.value;
  if (agentWorkspaceView === "vault") {
    renderAgentVaultView();
  }
});

agentTableSearchNode?.addEventListener("input", () => {
  agentTableSearchQuery = agentTableSearchNode.value;
  if (agentWorkspaceView === "table") {
    void renderAgentTableView();
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
  } else if (getDocAsideTab() === "outline") {
    renderDocOutline();
  }
  applySourceEditorAutoHeightUi();
  syncSaveButtonLamp();
});

fileContentInputNode.addEventListener("scroll", syncEditorLineNumbersScroll);

editorLineNumbersBtn?.addEventListener("click", toggleEditorLineNumbers);
applyEditorLineNumbersUi();
ensureSourceEditorResizeObserver();
syncEditorFillMinHeightCssVar();

editorViewPreviewBtn.addEventListener("click", () => setEditorViewMode("preview"));
editorViewWysiwygBtn?.addEventListener("click", () => setEditorViewMode("wysiwyg"));
editorViewSourceBtn?.addEventListener("click", () => setEditorViewMode("source"));
applyEditorViewMode();

docAsideTabPropsBtn?.addEventListener("click", () => setDocAsideTab("props"));
docAsideTabOutlineBtn?.addEventListener("click", () => setDocAsideTab("outline"));
docAsideTabBlocksBtn?.addEventListener("click", () => setDocAsideTab("blocks"));

saveContentBtn.addEventListener("click", saveContent);
saveSystemFileBtn?.addEventListener("click", saveContent);
fileHistoryBtn?.addEventListener("click", () => {
  void openFileHistoryModal();
});
fileHistoryCloseBtn?.addEventListener("click", closeFileHistoryModal);
fileHistoryPreviewCloseBtn?.addEventListener("click", () => {
  fileHistoryPreviewWrapNode?.classList.add("hidden");
});
fileHistoryModalNode?.addEventListener("click", (event) => {
  if (event.target === fileHistoryModalNode) closeFileHistoryModal();
});
propsYamlToggleBtn?.addEventListener("click", togglePropsRawYaml);
propsAddFieldBtn?.addEventListener("click", () => {
  if (isPropsFormReadOnly()) return;
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
  syncSaveButtonLamp();
});
propsInputNode?.addEventListener("input", () => {
  if (!propsRawYamlVisible) return;
  absorbPropsYamlEntries(parsePropsYaml(propsInputNode.value || ""));
  syncSaveButtonLamp();
});
titleInputNode?.addEventListener("input", () => {
  syncSaveButtonLamp();
});
document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "s") {
    event.preventDefault();
    if (activeSystemFile || activePath) {
      saveContent();
    }
  }
});
nodeWorkspaceCloseBtn?.addEventListener("click", handleWorkspaceCloseClick);
confirmCancelBtn.addEventListener("click", () => closeConfirm(false));
confirmOkBtn.addEventListener("click", () => closeConfirm(true));
createManifestBtn?.addEventListener("click", () => createNode("manifest"));
createFolderBtn?.addEventListener("click", () => createNode("folder"));
createFileBtn?.addEventListener("click", () => createNode("file"));
createNodeCatalogActionsNode?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-catalog-preset]");
  if (!button || button.disabled) return;
  const preset = button.getAttribute("data-catalog-preset");
  if (!preset) return;
  if (isCatalogPresetPresent(getCreateModalAgentId(), preset)) {
    const label = SERVICE_CATALOG_PRESET_LABELS[preset] || preset;
    showToast(`Справочник «${label}» уже создан`, "error");
    syncCreateNodeServicePresetsUi();
    return;
  }
  void createNode("catalog", { preset });
});
createNodeServiceDocsActionsNode?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-service-doc-preset]");
  if (!button || button.disabled) return;
  const preset = button.getAttribute("data-service-doc-preset");
  if (!preset) return;
  if (isServiceDocPresetPresent(getCreateModalAgentId(), preset)) {
    const label = SERVICE_DOC_PRESET_LABELS[preset] || preset;
    showToast(`«${label}» уже создан`, "error");
    syncCreateNodeServicePresetsUi();
    return;
  }
  void createNode("service-doc", { preset });
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
nodeNavigationSubsectionSelectNode?.addEventListener("change", () => {
  const value = nodeNavigationSubsectionSelectNode.value;
  if (value === NODE_MINDMAP_MODE) {
    setContentMode(NODE_MINDMAP_MODE);
    return;
  }
  if (activeContentMode === NODE_MINDMAP_MODE) {
    setContentMode(NODE_NAVIGATION_MODE);
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
    renderMenu(currentMenuData, activeAgentId, { menuOnly: true });
    updateActiveButton();
  }
});
menuCardsPreviewOnlyNode?.addEventListener("change", () => {
  menuCardsPreviewOnly = Boolean(menuCardsPreviewOnlyNode.checked);
  saveCardsPreviewOnly(menuCardsPreviewOnly);
  if (currentMenuData) {
    renderMenu(currentMenuData, activeAgentId, { menuOnly: true });
    updateActiveButton();
  }
});
menuViewTreeBtn?.addEventListener("click", () => setMenuViewMode("tree"));
menuViewFlatBtn?.addEventListener("click", () => setMenuViewMode("flat"));
menuViewBookmarksBtn?.addEventListener("click", () => setMenuViewMode("bookmarks"));
menuViewCardsBtn?.addEventListener("click", () => setMenuViewMode("cards"));
menuRefreshBtn?.addEventListener("click", () => {
  void refreshMenuTree();
});
menuCollapseAllBtn?.addEventListener("click", () => {
  toggleCollapseAllMenuTreeBranches();
});

menuPinBranchBtn?.addEventListener("click", () => {
  const folder = getActiveMenuFolderPath();
  if (!folder) {
    showToast("Откройте тему или область в дереве, чтобы закрепить ветку", "error");
    return;
  }
  togglePinMenuBranch(folder);
});

menuPinCurrentBtn?.addEventListener("click", () => {
  const folder = getActiveMenuFolderPath();
  if (!folder) {
    showToast("Откройте тему или область в дереве", "error");
    return;
  }
  pinMenuBranch(folder);
  closeMenuSettingsPopover();
});

menuUnpinBranchBtn?.addEventListener("click", () => {
  unpinMenuBranch();
  closeMenuSettingsPopover();
});

menuPinnedBannerUnpinBtn?.addEventListener("click", () => {
  unpinMenuBranch();
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
    renderMenu(currentMenuData, activeAgentId, { menuOnly: true });
    updateActiveButton();
  }
});

menuTreePadSortIndexesNode?.addEventListener("change", () => {
  saveMenuTreeSettings(activeAgentId, {
    padSortIndexes: Boolean(menuTreePadSortIndexesNode.checked)
  });
  if (currentMenuData && menuViewMode === "tree") {
    renderMenu(currentMenuData, activeAgentId, { menuOnly: true });
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
  if (activeContentMode === "external") rerenderExternalListViewBody();
});
storageSectionsPanelToggleNode?.addEventListener("change", () => {
  setStorageSectionsPanelVisible(storageSectionsPanelToggleNode.checked);
});
document.addEventListener("click", (event) => {
  const layoutBtn = event.target.closest(".mindmap-layout-btn[data-mindmap-layout]");
  if (!layoutBtn || layoutBtn.closest(".mindmap-view-bar--embedded")) return;
  applyMindmapLayout(layoutBtn.dataset.mindmapLayout || "horizontal");
});
syncMindmapLayoutUi();
void fetchDocsMeta()
  .then(() => syncAllDocVersionSelects(readStoredDocVersion()))
  .catch(() => {});
mediaViewSelectNode?.addEventListener("change", () => {
  setMediaViewMode(mediaViewSelectNode?.value || "dashboard");
});

mediaUploadBtnNode?.addEventListener("click", () => {
  if (activeContentMode !== "media" || isMediaAssetEditing()) return;
  if (!mediaBulkUploadPanelOpen) {
    setMediaBulkUploadPanelOpen(true);
    if (!listViewContentNode.querySelector(".media-bulk-upload-host")) {
      renderListViewContent();
    }
    listViewContentNode.querySelector(".media-bulk-upload-host")?.scrollIntoView({
      behavior: "smooth",
      block: "nearest"
    });
    return;
  }
  if (!mediaBulkUploadState.active) setMediaBulkUploadPanelOpen(false);
});

mediaUploadInputNode?.addEventListener("change", () => {
  const files = mediaUploadInputNode.files ? [...mediaUploadInputNode.files] : [];
  if (!files.length) return;
  if (files.length === 1) {
    void uploadMediaFileFromPicker(files[0]);
  } else {
    void uploadMediaFilesBulk(files);
  }
});

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
createExternalMemoryBtn.addEventListener("click", openCreateMemoryModal);
createExternalSectionBtn.addEventListener("click", () => {
  if (isFlatStorageSectionMode()) {
    openCreateSectionModal(activeContentMode);
    return;
  }
  openCreateSectionModal("external");
});
createMediaSectionBtn?.addEventListener("click", () => openCreateSectionModal("media"));
createMemoryCancelBtn.addEventListener("click", closeCreateMemoryModal);
createMemoryOkBtn.addEventListener("click", createExternalMemory);
createMemoryNamesListNode?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  void createExternalMemory();
});
createSectionCancelBtn.addEventListener("click", closeCreateSectionModal);
createSectionOkBtn.addEventListener("click", createWorkspaceSection);
createSectionNameInputNode.addEventListener("keydown", (event) => {
  if (event.key === "Enter") createWorkspaceSection();
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

  if (appLandingSearchInputNode && appLandingSearchResultsNode) {
    const landingBar = document.querySelector(".app-landing-search-bar-wrap");
    const insideLandingSearch =
      landingBar?.contains(event.target) || appLandingSearchResultsNode.contains(event.target);
    if (!insideLandingSearch) hideLandingSearchResults();
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

appLandingSearchScopeNode?.addEventListener("change", () => {
  updateLandingSearchPlaceholder();
  scheduleLandingSearch();
});
appLandingSearchInputNode?.addEventListener("input", scheduleLandingSearch);
appLandingSearchInputNode?.addEventListener("focus", () => {
  if (appLandingSearchInputNode.value.trim()) scheduleLandingSearch();
});
appLandingSearchInputNode?.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    hideLandingSearchResults();
    appLandingSearchInputNode.blur();
  }
});
appLandingSearchAgentsAllBtn?.addEventListener("click", () => {
  setLandingSearchAgentSelection(getAgentsForLandingGrid().map((agent) => agent.id));
});
appLandingSearchAgentsNoneBtn?.addEventListener("click", () => {
  setLandingSearchAgentSelection([]);
});
appLandingSearchAgentsActiveBtn?.addEventListener("click", () => {
  setLandingSearchAgentSelection(
    getAgentsForLandingGrid().filter(isAgentRegistryActive).map((agent) => agent.id)
  );
});

appLandingViewGridBtn?.addEventListener("click", () => setLandingAgentsView("grid"));
appLandingViewOrbitBtn?.addEventListener("click", () => setLandingAgentsView("orbit"));
appLandingOrbitCreateBtn?.addEventListener("click", openCreateAgentFromLanding);

initNodeWorkspaceDomainSelect();
