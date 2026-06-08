#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { AgentCmsClient, getConfig, jsonText } from "./lib/client.js";

const nodePath = z.string().min(1).describe("Path to _REGINFO.md, e.g. 05 Хобби/MyArea/_REGINFO.md");
const extFile = z.string().min(1).describe("Relative path inside _Content or _Assets");

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
      scope: z.enum(["content", "filename", "description"]).optional(),
      limit: z.number().int().min(1).max(100).optional()
    }),
    ({ query, scope, limit }) =>
      client.get("/api/search", { q: query, scope: scope || "content", limit: limit || 25 })
  );

  reg("read_node_description", "Read _REGINFO.md.", z.object({ path: nodePath }), ({ path }) =>
    client.get("/api/file", { path })
  );

  reg(
    "write_node_description",
    "Save _REGINFO.md.",
    z.object({ path: nodePath, content: z.string() }),
    ({ path, content }) => client.post("/api/file/content", { path, content })
  );

  reg("read_node_properties", "Read frontmatter from _REGINFO.md.", z.object({ path: nodePath }), ({ path }) =>
    client.get("/api/file/properties", { path })
  );

  reg(
    "write_node_properties",
    "Save frontmatter to _REGINFO.md.",
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

  reg("read_internal_memory", "Read single-file memory (_.node.content.md).", z.object({ path: nodePath }), ({ path }) =>
    client.get("/api/memory/internal", { path })
  );

  reg(
    "write_internal_memory",
    "Save single-file memory.",
    z.object({ path: nodePath, content: z.string() }),
    ({ path, content }) => client.post("/api/memory/internal", { path, content })
  );

  reg("list_external_memory", "List _Content files.", z.object({ path: nodePath }), ({ path }) =>
    client.get("/api/external/files", { path })
  );

  reg(
    "read_external_memory",
    "Read _Content .md.",
    z.object({ path: nodePath, file: extFile }),
    ({ path, file }) => client.get("/api/external/file", { path, file })
  );

  reg(
    "write_external_memory",
    "Save _Content .md.",
    z.object({ path: nodePath, file: extFile, content: z.string() }),
    ({ path, file, content }) => client.post("/api/external/file", { path, file, content })
  );

  reg(
    "create_external_memory",
    "Create memory note in _Content.",
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

  reg("read_configuration", "Read Configuration.md.", z.object({ path: nodePath }), ({ path }) =>
    client.get("/api/configuration", { path })
  );

  reg(
    "write_configuration",
    "Save Configuration.md.",
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
    "List _Inbox, _Scripts, etc.",
    z.object({ path: nodePath, folder: z.string().min(1) }),
    ({ path, folder }) => client.get("/api/folder/view", { path, folder })
  );

  reg("list_media", "List _Assets.", z.object({ path: nodePath }), ({ path }) =>
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
