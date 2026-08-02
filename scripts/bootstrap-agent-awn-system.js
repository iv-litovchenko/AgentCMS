#!/usr/bin/env node
/**
 * Copy platform types into {agent}/awn-system/types/{domain}/*.yml (flat layout)
 * and add agent-specific types (dialog, comment, taxonomies, mixins).
 *
 *   node scripts/bootstrap-agent-awn-system.js agent-cms-test
 */
const fs = require("fs");
const path = require("path");
const { loadYamlFileSync } = require("../awn-yaml-utils");
const {
  getAgentCmsCoreAbsolute,
  TYPE_CATALOG_REL,
  AGENT_SYSTEM_REL
} = require("../platform-sources");

const TYPES_DIR_SEGMENTS = ["awn-storage", "configuration", "types"];

const AGENT_EXTRA_DOMAINS = ["taxonomies", "mixins"];

const AGENT_EXTRA_TYPES = {
  "content/dialog.yml": `id: awn.content.dialog
name: Сообщение диалога
kind: type
domain: content
status: active
extends: awn.page.base
description: Одно сообщение в слоте thread/ — диалог с агентом
slot: thread
fields:
  awn-role:
    type: awn.enum
    name: Роль
    enum:
      - key: user
        name: Пользователь
      - key: assistant
        name: Ассистент
      - key: system
        name: Система
`,
  "content/comment.yml": `id: awn.content.comment
name: Комментарий
kind: type
domain: content
status: active
extends: awn.page.base
description: Комментарий к узлу — слот comments/
slot: comments
fields:
  awn-target:
    type: awn.link
    name: К чему привязан
    description: manifest.md или запись в awn-storage
`,
  "content/media-category.yml": `id: awn.content.media.category
name: Категория медиа
kind: type
domain: content
status: active
extends: awn.page.base
description: Папка-категория в слоте media/
slot: media
`,
  "slots/quick-notes.yml": `id: awn.slot.quick-notes
name: Quick notes
kind: slot
domain: slots
status: active
extends: awn.slot
path: quick-notes/
allowed-content:
  - awn.content.record
accept-files:
  - ".md"
description: Быстрые заметки
`,
  "slots/comments.yml": `id: awn.slot.comments
name: Comments
kind: slot
domain: slots
status: active
extends: awn.slot
path: comments/
allowed-content:
  - awn.content.comment
accept-files:
  - ".md"
description: Комментарии к узлам
`,
  "slots/assets.yml": `id: awn.slot.assets
name: Assets
kind: slot
domain: slots
status: active
extends: awn.slot
path: assets/
allowed-content:
  - awn.content.sidecar
accept-files:
  - ".png"
  - ".jpg"
  - ".jpeg"
  - ".gif"
  - ".webp"
  - ".pdf"
description: Вложения и вставки — pasted/, attachments/
`,
  "taxonomies/_base.yml": `id: awn.taxonomy.base
name: База справочника
kind: base
domain: taxonomies
status: active
extends: awn.entity
description: Общий формат taxonomy — CSV в awn-agent-kit/taxonomies/{slug}/main.csv
properties:
  data-path:
    title: Путь к данным
  props-field:
    title: Поле frontmatter
`,
  "taxonomies/categories.yml": `id: awn.taxonomy.categories
name: Категории
kind: taxonomy
domain: taxonomies
status: active
extends: awn.taxonomy.base
description: Справочник категорий для awn-category
props-field: awn-category
data-path: awn-agent-kit/taxonomies/categories/main.csv
`,
  "taxonomies/tags.yml": `id: awn.taxonomy.tags
name: Теги
kind: taxonomy
domain: taxonomies
status: active
extends: awn.taxonomy.base
description: Справочник тегов для awn-tags
props-field: awn-tags
data-path: awn-agent-kit/taxonomies/tags/main.csv
`,
  "taxonomies/statuses.yml": `id: awn.taxonomy.statuses
name: Статусы
kind: taxonomy
domain: taxonomies
status: active
extends: awn.taxonomy.base
description: Справочник статусов для awn-status
props-field: awn-status
data-path: awn-agent-kit/taxonomies/statuses/main.csv
`,
  "taxonomies/priorities.yml": `id: awn.taxonomy.priorities
name: Приоритеты
kind: taxonomy
domain: taxonomies
status: active
extends: awn.taxonomy.base
description: Справочник приоритетов для awn-priority
props-field: awn-priority
data-path: awn-agent-kit/taxonomies/priorities/main.csv
`,
  "taxonomies/colors.yml": `id: awn.taxonomy.colors
name: Палитра
kind: taxonomy
domain: taxonomies
status: active
extends: awn.taxonomy.base
description: Brand-цвета для awn-color
props-field: awn-color
data-path: awn-agent-kit/taxonomies/colors/main.csv
`,
  "mixins/preview.yml": `id: awn.mixin.preview
name: Превью
kind: mixin
domain: mixins
status: active
description: Поле превью-изображения
fields:
  awn-preview:
    type: awn.url
    name: Превью
`,
  "mixins/web-url.yml": `id: awn.mixin.web-url
name: Веб-источник
kind: mixin
domain: mixins
status: active
description: Ссылка на оригинал в интернете
fields:
  awn-web-url:
    type: awn.field.url
    title: Веб-источник
    description: URL оригинала в интернете (https://…)
    group: content
`,
  "mixins/runtime.yml": `id: awn.mixin.runtime
name: Runtime
kind: mixin
domain: mixins
status: active
description: Загрузка в контекст агента, cron, heartbeat
fields:
  awn-runtime-load-always:
    type: awn.boolean
    name: В контексте всегда
    description: Тема всегда в контексте агента; иначе — только по запросу (по умолчанию)
    default: false
  awn-runtime-cron:
    type: awn.boolean
    name: Cron
  awn-runtime-cron-schedule:
    type: awn.string
    name: Расписание cron
  awn-runtime-heartbeat:
    type: awn.boolean
    name: Heartbeat
  awn-runtime-commands:
    type: awn.boolean
    name: Выполнение команд
    description: В инструкции темы есть команды для выполнения (визуальный маркер)
    default: false
`,
  "mixins/attachments.yml": `id: awn.mixin.attachments
name: Вложения
kind: mixin
domain: mixins
status: active
description: Прикреплённые файлы
fields:
  awn-attachments:
    type: awn.array
    name: Вложения
    items: awn.file
    widget: attachments
`
};

function listPlatformTypeFiles(coreRoot, domain) {
  const dir = path.join(coreRoot, TYPE_CATALOG_REL, domain, ...TYPES_DIR_SEGMENTS);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => /\.ya?ml$/i.test(name))
    .map((name) => path.join(dir, name));
}

function enrichSlotYaml(content, fileName) {
  const slotKey = fileName.replace(/\.ya?ml$/i, "");
  if (slotKey.startsWith("_")) return content;

  const slotBindings = {
    main: {
      path: "main/",
      allowed: ["awn.content.record", "awn.content.record.category"],
      files: [".md"]
    },
    inbox: { path: "inbox/", allowed: ["awn.content.record"], files: [".md", ".txt"] },
    thread: { path: "thread/", allowed: ["awn.content.dialog"], files: [".md"] },
    media: {
      path: "media/",
      allowed: ["awn.content.sidecar", "awn.content.media.category"],
      files: [".png", ".jpg", ".jpeg", ".gif", ".webp", ".pdf", ".sidecar.md"]
    },
    references: { path: "references/", allowed: ["awn.content.record"], files: [".md"] },
    artefacts: { path: "artefacts/", allowed: ["awn.content.record"], files: [".md"] },
    scripts: { path: "scripts/", allowed: ["awn.content.record"], files: [".md", ".sh", ".js"] },
    repository: { path: "repository/", allowed: ["awn.file"], files: ["*"] }
  };

  const binding = slotBindings[slotKey];
  if (!binding) return content;

  const lines = [];
  if (!/\npath:/.test(content)) lines.push(`path: ${binding.path}`);
  if (!/\nallowed-content:/.test(content)) {
    lines.push("allowed-content:");
    for (const item of binding.allowed) lines.push(`  - ${item}`);
  }
  if (!/\naccept-files:/.test(content)) {
    lines.push("accept-files:");
    for (const item of binding.files) lines.push(`  - "${item}"`);
  }
  if (!lines.length) return content;
  return `${content.trim()}\n${lines.join("\n")}\n`;
}

function main() {
  const agentId = process.argv[2] || "agent-cms-test";
  const repoRoot = path.join(__dirname, "..");
  const agentRoot = path.join(repoRoot, "workspaces", agentId);
  const coreRoot = getAgentCmsCoreAbsolute(repoRoot);
  const systemRoot = path.join(agentRoot, AGENT_SYSTEM_REL);
  const typesRoot = path.join(systemRoot, "types");

  if (!fs.existsSync(agentRoot)) {
    console.error(`Agent workspace not found: ${agentRoot}`);
    process.exit(1);
  }

  const platformDomains = fs
    .readdirSync(path.join(coreRoot, TYPE_CATALOG_REL), { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  const domains = [...new Set([...platformDomains, ...AGENT_EXTRA_DOMAINS])];
  let copied = 0;

  for (const domain of domains) {
    const destDir = path.join(typesRoot, domain);
    fs.mkdirSync(destDir, { recursive: true });

    for (const srcPath of listPlatformTypeFiles(coreRoot, domain)) {
      const fileName = path.basename(srcPath);
      let raw = fs.readFileSync(srcPath, "utf-8");
      if (domain === "slots") raw = enrichSlotYaml(raw, fileName);
      fs.writeFileSync(path.join(destDir, fileName), raw, "utf-8");
      copied += 1;
    }
  }

  for (const [rel, body] of Object.entries(AGENT_EXTRA_TYPES)) {
    const dest = path.join(typesRoot, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, body, "utf-8");
    copied += 1;
  }

  const registry = `version: 1
mode: agent-owned
agent: ${agentId}
description: CMS-модель агента — типы, слоты, поля. Runtime читает awn-system/types/
domains:
${domains.map((d) => `  - ${d}`).join("\n")}
docs:
  map: awn-system/MAP.md
  agents: AGENTS.md
`;
  fs.writeFileSync(path.join(systemRoot, "registry.yml"), registry, "utf-8");

  console.log(`Bootstrap OK: ${copied} type files → ${typesRoot}`);
}

main();
