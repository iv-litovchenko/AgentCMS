import { z } from "zod";
import { readFileHandler, readFileInputSchema, formatReadFileToolResult } from "./workspace-fs-tools.js";
import { isLegacyMcpToolsEnabled } from "./mcp-legacy-tools.js";
import { registerDeprecatedAlias } from "./register-tool-alias.js";

const rootFileName = z
  .string()
  .min(1)
  .describe("Basename in workspace root only, e.g. AGENTS.md or SKILL.md (no slashes)");

const writeMode = z
  .enum(["append", "replace"])
  .optional()
  .describe("replace (default) — overwrite; append — add after existing content");

const listRootFilesDescription =
  "[Legacy] Prefer list_content with placement { kind: root, path: \".\" }. List workspace root files (AGENTS.md, SKILL.md, …). For NOTE.md/TODO.md prefer session_note_read / session_todo_read.";

const readRootFileDescription =
  "[Legacy] Prefer read_content with placement { kind: root, path: name }. Read workspace root file by basename only (no slashes), e.g. AGENTS.md.";

const writeRootFileDescription =
  "[Legacy] Prefer write_content with placement { kind: root, path: name }. Write workspace root file by basename (history on save). For NOTE.md/TODO.md prefer session_note_write / session_todo_write.";

export function registerWorkspaceRootTools(reg, client, { jsonText } = {}) {
  if (!isLegacyMcpToolsEnabled()) return;

  const listHandler = () => client.get("/api/system-files");

  reg("list_root_files", listRootFilesDescription, z.object({}), listHandler);

  registerDeprecatedAlias(reg, {
    canonical: "list_root_files",
    name: "list_system_files",
    schema: z.object({}),
    handler: listHandler
  });

  const readRootSchema = readFileInputSchema.omit({ path: true }).extend({
    name: rootFileName
  });

  const readRootHandler = (args) => {
    const { name, ...rest } = args;
    return readFileHandler(client, { path: name, ...rest });
  };

  reg("read_root_file", readRootFileDescription, readRootSchema, readRootHandler, {
    formatResult: jsonText ? (data) => formatReadFileToolResult(data, jsonText) : undefined
  });

  registerDeprecatedAlias(reg, {
    canonical: "read_root_file",
    name: "read_system_file",
    schema: readRootSchema,
    handler: readRootHandler,
    options: {
      formatResult: jsonText ? (data) => formatReadFileToolResult(data, jsonText) : undefined
    }
  });

  const writeRootSchema = z.object({
    name: rootFileName,
    content: z.string(),
    mode: writeMode
  });

  const writeRootHandler = ({ name, content, mode }) =>
    client.post("/api/workspace/fs/write", { path: name, content, ...(mode ? { mode } : {}) });

  reg("write_root_file", writeRootFileDescription, writeRootSchema, writeRootHandler);

  registerDeprecatedAlias(reg, {
    canonical: "write_root_file",
    name: "write_system_file",
    schema: writeRootSchema,
    handler: writeRootHandler
  });
}
