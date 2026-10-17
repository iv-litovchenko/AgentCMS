#!/usr/bin/env node
/**
 * Agent CMS Commander — локальный HTTP (index.html).
 * Порт: AGENT_CMS_COMMANDER_HTTP_PORT / COMMANDER_PORT (по умолчанию 3188).
 */

const path = require("path");
const {
  hydrateProcessEnvFromRoot,
  syncLegacyPortEnvVars
} = require("./lib/config/agent-cms-ports");
const { startCommanderServer } = require("./desktop/agent-commander/server");

const ROOT = __dirname;

async function main() {
  hydrateProcessEnvFromRoot(ROOT);
  syncLegacyPortEnvVars();
  const info = await startCommanderServer({ root: ROOT });
  console.log(`Agent CMS Commander at ${info.url}`);
  console.log(`Static root: ${info.publicRoot}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { startCommanderServer: () => startCommanderServer({ root: ROOT }) };
