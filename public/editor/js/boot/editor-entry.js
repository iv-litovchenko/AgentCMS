/**
 * Refactor 14 — phase 2 bundle entry (prod: esbuild → main.built.js).
 *
 * Dev: index still loads /editor/main.js source; lazy loader fills gaps.
 * Prod bundle: modules below ship in main.built.js; loader skips duplicate fetches.
 */

import "../core/project-version.js";

import "../core/slug-translit.js";
import "../editor/external-file-mask.js";
import "../core/platform-status.js";

import "../core/channel-presets-runtime.js";
import "../core/media-library-presets-runtime.js";
import "../core/editor-storage-path-runtime.js";
import "../core/editor-chpu-path-runtime.js";
import "../core/editor-system-files-runtime.js";
import "../core/editor-shared-theme-presets-runtime.js";
import "../cms/awn-enum-options.js";
import "../core/node-config-bundle.js";
import "../core/topic-schema-slot-specs.js";

import "../../../_resources/vendor/markdown-it.min.js";
import "../markdown/markdown-github-alerts.js";
import "../markdown/markdown-it-task-lists.js";
import "../../../_resources/vendor/highlight.min.js";

import "../../../_resources/vendor/material-file-icons/map.js";
import "../editor/material-file-icons.js";
import "../../../_resources/vendor/channel-preset-icons/map.js";

import "../panels/discuss-panel.js";
import "../app/privacy-mode.js";
import "../app/sensitive-input.js";
import "../panels/page-picker-extract.js";
import "../editor/page-snapshot.js";
import "../panels/cms-page-picker.js";
import "../panels/companion-docs.js";
import "../app/app-home-title-rotator.js";
import "../app/header-slogan-rotator.js";
import "../app/app-footer-voice-cmd.js";

import "../panels/languagetool-panel.js";
import "../panels/file-find-bar.js";
import "../editor/marker-blocks-preview.js";
import "../panels/mcp-docs-primitives-help.js";
import "../panels/api-docs-ui.js";

import "../app/connection-status.js";

import "../panels/entity-registry-editor.js";
import "../cms/awn-dashboards.js";
import "../panels/semantic-index-panel.js";

import "../pomodoro/idle-screensaver-breaks-client.js";
import "../pomodoro/workspace-idle-screensaver.js";
import "../pomodoro/pomodoro-state-bootstrap.js";
import "../pomodoro/workspace-pomodoro.js";
import "../editor/document-viewer.js";

import "./editor-bundle-preloaded-groups.js";

import "../../main.js";

globalThis.__agentCmsRunBoot?.();
