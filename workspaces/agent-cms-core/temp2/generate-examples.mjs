#!/usr/bin/env node
/**
 * Generate MCP tool response examples → ./examples/{tool}.json
 * Run from repo root: node workspaces/agent-cms-core/temp/generate-examples.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "examples");

/** Logical folders — mirrors GLOBAL_MCP_DOC sections */
const TOOL_FOLDER = {
  list_agents: "zzz/bootstrap",
  get_session_context: "zzz/bootstrap",
  get_mcp_docs: "zzz/bootstrap",

  get_menu: "zzz/navigation",
  get_active_context: "zzz/navigation",
  get_active_page: "zzz/navigation",
  search_workspace: "zzz/navigation",
  get_site_map: "zzz/navigation",

  get_topic_registry: "registries",
  get_always_context: "registries",
  get_cron_registry: "registries",
  get_heartbeat_registry: "registries",
  get_storage_layout: "registries",
  get_workspace_table: "registries",
  get_canonical_model: "registries",

  list_awn_types: "types",
  list_type_catalog: "types",
  list_components: "types",
  get_platform_index: "types",
  list_page_types: "types",
  get_page_type: "types",
  list_content_types: "types",
  get_content_type: "types",
  get_type_health: "types",
  get_agent_system_status: "types",
  get_agent_system_type: "types",
  read_agent_system_file: "types",
  write_agent_system_file: "types",

  get_page_meta: "zzz/pages",
  page_exists: "zzz/pages",
  read_page_body: "zzz/pages",
  write_page_body: "zzz/pages",
  read_page_properties: "zzz/pages",
  write_page_properties: "zzz/pages",
  read_page_schema: "zzz/pages",
  write_page_schema: "zzz/pages",
  read_page_config: "zzz/pages",
  write_page_config: "zzz/pages",
  read_page_env: "zzz/pages",
  write_page_env: "zzz/pages",
  list_page_slots: "zzz/pages",
  create_page: "zzz/pages",
  rename_page: "zzz/pages",
  move_page: "zzz/pages",
  delete_page: "zzz/pages",

  list_content: "zzz/content",
  content_exists: "zzz/content",
  get_content_meta: "zzz/content",
  read_content_body: "zzz/content",
  write_content_body: "zzz/content",
  read_content_properties: "zzz/content",
  write_content_properties: "zzz/content",
  read_content_file: "zzz/content",
  create_content: "zzz/content",
  upload_content: "zzz/content",
  import_content_from_url: "zzz/content",
  rename_content: "zzz/content",
  move_content: "zzz/content",
  delete_content: "zzz/content",

  list_data_stores: "zzz/data-stores",
  get_data_store: "zzz/data-stores",
  read_data_store_schema: "zzz/data-stores",
  write_data_store_schema: "zzz/data-stores",
  create_data_record: "zzz/data-stores",
  create_data_store: "zzz/data-stores",

  list_inbox: "zzz/workflow",
  read_inbox_item: "zzz/workflow",
  create_inbox_item: "zzz/workflow",
  triage_inbox_item: "zzz/workflow",
  read_thread: "zzz/workflow",
  append_thread: "zzz/workflow",
  get_topic_intake: "zzz/workflow",
  get_intake_batch: "zzz/workflow",
  list_comments: "zzz/workflow",
  append_comment: "zzz/workflow",
  toggle_comment_reaction: "zzz/workflow",

  list_adopt_folders: "workspace",
  browse_workspace_folder: "workspace",
  scan_workspace_folder: "workspace",
  read_workspace_page: "workspace",
  read_workspace_text_file: "workspace",
  upload_workspace_file: "workspace",

  list_system_files: "zzz/system",
  read_system_file: "zzz/system",
  write_system_file: "zzz/system",
  notify_user: "zzz/system",

  shell_get_status: "shell",
  shell_post_message: "shell",
  shell_stop_tts: "shell",
  shell_camera_snapshot: "shell",
  shell_screenshot: "shell"
};

const FOLDER_LABELS = {
  registries: "Реестры workspace",
  types: "Типы и каталоги",
  "zzz/bootstrap": "zzz — Старт сессии",
  "zzz/navigation": "zzz — Навигация и поиск",
  "zzz/pages": "zzz — Страницы (Page)",
  "zzz/content": "zzz — Контент в слотах (Content)",
  "zzz/data-stores": "zzz — Накопители awn-data",
  "zzz/system": "zzz — Системные файлы",
  "zzz/workflow": "zzz — Inbox / thread / comments",
  workspace: "Свободная память",
  shell: "Agent Shell"
};

function toolRelPath(tool) {
  const folder = TOOL_FOLDER[tool] || "other";
  return `examples/${folder}/${tool}.json`;
}

function toolOutPath(tool) {
  const folder = TOOL_FOLDER[tool] || "other";
  const dir = path.join(OUT_DIR, folder);
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${tool}.json`);
}
const BASE = process.env.AGENT_CMS_BASE_URL || "http://127.0.0.1:3000";
const AGENT = process.env.AGENT_CMS_AGENT || "agent-cms-test";

const PAGE = "aja-test-oblasti-2031/aja-test-temy-2031/manifest.md";
const STORE = "_base";

const MAX_BYTES = 80_000;

async function api(method, apiPath, { query = {}, body, agentScope = true } = {}) {
  const url = new URL(apiPath, BASE);
  for (const [k, v] of Object.entries(query)) {
    if (v != null && v !== "") url.searchParams.set(k, String(v));
  }
  if (agentScope) url.searchParams.set("agent", AGENT);
  const init = {
    method,
    headers: { Accept: "application/json", "X-Activity-Source": "mcp-examples" }
  };
  if (body !== undefined) {
    init.headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  const res = await fetch(url, init);
  const ct = res.headers.get("content-type") || "";
  const payload = ct.includes("json") ? await res.json().catch(() => null) : await res.text();
  if (!res.ok) {
    const reason =
      payload && typeof payload === "object"
        ? payload.error || payload.details || JSON.stringify(payload)
        : String(payload);
    throw new Error(`${method} ${apiPath} → ${res.status}: ${reason}`);
  }
  return payload;
}

function truncatePayload(data, maxBytes = MAX_BYTES) {
  const full = JSON.stringify(data, null, 2);
  if (full.length <= maxBytes) {
    return { payload: data, truncated: false, responseBytes: full.length };
  }
  const slim = slimLargePayload(data);
  const slimText = JSON.stringify(slim, null, 2);
  if (slimText.length <= maxBytes) {
    return {
      payload: {
        _truncated: true,
        _responseBytes: full.length,
        _note: "Full response too large; showing slim preview",
        ...slim
      },
      truncated: true,
      responseBytes: full.length
    };
  }
  return {
    payload: {
      _truncated: true,
      _responseBytes: full.length,
      _note: "Response extremely large; see _preview",
      _preview: full.slice(0, maxBytes - 200) + "\n…"
    },
    truncated: true,
    responseBytes: full.length
  };
}

function slimLargePayload(data) {
  if (!data || typeof data !== "object") return data;
  const out = Array.isArray(data) ? [] : {};
  for (const [key, value] of Object.entries(data)) {
    if (key === "types" && value && typeof value === "object") {
      const ids = Object.keys(value).slice(0, 2);
      out.types = Object.fromEntries(ids.map((id) => [id, value[id]]));
      out._typesTotal = Object.keys(value).length;
      continue;
    }
    if (key === "typeCatalog" && value && typeof value === "object") {
      out.typeCatalog = { _keys: Object.keys(value).slice(0, 5), _totalKeys: Object.keys(value).length };
      continue;
    }
    if (key === "fieldRegistry" && value && typeof value === "object") {
      const ids = Object.keys(value).slice(0, 3);
      out.fieldRegistry = Object.fromEntries(ids.map((id) => [id, value[id]]));
      out._fieldRegistryTotal = Object.keys(value).length;
      continue;
    }
    if (key === "items" && Array.isArray(value) && value.length > 3) {
      out.items = value.slice(0, 2);
      out._itemsTotal = value.length;
      continue;
    }
    if (key === "topics" && Array.isArray(value) && value.length > 3) {
      out.topics = value.slice(0, 2);
      out._topicsTotal = value.length;
      continue;
    }
    if (key === "content" && typeof value === "string" && value.length > 1200) {
      out.content = value.slice(0, 800) + "\n…";
      out._contentChars = value.length;
      continue;
    }
    if (key === "baseTypes" || key === "merged") {
      out[key] = { _omitted: true, _reason: "legacy UI bloat — use mode=layers or get_page_type" };
      continue;
    }
    out[key] = value;
  }
  return out;
}

function writeExample(tool, payload, meta = {}) {
  const file = toolOutPath(tool);
  const doc = {
    tool,
    folder: TOOL_FOLDER[tool] || "other",
    agent: AGENT,
    capturedAt: new Date().toISOString(),
    sampleArgs: meta.sampleArgs ?? null,
    ...meta,
    response: payload
  };
  fs.writeFileSync(file, JSON.stringify(doc, null, 2) + "\n");
  return file;
}

const WRITE_ONLY = {
  append_comment: { input: { path: PAGE, body: "Комментарий" }, response: { ok: true } },
  append_thread: { input: { path: PAGE, body: "Сообщение", role: "agent" }, response: { ok: true } },
  create_content: {
    input: { path: PAGE, slot: "notes", title: "Заметка" },
    response: { path: PAGE, file: "notes/zametka.md" }
  },
  create_data_record: { input: { store: STORE, title: "Запись" }, response: { id: "1", store: STORE } },
  create_data_store: { input: { slug: "my-store", kind: "collection" }, response: { store: "my-store" } },
  create_inbox_item: { input: { path: PAGE, title: "Intake" }, response: { file: "inbox/....md" } },
  create_page: {
    input: { parentPath: "awn-container", type: "file", displayName: "Новая тема" },
    response: { path: "awn-container/novaya-tema/manifest.md" }
  },
  delete_content: { input: { path: PAGE, slot: "notes", ref: "x.md" }, response: { ok: true } },
  delete_page: { input: { path: PAGE }, response: { ok: true } },
  import_content_from_url: {
    input: { path: PAGE, slot: "media", url: "https://example.com/file.png" },
    response: { file: "media/file.png" }
  },
  move_content: {
    input: { path: PAGE, slot: "notes", ref: "a.md", targetRef: "b.md" },
    response: { ok: true }
  },
  move_page: { input: { path: PAGE, targetParent: "awn-container" }, response: { path: "..." } },
  notify_user: { input: { title: "Готово" }, response: { ok: true } },
  rename_content: { input: { path: PAGE, slot: "notes", ref: "a.md", displayName: "B" }, response: { ok: true } },
  rename_page: { input: { path: PAGE, displayName: "Новое имя" }, response: { path: "..." } },
  shell_camera_snapshot: { input: {}, response: { imageUrl: "...", capturedAt: "..." } },
  shell_post_message: { input: { body: "Hi" }, response: { ok: true } },
  shell_screenshot: { input: {}, response: { imageUrl: "..." } },
  shell_stop_tts: { input: {}, response: { ok: true } },
  toggle_comment_reaction: {
    input: { path: PAGE, commentId: "c1", reaction: "up" },
    response: { ok: true }
  },
  triage_inbox_item: {
    input: { path: PAGE, file: "inbox/x.md", action: "mark-done" },
    response: { ok: true }
  },
  upload_content: {
    input: { path: PAGE, slot: "media", fileName: "x.png", data: "<base64>" },
    response: { file: "media/x.png" }
  },
  upload_workspace_file: {
    input: { folderPath: "awn-container", fileName: "x.txt", data: "<base64>" },
    response: { path: "awn-container/x.txt" }
  },
  write_agent_system_file: { input: { path: "types/topic.yml", content: "..." }, response: { ok: true } },
  write_content_body: { input: { path: PAGE, slot: "main-single", content: "..." }, response: { ok: true } },
  write_content_properties: {
    input: { path: PAGE, slot: "notes", ref: "x.md", content: "awn-status: open" },
    response: { file: "notes/x.md" }
  },
  write_page_body: { input: { path: PAGE, content: "# Тело" }, response: { path: PAGE } },
  write_page_config: { input: { path: PAGE, content: "awn_ui: ..." }, response: { path: PAGE } },
  write_page_env: { input: { path: PAGE, content: "KEY: val" }, response: { path: PAGE } },
  write_page_properties: {
    input: { path: PAGE, content: "awn-status: open" },
    response: { path: PAGE, content: "awn-status: open\n..." }
  },
  write_page_schema: {
    input: { path: PAGE, content: "awn_schema:\n  topic:\n    fields: ..." },
    response: { mode: "layers", layers: { topic: { topic: { fields: {} } } } }
  },
  write_data_store_schema: {
    input: { store: "_base", content: "awn_schema:\n  record:\n    fields: ..." },
    response: { ok: true, store: "_base" }
  },
  write_system_file: { input: { name: "NOTE.md", content: "..." }, response: { name: "NOTE.md" } }
};

const READ_CALLS = [
  ["list_agents", () => api("GET", "/api/agents", { agentScope: false })],
  ["get_session_context", () => api("GET", "/api/agent/session-context")],
  ["get_mcp_docs", () => api("GET", "/api/mcp-docs", { query: { version: "0.0.2" }, agentScope: false })],
  ["get_menu", () => api("GET", "/api/menu")],
  ["get_active_context", () => api("GET", "/api/agent/active-context")],
  ["get_active_page", () => api("GET", "/api/agent/active-context")],
  [
    "search_workspace",
    () => api("GET", "/api/search", { query: { q: "тест", scope: "all", limit: 5 } })
  ],
  ["get_topic_registry", () => api("GET", "/api/agent/topic-registry")],
  ["get_always_context", () => api("GET", "/api/agent/always-context")],
  ["get_cron_registry", () => api("GET", "/api/agent/cron-registry")],
  ["get_heartbeat_registry", () => api("GET", "/api/agent/heartbeat-registry")],
  ["get_storage_layout", () => api("GET", "/api/agent/storage-layout")],
  ["get_workspace_table", () => api("GET", "/api/agent/workspace-table")],
  ["get_canonical_model", () => api("GET", "/api/agent/canonical-model")],
  ["get_site_map", () => api("GET", "/api/agent/site-map")],
  ["list_awn_types", () => api("GET", "/api/awn-types")],
  ["get_type_health", () => api("GET", "/api/agent/type-health")],
  ["list_data_stores", () => api("GET", "/api/awn-data")],
  ["get_data_store", () => api("GET", "/api/awn-data", { query: { store: STORE } })],
  ["read_data_store_schema", () => api("GET", "/api/awn-data/store-schema", { query: { store: STORE } })],
  ["list_type_catalog", () => api("GET", "/api/type-catalog", { agentScope: false })],
  ["list_components", () => api("GET", "/api/components", { agentScope: false })],
  ["get_platform_index", () => api("GET", "/api/platform/index", { agentScope: false })],
  ["get_page_meta", () => api("GET", "/api/page/meta", { query: { path: PAGE } })],
  ["page_exists", () => api("GET", "/api/page/exists", { query: { path: PAGE } })],
  ["read_page_body", () => api("GET", "/api/file", { query: { path: PAGE } })],
  ["read_page_properties", () => api("GET", "/api/file/properties", { query: { path: PAGE } })],
  [
    "read_page_schema",
    () => api("GET", "/api/file/topic-schema", { query: { path: PAGE, mode: "layers" } }),
    { sampleArgs: { path: PAGE, mode: "layers" } }
  ],
  ["read_page_config", () => api("GET", "/api/file/page-config", { query: { path: PAGE } })],
  ["read_page_env", () => api("GET", "/api/env", { query: { path: PAGE } })],
  ["list_page_slots", () => api("GET", "/api/page/slots", { query: { path: PAGE } })],
  ["list_page_types", () => api("GET", "/api/agent-system/create-node-types")],
  ["get_page_type", () => api("GET", "/api/agent-system/type", { query: { id: "awn.page.topic" } })],
  ["list_content_types", () => api("GET", "/api/agent/canonical-model")],
  ["get_content_type", () => api("GET", "/api/agent-system/type", { query: { id: "awn.content.record" } })],
  ["list_content", () => api("GET", "/api/external/files", { query: { path: PAGE } })],
  [
    "content_exists",
    () => api("GET", "/api/content/exists", { query: { path: PAGE, slot: "main-single", ref: "" } }),
    { sampleArgs: { path: PAGE, slot: "main-single" } }
  ],
  [
    "get_content_meta",
    () => api("GET", "/api/memory/internal", { query: { path: PAGE } }).then((payload) => ({
      path: PAGE,
      slot: "main-single",
      driver: "internal",
      ref: null,
      exists: Boolean(payload?.content != null)
    })),
    { sampleArgs: { path: PAGE, slot: "main-single" } }
  ],
  [
    "read_content_body",
    () =>
      api("GET", "/api/memory/internal", { query: { path: PAGE } }).then((p) => ({
        slot: "main-single",
        content: p?.content ?? ""
      })),
    { sampleArgs: { path: PAGE, slot: "main-single" } }
  ],
  [
    "read_content_properties",
    () =>
      api("GET", "/api/memory/internal", { query: { path: PAGE } }).then((p) => {
        const m = String(p?.content || "").match(/^---\r?\n([\s\S]*?)\r?\n---/);
        return { slot: "main-single", content: m?.[1] || "" };
      }),
    { sampleArgs: { path: PAGE, slot: "main-single" } }
  ],
  ["list_inbox", () => api("GET", "/api/inbox", { query: { path: PAGE } })],
  ["read_thread", () => api("GET", "/api/thread", { query: { path: PAGE } })],
  ["get_topic_intake", () => api("GET", "/api/topic/intake", { query: { path: PAGE } })],
  [
    "get_intake_batch",
    () => api("POST", "/api/intake/batch", { body: { paths: [PAGE] } }),
    { sampleArgs: { paths: [PAGE] } }
  ],
  ["list_comments", () => api("GET", "/api/file/comments", { query: { path: PAGE } })],
  ["list_adopt_folders", () => api("GET", "/api/workspace/folder/adopt")],
  [
    "browse_workspace_folder",
    () => api("GET", "/api/workspace/folder/browse", { query: { folderPath: "awn-container" } }),
    { sampleArgs: { folderPath: "awn-container" } }
  ],
  [
    "scan_workspace_folder",
    () =>
      api("GET", "/api/workspace/folder/scan", {
        query: { folderPath: "awn-container", depth: "1" }
      }),
    { sampleArgs: { folderPath: "awn-container", depth: 1 } }
  ],
  ["get_agent_system_status", () => api("GET", "/api/agent-system/status")],
  [
    "get_agent_system_type",
    () => api("GET", "/api/agent-system/type", { query: { id: "awn.page.topic" } }),
    { sampleArgs: { id: "awn.page.topic" } }
  ],
  [
    "read_agent_system_file",
    () => api("GET", "/api/agent-system/file", { query: { path: "GLOBAL_MCP_DOC.md" } }).catch(() =>
      api("GET", "/api/system-file", { query: { name: "GLOBAL_MCP_DOC.md" } })
    ),
    { sampleArgs: { path: "GLOBAL_MCP_DOC.md" } }
  ],
  ["shell_get_status", () => api("GET", "/api/shell/status")],
  ["list_system_files", () => api("GET", "/api/system-files")],
  ["read_system_file", () => api("GET", "/api/system-file", { query: { name: "AGENTS.md" } })]
];

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const index = [];
  let ok = 0;
  let err = 0;

  for (const [tool, fn, meta = {}] of READ_CALLS) {
    try {
      const raw = await fn();
      const { payload, truncated, responseBytes } = truncatePayload(raw);
      writeExample(tool, payload, { ...meta, truncated, responseBytes, live: true });
      index.push({ tool, folder: TOOL_FOLDER[tool] || "other", file: toolRelPath(tool), live: true, truncated, responseBytes });
      ok++;
      process.stdout.write(`✓ ${tool}${truncated ? ` (${responseBytes}B→slim)` : ""}\n`);
    } catch (e) {
      writeExample(
        tool,
        { _error: String(e.message), _note: "Live capture failed — check server/agent" },
        { ...meta, live: false, error: String(e.message) }
      );
      index.push({ tool, folder: TOOL_FOLDER[tool] || "other", file: toolRelPath(tool), live: false, error: String(e.message) });
      err++;
      process.stdout.write(`✗ ${tool}: ${e.message}\n`);
    }
  }

  for (const [tool, spec] of Object.entries(WRITE_ONLY)) {
    writeExample(tool, spec.response, {
      writeOnly: true,
      sampleArgs: spec.input,
      note: "Write-only — shape example, not live capture"
    });
    index.push({ tool, folder: TOOL_FOLDER[tool] || "other", file: toolRelPath(tool), writeOnly: true });
    ok++;
  }

  // Aliases / edge tools without separate API
  for (const tool of ["read_inbox_item", "read_content_file"]) {
    if (!fs.existsSync(toolOutPath(tool))) {
      const note =
        tool === "read_inbox_item"
          ? "GET /api/inbox/item?path=&file= — один inbox-файл с телом"
          : "GET /api/storage/file or /api/media/file — ref обязателен";
      writeExample(tool, { _note: note, _requires: "file/ref parameter" }, { live: false, note });
      index.push({ tool, folder: TOOL_FOLDER[tool] || "other", file: toolRelPath(tool), live: false, note });
    }
  }

  const byFolder = {};
  for (const r of index) {
    const f = r.folder || "other";
    if (!byFolder[f]) byFolder[f] = [];
    byFolder[f].push(r);
  }

  const folderOrder = Object.keys(FOLDER_LABELS);
  const sections = folderOrder
    .filter((f) => byFolder[f]?.length)
    .map((f) => {
      const rows = byFolder[f]
        .map(
          (r) =>
            `| \`${r.tool}\` | [${r.file}](${r.file}) | ${r.writeOnly ? "write" : r.live ? "yes" : "no"} | ${r.responseBytes ?? "—"} |`
        )
        .join("\n");
      return `## ${FOLDER_LABELS[f] || f} (\`${f}/\`)\n\n| Tool | File | Live | Bytes |\n|------|------|------|-------|\n${rows}`;
    })
    .join("\n\n");

  fs.writeFileSync(
    path.join(__dirname, "README.md"),
    `# MCP response examples

Agent: \`${AGENT}\` · Sample page: \`${PAGE}\`

${sections}

Generated: ${new Date().toISOString()}

## Also

- [\`1.json\`](1.json) — минимальный пример \`read_page_schema\` (пустые layers)
- [\`generate-examples.mjs\`](generate-examples.mjs) — перегенерация

\`\`\`bash
AGENT_CMS_AGENT=agent-cms-test node workspaces/agent-cms-core/temp/generate-examples.mjs
\`\`\`
`
  );

  fs.writeFileSync(
    path.join(__dirname, "index.json"),
    JSON.stringify({ agent: AGENT, page: PAGE, folders: FOLDER_LABELS, tools: index }, null, 2)
  );
  console.log(`\nDone: ${ok} files, ${err} errors → ${OUT_DIR}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
