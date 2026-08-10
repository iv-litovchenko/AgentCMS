#!/usr/bin/env node
/**
 * Generate slim MCP (58 tools) response examples → ./examples/new/
 * Run: node workspaces/agent-cms-core/temp2/generate-new-examples.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_SUBDIR = process.env.MCP_EXAMPLE_OUT || "new";
const OUT_DIR = path.join(__dirname, "examples", OUT_SUBDIR);

const TOOL_FOLDER = {
  get_session_context: "start",
  get_user_active_context_now: "start",
  list_workspace_always_context: "start",
  list_workspace_cron: "start",
  list_workspace_heartbeat: "start",

  get_page_map: "navigation",
  get_content_map: "navigation",
  search_workspace_content: "navigation",

  read_page_body: "page",
  write_page_body: "page",
  read_page_properties: "page",
  write_page_properties: "page",
  read_page_property: "page",
  write_page_property: "page",
  read_page_schema: "page",
  write_page_schema: "page",
  create_page: "page",
  delete_page: "page",
  rename_page: "page",
  move_page: "page",

  list_page_slots: "slot",

  read_content_body: "content",
  write_content_body: "content",
  read_content_properties: "content",
  write_content_properties: "content",
  read_content_property: "content",
  write_content_property: "content",
  create_content: "content",
  import_content_from_url: "content",
  rename_content: "content",
  move_content: "content",
  delete_content: "content",

  list_types: "types",
  get_type: "types",

  list_data_stores: "data",
  get_data_store: "data",
  create_data_store: "data",
  create_data_record: "data",
  read_data_store_schema: "data",
  read_store_properties: "data",
  write_store_properties: "data",
  read_store_property: "data",
  write_store_property: "data",
  read_record_properties: "data",
  write_record_properties: "data",
  read_record_property: "data",
  write_record_property: "data",

  list_inbox: "intake",
  triage_inbox_item: "intake",
  read_dialogs: "intake",
  append_dialog: "intake",

  list_system_files: "fs",
  read_file: "fs",
  write_file: "fs",
  upload_file: "fs",
  upload_file_from_url: "fs",
  list_folder: "fs",

  notify_user: "notify"
};

const FOLDER_LABELS = {
  start: "Старт / контекст",
  navigation: "Навигация",
  page: "Страница",
  slot: "Слот",
  content: "Контент",
  types: "Типы",
  data: "AWN-DATA / инфоблоки",
  intake: "Inbox / диалоги",
  fs: "Система + FS",
  notify: "Уведомление"
};

const ALL_TOOLS = Object.keys(TOOL_FOLDER);

const BASE = process.env.AGENT_CMS_BASE_URL || "http://127.0.0.1:3000";
const AGENT = process.env.AGENT_CMS_AGENT || "agent-cms-core";
const PAGE = process.env.MCP_EXAMPLE_PAGE || "manifest.md";
const STORE = process.env.MCP_EXAMPLE_STORE || "tasks";
const CONTENT_SLOT = "main";
const CONTENT_REF = process.env.MCP_EXAMPLE_CONTENT_REF || "";
const FS_READ_PATH = "AGENTS.md";
const FS_LIST_PATH = "awn-container";

const MAX_BYTES = 80_000;

async function api(method, apiPath, { query = {}, body, agentScope = true } = {}) {
  const url = new URL(apiPath, BASE);
  for (const [k, v] of Object.entries(query)) {
    if (v != null && v !== "") url.searchParams.set(k, String(v));
  }
  if (agentScope) url.searchParams.set("agent", AGENT);
  const init = {
    method,
    headers: { Accept: "application/json", "X-Activity-Source": "mcp-new-examples" }
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
        _note: "Full response too large; slim preview",
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
      _note: "Response extremely large",
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
    if (key === "nodes" && Array.isArray(value) && value.length > 4) {
      out.nodes = value.slice(0, 3);
      out._nodesTotal = value.length;
      continue;
    }
    if (key === "stores" && Array.isArray(value) && value.length > 3) {
      out.stores = value.slice(0, 2);
      out._storesTotal = value.length;
      continue;
    }
    if (key === "types" && value && typeof value === "object") {
      const ids = Object.keys(value).slice(0, 2);
      out.types = Object.fromEntries(ids.map((id) => [id, value[id]]));
      out._typesTotal = Object.keys(value).length;
      continue;
    }
    if (key === "items" && Array.isArray(value) && value.length > 3) {
      out.items = value.slice(0, 2);
      out._itemsTotal = value.length;
      continue;
    }
    if (key === "content" && typeof value === "string" && value.length > 1200) {
      out.content = value.slice(0, 800) + "\n…";
      out._contentChars = value.length;
      continue;
    }
    if (key === "baseTypes" || key === "merged" || key === "fieldRegistry") {
      out[key] = { _omitted: true, _reason: "legacy bloat — use mode=layers or get_type" };
      continue;
    }
    out[key] = value;
  }
  return out;
}

function toolOutPath(tool) {
  const folder = TOOL_FOLDER[tool] || "other";
  const dir = path.join(OUT_DIR, folder);
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${tool}.json`);
}

function writeExample(tool, payload, meta = {}) {
  const file = toolOutPath(tool);
  const doc = {
    tool,
    section: TOOL_FOLDER[tool] || "other",
    sectionLabel: FOLDER_LABELS[TOOL_FOLDER[tool]] || "Other",
    agent: AGENT,
    mcpVersion: "0.3.0-slim-58",
    capturedAt: new Date().toISOString(),
    sampleArgs: meta.sampleArgs ?? null,
    ...meta,
    response: payload
  };
  fs.writeFileSync(file, JSON.stringify(doc, null, 2) + "\n");
  return file;
}

const WRITE_ONLY = {
  write_page_body: {
    sampleArgs: { path: PAGE, content: "# Тело страницы\n\nТекст." },
    response: { path: PAGE, content: "# Тело страницы\n\nТекст." }
  },
  write_page_properties: {
    sampleArgs: { path: PAGE, content: "awn-status: open" },
    response: { path: PAGE, content: "awn-status: open\n…" }
  },
  write_page_property: {
    sampleArgs: { path: PAGE, key: "awn-status", value: "open" },
    response: { path: PAGE, key: "awn-status", value: "open", content: "…" }
  },
  write_page_schema: {
    sampleArgs: { path: PAGE, content: "awn_schema:\n  topic:\n    fields: { … }" },
    response: { mode: "layers", layers: { topic: { fields: {} } } }
  },
  create_page: {
    sampleArgs: { parentPath: "awn-container", type: "file", displayName: "Новая тема" },
    response: { path: "awn-container/novaya-tema/manifest.md" }
  },
  delete_page: { sampleArgs: { path: PAGE }, response: { ok: true, path: PAGE } },
  rename_page: {
    sampleArgs: { path: PAGE, displayName: "Новое имя" },
    response: { path: PAGE, title: "Новое имя" }
  },
  move_page: {
    sampleArgs: { path: PAGE, parentPath: "awn-container" },
    response: { path: "awn-container/…/manifest.md" }
  },
  write_content_body: {
    sampleArgs: { path: PAGE, slot: "main-single", content: "# Память\n\n…" },
    response: { slot: "main-single", ok: true }
  },
  write_content_properties: {
    sampleArgs: { path: PAGE, slot: CONTENT_SLOT, ref: CONTENT_REF, content: "awn-status: open" },
    response: { file: `${CONTENT_SLOT}/${CONTENT_REF}` }
  },
  write_content_property: {
    sampleArgs: { path: PAGE, slot: CONTENT_SLOT, ref: CONTENT_REF, key: "awn-status", value: "open" },
    response: { file: `${CONTENT_SLOT}/${CONTENT_REF}`, key: "awn-status", value: "open" }
  },
  create_content: {
    sampleArgs: { path: PAGE, slot: "notes", title: "Заметка" },
    response: { path: PAGE, file: "notes/zametka.md" }
  },
  import_content_from_url: {
    sampleArgs: { path: PAGE, slot: "media", url: "https://example.com/file.png" },
    response: { file: "media/file.png", sourceUrl: "https://example.com/file.png" }
  },
  rename_content: {
    sampleArgs: { path: PAGE, slot: CONTENT_SLOT, ref: CONTENT_REF, displayName: "Новое имя" },
    response: { ok: true }
  },
  move_content: {
    sampleArgs: { path: PAGE, slot: CONTENT_SLOT, ref: CONTENT_REF, targetRef: "fail-1-2.md" },
    response: { ok: true }
  },
  delete_content: {
    sampleArgs: { path: PAGE, slot: CONTENT_SLOT, ref: CONTENT_REF },
    response: { ok: true }
  },
  create_data_store: {
    sampleArgs: { slug: "my-store", kind: "collection", name: "Мой store" },
    response: { ok: true, store: { relPath: "my-store" } }
  },
  create_data_record: {
    sampleArgs: { store: STORE, title: "Запись" },
    response: { ok: true, store: { records: [{ id: "1" }] } }
  },
  write_store_properties: {
    sampleArgs: { store: STORE, content: "awn-name: Накопитель" },
    response: { store: STORE, content: "awn-name: Накопитель\n…" }
  },
  write_store_property: {
    sampleArgs: { store: STORE, key: "awn-name", value: "Накопитель" },
    response: { store: STORE, key: "awn-name", value: "Накопитель" }
  },
  write_record_properties: {
    sampleArgs: { store: STORE, record: "1", content: "awn-title: Элемент" },
    response: { store: STORE, record: "1", content: "awn-title: Элемент\n…" }
  },
  write_record_property: {
    sampleArgs: { store: STORE, record: "1", key: "awn-title", value: "Элемент" },
    response: { store: STORE, record: "1", key: "awn-title", value: "Элемент" }
  },
  write_file: {
    sampleArgs: { path: "NOTE.md", content: "# Note\n\n…" },
    response: { path: "NOTE.md", ok: true }
  },
  upload_file: {
    sampleArgs: { path: "awn-container/x.png", data: "<base64>", mimeType: "image/png" },
    response: { path: "awn-container/x.png", size: 1234 }
  },
  upload_file_from_url: {
    sampleArgs: { path: "awn-container/x.png", url: "https://example.com/x.png" },
    response: { path: "awn-container/x.png", sourceUrl: "https://example.com/x.png" }
  },
  triage_inbox_item: {
    sampleArgs: { path: PAGE, file: "inbox/x.md", action: "mark-done" },
    response: { ok: true }
  },
  append_dialog: {
    sampleArgs: { path: PAGE, body: "Сообщение агента", role: "agent" },
    response: { ok: true, id: "20260808-120000.md" }
  },
  notify_user: {
    sampleArgs: { title: "Готово", message: "Задача выполнена", path: PAGE },
    response: { ok: true }
  }
};

async function discoverExamplePage() {
  if (process.env.MCP_EXAMPLE_PAGE) return process.env.MCP_EXAMPLE_PAGE;
  try {
    const map = await api("GET", "/api/agent/page-map");
    const topic =
      (map?.nodes || []).find((n) => n.kind === "topic" && n.hasManifest !== false)?.path ||
      (map?.nodes || []).find((n) => n.hasManifest)?.path;
    return topic || "manifest.md";
  } catch {
    return "manifest.md";
  }
}

async function discoverContentRef(page) {
  if (CONTENT_REF) return CONTENT_REF;
  try {
    const payload = await api("GET", "/api/agent/content-map", { query: { path: page, slot: CONTENT_SLOT } });
    const items = payload?.slots?.main?.items || payload?.items || [];
    const item = items[0];
    return item?.ref || item?.relativePath || item?.file || "";
  } catch {
    return "";
  }
}

async function discoverContentMode(page, contentRef) {
  if (contentRef) return { slot: CONTENT_SLOT, ref: contentRef, internal: false };
  try {
    await api("GET", "/api/memory/internal", { query: { path: page } });
    return { slot: "main-single", ref: null, internal: true };
  } catch {
    return { slot: "main-single", ref: null, internal: true };
  }
}

async function discoverRecordId() {
  try {
    const payload = await api("GET", "/api/awn-data", { query: { store: STORE } });
    const rec = payload?.store?.records?.[0]?.id;
    return rec ? String(rec) : "1";
  } catch {
    return "1";
  }
}

async function buildReadCalls(page, recordId, contentMode) {
  const { slot: contentSlot, ref: contentRef, internal: contentInternal } = contentMode;
  return [
    ["get_session_context", () => api("GET", "/api/agent/session-context")],
    ["get_user_active_context_now", () => api("GET", "/api/agent/active-context")],
    ["list_workspace_always_context", () => api("GET", "/api/agent/always-context")],
    ["list_workspace_cron", () => api("GET", "/api/agent/cron-registry")],
    ["list_workspace_heartbeat", () => api("GET", "/api/agent/heartbeat-registry")],

    ["get_page_map", () => api("GET", "/api/agent/page-map")],
    [
      "get_content_map",
      () => api("GET", "/api/agent/content-map", { query: { path: page } }),
      { sampleArgs: { path: page } }
    ],
    [
      "search_workspace_content",
      () => api("GET", "/api/search", { query: { q: "тест", scope: "all", limit: 5 } }),
      { sampleArgs: { query: "тест", scope: "all", limit: 5 } }
    ],

    ["read_page_body", () => api("GET", "/api/file", { query: { path: page } }), { sampleArgs: { path: page } }],
    [
      "read_page_properties",
      () => api("GET", "/api/file/properties", { query: { path: page } }),
      { sampleArgs: { path: page } }
    ],
    [
      "read_page_property",
      () => api("GET", "/api/file/properties", { query: { path: page, key: "awn-name" } }),
      { sampleArgs: { path: page, key: "awn-name" } }
    ],
    [
      "read_page_schema",
      () => api("GET", "/api/file/page-schema", { query: { path: page, mode: "layers" } }),
      { sampleArgs: { path: page, mode: "layers" } }
    ],

    [
      "list_page_slots",
      () => api("GET", "/api/page/slots", { query: { path: page } }),
      { sampleArgs: { path: page } }
    ],

    [
      "read_content_body",
      () =>
        contentInternal
          ? api("GET", "/api/memory/internal", { query: { path: page } }).then((p) => ({
              slot: contentSlot,
              content: String(p?.content || "").replace(/^---[\s\S]*?---\n?/, "")
            }))
          : api("GET", "/api/storage/markdown", {
              query: { path: page, folder: "main", file: contentRef }
            }).then((p) => ({
              file: p?.file || contentRef,
              content: String(p?.content || "").replace(/^---[\s\S]*?---\n?/, "")
            })),
      { sampleArgs: contentInternal ? { path: page, slot: contentSlot } : { path: page, slot: contentSlot, ref: contentRef } }
    ],
    [
      "read_content_properties",
      () =>
        contentInternal
          ? api("GET", "/api/memory/internal", { query: { path: page } }).then((p) => {
              const m = String(p?.content || "").match(/^---\r?\n([\s\S]*?)\r?\n---/);
              return { slot: contentSlot, content: m?.[1] || "" };
            })
          : api("GET", "/api/storage/markdown", {
              query: { path: page, folder: "main", file: contentRef }
            }).then((p) => {
              const m = String(p?.content || "").match(/^---\r?\n([\s\S]*?)\r?\n---/);
              return { file: p?.file || contentRef, content: m?.[1] || "" };
            }),
      { sampleArgs: contentInternal ? { path: page, slot: contentSlot } : { path: page, slot: contentSlot, ref: contentRef } }
    ],
    [
      "read_content_property",
      async () => {
        const p = contentInternal
          ? await api("GET", "/api/memory/internal", { query: { path: page } })
          : await api("GET", "/api/storage/markdown", {
              query: { path: page, folder: "main", file: contentRef }
            });
        const m = String(p?.content || "").match(/^---\r?\n([\s\S]*?)\r?\n---/);
        const fm = m?.[1] || "";
        const line = fm.match(/^awn-name:\s*(.+)$/im);
        const base = contentInternal
          ? { slot: contentSlot, key: "awn-name", value: line?.[1]?.trim().replace(/^["']|["']$/g, "") || "", exists: Boolean(line) }
          : {
              file: p?.file || contentRef,
              key: "awn-name",
              value: line?.[1]?.trim().replace(/^["']|["']$/g, "") || "",
              exists: Boolean(line)
            };
        return base;
      },
      {
        sampleArgs: contentInternal
          ? { path: page, slot: contentSlot, key: "awn-name" }
          : { path: page, slot: contentSlot, ref: contentRef, key: "awn-name" }
      }
    ],

    ["list_types", () => api("GET", "/api/agent-system/types")],
    [
      "get_type",
      () => api("GET", "/api/agent-system/type", { query: { id: "awn.page.topic" } }),
      { sampleArgs: { id: "awn.page.topic" } }
    ],

    ["list_data_stores", () => api("GET", "/api/awn-data")],
    [
      "get_data_store",
      () => api("GET", "/api/awn-data", { query: { store: STORE } }),
      { sampleArgs: { store: STORE } }
    ],
    [
      "read_data_store_schema",
      () => api("GET", "/api/awn-data/store-schema", { query: { store: STORE } }),
      { sampleArgs: { store: STORE } }
    ],
    [
      "read_store_properties",
      () => api("GET", "/api/awn-data/store-properties", { query: { store: STORE } }),
      { sampleArgs: { store: STORE } }
    ],
    [
      "read_store_property",
      () => api("GET", "/api/awn-data/store-properties", { query: { store: STORE, key: "awn-name" } }),
      { sampleArgs: { store: STORE, key: "awn-name" } }
    ],
    [
      "read_record_properties",
      () =>
        api("GET", "/api/awn-data/record-properties", { query: { store: STORE, record: recordId } }),
      { sampleArgs: { store: STORE, record: recordId } }
    ],
    [
      "read_record_property",
      () =>
        api("GET", "/api/awn-data/record-properties", {
          query: { store: STORE, record: recordId, key: "awn-title" }
        }),
      { sampleArgs: { store: STORE, record: recordId, key: "awn-title" } }
    ],

    ["list_inbox", () => api("GET", "/api/inbox", { query: { path: page } }), { sampleArgs: { path: page } }],
    ["read_dialogs", () => api("GET", "/api/dialogs", { query: { path: page } }), { sampleArgs: { path: page } }],

    ["list_system_files", () => api("GET", "/api/system-files")],
    [
      "read_file",
      () => api("GET", "/api/workspace/fs/read", { query: { path: FS_READ_PATH } }),
      { sampleArgs: { path: FS_READ_PATH } }
    ],
    [
      "list_folder",
      () => api("GET", "/api/workspace/fs/list", { query: { path: FS_LIST_PATH, depth: "1" } }),
      { sampleArgs: { path: FS_LIST_PATH, depth: 1 } }
    ]
  ];
}

function writeReadme(index, page) {
  const lines = [
    "# MCP slim examples (58 tools)",
    "",
    `Agent: \`${AGENT}\` · Page: \`${page}\` · Store: \`${STORE}\``,
    "",
    "Сгенерировано: `generate-new-examples.mjs` · Канон: [mcp-optimiz.md](mcp-optimiz.md)",
    ""
  ];
  let current = "";
  for (const entry of index) {
    if (entry.section !== current) {
      current = entry.section;
      lines.push(`## ${FOLDER_LABELS[current] || current}`, "");
      lines.push("| Tool | File | Live | Bytes |", "|------|------|------|-------|");
    }
    const live = entry.live ? "yes" : entry.writeOnly ? "write" : "no";
    const bytes = entry.responseBytes ?? "—";
    lines.push(`| \`${entry.tool}\` | [${entry.file}](${entry.file}) | ${live} | ${bytes} |`);
    if (entry.section !== index[index.indexOf(entry) + 1]?.section) {
      lines.push("");
    }
  }
  lines.push(`**Итого:** ${index.length} tools`, "");
  fs.writeFileSync(path.join(OUT_DIR, "README.md"), lines.join("\n") + "\n");
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const page = await discoverExamplePage();
  const recordId = await discoverRecordId();
  const contentRef = await discoverContentRef(page);
  const contentMode = await discoverContentMode(page, contentRef);
  for (const spec of Object.values(WRITE_ONLY)) {
    if (spec.sampleArgs) {
      if ("path" in spec.sampleArgs) spec.sampleArgs.path = page;
      if ("ref" in spec.sampleArgs) spec.sampleArgs.ref = contentRef || "example.md";
      if (spec.sampleArgs.slot === CONTENT_SLOT && contentMode.internal) {
        spec.sampleArgs.slot = contentMode.slot;
        delete spec.sampleArgs.ref;
      }
    }
  }
  const READ_CALLS = await buildReadCalls(page, recordId, contentMode);
  const index = [];
  let ok = 0;
  let err = 0;

  for (const [tool, fn, meta = {}] of READ_CALLS) {
    try {
      const raw = await fn();
      const { payload, truncated, responseBytes } = truncatePayload(raw);
      writeExample(tool, payload, { ...meta, truncated, responseBytes, live: true, writeOnly: false });
      index.push({
        tool,
        section: TOOL_FOLDER[tool],
        file: `${OUT_SUBDIR}/${TOOL_FOLDER[tool]}/${tool}.json`,
        live: true,
        writeOnly: false,
        truncated,
        responseBytes
      });
      ok++;
      process.stdout.write(`✓ ${tool}${truncated ? ` (${responseBytes}B→slim)` : ""}\n`);
    } catch (e) {
      writeExample(
        tool,
        { _error: String(e.message), _note: "Live capture failed — check server/agent" },
        { ...meta, live: false, writeOnly: false, error: String(e.message) }
      );
      index.push({
        tool,
        section: TOOL_FOLDER[tool],
        file: `${OUT_SUBDIR}/${TOOL_FOLDER[tool]}/${tool}.json`,
        live: false,
        writeOnly: false,
        error: String(e.message)
      });
      err++;
      process.stdout.write(`✗ ${tool}: ${e.message}\n`);
    }
  }

  for (const tool of ALL_TOOLS) {
    if (index.some((e) => e.tool === tool)) continue;
    const spec = WRITE_ONLY[tool];
    if (!spec) {
      writeExample(tool, { _note: "No live or write-only template" }, { live: false, writeOnly: false });
      index.push({ tool, section: TOOL_FOLDER[tool], file: `${OUT_SUBDIR}/${TOOL_FOLDER[tool]}/${tool}.json`, live: false });
      continue;
    }
    writeExample(tool, spec.response, {
      sampleArgs: spec.sampleArgs,
      live: false,
      writeOnly: true,
      note: "Write-only — shape example, not live capture"
    });
    index.push({
      tool,
      section: TOOL_FOLDER[tool],
      file: `${OUT_SUBDIR}/${TOOL_FOLDER[tool]}/${tool}.json`,
      live: false,
      writeOnly: true
    });
    process.stdout.write(`◦ ${tool} (write-only shape)\n`);
  }

  index.sort((a, b) => ALL_TOOLS.indexOf(a.tool) - ALL_TOOLS.indexOf(b.tool));
  fs.writeFileSync(
    path.join(OUT_DIR, "index.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        agent: AGENT,
        page,
        store: STORE,
        contentRef: contentRef || null,
        contentMode,
        recordId,
        toolCount: index.length,
        liveOk: ok,
        liveErr: err,
        tools: index
      },
      null,
      2
    ) + "\n"
  );
  writeReadme(index, page);
  console.log(`\nDone: ${ok} live, ${err} errors, ${index.length} total → ${OUT_DIR}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
