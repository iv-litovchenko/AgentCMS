const fs = require("fs");
const { spawn } = require("child_process");
const path = require("path");

const PROJECT_ROOT = path.join(__dirname, "../../..");
const SCRIPT = path.join(PROJECT_ROOT, "scripts/entity-gliner-extract.py");
const VENV_PYTHON = path.join(PROJECT_ROOT, ".venv-entity/bin/python3");

function resolvePythonExecutable() {
  if (fs.existsSync(VENV_PYTHON)) return VENV_PYTHON;
  return "python3";
}
const DEFAULT_LABELS = ["person", "organization", "project", "date", "money", "location"];

function mapGlinerLabel(label) {
  const key = String(label || "").trim().toLowerCase();
  const map = {
    person: "person",
    people: "person",
    organization: "org",
    org: "org",
    company: "org",
    project: "project",
    date: "date",
    money: "money",
    purchase: "money",
    location: "place",
    place: "place"
  };
  return map[key] || key || "topic";
}

function runGlinerExtract(text, labels = DEFAULT_LABELS, timeoutMs = 45000) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({
      text: String(text || "").slice(0, 120_000),
      labels
    });
    const child = spawn(resolvePythonExecutable(), [SCRIPT], {
      stdio: ["pipe", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      resolve({ ok: false, error: "timeout", mentions: [] });
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({ ok: false, error: String(error.message || error), mentions: [] });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        resolve({
          ok: false,
          error: stderr.trim() || `exit ${code}`,
          mentions: []
        });
        return;
      }
      try {
        const parsed = JSON.parse(stdout || "{}");
        const rows = Array.isArray(parsed.mentions) ? parsed.mentions : [];
        resolve({
          ok: Boolean(parsed.ok),
          mentions: rows.map((row) => ({
            type: mapGlinerLabel(row.type || row.label),
            label: String(row.label || row.text || "").trim(),
            col_start: Number(row.start) || 0,
            col_end: Number(row.end) || 0,
            source: "gliner"
          }))
        });
      } catch (error) {
        resolve({ ok: false, error: String(error.message || error), mentions: [] });
      }
    });
    child.stdin.write(payload);
    child.stdin.end();
  });
}

module.exports = { runGlinerExtract, DEFAULT_LABELS, mapGlinerLabel };
