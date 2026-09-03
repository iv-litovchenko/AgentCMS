const { ClaudeToolActivityTracker, extractCodexToolActivity } = require("./tool-activity");
const { spawn } = require("child_process");
const { promisify } = require("util");
const { execFile } = require("child_process");
const { enrichShellPath, defaultCliBinary, resolveCliBinary } = require("./runtime-cli-env");
const { normalizeCliSessionId } = require("./runtime-bridge");

const execFileAsync = promisify(execFile);
const DEFAULT_TIMEOUT_MS = 300000;

function defaultBinary(runtime) {
  return defaultCliBinary(runtime);
}

function normalizeBinary(runtime, customPath) {
  const value = String(customPath || "").trim();
  if (value && !/^https?:\/\//i.test(value)) return value;
  return defaultBinary(runtime);
}

function extractUserPrompt(messages) {
  return (Array.isArray(messages) ? messages : [])
    .filter((item) => item && item.role === "user")
    .map((item) => String(item.content || "").trim())
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

function extractSystemPrompt(messages) {
  return (Array.isArray(messages) ? messages : [])
    .filter((item) => item && item.role === "system")
    .map((item) => String(item.content || "").trim())
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

function claudeStreamError(event) {
  if (!event || typeof event !== "object") return "";
  if (event.is_error !== true && event.subtype !== "error_during_execution") return "";
  if (Array.isArray(event.errors)) {
    const joined = event.errors
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .join("\n");
    if (joined) return joined;
  }
  if (typeof event.error === "string" && event.error.trim()) return event.error.trim();
  if (typeof event.result === "string" && event.result.trim()) return event.result.trim();
  return "Claude CLI вернул ошибку";
}

function extractClaudeAssistantDelta(event) {
  if (!event || typeof event !== "object" || event.is_error) return "";
  if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
    return String(event.delta.text || "");
  }
  if (event.type === "assistant") {
    const content = event.message?.content;
    if (Array.isArray(content)) {
      return content
        .filter((block) => block && block.type === "text")
        .map((block) => String(block.text || ""))
        .join("");
    }
    if (typeof content === "string") return content;
  }
  return "";
}

function extractClaudeResultText(event) {
  if (!event || typeof event !== "object" || event.is_error) return "";
  if (event.type === "result" && typeof event.result === "string") return event.result;
  return "";
}

function looksLikeJsonObject(text) {
  const value = String(text || "").trim();
  return value.startsWith("{") && value.endsWith("}");
}

function looksLikeCliError(text) {
  const value = String(text || "").trim();
  if (!value) return false;
  if (/^error:/i.test(value)) return true;
  if (/thread\/resume failed/i.test(value)) return true;
  if (/no rollout found/i.test(value)) return true;
  return false;
}

function extractCodexJsonText(event, previous = "") {
  if (!event || typeof event !== "object") return "";
  const type = String(event.type || event.event || "").toLowerCase();
  if (type === "error" || type === "turn.failed" || type.endsWith(".failed")) return "";

  const item = event.item && typeof event.item === "object" ? event.item : null;
  const itemType = String(item?.type || "").toLowerCase();
  if (itemType === "agent_message" && typeof item.text === "string" && item.text.trim()) {
    return item.text.startsWith(previous) ? item.text.slice(previous.length) : item.text;
  }
  if (type.includes("agent_message") && typeof event.message === "string" && event.message.trim()) {
    return event.message.startsWith(previous) ? event.message.slice(previous.length) : event.message;
  }
  return "";
}

function codexStreamError(event) {
  if (!event || typeof event !== "object") return "";
  const type = String(event.type || event.event || "").toLowerCase();
  if (type !== "error" && type !== "turn.failed" && !type.endsWith(".failed")) return "";
  const nested = event.error && typeof event.error === "object" ? event.error : null;
  const message =
    (typeof event.message === "string" && event.message.trim()) ||
    (typeof event.error === "string" && event.error.trim()) ||
    (typeof nested?.message === "string" && nested.message.trim()) ||
    (typeof event.text === "string" && event.text.trim()) ||
    "";
  return message || "Codex CLI вернул ошибку";
}

function firstErrorLine(text) {
  return (
    String(text || "")
      .trim()
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean) || ""
  );
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

function consumeJsonLines(buffer, onEvent) {
  const parts = buffer.split("\n");
  const rest = parts.pop() || "";
  for (const line of parts) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      onEvent(JSON.parse(trimmed));
    } catch {
      // ignore malformed chunks
    }
  }
  return rest;
}

function isSessionInUseError(message) {
  return /session id .* is already in use/i.test(String(message || ""));
}

function isResumeUnavailableError(message) {
  return /no rollout|thread\/resume failed|session not found|invalid session/i.test(String(message || ""));
}

const CLAUDE_PERMISSION_MODES = new Set(["bypassPermissions", "dontAsk", "auto", "manual", "plan"]);

function normalizeClaudePermissionMode(value) {
  const mode = String(value || "").trim();
  return CLAUDE_PERMISSION_MODES.has(mode) ? mode : "";
}

async function chatClaudeCli({
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
    const args = ["-p", prompt, "--output-format", "stream-json", "--verbose"];
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
        jsonBuffer = consumeJsonLines(jsonBuffer, (event) => {
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

    jsonBuffer = consumeJsonLines(`${jsonBuffer}\n`, (event) => {
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

  try {
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
    return await runOnce(false);
  } catch (error) {
    throw error;
  }
}

async function chatCodexCli({
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
  let prompt = extractUserPrompt(messages);
  if (!prompt) throw new Error("Пустое сообщение");

  const system = String(systemPrompt || extractSystemPrompt(messages) || "").trim();
  if (system) prompt = `${system}\n\n---\n\n${prompt}`;

  const sid = normalizeCliSessionId(sessionId, "codex");
  const cmd = normalizeBinary("codex", binary);

  const runOnce = async (resume) => {
    const args = resume && sid ? ["exec", "resume", sid, prompt, "--json"] : ["exec", prompt, "--json"];
    if (model) args.push("-m", String(model));
    if (normalizeClaudePermissionMode(permissionMode) === "bypassPermissions") {
      args.push("--dangerously-bypass-approvals-and-sandbox");
    }

    let text = "";
    let lastError = "";
    let jsonBuffer = "";
    const result = await runCliProcess({
      binary: cmd,
      args,
      cwd,
      signal,
      timeoutMs,
      onStdout: (piece) => {
        jsonBuffer += piece;
        let complete = false;
        jsonBuffer = consumeJsonLines(jsonBuffer, (event) => {
          const toolActivity = extractCodexToolActivity(event);
          if (toolActivity && typeof onActivity === "function") onActivity(toolActivity);
          const err = codexStreamError(event);
          if (err) {
            lastError = err;
            complete = true;
            return;
          }
          const delta = extractCodexJsonText(event, text);
          if (delta) {
            text += delta;
            if (typeof onDelta === "function") onDelta(text);
          }
          const type = String(event?.type || "").toLowerCase();
          if (type === "turn.completed" || type === "turn.failed") complete = true;
        });
        return complete;
      }
    });

    jsonBuffer = consumeJsonLines(`${jsonBuffer}\n`, (event) => {
      const toolActivity = extractCodexToolActivity(event);
      if (toolActivity && typeof onActivity === "function") onActivity(toolActivity);
      const err = codexStreamError(event);
      if (err) {
        lastError = err;
        return;
      }
      const delta = extractCodexJsonText(event, text);
      if (delta) text += delta;
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
    return { text: reply, raw: null };
  };

  try {
    return await runOnce(Boolean(sid));
  } catch (error) {
    if (sid && error?.resumeFailed) {
      const retry = await runOnce(false);
      retry.resumeFallback = true;
      retry.resumeWarning =
        "Codex не смог продолжить сессию по UUID — ответ начат в новой сессии. Проверьте SessionId в настройках.";
      return retry;
    }
    if (sid) return runOnce(false);
    throw error;
  }
}

module.exports = {
  checkCliRuntimeHealth,
  chatClaudeCli,
  chatCodexCli,
  normalizeBinary,
  resolveCliBinary
};
