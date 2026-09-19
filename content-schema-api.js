const path = require("path");
const { buildStorageLayerRef, MANIFEST_FILE } = require("./manifest-paths");
const { slotKeyToStorageFolder, isInternalBundleSlot } = require("./storage-slot-routing");
const {
  getEffectiveSchemaPayloadForContentPath,
  toSectionConfigRelPath,
  readSectionConfigContentSync
} = require("./section-schema");
const {
  compactAwnSchema,
  extractAwnSchemaFromConfigurationSchemaContent,
  composeSectionConfigurationSchemaYaml
} = require("./configuration-schema");
const { normalizeAwnSchema, extractAwnSchemaFromConfig } = require("./awn-types-loader");

/** Folder path inside slot for section schema.yml (empty = slot root → topic schema only). */
function deriveSectionPathFromContentRef(ref) {
  const normalized = String(ref || "").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  if (!normalized) return "";
  let sectionPath = normalized;
  if (/manifest\.md$/i.test(sectionPath)) {
    sectionPath = path.posix.dirname(sectionPath);
  } else if (/\.[^/]+$/i.test(sectionPath)) {
    sectionPath = path.posix.dirname(sectionPath);
  }
  if (!sectionPath || sectionPath === ".") return "";
  return sectionPath;
}

function compactSlotLayerSchema(awnSchema) {
  const normalized = compactAwnSchema(awnSchema);
  const result = {};
  for (const [target, block] of Object.entries(normalized)) {
    if (target === "workspace" || target === "area" || target === "topic" || target === "settings") continue;
    if (block?.fields && Object.keys(block.fields).length) result[target] = block;
  }
  return result;
}

function resolveContentSchemaContext(manifestRel, slot, ref) {
  const slotKey = String(slot || "").trim();
  const normalizedRef = String(ref || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (isInternalBundleSlot(slotKey)) {
    return {
      error:
        'Internal slots use page schema (read_page_schema / write_page_schema with slot_* blocks). Content schema is for external multi-file slots.',
      status: 400
    };
  }
  if (!normalizedRef) {
    return { error: "ref is required for external slots", status: 400 };
  }
  const storageFolder = slotKeyToStorageFolder(slotKey);
  const contentWorkspaceRel = buildStorageLayerRef(manifestRel, storageFolder, normalizedRef);
  if (!contentWorkspaceRel) {
    return { error: "Invalid slot/ref for content schema", status: 400 };
  }
  const sectionPath = deriveSectionPathFromContentRef(normalizedRef);
  return {
    manifestRel,
    slot: slotKey,
    ref: normalizedRef,
    layer: storageFolder,
    contentWorkspaceRel,
    sectionPath,
    configPath: sectionPath ? toSectionConfigRelPath(manifestRel, storageFolder, sectionPath) : ""
  };
}

function createContentSchemaApi(deps) {
  const {
    readNodeConfigFile,
    getAgentRoot,
    getProjectRoot,
    normalizeWorkspacePath,
    writeWorkspaceTextFileWithHistory,
    removeIfExists
  } = deps;

  async function readContentSchema(manifestRel, slot, ref, options = {}) {
    const ctx = resolveContentSchemaContext(manifestRel, slot, ref);
    if (ctx.error) return ctx;

    const configFile = await readNodeConfigFile(manifestRel);
    const payload = getEffectiveSchemaPayloadForContentPath(
      configFile.content || "",
      ctx.contentWorkspaceRel,
      getAgentRoot(),
      getProjectRoot()
    );

    const agentRootAbs = path.resolve(String(getAgentRoot() || ""));
    let sectionLocalSchema = null;
    let configExists = false;
    let sectionYaml = "";
    if (ctx.sectionPath && ctx.configPath) {
      sectionYaml = readSectionConfigContentSync(ctx.configPath, agentRootAbs);
      configExists = Boolean(String(sectionYaml).trim());
      sectionLocalSchema = extractAwnSchemaFromConfigurationSchemaContent(sectionYaml);
    }

    const mode = String(options.mode || "effective").trim().toLowerCase();
    const topicSlotLayers = compactSlotLayerSchema(payload.topicAwnSchema || {});
    const sectionLayer = sectionLocalSchema ? compactSlotLayerSchema(sectionLocalSchema) : {};
    const effective = compactSlotLayerSchema(payload.awnSchema || {});

    const base = {
      path: manifestRel,
      slot: ctx.slot,
      ref: ctx.ref,
      contentPath: ctx.contentWorkspaceRel,
      sectionPath: ctx.sectionPath || null,
      configPath: ctx.configPath || null,
      configExists,
      sectionChain: payload.sectionChain || [],
      topicSlotSchema: topicSlotLayers,
      sectionSchema: sectionLayer,
      effectiveSlotSchema: effective
    };

    if (mode === "local") {
      return { ...base, mode: "local", awnSchema: sectionLayer };
    }
    if (mode === "layers") {
      return {
        ...base,
        mode: "layers",
        layers: {
          topic: topicSlotLayers,
          section: sectionLayer
        },
        awnSchema: effective
      };
    }
    return { ...base, mode: "effective", awnSchema: effective };
  }

  async function writeContentSchema(manifestRel, slot, ref, contentOrSchema) {
    const ctx = resolveContentSchemaContext(manifestRel, slot, ref);
    if (ctx.error) return ctx;
    if (!ctx.sectionPath || !ctx.configPath) {
      return {
        error:
          "No section folder in ref — slot-root content inherits topic schema only. Use write_page_schema on the topic manifest for slot_* fields.",
        status: 400,
        hint: "ref should be inside a category folder, e.g. razdel-1/manifest.md or razdel-1/note.md"
      };
    }

    let awnSchema;
    if (contentOrSchema && typeof contentOrSchema === "object") {
      awnSchema = normalizeAwnSchema(contentOrSchema);
    } else if (typeof contentOrSchema === "string" && contentOrSchema.trim()) {
      awnSchema = extractAwnSchemaFromConfig(contentOrSchema);
    } else {
      awnSchema = normalizeAwnSchema(undefined);
    }

    const nextContent = composeSectionConfigurationSchemaYaml(awnSchema);
    const configAbsolute = normalizeWorkspacePath(ctx.configPath);
    if (!configAbsolute) return { error: "Invalid section schema path", status: 400 };

    await require("fs").promises.mkdir(path.dirname(configAbsolute), { recursive: true });
    if (!String(nextContent).trim()) {
      await removeIfExists(configAbsolute);
    } else {
      await writeWorkspaceTextFileWithHistory(manifestRel, ctx.configPath, nextContent);
    }

    const readBack = await readContentSchema(manifestRel, slot, ref, { mode: "layers" });
    return {
      ok: true,
      path: manifestRel,
      slot: ctx.slot,
      ref: ctx.ref,
      sectionPath: ctx.sectionPath,
      configPath: ctx.configPath,
      exists: Boolean(String(nextContent).trim()),
      content: nextContent,
      sectionSchema: compactSlotLayerSchema(awnSchema),
      ...readBack
    };
  }

  return {
    deriveSectionPathFromContentRef,
    resolveContentSchemaContext,
    readContentSchema,
    writeContentSchema
  };
}

module.exports = {
  deriveSectionPathFromContentRef,
  resolveContentSchemaContext,
  compactSlotLayerSchema,
  createContentSchemaApi
};
