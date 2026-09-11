const { spawn } = require("child_process");
const { ClaudeToolActivityTracker, extractCodexToolActivity } = require("./tool-activity");
const { enrichShellPath } = require("./runtime-cli-env");
const {
  consumeJsonLinesFromBuffer,
  claudeStreamError,
  extractClaudeAssistantDelta,
  extractClaudeResultText,
  normalizeClaudePermissionMode,
  DEFAULT_TIMEOUT_MS
} = require("./runtime-cli-shared");
const {
  parseClaudeCanUseToolRequest,
  buildClaudeControlAllowResponse,
  buildClaudeControlDenyResponse
} = require("./shell-tool-permission");
const { isAskUserQuestionTool } = require("./shell-user-question");
const {
  APPROVAL_METHODS,
  USER_INPUT_METHOD,
  resolveCodexApprovalPolicy,
  usesCodexBypass,
  approvalCacheKey,
  parseCodexApprovalRequest,
  buildCodexApprovalResponse,
  normalizeCodexUserQuestions,
  buildCodexUserInputResponse
} = require("./runtime-codex-approval");

const IDLE_MS = Number(process.env.AGENT_SHELL_CLI_IDLE_MS || 30 * 60 * 1000);
const PERSISTENT_ENABLED = String(process.env.AGENT_SHELL_CLI_PERSISTENT ?? "1").trim() !== "0";

function sessionPoolKey(runtime, config) {
  return [
    runtime,
    config.binary,
    config.cwd,
    config.model || "",
    config.permissionMode || "",
    config.sessionId || "",
    config.systemPrompt || ""
  ].join("\0");
}

function resetIdleTimer(session) {
  if (session.idleTimer) clearTimeout(session.idleTimer);
  session.idleTimer = setTimeout(() => {
    session.dispose("idle");
  }, IDLE_MS);
  if (typeof session.idleTimer.unref === "function") session.idleTimer.unref();
}

function snakeCaseType(value) {
  return String(value || "")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/-/g, "_")
    .toLowerCase();
}

function normalizeCodexAppServerItem(item) {
  if (!item || typeof item !== "object") return item;
  return {
    ...item,
    type: snakeCaseType(item.type)
  };
}

function codexNotificationToExecEvent(message) {
  const method = String(message?.method || "").trim();
  if (!method) return null;
  const params = message.params && typeof message.params === "object" ? message.params : {};
  if (method === "item/agentMessage/delta") {
    return { type: "agent_message_delta", delta: String(params.delta || "") };
  }
  if (method === "turn/completed") {
    return { type: "turn.completed", turn: params.turn || null };
  }
  if (method.startsWith("item/")) {
    const mapped = method.replace(/\//g, ".");
    return { type: mapped, item: normalizeCodexAppServerItem(params.item) };
  }
  return { type: method.replace(/\//g, "."), ...params };
}

class ClaudePersistentSession {
  constructor(config) {
    this.config = config;
    this.process = null;
    this.stdoutBuffer = "";
    this.pendingTurn = null;
    this.turnQueue = [];
    this.busy = false;
    this.idleTimer = null;
    this.disposed = false;
    this.toolTracker = null;
    this.sessionAllowedTools = new Set();
  }

  usesInteractivePermissions() {
    return normalizeClaudePermissionMode(this.config.permissionMode) !== "bypassPermissions";
  }

  appendClaudePermissionArgs(args) {
    if (!this.usesInteractivePermissions()) return;
    args.push("--permission-prompt-tool", "stdio");
    const permission = normalizeClaudePermissionMode(this.config.permissionMode);
    if (permission && permission !== "bypassPermissions") {
      args.push("--permission-mode", permission);
    }
  }

  writeControlMessage(message) {
    if (!this.process?.stdin?.writable) throw new Error("Claude stdin недоступен");
    this.process.stdin.write(`${JSON.stringify(message)}\n`);
  }

  writeControlDecision(requestId, allow, { toolInput, toolUseId } = {}) {
    const frame = allow
      ? buildClaudeControlAllowResponse(requestId, { updatedInput: toolInput, toolUseId })
      : buildClaudeControlDenyResponse(requestId, "Отклонено пользователем", { toolUseId });
    this.writeControlMessage(frame);
  }

  isToolAllowedForSession(toolName) {
    const name = String(toolName || "").trim();
    if (!name) return false;
    if (this.sessionAllowedTools.has(name)) return true;
    if (this.sessionAllowedTools.has("*")) return true;
    const mcpPrefix = name.startsWith("mcp__") ? name.split("__").slice(0, 2).join("__") + "__" : "";
    if (mcpPrefix && this.sessionAllowedTools.has(`${mcpPrefix}*`)) return true;
    return false;
  }

  rememberSessionToolAllow(toolName) {
    const name = String(toolName || "").trim();
    if (!name) return;
    this.sessionAllowedTools.add(name);
  }

  async resolveAskUserQuestion(parsed, turn) {
    const requestId = parsed.requestId;
    const handler =
      typeof turn?.onUserQuestionRequest === "function"
        ? turn.onUserQuestionRequest
        : typeof this.config.onUserQuestionRequest === "function"
          ? this.config.onUserQuestionRequest
          : null;

    if (!handler) {
      this.writeControlDecision(requestId, false, {
        toolInput: parsed.toolInput,
        toolUseId: parsed.toolUseId
      });
      return;
    }

    try {
      const decision = await handler({
        cliRequestId: requestId,
        toolName: parsed.toolName,
        toolInput: parsed.toolInput,
        toolUseId: parsed.toolUseId,
        questions: Array.isArray(parsed.toolInput?.questions) ? parsed.toolInput.questions : []
      });
      const allow = Boolean(decision?.allow);
      const updatedInput =
        decision?.updatedInput && typeof decision.updatedInput === "object"
          ? decision.updatedInput
          : null;
      if (!allow || !updatedInput) {
        this.writeControlMessage(
          buildClaudeControlDenyResponse(requestId, "Отклонено пользователем", {
            toolUseId: parsed.toolUseId
          })
        );
        return;
      }
      this.writeControlMessage(
        buildClaudeControlAllowResponse(requestId, {
          updatedInput,
          toolUseId: parsed.toolUseId
        })
      );
    } catch {
      this.writeControlDecision(requestId, false, {
        toolInput: parsed.toolInput,
        toolUseId: parsed.toolUseId
      });
    }
  }

  async resolveCanUseTool(parsed, turn) {
    const requestId = parsed.requestId;
    const toolName = parsed.toolName;

    if (
      isAskUserQuestionTool(toolName, parsed.toolInput, {
        requires_user_interaction: parsed.requiresUserInteraction
      })
    ) {
      await this.resolveAskUserQuestion(parsed, turn);
      return;
    }

    if (this.isToolAllowedForSession(toolName)) {
      this.writeControlDecision(requestId, true, {
        toolInput: parsed.toolInput,
        toolUseId: parsed.toolUseId
      });
      return;
    }

    const handler =
      typeof turn?.onPermissionRequest === "function"
        ? turn.onPermissionRequest
        : typeof this.config.onPermissionRequest === "function"
          ? this.config.onPermissionRequest
          : null;

    if (!handler) {
      this.writeControlDecision(requestId, false, {
        toolInput: parsed.toolInput,
        toolUseId: parsed.toolUseId
      });
      return;
    }

    try {
      const decision = await handler({
        cliRequestId: requestId,
        toolName,
        toolInput: parsed.toolInput,
        toolUseId: parsed.toolUseId,
        permissionSuggestions: parsed.permissionSuggestions
      });
      const allow = Boolean(decision?.allow);
      if (allow && String(decision?.scope || "") === "session") {
        this.rememberSessionToolAllow(toolName);
      }
      const updatedPermissions =
        allow &&
        String(decision?.scope || "") === "session" &&
        Array.isArray(parsed.permissionSuggestions) &&
        parsed.permissionSuggestions.length
          ? parsed.permissionSuggestions
          : undefined;
      this.writeControlMessage(
        allow
          ? buildClaudeControlAllowResponse(requestId, {
              updatedInput: parsed.toolInput,
              toolUseId: parsed.toolUseId,
              updatedPermissions
            })
          : buildClaudeControlDenyResponse(requestId, "Отклонено пользователем", {
              toolUseId: parsed.toolUseId
            })
      );
    } catch {
      this.writeControlDecision(requestId, false, {
        toolInput: parsed.toolInput,
        toolUseId: parsed.toolUseId
      });
    }
  }

  handleControlRequest(event) {
    const parsed = parseClaudeCanUseToolRequest(event);
    if (!parsed) return false;
    const turn = this.pendingTurn;
    void this.resolveCanUseTool(parsed, turn);
    return true;
  }

  buildArgs() {
    const { model, permissionMode, sessionId, systemPrompt, resume } = this.config;
    const args = [
      "-p",
      "--input-format",
      "stream-json",
      "--output-format",
      "stream-json",
      "--verbose",
      "--include-partial-messages"
    ];
    if (model) args.push("--model", String(model));
    this.appendClaudePermissionArgs(args);
    if (resume && sessionId) args.push("--resume", sessionId);
    else if (sessionId) args.push("--session-id", sessionId);
    if (systemPrompt && !(this.config.resume && this.config.sessionId)) {
      args.push("--system-prompt", systemPrompt);
    }
    return args;
  }

  dispose(reason = "dispose") {
    if (this.disposed) return;
    this.disposed = true;
    if (this.idleTimer) clearTimeout(this.idleTimer);
    const err = new Error(`Claude session closed (${reason})`);
    if (this.pendingTurn) {
      this.pendingTurn.reject(err);
      this.pendingTurn = null;
    }
    for (const job of this.turnQueue) job.reject(err);
    this.turnQueue = [];
    if (this.process && !this.process.killed) {
      try {
        this.process.stdin?.end();
        this.process.kill("SIGTERM");
      } catch {
        /* ignore */
      }
    }
    this.process = null;
    getCliSessionPool().remove(this);
  }

  ensureProcess() {
    if (this.process && !this.process.killed) return Promise.resolve();
    if (this.disposed) this.disposed = false;

    return new Promise((resolve, reject) => {
      const args = this.buildArgs();
      const child = spawn(this.config.binary, args, {
        cwd: this.config.cwd || process.cwd(),
        env: enrichShellPath(),
        stdio: ["pipe", "pipe", "pipe"]
      });
      this.process = child;
      this.stdoutBuffer = "";

      let bootErr = "";
      child.stderr.on("data", (chunk) => {
        bootErr += chunk.toString();
      });

      child.stdout.on("data", (chunk) => {
        this.stdoutBuffer += chunk.toString();
        this.stdoutBuffer = consumeJsonLinesFromBuffer(this.stdoutBuffer, (event) => {
          this.handleEvent(event);
        });
      });

      child.on("error", (error) => {
        if (!this.pendingTurn && this.turnQueue.length === 0) reject(error);
        this.dispose("process-error");
      });

      child.on("close", (code) => {
        const msg = bootErr.trim() || `Claude exited (${code})`;
        if (this.pendingTurn) {
          this.pendingTurn.reject(new Error(msg));
          this.pendingTurn = null;
        }
        this.process = null;
      });

      // Persistent stream-json waits on stdin; process is ready once spawned.
      setTimeout(() => resolve(), 50);
    });
  }

  handleEvent(event) {
    if (this.handleControlRequest(event)) return;

    const turn = this.pendingTurn;
    if (!turn) return;

    if (this.toolTracker) this.toolTracker.handleEvent(event);

    const err = claudeStreamError(event);
    if (err) {
      turn.lastError = err;
      this.finishTurn(new Error(err.replace(/^Error:\s*/i, "").trim() || err));
      return;
    }

    const delta = extractClaudeAssistantDelta(event);
    if (delta) {
      turn.text += delta;
      if (typeof turn.onDelta === "function") turn.onDelta(turn.text);
    }

    const full = extractClaudeResultText(event);
    if (full) turn.resultText = full;

    if (event?.type === "result") {
      const reply = String(turn.text || turn.resultText || "").trim();
      if (!reply && turn.lastError) {
        this.finishTurn(new Error(turn.lastError));
        return;
      }
      this.finishTurn(null, { text: reply || turn.resultText || "" });
    }
  }

  finishTurn(error, result) {
    const turn = this.pendingTurn;
    if (!turn) return;
    this.pendingTurn = null;
    this.busy = false;
    this.toolTracker = null;
    if (turn.signal) turn.signal.removeEventListener("abort", turn.onAbort);
    clearTimeout(turn.timer);
    if (error) turn.reject(error);
    else turn.resolve(result);
    resetIdleTimer(this);
    this.pumpQueue();
  }

  pumpQueue() {
    if (this.busy || this.turnQueue.length === 0) return;
    const job = this.turnQueue.shift();
    this.runTurn(job).catch((error) => job.reject(error));
  }

  async runTurn(job) {
    await this.ensureProcess();
    if (!this.process?.stdin?.writable) throw new Error("Claude stdin недоступен");

    this.busy = true;
    resetIdleTimer(this);

    const turn = {
      ...job,
      text: "",
      resultText: "",
      lastError: "",
      onAbort: () => {
        this.dispose("aborted");
        job.reject(new Error("Aborted"));
      }
    };

    turn.timer = setTimeout(() => {
      this.dispose("timeout");
      job.reject(new Error("CLI timeout"));
    }, job.timeoutMs || DEFAULT_TIMEOUT_MS);

    if (job.signal) {
      if (job.signal.aborted) turn.onAbort();
      else job.signal.addEventListener("abort", turn.onAbort, { once: true });
    }

    this.toolTracker = new ClaudeToolActivityTracker(job.onActivity);
    this.pendingTurn = turn;

    const payload = {
      type: "user",
      message: {
        role: "user",
        content: [{ type: "text", text: job.prompt }]
      }
    };
    this.process.stdin.write(`${JSON.stringify(payload)}\n`);
  }

  chat(options) {
    return new Promise((resolve, reject) => {
      const job = { ...options, resolve, reject };
      if (this.busy) this.turnQueue.push(job);
      else this.runTurn(job).catch(reject);
    });
  }
}

class CodexAppServerSession {
  constructor(config) {
    this.config = config;
    this.process = null;
    this.stdoutBuffer = "";
    this.nextId = 1;
    this.initialized = false;
    this.threadId = "";
    this.resumeFallback = false;
    this.pendingTurn = null;
    this.turnQueue = [];
    this.busy = false;
    this.idleTimer = null;
    this.disposed = false;
    this.pendingRequests = new Map();
    this.sessionApprovalKeys = new Set();
  }

  usesBypass() {
    return usesCodexBypass(this.config.permissionMode);
  }

  codexApprovalPolicy() {
    return resolveCodexApprovalPolicy(this.config.permissionMode);
  }

  codexSandboxMode() {
    return this.usesBypass() ? "dangerFullAccess" : "workspaceWrite";
  }

  isApprovalCached(method, params) {
    return this.sessionApprovalKeys.has(approvalCacheKey(method, params));
  }

  rememberApproval(method, params) {
    this.sessionApprovalKeys.add(approvalCacheKey(method, params));
  }

  resolvePermissionHandler(turn) {
    if (typeof turn?.onPermissionRequest === "function") return turn.onPermissionRequest;
    if (typeof this.config.onPermissionRequest === "function") return this.config.onPermissionRequest;
    return null;
  }

  resolveUserQuestionHandler(turn) {
    if (typeof turn?.onUserQuestionRequest === "function") return turn.onUserQuestionRequest;
    if (typeof this.config.onUserQuestionRequest === "function") return this.config.onUserQuestionRequest;
    return null;
  }

  async handleApprovalRequest(message) {
    const method = String(message?.method || "").trim();
    const params = message?.params && typeof message.params === "object" ? message.params : {};
    const requestId = message.id;

    if (this.usesBypass() || this.isApprovalCached(method, params)) {
      this.respond(
        requestId,
        buildCodexApprovalResponse(method, params, { allow: true, scope: "session" })
      );
      return;
    }

    const handler = this.resolvePermissionHandler(this.pendingTurn);
    if (!handler) {
      this.respond(requestId, buildCodexApprovalResponse(method, params, { allow: false }));
      return;
    }

    try {
      const decision = await handler(parseCodexApprovalRequest(method, params, requestId));
      const allow = Boolean(decision?.allow);
      const scope = String(decision?.scope || "once").trim() === "session" ? "session" : "once";
      if (allow && scope === "session") this.rememberApproval(method, params);
      this.respond(requestId, buildCodexApprovalResponse(method, params, { allow, scope }));
    } catch {
      this.respond(requestId, buildCodexApprovalResponse(method, params, { allow: false }));
    }
  }

  async handleUserInputRequest(message) {
    const params = message?.params && typeof message.params === "object" ? message.params : {};
    const requestId = message.id;
    const codexQuestions = Array.isArray(params.questions) ? params.questions : [];
    const { questions, idByQuestion } = normalizeCodexUserQuestions(codexQuestions);
    const handler = this.resolveUserQuestionHandler(this.pendingTurn);

    if (!handler || !questions.length) {
      this.respond(requestId, { answers: {} });
      return;
    }

    try {
      const decision = await handler({
        cliRequestId: String(requestId ?? ""),
        toolName: "request_user_input",
        toolInput: { questions },
        toolUseId: String(params.itemId || ""),
        questions
      });
      if (!decision?.allow) {
        this.respond(requestId, { answers: {} });
        return;
      }
      const answersByQuestion =
        decision?.updatedInput?.answers && typeof decision.updatedInput.answers === "object"
          ? decision.updatedInput.answers
          : {};
      const mappedQuestions = codexQuestions.map((item) => ({
        ...item,
        question: String(item?.question || "").trim(),
        id: String(item?.id || idByQuestion.get(String(item?.question || "").trim()) || "").trim()
      }));
      this.respond(requestId, buildCodexUserInputResponse(mappedQuestions, answersByQuestion));
    } catch {
      this.respond(requestId, { answers: {} });
    }
  }

  dispose(reason = "dispose") {
    if (this.disposed) return;
    this.disposed = true;
    if (this.idleTimer) clearTimeout(this.idleTimer);
    const err = new Error(`Codex session closed (${reason})`);
    if (this.pendingTurn) {
      this.pendingTurn.reject(err);
      this.pendingTurn = null;
    }
    for (const job of this.turnQueue) job.reject(err);
    this.turnQueue = [];
    for (const [, pending] of this.pendingRequests) pending.reject(err);
    this.pendingRequests.clear();
    if (this.process && !this.process.killed) {
      try {
        this.process.stdin?.end();
        this.process.kill("SIGTERM");
      } catch {
        /* ignore */
      }
    }
    this.process = null;
    this.initialized = false;
    this.threadId = "";
    this.resumeFallback = false;
    getCliSessionPool().remove(this);
  }

  writeMessage(message) {
    if (!this.process?.stdin?.writable) throw new Error("Codex app-server stdin недоступен");
    this.process.stdin.write(`${JSON.stringify(message)}\n`);
  }

  request(method, params = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Codex request timeout (${method})`));
      }, timeoutMs);
      this.pendingRequests.set(id, {
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        }
      });
      this.writeMessage({ method, id, params });
    });
  }

  respond(id, result) {
    this.writeMessage({ id, result });
  }

  ensureProcess() {
    if (this.process && !this.process.killed && this.initialized) return Promise.resolve();
    if (this.disposed) this.disposed = false;

    return new Promise((resolve, reject) => {
      const child = spawn(this.config.binary, ["app-server", "--listen", "stdio://"], {
        cwd: this.config.cwd || process.cwd(),
        env: enrichShellPath(),
        stdio: ["pipe", "pipe", "pipe"]
      });
      this.process = child;
      this.stdoutBuffer = "";
      this.initialized = false;

      child.stdout.on("data", (chunk) => {
        this.stdoutBuffer += chunk.toString();
        this.stdoutBuffer = consumeJsonLinesFromBuffer(this.stdoutBuffer, (message) => {
          this.handleWireMessage(message);
        });
      });

      child.on("error", (error) => {
        reject(error);
        this.dispose("process-error");
      });

      child.on("close", () => {
        this.process = null;
        this.initialized = false;
      });

      this.request("initialize", {
        clientInfo: {
          name: "agent_cms_voice",
          title: "Agent CMS Voice",
          version: "1.0.0"
        },
        capabilities: {
          optOutNotificationMethods: ["thread/started", "thread/tokenUsage/updated"]
        }
      })
        .then((result) => {
          this.writeMessage({ method: "initialized", params: {} });
          this.initialized = true;
          resolve(result);
        })
        .catch(reject);
    });
  }

  async ensureThread() {
    await this.ensureProcess();
    if (this.threadId) return this.threadId;

    const { cwd, model, sessionId, permissionMode, systemPrompt } = this.config;
    const threadParams = {
      cwd,
      approvalPolicy: this.codexApprovalPolicy(),
      sandbox: this.codexSandboxMode(),
      excludeTurns: true
    };
    if (model) threadParams.model = String(model);
    const instructions = String(systemPrompt || "").trim();
    if (instructions) threadParams.developerInstructions = instructions;

    if (sessionId) {
      try {
        const resumed = await this.request("thread/resume", {
          threadId: sessionId,
          cwd,
          excludeTurns: false,
          approvalPolicy: threadParams.approvalPolicy,
          sandbox: threadParams.sandbox,
          ...(instructions ? { developerInstructions: instructions } : {}),
          ...(model ? { model } : {})
        });
        this.threadId = String(resumed?.thread?.id || sessionId);
        return this.threadId;
      } catch {
        this.resumeFallback = true;
      }
    }

    const started = await this.request("thread/start", threadParams);
    this.threadId = String(started?.thread?.id || "");
    if (!this.threadId) throw new Error("Codex не вернул thread id");
    return this.threadId;
  }

  handleWireMessage(message) {
    if (!message || typeof message !== "object") return;

    if (message.id != null && message.method) {
      if (APPROVAL_METHODS.has(message.method)) {
        void this.handleApprovalRequest(message);
        return;
      }
      if (message.method === USER_INPUT_METHOD) {
        void this.handleUserInputRequest(message);
        return;
      }
      return;
    }

    if (message.id != null && ("result" in message || "error" in message)) {
      const pending = this.pendingRequests.get(message.id);
      if (!pending) return;
      this.pendingRequests.delete(message.id);
      if (message.error) {
        const detail =
          String(message.error?.message || message.error?.data || message.error || "").trim() ||
          "Codex JSON-RPC error";
        pending.reject(new Error(detail));
      } else pending.resolve(message.result);
      return;
    }

    if (message.method) this.handleNotification(message);
  }

  handleNotification(message) {
    const turn = this.pendingTurn;
    if (!turn) return;

    const mapped = codexNotificationToExecEvent(message);
    if (!mapped) return;

    if (mapped.type === "agent_message_delta" && mapped.delta) {
      turn.text += mapped.delta;
      if (typeof turn.onDelta === "function") turn.onDelta(turn.text);
      return;
    }

    if (mapped.type === "item.completed") {
      const itemType = snakeCaseType(mapped.item?.type);
      if (itemType === "agent_message") {
        const full = String(mapped.item?.text || "").trim();
        if (full) {
          turn.text = full;
          if (typeof turn.onDelta === "function") turn.onDelta(turn.text);
        }
      }
    }

    const toolActivity = extractCodexToolActivity(mapped);
    if (toolActivity && typeof turn.onActivity === "function") turn.onActivity(toolActivity);

    if (mapped.type === "turn.completed") {
      const status = String(mapped.turn?.status || "").toLowerCase();
      if (status === "failed") {
        const msg =
          String(mapped.turn?.error?.message || mapped.turn?.error || "").trim() ||
          "Codex turn failed";
        this.finishTurn(new Error(msg));
        return;
      }
      const reply = String(turn.text || "").trim();
      this.finishTurn(null, { text: reply });
    }
  }

  finishTurn(error, result) {
    const turn = this.pendingTurn;
    if (!turn) return;
    this.pendingTurn = null;
    this.busy = false;
    if (turn.signal) turn.signal.removeEventListener("abort", turn.onAbort);
    clearTimeout(turn.timer);
    if (error) turn.reject(error);
    else turn.resolve(result);
    resetIdleTimer(this);
    this.pumpQueue();
  }

  pumpQueue() {
    if (this.busy || this.turnQueue.length === 0) return;
    const job = this.turnQueue.shift();
    this.runTurn(job).catch((error) => job.reject(error));
  }

  async runTurn(job) {
    await this.ensureThread();
    this.busy = true;
    resetIdleTimer(this);

    const turn = {
      ...job,
      text: "",
      onAbort: async () => {
        try {
          if (this.threadId && turn.turnId) {
            await this.request("turn/interrupt", {
              threadId: this.threadId,
              turnId: turn.turnId
            });
          }
        } catch {
          /* ignore */
        }
        this.dispose("aborted");
        job.reject(new Error("Aborted"));
      }
    };

    turn.timer = setTimeout(() => {
      this.dispose("timeout");
      job.reject(new Error("CLI timeout"));
    }, job.timeoutMs || DEFAULT_TIMEOUT_MS);

    if (job.signal) {
      if (job.signal.aborted) turn.onAbort();
      else job.signal.addEventListener("abort", turn.onAbort, { once: true });
    }

    this.pendingTurn = turn;

    const started = await this.request("turn/start", {
      threadId: this.threadId,
      input: [{ type: "text", text: job.prompt }],
      cwd: this.config.cwd,
      approvalPolicy: this.codexApprovalPolicy(),
      sandbox: this.codexSandboxMode(),
      ...(this.config.model ? { model: this.config.model } : {})
    });
    turn.turnId = String(started?.turn?.id || "");
  }

  chat(options) {
    return new Promise((resolve, reject) => {
      const job = { ...options, resolve, reject };
      if (this.busy) this.turnQueue.push(job);
      else this.runTurn(job).catch(reject);
    });
  }
}

class CliSessionPool {
  constructor() {
    this.sessions = new Map();
  }

  getSession(runtime, config) {
    const key = sessionPoolKey(runtime, config);
    let session = this.sessions.get(key);
    if (session && !session.disposed) return session;

    if (runtime === "claude") {
      session = new ClaudePersistentSession(config);
    } else if (runtime === "codex") {
      session = new CodexAppServerSession(config);
    } else {
      throw new Error(`Persistent CLI unsupported for runtime: ${runtime}`);
    }
    session.disposed = false;
    this.sessions.set(key, session);
    return session;
  }

  remove(session) {
    for (const [key, value] of this.sessions.entries()) {
      if (value === session) this.sessions.delete(key);
    }
  }

  shutdown() {
    for (const session of this.sessions.values()) session.dispose("shutdown");
    this.sessions.clear();
  }
}

let pool = null;

function getCliSessionPool() {
  if (!pool) pool = new CliSessionPool();
  return pool;
}

function isPersistentCliEnabled() {
  return PERSISTENT_ENABLED;
}

function shutdownCliSessionPool() {
  if (pool) pool.shutdown();
}

module.exports = {
  CliSessionPool,
  ClaudePersistentSession,
  CodexAppServerSession,
  getCliSessionPool,
  isPersistentCliEnabled,
  shutdownCliSessionPool,
  sessionPoolKey
};
