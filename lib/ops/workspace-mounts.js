"use strict";

const fs = require("fs");
const path = require("path");
const { resolveEnvProjectRoot } = require("./control-env-file");

/** Merged by compose after docker-compose.{mac,linux}.yml — not the generic Docker "override" name. */
const WORKSPACE_MOUNTS_COMPOSE_BASENAME = "docker-compose.workspace-mounts.yml";

const WORKSPACE_MOUNTS_JSON_REL = ".agent-cms-global/workspace-mounts.json";

const DEFAULT_CONTAINER_WORKSPACES = "/app/workspaces";
const DEFAULT_HOST_WORKSPACES = "./workspaces";

function workspaceMountsJsonPath(hostProject) {
  return path.join(path.resolve(hostProject), WORKSPACE_MOUNTS_JSON_REL);
}

function workspaceMountsComposePath(hostProject) {
  return path.join(path.resolve(hostProject), WORKSPACE_MOUNTS_COMPOSE_BASENAME);
}

function defaultDocument() {
  return {
    version: 1,
    mounts: [
      {
        id: "repo-workspaces",
        label: "workspaces (репозиторий)",
        hostPath: DEFAULT_HOST_WORKSPACES,
        containerPath: DEFAULT_CONTAINER_WORKSPACES,
        builtIn: true
      }
    ]
  };
}

function toPosixMountPath(p) {
  return String(p || "").replace(/\\/g, "/");
}

/** Home каталога на хосте (не HOME процесса в контейнере — иначе ~ → /root). */
function resolveHostHome(hostProject) {
  const fromEnv = String(process.env.AGENT_CMS_HOST_HOME || "").trim();
  if (fromEnv) return path.resolve(fromEnv);

  const hp = path.resolve(String(hostProject || "."));
  const macMatch = hp.match(/^(\/Users\/[^/]+)/);
  if (macMatch) return macMatch[1];
  const linuxMatch = hp.match(/^(\/home\/[^/]+)/);
  if (linuxMatch) return linuxMatch[1];

  const home = process.env.HOME || process.env.USERPROFILE || "";
  if (home && hp !== "/host-project" && !hp.endsWith(`${path.sep}host-project`)) {
    return path.resolve(home);
  }
  throw new Error(
    "Cannot expand ~: укажите абсолютный путь на хосте или задайте AGENT_CMS_HOST_HOME (Docker: ${HOME} в compose)."
  );
}

function expandUserPath(raw, hostProject) {
  const text = String(raw || "").trim();
  if (!text) return "";
  if (text.startsWith("~")) {
    const home = resolveHostHome(hostProject);
    return path.resolve(home, text.slice(1).replace(/^[/\\]/, ""));
  }
  if (path.isAbsolute(text)) return path.normalize(text);
  return path.resolve(hostProject, text);
}

function resolveContainerMountPath(entry, resolvedHost, hostProject) {
  const builtIn = Boolean(entry.builtIn);
  const hostPath = String(entry.hostPath || "").trim();
  let containerPath = String(entry.containerPath || "").trim();

  const defaultRepo =
    path.resolve(hostProject, "workspaces") === resolvedHost &&
    (containerPath === DEFAULT_CONTAINER_WORKSPACES || !containerPath);

  if (builtIn || defaultRepo) return DEFAULT_CONTAINER_WORKSPACES;

  if (!containerPath || containerPath === hostPath) {
    return toPosixMountPath(resolvedHost);
  }
  if (containerPath.startsWith("~")) {
    return toPosixMountPath(expandUserPath(containerPath, hostProject));
  }
  if (!path.isAbsolute(containerPath)) {
    throw new Error(
      `containerPath must be absolute (got "${containerPath}"). Use the same absolute path as on the host.`
    );
  }
  return toPosixMountPath(path.normalize(containerPath));
}

function normalizeMount(entry, index, hostProject) {
  if (!entry || typeof entry !== "object") {
    throw new Error(`mounts[${index}]: must be an object`);
  }
  const id =
    String(entry.id || "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 64) || `mount-${index + 1}`;
  if (!/^[a-z0-9][a-z0-9_-]*$/i.test(id)) {
    throw new Error(`mounts[${index}].id: invalid "${id}"`);
  }
  const hostPath = String(entry.hostPath || "").trim();
  if (!hostPath) throw new Error(`mounts[${index}].hostPath required`);

  const resolvedHost = expandUserPath(hostPath, hostProject);
  const builtIn = Boolean(entry.builtIn);
  const defaultRepo =
    path.resolve(hostProject, "workspaces") === resolvedHost &&
    String(entry.containerPath || DEFAULT_CONTAINER_WORKSPACES).trim() === DEFAULT_CONTAINER_WORKSPACES;

  const resolvedContainer = resolveContainerMountPath(
    { ...entry, builtIn: builtIn || defaultRepo },
    resolvedHost,
    hostProject
  );

  const out = {
    id,
    label: String(entry.label || id).trim() || id,
    hostPath,
    containerPath: String(entry.containerPath || "").trim() || resolvedContainer,
    resolvedHostPath: resolvedHost,
    resolvedContainerPath: resolvedContainer
  };
  if (builtIn || (defaultRepo && index === 0)) out.builtIn = true;
  return out;
}

function normalizeDocument(raw, hostProject) {
  const list = Array.isArray(raw?.mounts) ? raw.mounts : [];
  if (!list.length) return defaultDocument();
  const mounts = list.map((entry, index) => normalizeMount(entry, index, hostProject));
  const ids = new Set();
  for (const m of mounts) {
    if (ids.has(m.id)) throw new Error(`Duplicate mount id "${m.id}"`);
    ids.add(m.id);
  }
  if (!mounts.some((m) => m.builtIn)) {
    mounts.unshift(defaultDocument().mounts[0]);
  }
  return { version: 1, mounts };
}

function isBuiltInRepoWorkspacesMount(mount, hostProject) {
  if (mount.builtIn) return true;
  const resolvedHost = mount.resolvedHostPath || expandUserPath(mount.hostPath, hostProject);
  return (
    path.resolve(resolvedHost) === path.resolve(hostProject, "workspaces") &&
    String(mount.containerPath || "").trim() === DEFAULT_CONTAINER_WORKSPACES
  );
}

function readWorkspaceMounts(projectRoot) {
  const hostProject = resolveEnvProjectRoot(projectRoot);
  const jsonPath = workspaceMountsJsonPath(hostProject);
  const composePath = workspaceMountsComposePath(hostProject);
  try {
    if (!fs.existsSync(jsonPath)) {
      const document = defaultDocument();
      return {
        ok: true,
        hostProject,
        jsonPath,
        composePath,
        composeExists: fs.existsSync(composePath),
        exists: false,
        document
      };
    }
    const parsed = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    const document = normalizeDocument(parsed, hostProject);
    return {
      ok: true,
      hostProject,
      jsonPath,
      composePath,
      composeExists: fs.existsSync(composePath),
      exists: true,
      document
    };
  } catch (error) {
    return {
      ok: false,
      error: String(error.message || error),
      jsonPath,
      composePath
    };
  }
}

function buildComposeStubContent(hostProject) {
  const candidates = [
    path.join(__dirname, "..", "..", WORKSPACE_MOUNTS_COMPOSE_BASENAME),
    workspaceMountsComposePath(hostProject)
  ];
  for (const stubPath of candidates) {
    try {
      if (!fs.existsSync(stubPath)) continue;
      const text = fs.readFileSync(stubPath, "utf8");
      if (text.includes("Generated by Agent CMS")) continue;
      return text.endsWith("\n") ? text : `${text}\n`;
    } catch {
      // try next
    }
  }
  return [
    "# docker-compose.workspace-mounts.yml — доп. bind-mount корней workspace (Mac / Linux / VPS)",
    "# Дефолт ./workspaces → /app/workspaces — в docker-compose.mac.yml | docker-compose.linux.yml",
    "# Control / MCP platform_workspace_mounts_* — CMS перезаписывает cms/mcp при сохранении.",
    "services: {}",
    ""
  ].join("\n");
}

function buildComposeFileContent(document, hostProject) {
  const extras = document.mounts.filter((m) => !isBuiltInRepoWorkspacesMount(m, hostProject));
  if (!extras.length) return buildComposeStubContent(hostProject);

  const lines = [
    "# Generated by Agent CMS — docker-compose.workspace-mounts.yml",
    "# Доп. bind-mount каталогов хранилищ. После правок: docker compose … up -d",
    "# Не редактируйте вручную, если список ведётся из Control / MCP.",
    "services:",
    "  cms:",
    "    volumes:"
  ];
  for (const m of extras) {
    const host = m.resolvedHostPath || expandUserPath(m.hostPath, hostProject);
    const container = toPosixMountPath(m.resolvedContainerPath || m.containerPath);
    lines.push(`      - ${host}:${container}`);
  }
  lines.push("  mcp:", "    volumes:");
  for (const m of extras) {
    const host = m.resolvedHostPath || expandUserPath(m.hostPath, hostProject);
    const container = toPosixMountPath(m.resolvedContainerPath || m.containerPath);
    lines.push(`      - ${host}:${container}:ro`);
  }
  lines.push("");
  return lines.join("\n");
}

function writeWorkspaceMounts(projectRoot, rawDocument) {
  const hostProject = resolveEnvProjectRoot(projectRoot);
  const jsonPath = workspaceMountsJsonPath(hostProject);
  const composePath = workspaceMountsComposePath(hostProject);
  const document = normalizeDocument(rawDocument, hostProject);

  const toStore = {
    version: document.version,
    mounts: document.mounts.map((m) => {
      const { id, label, builtIn, resolvedHostPath, resolvedContainerPath } = m;
      const row = {
        id,
        label,
        hostPath: builtIn ? m.hostPath : resolvedHostPath || m.hostPath,
        containerPath: builtIn
          ? DEFAULT_CONTAINER_WORKSPACES
          : resolvedContainerPath || m.containerPath
      };
      if (builtIn) row.builtIn = true;
      return row;
    })
  };

  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, `${JSON.stringify(toStore, null, 2)}\n`, "utf8");

  const composeContent = buildComposeFileContent(document, hostProject);
  fs.writeFileSync(composePath, composeContent, "utf8");

  return {
    ok: true,
    hostProject,
    jsonPath,
    composePath,
    composeWritten: true,
    composeRemoved: false,
    composeExists: true,
    document: normalizeDocument(toStore, hostProject),
    message:
      "Сохранено. Перезапустите Docker (compose up -d), чтобы новые папки появились в контейнере."
  };
}

function getWorkspaceDiscoverRoots(projectRoot) {
  const read = readWorkspaceMounts(projectRoot);
  if (!read.ok) return [];
  const hostProject = read.hostProject;
  const roots = [];
  for (const m of read.document.mounts) {
    const inDocker = String(process.env.AGENT_CMS_DOCKER_OPS || "").trim() === "1";
    const candidate = inDocker
      ? String(m.resolvedContainerPath || m.containerPath || "").trim() ||
        expandUserPath(m.hostPath, hostProject)
      : m.resolvedHostPath || expandUserPath(m.hostPath, hostProject);
    if (!candidate) continue;
    try {
      if (fs.existsSync(candidate)) roots.push(path.normalize(candidate));
    } catch {
      // ignore
    }
  }
  return [...new Set(roots)];
}

function resolveHostComposeFileList(hostProject) {
  const rel = String(process.env.AGENT_CMS_HOST_COMPOSE_FILE || "").trim();
  let primaryRel = rel;
  if (!primaryRel) {
    const cf = String(process.env.AGENT_CMS_COMPOSE_FILE || "docker-compose.linux.yml");
    primaryRel = path.basename(cf);
  }
  const primary = path.isAbsolute(primaryRel) ? primaryRel : path.join(hostProject, primaryRel);
  const files = [primary];
  const mountsCompose = workspaceMountsComposePath(hostProject);
  if (fs.existsSync(mountsCompose)) files.push(mountsCompose);
  return { hostProject: path.resolve(hostProject), files };
}

module.exports = {
  WORKSPACE_MOUNTS_COMPOSE_BASENAME,
  WORKSPACE_MOUNTS_JSON_REL,
  defaultDocument,
  workspaceMountsJsonPath,
  workspaceMountsComposePath,
  readWorkspaceMounts,
  writeWorkspaceMounts,
  getWorkspaceDiscoverRoots,
  resolveHostComposeFileList,
  expandUserPath
};
