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
  resolveMcpHttpsUrl,
  resolveMcpUrlForMode,
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

function claudeDesktopViaNode(action, name, mcpUrl) {
  const script = path.join(__dirname, "claude-desktop-mcp.js");
  const env = { ...process.env, AGENT_CMS_MCP_CONNECTOR_URL: mcpUrl };
  const r = spawnSync(process.execPath, [script, action, name], {
    stdio: "inherit",
    env
  });
  process.exit(r.status ?? (r.error ? 1 : 0));
}

function printStatus({ env }) {
  const mcpPublic = resolveMcpUrl(env);
  const mcpHttp = resolveMcpHttpAlt(env);
  const mcpHttps = resolveMcpHttpsUrl(env);
  const token = mcpToken(env);
  const desktopPath = claudeDesktopConfigPath();

  console.log("Agent CMS MCP (из .env):");
  console.log(`  PUBLIC:  ${mcpPublic}  (add без флага — AGENT_CMS_PUBLIC_URL)`);
  console.log(`  HTTPS:   ${mcpHttps}  (add --https)`);
  console.log(`  HTTP:    ${mcpHttp}  (add --http)`);
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

function parseConnectorArgs(argv) {
  const target = argv[0];
  if (!target) return { error: "missing target" };

  if (target === "status") return { target: "status" };

  const action = argv[1] || "add";
  if (action !== "add" && action !== "remove") {
    return { error: "bad action" };
  }

  let urlMode = "public";
  let name;
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--http") urlMode = "http";
    else if (a === "--https") urlMode = "https";
    else if (!a.startsWith("--")) name = a;
  }

  let defaultName = "agent-cms";
  if (target === "claude-desktop") defaultName = "agent-cms-mac";

  return {
    target,
    action,
    urlMode,
    name: name || defaultName
  };
}

function usage() {
  console.error(`Usage: agent-cms-mcp-cli.js <target> add|remove [--https|--http] [name]
       agent-cms-mcp-cli.js status

  add без флага — URL из AGENT_CMS_PUBLIC_URL (+ /app-mcp)
  add --https   — https://127.0.0.1:3443/app-mcp (или PUBLIC_URL если уже https)
  add --http    — http://127.0.0.1:3000/app-mcp

Targets: claude-desktop | claude-code | codex`);
  process.exit(1);
}

function main() {
  const parsed = parseConnectorArgs(process.argv.slice(2));
  if (parsed.error) usage();

  const { env } = loadAgentCmsEnv();

  if (parsed.target === "status") {
    printStatus({ env });
    return;
  }

  const { target, action, urlMode, name } = parsed;
  const mcpUrl = resolveMcpUrlForMode(env, urlMode);
  const token = mcpToken(env);

  if (action === "add") {
    console.log(`MCP URL: ${mcpUrl}`);
  }

  switch (target) {
    case "claude-desktop":
      claudeDesktopViaNode(action, name, mcpUrl);
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
