/**
 * Resolve AGENT_CMS_PUBLIC_URL from repo .env (single HTTP door).
 */
const fs = require("fs");
const path = require("path");

function findRepoRoot(fromDir) {
  let dir = path.resolve(fromDir || process.cwd());
  for (let i = 0; i < 12; i += 1) {
    if (fs.existsSync(path.join(dir, "package.json")) && fs.existsSync(path.join(dir, "server.js"))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.resolve(fromDir || process.cwd());
}

function readEnvFile(repoRoot) {
  const envPath = path.join(repoRoot, ".env");
  const out = {};
  if (!fs.existsSync(envPath)) return out;
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val.replace(/\r$/, "");
  }
  return out;
}

function getPublicBaseUrl(repoRoot, env = process.env) {
  const fromEnv = String(env.AGENT_CMS_PUBLIC_URL || "").trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");

  const fileEnv = readEnvFile(repoRoot);
  const fromFile = String(fileEnv.AGENT_CMS_PUBLIC_URL || "").trim();
  if (fromFile) return fromFile.replace(/\/+$/, "");

  const domain = String(fileEnv.AGENT_CMS_PUBLIC_DOMAIN || env.AGENT_CMS_PUBLIC_DOMAIN || "").trim();
  if (domain && domain !== "localhost") {
    return `https://${domain}`.replace(/\/+$/, "");
  }

  return "http://127.0.0.1:3000";
}

function joinPublicPath(baseUrl, appPath) {
  const base = String(baseUrl || "").replace(/\/+$/, "");
  const p = String(appPath || "/");
  if (p === "/" || p === "") return `${base}/`;
  const segment = p.startsWith("/") ? p : `/${p}`;
  return `${base}${segment}`;
}

async function probeCmsHttp(baseUrl, { timeoutMs = 4000 } = {}) {
  const base = String(baseUrl || "").replace(/\/+$/, "");
  if (!base) return { ok: false, error: "no_base_url" };

  const paths = ["/api/agent/mcp-ping", "/api/platform/health", "/"];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    for (const p of paths) {
      try {
        const res = await fetch(`${base}${p}`, {
          method: "GET",
          signal: controller.signal,
          headers: { Accept: "application/json, text/html;q=0.9,*/*;q=0.8" }
        });
        if (res.ok || res.status === 401 || res.status === 403) {
          return { ok: true, baseUrl: base, path: p, status: res.status };
        }
      } catch {
        // try next path
      }
    }
    return { ok: false, baseUrl: base, error: "unreachable" };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  findRepoRoot,
  readEnvFile,
  getPublicBaseUrl,
  joinPublicPath,
  probeCmsHttp
};
