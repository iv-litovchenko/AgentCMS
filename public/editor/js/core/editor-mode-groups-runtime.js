/**
 * Editor mode groups (REFACTOR-14/20 slice from main.js).
 */
(function initEditorModeGroupsRuntime(global) {
  const NAVIGATION_GROUP = {
    id: "navigation",
    title: "Навигация",
    icon: "🧭",
    modes: [
      { id: "mindmap", label: "Карта тем" },
      { id: "graph", label: "Граф", disabled: true },
      { id: "moc", label: "Карта (moc)", disabled: true },
      { id: "index", label: "Индекс", disabled: true }
    ]
  };

  const EXTRA_GROUP = {
    id: "extra",
    title: "Дополнительно",
    icon: "✨",
    modes: [{ id: "vectorization", label: "Векторизация", disabled: true }]
  };

  const MODE_GROUPS = [
    {
      id: "memory",
      title: "Память",
      icon: "🧠",
      modes: [
        { id: "external", label: "Многофайловая" },
        { id: "internal", label: "Однофайловая" },
        { id: "tabular", label: "Табличная" },
        { id: "inbox", label: "Входящие" },
        { id: "external-db", label: "Реляционная БД", disabled: true },
        { id: "references", label: "Источники" }
      ]
    },
    {
      id: "files",
      title: "Файлы",
      icon: "📎",
      modes: [{ id: "media", label: "Медиа" }]
    }
  ];

  const NODE_AUTO_GROUP = {
    id: "auto",
    title: "Автоматизация",
    icon: "⚡",
    modes: [
      { id: "schedule", label: "Задачи по расписанию", disabled: true },
      { id: "heartbeat", label: "Heartbeat (сердцебиение)", disabled: true }
    ]
  };

  function getNodeGraphModeGroups() {
    return [...MODE_GROUPS, NAVIGATION_GROUP, EXTRA_GROUP];
  }

  function getAllModeGroups() {
    const settings =
      typeof global.getNodeSettingsModeGroups === "function" ? global.getNodeSettingsModeGroups() : [];
    return [...settings, ...MODE_GROUPS, EXTRA_GROUP];
  }

  function getOverviewModeGroups() {
    const byId = new Map(getAllModeGroups().map((group) => [group.id, group]));
    const order = ["files", "main", "auto", "memory", "extra"];
    const ordered = [];
    for (const id of order) {
      const group = byId.get(id);
      if (group) ordered.push(group);
    }
    for (const group of getAllModeGroups()) {
      if (!ordered.includes(group)) ordered.push(group);
    }
    return ordered;
  }

  global.NAVIGATION_GROUP = NAVIGATION_GROUP;
  global.EXTRA_GROUP = EXTRA_GROUP;
  global.MODE_GROUPS = MODE_GROUPS;
  global.NODE_AUTO_GROUP = NODE_AUTO_GROUP;
  global.getNodeGraphModeGroups = getNodeGraphModeGroups;
  global.getAllModeGroups = getAllModeGroups;
  global.getOverviewModeGroups = getOverviewModeGroups;
})(typeof globalThis !== "undefined" ? globalThis : window);
