#!/usr/bin/env node
/**
 * HTTP + Docker summary for agent-cms status (stdout, human-readable).
 */
const path = require("path");
const { execSync } = require("child_process");
const {
  findRepoRoot,
  getPublicBaseUrl,
  probeCmsHttp,
  readEnvFile
} = require("../lib/desktop/public-url");
const { readMaintenanceMode } = require("../lib/ops/platform-maintenance-mode");

async function main() {
  const repoRoot = findRepoRoot(path.join(__dirname, ".."));
  const base = getPublicBaseUrl(repoRoot);
  const env = readEnvFile(repoRoot);
  const version = (() => {
    try {
      return require(path.join(repoRoot, "package.json")).version;
    } catch {
      return "?";
    }
  })();

  console.log(`Agent CMS ${version}`);
  console.log(`home: ${repoRoot}`);
  console.log(`public: ${base}`);

  if (env.AGENT_CMS_PUBLIC_URL) {
    console.log(`  (.env AGENT_CMS_PUBLIC_URL)`);
  }

  try {
    const maint = readMaintenanceMode(repoRoot);
    console.log(`Maintenance: ${maint ? "on (503 Editor/Voice/Commander)" : "off"}`);
  } catch {
    console.log("Maintenance: ?");
  }

  const probe = await probeCmsHttp(base, { timeoutMs: 5000 });
  if (probe.ok) {
    console.log(`HTTP: ✓ отвечает (${probe.path}, ${probe.status})`);
  } else {
    console.log(`HTTP: ✗ нет ответа — запустите: agent-cms start`);
  }

  try {
    execSync("docker info", { stdio: "ignore" });
    const composeFile =
      process.platform === "linux" ? "docker-compose.linux.yml" : "docker-compose.mac.yml";
    const ps = execSync(
      `docker compose -f ${composeFile} -f docker-compose.workspace-mounts.yml ps --format json`,
      { cwd: repoRoot, encoding: "utf8", maxBuffer: 2 * 1024 * 1024 }
    ).trim();
    if (!ps) {
      console.log("Docker: контейнеры не запущены");
    } else {
      console.log("Docker:");
      for (const line of ps.split("\n").filter(Boolean)) {
        try {
          const row = JSON.parse(line);
          const name = row.Name || row.Service || "?";
          const state = row.State || row.Status || "?";
          console.log(`  ${name}: ${state}`);
        } catch {
          console.log(`  ${line}`);
        }
      }
    }
  } catch {
    console.log("Docker: недоступен или compose не запущен");
  }

  process.exit(probe.ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
