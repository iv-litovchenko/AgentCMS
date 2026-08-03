#!/usr/bin/env node
/**
 * Copy platform CMS model from agent-cms-core/awn-data into {agent}/awn-data/
 * (type stores + cms-config). Agent-specific extras are already in platform core.
 *
 *   node scripts/bootstrap-agent-awn-system.js agent-cms-test
 */
const fs = require("fs");
const path = require("path");
const { getAgentCmsCoreAbsolute, CMS_CONFIG_REL, AWN_DATA_REL } = require("../platform-sources");
const { DOMAIN_TYPE_STORES } = require("../awn-data-types-bridge");

const TYPE_STORES = Object.values(DOMAIN_TYPE_STORES);
const CMS_CONFIG_FILES = [
  "registry.yml",
  "slots-bindings.yml",
  "slot-categories.yml",
  "MAP.md",
  "TYPES-GUIDE.md",
  "manifest.md",
  "configuration-schema.yml"
];

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return 0;
  fs.mkdirSync(dest, { recursive: true });
  let count = 0;
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      count += copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      count += 1;
    }
  }
  return count;
}

function main() {
  const agentId = process.argv[2] || "agent-cms-test";
  const repoRoot = path.join(__dirname, "..");
  const agentRoot = path.join(repoRoot, "workspaces", agentId);
  const coreRoot = getAgentCmsCoreAbsolute(repoRoot);
  const coreDataRoot = path.join(coreRoot, AWN_DATA_REL);
  const agentDataRoot = path.join(agentRoot, AWN_DATA_REL);

  if (!fs.existsSync(agentRoot)) {
    console.error(`Agent workspace not found: ${agentRoot}`);
    process.exit(1);
  }

  let copied = 0;
  for (const store of TYPE_STORES) {
    copied += copyDir(path.join(coreDataRoot, store), path.join(agentDataRoot, store));
  }

  const coreConfig = path.join(coreDataRoot, "cms-config");
  const agentConfig = path.join(agentDataRoot, "cms-config");
  fs.mkdirSync(agentConfig, { recursive: true });
  for (const name of CMS_CONFIG_FILES) {
    const src = path.join(coreConfig, name);
    if (!fs.existsSync(src)) continue;
    const dest = path.join(agentConfig, name);
    let content = fs.readFileSync(src, "utf-8");
    if (name === "registry.yml") {
      content = content.replace(/^agent: .*/m, `agent: ${agentId}`);
    }
    fs.writeFileSync(dest, content, "utf-8");
    copied += 1;
  }

  console.log(`Bootstrap OK: ${copied} files → ${agentDataRoot}`);
}

main();
