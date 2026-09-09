const { ClaudeToolActivityTracker, extractCodexToolActivity } = require("./tool-activity");
const { spawn } = require("child_process");
const { promisify } = require("util");
const { execFile } = require("child_process");
const { enrichShellPath, defaultCliBinary, resolveCliBinary } = require("./runtime-cli-env");
const { normalizeCliSessionId } = require("./runtime-bridge");
const { getCliSessionPool, isPersistentCliEnabled } = require("./runtime-cli-session");
const {
  DEFAULT_TIMEOUT_MS,
  normalizeClaudePermissionMode,
  extractUserPrompt,
  extractSystemPrompt,
  claudeStreamError,
  extractClaudeAssistantDelta,
  extractClaudeResultText,
  looksLikeJsonObject,
  looksLikeCliError,
  extractCodexThreadId,
  extractCodexJsonText,
  codexStreamError,
  firstErrorLine,
  consumeJsonLinesFromBuffer,
  isSessionInUseError,
  isResumeUnavailableError
} = require("./runtime-cli-shared");

const execFileAsync = promisify(execFile);

function defaultBinary(runtime) {
  return defaultCliBinary(runtime);
}

function normalizeBinary(runtime, customPath) {
  const value = String(customPath || "").trim();
  if (value && !/^https?:\/\//i.test(value)) return value;
  return defaultBinary(runtime);
}

async function checkCliRuntimeHealth({ runtime, binary, timeoutMs = 12000 } = {}) {
  const cmd = normalizeBinary(runtime, binary);
  const env = enrichShellPath();
  try {
    const { stdout } = await execFileAsync(cmd, ["--version"], { timeout: timeoutMs, env });
    const version = String(stdout || "")
      .trim()
      .split(/\r?\n/)[0]
      .trim();
    return { ok: true, binary: cmd, version: version || null };
  } catch (error) {
    const stderr = String(error?.stderr || "").trim();
    const message = String(stderr || error?.message || error).trim();
    const label = defaultCliBinary(runtime);
    return {
      ok: false,
      binary: cmd,
      error: message.slice(0, 240) || `${label} недоступен (${label} --version)`
    };
  }
}

function runCliProcess({ binary, args, cwd, onStdout, signal, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, {
      cwd: cwd || process.cwd(),
      env: enrichShellPath(),
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const killChild = () => {
      if (!child.killed) {
        try {
          child.kill("SIGTERM");
        } catch {
          /* ignore */
        }
      }
    };

    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (signal) signal.removeEventListener("abort", onAbort);
      fn(value);
    };

    const timer = setTimeout(() => {
      killChild();
      finish(reject, new Error("CLI timeout"));
    }, timeoutMs);

    const onAbort = () => {
      killChild();
      finish(reject, new Error("Aborted"));
    };

    if (signal) {
      if (signal.aborted) onAbort();
      else signal.addEventListener("abort", onAbort, { once: true });
    }

    child.stdout.on("data", (chunk) => {
      const piece = chunk.toString();
      stdout += piece;
      if (typeof onStdout === "function") {
        const stop = onStdout(piece, stdout);
        if (stop) {
          killChild();
          finish(resolve, { stdout, stderr, code: 0 });
        }
      }
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => finish(reject, error));
    child.on("close", (code) => {
      if (code !== 0 && !stdout.trim()) {
        finish(reject, new Error(stderr.trim() || `CLI exited with code ${code}`));
        return;
      }
      finish(resolve, { stdout, stderr, code });
    });
  });
}

function buildPersistentSessionConfig({
  runtime,
  binary,
  model,
  sessionId,
  permissionMode,
  systemPrompt,
  cwd,
  onPermissionRequest
}) {
  const sid = normalizeCliSessionId(sessionId, runtime);
  return {
    binary: normalizeBinary(runtime, binary),
    model,
    sessionId: sid,
    permissionMode,
    systemPrompt: String(systemPrompt || "").trim(),
    cwd: cwd || process.cwd(),
    resume: Boolean(sid),
    onPermissionRequest: typeof onPermissionRequest === "function" ? onPermissionRequest : null
  };
}

async function chatClaudeCliPersistent(options = {}) {
  const prompt = extractUserPrompt(options.messages);
  if (!prompt) throw new Error("Пустое сообщение");

  const system = String(
    options.systemPrompt || extractSystemPrompt(options.messages) || ""
  ).trim();
  const config = buildPersistentSessionConfig({
    runtime: "claude",
    binary: options.binary,
    model: options.model,
    sessionId: options.sessionId,
    permissionMode: options.permissionMode,
    systemPrompt: system,
    cwd: options.cwd,
    onPermissionRequest: options.onPermissionRequest
  });

  const pool = getCliSessionPool();
  const session = pool.getSession("claude", config);
  try {
    const reply = await session.chat({
      prompt,
      onDelta: options.onDelta,
      onActivity: options.onActivity,
      onPermissionRequest: options.onPermissionRequest,
      signal: options.signal,
      timeoutMs: options.timeoutMs
    });
    if (typeof options.onDelta === "function" && reply.text) options.onDelta(reply.text);
    return { text: reply.text, raw: null, persistent: true };
  } catch (error) {
    session.dispose("error");
    throw error;
  }
}

async function chatCodexCliPersistent(options = {}) {
  const userPrompt = extractUserPrompt(options.messages);
  if (!userPrompt) throw new Error("Пустое сообщение");

  const system = String(
    options.systemPrompt || extractSystemPrompt(options.messages) || ""
  ).trim();

  const config = buildPersistentSessionConfig({
    runtime: "codex",
    binary: options.binary,
    model: options.model,
    sessionId: options.sessionId,
    permissionMode: options.permissionMode,
    cwd: options.cwd
  });

  const pool = getCliSessionPool();
  const session = pool.getSession("codex", config);
  try {
    await session.ensureThread();
    const includeSystem = Boolean(system) && (session.resumeFallback || !config.sessionId);
    const prompt = includeSystem ? `${system}\n\n---\n\n${userPrompt}` : userPrompt;
    const reply = await session.chat({
      prompt,
      onDelta: options.onDelta,
      onActivity: options.onActivity,
      signal: options.signal,
      timeoutMs: options.timeoutMs
    });
    if (typeof options.onDelta === "function" && reply.text) options.onDelta(reply.text);
    return {
      text: reply.text,
      raw: null,
      persistent: true,
      codexThreadId: String(session.threadId || "").trim(),
      resumeFallback: Boolean(session.resumeFallback)
    };
  } catch (error) {
    session.dispose("error");
    throw error;
  }
}

async function chatClaudeCliOnce({
  binary = "claude",
  model,
  messages,
  sessionId = "",
  permissionMode = "",
  systemPrompt = "",
  onDelta,
  onActivity,
  signal,
  cwd,
  timeoutMs = DEFAULT_TIMEOUT_MS
} = {}) {
  const prompt = extractUserPrompt(messages);
  if (!prompt) throw new Error("Пустое сообщение");

  const sid = normalizeCliSessionId(sessionId, "claude");
  const permission = normalizeClaudePermissionMode(permissionMode);
  const system = String(systemPrompt || extractSystemPrompt(messages) || "").trim();

  const runOnce = async (resume) => {
    const args = ["-p", prompt, "--output-format", "stream-json", "--verbose", "--include-partial-messages"];
    if (model) args.push("--model", String(model));
    if (permission) args.push("--permission-mode", permission);
    if (!resume && system) args.push("--system-prompt", system);
    if (resume && sid) args.push("--resume", sid);
    else if (sid) args.push("--session-id", sid);

    let text = "";
    let resultText = "";
    let lastError = "";
    let jsonBuffer = "";
    const toolTracker = new ClaudeToolActivityTracker(onActivity);
    const result = await runCliProcess({
      binary: normalizeBinary("claude", binary),
      args,
      cwd,
      signal,
      timeoutMs,
      onStdout: (piece) => {
        jsonBuffer += piece;
        let complete = false;
        jsonBuffer = consumeJsonLinesFromBuffer(jsonBuffer, (event) => {
          toolTracker.handleEvent(event);
          const err = claudeStreamError(event);
          if (err) {
            lastError = err;
            complete = true;
            return;
          }
          const delta = extractClaudeAssistantDelta(event);
          if (delta) {
            text += delta;
            if (typeof onDelta === "function") onDelta(text);
            if (event?.type === "assistant" && text.trim()) complete = true;
          }
          const full = extractClaudeResultText(event);
          if (full) {
            resultText = full;
            complete = true;
          } else if (event?.type === "result") {
            complete = true;
          }
        });
        return complete;
      }
    });

    jsonBuffer = consumeJsonLinesFromBuffer(`${jsonBuffer}\n`, (event) => {
      toolTracker.handleEvent(event);
      const err = claudeStreamError(event);
      if (err) {
        lastError = err;
        return;
      }
      const delta = extractClaudeAssistantDelta(event);
      if (delta) text += delta;
      const full = extractClaudeResultText(event);
      if (full) resultText = full;
    });

    if (lastError) {
      const error = new Error(lastError.replace(/^Error:\s*/i, "").trim() || lastError);
      error.resumeFailed = Boolean(resume && sid);
      throw error;
    }

    let reply = String(text || resultText || "").trim();
    if (!reply) {
      const stdout = String(result.stdout || "").trim();
      if (stdout && !looksLikeJsonObject(stdout)) reply = stdout;
    }
    if (!reply) {
      const stderr = String(result.stderr || "").trim();
      throw new Error(stderr || "Claude CLI не вернул текст");
    }
    if (typeof onDelta === "function") onDelta(reply);
    return { text: reply, raw: null };
  };

  if (sid) {
    try {
      return await runOnce(true);
    } catch (error) {
      const msg = String(error?.message || error);
      if (isSessionInUseError(msg)) throw error;
      if (error.resumeFailed || isResumeUnavailableError(msg)) {
        return await runOnce(false);
      }
      throw error;
    }
  }
  return runOnce(false);
}

async function chatCodexCliOnce({
  binary = "codex",
  model,
  messages,
  sessionId = "",
  permissionMode = "",
  systemPrompt = "",
  onDelta,
  onActivity,
  signal,
  cwd,
  timeoutMs = DEFAULT_TIMEOUT_MS
} = {}) {
  const userPrompt = extractUserPrompt(messages);
  if (!userPrompt) throw new Error("Пустое сообщение");

  const system = String(systemPrompt || extractSystemPrompt(messages) || "").trim();

  const sid = normalizeCliSessionId(sessionId, "codex");
  const cmd = normalizeBinary("codex", binary);

  const runOnce = async (resume) => {
    const turnPrompt =
      system && !(resume && sid) ? `${system}\n\n---\n\n${userPrompt}` : userPrompt;
    const args =
      resume && sid ? ["exec", "resume", sid, turnPrompt, "--json"] : ["exec", turnPrompt, "--json"];
    if (model) args.push("-m", String(model));
    if (normalizeClaudePermissionMode(permissionMode) === "bypassPermissions") {
      args.push("--dangerously-bypass-approvals-and-sandbox");
    }

    let text = "";
    let lastError = "";
    let codexThreadId = "";
    let jsonBuffer = "";
    const handleCodexEvent = (event) => {
      const threadId = extractCodexThreadId(event);
      if (threadId) codexThreadId = threadId;
      const toolActivity = extractCodexToolActivity(event);
      if (toolActivity && typeof onActivity === "function") onActivity(toolActivity);
      const err = codexStreamError(event);
      if (err) {
        lastError = err;
        return err;
      }
      const delta = extractCodexJsonText(event, text);
      if (delta) {
        text += delta;
        if (typeof onDelta === "function") onDelta(text);
      }
      return "";
    };
    const result = await runCliProcess({
      binary: cmd,
      args,
      cwd,
      signal,
      timeoutMs,
      onStdout: (piece) => {
        jsonBuffer += piece;
        let complete = false;
        jsonBuffer = consumeJsonLinesFromBuffer(jsonBuffer, (event) => {
          const err = handleCodexEvent(event);
          if (err) complete = true;
          const type = String(event?.type || "").toLowerCase();
          if (type === "turn.completed" || type === "turn.failed") complete = true;
        });
        return complete;
      }
    });

    jsonBuffer = consumeJsonLinesFromBuffer(`${jsonBuffer}\n`, (event) => {
      handleCodexEvent(event);
    });

    const stdout = String(result.stdout || "").trim();
    const stderr = String(result.stderr || "").trim();
    if (!lastError && looksLikeCliError(stdout)) lastError = firstErrorLine(stdout);
    if (!lastError && looksLikeCliError(stderr)) lastError = firstErrorLine(stderr);
    if (!text.trim() && (lastError || result.code)) {
      const detail =
        lastError || firstErrorLine(stderr) || firstErrorLine(stdout) || `CLI exited with code ${result.code}`;
      const error = new Error(detail.replace(/^Error:\s*/i, "").trim() || detail);
      error.resumeFailed = Boolean(resume && sid);
      throw error;
    }

    let reply = String(text || "").trim();
    if (!reply && stdout && !looksLikeJsonObject(stdout) && !looksLikeCliError(stdout)) {
      reply = stdout;
    }
    if (!reply) {
      throw new Error(stderr || "Codex CLI не вернул текст");
    }
    if (typeof onDelta === "function") onDelta(reply);
    return {
      text: reply,
      raw: null,
      codexThreadId: codexThreadId || (resume && sid ? sid : "")
    };
  };

  const resumeWarning =
    "Codex не нашёл сохранённую сессию — начата новая, Session ID обновлён автоматически.";

  if (sid) {
    try {
      return await runOnce(true);
    } catch (error) {
      const msg = String(error?.message || error);
      if (error?.resumeFailed || isResumeUnavailableError(msg)) {
        const retry = await runOnce(false);
        retry.resumeFallback = true;
        retry.resumeWarning = resumeWarning;
        return retry;
      }
      throw error;
    }
  }
  return runOnce(false);
}

async function chatClaudeCli(options = {}) {
  if (isPersistentCliEnabled()) {
    try {
      return await chatClaudeCliPersistent(options);
    } catch (error) {
      const msg = String(error?.message || error);
      if (isSessionInUseError(msg)) throw error;
      return chatClaudeCliOnce(options);
    }
  }
  return chatClaudeCliOnce(options);
}

async function chatCodexCli(options = {}) {
  if (isPersistentCliEnabled()) {
    try {
      return await chatCodexCliPersistent(options);
    } catch (error) {
      return chatCodexCliOnce(options);
    }
  }
  return chatCodexCliOnce(options);
}

module.exports = {
  checkCliRuntimeHealth,
  chatClaudeCli,
  chatCodexCli,
  chatClaudeCliOnce,
  chatCodexCliOnce,
  normalizeBinary,
  resolveCliBinary
};
