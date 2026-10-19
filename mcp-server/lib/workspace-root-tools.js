import { z } from "zod";
import { readFileHandler, readFileInputSchema, formatReadFileToolResult } from "./workspace-fs-tools.js";
import { isLegacyMcpToolsEnabled } from "./mcp-legacy-tools.js";

const rootFileName = z
  .string()
  .min(1)
  .describe("Basename in workspace root only, e.g. AGENTS.md or SKILL.md (no slashes)");

const writeMode = z
  .enum(["append", "replace"])
  .optional()
  .describe("replace (default) — overwrite; append — add after existing content");

const listRootFilesDescription =
  "[Legacy] Prefer list_content with placement { kind: root, path: \".\" }. List workspace root files (AGENTS.md, SKILL.md, …). For NOTE.md/TODO.md prefer read_workspace_note / read_workspace_todo.";

const readRootFileDescription =
  "[Legacy] Prefer read_content with placement { kind: root, path: name }. Read workspace root file by basename only (no slashes), e.g. AGENTS.md.";

const writeRootFileDescription =
  "[Legacy] Prefer write_content with placement { kind: root, path: name }. Write workspace root file by basename (history on save). For NOTE.md/TODO.md prefer write_workspace_note / write_workspace_todo.";

export function registerWorkspaceRootTools(reg, client, { jsonText } = {}) {
  if (!isLegacyMcpToolsEnabled()) return;

  const listHandler = () => client.get("/api/system-files");

  reg("list_root_files", listRootFilesDescription, z.object({}), listHandler);

  reg(
    "list_system_files",
    "Deprecated alias for list_root_files.",
    z.object({}),
    listHandler
  );

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

  reg(
    "read_system_file",
    "Deprecated alias for read_root_file (use name, not path).",
    readRootSchema,
    readRootHandler,
    {
      formatResult: jsonText ? (data) => formatReadFileToolResult(data, jsonText) : undefined
    }
  );

  const writeRootSchema = z.object({
    name: rootFileName,
    content: z.string(),
    mode: writeMode
  });

  const writeRootHandler = ({ name, content, mode }) =>
    client.post("/api/workspace/fs/write", { path: name, content, ...(mode ? { mode } : {}) });

  reg("write_root_file", writeRootFileDescription, writeRootSchema, writeRootHandler);

  reg(
    "write_system_file",
    "Deprecated alias for write_root_file (use name, not path).",
    writeRootSchema,
    writeRootHandler
  );
}
