#!/usr/bin/env node
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { loadAgentCmsEnv, resolveMcpUrl, mcpToken } = require("./mcp-connector-env.js");

function configPath() {
  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support", "Claude", "claude_desktop_config.json");
  }
  if (process.platform === "win32") {
    const appData = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
    return path.join(appData, "Claude", "claude_desktop_config.json");
  }
  return path.join(os.homedir(), ".config", "Claude", "claude_desktop_config.json");
}

function buildServerEntry(mcpUrl, token) {
  const args = ["-y", "mcp-remote", mcpUrl];
  if (token) {
    args.push("--header", `Authorization: Bearer ${token}`);
  }
  const entry = {
    command: "npx",
    args
  };
  if (mcpUrl.startsWith("https://")) {
    entry.env = { NODE_TLS_REJECT_UNAUTHORIZED: "0" };
  }
  return entry;
}

function loadConfig(filePath) {
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (err) {
    console.error(`Не удалось прочитать ${filePath}: ${err.message}`);
    process.exit(1);
  }
}

function main() {
  const action = process.argv[2] || "add";
  const name = process.argv[3] || "agent-cms-mac";
  const { env } = loadAgentCmsEnv();
  const filePath = configPath();

  if (action === "remove") {
    const data = loadConfig(filePath);
    if (!data.mcpServers || !data.mcpServers[name]) {
      console.log(`В ${filePath} нет mcpServers.${name}`);
      process.exit(0);
    }
    delete data.mcpServers[name];
    if (Object.keys(data.mcpServers).length === 0) delete data.mcpServers;
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
    console.log(`Удалено: ${name}`);
    console.log(`Файл: ${filePath}`);
    console.log("Полностью закройте Claude Desktop (Cmd+Q) и откройте снова.");
    return;
  }

  if (action !== "add") {
    console.error("Usage: claude-desktop-mcp.js add [name] | remove [name]");
    process.exit(1);
  }

  const mcpUrl = resolveMcpUrl(env);
  const token = mcpToken(env);
  const data = loadConfig(filePath);
  if (!data.mcpServers || typeof data.mcpServers !== "object") data.mcpServers = {};
  data.mcpServers[name] = buildServerEntry(mcpUrl, token);

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");

  console.log(`OK: ${name} → ${mcpUrl}${token ? " (Bearer из .env)" : " (без токена)"}`);
  console.log(`Файл: ${filePath}`);
  console.log("Полностью закройте Claude Desktop (Cmd+Q) и откройте снова.");
}

main();
