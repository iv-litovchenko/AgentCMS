import { z } from "zod";
import { registerCanonicalWithLegacyAlias } from "./register-tool-alias.js";

const workspacePath = z
  .string()
  .min(1)
  .describe("Workspace-relative path, e.g. awn-topics/tema/awn-storage/scripts/foo.py");

const pageUrl = z.string().url().describe("Public http(s) URL");

const execEnv = z.record(z.string()).optional();

const mcpConfirm = z
  .boolean()
  .optional()
  .describe("Required true when platform confirm-exec is enabled (explicit user approval)");

export function registerToolTools(reg, client, pagePathSchema) {
  registerCanonicalWithLegacyAlias(reg, {
    canonical: "tool_document_text_extract",
    legacy: "extract_document_text",
    description: "Extract plain text from pdf, docx, xlsx, html, txt, md, json — from URL or workspace path.",
    schema: z.object({
      url: pageUrl.optional(),
      path: workspacePath.optional(),
      maxChars: z.number().int().min(500).max(200000).optional(),
      maxBytes: z.number().int().min(10000).max(10000000).optional()
    }),
    handler: ({ url, path, maxChars, maxBytes }) =>
      client.get("/api/web/extract", { url, path, maxChars, maxBytes })
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "tool_script_run",
    legacy: "run_script",
    description:
      "Run a workspace script file (.py → python3, .js/.mjs → node, .sh → bash). Returns exitCode, stdout, stderr.",
    schema: z.object({
      script: workspacePath.describe("Workspace-relative script path"),
      args: z.array(z.string()).optional(),
      cwd: workspacePath.optional().describe("Working directory; default: topic folder or agent root"),
      topicPath: pagePathSchema.optional(),
      interpreter: z.string().optional().describe("Override interpreter, e.g. python3, node, bash"),
      timeoutMs: z.number().int().min(1000).max(600000).optional(),
      env: execEnv,
      confirm: mcpConfirm
    }),
    handler: ({ script, args, cwd, topicPath, interpreter, timeoutMs, env }) =>
      client.post("/api/exec/run-script", {
        script,
        path: script,
        args,
        cwd,
        topicPath,
        interpreter,
        timeoutMs,
        env
      })
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "tool_command_exec",
    legacy: "exec_command",
    description:
      "Execute a command with args array (no shell). Example: command=git, args=[status]. Returns exitCode, stdout, stderr.",
    schema: z.object({
      command: z.string().min(1),
      args: z.array(z.string()).optional(),
      cwd: workspacePath.optional(),
      topicPath: pagePathSchema.optional(),
      timeoutMs: z.number().int().min(1000).max(600000).optional(),
      env: execEnv,
      confirm: mcpConfirm
    }),
    handler: ({ command, args, cwd, topicPath, timeoutMs, env }) =>
      client.post("/api/exec/command", { command, args, cwd, topicPath, timeoutMs, env })
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "tool_shell_exec",
    legacy: "exec_shell",
    description:
      "Run an arbitrary shell command string (pipes, redirects, &&). Use tool_command_exec when args array is enough.",
    schema: z.object({
      command: z.string().min(1).describe("Shell command string, e.g. ls -la | head"),
      cwd: workspacePath.optional(),
      topicPath: pagePathSchema.optional(),
      timeoutMs: z.number().int().min(1000).max(600000).optional(),
      env: execEnv,
      confirm: mcpConfirm
    }),
    handler: ({ command, cwd, topicPath, timeoutMs, env }) =>
      client.post("/api/exec/shell", { command, shell: command, cwd, topicPath, timeoutMs, env })
  });
}
