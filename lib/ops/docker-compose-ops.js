"use strict";

const fs = require("fs");
const { spawnSync } = require("child_process");
const { resolveEnvProjectRoot } = require("./control-env-file");

function usesDockerComposeOps() {
  return String(process.env.AGENT_CMS_DOCKER_OPS || "").trim() === "1";
}

function parseServiceList(raw, fallback = ["cms"]) {
  const list = String(raw || "")
    .trim()
    .split(/\s+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
  return list.length ? list : fallback;
}

function getDockerComposeConfig() {
  return {
    composeFile: String(process.env.AGENT_CMS_COMPOSE_FILE || "/app/docker-compose.linux.yml").trim(),
    project: String(process.env.COMPOSE_PROJECT_NAME || "agent-cms").trim(),
    primaryService: String(process.env.AGENT_CMS_COMPOSE_SERVICE || "cms").trim(),
    upServices: parseServiceList(process.env.AGENT_CMS_DOCKER_UP_SERVICES, ["cms", "mcp"]),
    stopServices: parseServiceList(
      process.env.AGENT_CMS_DOCKER_STOP_SERVICES,
      [String(process.env.AGENT_CMS_COMPOSE_SERVICE || "cms").trim() || "cms"]
    )
  };
}

function runDockerComposeArgv(subcommand, services = [], projectRoot = process.cwd()) {
  const config = getDockerComposeConfig();
  const hostProject = resolveEnvProjectRoot(projectRoot);
  const { resolveHostComposeFileList } = require("./workspace-mounts");
  const { files } = resolveHostComposeFileList(hostProject);
  const args = ["compose", "--project-directory", hostProject];
  for (const file of files) {
    if (fs.existsSync(file)) args.push("-f", file);
  }
  if (args.filter((a) => a === "-f").length === 0) {
    args.push("-f", config.composeFile);
  }
  args.push("-p", config.project, subcommand);
  if (services.length) args.push(...services);
  return args;
}

function runDockerComposeSync(subcommand, services, timeoutMs, projectRoot) {
  const args = runDockerComposeArgv(subcommand, services, projectRoot);
  const result = spawnSync("docker", args, {
    encoding: "utf8",
    timeout: timeoutMs
  });
  const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
  return {
    ok: result.status === 0,
    exitCode: result.status,
    output,
    args
  };
}

function dockerComposeStatusOutput(projectRoot) {
  return runDockerComposeSync("ps", [], 15000, projectRoot);
}

function cmsRunningFromComposePs(output) {
  const text = String(output || "");
  const primary = getDockerComposeConfig().primaryService;
  const re = new RegExp(`\\b${primary.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b[\\s\\S]*?\\((healthy|running)\\)`, "i");
  return re.test(text);
}

module.exports = {
  usesDockerComposeOps,
  getDockerComposeConfig,
  runDockerComposeArgv,
  runDockerComposeSync,
  dockerComposeStatusOutput,
  cmsRunningFromComposePs
};
