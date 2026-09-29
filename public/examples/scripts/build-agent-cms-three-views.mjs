#!/usr/bin/env node
/**
 * Снимок данных agent-cms-core → встроенный JSON для examples/agent-cms-core-three-views.html
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "../..");
const wsRoot = path.join(repoRoot, "workspaces/agent-cms-core");
const mainDir = path.join(wsRoot, "zadachi-plany-i-idei/awn-storage/main");
const voiceTodo = path.join(mainDir, "agent-cms-voice/voice-shell-todo.md");

function parseFrontmatterName(file) {
  const c = fs.readFileSync(file, "utf8");
  const m = c.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!m) return path.basename(file, ".md");
  const nm = m[1].match(/awn-name:\s*"?([^"\n]+)"?/);
  return nm ? nm[1].trim() : path.basename(file, ".md");
}

function parseVoiceRoadmap(content) {
  const title = "Agent CMS Voice — план (voice-shell-todo.md)";
  const columns = [];
  const doneBlock = content.match(/## Уже сделано[\s\S]*?(?=---|\n## )/);
  let doneCount = 0;
  if (doneBlock) {
    doneCount = (doneBlock[0].match(/\| ✅/g) || []).length;
  }
  columns.push({
    type: "single",
    stage: {
      id: "voice-done",
      title: "База голоса (5 режимов, sidecar, STT)",
      status: "done",
      description: `Реализовано пунктов из таблицы «Уже сделано»: ${doneCount}. Источник: agent-cms-voice/voice-shell-todo.md`,
    },
  });

  const phaseRe = /^### (\d+)\.\s+(.+)$/gm;
  let m;
  const phases = [];
  while ((m = phaseRe.exec(content))) {
    const num = m[1];
    const head = m[2].trim();
    const start = m.index + m[0].length;
    const rest = content.slice(start);
    const next = rest.search(/^### \d+\./m);
    const block = next === -1 ? rest : rest.slice(0, next);
    const open = (block.match(/^- \[ \]/gm) || []).length;
    const partial = block.includes("⚠️") || block.includes("❌");
    const status = open === 0 ? "done" : partial ? "progress" : "todo";
    const desc = block
      .split("\n")
      .filter((l) => l.startsWith("- "))
      .slice(0, 2)
      .map((l) => l.replace(/^- \[[ x]\]\s*/, "").replace(/\*\*/g, ""))
      .join(" · ");
    phases.push({
      id: `voice-phase-${num}`,
      title: `${num}. ${head}`,
      status,
      description: desc || "См. чеклист в voice-shell-todo.md",
    });
  }
  for (const p of phases) columns.push({ type: "single", stage: p });
  return { title, columns, source: "zadachi-plany-i-idei/awn-storage/main/agent-cms-voice/voice-shell-todo.md" };
}

function collectMindmapTree() {
  const center = { id: "ws", label: "agent-cms-core", level: "center" };
  const nodes = [center];
  const links = [];

  const topics = [
    { id: "t-arhiv", label: "Архив вопросов", path: "arhiv-voprosov" },
    { id: "t-docs", label: "Документации", path: "dokumentatsii" },
    { id: "t-obs", label: "Обсуждения", path: "obsuzhdeniya" },
    { id: "t-zadachi", label: "Задачи, планы и идеи", path: "zadachi-plany-i-idei" },
  ];
  for (const t of topics) {
    nodes.push({ id: t.id, label: t.label, level: "file", parent: "ws" });
    links.push({ source: "ws", target: t.id, type: "tree" });
  }

  const modules = [
    { id: "m-sys", label: "awn-system", dir: "awn-system" },
    { id: "m-db", label: "awn-databases", dir: "awn-databases" },
    { id: "m-dash", label: "Дашборды", dir: "awn-dashboards" },
    { id: "m-dlg", label: "awn-dialogs", dir: "awn-dialogs" },
    { id: "m-sh", label: "Общие ресурсы", dir: "awn-shared" },
  ];
  for (const mod of modules) {
    const mf = path.join(wsRoot, mod.dir, "manifest.md");
    const label = fs.existsSync(mf) ? parseFrontmatterName(mf) : mod.label;
    nodes.push({ id: mod.id, label, level: "file", parent: "ws" });
    links.push({ source: "ws", target: mod.id, type: "tree" });
  }

  const cats = ["agent-cms-voice", "drugie-idei", "kopilot-v-brauzere", "problemy"];
  for (const cat of cats) {
    const catId = `c-${cat}`;
    const mf = path.join(mainDir, cat, "manifest.md");
    const label = fs.existsSync(mf) ? parseFrontmatterName(mf) : cat;
    nodes.push({ id: catId, label, level: "branch", parent: "t-zadachi" });
    links.push({ source: "t-zadachi", target: catId, type: "tree" });
    const dir = path.join(mainDir, cat);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith(".md") || f === "manifest.md") continue;
      const leafId = `r-${cat}-${f.replace(/\.md$/, "")}`.slice(0, 48);
      const name = parseFrontmatterName(path.join(dir, f));
      const short = name.length > 36 ? name.slice(0, 34) + "…" : name;
      nodes.push({ id: leafId, label: short, level: "leaf", parent: catId });
      links.push({ source: catId, target: leafId, type: "tree" });
    }
  }

  const xref = [
    { source: "m-dlg", target: "r-agent-cms-voice-voice-shell-todo", label: "диалоги ↔ голос" },
    { source: "t-zadachi", target: "m-dash", label: "виджеты задач" },
    { source: "m-db", target: "m-sys", label: "типы ↔ таксономии" },
  ];
  for (const x of xref) {
    if (nodes.some((n) => n.id === x.source) && nodes.some((n) => n.id === x.target)) {
      links.push({ ...x, type: "xref" });
    }
  }

  return { nodes, links, source: "INDEX.md + awn-* + zadachi-plany-i-idei/awn-storage/main/" };
}

function collectGraph() {
  const nodes = [];
  const edges = [];
  const add = (id, label, group) => {
    if (!nodes.find((n) => n.id === id)) nodes.push({ id, label, group });
  };
  const link = (from, to, kind) => edges.push({ from, to, kind });

  add("ws", "agent-cms-core", "workspace");
  for (const [id, label, g] of [
    ["t-zadachi", "Задачи и идеи", "topic"],
    ["t-docs", "Документации", "topic"],
    ["t-obs", "Обсуждения", "topic"],
    ["m-sys", "awn-system", "module"],
    ["m-db", "awn-databases", "module"],
    ["m-voice", "Agent CMS Voice", "feature"],
    ["m-rag", "RAG", "feature"],
    ["m-mcp", "MCP readonly", "feature"],
  ]) {
    add(id, label, g);
    link("ws", id, "part-of");
  }

  const records = [
    ["rec-voice-todo", "voice-shell-todo", "m-voice"],
    ["rec-golos", "Голос + Shell мобилка", "m-voice"],
    ["rec-rag", "RAG", "m-rag"],
    ["rec-rag-all", "RAG все типы файлов", "m-rag"],
    ["rec-mcp-ro", "mode: readonly MCP", "m-mcp"],
    ["rec-viz", "Визуализация / диаграммы", "t-zadachi"],
    ["rec-mindmap", "MindMap карты", "t-zadachi"],
    ["rec-dialog", "Бесконечный диалог", "t-obs"],
    ["rec-types", "Структура и типы", "m-sys"],
  ];
  for (const [id, label, parent] of records) {
    add(id, label, "record");
    link(parent, id, "contains");
  }

  link("rec-golos", "rec-voice-todo", "depends");
  link("rec-rag", "rec-rag-all", "related");
  link("rec-mindmap", "rec-viz", "related");
  link("rec-dialog", "m-voice", "related");
  link("rec-types", "m-mcp", "related");
  link("m-sys", "m-db", "related");

  return {
    nodes,
    edges,
    source: "Тема «Задачи…» + связи по смыслу (не только папки)",
  };
}

const voiceMd = fs.readFileSync(voiceTodo, "utf8");
const payload = {
  generatedAt: new Date().toISOString(),
  workspace: "workspaces/agent-cms-core",
  roadmap: parseVoiceRoadmap(voiceMd),
  mindmap: collectMindmapTree(),
  graph: collectGraph(),
};

const htmlPath = path.join(repoRoot, "examples/agent-cms-core-three-views.html");
let html = fs.readFileSync(htmlPath, "utf8");
const startMarker = "<!-- __CMS_DATA__ -->";
const json = JSON.stringify(payload, null, 2);
if (!html.includes(startMarker)) {
  console.error("HTML template missing marker", startMarker);
  process.exit(1);
}
html = html.replace(
  new RegExp(`${startMarker}[\\s\\S]*?${startMarker}`),
  `${startMarker}\n${json}\n${startMarker}`
);
fs.writeFileSync(htmlPath, html);
console.log("Updated", htmlPath);
console.log("Roadmap stages:", payload.roadmap.columns.length);
console.log("Mindmap nodes:", payload.mindmap.nodes.length);
console.log("Graph nodes:", payload.graph.nodes.length);
