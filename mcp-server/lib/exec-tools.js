import { z } from "zod";

const workspacePath = z
  .string()
  .min(1)
  .describe("Workspace-relative path, e.g. awn-container/tema/awn-storage/scripts/foo.py");

const pagePath = z
  .string()
  .min(1)
  .describe("Topic manifest path; cwd defaults to topic folder when cwd is omitted")
  .optional();

const execEnv = z.record(z.string()).optional();

export function registerExecTools(reg, client, pagePathSchema) {
  reg(
    "run_script",
    "Run a workspace script file (.py → python3, .js/.mjs → node, .sh → bash). Returns exitCode, stdout, stderr.",
    z.object({
      script: workspacePath.describe("Workspace-relative script path"),
      args: z.array(z.string()).optional(),
      cwd: workspacePath.optional().describe("Working directory; default: topic folder or agent root"),
      topicPath: pagePathSchema.optional(),
      interpreter: z.string().optional().describe("Override interpreter, e.g. python3, node, bash"),
      timeoutMs: z.number().int().min(1000).max(600000).optional(),
      env: execEnv
    }),
    ({ script, args, cwd, topicPath, interpreter, timeoutMs, env }) =>
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
  );

  reg(
    "exec_command",
    "Execute a command with args array (no shell). Example: command=git, args=[status]. Returns exitCode, stdout, stderr.",
    z.object({
      command: z.string().min(1),
      args: z.array(z.string()).optional(),
      cwd: workspacePath.optional(),
      topicPath: pagePathSchema.optional(),
      timeoutMs: z.number().int().min(1000).max(600000).optional(),
      env: execEnv
    }),
    ({ command, args, cwd, topicPath, timeoutMs, env }) =>
      client.post("/api/exec/command", { command, args, cwd, topicPath, timeoutMs, env })
  );

  reg(
    "exec_shell",
    "Run an arbitrary shell command string (pipes, redirects, &&). Use exec_command when args array is enough.",
    z.object({
      command: z.string().min(1).describe("Shell command string, e.g. ls -la | head"),
      cwd: workspacePath.optional(),
      topicPath: pagePathSchema.optional(),
      timeoutMs: z.number().int().min(1000).max(600000).optional(),
      env: execEnv
    }),
    ({ command, cwd, topicPath, timeoutMs, env }) =>
      client.post("/api/exec/shell", { command, shell: command, cwd, topicPath, timeoutMs, env })
  );
}
