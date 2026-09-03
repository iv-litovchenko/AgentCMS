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
  }

  emit(activity) {
    if (!activity || !this.onActivity) return;
    this.onActivity(normalizeToolActivity(activity));
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
      this.emit({
        kind: "tool",
        phase: "start",
        tool,
        toolId,
        args: formatToolArgs(event.input ?? event.arguments ?? event.args ?? null),
        status: "running",
        priority: 40
      });
      return;
    }

    if (type === "tool_result") {
      const toolId = String(event.tool_use_id || event.id || "").trim();
      const mapped = [...this.blocks.values()].find((entry) => entry.toolId === toolId);
      const tool = String(mapped?.tool || event.name || toolId || "tool").trim() || "tool";
      this.emit({
        kind: "tool",
        phase: "end",
        tool,
        toolId: toolId || tool,
        result: extractClaudeToolResultContent(event.content ?? event.result ?? event.output),
        status: event.is_error ? "error" : "ok",
        priority: 35
      });
      return;
    }

    if (type === "content_block_start") {
      const block = event.content_block;
      const blockType = String(block?.type || "");
      const index = Number(event.index);

      if (blockType === "tool_use") {
        const toolId = String(block.id || `claude-tool-${index}`).trim();
        const tool = String(block.name || "tool").trim() || "tool";
        const args = formatToolArgs(block.input || {});
        this.blocks.set(index, { toolId, tool, inputJson: args ? "" : JSON.stringify(block.input || {}) });
        this.emit({
          kind: "tool",
          phase: "start",
          tool,
          toolId,
          args: args || formatToolArgs(block.input || {}),
          status: "running",
          priority: 40
        });
        return;
      }

      if (blockType === "tool_result") {
        const toolId = String(block.tool_use_id || "").trim();
        const mapped = [...this.blocks.values()].find((entry) => entry.toolId === toolId);
        const tool = String(mapped?.tool || toolId || "tool").trim() || "tool";
        const result = extractClaudeToolResultContent(block.content);
        this.emit({
          kind: "tool",
          phase: "end",
          tool,
          toolId: toolId || tool,
          result,
          status: block.is_error ? "error" : "ok",
          priority: 35
        });
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
        this.emit({
          kind: "tool",
          phase: "progress",
          tool: entry.tool,
          toolId: entry.toolId,
          args: formatToolArgs(entry.inputJson),
          status: "running",
          priority: 38
        });
      }
      this.blocks.delete(index);
      return;
    }

    if (type === "assistant" && Array.isArray(event.message?.content)) {
      for (const block of event.message.content) {
        if (!block || typeof block !== "object") continue;
        if (block.type === "tool_use" || block.type === "server_tool_use") {
          this.emit({
            kind: "tool",
            phase: "start",
            tool: String(block.name || block.tool || "tool"),
            toolId: String(block.id || block.tool_use_id || block.name || "tool"),
            args: formatToolArgs(block.input ?? block.query ?? block.arguments ?? null),
            status: "running",
            priority: 40
          });
        }
        if (block.type === "tool_result" || block.type === "web_search_tool_result") {
          const toolId = String(block.tool_use_id || "").trim();
          const mapped = [...this.blocks.values()].find((entry) => entry.toolId === toolId);
          const tool = String(mapped?.tool || toolId || "tool").trim() || "tool";
          this.emit({
            kind: "tool",
            phase: "end",
            tool,
            toolId: toolId || tool,
            result: extractClaudeToolResultContent(block.content),
            status: block.is_error ? "error" : "ok",
            priority: 35
          });
        }
      }
    }
  }
}

function extractCodexToolActivity(event) {
  if (!event || typeof event !== "object") return null;

  const type = String(event.type || event.event || "").toLowerCase();
  if (!type.startsWith("item.")) return null;

  const phase = type === "item.completed" ? "end" : "start";
  const item = event.item && typeof event.item === "object" ? event.item : null;
  if (!item) return null;

  const itemType = String(item.type || "").trim();
  const toolId = String(item.id || itemType).trim() || itemType;
  const statusRaw = String(item.status || "").toLowerCase();

  if (itemType === "command_execution") {
    const tool = "Bash";
    const args = truncateToolText(String(item.command || ""));
    const result = truncateToolText(String(item.aggregated_output || ""));
    const failed = statusRaw === "failed" || (item.exit_code != null && Number(item.exit_code) !== 0);
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

  if (itemType === "web_search") {
    const query = truncateToolText(String(item.query || ""));
    return normalizeToolActivity({
      kind: "tool",
      phase: "end",
      tool: "WebSearch",
      toolId,
      args: query,
      result: query,
      status: "ok",
      priority: 35
    });
  }

  if (itemType === "file_change" && phase === "end") {
    const changes = Array.isArray(item.changes) ? item.changes : [];
    const summary = changes
      .map((change) => `${change?.kind || "update"} ${change?.path || ""}`.trim())
      .filter(Boolean)
      .join("\n");
    const failed = statusRaw === "failed";
    return normalizeToolActivity({
      kind: "tool",
      phase: "end",
      tool: "Edit",
      toolId,
      args: truncateToolText(summary),
      result: truncateToolText(summary),
      status: failed ? "error" : "ok",
      priority: 35
    });
  }

  return null;
}

module.exports = {
  truncateToolText,
  formatToolArgs,
  normalizeToolActivity,
  enrichQwenPawActivity,
  extractQwenPawToolDetails,
  ClaudeToolActivityTracker,
  extractCodexToolActivity
};
