#!/usr/bin/env node
/**
 * Agent CMS Web Control — отдельный HTTP (ops-пульт).
 * Порт: AGENT_CMS_CONTROL_HTTP_PORT / CONTROL_PORT (по умолчанию 3288).
 * API проксируется на Editor (CMS_API_URL / AGENT_CMS_BASE_URL).
 */

const path = require("path");
const {
  hydrateProcessEnvFromRoot,
  syncLegacyPortEnvVars
} = require("./lib/config/agent-cms-ports");
const { startControlServer } = require("./lib/ops/control-server");

const ROOT = __dirname;

async function main() {
  hydrateProcessEnvFromRoot(ROOT);
  syncLegacyPortEnvVars();
  const info = await startControlServer({ root: ROOT });
  console.log(`Agent CMS Web Control at ${info.url}`);
  console.log(`CMS API proxy → ${info.cmsApiUrl}`);
  console.log(`Static root: ${info.publicRoot}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { startControlServer: () => startControlServer({ root: ROOT }) };
