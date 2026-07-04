#!/usr/bin/env node
/**
 * Generates Agent CMS icon variants + icon-preview.html (Shell + CMS).
 */
const fs = require("fs");
const path = require("path");

const repoRoot = path.join(__dirname, "..");
const shellIconsDir = path.join(repoRoot, "public/shell/icons");
const cmsIconsDir = path.join(repoRoot, "public/cms/icons");
const previewPath = path.join(repoRoot, "public/shell/icon-preview.html");

const SHELL_PICKS = new Set([13, 19, 20, 22]);
const CMS_PICKS = new Set([1, 7, 9, 20]);

const shellVariants = [
  [1, "variant-1-shell-arc.svg", "Ракушка", "Открытая дуга, пустой центр — «оболочка вокруг», не мишень."],
  [2, "variant-2-pulse-ring.svg", "Пульс", "Тонкое кольцо + маленькая точка — фазы Shell, не Record."],
  [3, "variant-3-voice-waves.svg", "Голос", "Источник + дуги — STT/TTS, голосовой клиент."],
  [4, "variant-4-bridge.svg", "Мост", "Два узла и связь — Shell ↔ CMS/QwenPaw."],
  [5, "variant-5-capsule-bar.svg", "Капсула", "Окно-бар + полоски уровня — компактный UI Shell."],
  [6, "variant-6-hex-shell.svg", "Гекс", "Шестиугольная оболочка — device runtime, sci-fi."],
  [7, "variant-7-parentheses.svg", "Скобки", "( ) вокруг пустоты — «обёртка», не заполненный центр."],
  [8, "variant-8-ripple-arcs.svg", "Ripple", "Три дуги снизу — звук/слушаю, без большой точки."],
  [9, "variant-9-monogram-s.svg", "S", "Монограмма Shell — узнаваемо в Dock, без метафор."],
  [10, "variant-10-listening-dome.svg", "Купол", "Микрофон-купол + ножка — слушаю, голосовой клиент."],
  [11, "variant-11-square-brackets.svg", "Квадратные скобки", "[ ] вокруг точки — оболочка, не буква C."],
  [12, "variant-12-clam-arcs.svg", "Мидия", "Две симметричные дуги сверху — ракушка, не C."],
  [13, "variant-13-waveform.svg", "Волна", "Аудио-форма — STT/TTS, активный диалог."],
  [14, "variant-14-corner-frame.svg", "Уголки", "Четыре уголка + точка — viewport Shell."],
  [15, "variant-15-equalizer.svg", "Эквалайзер", "Пять полос — голос/уровень, компактно."],
  [16, "variant-16-nested-parens.svg", "Двойные скобки", "(( )) — усиленная метафора обёртки."],
  [17, "variant-17-bowl.svg", "Чаша", "U-форма открыта сверху — приёмник голоса."],
  [18, "variant-18-speaker-waves.svg", "Динамик", "Источник + дуги вправо — TTS/ответ."],
  [19, "variant-19-orbit-dot.svg", "Орбита", "Центр + спутник — runtime вокруг агента."],
  [20, "variant-20-triple-dot.svg", "Три точки", "Фазы: слушаю · думаю · говорю."],
  [21, "variant-21-diamond.svg", "Ромб", "Кристалл-оболочка, пустой центр."],
  [22, "variant-22-radar.svg", "Radar", "Сканирование — always-listen, VAD."],
  [23, "variant-23-vertical-echo.svg", "Эхо", "Вертикальные дуги — не похоже на C."],
  [24, "variant-24-open-hex.svg", "Открытый гекс", "Шестиугольник с «крышкой» — device shell."],
  [25, "variant-25-signal-bars.svg", "Сигнал", "Столбики + точка — связь с агентом."],
  [26, "variant-26-eye-listen.svg", "Слушаю", "Глаз/дуга — внимание, не микрофон."],
  [27, "variant-27-minimal-bridge.svg", "Мост mini", "Два узла, одна петля — Shell ↔ CMS."],
  [28, "variant-28-concentric-ripples.svg", "Круги", "Четыре дуги снизу — звук без точки."],
  [29, "variant-29-capsule-dot.svg", "Капсула ·", "Pill + точка — компактный UI, PTT."],
  [30, "variant-30-aurora-lines.svg", "Aurora", "Три параллельные дуги — Nebula-настроение."],
];

function shellSvg(id, inner) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="Agent Shell variant ${id}">
  <defs>
    <linearGradient id="bg-sh-${id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#5f4bff" />
      <stop offset="100%" stop-color="#9b59ff" />
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="20" fill="url(#bg-sh-${id})" />
${inner}
</svg>
`;
}

function cmsSvg(id, inner) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="Agent CMS variant ${id}">
  <defs>
    <linearGradient id="bg-cms-${id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#52b4ff" />
      <stop offset="100%" stop-color="#1a56db" />
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="20" fill="url(#bg-cms-${id})" />
${inner}
</svg>
`;
}

const cmsGlyphs = [
  [1, "tree-classic", "Дерево", "Классика — корень и две ветви, как сейчас."],
  [2, "tree-three-level", "3 уровня", "Иерархия топиков — workspace → agent → manifest."],
  [3, "hub-four", "Хаб", "Центр + 4 узла — MCP и инструменты."],
  [4, "yaml-brace", "YAML", "Фигурные скобки — конфиг и manifest.md."],
  [5, "markdown-hash", "Markdown", "Решётка — контент и документы."],
  [6, "layers", "Слои", "Стек слоёв — autoload, agent, user."],
  [7, "network-mesh", "Сеть", "Три узла, полная связь — knowledge graph."],
  [8, "folder-tree", "Папка", "Workspace-папка с деревом внутри."],
  [9, "grid-topics", "Сетка", "2×2 топика — карта знаний."],
  [10, "key-value", "Key:Value", "Пара ключ–значение — YAML-поля."],
  [11, "manifest", "Manifest", "Документ + узел — manifest.md."],
  [12, "workspace", "Workspace", "Вложенные рамки — рабочая область."],
  [13, "branch-fork", "Fork", "Ветвление — история и версии."],
  [14, "memory-stack", "Память", "Стек записей — history, awn-storage."],
  [15, "agent-node", "Агент", "Узел-агент + связи — agent kit."],
  [16, "link-chain", "Связь", "Цепочка узлов — cross-links."],
  [17, "table", "Таблица", "Tabular view — structured data."],
  [18, "pin-topic", "Pin", "Закреплённый топик — landing node."],
  [19, "constellation", "Созвездие", "5 узлов — экосистема агентов."],
  [20, "root-radial", "Radial", "Корень + 3 луча — topic tree."],
  [21, "diamond-tree", "Ромб", "Дерево в ромбе — platform core."],
  [22, "binary-tree", "Binary", "Бинарное дерево — навигация."],
  [23, "mcp-socket", "MCP", "Разъём — MCP server / tools."],
  [24, "archive", "Архив", "Коробка + стрелка — history backups."],
  [25, "tag-cloud", "Теги", "Три метки — topics и labels."],
  [26, "editor-split", "Split", "Split editor — dual pane CMS."],
  [27, "search-tree", "Поиск", "Лупа + узел — menu search."],
  [28, "topic-ring", "Кольцо", "Узлы по кругу — topic picker."],
  [29, "knowledge-graph", "Graph", "Разрозненный граф — memory + tools."],
  [30, "platform-core", "Core", "Гекс + дерево — agent-cms-core."],
];

const cmsInner = {
  "tree-classic": `
  <circle cx="32" cy="18" r="6" fill="none" stroke="#eef0ff" stroke-width="3" opacity="0.95" />
  <circle cx="18" cy="44" r="6" fill="none" stroke="#eef0ff" stroke-width="3" opacity="0.95" />
  <circle cx="46" cy="44" r="6" fill="none" stroke="#eef0ff" stroke-width="3" opacity="0.95" />
  <line x1="32" y1="24" x2="18" y2="38" stroke="#eef0ff" stroke-width="3" stroke-linecap="round" opacity="0.9" />
  <line x1="32" y1="24" x2="46" y2="38" stroke="#eef0ff" stroke-width="3" stroke-linecap="round" opacity="0.9" />`,
  "tree-three-level": `
  <circle cx="32" cy="14" r="4" fill="none" stroke="#eef0ff" stroke-width="2.5" opacity="0.95" />
  <circle cx="20" cy="30" r="4" fill="none" stroke="#eef0ff" stroke-width="2.5" opacity="0.95" />
  <circle cx="44" cy="30" r="4" fill="none" stroke="#eef0ff" stroke-width="2.5" opacity="0.95" />
  <circle cx="14" cy="48" r="3.5" fill="none" stroke="#eef0ff" stroke-width="2.5" opacity="0.85" />
  <circle cx="26" cy="48" r="3.5" fill="none" stroke="#eef0ff" stroke-width="2.5" opacity="0.85" />
  <circle cx="38" cy="48" r="3.5" fill="none" stroke="#eef0ff" stroke-width="2.5" opacity="0.85" />
  <circle cx="50" cy="48" r="3.5" fill="none" stroke="#eef0ff" stroke-width="2.5" opacity="0.85" />
  <line x1="32" y1="18" x2="20" y2="26" stroke="#eef0ff" stroke-width="2" opacity="0.75" />
  <line x1="32" y1="18" x2="44" y2="26" stroke="#eef0ff" stroke-width="2" opacity="0.75" />
  <line x1="20" y1="34" x2="14" y2="44" stroke="#eef0ff" stroke-width="2" opacity="0.65" />
  <line x1="20" y1="34" x2="26" y2="44" stroke="#eef0ff" stroke-width="2" opacity="0.65" />
  <line x1="44" y1="34" x2="38" y2="44" stroke="#eef0ff" stroke-width="2" opacity="0.65" />
  <line x1="44" y1="34" x2="50" y2="44" stroke="#eef0ff" stroke-width="2" opacity="0.65" />`,
  "hub-four": `
  <circle cx="32" cy="32" r="5" fill="#eef0ff" opacity="0.9" />
  <circle cx="32" cy="14" r="4" fill="none" stroke="#eef0ff" stroke-width="2.5" opacity="0.9" />
  <circle cx="32" cy="50" r="4" fill="none" stroke="#eef0ff" stroke-width="2.5" opacity="0.9" />
  <circle cx="14" cy="32" r="4" fill="none" stroke="#eef0ff" stroke-width="2.5" opacity="0.9" />
  <circle cx="50" cy="32" r="4" fill="none" stroke="#eef0ff" stroke-width="2.5" opacity="0.9" />
  <line x1="32" y1="27" x2="32" y2="18" stroke="#eef0ff" stroke-width="2.5" opacity="0.75" />
  <line x1="32" y1="37" x2="32" y2="46" stroke="#eef0ff" stroke-width="2.5" opacity="0.75" />
  <line x1="27" y1="32" x2="18" y2="32" stroke="#eef0ff" stroke-width="2.5" opacity="0.75" />
  <line x1="37" y1="32" x2="46" y2="32" stroke="#eef0ff" stroke-width="2.5" opacity="0.75" />`,
  "yaml-brace": `
  <path d="M 26 16 C 18 32 18 32 26 48" fill="none" stroke="#eef0ff" stroke-width="3.5" stroke-linecap="round" opacity="0.95" />
  <path d="M 38 16 C 46 32 46 32 38 48" fill="none" stroke="#eef0ff" stroke-width="3.5" stroke-linecap="round" opacity="0.95" />
  <circle cx="32" cy="26" r="2" fill="#eef0ff" opacity="0.8" />
  <line x1="24" y1="32" x2="40" y2="32" stroke="#eef0ff" stroke-width="2" opacity="0.5" />
  <circle cx="32" cy="38" r="2" fill="#eef0ff" opacity="0.6" />`,
  "markdown-hash": `
  <line x1="24" y1="20" x2="24" y2="44" stroke="#eef0ff" stroke-width="3.5" stroke-linecap="round" opacity="0.95" />
  <line x1="40" y1="20" x2="40" y2="44" stroke="#eef0ff" stroke-width="3.5" stroke-linecap="round" opacity="0.95" />
  <line x1="16" y1="28" x2="48" y2="28" stroke="#eef0ff" stroke-width="3.5" stroke-linecap="round" opacity="0.95" />
  <line x1="16" y1="36" x2="48" y2="36" stroke="#eef0ff" stroke-width="3.5" stroke-linecap="round" opacity="0.95" />`,
  layers: `
  <rect x="14" y="22" width="36" height="10" rx="3" fill="none" stroke="#eef0ff" stroke-width="2.5" opacity="0.45" />
  <rect x="18" y="30" width="36" height="10" rx="3" fill="none" stroke="#eef0ff" stroke-width="2.5" opacity="0.7" />
  <rect x="22" y="38" width="36" height="10" rx="3" fill="none" stroke="#eef0ff" stroke-width="2.5" opacity="0.95" />`,
  "network-mesh": `
  <circle cx="20" cy="24" r="5" fill="none" stroke="#eef0ff" stroke-width="3" opacity="0.95" />
  <circle cx="44" cy="24" r="5" fill="none" stroke="#eef0ff" stroke-width="3" opacity="0.95" />
  <circle cx="32" cy="46" r="5" fill="none" stroke="#eef0ff" stroke-width="3" opacity="0.95" />
  <line x1="24" y1="27" x2="40" y2="27" stroke="#eef0ff" stroke-width="2.5" opacity="0.75" />
  <line x1="23" y1="28" x2="29" y2="42" stroke="#eef0ff" stroke-width="2.5" opacity="0.75" />
  <line x1="41" y1="28" x2="35" y2="42" stroke="#eef0ff" stroke-width="2.5" opacity="0.75" />`,
  "folder-tree": `
  <path d="M 14 22 L 14 48 L 50 48 L 50 26 L 34 26 L 30 22 Z" fill="none" stroke="#eef0ff" stroke-width="2.5" stroke-linejoin="round" opacity="0.85" />
  <circle cx="32" cy="34" r="3" fill="none" stroke="#eef0ff" stroke-width="2" opacity="0.9" />
  <circle cx="24" cy="42" r="2.5" fill="none" stroke="#eef0ff" stroke-width="2" opacity="0.8" />
  <circle cx="40" cy="42" r="2.5" fill="none" stroke="#eef0ff" stroke-width="2" opacity="0.8" />
  <line x1="32" y1="37" x2="24" y2="39" stroke="#eef0ff" stroke-width="1.5" opacity="0.65" />
  <line x1="32" y1="37" x2="40" y2="39" stroke="#eef0ff" stroke-width="1.5" opacity="0.65" />`,
  "grid-topics": `
  <circle cx="24" cy="24" r="5" fill="none" stroke="#eef0ff" stroke-width="2.5" opacity="0.95" />
  <circle cx="40" cy="24" r="5" fill="none" stroke="#eef0ff" stroke-width="2.5" opacity="0.95" />
  <circle cx="24" cy="40" r="5" fill="none" stroke="#eef0ff" stroke-width="2.5" opacity="0.95" />
  <circle cx="40" cy="40" r="5" fill="none" stroke="#eef0ff" stroke-width="2.5" opacity="0.95" />`,
  "key-value": `
  <circle cx="18" cy="26" r="3" fill="#eef0ff" opacity="0.9" />
  <line x1="24" y1="26" x2="46" y2="26" stroke="#eef0ff" stroke-width="2.5" stroke-linecap="round" opacity="0.55" />
  <circle cx="18" cy="38" r="3" fill="#eef0ff" opacity="0.7" />
  <line x1="24" y1="38" x2="40" y2="38" stroke="#eef0ff" stroke-width="2.5" stroke-linecap="round" opacity="0.85" />`,
  manifest: `
  <rect x="18" y="14" width="28" height="36" rx="4" fill="none" stroke="#eef0ff" stroke-width="2.5" opacity="0.85" />
  <line x1="24" y1="24" x2="40" y2="24" stroke="#eef0ff" stroke-width="2" opacity="0.5" />
  <line x1="24" y1="30" x2="36" y2="30" stroke="#eef0ff" stroke-width="2" opacity="0.4" />
  <circle cx="32" cy="40" r="4" fill="none" stroke="#eef0ff" stroke-width="2.5" opacity="0.95" />`,
  workspace: `
  <rect x="14" y="18" width="36" height="32" rx="4" fill="none" stroke="#eef0ff" stroke-width="2.5" opacity="0.55" />
  <rect x="20" y="24" width="24" height="20" rx="3" fill="none" stroke="#eef0ff" stroke-width="3" opacity="0.95" />
  <circle cx="32" cy="34" r="3" fill="#eef0ff" opacity="0.85" />`,
  "branch-fork": `
  <circle cx="32" cy="16" r="4" fill="none" stroke="#eef0ff" stroke-width="2.5" opacity="0.95" />
  <line x1="32" y1="20" x2="32" y2="30" stroke="#eef0ff" stroke-width="2.5" opacity="0.85" />
  <line x1="32" y1="30" x2="18" y2="48" stroke="#eef0ff" stroke-width="2.5" stroke-linecap="round" opacity="0.85" />
  <line x1="32" y1="30" x2="32" y2="48" stroke="#eef0ff" stroke-width="2.5" stroke-linecap="round" opacity="0.85" />
  <line x1="32" y1="30" x2="46" y2="48" stroke="#eef0ff" stroke-width="2.5" stroke-linecap="round" opacity="0.85" />
  <circle cx="18" cy="48" r="3" fill="#eef0ff" opacity="0.75" />
  <circle cx="32" cy="48" r="3" fill="#eef0ff" opacity="0.75" />
  <circle cx="46" cy="48" r="3" fill="#eef0ff" opacity="0.75" />`,
  "memory-stack": `
  <ellipse cx="32" cy="22" rx="14" ry="5" fill="none" stroke="#eef0ff" stroke-width="2.5" opacity="0.45" />
  <ellipse cx="32" cy="32" rx="14" ry="5" fill="none" stroke="#eef0ff" stroke-width="2.5" opacity="0.7" />
  <ellipse cx="32" cy="42" rx="14" ry="5" fill="none" stroke="#eef0ff" stroke-width="2.5" opacity="0.95" />
  <line x1="18" y1="22" x2="18" y2="42" stroke="#eef0ff" stroke-width="2" opacity="0.55" />
  <line x1="46" y1="22" x2="46" y2="42" stroke="#eef0ff" stroke-width="2" opacity="0.55" />`,
  "agent-node": `
  <circle cx="32" cy="20" r="6" fill="none" stroke="#eef0ff" stroke-width="3" opacity="0.95" />
  <circle cx="32" cy="18" r="2" fill="#eef0ff" opacity="0.9" />
  <path d="M 26 26 Q 32 30 38 26" fill="none" stroke="#eef0ff" stroke-width="2" opacity="0.6" />
  <circle cx="18" cy="44" r="4" fill="none" stroke="#eef0ff" stroke-width="2.5" opacity="0.85" />
  <circle cx="46" cy="44" r="4" fill="none" stroke="#eef0ff" stroke-width="2.5" opacity="0.85" />
  <line x1="28" y1="24" x2="18" y2="40" stroke="#eef0ff" stroke-width="2" opacity="0.7" />
  <line x1="36" y1="24" x2="46" y2="40" stroke="#eef0ff" stroke-width="2" opacity="0.7" />`,
  "link-chain": `
  <circle cx="20" cy="32" r="7" fill="none" stroke="#eef0ff" stroke-width="3" opacity="0.95" />
  <circle cx="44" cy="32" r="7" fill="none" stroke="#eef0ff" stroke-width="3" opacity="0.95" />
  <line x1="27" y1="32" x2="37" y2="32" stroke="#eef0ff" stroke-width="3" stroke-linecap="round" opacity="0.85" />`,
  table: `
  <rect x="16" y="18" width="32" height="28" rx="3" fill="none" stroke="#eef0ff" stroke-width="2.5" opacity="0.95" />
  <line x1="16" y1="28" x2="48" y2="28" stroke="#eef0ff" stroke-width="2" opacity="0.7" />
  <line x1="16" y1="36" x2="48" y2="36" stroke="#eef0ff" stroke-width="2" opacity="0.7" />
  <line x1="28" y1="18" x2="28" y2="46" stroke="#eef0ff" stroke-width="2" opacity="0.7" />`,
  "pin-topic": `
  <path d="M 32 14 L 38 28 L 32 26 L 26 28 Z" fill="none" stroke="#eef0ff" stroke-width="2.5" stroke-linejoin="round" opacity="0.95" />
  <line x1="32" y1="26" x2="32" y2="34" stroke="#eef0ff" stroke-width="2.5" opacity="0.85" />
  <circle cx="22" cy="42" r="4" fill="none" stroke="#eef0ff" stroke-width="2.5" opacity="0.8" />
  <circle cx="32" cy="46" r="4" fill="none" stroke="#eef0ff" stroke-width="2.5" opacity="0.8" />
  <circle cx="42" cy="42" r="4" fill="none" stroke="#eef0ff" stroke-width="2.5" opacity="0.8" />`,
  constellation: `
  <circle cx="32" cy="16" r="3" fill="#eef0ff" opacity="0.95" />
  <circle cx="16" cy="28" r="3" fill="#eef0ff" opacity="0.8" />
  <circle cx="48" cy="28" r="3" fill="#eef0ff" opacity="0.8" />
  <circle cx="22" cy="46" r="3" fill="#eef0ff" opacity="0.75" />
  <circle cx="42" cy="46" r="3" fill="#eef0ff" opacity="0.75" />
  <line x1="32" y1="19" x2="16" y2="25" stroke="#eef0ff" stroke-width="1.5" opacity="0.5" />
  <line x1="32" y1="19" x2="48" y2="25" stroke="#eef0ff" stroke-width="1.5" opacity="0.5" />
  <line x1="16" y1="31" x2="22" y2="43" stroke="#eef0ff" stroke-width="1.5" opacity="0.5" />
  <line x1="48" y1="31" x2="42" y2="43" stroke="#eef0ff" stroke-width="1.5" opacity="0.5" />
  <line x1="22" y1="46" x2="42" y2="46" stroke="#eef0ff" stroke-width="1.5" opacity="0.5" />`,
  "root-radial": `
  <circle cx="32" cy="32" r="5" fill="#eef0ff" opacity="0.9" />
  <circle cx="32" cy="14" r="4" fill="none" stroke="#eef0ff" stroke-width="2.5" opacity="0.85" />
  <circle cx="16" cy="44" r="4" fill="none" stroke="#eef0ff" stroke-width="2.5" opacity="0.85" />
  <circle cx="48" cy="44" r="4" fill="none" stroke="#eef0ff" stroke-width="2.5" opacity="0.85" />
  <line x1="32" y1="27" x2="32" y2="18" stroke="#eef0ff" stroke-width="2.5" opacity="0.75" />
  <line x1="28" y1="35" x2="19" y2="41" stroke="#eef0ff" stroke-width="2.5" opacity="0.75" />
  <line x1="36" y1="35" x2="45" y2="41" stroke="#eef0ff" stroke-width="2.5" opacity="0.75" />`,
  "diamond-tree": `
  <path d="M 32 14 L 48 32 L 32 50 L 16 32 Z" fill="none" stroke="#eef0ff" stroke-width="2.5" opacity="0.55" />
  <circle cx="32" cy="22" r="3" fill="none" stroke="#eef0ff" stroke-width="2" opacity="0.95" />
  <circle cx="24" cy="36" r="3" fill="none" stroke="#eef0ff" stroke-width="2" opacity="0.85" />
  <circle cx="40" cy="36" r="3" fill="none" stroke="#eef0ff" stroke-width="2" opacity="0.85" />
  <line x1="32" y1="25" x2="24" y2="33" stroke="#eef0ff" stroke-width="1.5" opacity="0.7" />
  <line x1="32" y1="25" x2="40" y2="33" stroke="#eef0ff" stroke-width="1.5" opacity="0.7" />`,
  "binary-tree": `
  <circle cx="32" cy="14" r="3.5" fill="none" stroke="#eef0ff" stroke-width="2.5" opacity="0.95" />
  <circle cx="22" cy="28" r="3.5" fill="none" stroke="#eef0ff" stroke-width="2.5" opacity="0.9" />
  <circle cx="42" cy="28" r="3.5" fill="none" stroke="#eef0ff" stroke-width="2.5" opacity="0.9" />
  <circle cx="16" cy="44" r="3" fill="none" stroke="#eef0ff" stroke-width="2" opacity="0.85" />
  <circle cx="28" cy="44" r="3" fill="none" stroke="#eef0ff" stroke-width="2" opacity="0.85" />
  <circle cx="36" cy="44" r="3" fill="none" stroke="#eef0ff" stroke-width="2" opacity="0.85" />
  <circle cx="48" cy="44" r="3" fill="none" stroke="#eef0ff" stroke-width="2" opacity="0.85" />
  <line x1="32" y1="17" x2="22" y2="24" stroke="#eef0ff" stroke-width="2" opacity="0.7" />
  <line x1="32" y1="17" x2="42" y2="24" stroke="#eef0ff" stroke-width="2" opacity="0.7" />
  <line x1="22" y1="31" x2="16" y2="41" stroke="#eef0ff" stroke-width="2" opacity="0.65" />
  <line x1="22" y1="31" x2="28" y2="41" stroke="#eef0ff" stroke-width="2" opacity="0.65" />
  <line x1="42" y1="31" x2="36" y2="41" stroke="#eef0ff" stroke-width="2" opacity="0.65" />
  <line x1="42" y1="31" x2="48" y2="41" stroke="#eef0ff" stroke-width="2" opacity="0.65" />`,
  "mcp-socket": `
  <rect x="14" y="24" width="16" height="16" rx="4" fill="none" stroke="#eef0ff" stroke-width="2.5" opacity="0.95" />
  <path d="M 34 32 L 42 32" stroke="#eef0ff" stroke-width="3" stroke-linecap="round" opacity="0.85" />
  <path d="M 42 26 L 50 26 L 50 38 L 42 38" fill="none" stroke="#eef0ff" stroke-width="2.5" stroke-linejoin="round" opacity="0.85" />
  <line x1="46" y1="26" x2="46" y2="38" stroke="#eef0ff" stroke-width="2" opacity="0.55" />`,
  archive: `
  <rect x="16" y="22" width="32" height="22" rx="3" fill="none" stroke="#eef0ff" stroke-width="2.5" opacity="0.9" />
  <path d="M 16 22 L 24 16 L 40 16 L 48 22" fill="none" stroke="#eef0ff" stroke-width="2.5" stroke-linejoin="round" opacity="0.9" />
  <path d="M 32 30 L 32 40 M 28 36 L 32 40 L 36 36" fill="none" stroke="#eef0ff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.75" />`,
  "tag-cloud": `
  <rect x="14" y="18" width="22" height="10" rx="5" fill="none" stroke="#eef0ff" stroke-width="2.5" opacity="0.95" />
  <rect x="28" y="32" width="22" height="10" rx="5" fill="none" stroke="#eef0ff" stroke-width="2.5" opacity="0.75" />
  <rect x="18" y="46" width="18" height="8" rx="4" fill="none" stroke="#eef0ff" stroke-width="2" opacity="0.55" />`,
  "editor-split": `
  <rect x="16" y="16" width="32" height="32" rx="4" fill="none" stroke="#eef0ff" stroke-width="2.5" opacity="0.95" />
  <line x1="32" y1="16" x2="32" y2="48" stroke="#eef0ff" stroke-width="2" opacity="0.7" />
  <line x1="20" y1="24" x2="28" y2="24" stroke="#eef0ff" stroke-width="2" opacity="0.5" />
  <line x1="20" y1="30" x2="26" y2="30" stroke="#eef0ff" stroke-width="2" opacity="0.4" />
  <circle cx="40" cy="32" r="4" fill="none" stroke="#eef0ff" stroke-width="2" opacity="0.8" />`,
  "search-tree": `
  <circle cx="28" cy="28" r="10" fill="none" stroke="#eef0ff" stroke-width="3" opacity="0.85" />
  <line x1="35" y1="35" x2="44" y2="44" stroke="#eef0ff" stroke-width="3" stroke-linecap="round" opacity="0.85" />
  <circle cx="24" cy="24" r="2" fill="#eef0ff" opacity="0.8" />
  <circle cx="20" cy="32" r="1.5" fill="#eef0ff" opacity="0.6" />
  <circle cx="30" cy="32" r="1.5" fill="#eef0ff" opacity="0.6" />`,
  "topic-ring": `
  <circle cx="32" cy="32" r="16" fill="none" stroke="#eef0ff" stroke-width="2" opacity="0.35" />
  <circle cx="32" cy="16" r="3.5" fill="none" stroke="#eef0ff" stroke-width="2.5" opacity="0.95" />
  <circle cx="46" cy="32" r="3.5" fill="none" stroke="#eef0ff" stroke-width="2.5" opacity="0.85" />
  <circle cx="32" cy="48" r="3.5" fill="none" stroke="#eef0ff" stroke-width="2.5" opacity="0.85" />
  <circle cx="18" cy="32" r="3.5" fill="none" stroke="#eef0ff" stroke-width="2.5" opacity="0.85" />`,
  "knowledge-graph": `
  <circle cx="18" cy="20" r="4" fill="none" stroke="#eef0ff" stroke-width="2.5" opacity="0.85" />
  <circle cx="44" cy="18" r="4" fill="none" stroke="#eef0ff" stroke-width="2.5" opacity="0.85" />
  <circle cx="32" cy="32" r="5" fill="#eef0ff" opacity="0.85" />
  <circle cx="16" cy="44" r="4" fill="none" stroke="#eef0ff" stroke-width="2.5" opacity="0.8" />
  <circle cx="48" cy="46" r="4" fill="none" stroke="#eef0ff" stroke-width="2.5" opacity="0.8" />
  <line x1="21" y1="23" x2="28" y2="29" stroke="#eef0ff" stroke-width="2" opacity="0.55" />
  <line x1="41" y1="21" x2="35" y2="29" stroke="#eef0ff" stroke-width="2" opacity="0.55" />
  <line x1="28" y1="35" x2="19" y2="41" stroke="#eef0ff" stroke-width="2" opacity="0.55" />
  <line x1="36" y1="35" x2="45" y2="43" stroke="#eef0ff" stroke-width="2" opacity="0.55" />`,
  "platform-core": `
  <path d="M 32 14 L 46 22 L 46 38 L 32 46 L 18 38 L 18 22 Z" fill="none" stroke="#eef0ff" stroke-width="2.5" stroke-linejoin="round" opacity="0.55" />
  <circle cx="32" cy="22" r="3" fill="none" stroke="#eef0ff" stroke-width="2" opacity="0.95" />
  <circle cx="24" cy="34" r="2.5" fill="none" stroke="#eef0ff" stroke-width="2" opacity="0.85" />
  <circle cx="40" cy="34" r="2.5" fill="none" stroke="#eef0ff" stroke-width="2" opacity="0.85" />
  <line x1="32" y1="25" x2="24" y2="31" stroke="#eef0ff" stroke-width="1.5" opacity="0.7" />
  <line x1="32" y1="25" x2="40" y2="31" stroke="#eef0ff" stroke-width="1.5" opacity="0.7" />`,
};

function cardHtml({ family, n, file, title, desc, srcPrefix, extraClass = "" }) {
  const classes = ["icon-preview-card", extraClass].filter(Boolean).join(" ");
  return `        <article class="${classes}">
          <div class="icon-preview-sizes">
            <img src="${srcPrefix}/${file}" width="64" height="64" alt="" />
            <img src="${srcPrefix}/${file}" width="32" height="32" alt="" />
            <img src="${srcPrefix}/${file}" width="16" height="16" alt="" />
          </div>
          <h2>${n} · ${title}</h2>
          <p>${desc}</p>
          <code>${srcPrefix}/${file}</code>
        </article>`;
}

fs.mkdirSync(cmsIconsDir, { recursive: true });

for (const [id, slug, title, desc] of cmsGlyphs) {
  const file = `variant-${String(id).padStart(2, "0")}-${slug}.svg`;
  const inner = cmsInner[slug];
  if (!inner) throw new Error(`Missing CMS glyph: ${slug}`);
  fs.writeFileSync(path.join(cmsIconsDir, file), cmsSvg(id, inner));
}

const cmsVariants = cmsGlyphs.map(([id, slug, title, desc]) => [
  id,
  `variant-${String(id).padStart(2, "0")}-${slug}.svg`,
  title,
  desc,
]);

function sortPicksFirst(variants, picks) {
  return [...variants].sort((a, b) => {
    const ap = picks.has(a[0]) ? 0 : 1;
    const bp = picks.has(b[0]) ? 0 : 1;
    if (ap !== bp) return ap - bp;
    return a[0] - b[0];
  });
}

function pickGridCards(picks, variants, srcPrefix, familyClass) {
  return sortPicksFirst(variants, picks)
    .filter(([n]) => picks.has(n))
    .map(([n, file, title, desc]) =>
      cardHtml({
        family: familyClass,
        n,
        file,
        title,
        desc,
        srcPrefix,
        extraClass: `icon-preview-card--pick icon-preview-card--${familyClass}`,
      })
    )
    .join("\n\n");
}

const shellCards = sortPicksFirst(shellVariants, SHELL_PICKS)
  .map(([n, file, title, desc]) =>
    cardHtml({
      family: "shell",
      n,
      file,
      title,
      desc,
      srcPrefix: "/shell/icons",
      extraClass: [
        SHELL_PICKS.has(n) ? "icon-preview-card--pick" : "",
        "icon-preview-card--shell",
      ]
        .filter(Boolean)
        .join(" "),
    })
  )
  .join("\n\n");

const cmsCards = sortPicksFirst(cmsVariants, CMS_PICKS)
  .map(([n, file, title, desc]) =>
    cardHtml({
      family: "cms",
      n,
      file,
      title,
      desc,
      srcPrefix: "/cms/icons",
      extraClass: [
        CMS_PICKS.has(n) ? "icon-preview-card--pick" : "",
        "icon-preview-card--cms",
      ]
        .filter(Boolean)
        .join(" "),
    })
  )
  .join("\n\n");

const shellFavoriteCards = pickGridCards(SHELL_PICKS, shellVariants, "/shell/icons", "shell");
const cmsFavoriteCards = pickGridCards(CMS_PICKS, cmsVariants, "/cms/icons", "cms");

const html = `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Agent Shell + CMS — иконки</title>
    <link rel="stylesheet" href="/shell/shell.css?v=19" />
    <link rel="stylesheet" href="/shell/icon-preview.css?v=7" />
  </head>
  <body>
    <div class="icon-preview-app">
      <section class="icon-preview-favorites">
        <header class="icon-preview-favorites-header">
          <h1>Фавориты · Shell + CMS</h1>
          <p class="icon-preview-favorites-note">Shell слышит и показывает · CMS хранит и связывает</p>
        </header>

        <h2 class="icon-preview-section-title icon-preview-section-title--shell">Agent Shell</h2>
        <div class="icon-preview-grid icon-preview-grid--favorites">
${shellFavoriteCards}
        </div>

        <h2 class="icon-preview-section-title icon-preview-section-title--cms">Agent CMS</h2>
        <div class="icon-preview-grid icon-preview-grid--favorites">
${cmsFavoriteCards}
        </div>
      </section>

      <header class="icon-preview-header">
        <h2 class="icon-preview-all-title">Все варианты</h2>
        <p>
          Открывай через CMS-сервер:
          <strong>http://localhost:3000/shell/icon-preview.html</strong>
        </p>
        <p>
          Одна семья: фиолетовый = <strong>Shell</strong>, синий = <strong>CMS</strong>.
          Белый line-art, скругление 20px. Фавориты — зелёная рамка, сверху и первыми в каждой секции.
        </p>
        <p><a class="icon-preview-back" href="/shell/index.html">← Вернуться в Shell</a></p>
      </header>

      <section class="icon-preview-section">
        <h2 class="icon-preview-section-title icon-preview-section-title--shell">Agent Shell · фиолетовый · 30 вариантов</h2>
        <p class="icon-preview-section-desc">
          Текущая:
          <a href="/shell/favicon.svg" target="_blank" rel="noopener noreferrer">favicon.svg</a>
          (◎). Выбери номер — подставим в favicon, шапку и Agent Shell.app.
        </p>
        <div class="icon-preview-grid">
${shellCards}

        <article class="icon-preview-card icon-preview-card--current icon-preview-card--shell">
          <div class="icon-preview-sizes">
            <img src="/shell/favicon.svg" width="64" height="64" alt="" />
            <img src="/shell/favicon.svg" width="32" height="32" alt="" />
            <img src="/shell/favicon.svg" width="16" height="16" alt="" />
          </div>
          <h2>Сейчас · Shell</h2>
          <p>Кольцо + большая заливка (◎).</p>
          <code>/shell/favicon.svg</code>
        </article>
        </div>
      </section>

      <section class="icon-preview-section">
        <h2 class="icon-preview-section-title icon-preview-section-title--cms">Agent CMS · синий · 30 вариантов</h2>
        <p class="icon-preview-section-desc">
          Текущая:
          <a href="/favicon.png" target="_blank" rel="noopener noreferrer">favicon.png</a>
          (дерево). Выбери номер — подставим в favicon и Agent CMS.app.
        </p>
        <div class="icon-preview-grid">
${cmsCards}

        <article class="icon-preview-card icon-preview-card--current icon-preview-card--cms">
          <div class="icon-preview-sizes">
            <img src="/favicon.png" width="64" height="64" alt="" />
            <img src="/favicon.png" width="32" height="32" alt="" />
            <img src="/favicon.png" width="16" height="16" alt="" />
          </div>
          <h2>Сейчас · CMS</h2>
          <p>Дерево узлов на синем градиенте.</p>
          <code>/favicon.png</code>
        </article>
        </div>
      </section>

      <footer class="icon-preview-footer">
        <p>Размеры в каждой карточке: 64 · 32 · 16 px — как в Dock и вкладке браузера.</p>
      </footer>
    </div>
  </body>
</html>
`;

fs.writeFileSync(previewPath, html);
console.log("CMS icons:", cmsVariants.length);
console.log("Preview:", path.relative(repoRoot, previewPath));
