#!/usr/bin/env node
/**
 * agent-cms paths — каталог установки + bind-mount workspace (stdout).
 */
const fs = require("fs");
const path = require("path");
const { readWorkspaceMounts } = require("../lib/ops/workspace-mounts");
const { getPublicBaseUrl } = require("../lib/desktop/public-url");

function main() {
  const home = String(process.env.AGENT_CMS_HOME || "").replace(/\/$/, "");
  if (!home || !fs.existsSync(path.join(home, "package.json"))) {
    console.error("AGENT_CMS_HOME не задан или не похож на Agent CMS.");
    process.exit(1);
  }

  const platform = String(process.env.AGENT_CMS_CLI_PLATFORM || "unknown");
  const composePrimary = String(process.env.AGENT_CMS_CLI_COMPOSE || "docker-compose.mac.yml");
  const configFile = String(process.env.AGENT_CMS_CONFIG_FILE || "");
  const cliLink = String(process.env.AGENT_CMS_CLI_BIN || `${process.env.HOME || ""}/.local/bin/agent-cms`);

  let publicBase = "";
  try {
    publicBase = getPublicBaseUrl(home);
  } catch {
    publicBase = process.env.AGENT_CMS_PUBLIC_URL || "";
  }

  console.log(`AGENT_CMS_HOME=${home}`);
  console.log(`platform=${platform}`);
  console.log(`compose=${composePrimary} + docker-compose.workspace-mounts.yml`);
  if (configFile) console.log(`config=${configFile}`);
  console.log(`cli=${cliLink}`);
  console.log(`public=${publicBase}`);

  const read = readWorkspaceMounts(home);
  console.log("");
  console.log("workspace-mounts:");
  if (!read.ok) {
    console.log(`  (error: ${read.error || "unknown"})`);
    process.exit(0);
  }

  const jsonRel = ".agent-cms-global/workspace-mounts.json";
  console.log(`  registry=${path.join(home, jsonRel)}${read.exists ? "" : " (default, file not created yet)"}`);

  for (const m of read.document.mounts) {
    const host = m.resolvedHostPath || m.hostPath;
    const container = m.resolvedContainerPath || m.containerPath;
    const label = m.label ? ` — ${m.label}` : "";
    const builtIn = m.builtIn ? " [built-in]" : "";
    let hostState = "";
    try {
      if (host && fs.existsSync(host)) hostState = fs.statSync(host).isDirectory() ? " ok" : " (not a dir)";
      else hostState = " (missing on host)";
    } catch {
      hostState = " (unreadable)";
    }
    console.log(`  - ${m.id}${builtIn}${label}`);
    console.log(`      host:      ${host}${hostState}`);
    console.log(`      container: ${container}`);
  }
}

main();
