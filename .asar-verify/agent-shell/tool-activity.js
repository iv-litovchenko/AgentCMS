const TOOL_TEXT_LIMIT = 1400;

function truncateToolText(value, limit = TOOL_TEXT_LIMIT) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  if (text.length <= limit) return text;
  return `${text.slice(0, limit)}…`;
}

function formatToolArgs(value) {
  if (value == null || value === "") return "";
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";
    try {
      return truncateToolText(JSON.stringify(JSON.parse(trimmed), null, 2));
    } catch {
      return truncateToolText(trimmed);
    }
  }
  try {
    return truncateToolText(JSON.stringify(value, null, 2));
  } catch {
    return truncateToolText(String(value));
  }
}

function extractTextFromMcpContent(content) {
  const blocks = Array.isArray(content) ? content : [];
  const parts = [];
  for (const block of blocks) {
    if (!block || typeof block !== "object") continue;
    const type = String(block.type || "").toLowerCase();
    if (type === "text" && block.text) parts.push(String(block.text));
    else if (block.text) parts.push(String(block.text));
    else if (block.message) parts.push(String(block.message));
  }
  return parts.join("\n").trim();
}

function normalizeToolActivity(raw = {}) {
  const kind = String(raw.kind || "tool").trim() || "tool";
  const phase = String(raw.phase || "start").trim() || "start";
  const tool = String(raw.tool || "").trim();
  const toolId = String(raw.toolId || raw.id || tool || "").trim();
  const args = truncateToolText(String(raw.args ?? "").trim());
  const result = truncateToolText(String(raw.result ?? "").trim());
  let status = String(raw.status || "").trim().toLowerCase();
  if (!status) {
    if (phase === "end") status = raw.error ? "error" : "ok";
    else if (phase === "failed") status = "error";
    else status = "running";
  }
  const phrase =
    String(raw.phrase || "").trim() ||
    (tool ? (phase === "end" ? `✓ ${tool}` : `🔧 ${tool}…`) : "");
  return {
    kind,
    phase,
    tool: tool || "tool",
    toolId: toolId || tool || "tool",
    args,
    result,
    status,
    phrase,
    error: String(raw.error || "").trim() || undefined,
    priority: Number(raw.priority) || 0
  };
}

function extractQwenPawToolDetails(event) {
  if (!event || typeof event !== "object") return { args: "", result: "" };

  const dataObj = event?.data && typeof event.data === "object" ? event.data : null;
  let args =
    dataObj?.input ??
    dataObj?.arguments ??
    dataObj?.args ??
    event?.input ??
    event?.arguments ??
    event?.args ??
    null;
  let result =
    dataObj?.output ??
    dataObj?.result ??
    event?.output ??
    event?.result ??
    null;

  for (const part of Array.isArray(event?.content) ? event.content : []) {
    if (!part || typeof part !== "object") continue;
    const type = String(part.type || "").toLowerCase();
    if (args == null && (part.input != null || part.arguments != null)) {
      args = part.input ?? part.arguments;
    }
    if (result == null && (part.output != null || part.result != null || part.content != null)) {
      result = part.output ?? part.result ?? part.content;
    }
    if (type.includes("output") || type.includes("result")) {
      if (part.text) result = part.text;
      else if (typeof part.content === "string") result = part.content;
      else if (Array.isArray(part.content)) result = extractTextFromMcpContent(part.content);
    }
    if (type.includes("tool") || type.includes("function")) {
      if (part.input != null) args = part.input;
      if (part.arguments != null) args = part.arguments;
    }
  }

  if (typeof result === "object" && result != null) {
    if (Array.isArray(result.content)) result = extractTextFromMcpContent(result.content);
    else if (result.text) result = result.text;
    else result = JSON.stringify(result);
  }

  return {
    args: formatToolArgs(args),
    result: truncateToolText(typeof result === "string" ? result : formatToolArgs(result))
  };
}

function enrichQwenPawActivity(activity, event) {
  if (!activity || activity.kind !== "tool") return activity;
  const details = extractQwenPawToolDetails(event);
  const toolId =
    String(event?.id || event?.call_id || event?.tool_call_id || activity.tool || "").trim() ||
    activity.tool;
  return normalizeToolActivity({
    ...activity,
    toolId,
    args: activity.args || details.args,
    result: activity.phase === "end" ? activity.result || details.result : activity.result,
    status:
      activity.phase === "end"
        ? details.result && /error|fail/i.test(details.result)
          ? "error"
          : "ok"
        : "running"
  });
}

function extractClaudeToolResultContent(content) {
  if (typeof content === "string") return truncateToolText(content);
  if (Array.isArray(content)) {
    return truncateToolText(
      content
        .map((block) => {
          if (!block || typeof block !== "object") return "";
          if (block.type === "text") return String(block.text || "");
          return String(block.text || block.content || "");
        })
        .filter(Boolean)
        .join("\n")
    );
  }
  return "";
}

class ClaudeToolActivityTracker {
  constructor(onActivity) {
    this.onActivity = typeof onActivity === "function" ? onActivity : null;
    this.blocks = new Map();
    this.activeTools = new Map();
  }

  emit(activity) {
    if (!activity || !this.onActivity) return;
    this.onActivity(normalizeToolActivity(activity));
  }

  emitToolStart({ toolId, tool, args, priority = 40 }) {
    const id = String(toolId || tool || "tool").trim() || "tool";
    const name = String(tool || "tool").trim() || "tool";
    const formattedArgs = formatToolArgs(args);
    const existing = this.activeTools.get(id);
    if (existing) {
      if (formattedArgs && !existing.args) {
        existing.args = formattedArgs;
        this.emit({
          kind: "tool",
          phase: "progress",
          tool: existing.tool || name,
          toolId: id,
          args: formattedArgs,
          status: "running",
          priority: Math.max(priority, 38)
        });
      }
      return;
    }
    this.activeTools.set(id, { tool: name, args: formattedArgs });
    this.emit({
      kind: "tool",
      phase: "start",
      tool: name,
      toolId: id,
      args: formattedArgs,
      status: "running",
      priority
    });
  }

  emitToolEnd({ toolId, tool, result, status = "ok", priority = 35 }) {
    const id = String(toolId || tool || "tool").trim() || "tool";
    const existing = this.activeTools.get(id);
    const name = String(tool || existing?.tool || id || "tool").trim() || "tool";
    this.activeTools.delete(id);
    this.emit({
      kind: "tool",
      phase: "end",
      tool: name,
      toolId: id,
      result: extractClaudeToolResultContent(result),
      status,
      priority
    });
  }

  handleEvent(event) {
    if (!event || typeof event !== "object" || event.is_error) return;

    const type = String(event.type || "");

    if (type === "stream_event" && event.event && typeof event.event === "object") {
      this.handleEvent(event.event);
      return;
    }

    if (type === "tool_use") {
      const toolId = String(event.id || event.tool_use_id || event.name || "tool").trim();
      const tool = String(event.name || event.tool || "tool").trim() || "tool";
      this.emitToolStart({
        toolId,
        tool,
        args: event.input ?? event.arguments ?? event.args ?? null,
        priority: 40
      });
      return;
    }

    if (type === "tool_result") {
      const toolId = String(event.tool_use_id || event.id || "").trim();
      const mapped = [...this.blocks.values()].find((entry) => entry.toolId === toolId);
      const tool = String(mapped?.tool || event.name || toolId || "tool").trim() || "tool";
      this.emitToolEnd({
        toolId: toolId || tool,
        tool,
        result: event.content ?? event.result ?? event.output,
        status: event.is_error ? "error" : "ok",
        priority: 35
      });
      return;
    }

    if (type === "content_block_start") {
      const block = event.content_block;
      const blockType = String(block?.type || "");
      const index = Number(event.index);

      if (blockType === "tool_use" || blockType === "server_tool_use") {
        const toolId = String(block.id || `claude-tool-${index}`).trim();
        const tool = String(block.name || block.tool || "tool").trim() || "tool";
        const args = formatToolArgs(block.input ?? block.query ?? block.arguments ?? null);
        this.blocks.set(index, { toolId, tool, inputJson: args ? "" : JSON.stringify(block.input || {}) });
        this.emitToolStart({
          toolId,
          tool,
          args: args || block.input || {},
          priority: 40
        });
        return;
      }

      if (blockType === "tool_result" || blockType === "web_search_tool_result" || blockType === "web_fetch_tool_result") {
        const toolId = String(block.tool_use_id || block.id || "").trim();
        const mapped = [...this.blocks.values()].find((entry) => entry.toolId === toolId);
        const tool =
          String(mapped?.tool || block.name || "").trim() ||
          (blockType === "web_search_tool_result" ? "WebSearch" : blockType === "web_fetch_tool_result" ? "WebFetch" : toolId || "tool");
        this.emitToolEnd({
          toolId: toolId || tool,
          tool,
          result: block.content ?? block.results ?? block.output,
          status: block.is_error ? "error" : "ok",
          priority: 35
        });
        return;
      }

      return;
    }

    if (type === "content_block_delta") {
      const delta = event.delta;
      if (delta?.type !== "input_json_delta") return;
      const index = Number(event.index);
      const entry = this.blocks.get(index);
      if (!entry) return;
      entry.inputJson = `${entry.inputJson || ""}${String(delta.partial_json || "")}`;
      this.blocks.set(index, entry);
      return;
    }

    if (type === "content_block_stop") {
      const index = Number(event.index);
      const entry = this.blocks.get(index);
      if (!entry) return;
      if (entry.inputJson) {
        const args = formatToolArgs(entry.inputJson);
        const active = this.activeTools.get(entry.toolId);
        if (active) active.args = args;
        this.emit({
          kind: "tool",
          phase: "progress",
          tool: entry.tool,
          toolId: entry.toolId,
          args,
          status: "running",
          priority: 38
        });
      }
      this.blocks.delete(index);
      return;
    }

    if (type === "assistant" && Array.isArray(event.message?.content)) {
      const serverUsage = event.message?.usage?.server_tool_use;
      if (serverUsage && typeof serverUsage === "object") {
        if (Number(serverUsage.web_search_requests) > 0) {
          this.emitToolStart({ toolId: "WebSearch", tool: "WebSearch", args: "", priority: 42 });
        }
        if (Number(serverUsage.web_fetch_requests) > 0) {
          this.emitToolStart({ toolId: "WebFetch", tool: "WebFetch", args: "", priority: 42 });
        }
      }
      for (const block of event.message.content) {
        if (!block || typeof block !== "object") continue;
        if (block.type === "tool_use" || block.type === "server_tool_use") {
          this.emitToolStart({
            toolId: String(block.id || block.tool_use_id || block.name || "tool"),
            tool: String(block.name || block.tool || "tool"),
            args: block.input ?? block.query ?? block.arguments ?? null,
            priority: 40
          });
        }
        if (block.type === "tool_result" || block.type === "web_search_tool_result") {
          const toolId = String(block.tool_use_id || "").trim();
          const mapped = [...this.blocks.values()].find((entry) => entry.toolId === toolId);
          const tool = String(mapped?.tool || toolId || "tool").trim() || "tool";
          this.emitToolEnd({
            toolId: toolId || tool,
            tool,
            result: block.content,
            status: block.is_error ? "error" : "ok",
            priority: 35
          });
        }
      }
    }
  }
}

function normalizeCodexActionType(value) {
  return String(value || "")
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/-/g, "_")
    .toLowerCase();
}

function summarizeCodexWebAction(item = {}) {
  const action = item.action && typeof item.action === "object" ? item.action : null;
  const actionType = normalizeCodexActionType(action?.type);
  if (actionType === "open_page") {
    return {
      tool: "WebFetch",
      args: truncateToolText(String(action.url || item.url || ""))
    };
  }
  if (actionType === "find_in_page") {
    return {
      tool: "WebFetch",
      args: truncateToolText(`${action.url || item.url || ""} ${action.pattern || ""}`.trim())
    };
  }
  const query =
    truncateToolText(String(action?.query || item.query || "").trim()) ||
    truncateToolText((Array.isArray(action?.queries) ? action.queries : []).join(", "));
  return { tool: "WebSearch", args: query };
}

function summarizeCodexFileChanges(changes = []) {
  return (Array.isArray(changes) ? changes : [])
    .map((change) => {
      if (!change || typeof change !== "object") return "";
      const path = String(change.path || change.file || "").trim();
      const kind = String(change.kind?.type || change.kind || "update").trim();
      const diff = String(change.diff || "").trim();
      if (diff) return `${kind} ${path}\n${truncateToolText(diff, 240)}`.trim();
      return `${kind} ${path}`.trim();
    })
    .filter(Boolean)
    .join("\n");
}

function extractCodexToolActivity(event, trackerState = null) {
  if (!event || typeof event !== "object") return null;

  const type = String(event.type || event.event || "").toLowerCase();

  if (type === "item.mcp_tool_call.progress") {
    const toolId = String(event.itemId || event.item_id || "mcp").trim() || "mcp";
    const tracked = trackerState?.get?.(toolId);
    const tool = String(tracked?.tool || "MCP").trim() || "MCP";
    const message = truncateToolText(String(event.message || ""));
    const args = message || tracked?.args || "";
    if (trackerState && args) trackerState.set(toolId, { ...tracked, tool, args });
    return normalizeToolActivity({
      kind: "tool",
      phase: "progress",
      tool,
      toolId,
      args,
      status: "running",
      priority: 38
    });
  }

  if (type === "item.file_change.patch_updated") {
    const toolId = String(event.itemId || event.item_id || "edit").trim() || "edit";
    const summary = truncateToolText(summarizeCodexFileChanges(event.changes));
    const tracked = trackerState?.get?.(toolId);
    const tool = String(tracked?.tool || "Edit").trim() || "Edit";
    const args = summary || tracked?.args || "";
    if (trackerState && args) trackerState.set(toolId, { ...tracked, tool, args });
    return normalizeToolActivity({
      kind: "tool",
      phase: "progress",
      tool,
      toolId,
      args,
      status: "running",
      priority: 38
    });
  }

  if (type === "item.command_execution.output_delta") {
    const toolId = String(event.itemId || event.item_id || "bash").trim() || "bash";
    const tracked = trackerState?.get?.(toolId);
    const tool = String(tracked?.tool || "Bash").trim() || "Bash";
    const delta = truncateToolText(String(event.delta || event.output || ""));
    if (!delta) return null;
    const result = truncateToolText(`${tracked?.result || ""}${delta}`);
    if (trackerState) trackerState.set(toolId, { ...tracked, tool, result });
    return normalizeToolActivity({
      kind: "tool",
      phase: "progress",
      tool,
      toolId,
      args: tracked?.args || "",
      result,
      status: "running",
      priority: 36
    });
  }

  if (!type.startsWith("item.")) return null;

  const phase = type === "item.completed" ? "end" : "start";
  const item = event.item && typeof event.item === "object" ? event.item : null;
  if (!item) return null;

  const itemType = normalizeCodexActionType(item.type);
  const toolId = String(item.id || itemType).trim() || itemType;
  const statusRaw = String(item.status || "").toLowerCase();

  if (itemType === "command_execution") {
    const tool = "Bash";
    const args = truncateToolText(String(item.command || ""));
    const result = truncateToolText(String(item.aggregated_output || ""));
    const failed = statusRaw === "failed" || (item.exit_code != null && Number(item.exit_code) !== 0);
    if (trackerState && phase === "start") trackerState.set(toolId, { tool, args, result: "" });
    if (trackerState && phase === "end") trackerState.delete(toolId);
    return normalizeToolActivity({
      kind: "tool",
      phase,
      tool,
      toolId,
      args,
      result: phase === "end" ? result : "",
      status: phase === "end" ? (failed ? "error" : "ok") : "running",
      priority: 40
    });
  }

  if (itemType === "mcp_tool_call") {
    const server = String(item.server || "").trim();
    const tool = String(item.tool || "mcp").trim() || "mcp";
    const label = server ? `${server}/${tool}` : tool;
    const args = formatToolArgs(item.arguments ?? item.args ?? null);
    let result = "";
    if (item.result) {
      if (Array.isArray(item.result.content)) result = extractTextFromMcpContent(item.result.content);
      else if (item.result.structured_content != null) result = formatToolArgs(item.result.structured_content);
      else result = formatToolArgs(item.result);
    }
    if (!result && item.error?.message) result = String(item.error.message);
    const failed = statusRaw === "failed" || Boolean(item.error);
    if (trackerState && phase === "start") trackerState.set(toolId, { tool: label, args, result: "" });
    if (trackerState && phase === "end") trackerState.delete(toolId);
    return normalizeToolActivity({
      kind: "tool",
      phase,
      tool: label,
      toolId,
      args,
      result: phase === "end" ? result : "",
      status: phase === "end" ? (failed ? "error" : "ok") : "running",
      error: item.error?.message ? String(item.error.message) : undefined,
      priority: 40
    });
  }

  if (itemType === "web_search" || itemType === "web_search_call") {
    const { tool, args } = summarizeCodexWebAction(item);
    return normalizeToolActivity({
      kind: "tool",
      phase: phase === "end" ? "end" : "start",
      tool,
      toolId,
      args,
      result: phase === "end" ? args : "",
      status: phase === "end" ? (statusRaw === "failed" ? "error" : "ok") : "running",
      priority: tool === "WebFetch" ? 42 : 35
    });
  }

  if (itemType === "file_change") {
    const changes = Array.isArray(item.changes) ? item.changes : [];
    const summary = truncateToolText(summarizeCodexFileChanges(changes));
    const failed = statusRaw === "failed";
    if (trackerState && phase === "start") trackerState.set(toolId, { tool: "Edit", args: summary, result: "" });
    if (trackerState && phase === "end") trackerState.delete(toolId);
    return normalizeToolActivity({
      kind: "tool",
      phase: phase === "end" ? "end" : "start",
      tool: "Edit",
      toolId,
      args: summary,
      result: phase === "end" ? summary : "",
      status: phase === "end" ? (failed ? "error" : "ok") : "running",
      priority: 35
    });
  }

  return null;
}

class CodexToolActivityTracker {
  constructor(onActivity) {
    this.onActivity = typeof onActivity === "function" ? onActivity : null;
    this.items = new Map();
  }

  emit(activity) {
    if (!activity || !this.onActivity) return;
    this.onActivity(normalizeToolActivity(activity));
  }

  handleEvent(event) {
    const activity = extractCodexToolActivity(event, this.items);
    if (activity) this.emit(activity);
  }
}

module.exports = {
  truncateToolText,
  formatToolArgs,
  normalizeToolActivity,
  enrichQwenPawActivity,
  extractQwenPawToolDetails,
  ClaudeToolActivityTracker,
  CodexToolActivityTracker,
  extractCodexToolActivity
};
