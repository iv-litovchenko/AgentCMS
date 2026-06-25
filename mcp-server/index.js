#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { AgentCmsClient, getConfig, jsonText } from "./lib/client.js";

const nodePath = z.string().min(1).describe("Path to _registration.md, e.g. 05 Хобби/MyArea/_registration.md");
const extFile = z.string().min(1).describe("Relative path inside memory/ or media/");

function textResult(data) {
  return { content: [{ type: "text", text: typeof data === "string" ? data : jsonText(data) }] };
}

function toolError(message) {
  return { content: [{ type: "text", text: message }], isError: true };
}

function wrap(handler) {
  return async (args) => {
    try {
      return textResult(await handler(args));
    } catch (e) {
      return toolError(e.message);
    }
  };
}

function createServer() {
  const cfg = getConfig();
  const client = new AgentCmsClient(cfg);
  const agentNote = cfg.defaultAgent
    ? ` Agent: ${cfg.defaultAgent}.`
    : " Uses default agent from registry.";

  const server = new McpServer({ name: "agent-cms", version: "0.1.0" });

  const reg = (name, description, schema, fn) => {
    server.registerTool(name, { description: description + agentNote, inputSchema: schema }, wrap(fn));
  };

  reg("list_agents", "List agents from registry.", z.object({}), () =>
    client.get("/api/agents", {}, { agentScope: false })
  );

  reg("get_menu", "Node tree for workspace.", z.object({}), () => client.get("/api/menu"));

  reg(
    "search_workspace",
    "Search workspace.",
    z.object({
      query: z.string().min(1),
      scope: z.enum(["content", "filename", "description", "tags"]).optional(),
      limit: z.number().int().min(1).max(100).optional()
    }),
    ({ query, scope, limit }) =>
      client.get("/api/search", { q: query, scope: scope || "content", limit: limit || 25 })
  );

  reg("list_components", "Platform component registry (fields, blocks, frames, …).", z.object({}), () =>
    client.get("/api/components", {}, { agentScope: false })
  );

  reg("list_platform_catalogs", "Global platform catalogs (tags, categories, statuses, …).", z.object({}), () =>
    client.get("/api/platform/catalogs", {}, { agentScope: false })
  );

  reg("list_agent_catalogs", "Merged global + local catalogs for current agent.", z.object({}), () =>
    client.get("/api/agent/catalogs")
  );

  reg("get_platform_index", "Platform navigation index from data/index.json.", z.object({}), () =>
    client.get("/api/platform/index", {}, { agentScope: false })
  );

  reg(
    "add_catalog_item",
    "Add item to agent-local or platform-global catalog CSV.",
    z.object({
      preset: z.enum(["tags", "categories", "statuses", "users", "priorities", "colors"]),
      id: z.string().optional(),
      label: z.string().optional(),
      color: z.string().optional(),
      email: z.string().optional()
    }),
    (payload) => client.post("/api/agent/catalogs/items", payload)
  );

  reg("read_node_description", "Read _registration.md.", z.object({ path: nodePath }), ({ path }) =>
    client.get("/api/file", { path })
  );

  reg(
    "write_node_description",
    "Save _registration.md.",
    z.object({ path: nodePath, content: z.string() }),
    ({ path, content }) => client.post("/api/file/content", { path, content })
  );

  reg("read_node_properties", "Read frontmatter from _registration.md.", z.object({ path: nodePath }), ({ path }) =>
    client.get("/api/file/properties", { path })
  );

  reg(
    "write_node_properties",
    "Save frontmatter to _registration.md.",
    z.object({ path: nodePath, content: z.string() }),
    ({ path, content }) => client.post("/api/file/properties", { path, content })
  );

  reg(
    "create_node",
    "Create folder node or part.",
    z.object({
      parentPath: z.string().optional(),
      type: z.enum(["folder", "file"]),
      name: z.string().min(1)
    }),
    ({ parentPath, type, name }) =>
      client.post("/api/node/create", { parentPath: parentPath || ".", type, name })
  );

  reg("delete_node", "Delete node part or folder.", z.object({ path: nodePath }), ({ path }) =>
    client.delete("/api/file", { path })
  );

  reg("read_internal_memory", "Read single-file memory (_.node.memory.md).", z.object({ path: nodePath }), ({ path }) =>
    client.get("/api/memory/internal", { path })
  );

  reg(
    "write_internal_memory",
    "Save single-file memory.",
    z.object({ path: nodePath, content: z.string() }),
    ({ path, content }) => client.post("/api/memory/internal", { path, content })
  );

  reg("list_external_memory", "List memory/ files.", z.object({ path: nodePath }), ({ path }) =>
    client.get("/api/external/files", { path })
  );

  reg(
    "read_external_memory",
    "Read memory/ .md.",
    z.object({ path: nodePath, file: extFile }),
    ({ path, file }) => client.get("/api/external/file", { path, file })
  );

  reg(
    "write_external_memory",
    "Save memory/ .md.",
    z.object({ path: nodePath, file: extFile, content: z.string() }),
    ({ path, file, content }) => client.post("/api/external/file", { path, file, content })
  );

  reg(
    "create_external_memory",
    "Create memory note in memory/.",
    z.object({ path: nodePath, title: z.string().optional() }),
    ({ path, title }) => client.post("/api/external/file/create", { path, title })
  );

  reg("read_todo", "Read node todo (`*.node.todo.md`).", z.object({ path: nodePath }), ({ path }) =>
    client.get("/api/todo", { path })
  );

  reg(
    "write_todo",
    "Save node todo (`*.node.todo.md`).",
    z.object({ path: nodePath, content: z.string() }),
    ({ path, content }) => client.post("/api/todo", { path, content })
  );

  reg("read_configuration", "Read configuration.yml.", z.object({ path: nodePath }), ({ path }) =>
    client.get("/api/configuration", { path })
  );

  reg(
    "write_configuration",
    "Save configuration.yml.",
    z.object({ path: nodePath, content: z.string() }),
    ({ path, content }) => client.post("/api/configuration", { path, content })
  );

  reg("read_env", "Read .env.", z.object({ path: nodePath }), ({ path }) => client.get("/api/env", { path }));

  reg(
    "write_env",
    "Save .env.",
    z.object({ path: nodePath, content: z.string() }),
    ({ path, content }) => client.post("/api/env", { path, content })
  );

  reg(
    "list_folder",
    "List inbox/, scripts/, etc.",
    z.object({ path: nodePath, folder: z.string().min(1) }),
    ({ path, folder }) => client.get("/api/folder/view", { path, folder })
  );

  reg("list_inbox", "List inbox items with triage metadata.", z.object({ path: nodePath }), ({ path }) =>
    client.get("/api/inbox", { path })
  );

  reg(
    "read_inbox_item",
    "Read a single inbox item with full body and metadata.",
    z.object({ path: nodePath, file: z.string().min(1) }),
    ({ path, file }) => client.get("/api/inbox/item", { path, file })
  );

  reg(
    "triage_inbox_item",
    "Triage inbox item: to-thread, to-content, mark-done, set-status.",
    z.object({
      path: nodePath,
      file: z.string().min(1),
      action: z.enum(["to-thread", "to-content", "mark-done", "set-status"]),
      status: z.enum(["new", "in-progress", "done"]).optional()
    }),
    ({ path, file, action, status }) => client.post("/api/inbox/triage", { path, file, action, status })
  );

  reg("read_thread", "Read topic dialogue thread messages.", z.object({
    path: nodePath,
    mode: z.string().optional(),
    file: z.string().optional(),
    name: z.string().optional()
  }), ({ path, mode, file, name }) =>
    client.get("/api/thread", { path, mode, file, name })
  );

  reg(
    "append_thread",
    "Append message to topic dialogue thread.",
    z.object({
      path: nodePath,
      body: z.string().min(1),
      role: z.enum(["user", "agent"]).optional(),
      author: z.string().optional(),
      linkedFiles: z.string().optional(),
      mode: z.string().optional(),
      file: z.string().optional(),
      name: z.string().optional()
    }),
    ({ path, body, role, author, linkedFiles, mode, file, name }) =>
      client.post("/api/thread", { path, body, role, author, linkedFiles, mode, file, name })
  );

  reg("get_topic_intake", "Inbox pending + thread summary for a topic.", z.object({ path: nodePath }), ({ path }) =>
    client.get("/api/topic/intake", { path })
  );

  reg(
    "get_intake_batch",
    "Batch inbox/thread summary for multiple topics.",
    z.object({ paths: z.array(nodePath).min(1).max(120) }),
    ({ paths }) => client.post("/api/intake/batch", { paths })
  );

  reg(
    "create_inbox_item",
    "Create inbox intake note for a topic.",
    z.object({
      path: nodePath,
      title: z.string().optional(),
      body: z.string().optional(),
      source: z.string().optional(),
      author: z.string().optional()
    }),
    ({ path, title, body, source, author }) =>
      client.post("/api/inbox/create", { path, title, body, source, author })
  );

  reg(
    "list_comments",
    "List human discussion comments on a node or file (Overview/Navigation scope).",
    z.object({
      path: nodePath,
      mode: z.string().optional(),
      file: z.string().optional(),
      name: z.string().optional()
    }),
    ({ path, mode, file, name }) => client.get("/api/file/comments", { path, mode, file, name })
  );

  reg(
    "append_comment",
    "Append a comment to node/file discussion thread.",
    z.object({
      path: nodePath,
      body: z.string().min(1),
      author: z.string().optional(),
      replyTo: z.string().optional(),
      mode: z.string().optional(),
      file: z.string().optional(),
      name: z.string().optional()
    }),
    ({ path, body, author, replyTo, mode, file, name }) =>
      client.post("/api/file/comments", { path, body, author, replyTo, mode, file, name })
  );

  reg(
    "toggle_comment_reaction",
    "Toggle 👍 reaction on a comment.",
    z.object({
      path: nodePath,
      commentId: z.string().min(1),
      author: z.string().optional(),
      reaction: z.enum(["up"]).optional(),
      mode: z.string().optional(),
      file: z.string().optional(),
      name: z.string().optional()
    }),
    ({ path, commentId, author, reaction, mode, file, name }) =>
      client.post("/api/file/comments/reaction", {
        path,
        commentId,
        author,
        reaction: reaction || "up",
        mode,
        file,
        name
      })
  );

  reg("list_media", "List media/.", z.object({ path: nodePath }), ({ path }) =>
    client.get("/api/media", { path })
  );

  reg(
    "read_media_sidecar",
    "Read media sidecar.",
    z.object({ path: nodePath, file: extFile }),
    ({ path, file }) => client.get("/api/media/sidecar", { path, file })
  );

  reg(
    "write_media_sidecar",
    "Save media sidecar.",
    z.object({ path: nodePath, file: extFile, content: z.string() }),
    ({ path, file, content }) => client.post("/api/media/sidecar", { path, file, content })
  );

  reg("list_system_files", "List agent system files.", z.object({}), () => client.get("/api/system-files"));

  reg(
    "read_system_file",
    "Read system file.",
    z.object({ name: z.string().min(1) }),
    ({ name }) => client.get("/api/system-file", { name })
  );

  reg(
    "write_system_file",
    "Write system file.",
    z.object({ name: z.string().min(1), content: z.string() }),
    ({ name, content }) => client.post("/api/system-file", { name, content })
  );

  reg("get_api_reference", "HTTP API docs JSON.", z.object({}), () =>
    client.get("/api/docs", {}, { agentScope: false })
  );

  return server;
}

const server = createServer();
const transport = new StdioServerTransport();
await server.connect(transport);
