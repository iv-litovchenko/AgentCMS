#!/usr/bin/env node
import fs from "fs";
import path from "path";

const TRANSCRIPTS_DIR =
  process.env.CURSOR_TRANSCRIPTS ||
  path.join(
    process.env.HOME,
    ".cursor/projects/Users-macbook-Desktop-YamlCMS/agent-transcripts"
  );
const OUT_DIR = path.resolve(
  process.cwd(),
  process.argv[2] || ".agent-cms-dev-chats"
);

function extractTimestamp(text) {
  const m = text.match(/<timestamp>([^<]+)<\/timestamp>/);
  return m ? m[1].trim() : null;
}

function extractUserQuery(text) {
  const m = text.match(/<user_query>\s*([\s\S]*?)\s*<\/user_query>/);
  return m ? m[1].trim() : text.replace(/<timestamp>[\s\S]*?<\/timestamp>\s*/g, "").trim();
}

function parseDisplayDate(ts) {
  if (!ts) return null;
  const m = ts.match(/(\w+),\s+(\w+)\s+(\d+),\s+(\d+)/);
  if (!m) return null;
  const months = {
    Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
    Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
  };
  const mon = months[m[2]];
  if (!mon) return null;
  const day = String(m[3]).padStart(2, "0");
  return `${m[4]}-${mon}-${day}`;
}

function sanitizeTitle(s, max = 72) {
  let t = s.replace(/\s+/g, " ").trim();
  if (t.length > max) t = t.slice(0, max).trim() + "…";
  return t.replace(/[/\\:*?"<>|]/g, "-");
}

function sanitizeFilename(s, max = 80) {
  return sanitizeTitle(s, max).replace(/[.]+$/g, "");
}

function formatContentParts(content) {
  if (!Array.isArray(content)) return "";
  const lines = [];
  for (const part of content) {
    if (part.type === "text" && part.text) {
      let text = part.text.replace(/\n\[REDACTED\]\s*$/g, "").trim();
      text = text.replace(/\[REDACTED\]/g, "").trim();
      if (text) lines.push(text);
    } else if (part.type === "tool_use" && part.name) {
      lines.push(`> _tool: ${part.name}_`);
    }
  }
  return lines.join("\n\n");
}

function parseJsonl(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const messages = [];
  let firstTs = null;
  let firstQuery = null;

  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    let row;
    try {
      row = JSON.parse(line);
    } catch {
      continue;
    }
    if (row.type === "turn_ended") continue;
    if (!row.role || !row.message?.content) continue;

    const text = formatContentParts(row.message.content);
    if (!text && row.role === "assistant") {
      const tools = row.message.content
        .filter((p) => p.type === "tool_use")
        .map((p) => p.name);
      if (tools.length) {
        messages.push({ role: row.role, text: tools.map((t) => `> _tool: ${t}_`).join("\n") });
      }
      continue;
    }
    if (!text) continue;

    if (row.role === "user") {
      const full = row.message.content.find((p) => p.type === "text")?.text || "";
      const ts = extractTimestamp(full);
      if (ts && !firstTs) firstTs = ts;
      const q = extractUserQuery(full);
      if (q && !firstQuery) firstQuery = q;
      messages.push({ role: "user", text: q, timestamp: ts });
    } else {
      messages.push({ role: row.role, text });
    }
  }

  const stat = fs.statSync(filePath);
  const dateIso =
    parseDisplayDate(firstTs) ||
    stat.mtime.toISOString().slice(0, 10);
  const title = sanitizeTitle(firstQuery?.split("\n")[0] || "Без названия");
  const chatId = path.basename(filePath, ".jsonl");

  return { chatId, dateIso, firstTs, title, messages };
}

function findJsonlFiles(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      const jsonl = path.join(p, `${name}.jsonl`);
      if (fs.existsSync(jsonl)) out.push(jsonl);
      else {
        for (const f of fs.readdirSync(p)) {
          if (f.endsWith(".jsonl")) out.push(path.join(p, f));
        }
      }
    }
  }
  return out.sort();
}

function toMarkdown(chat) {
  const headerDate = chat.firstTs || chat.dateIso;
  let md = `# ${headerDate} — ${chat.title}\n\n`;
  md += `<!-- chat-id: ${chat.chatId} -->\n\n`;
  for (const msg of chat.messages) {
    const label = msg.role === "user" ? "Пользователь" : "Ассистент";
    md += `## ${label}`;
    if (msg.timestamp) md += ` (${msg.timestamp})`;
    md += `\n\n${msg.text}\n\n---\n\n`;
  }
  return md;
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const files = findJsonlFiles(TRANSCRIPTS_DIR);
const usedNames = new Map();
let count = 0;
let lastExport = null;

for (const file of files) {
  const chat = parseJsonl(file);
  let base = `${chat.dateIso} - ${sanitizeFilename(chat.title)}`;
  const n = usedNames.get(base) || 0;
  usedNames.set(base, n + 1);
  if (n > 0) base += ` (${n + 1})`;
  const outPath = path.join(OUT_DIR, `${base}.md`);
  fs.writeFileSync(outPath, toMarkdown(chat), "utf8");
  count++;
  lastExport = {
    file: `${base}.md`,
    path: outPath,
    chatId: chat.chatId,
    date: chat.firstTs || chat.dateIso,
    title: chat.title,
    sourceJsonl: file,
  };
}

if (lastExport) {
  const lastTxt = path.join(OUT_DIR, "last.txt");
  const lines = [
    `exportedAt: ${new Date().toISOString()}`,
    `total: ${count}`,
    `file: ${lastExport.file}`,
    `date: ${lastExport.date}`,
    `title: ${lastExport.title}`,
    `chatId: ${lastExport.chatId}`,
    `source: ${lastExport.sourceJsonl}`,
  ];
  fs.writeFileSync(lastTxt, lines.join("\n") + "\n", "utf8");
}

console.log(JSON.stringify({ exported: count, outDir: OUT_DIR, last: lastExport?.file }, null, 2));
