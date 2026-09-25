/**
 * Канонические цели topic-schema (awn_schema) по слотам топика.
 * Каждый слот: раздел (category), запись (record), sidecar.
 * Используется в браузере (window.TopicSchemaSlotSpecs) и на сервере (require).
 */
(function initTopicSchemaSlotSpecs(global, factory) {
  const specs = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = specs;
  }
  if (global) {
    global.TopicSchemaSlotSpecs = specs;
  }
})(
  typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : null,
  function buildTopicSchemaSlotSpecsModule() {
    const CONTENT_KIND_TYPE_NAMES = {
      record: "awn.content.record",
      category: "awn.content.category",
      sidecar: "awn.content.sidecar",
      "record-csv": "awn.content.record-csv"
    };

    const CONTENT_KIND_LABEL_SUFFIX = {
      record: "",
      "record-csv": " (csv)",
      category: " · раздел",
      sidecar: " · sidecar"
    };

    const CONTENT_KIND_TAB_LABELS = {
      record: "Запись",
      "record-csv": "Запись (csv)",
      category: "Раздел",
      sidecar: "Sidecar"
    };

    const TOPIC_SCHEMA_SLOT_CONTENT_KIND_ORDER = ["category", "record", "record-csv", "sidecar"];

    const TOPIC_SCHEMA_TAB_GROUP_LABELS = {
      memory: "Память",
      workspace: "Папки",
      files: "Файлы",
      todo: "Задачи",
      planning: "Планы"
    };

    /** @type {Array<{ slotKey: string, label: string, tabGroup: string, defaultKind: string, targets: Record<string, { id: string, legacyIds?: string[], labelSuffix?: string }> }>} */
    const TOPIC_SCHEMA_SLOT_DEFINITIONS = [
      {
        slotKey: "memory",
        label: "Многофайловая",
        schemaLabel: "Память",
        tabGroup: "memory",
        defaultKind: "record",
        targets: {
          record: { id: "slot_memory", legacyIds: ["record"] },
          category: { id: "slot_memory_category", legacyIds: ["record_category"] },
          sidecar: { id: "slot_memory_sidecar" }
        }
      },
      {
        slotKey: "main-single",
        label: "Однофайловая",
        schemaLabel: "Память (однофайловая)",
        tabGroup: "memory",
        defaultKind: "record",
        targets: {
          record: { id: "slot_main_single" },
          category: { id: "slot_main_single_category" },
          sidecar: { id: "slot_main_single_sidecar" }
        }
      },
      {
        slotKey: "main-single-csv",
        label: "Табличная",
        schemaLabel: "Память (табличная)",
        tabGroup: "memory",
        defaultKind: "record-csv",
        targets: {
          record: { id: "slot_main_single_csv_record" },
          category: { id: "slot_main_single_csv_category" },
          sidecar: { id: "slot_main_single_csv_sidecar" }
        }
      },
      {
        slotKey: "inbox",
        label: "Входящие",
        tabGroup: "workspace",
        defaultKind: "record",
        targets: {
          record: { id: "slot_inbox" },
          category: { id: "slot_inbox_category" },
          sidecar: { id: "slot_inbox_sidecar" }
        }
      },
      {
        slotKey: "notes",
        label: "Заметки",
        tabGroup: "workspace",
        defaultKind: "record",
        targets: {
          record: { id: "slot_quick_notes" },
          category: { id: "slot_note_category" },
          sidecar: { id: "slot_note_sidecar" }
        }
      },
      {
        slotKey: "references",
        label: "Источники",
        tabGroup: "workspace",
        defaultKind: "record",
        targets: {
          record: { id: "slot_references" },
          category: { id: "slot_references_category" },
          sidecar: { id: "slot_references_sidecar" }
        }
      },
      {
        slotKey: "artefacts",
        label: "Артефакты",
        tabGroup: "files",
        defaultKind: "record",
        targets: {
          record: { id: "slot_artefacts" },
          category: { id: "slot_artefacts_category" },
          sidecar: { id: "slot_artefacts_sidecar" }
        }
      },
      {
        slotKey: "assets",
        label: "Активы",
        tabGroup: "files",
        defaultKind: "record",
        targets: {
          record: { id: "slot_assets" },
          category: { id: "slot_assets_category" },
          sidecar: { id: "slot_assets_sidecar" }
        }
      },
      {
        slotKey: "media",
        label: "Медиа",
        tabGroup: "files",
        defaultKind: "sidecar",
        targets: {
          record: { id: "slot_media_record", labelSuffix: " · запись" },
          category: { id: "slot_media_category", legacyIds: ["media_category"] },
          sidecar: { id: "slot_media" }
        }
      },
      {
        slotKey: "repository",
        label: "Репозитории",
        tabGroup: "files",
        defaultKind: "record",
        targets: {
          record: { id: "slot_repository" },
          category: { id: "slot_repository_category" },
          sidecar: { id: "slot_repository_sidecar" }
        }
      },
      {
        slotKey: "scripts",
        label: "Скрипты",
        tabGroup: "files",
        defaultKind: "record",
        targets: {
          record: { id: "slot_scripts" },
          category: { id: "slot_scripts_category" },
          sidecar: { id: "slot_scripts_sidecar" }
        }
      },
      {
        slotKey: "templates",
        label: "Шаблоны",
        tabGroup: "files",
        defaultKind: "record",
        targets: {
          record: { id: "slot_templates" },
          category: { id: "slot_templates_category" },
          sidecar: { id: "slot_templates_sidecar" }
        }
      },
      {
        slotKey: "base",
        label: "База",
        tabGroup: "files",
        defaultKind: "record",
        targets: {
          record: { id: "slot_base" },
          category: { id: "slot_base_category" },
          sidecar: { id: "slot_base_sidecar" }
        }
      },
      {
        slotKey: "notebooklm",
        label: "NotebookLM",
        tabGroup: "files",
        defaultKind: "record",
        targets: {
          record: { id: "slot_notebooklm" },
          category: { id: "slot_notebooklm_category" },
          sidecar: { id: "slot_notebooklm_sidecar" }
        }
      },
      {
        slotKey: "agent-queue",
        label: "Чекпоинты и очередь задач для агента",
        tabGroup: "workspace",
        defaultKind: "record",
        targets: {
          record: { id: "slot_agent_queue" },
          category: { id: "slot_agent_queue_category" },
          sidecar: { id: "slot_agent_queue_sidecar" }
        }
      },
      {
        slotKey: "todo-single",
        label: "TODO",
        tabGroup: "todo",
        defaultKind: "record",
        targets: {
          record: { id: "slot_todo_single" },
          category: { id: "slot_todo_single_category" },
          sidecar: { id: "slot_todo_single_sidecar" }
        }
      },
      {
        slotKey: "roadmap-single",
        label: "Дорожная карта",
        tabGroup: "planning",
        defaultKind: "record",
        targets: {
          record: { id: "slot_roadmap_single" },
          category: { id: "slot_roadmap_single_category" },
          sidecar: { id: "slot_roadmap_single_sidecar" }
        }
      }
    ];

    function ensureRecordCsvTargets(slots) {
      for (const slot of slots) {
        const recordTarget = slot.targets?.record;
        if (!recordTarget?.id || slot.targets?.["record-csv"]?.id) continue;
        if (slot.slotKey === "main-single-csv") {
          slot.targets["record-csv"] = { id: "slot_main_single_csv", legacyIds: [] };
          continue;
        }
        slot.targets["record-csv"] = { id: `${recordTarget.id}_record_csv` };
      }
      return slots;
    }

    ensureRecordCsvTargets(TOPIC_SCHEMA_SLOT_DEFINITIONS);

    const TOPIC_SCHEMA_TAB_GROUP_ORDER = ["memory", "workspace", "files", "todo", "planning"];

    function getTopicSchemaSlotSchemaLabel(slot) {
      return slot.schemaLabel || slot.label;
    }

    function resolveSlotContentKindTypeName(slotKey, contentKind) {
      const slot = getTopicSchemaSlotDefinition(slotKey);
      const kind = String(contentKind || "record").trim();
      return slot?.contentKindTypes?.[kind] || CONTENT_KIND_TYPE_NAMES[kind] || "awn.content.record";
    }

    function resolveSlotContentKindTabLabel(slotKey, contentKind) {
      const slot = getTopicSchemaSlotDefinition(slotKey);
      const kind = String(contentKind || "record").trim();
      return slot?.contentKindTabLabels?.[kind] || CONTENT_KIND_TAB_LABELS[kind] || kind;
    }

    function topicSchemaContentKindSupportsFieldGroups(contentKind) {
      return String(contentKind || "").trim() !== "record-csv";
    }

    function buildTopicSchemaStorageSlotTargetSpecs() {
      const specs = [];
      for (const slot of TOPIC_SCHEMA_SLOT_DEFINITIONS) {
        const baseLabel = getTopicSchemaSlotSchemaLabel(slot);
        for (const kind of TOPIC_SCHEMA_SLOT_CONTENT_KIND_ORDER) {
          const target = slot.targets?.[kind];
          if (!target?.id) continue;
          specs.push({
            id: target.id,
            slotKey: slot.slotKey,
            label: `${baseLabel}${
              target.labelSuffix !== undefined
                ? target.labelSuffix
                : slot.defaultKind === kind
                  ? ""
                  : CONTENT_KIND_LABEL_SUFFIX[kind]
            }`,
            typeName: resolveSlotContentKindTypeName(slot.slotKey, kind),
            contentKind: kind,
            schemaOnly: slot.defaultKind !== kind
          });
        }
      }
      return specs;
    }

    function resolveTopicSchemaSlotPresentation(slot, options = {}) {
      const sharedSlotMode = Boolean(options.sharedSlotMode);
      const flexibleSlotLabel = String(options.flexibleSlotLabel || "Гибкий слот").trim() || "Гибкий слот";
      if (sharedSlotMode && slot.slotKey === "memory") {
        return { rowLabel: flexibleSlotLabel, schemaLabel: flexibleSlotLabel };
      }
      return {
        rowLabel: slot.label,
        schemaLabel: getTopicSchemaSlotSchemaLabel(slot)
      };
    }

    function buildTopicSchemaTargetTabGroups(options = {}) {
      const sharedSlotMode = Boolean(options.sharedSlotMode);
      const flexibleSlotLabel = String(options.flexibleSlotLabel || "Гибкий слот").trim() || "Гибкий слот";
      const groupOrder = sharedSlotMode ? ["memory"] : TOPIC_SCHEMA_TAB_GROUP_ORDER;

      const groups = [
        {
          id: "core",
          label: "Основное",
          coreTabs: [
            { id: "topic", label: "Тема", typeName: "awn.topic", group: "core" },
            { id: "settings", label: "Настройки", typeName: "awn.settings", group: "settings" }
          ]
        }
      ];

      for (const groupId of groupOrder) {
        let slots = TOPIC_SCHEMA_SLOT_DEFINITIONS.filter((item) => item.tabGroup === groupId);
        if (sharedSlotMode && groupId === "memory") {
          slots = slots.filter((item) => item.slotKey === "memory");
        }
        if (!slots.length) continue;
        groups.push({
          id: groupId,
          label:
            sharedSlotMode && groupId === "memory"
              ? flexibleSlotLabel
              : TOPIC_SCHEMA_TAB_GROUP_LABELS[groupId] || groupId,
          slots: slots.map((slot) => {
            const presentation = resolveTopicSchemaSlotPresentation(slot, options);
            return {
              slotKey: slot.slotKey,
              label: presentation.rowLabel,
              tabs: TOPIC_SCHEMA_SLOT_CONTENT_KIND_ORDER.map((kind) => {
                const target = slot.targets?.[kind];
                if (!target?.id) return null;
                const baseLabel = presentation.schemaLabel;
                return {
                  id: target.id,
                  label: resolveSlotContentKindTabLabel(slot.slotKey, kind),
                  fullLabel: `${baseLabel}${
                    target.labelSuffix !== undefined
                      ? target.labelSuffix
                      : slot.defaultKind === kind
                        ? ""
                        : CONTENT_KIND_LABEL_SUFFIX[kind]
                  }`,
                  contentKind: kind,
                  slotKey: slot.slotKey,
                  typeName: resolveSlotContentKindTypeName(slot.slotKey, kind),
                  schemaOnly: slot.defaultKind !== kind,
                  isDefault: slot.defaultKind === kind,
                  group:
                    kind === "category"
                      ? "slot-meta"
                      : kind === "sidecar"
                        ? "slot-sidecar"
                        : "slot"
                };
              }).filter(Boolean)
            };
          })
        });
      }

      return groups;
    }

    function buildTopicSchemaLegacyTargetMigrations() {
      const migrations = [];
      for (const slot of TOPIC_SCHEMA_SLOT_DEFINITIONS) {
        for (const kind of TOPIC_SCHEMA_SLOT_CONTENT_KIND_ORDER) {
          const target = slot.targets?.[kind];
          if (!target?.legacyIds?.length) continue;
          for (const legacyId of target.legacyIds) {
            migrations.push([legacyId, target.id]);
          }
        }
      }
      return migrations;
    }

    function getTopicSchemaSlotDefinition(slotKey) {
      return TOPIC_SCHEMA_SLOT_DEFINITIONS.find((item) => item.slotKey === slotKey) || null;
    }

    function resolveTopicSchemaTargetId(slotKey, options = {}) {
      const slot = getTopicSchemaSlotDefinition(slotKey);
      if (!slot) return null;
      let kind = options.contentKind || null;
      if (!kind) {
        if (options.category) kind = "category";
        else if (options.sidecar) kind = "sidecar";
        else if (options.record) kind = "record";
        else kind = slot.defaultKind || "record";
      }
      return slot.targets?.[kind]?.id || null;
    }

    function getDefaultTopicSchemaTargetIdForSlot(slotKey) {
      return resolveTopicSchemaTargetId(slotKey);
    }

    function findTopicSchemaTargetSpecById(targetId) {
      return buildTopicSchemaStorageSlotTargetSpecs().find((item) => item.id === targetId) || null;
    }

    function normalizeAwnContentTypeName(typeName) {
      const normalized = String(typeName || "").trim();
      const aliases = {
        "awn.record": "awn.content.record",
        "awn.record-csv": "awn.content.record-csv",
        "awn.media.category": "awn.content.category",
        "awn.content.media.category": "awn.content.category",
        "awn.record.category": "awn.content.category",
        "awn.sidecar": "awn.content.sidecar"
      };
      return aliases[normalized] || normalized;
    }

    function resolveTopicSchemaTargetIdForAwnType(slotKey, typeName) {
      const normalized = normalizeAwnContentTypeName(typeName);
      if (normalized === "awn.content.sidecar") {
        return resolveTopicSchemaTargetId(slotKey, { contentKind: "sidecar" });
      }
      if (normalized === "awn.content.category") {
        return resolveTopicSchemaTargetId(slotKey, { contentKind: "category" });
      }
      if (normalized === "awn.content.record-csv") {
        return resolveTopicSchemaTargetId(slotKey, { contentKind: "record-csv" });
      }
      if (normalized === "awn.content.record") {
        return resolveTopicSchemaTargetId(slotKey, { contentKind: "record" });
      }
      return null;
    }

    return {
      CONTENT_KIND_TYPE_NAMES,
      CONTENT_KIND_TAB_LABELS,
      resolveSlotContentKindTypeName,
      resolveSlotContentKindTabLabel,
      topicSchemaContentKindSupportsFieldGroups,
      TOPIC_SCHEMA_SLOT_CONTENT_KIND_ORDER,
      TOPIC_SCHEMA_TAB_GROUP_LABELS,
      TOPIC_SCHEMA_TAB_GROUP_ORDER,
      TOPIC_SCHEMA_SLOT_DEFINITIONS,
      buildTopicSchemaStorageSlotTargetSpecs,
      resolveTopicSchemaSlotPresentation,
      buildTopicSchemaTargetTabGroups,
      buildTopicSchemaLegacyTargetMigrations,
      getTopicSchemaSlotDefinition,
      resolveTopicSchemaTargetId,
      getDefaultTopicSchemaTargetIdForSlot,
      findTopicSchemaTargetSpecById,
      resolveTopicSchemaTargetIdForAwnType,
      normalizeAwnContentTypeName
    };
  }
);
