#!/usr/bin/env node
"use strict";

const { spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  loadAgentCmsEnv,
  resolveMcpUrl,
  resolveMcpHttpAlt,
  mcpToken
} = require("./mcp-connector-env.js");

function claudeDesktopConfigPath() {
  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support", "Claude", "claude_desktop_config.json");
  }
  if (process.platform === "win32") {
    const appData = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
    return path.join(appData, "Claude", "claude_desktop_config.json");
  }
  return path.join(os.homedir(), ".config", "Claude", "claude_desktop_config.json");
}

function run(bin, args, opts = {}) {
  const r = spawnSync(bin, args, { stdio: "inherit", shell: false, ...opts });
  if (r.error) {
    console.error(`Не найден ${bin}: ${r.error.message}`);
    process.exit(1);
  }
  process.exit(r.status ?? 1);
}

function claudeCodeAdd(name, mcpUrl, token) {
  const args = ["mcp", "add", "--transport", "http", name, mcpUrl];
  if (token) args.push("--header", `Authorization: Bearer ${token}`);
  console.log(`→ claude ${args.join(" ")}`);
  run("claude", args);
}

function claudeCodeRemove(name) {
  run("claude", ["mcp", "remove", name]);
}

function codexAdd(name, mcpUrl, token) {
  const args = ["mcp", "add", name, "--url", mcpUrl];
  const childEnv = { ...process.env };
  if (token) {
    args.push("--bearer-token-env-var", "AGENT_CMS_MCP_TOKEN");
    childEnv.AGENT_CMS_MCP_TOKEN = token;
  }
  console.log(`→ codex ${args.join(" ")}`);
  run("codex", args, { env: childEnv });
}

function codexRemove(name) {
  run("codex", ["mcp", "remove", name]);
}

function claudeDesktopViaNode(action, name) {
  const script = path.join(__dirname, "claude-desktop-mcp.js");
  const r = spawnSync(process.execPath, [script, action, name], {
    stdio: "inherit",
    env: process.env
  });
  process.exit(r.status ?? (r.error ? 1 : 0));
}

function printStatus({ env }) {
  const mcpUrl = resolveMcpUrl(env);
  const mcpHttp = resolveMcpHttpAlt(env);
  const token = mcpToken(env);
  const desktopPath = claudeDesktopConfigPath();

  console.log("Agent CMS MCP (из .env):");
  console.log(`  URL:     ${mcpUrl}`);
  console.log(`  HTTP:    ${mcpHttp}`);
  console.log(`  Token:   ${token ? "задан (AGENT_CMS_MCP_TOKEN)" : "нет (auth none)"}`);
  console.log(`  Desktop: ${desktopPath}`);

  if (fs.existsSync(desktopPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(desktopPath, "utf8"));
      const names = data.mcpServers ? Object.keys(data.mcpServers) : [];
      console.log(`  Desktop mcpServers: ${names.length ? names.join(", ") : "(пусто)"}`);
    } catch {
      console.log("  Desktop mcpServers: (не удалось прочитать JSON)");
    }
  } else {
    console.log("  Desktop mcpServers: (файла нет)");
  }

  console.log("");
  if (spawnSync("claude", ["mcp", "list"], { stdio: "inherit", shell: false }).error) {
    console.log("(claude CLI не найден — пропуск claude mcp list)");
  }
  console.log("");
  if (spawnSync("codex", ["mcp", "list"], { stdio: "inherit", shell: false }).error) {
    console.log("(codex CLI не найден — пропуск codex mcp list)");
  }
}

function usage() {
  console.error(`Usage: agent-cms-mcp-cli.js <target> <add|remove> [name]
       agent-cms-mcp-cli.js status

Targets:
  claude-desktop   Claude.app (claude_desktop_config.json + mcp-remote)
  claude-code      Claude Code (claude mcp add)
  codex            Codex CLI/Desktop (~/.codex/config.toml)

Default names: claude-desktop → agent-cms-mac; claude-code / codex → agent-cms`);
  process.exit(1);
}

function main() {
  const target = process.argv[2];
  if (!target) usage();

  const { env } = loadAgentCmsEnv();
  const mcpUrl = resolveMcpUrl(env);
  const token = mcpToken(env);

  if (target === "status") {
    printStatus({ env });
    return;
  }

  const action = process.argv[3] || "add";
  if (action !== "add" && action !== "remove") usage();

  let defaultName = "agent-cms";
  if (target === "claude-desktop") defaultName = "agent-cms-mac";
  const name = process.argv[4] || defaultName;

  switch (target) {
    case "claude-desktop":
      claudeDesktopViaNode(action, name);
      break;
    case "claude-code":
      if (action === "add") claudeCodeAdd(name, mcpUrl, token);
      else claudeCodeRemove(name);
      break;
    case "codex":
      if (action === "add") codexAdd(name, mcpUrl, token);
      else codexRemove(name);
      break;
    default:
      usage();
  }
}

main();
