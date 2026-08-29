const { spawn } = require("child_process");
const { promisify } = require("util");
const { execFile } = require("child_process");
const { enrichShellPath, resolveCliBinary } = require("./runtime-cli-env");

const execFileAsync = promisify(execFile);
const DEFAULT_TIMEOUT_MS = 300000;

function defaultBinary(runtime) {
  return runtime === "codex" ? "codex" : "claude";
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

function extractClaudeStreamDelta(event) {
  if (!event || typeof event !== "object") return "";
  if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
    return String(event.delta.text || "");
  }
  if (typeof event.result === "string") return event.result;
  return "";
}

function extractCodexJsonText(event, previous = "") {
  if (!event || typeof event !== "object") return "";
  const type = String(event.type || event.event || "").toLowerCase();
  const direct =
    event.text ??
    event.content ??
    event.message?.content ??
    event.item?.text ??
    event.item?.content ??
    event.delta?.content ??
    event.delta?.text;
  if (typeof direct === "string" && direct.trim()) {
    if (direct.startsWith(previous)) return direct.slice(previous.length);
    return direct;
  }
  if (type.includes("agent_message") && typeof event.message === "string") {
    return event.message.startsWith(previous) ? event.message.slice(previous.length) : event.message;
  }
  return "";
}

async function checkCliRuntimeHealth({ runtime, binary, timeoutMs = 12000, quick = false } = {}) {
  const cmd = normalizeBinary(runtime, binary);
  const env = enrichShellPath();
  try {
    if (runtime === "codex" && !quick) {
      await execFileAsync(cmd, ["doctor"], { timeout: timeoutMs, env });
      return { ok: true, binary: cmd };
    }
    await execFileAsync(cmd, ["--help"], { timeout: timeoutMs, env });
    return { ok: true, binary: cmd };
  } catch (error) {
    const stderr = String(error?.stderr || "").trim();
    const message = String(stderr || error?.message || error).trim();
    return { ok: false, binary: cmd, error: message.slice(0, 240) || "CLI недоступен" };
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

    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (signal) signal.removeEventListener("abort", onAbort);
      fn(value);
    };

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      finish(reject, new Error("CLI timeout"));
    }, timeoutMs);

    const onAbort = () => {
      child.kill("SIGTERM");
      finish(reject, new Error("Aborted"));
    };

    if (signal) {
      if (signal.aborted) onAbort();
      else signal.addEventListener("abort", onAbort, { once: true });
    }

    child.stdout.on("data", (chunk) => {
      const piece = chunk.toString();
      stdout += piece;
      if (typeof onStdout === "function") onStdout(piece, stdout);
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

async function chatClaudeCli({
  binary = "claude",
  model,
  messages,
  sessionId = "",
  onDelta,
  signal,
  cwd,
  timeoutMs = DEFAULT_TIMEOUT_MS
} = {}) {
  const prompt = extractUserPrompt(messages);
  if (!prompt) throw new Error("Пустое сообщение");

  const sid = String(sessionId || "").trim();

  const runOnce = async (resume) => {
    const args = ["-p", prompt, "--output-format", "stream-json", "--verbose"];
    if (model) args.push("--model", String(model));
    if (resume && sid) args.push("--resume", sid);

    let text = "";
    let jsonBuffer = "";
    const result = await runCliProcess({
      binary: normalizeBinary("claude", binary),
      args,
      cwd,
      signal,
      timeoutMs,
      onStdout: (piece, fullStdout) => {
        jsonBuffer += piece;
        jsonBuffer = consumeJsonLines(jsonBuffer, (event) => {
          const delta = extractClaudeStreamDelta(event);
          if (delta) {
            text += delta;
            if (typeof onDelta === "function") onDelta(text);
          }
        });
        if (!text.trim() && typeof onDelta === "function") onDelta(fullStdout.trim());
      }
    });

    if (!text.trim()) {
      jsonBuffer = consumeJsonLines(`${jsonBuffer}\n`, (event) => {
        const delta = extractClaudeStreamDelta(event);
        if (delta) text += delta;
      });
      if (!text.trim()) text = String(result.stdout || "").trim();
      if (text && typeof onDelta === "function") onDelta(text);
    }

    return { text: text.trim(), raw: null };
  };

  try {
    return await runOnce(Boolean(sid));
  } catch (error) {
    if (sid) return runOnce(false);
    throw error;
  }
}

async function chatCodexCli({
  binary = "codex",
  model,
  messages,
  sessionId = "",
  onDelta,
  signal,
  cwd,
  timeoutMs = DEFAULT_TIMEOUT_MS
} = {}) {
  const prompt = extractUserPrompt(messages);
  if (!prompt) throw new Error("Пустое сообщение");

  const sid = String(sessionId || "").trim();
  const cmd = normalizeBinary("codex", binary);

  const runOnce = async (resume) => {
    const args = resume && sid ? ["exec", "resume", sid, prompt, "--json"] : ["exec", prompt, "--json"];
    if (model) args.push("-m", String(model));

    let text = "";
    let jsonBuffer = "";
    const result = await runCliProcess({
      binary: cmd,
      args,
      cwd,
      signal,
      timeoutMs,
      onStdout: (piece) => {
        jsonBuffer += piece;
        jsonBuffer = consumeJsonLines(jsonBuffer, (event) => {
          const delta = extractCodexJsonText(event, text);
          if (delta) {
            text += delta;
            if (typeof onDelta === "function") onDelta(text);
          }
        });
      }
    });

    if (!text.trim()) {
      jsonBuffer = consumeJsonLines(`${jsonBuffer}\n`, (event) => {
        const delta = extractCodexJsonText(event, text);
        if (delta) text += delta;
      });
      if (!text.trim()) text = String(result.stdout || "").trim();
      if (text && typeof onDelta === "function") onDelta(text);
    }

    return { text: text.trim(), raw: null };
  };

  try {
    return await runOnce(Boolean(sid));
  } catch (error) {
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
