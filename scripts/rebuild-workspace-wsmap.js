#!/usr/bin/env node
/**
 * Rebuild WS-MAP.md for a workspace using current server code (no HTTP).
 * Usage: node scripts/rebuild-workspace-wsmap.js [workspaceId]
 * Example: node scripts/rebuild-workspace-wsmap.js 0-ws-test
 */
const path = require("path");
const agentRegistry = require("../lib/agents/agent-registry");
const { runWithAgent } = agentRegistry;

const projectRoot = path.resolve(__dirname, "..");
agentRegistry.init(projectRoot);

const agentId = String(process.argv[2] || "0-ws-test").trim();

runWithAgent(agentId, async () => {
  const { writeAgentWorkspaceWsmap } = require("../server");
  const result = await writeAgentWorkspaceWsmap({ overwrite: true });
  if (result.error) {
    console.error(result.error);
    process.exitCode = 1;
    return;
  }
  console.log(
    `WS-MAP.md: ${result.written?.entryCount ?? result.entryCount ?? 0} manifest, ` +
      `${result.rootEntryCount ?? 0} root (без awn-*) → ${result.written?.path || "WS-MAP.md"}`
  );
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
