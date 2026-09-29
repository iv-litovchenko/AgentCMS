const { spawn } = require("child_process");
const fs = require("fs/promises");
const path = require("path");

const DEFAULT_TIMEOUT_MS = 120_000;
const MAX_OUTPUT_BYTES = 256_000;
const MAX_ARGS = 64;

const INTERPRETER_BY_EXT = {
  ".py": "python3",
  ".js": "node",
  ".mjs": "node",
  ".cjs": "node",
  ".sh": "bash",
  ".bash": "bash"
};

function normalizeStringList(value) {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, MAX_ARGS)
    .map((item) => String(item ?? ""))
    .filter((item) => item.length > 0);
}

function resolveTopicDir(topicPath, normalizeWorkspacePath) {
  const normalized = String(topicPath || "")
    .trim()
    .replace(/\\/g, "/");
  if (!normalized) return null;
  const topicDirRel = path.posix.dirname(normalized);
  if (!topicDirRel || topicDirRel === ".") return null;
  return normalizeWorkspacePath(topicDirRel);
}

function resolveWorkingDir({ cwd, topicPath }, deps) {
  const { normalizeWorkspacePath, getAgentRoot } = deps;
  const explicit = String(cwd || "").trim();
  if (explicit) {
    const absolute = normalizeWorkspacePath(explicit);
    if (!absolute) return { error: "Invalid cwd path", status: 400 };
    return { absolute, rel: explicit.replace(/\\/g, "/") };
  }

  const topicAbsolute = resolveTopicDir(topicPath, normalizeWorkspacePath);
  if (topicAbsolute) {
    const agentRoot = getAgentRoot();
    const rel = path.relative(agentRoot, topicAbsolute).replace(/\\/g, "/");
    return { absolute: topicAbsolute, rel };
  }

  const agentRoot = getAgentRoot();
  return { absolute: agentRoot, rel: "." };
}

async function ensureDirectory(absolute) {
  let stat;
  try {
    stat = await fs.stat(absolute);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return { error: "Working directory not found", status: 404 };
    }
    throw error;
  }
  if (!stat.isDirectory()) {
    return { error: "Working directory is not a folder", status: 400 };
  }
  return { ok: true };
}

function buildEnv(baseEnv, extraEnv) {
  const env = { ...process.env, ...(baseEnv || {}) };
  if (extraEnv && typeof extraEnv === "object") {
    for (const [key, value] of Object.entries(extraEnv)) {
      if (value === null || value === undefined) continue;
      env[String(key)] = String(value);
    }
  }
  env.AGENT_CMS_EXEC = "1";
  return env;
}

function runProcess({ command, args, cwd, env, timeoutMs, shell = false }) {
  const started = Date.now();
  const timeout = Math.min(
    Math.max(Number.parseInt(String(timeoutMs || DEFAULT_TIMEOUT_MS), 10) || DEFAULT_TIMEOUT_MS, 1000),
    600_000
  );

  return new Promise((resolve) => {
    const stdoutState = { text: "", bytes: 0, truncated: false };
    const stderrState = { text: "", bytes: 0, truncated: false };
    let settled = false;

    const child = spawn(command, args, {
      cwd,
      env,
      shell,
      windowsHide: true
    });

    const finish = (payload) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({
        durationMs: Date.now() - started,
        ...payload
      });
    };

    const appendChunk = (state, chunk) => {
      const piece = String(chunk || "");
      const pieceBytes = Buffer.byteLength(piece, "utf-8");
      if (state.bytes + pieceBytes <= MAX_OUTPUT_BYTES) {
        state.text += piece;
        state.bytes += pieceBytes;
        return;
      }
      const room = MAX_OUTPUT_BYTES - state.bytes;
      if (room > 0) {
        state.text += Buffer.from(piece, "utf-8").subarray(0, room).toString("utf-8");
        state.bytes = MAX_OUTPUT_BYTES;
      }
      state.truncated = true;
    };

    child.stdout?.on("data", (chunk) => appendChunk(stdoutState, chunk));
    child.stderr?.on("data", (chunk) => appendChunk(stderrState, chunk));

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 1000).unref?.();
      finish({
        ok: false,
        timedOut: true,
        exitCode: null,
        signal: "SIGTERM",
        stdout: stdoutState.text,
        stderr: stderrState.text || "Process timed out",
        stdoutTruncated: stdoutState.truncated,
        stderrTruncated: true
      });
    }, timeout);
    timer.unref?.();

    child.on("error", (error) => {
      finish({
        ok: false,
        timedOut: false,
        exitCode: null,
        signal: null,
        stdout: stdoutState.text,
        stderr: stderrState.text || String(error.message || error),
        stdoutTruncated: stdoutState.truncated,
        stderrTruncated: stderrState.truncated
      });
    });

    child.on("close", (exitCode, signal) => {
      finish({
        ok: exitCode === 0,
        timedOut: false,
        exitCode: exitCode == null ? null : Number(exitCode),
        signal: signal || null,
        stdout: stdoutState.text,
        stderr: stderrState.text,
        stdoutTruncated: stdoutState.truncated,
        stderrTruncated: stderrState.truncated
      });
    });
  });
}

function resolveScriptInterpreter(scriptRel, interpreterOverride) {
  const override = String(interpreterOverride || "").trim();
  if (override) return override;
  const ext = path.posix.extname(String(scriptRel || "").toLowerCase());
  return INTERPRETER_BY_EXT[ext] || null;
}

function createScriptExecService(deps) {
  const { normalizeWorkspacePath, getAgentRoot } = deps;

  async function runScript(payload = {}) {
    const scriptRel = String(payload.script || payload.path || "").trim().replace(/\\/g, "/");
    if (!scriptRel) return { error: "Missing script path", status: 400 };

    const scriptAbsolute = normalizeWorkspacePath(scriptRel);
    if (!scriptAbsolute) return { error: "Invalid script path", status: 400 };

    let stat;
    try {
      stat = await fs.stat(scriptAbsolute);
    } catch (error) {
      if (error && error.code === "ENOENT") return { error: "Script not found", status: 404 };
      throw error;
    }
    if (!stat.isFile()) return { error: "Script path is not a file", status: 400 };

    const interpreter = resolveScriptInterpreter(scriptRel, payload.interpreter);
    if (!interpreter) {
      return {
        error: "Unknown script type; set interpreter explicitly (python3, node, bash, …)",
        status: 400
      };
    }

    const cwdCtx = resolveWorkingDir(payload, deps);
    if (cwdCtx.error) return cwdCtx;
    const cwdCheck = await ensureDirectory(cwdCtx.absolute);
    if (cwdCheck.error) return cwdCheck;

    const args = normalizeStringList(payload.args);
    const env = buildEnv({}, payload.env);
    env.AGENT_CMS_SCRIPT = scriptRel;

    const result = await runProcess({
      command: interpreter,
      args: [scriptAbsolute, ...args],
      cwd: cwdCtx.absolute,
      env,
      timeoutMs: payload.timeoutMs
    });

    return {
      ok: result.ok,
      mode: "run_script",
      script: scriptRel,
      scriptAbsolute,
      interpreter,
      args,
      cwd: cwdCtx.rel,
      timedOut: Boolean(result.timedOut),
      exitCode: result.exitCode,
      signal: result.signal,
      durationMs: result.durationMs,
      stdout: result.stdout,
      stderr: result.stderr,
      stdoutTruncated: result.stdoutTruncated,
      stderrTruncated: result.stderrTruncated
    };
  }

  async function execCommand(payload = {}) {
    const command = String(payload.command || "").trim();
    if (!command) return { error: "Missing command", status: 400 };

    const cwdCtx = resolveWorkingDir(payload, deps);
    if (cwdCtx.error) return cwdCtx;
    const cwdCheck = await ensureDirectory(cwdCtx.absolute);
    if (cwdCheck.error) return cwdCheck;

    const args = normalizeStringList(payload.args);
    const env = buildEnv({}, payload.env);

    const result = await runProcess({
      command,
      args,
      cwd: cwdCtx.absolute,
      env,
      timeoutMs: payload.timeoutMs,
      shell: false
    });

    return {
      ok: result.ok,
      mode: "exec_command",
      command,
      args,
      cwd: cwdCtx.rel,
      timedOut: Boolean(result.timedOut),
      exitCode: result.exitCode,
      signal: result.signal,
      durationMs: result.durationMs,
      stdout: result.stdout,
      stderr: result.stderr,
      stdoutTruncated: result.stdoutTruncated,
      stderrTruncated: result.stderrTruncated
    };
  }

  async function execShell(payload = {}) {
    const shellCommand = String(payload.command || payload.shell || "").trim();
    if (!shellCommand) return { error: "Missing shell command", status: 400 };

    const cwdCtx = resolveWorkingDir(payload, deps);
    if (cwdCtx.error) return cwdCtx;
    const cwdCheck = await ensureDirectory(cwdCtx.absolute);
    if (cwdCheck.error) return cwdCheck;

    const env = buildEnv({}, payload.env);
    const shellBin = process.platform === "win32" ? process.env.ComSpec || "cmd.exe" : process.env.SHELL || "/bin/sh";
    const shellArgs =
      process.platform === "win32" ? ["/d", "/s", "/c", shellCommand] : ["-lc", shellCommand];

    const result = await runProcess({
      command: shellBin,
      args: shellArgs,
      cwd: cwdCtx.absolute,
      env,
      timeoutMs: payload.timeoutMs,
      shell: false
    });

    return {
      ok: result.ok,
      mode: "exec_shell",
      shell: shellBin,
      command: shellCommand,
      cwd: cwdCtx.rel,
      timedOut: Boolean(result.timedOut),
      exitCode: result.exitCode,
      signal: result.signal,
      durationMs: result.durationMs,
      stdout: result.stdout,
      stderr: result.stderr,
      stdoutTruncated: result.stdoutTruncated,
      stderrTruncated: result.stderrTruncated
    };
  }

  return { runScript, execCommand, execShell };
}

module.exports = {
  createScriptExecService,
  DEFAULT_TIMEOUT_MS,
  MAX_OUTPUT_BYTES
};
