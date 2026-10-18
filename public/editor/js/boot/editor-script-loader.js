/**
 * Lazy script loader for heavy editor modules (refactor 14).
 */
(function initEditorScriptLoader(global) {
  const cache = new Map();

  function isEditorMainBundled() {
    return global.__AGENTCMS_EDITOR_BUNDLE__ === true;
  }

  /** Prod main.built.js preloads modules from editor-entry.js — skip duplicate script tags. */
  function bundleAlreadyProvides(checks) {
    return isEditorMainBundled() && checks.every((fn) => fn());
  }

  function lazyGroupPreloaded(groupKey) {
    return isEditorMainBundled() && global.__AGENTCMS_EDITOR_PRELOADED__?.[groupKey] === true;
  }

  function loadModuleScript(src) {
    const url = String(src || "").trim();
    if (!url) return Promise.reject(new Error("empty module url"));
    const cacheKey = `module:${url}`;
    if (cache.has(cacheKey)) return cache.get(cacheKey);

    const promise = import(url.startsWith("/") ? url : `/${url}`);
    cache.set(cacheKey, promise);
    return promise;
  }

  function loadScript(src) {
    const url = String(src || "").trim();
    if (!url) return Promise.reject(new Error("empty script url"));
    if (cache.has(url)) return cache.get(url);

    const promise = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[data-agentcms-lazy="${CSS.escape(url)}"]`);
      if (existing) {
        if (existing.dataset.loaded === "1") {
          resolve();
          return;
        }
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error(`Failed to load ${url}`)), { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = url;
      script.async = true;
      script.dataset.agentcmsLazy = url;
      script.addEventListener(
        "load",
        () => {
          script.dataset.loaded = "1";
          resolve();
        },
        { once: true }
      );
      script.addEventListener("error", () => reject(new Error(`Failed to load ${url}`)), { once: true });
      document.head.appendChild(script);
    });

    cache.set(url, promise);
    return promise;
  }

  function loadStylesheet(href) {
    const url = String(href || "").trim();
    if (!url) return Promise.reject(new Error("empty stylesheet url"));
    const cacheKey = `css:${url}`;
    if (cache.has(cacheKey)) return cache.get(cacheKey);

    const promise = new Promise((resolve, reject) => {
      const existing = document.querySelector(`link[data-agentcms-lazy="${CSS.escape(url)}"]`);
      if (existing) {
        if (existing.dataset.loaded === "1") {
          resolve();
          return;
        }
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error(`Failed to load ${url}`)), { once: true });
        return;
      }

      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = url;
      link.dataset.agentcmsLazy = url;
      link.addEventListener(
        "load",
        () => {
          link.dataset.loaded = "1";
          resolve();
        },
        { once: true }
      );
      link.addEventListener("error", () => reject(new Error(`Failed to load ${url}`)), { once: true });
      document.head.appendChild(link);
    });

    cache.set(cacheKey, promise);
    return promise;
  }

  async function loadMermaid() {
    await loadScript("/_resources/vendor/mermaid.min.js");
    if (typeof global.mermaid?.initialize !== "function") {
      throw new Error("mermaid not available after load");
    }
  }

  async function loadToastUiEditor() {
    await loadStylesheet("/_resources/vendor/toastui-editor.css");
    await loadScript("/_resources/vendor/toastui-editor-all.min.js");
    const EditorClass = global.toastui?.Editor || global.Editor;
    if (typeof EditorClass !== "function") {
      throw new Error("toastui Editor not available after load");
    }
  }

  async function loadMammoth() {
    await loadScript("/_resources/vendor/mammoth.browser.min.js");
    if (typeof global.mammoth?.convertToHtml !== "function") {
      throw new Error("mammoth not available after load");
    }
  }

  async function loadXlsx() {
    await loadScript("/_resources/vendor/xlsx.full.min.js");
    if (typeof global.XLSX?.read !== "function") {
      throw new Error("xlsx not available after load");
    }
  }

  async function loadFancybox() {
    await loadStylesheet("/_resources/vendor/fancybox/fancybox.css");
    await loadScript("/_resources/vendor/fancybox/fancybox.umd.js");
    const Fancybox = global.Fancybox;
    if (typeof Fancybox?.bind !== "function") {
      throw new Error("Fancybox not available after load");
    }
  }

  async function loadAgentRmmLiveBrain() {
    await loadScript("/_resources/vendor/d3.min.js?v=1");
    await loadScript("/editor/js/panels/agent-rmm-live-brain.js?v=4");
    if (typeof global.AgentRmmLiveBrain === "undefined") {
      throw new Error("AgentRmmLiveBrain not available after load");
    }
  }

  async function loadLandingChunk() {
    const g = globalThis;
    if (!g.__agentCmsLandingChunkModulePromise) {
      if (g.__agentCmsLandingChunkModule) {
        return Promise.resolve(g.__agentCmsLandingChunkModule);
      }
      g.__agentCmsLandingChunkModulePromise = import("/editor/js/landing/landing-runtime.js?v=13");
    }
    return g.__agentCmsLandingChunkModulePromise;
  }

  let workspaceGraphChunkPromise = null;
  async function loadWorkspaceGraphChunk() {
    if (!workspaceGraphChunkPromise) {
      workspaceGraphChunkPromise = import("/editor/js/workspace/workspace-graph-chunk.js?v=2");
    }
    return workspaceGraphChunkPromise;
  }

  let workspaceComfortPromise = null;
  async function loadWorkspaceComfortScripts() {
    if (!workspaceComfortPromise) {
      if (lazyGroupPreloaded("comfort")) {
        workspaceComfortPromise = Promise.resolve();
      } else {
        workspaceComfortPromise = (async () => {
          await loadScript("/editor/js/pomodoro/idle-screensaver-breaks-client.js?v=1");
          await loadScript("/editor/js/pomodoro/workspace-idle-screensaver.js?v=8");
          await loadModuleScript("/editor/js/pomodoro/pomodoro-state-bootstrap.js?v=1");
          await loadScript("/editor/js/pomodoro/workspace-pomodoro.js?v=9");
        })();
      }
    }
    return workspaceComfortPromise;
  }

  let documentViewerPromise = null;
  async function loadDocumentViewer() {
    if (!documentViewerPromise) {
      if (
        lazyGroupPreloaded("documentViewer") ||
        (isEditorMainBundled() && typeof global.DocumentViewer?.open === "function")
      ) {
        documentViewerPromise = Promise.resolve();
      } else {
        documentViewerPromise = loadScript("/editor/js/editor/document-viewer.js?v=2").then(() => {
          if (typeof global.DocumentViewer?.open !== "function") {
            throw new Error("DocumentViewer not available after load");
          }
        });
      }
    }
    return documentViewerPromise;
  }

  let editorPostMainPromise = null;
  async function loadEditorPostMainScripts() {
    if (!editorPostMainPromise) {
      if (lazyGroupPreloaded("postMain")) {
        editorPostMainPromise = Promise.resolve();
      } else {
      editorPostMainPromise = (async () => {
        await loadScript("/editor/js/panels/discuss-panel.js?v=0.5.259");
        await loadScript("/editor/js/app/privacy-mode.js?v=5");
        await loadScript("/editor/js/app/sensitive-input.js?v=3");
        await loadScript("/editor/js/panels/page-picker-extract.js?v=0.5.5");
        await loadScript("/editor/js/editor/page-snapshot.js?v=0.1.0");
        await loadScript("/editor/js/panels/cms-page-picker.js?v=0.5.9");
        await loadScript("/editor/js/panels/companion-docs.js?v=5");
        await Promise.all([
          loadScript("/editor/js/app/app-home-title-rotator.js?v=14"),
          loadScript("/editor/js/app/header-slogan-rotator.js?v=20"),
          loadScript("/editor/js/app/app-footer-voice-cmd.js?v=3")
        ]);
      })();
      }
    }
    return editorPostMainPromise;
  }

  let editorCoreHelpersPromise = null;
  async function loadEditorCoreHelpers() {
    if (!editorCoreHelpersPromise) {
      if (
        bundleAlreadyProvides([
          () => typeof global.SlugTranslit === "object",
          () => typeof global.ExternalFileMask === "object",
          () => typeof global.PlatformStatus === "object"
        ])
      ) {
        editorCoreHelpersPromise = Promise.resolve();
      } else {
        editorCoreHelpersPromise = Promise.all([
          loadScript("/editor/js/core/slug-translit.js?v=1"),
          loadScript("/editor/js/editor/external-file-mask.js?v=1"),
          loadScript("/editor/js/core/platform-status.js")
        ]);
      }
    }
    return editorCoreHelpersPromise;
  }

  let editorCmsCorePromise = null;
  async function loadEditorCmsCore() {
    if (!editorCmsCorePromise) {
      if (
        bundleAlreadyProvides([
          () => Array.isArray(global.CHANNEL_BUILTIN_PRESETS),
          () => Array.isArray(global.MEDIA_LIBRARY_BUILTIN_PRESETS),
          () => typeof global.rewriteLegacyTopicPathsInRelPathClient === "function",
          () => global.CORE_SYSTEM_FILES instanceof Set,
          () => Array.isArray(global.SHARED_THEME_PRESETS),
          () => typeof global.AwnEnumOptions === "object",
          () => typeof global.NodeConfigBundle === "object",
          () => typeof global.TopicSchemaSlotSpecs === "object"
        ])
      ) {
        editorCmsCorePromise = Promise.resolve();
      } else {
        editorCmsCorePromise = (async () => {
          await loadScript("/editor/js/core/channel-presets-runtime.js?v=1");
          await loadScript("/editor/js/core/media-library-presets-runtime.js?v=1");
          await loadScript("/editor/js/core/editor-storage-path-runtime.js?v=1");
          await loadScript("/editor/js/core/editor-chpu-path-runtime.js?v=1");
          await loadScript("/editor/js/core/editor-system-files-runtime.js?v=1");
          await loadScript("/editor/js/core/editor-shared-theme-presets-runtime.js?v=1");
          await Promise.all([
            loadScript("/editor/js/cms/awn-enum-options.js?v=1"),
            loadScript("/editor/js/core/node-config-bundle.js?v=1"),
            loadScript("/editor/js/core/topic-schema-slot-specs.js?v=0.5.239")
          ]);
        })();
      }
    }
    return editorCmsCorePromise;
  }

  let editorMarkdownPreviewPromise = null;
  async function loadEditorMarkdownPreview() {
    if (!editorMarkdownPreviewPromise) {
      if (
        bundleAlreadyProvides([
          () => typeof global.markdownit === "function",
          () => typeof global.hljs === "object"
        ])
      ) {
        editorMarkdownPreviewPromise = Promise.resolve();
      } else {
        editorMarkdownPreviewPromise = (async () => {
          await loadScript("/_resources/vendor/markdown-it.min.js");
          await Promise.all([
            loadScript("/editor/js/markdown/markdown-github-alerts.js"),
            loadScript("/editor/js/markdown/markdown-it-task-lists.js")
          ]);
          await loadScript("/_resources/vendor/highlight.min.js");
        })();
      }
    }
    return editorMarkdownPreviewPromise;
  }

  let editorUiIconsPromise = null;
  async function loadEditorUiIcons() {
    if (!editorUiIconsPromise) {
      if (
        bundleAlreadyProvides([
          () => typeof global.MaterialFileIcons === "object",
          () => typeof global.CHANNEL_PRESET_ICON_SVG === "object"
        ])
      ) {
        editorUiIconsPromise = Promise.resolve();
      } else {
        editorUiIconsPromise = (async () => {
          await loadScript("/_resources/vendor/material-file-icons/map.js?v=1");
          await loadScript("/editor/js/editor/material-file-icons.js?v=1");
          await loadScript("/_resources/vendor/channel-preset-icons/map.js?v=15");
        })();
      }
    }
    return editorUiIconsPromise;
  }

  let fileHubQueuePromise = null;
  async function loadFileHubQueueClient() {
    if (!fileHubQueuePromise) {
      fileHubQueuePromise = loadScript("/editor/js/file-hub/file-hub-queue-client.js?v=3").then(() => {
        if (typeof global.FileHubQueueClient?.fetchQueue !== "function") {
          throw new Error("FileHubQueueClient not available after load");
        }
      });
    }
    return fileHubQueuePromise;
  }

  let connectionStatusPromise = null;
  async function loadConnectionStatus() {
    if (!connectionStatusPromise) {
      if (
        lazyGroupPreloaded("connectionStatus") ||
        (isEditorMainBundled() && typeof global.agentCmsConnectionStatus === "object")
      ) {
        connectionStatusPromise = Promise.resolve();
      } else {
        connectionStatusPromise = loadScript("/editor/js/app/connection-status.js?v=1");
      }
    }
    return connectionStatusPromise;
  }

  let editorSecondaryPanelsPromise = null;
  async function loadEditorSecondaryPanels() {
    if (!editorSecondaryPanelsPromise) {
      if (lazyGroupPreloaded("secondary")) {
        editorSecondaryPanelsPromise = Promise.resolve();
      } else {
        editorSecondaryPanelsPromise = Promise.all([
          loadScript("/editor/js/panels/languagetool-panel.js?v=2"),
          loadScript("/editor/js/panels/file-find-bar.js?v=2"),
          loadScript("/editor/js/editor/marker-blocks-preview.js?v=11"),
          loadScript("/editor/js/panels/mcp-docs-primitives-help.js?v=1"),
          loadScript("/editor/js/panels/api-docs-ui.js?v=2")
        ]);
      }
    }
    return editorSecondaryPanelsPromise;
  }

  let editorMenuPanelsPromise = null;
  async function loadEditorMenuPanels() {
    if (!editorMenuPanelsPromise) {
      if (lazyGroupPreloaded("menuPanels")) {
        editorMenuPanelsPromise = Promise.resolve();
      } else {
        editorMenuPanelsPromise = (async () => {
          await Promise.all([
            loadScript("/editor/js/panels/entity-registry-editor.js?v=2"),
            loadScript("/editor/js/cms/awn-dashboards.js?v=8")
          ]);
          await loadScript("/editor/js/panels/semantic-index-panel.js?v=24");
        })();
      }
    }
    return editorMenuPanelsPromise;
  }

  /** Must run before /editor/main.js (dev) — slices moved out of main in refactor 14. */
  const EDITOR_MAIN_PREMAIN_SCRIPTS = [
    "/editor/js/core/channel-presets-runtime.js?v=1",
    "/editor/js/core/media-library-presets-runtime.js?v=1",
    "/editor/js/core/editor-storage-path-runtime.js?v=1",
    "/editor/js/core/editor-chpu-path-runtime.js?v=1",
    "/editor/js/core/editor-system-files-runtime.js?v=1",
    "/editor/js/core/editor-shared-theme-presets-runtime.js?v=1"
  ];

  async function loadEditorMainPremainScripts() {
    if (isEditorMainBundled()) return;
    for (const url of EDITOR_MAIN_PREMAIN_SCRIPTS) {
      await loadScript(url);
    }
  }

  global.AgentCmsScriptLoader = {
    loadScript,
    loadEditorMainPremainScripts,
    loadStylesheet,
    loadMermaid,
    loadToastUiEditor,
    loadMammoth,
    loadXlsx,
    loadFancybox,
    loadAgentRmmLiveBrain,
    loadLandingChunk,
    loadWorkspaceGraphChunk,
    loadEditorMenuPanels,
    loadWorkspaceComfortScripts,
    loadDocumentViewer,
    loadEditorPostMainScripts,
    loadEditorSecondaryPanels,
    loadFileHubQueueClient,
    loadConnectionStatus,
    loadEditorCoreHelpers,
    loadEditorCmsCore,
    loadEditorMarkdownPreview,
    loadEditorUiIcons
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
