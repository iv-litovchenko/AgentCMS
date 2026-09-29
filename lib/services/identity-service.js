const path = require("path");

function frontmatterEntriesToObject(entries) {
  const out = {};
  for (const entry of entries || []) {
    if (entry.kind === "array") out[entry.key] = entry.value;
    else out[entry.key] = entry.value;
  }
  return out;
}

function createIdentityService(deps) {
  const {
    getAgentRoot,
    getAgentKitFolder,
    getActiveAgentId,
    getProjectRoot,
    readWorkspaceManifestContent,
    readInternalMemoryContent,
    parseFrontmatterProps,
    splitNodeFrontmatter,
    getFrontmatterPropValue
  } = deps;

  async function readKitIdentity(slot) {
    const kind = slot === "user" ? "user" : "agent";
    const kitFolder = getAgentKitFolder() || "awn-agent-kit";
    const manifestPath = `${kitFolder}/${kind}/manifest.md`;
    const agentRoot = getAgentRoot();
    const agentRootRel = agentRoot
      ? path.relative(getProjectRoot(), agentRoot).replace(/\\/g, "/") || "."
      : null;

    const manifest = await readWorkspaceManifestContent(manifestPath);
    const memory = manifest.exists
      ? await readInternalMemoryContent(manifestPath)
      : { path: null, content: "", exists: false };

    let manifestPart = { properties: {}, body: "" };
    if (manifest.content) {
      const { frontmatter, body } = splitNodeFrontmatter(manifest.content);
      manifestPart = {
        properties: frontmatterEntriesToObject(parseFrontmatterProps(frontmatter)),
        body: String(body || "").trim()
      };
    }

    let mainPart = { path: memory.path, exists: memory.exists, properties: {}, body: "" };
    if (memory.content) {
      const { frontmatter, body } = splitNodeFrontmatter(memory.content);
      mainPart = {
        path: memory.path,
        exists: memory.exists,
        properties: frontmatterEntriesToObject(parseFrontmatterProps(frontmatter)),
        body: String(body || "").trim()
      };
    }

    const manifestEntries = parseFrontmatterProps(
      manifest.content ? splitNodeFrontmatter(manifest.content).frontmatter : ""
    );

    const profile = {
      name: getFrontmatterPropValue(manifestEntries, "awn-name"),
      description: getFrontmatterPropValue(manifestEntries, "awn-description"),
      type: getFrontmatterPropValue(manifestEntries, "awn-type"),
      status: getFrontmatterPropValue(manifestEntries, "awn-status"),
      tags: getFrontmatterPropValue(manifestEntries, "awn-tags"),
      ...(kind === "agent"
        ? {
            role: getFrontmatterPropValue(manifestEntries, "awn-agent-role"),
            language: getFrontmatterPropValue(manifestEntries, "awn-agent-language")
          }
        : {
            role: getFrontmatterPropValue(manifestEntries, "awn-user-role"),
            timezone: getFrontmatterPropValue(manifestEntries, "awn-user-timezone")
          })
    };

    const textParts = [mainPart.body, manifestPart.body].filter(Boolean);

    return {
      kind,
      agentId: getActiveAgentId(),
      agentRootRel,
      manifestPath: manifest.path,
      mainPath: mainPart.path,
      exists: manifest.exists,
      profile,
      manifest: manifestPart,
      main: mainPart,
      text: textParts.join("\n\n"),
      hint:
        kind === "agent"
          ? "Персона и права агента: main.md (main-single) + manifest.md в awn-agent-kit/agent/"
          : "Профиль пользователя: main.md + manifest.md в awn-agent-kit/user/"
    };
  }

  return {
    readAgentIdentity: () => readKitIdentity("agent"),
    readUserIdentity: () => readKitIdentity("user")
  };
}

module.exports = { createIdentityService };
