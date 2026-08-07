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
      sidecar: "awn.content.sidecar"
    };

    const CONTENT_KIND_LABEL_SUFFIX = {
      record: "",
      category: " · раздел",
      sidecar: " · sidecar"
    };

    const CONTENT_KIND_TAB_LABELS = {
      record: "Запись",
      category: "Раздел",
      sidecar: "Sidecar"
    };

    const TOPIC_SCHEMA_SLOT_CONTENT_KIND_ORDER = ["category", "record", "sidecar"];

    const TOPIC_SCHEMA_TAB_GROUP_LABELS = {
      memory: "Память",
      workspace: "Папки",
      files: "Файлы",
      todo: "Задачи"
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
        defaultKind: "record",
        targets: {
          record: { id: "slot_main_single_csv" },
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
        slotKey: "log-single",
        label: "Журнал",
        tabGroup: "journal",
        defaultKind: "record",
        targets: {
          record: { id: "slot_log_single" },
          category: { id: "slot_log_single_category" },
          sidecar: { id: "slot_log_single_sidecar" }
        }
      }
    ];

    const TOPIC_SCHEMA_TAB_GROUP_ORDER = ["memory", "workspace", "files", "todo", "journal"];

    function getTopicSchemaSlotSchemaLabel(slot) {
      return slot.schemaLabel || slot.label;
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
            typeName: CONTENT_KIND_TYPE_NAMES[kind],
            contentKind: kind,
            schemaOnly: slot.defaultKind !== kind
          });
        }
      }
      return specs;
    }

    function buildTopicSchemaTargetTabGroups() {
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

      for (const groupId of TOPIC_SCHEMA_TAB_GROUP_ORDER) {
        const slots = TOPIC_SCHEMA_SLOT_DEFINITIONS.filter((item) => item.tabGroup === groupId);
        if (!slots.length) continue;
        groups.push({
          id: groupId,
          label: TOPIC_SCHEMA_TAB_GROUP_LABELS[groupId] || groupId,
          slots: slots.map((slot) => ({
            slotKey: slot.slotKey,
            label: slot.label,
            tabs: TOPIC_SCHEMA_SLOT_CONTENT_KIND_ORDER
              .map((kind) => {
                const target = slot.targets?.[kind];
                if (!target?.id) return null;
                const baseLabel = getTopicSchemaSlotSchemaLabel(slot);
                return {
                  id: target.id,
                  label: CONTENT_KIND_TAB_LABELS[kind],
                  fullLabel: `${baseLabel}${
                    target.labelSuffix !== undefined
                      ? target.labelSuffix
                      : slot.defaultKind === kind
                        ? ""
                        : CONTENT_KIND_LABEL_SUFFIX[kind]
                  }`,
                  contentKind: kind,
                  slotKey: slot.slotKey,
                  typeName: CONTENT_KIND_TYPE_NAMES[kind],
                  schemaOnly: slot.defaultKind !== kind,
                  isDefault: slot.defaultKind === kind,
                  group:
                    kind === "category"
                      ? "slot-meta"
                      : kind === "sidecar"
                        ? "slot-sidecar"
                        : "slot"
                };
              })
              .filter(Boolean)
          }))
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
      if (normalized === "awn.content.record") {
        return resolveTopicSchemaTargetId(slotKey, { contentKind: "record" });
      }
      return null;
    }

    return {
      CONTENT_KIND_TYPE_NAMES,
      CONTENT_KIND_TAB_LABELS,
      TOPIC_SCHEMA_SLOT_CONTENT_KIND_ORDER,
      TOPIC_SCHEMA_TAB_GROUP_LABELS,
      TOPIC_SCHEMA_TAB_GROUP_ORDER,
      TOPIC_SCHEMA_SLOT_DEFINITIONS,
      buildTopicSchemaStorageSlotTargetSpecs,
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
